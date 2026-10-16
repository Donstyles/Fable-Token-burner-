import { Document, NodeIO, type Mesh, type Primitive } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { quantize, weld } from '@gltf-transform/functions';
import type { MeshData } from '../core/mesh';
import type { LitMeshData } from '../light/bake';

/**
 * Level GLB layout (DESIGN.md 11.5, 11.9). Standard glTF so any viewer opens it:
 *
 *   scene
 *   ├── visual               rendered geometry, one child per spatial chunk
 *   │   └── chunk:i:j:k      mesh with one primitive per material role, material "role:N"
 *   ├── collider             one primitive, positions and indices only
 *   ├── water                one primitive per water body, material "water:<name>"
 *   └── waterfalls           one primitive per fall, material "waterfall:<name>"
 *
 * Primitives carry POSITION, NORMAL, TEXCOORD_0 and, when baked, COLOR_0 (RGB float).
 * Everything else the game needs (spawn, lights, points, navmesh) is in the sidecar JSON.
 */
export interface GlbOptions {
  /** Chunk size in metres for frustum culling and local light selection. */
  chunk: number;
  /**
   * Store positions as 16-bit, normals and colours as 8-bit integers (KHR_mesh_quantization):
   * a third of the bytes. The runtime parser dequantizes.
   */
  quantize?: boolean;
}

interface Group {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  indices: number[];
  /** Source vertex index → index within the group, so vertices are shared. */
  remap: Map<number, number>;
}

function groupTriangles(
  mesh: MeshData | LitMeshData,
  keyOf: (t: number, centroid: [number, number, number]) => string,
): Map<string, Group> {
  const groups = new Map<string, Group>();
  const colors = 'colors' in mesh ? mesh.colors : undefined;
  for (let t = 0; t < mesh.indices.length / 3; t++) {
    const ids = [
      mesh.indices[t * 3] ?? 0,
      mesh.indices[t * 3 + 1] ?? 0,
      mesh.indices[t * 3 + 2] ?? 0,
    ];
    const c: [number, number, number] = [0, 0, 0];
    for (const i of ids) {
      c[0] += (mesh.positions[i * 3] ?? 0) / 3;
      c[1] += (mesh.positions[i * 3 + 1] ?? 0) / 3;
      c[2] += (mesh.positions[i * 3 + 2] ?? 0) / 3;
    }
    const key = keyOf(t, c);
    let g = groups.get(key);
    if (!g) {
      g = { positions: [], normals: [], uvs: [], colors: [], indices: [], remap: new Map() };
      groups.set(key, g);
    }
    for (const i of ids) {
      // Shared within a group: a forest or a terrain chunk would otherwise triple its vertices.
      const seen = g.remap.get(i);
      if (seen !== undefined) {
        g.indices.push(seen);
        continue;
      }
      g.remap.set(i, g.positions.length / 3);
      g.indices.push(g.positions.length / 3);
      g.positions.push(
        mesh.positions[i * 3] ?? 0,
        mesh.positions[i * 3 + 1] ?? 0,
        mesh.positions[i * 3 + 2] ?? 0,
      );
      g.normals.push(
        mesh.normals[i * 3] ?? 0,
        mesh.normals[i * 3 + 1] ?? 0,
        mesh.normals[i * 3 + 2] ?? 0,
      );
      g.uvs.push(mesh.uvs[i * 2] ?? 0, mesh.uvs[i * 2 + 1] ?? 0);
      if (colors) g.colors.push(colors[i * 3] ?? 0, colors[i * 3 + 1] ?? 0, colors[i * 3 + 2] ?? 0);
    }
  }
  return groups;
}

export interface GlbLevel {
  visual: MeshData | LitMeshData;
  /** Omitted for outdoor regions, whose collision comes from the terrain chunks at runtime. */
  collider?: MeshData;
  water: { name: string; mesh: MeshData }[];
  waterfalls: { name: string; mesh: MeshData }[];
  /**
   * Pre-split meshes under named nodes (terrain chunks with their detail levels); each child
   * becomes a node with one primitive per material role, coloured when the mesh carries colours.
   */
  nodes?: { name: string; children: { name: string; mesh: MeshData | LitMeshData }[] }[];
}

