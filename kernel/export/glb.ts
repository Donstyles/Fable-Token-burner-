import { Document, NodeIO, type Mesh, type Primitive } from '@gltf-transform/core';
import { weld } from '@gltf-transform/functions';
import type { MeshData } from '../core/mesh';
import type { LitMeshData } from '../light/bake';

/**
 * Level GLB layout (DESIGN.md 11.5, 11.9). Standard glTF so any viewer opens it:
 *
 *   scene
 *   ├── visual               rendered geometry, one child per spatial chunk
 *   │   └── chunk:i:j:k      mesh with one primitive per material role, material "role:N"
 *   ├── collider             one primitive, positions and indices only
 *   └── water                water surfaces, material "role:10"
 *
 * Primitives carry POSITION, NORMAL, TEXCOORD_0 and, when baked, COLOR_0 (RGB float).
 * Everything else the game needs (spawn, lights, points, navmesh) is in the sidecar JSON.
 */
export interface GlbOptions {
  /** Chunk size in metres for frustum culling and local light selection. */
  chunk: number;
}

interface Group {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  indices: number[];
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
      g = { positions: [], normals: [], uvs: [], colors: [], indices: [] };
      groups.set(key, g);
    }
    for (const i of ids) {
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

export async function buildLevelGlb(
  level: { visual: MeshData | LitMeshData; collider: MeshData; water: MeshData },
  opts: GlbOptions,
): Promise<Uint8Array> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('level');
  const materials = new Map<number, ReturnType<Document['createMaterial']>>();
  const materialFor = (role: number) => {
    let m = materials.get(role);
    if (!m) {
      m = doc.createMaterial(`role:${role}`).setDoubleSided(false);
      materials.set(role, m);
    }
    return m;
  };
  const addPrimitive = (mesh: Mesh, g: Group, role: number | null, lit: boolean): Primitive => {
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
      prim.setAttribute(
        'TEXCOORD_0',
        doc.createAccessor().setType('VEC2').setArray(new Float32Array(g.uvs)).setBuffer(buffer),
      );
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
    if (role !== null) prim.setMaterial(materialFor(role));
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

  // Collider: one primitive, positions and indices only.
  const colliderMesh = doc.createMesh('collider');
  const colliderGroups = groupTriangles(level.collider, () => 'all');
  for (const g of colliderGroups.values()) {
    g.normals = [];
    g.uvs = [];
    addPrimitive(colliderMesh, g, null, false);
  }
  scene.addChild(doc.createNode('collider').setMesh(colliderMesh));

  // Water surfaces.
  const waterMesh = doc.createMesh('water');
  for (const [key, g] of groupTriangles(level.water, (t) =>
    String(level.water.materials[t] ?? 10),
  )) {
    addPrimitive(waterMesh, g, Number(key), false);
  }
  scene.addChild(doc.createNode('water').setMesh(waterMesh));

  await doc.transform(weld());
  return new NodeIO().writeBinary(doc);
}