export async function buildLevelGlb(level: GlbLevel, opts: GlbOptions): Promise<Uint8Array> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('level');
  const materials = new Map<string, ReturnType<Document['createMaterial']>>();
  const namedMaterial = (name: string) => {
    let m = materials.get(name);
    if (!m) {
      m = doc.createMaterial(name).setDoubleSided(false);
      materials.set(name, m);
    }
    return m;
  };
  const materialFor = (role: number) => namedMaterial(`role:${role}`);
  const addPrimitive = (
    mesh: Mesh,
    g: Group,
    role: number | string | null,
    lit: boolean,
  ): Primitive => {
    const prim = doc.createPrimitive();
    prim.setAttribute(
      'POSITION',
      doc
        .createAccessor()
        .setType('VEC3')
        .setArray(new Float32Array(g.positions))
        .setBuffer(buffer),
    );
    if (g.normals.length) {
      prim.setAttribute(
        'NORMAL',
        doc
          .createAccessor()
          .setType('VEC3')
          .setArray(new Float32Array(g.normals))
          .setBuffer(buffer),
      );
      if (g.uvs.length) {
        prim.setAttribute(
          'TEXCOORD_0',
          doc.createAccessor().setType('VEC2').setArray(new Float32Array(g.uvs)).setBuffer(buffer),
        );
      }
    }
    if (lit && g.colors.length) {
      prim.setAttribute(
        'COLOR_0',
        doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.colors)).setBuffer(buffer),
      );
    }
    const indexArray =
      g.positions.length / 3 > 65535 ? new Uint32Array(g.indices) : new Uint16Array(g.indices);
    prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(indexArray).setBuffer(buffer));
    if (typeof role === 'number') prim.setMaterial(materialFor(role));
    else if (role !== null) prim.setMaterial(namedMaterial(role));
    mesh.addPrimitive(prim);
    return prim;
  };

  // Visual: chunks by centroid, primitives by material role.
  const visualNode = doc.createNode('visual');
  scene.addChild(visualNode);
  const chunks = groupTriangles(level.visual, (t, c) => {
    const role = level.visual.materials[t] ?? 0;
    const i = Math.floor(c[0] / opts.chunk);
    const j = Math.floor(c[1] / opts.chunk);
    const k = Math.floor(c[2] / opts.chunk);
    return `${i}:${j}:${k}|${role}`;
  });
  const byChunk = new Map<string, { role: number; group: Group }[]>();
  for (const [key, group] of chunks) {
    const [chunk, role] = key.split('|') as [string, string];
    let list = byChunk.get(chunk);
    if (!list) {
      list = [];
      byChunk.set(chunk, list);
    }
    list.push({ role: Number(role), group });
  }
  const lit = 'colors' in level.visual && level.visual.colors.length > 0;
  for (const [chunk, prims] of byChunk) {
    const mesh = doc.createMesh(`chunk:${chunk}`);
    for (const p of prims) addPrimitive(mesh, p.group, p.role, lit);
    const node = doc.createNode(`chunk:${chunk}`).setMesh(mesh);
    visualNode.addChild(node);
  }

  // Pre-split nodes: no regrouping by centroid, one primitive per role.
  for (const group of level.nodes ?? []) {
    const parent = doc.createNode(group.name);
    scene.addChild(parent);
    for (const child of group.children) {
      const mesh = doc.createMesh(child.name);
      const coloured = 'colors' in child.mesh && child.mesh.colors.length > 0;
      const byRole = groupTriangles(child.mesh, (t) => String(child.mesh.materials[t] ?? 0));
      for (const [role, g] of byRole) addPrimitive(mesh, g, Number(role), coloured);
      parent.addChild(doc.createNode(child.name).setMesh(mesh));
    }
  }

  // Collider: one primitive, positions and indices only.
  const colliderMesh = doc.createMesh('collider');
  const colliderGroups = level.collider
    ? groupTriangles(level.collider, () => 'all')
    : new Map<string, Group>();
  for (const g of colliderGroups.values()) {
    g.normals = [];
    g.uvs = [];
    addPrimitive(colliderMesh, g, null, false);
  }
  scene.addChild(doc.createNode('collider').setMesh(colliderMesh));

  // Water surfaces: one primitive per body, named so the runtime can match the sidecar.
  const waterMesh = doc.createMesh('water');
  for (const body of level.water) {
    for (const g of groupTriangles(body.mesh, () => 'all').values()) {
      addPrimitive(waterMesh, g, `water:${body.name}`, false);
    }
  }
  scene.addChild(doc.createNode('water').setMesh(waterMesh));

  // Waterfall ribbons, likewise.
  const fallMesh = doc.createMesh('waterfalls');
  for (const fall of level.waterfalls) {
    for (const g of groupTriangles(fall.mesh, () => 'all').values()) {
      addPrimitive(fallMesh, g, `waterfall:${fall.name}`, false);
    }
  }
  scene.addChild(doc.createNode('waterfalls').setMesh(fallMesh));

  await doc.transform(weld());
  if (opts.quantize) {
    await doc.transform(
      quantize({
        pattern: /^(POSITION|NORMAL|COLOR_0)$/,
        quantizePosition: 16,
        quantizeNormal: 8,
        quantizeColor: 8,
        quantizeTexcoord: 16,
        quantizeGeneric: 16,
      }),
    );
  }
  return new NodeIO().registerExtensions([KHRMeshQuantization]).writeBinary(doc);
}
