/**
 * Runtime level loader: reads a compiled level (GLB + sidecar JSON from `npm run
 * level:build`), builds one Babylon mesh per chunk primitive with the role's material,
 * a static Havok mesh collider, water surfaces, and the metadata the game needs.
 *
 * The kernel works right-handed (glTF); Babylon is left-handed. Everything is mirrored on
 * X while loading, so a kernel heading of 0 (north, +Z) is a Babylon yaw of 0 too.
 */
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { PointLightDesc, RetroMaterials } from '../render/materials';
import { ROLE } from '../../kernel/elements/roles';
import { TREE_KINDS, treeMesh } from '../../kernel/terrain/trees';
import { Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector';
import {
  PhysicsShapeContainer,
  PhysicsShapeCylinder,
} from '@babylonjs/core/Physics/v2/physicsShape';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { parseGlb, type GlbNode, type GlbPrimitive } from './glb';
import type { Portal } from './portals';
import type { RoleTexture, RoleTextures } from './textures';

type V3 = [number, number, number];

export interface SidecarWater {
  name: string;
  kind: 'pool' | 'river';
  y: number;
  bounds: { min: V3; max: V3 };
  flow: [number, number];
}

export interface SidecarWaterfall {
  name: string;
  lip: V3;
  plunge: V3;
  width: number;
  length: number;
}

export interface SidecarSpace {
  name: string;
  kind: 'hall' | 'shaft' | 'corridor' | 'cavern';
  bounds: { min: V3; max: V3 };
  fog?: { density: number; color: V3 };
}

export interface SidecarPortal {
  name: string;
  position: V3;
  radius: number;
  target: { level: string; entry: string };
  arrive: { position: V3; yawDeg: number };
}

export interface LevelSidecar {
  name: string;
  /** Outdoor region: sun-lit terrain chunks with detail levels, forests, sky (DESIGN.md 15). */
  outdoor?: boolean;
  region?: string;
  /** Role names for the terrain material's slots; the valley's when absent. */
  terrainTextures?: { base: string; path: string; scree: string; snow: string };
  /** The region's light, fog and sky. */
  environment?: {
    lightColor: V3;
    ambientColor: V3;
    fogColor: V3;
    fogDensity: number;
    skyZenith: V3;
    skyHorizon: V3;
    cloudAmount: number;
  };
  lod?: { chunk: number; distances: [number, number]; forestFar: number };
  /** Trees as [kind (an index into TREE_KINDS), x, y, z, yaw, scale] in kernel space. */
  trees?: [number, number, number, number, number, number][];
  spawn: { position: V3; yawDeg: number };
  points: { name: string; position: V3; kind: string }[];
  /** Doors to other levels (DESIGN.md 15.3). */
  portals?: SidecarPortal[];
  /** Monsters standing about when the level loads. */
  spawns?: { kind: string; position: V3; yawDeg: number }[];
  lights: {
    position: V3;
    color: V3;
    range: number;
    intensity: number;
    kind?: 'lantern' | 'brazier' | 'glow';
  }[];
  spaces: SidecarSpace[];
  water: SidecarWater[];
  waterfalls: SidecarWaterfall[];
  bounds: { min: V3; max: V3 };
  nav: { positions: number[]; indices: number[] };
  reachability: { name: string; reachable: boolean; reason?: string }[];
  stats: Record<string, number>;
}

/** A water body in scene space, with its surface mesh (material assigned by LevelWater). */
export interface LevelWaterBody {
  name: string;
  kind: 'pool' | 'river';
  y: number;
  min: Vector3;
  max: Vector3;
  /** Flow direction on the ground plane in scene space. */
  flow: Vector2;
  mesh: Mesh;
}

export interface LevelWaterfall {
  name: string;
  lip: Vector3;
  plunge: Vector3;
  width: number;
  /** Arc length of the sheet in metres. */
  length: number;
  mesh: Mesh;
}

export interface LevelSpace {
  name: string;
  kind: SidecarSpace['kind'];
  min: Vector3;
  max: Vector3;
  fog?: { density: number; color: Color3 };
}

export interface LevelLight extends PointLightDesc {
  kind: 'lantern' | 'brazier' | 'glow';
}

export interface LoadedLevel {
  root: TransformNode;
  meshes: Mesh[];
  collider: Mesh;
  sidecar: LevelSidecar;
  water: LevelWaterBody[];
  waterfalls: LevelWaterfall[];
  spaces: LevelSpace[];
  spawn: Vector3;
  spawnYawDeg: number;
  points: Map<string, Vector3>;
  portals: Portal[];
  spawns: { kind: string; position: Vector3; yawDeg: number }[];
  /** The level's static lights in Babylon space; baked into the vertices, not registered. */
  lights: LevelLight[];
  /** 1 shows the baked light, 0 the environment's key and ambient light instead. */
  setBakedMix(v: number): void;
  setWireframe(on: boolean): void;
  setNavMeshVisible(on: boolean): void;
  /** Register the static lights as live per-pixel lights too (comparison only). */
  setLiveLights(on: boolean, scale?: number): void;
  /** Outdoor levels: pick terrain detail and forest visibility by distance from the eye. */
  update(eye: Vector3): void;
  dispose(): void;
}

const toBabylon = (p: V3): Vector3 => new Vector3(-p[0], p[1], p[2]);
/** Axis-aligned bounds survive the mirror with their x extents swapped. */
const boundsToBabylon = (b: { min: V3; max: V3 }): { min: Vector3; max: Vector3 } => ({
  min: new Vector3(-b.max[0], b.min[1], b.min[2]),
  max: new Vector3(-b.min[0], b.max[1], b.max[2]),
});

/**
 * Mirror X so right-handed kernel geometry lands in Babylon's left-handed world. The
 * mirror reverses each triangle's winding, which is exactly what Babylon's front-face
 * convention needs: indices are copied as they are.
 */
function toVertexData(p: GlbPrimitive): VertexData {
  const vd = new VertexData();
  const positions = new Float32Array(p.positions);
  for (let i = 0; i < positions.length; i += 3) positions[i] = -positions[i]!;
  vd.positions = positions;
  if (p.normals) {
    const normals = new Float32Array(p.normals);
    for (let i = 0; i < normals.length; i += 3) normals[i] = -normals[i]!;
    vd.normals = normals;
  }
  if (p.uvs) vd.uvs = p.uvs;
  if (p.colors) {
    const n = p.positions.length / 3;
    const colors = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      colors[i * 4] = p.colors[i * p.colorSize] ?? 1;
      colors[i * 4 + 1] = p.colors[i * p.colorSize + 1] ?? 1;
      colors[i * 4 + 2] = p.colors[i * p.colorSize + 2] ?? 1;
      colors[i * 4 + 3] = 1;
    }
    vd.colors = colors;
  }
  vd.indices = new Uint32Array(p.indices);
  return vd;
}

function roleOf(material: string | null): number {
  const m = /^role:(\d+)$/.exec(material ?? '');
  return m ? Number(m[1]) : 0;
}

export async function loadLevel(
  scene: Scene,
  materials: RetroMaterials,
  baseUrl: string,
  textures: RoleTextures,
): Promise<LoadedLevel> {
  const [glbRes, jsonRes] = await Promise.all([fetch(`${baseUrl}.glb`), fetch(`${baseUrl}.json`)]);
  if (!glbRes.ok || !jsonRes.ok) throw new Error(`level not found at ${baseUrl}`);
  const nodes = parseGlb(await glbRes.arrayBuffer());
  const sidecar = (await jsonRes.json()) as LevelSidecar;

  const root = new TransformNode(`level:${sidecar.name}`, scene);
  const meshes: Mesh[] = [];
  const byRole = new Map<number, ShaderMaterial>();
  const materialFor = (role: number, baked: boolean): ShaderMaterial => {
    let mat = byRole.get(role);
    if (mat) return mat;
    const tex = textures.get(role) ?? textures.get(1)!;
    const s = 1 / tex.metresPerTile;
    if (role === ROLE.terrain) {
      const slots = sidecar.terrainTextures ?? {
        base: 'grass',
        path: 'path',
        scree: 'scree',
        snow: 'snow',
      };
      const roleTexture = (name: string): RoleTexture => {
        const id = (ROLE as Record<string, number>)[name];
        const t = id === undefined ? undefined : textures.get(id);
        if (!t) throw new Error(`terrain texture role ${name} is not loaded`);
        return t;
      };
      const grass = roleTexture(slots.base);
      const path = roleTexture(slots.path);
      const scree = roleTexture(slots.scree);
      const snow = roleTexture(slots.snow);
      mat = materials.create({
        name: 'level-terrain',
        texture: grass.texture,
        uvScale: [1, 1],
        splat: {
          path: path.texture,
          scree: scree.texture,
          snow: snow.texture,
          metresPerTile: [
            grass.metresPerTile,
            path.metresPerTile,
            scree.metresPerTile,
            snow.metresPerTile,
          ],
        },
      });
      byRole.set(role, mat);
      return mat;
    }
    mat = materials.create({
      name: `level-role-${role}`,
      texture: tex.texture,
      uvScale: [s, s],
      ...(baked ? { baked: true } : {}),
      ...(tex.emissive ? { emissive: tex.emissive } : {}),
      ...(tex.tint ? { tint: tex.tint } : {}),
      // Canopies sway in the wind (DESIGN.md 15.7).
      ...(role === ROLE.leaves ? { wind: true } : {}),
    });
    byRole.set(role, mat);
    return mat;
  };

  const find = (name: string): GlbNode | undefined => nodes.find((n) => n.name === name);
  const visual = find('visual');
  // Outdoor forests are env-lit; their vertex colours, if any, are not baked light.
  const bakedVisual = !sidecar.outdoor;
  const forestChunks: { meshes: Mesh[]; centre: Vector3 }[] = [];
  for (const chunk of visual?.children ?? []) {
    const group: Mesh[] = [];
    chunk.primitives.forEach((p, i) => {
      const mesh = new Mesh(`${chunk.name}:${i}`, scene);
      toVertexData(p).applyToMesh(mesh, false);
      mesh.material = materialFor(roleOf(p.material), bakedVisual && p.colors !== null);
      mesh.parent = root;
      mesh.freezeWorldMatrix();
      mesh.doNotSyncBoundingInfo = true;
      meshes.push(mesh);
      group.push(mesh);
    });
    if (sidecar.outdoor && group.length) {
      const b = group[0]!.getBoundingInfo().boundingBox;
      forestChunks.push({ meshes: group, centre: b.centerWorld.clone() });
    }
  }
  // Terrain chunks: one mesh per detail level; `update` enables the one for the distance.
  const terrainChunks: { lods: Mesh[]; centre: Vector3 }[] = [];
  const terrainNode = find('terrain');
  if (terrainNode) {
    const byChunk = new Map<string, Mesh[]>();
    for (const child of terrainNode.children) {
      const m = /^t:(\d+):(\d+):(\d+)$/.exec(child.name);
      const p = child.primitives[0];
      if (!m || !p) continue;
      const mesh = new Mesh(child.name, scene);
      toVertexData(p).applyToMesh(mesh, false);
      mesh.material = materialFor(ROLE.terrain, false);
      mesh.parent = root;
      mesh.freezeWorldMatrix();
      mesh.doNotSyncBoundingInfo = true;
      mesh.setEnabled(false);
      meshes.push(mesh);
      const key = `${m[1]}:${m[2]}`;
      const list = byChunk.get(key) ?? [];
      list[Number(m[3])] = mesh;
      byChunk.set(key, list);
    }
    for (const lods of byChunk.values()) {
      const b = lods[0]!.getBoundingInfo().boundingBox;
      terrainChunks.push({ lods, centre: b.centerWorld.clone() });
      lods[0]!.setEnabled(true);
    }
  }
  // The backdrop ring: far mountains with the terrain material, always drawn, never solid.
  for (const child of find('backdrop')?.children ?? []) {
    const p = child.primitives[0];
    if (!p) continue;
    const mesh = new Mesh('backdrop', scene);
    toVertexData(p).applyToMesh(mesh, false);
    mesh.material = materialFor(ROLE.terrain, false);
    mesh.parent = root;
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;
    mesh.isPickable = false;
    meshes.push(mesh);
  }
  // Forests: prototype trees drawn as thin instances, in regions so distant ones can be
  // switched off. Trunks collide as static bodies of cylinders, one per 200 m cell, built
  // the first time the eye comes within 60 m of the cell: thirteen thousand trees then cost
  // the load nothing, and the party never walks through a trunk it can reach.
  const physicsBodies: PhysicsBody[] = [];
  const TRUNK_CELL = 200;
  const trunkBuckets = new Map<string, [number, number, number, number][]>();
  const trunkCellsBuilt = new Set<string>();
  const buildTrunksNear = (eye: Vector3): void => {
    if (!trunkBuckets.size) return;
    const cx = Math.floor(eye.x / TRUNK_CELL);
    const cz = Math.floor(eye.z / TRUNK_CELL);
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let z = cz - 1; z <= cz + 1; z++) {
        const key = `${x}:${z}`;
        if (trunkCellsBuilt.has(key)) continue;
        const dx = Math.max(x * TRUNK_CELL - eye.x, 0, eye.x - (x + 1) * TRUNK_CELL);
        const dz = Math.max(z * TRUNK_CELL - eye.z, 0, eye.z - (z + 1) * TRUNK_CELL);
        if (dx * dx + dz * dz > 60 * 60) continue;
        trunkCellsBuilt.add(key);
        const trees = trunkBuckets.get(key);
        if (!trees?.length) continue;
        const trunkRoot = new TransformNode(`level-trunks:${key}`, scene);
        trunkRoot.parent = root;
        const container = new PhysicsShapeContainer(scene);
        for (const [sx, y, z2, scale] of trees) {
          const shape = new PhysicsShapeCylinder(
            new Vector3(sx, y, z2),
            new Vector3(sx, y + 3.6 * scale, z2),
            0.32 * scale,
            scene,
          );
          container.addChildFromParent(trunkRoot, shape, trunkRoot);
        }
        const body = new PhysicsBody(trunkRoot, PhysicsMotionType.STATIC, false, scene);
        body.shape = container;
        physicsBodies.push(body);
      }
    }
  };
  if (sidecar.outdoor && sidecar.trees?.length) {
    const half = Math.max(
      Math.abs(sidecar.bounds.min[0]),
      Math.abs(sidecar.bounds.max[0]),
      Math.abs(sidecar.bounds.min[2]),
      Math.abs(sidecar.bounds.max[2]),
    );
    // Six by six regions: from any spawn a good share of the map lies beyond forestFar.
    const regions = 6;
    const regionSize = (2 * half) / regions;
    const kinds = TREE_KINDS;
    const buckets = new Map<string, Matrix[]>();
    for (const [kind, kx, ky, kz, yaw, scale] of sidecar.trees) {
      const rx = Math.min(regions - 1, Math.floor((kx + half) / regionSize));
      const rz = Math.min(regions - 1, Math.floor((kz + half) / regionSize));
      const key = `${kind}:${rx}:${rz}`;
      // Kernel space is mirrored on X: position and yaw flip with it.
      const m = Matrix.Compose(
        new Vector3(scale, scale, scale),
        Quaternion.RotationAxis(Vector3.Up(), -yaw),
        new Vector3(-kx, ky, kz),
      );
      (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(m);
      const tk = `${Math.floor(-kx / TRUNK_CELL)}:${Math.floor(kz / TRUNK_CELL)}`;
      (trunkBuckets.get(tk) ?? trunkBuckets.set(tk, []).get(tk)!).push([-kx, ky, kz, scale]);
    }
    buildTrunksNear(toBabylon(sidecar.spawn.position));
    const protoData = kinds.map((kind) => {
      const data = treeMesh(kind);
      // One Babylon mesh per material role of the prototype.
      const byRole = new Map<
        number,
        { positions: number[]; normals: number[]; uvs: number[]; indices: number[] }
      >();
      for (let t = 0; t < data.materials.length; t++) {
        const role = data.materials[t]!;
        const g = byRole.get(role) ?? { positions: [], normals: [], uvs: [], indices: [] };
        byRole.set(role, g);
        for (let k = 0; k < 3; k++) {
          const vi = data.indices[t * 3 + k]!;
          g.indices.push(g.positions.length / 3);
          g.positions.push(
            -data.positions[vi * 3]!,
            data.positions[vi * 3 + 1]!,
            data.positions[vi * 3 + 2]!,
          );
          g.normals.push(
            -data.normals[vi * 3]!,
            data.normals[vi * 3 + 1]!,
            data.normals[vi * 3 + 2]!,
          );
          g.uvs.push(data.uvs[vi * 2]!, data.uvs[vi * 2 + 1]!);
        }
      }
      return byRole;
    });
    for (const [key, matrices] of buckets) {
      const [kindIndex, rx, rz] = key.split(':').map(Number) as [number, number, number];
      const group: Mesh[] = [];
      for (const [role, g] of protoData[kindIndex]!) {
        const mesh = new Mesh(`forest:${key}:${role}`, scene);
        const vd = new VertexData();
        vd.positions = new Float32Array(g.positions);
        vd.normals = new Float32Array(g.normals);
        vd.uvs = new Float32Array(g.uvs);
        vd.indices = new Uint32Array(g.indices);
        vd.applyToMesh(mesh, false);
        const buffer = new Float32Array(matrices.length * 16);
        matrices.forEach((m, i) => m.copyToArray(buffer, i * 16));
        mesh.thinInstanceSetBuffer('matrix', buffer, 16, true);
        mesh.thinInstanceRefreshBoundingInfo(false);
        mesh.material = materialFor(role, false);
        mesh.parent = root;
        mesh.isPickable = false;
        meshes.push(mesh);
        group.push(mesh);
      }
      const centre = new Vector3(
        -(-half + (rx + 0.5) * regionSize),
        0,
        -half + (rz + 0.5) * regionSize,
      );
      forestChunks.push({ meshes: group, centre });
    }
  }
  const lodDistances = sidecar.lod?.distances ?? [300, 700];
  const forestFar = sidecar.lod?.forestFar ?? 700;
  let lastEye: Vector3 | null = null;
  // Water bodies and waterfalls keep their own meshes; LevelWater gives them materials.
  const named = (prefix: string, material: string | null): string =>
    material?.startsWith(prefix) ? material.slice(prefix.length) : '';
  const water: LevelWaterBody[] = [];
  for (const p of find('water')?.primitives ?? []) {
    const name = named('water:', p.material);
    const body = sidecar.water.find((w) => w.name === name);
    if (!body) continue;
    const mesh = new Mesh(`water:${name}`, scene);
    // Babylon's water material mirrors and clips the scene at the mesh's own height, so
    // the mesh sits at the water level with its vertices relative to it.
    const vd = toVertexData(p);
    const positions = vd.positions!;
    for (let i = 1; i < positions.length; i += 3) positions[i] = (positions[i] ?? 0) - body.y;
    vd.applyToMesh(mesh, false);
    mesh.position.y = body.y;
    mesh.parent = root;
    mesh.isPickable = false;
    const b = boundsToBabylon(body.bounds);
    water.push({
      name,
      kind: body.kind,
      y: body.y,
      min: b.min,
      max: b.max,
      flow: new Vector2(-body.flow[0], body.flow[1]),
      mesh,
    });
  }
  const waterfalls: LevelWaterfall[] = [];
  for (const p of find('waterfalls')?.primitives ?? []) {
    const name = named('waterfall:', p.material);
    const fall = sidecar.waterfalls.find((w) => w.name === name);
    if (!fall) continue;
    const mesh = new Mesh(`waterfall:${name}`, scene);
    toVertexData(p).applyToMesh(mesh, false);
    mesh.parent = root;
    mesh.isPickable = false;
    waterfalls.push({
      name,
      lip: toBabylon(fall.lip),
      plunge: toBabylon(fall.plunge),
      width: fall.width,
      length: fall.length,
      mesh,
    });
  }
  const spaces: LevelSpace[] = sidecar.spaces.map((s) => {
    const b = boundsToBabylon(s.bounds);
    return {
      name: s.name,
      kind: s.kind,
      min: b.min,
      max: b.max,
      ...(s.fog ? { fog: { density: s.fog.density, color: new Color3(...s.fog.color) } } : {}),
    };
  });

  // Collider: an invisible static mesh shape (indoors the whole level, outdoors the village
  // solids), plus outdoors the full-detail terrain chunks.
  const collider = new Mesh('level-collider', scene);
  const cp = find('collider')?.primitives[0];
  const aggregates: PhysicsAggregate[] = [];
  const staticMesh = (mesh: Mesh): PhysicsAggregate =>
    new PhysicsAggregate(
      mesh,
      PhysicsShapeType.MESH,
      { mass: 0, friction: 0.8, restitution: 0 },
      scene,
    );
  if (cp && cp.positions.length) {
    toVertexData(cp).applyToMesh(collider, false);
    collider.isVisible = false;
    collider.isPickable = false;
    collider.parent = root;
    aggregates.push(staticMesh(collider));
  }
  for (const c of terrainChunks) aggregates.push(staticMesh(c.lods[0]!));
  if (!aggregates.length) throw new Error('level has no collider');

  // Navmesh overlay, built lazily.
  let navMesh: Mesh | null = null;
  const navOverlay = (): Mesh => {
    if (navMesh) return navMesh;
    navMesh = new Mesh('navmesh-overlay', scene);
    const vd = new VertexData();
    const pos = new Float32Array(sidecar.nav.positions);
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = -pos[i]!;
      pos[i + 1] = pos[i + 1]! + 0.08;
    }
    vd.positions = pos;
    vd.indices = new Uint32Array(sidecar.nav.indices);
    vd.applyToMesh(navMesh, false);
    const mat = new StandardMaterial('navmesh-overlay', scene);
    mat.emissiveColor = new Color3(0.2, 0.9, 0.4);
    mat.disableLighting = true;
    mat.alpha = 0.35;
    mat.backFaceCulling = false;
    navMesh.material = mat;
    navMesh.isPickable = false;
    navMesh.parent = root;
    return navMesh;
  };

  const lights: LevelLight[] = sidecar.lights.map((l) => ({
    position: toBabylon(l.position),
    color: new Color3(l.color[0], l.color[1], l.color[2]),
    range: l.range,
    intensity: l.intensity,
    kind: l.kind ?? 'glow',
  }));
  let live: PointLightDesc[] = [];

  return {
    root,
    meshes,
    collider,
    sidecar,
    water,
    waterfalls,
    spaces,
    spawn: toBabylon(sidecar.spawn.position),
    spawnYawDeg: sidecar.spawn.yawDeg,
    points: new Map(sidecar.points.map((p) => [p.name, toBabylon(p.position)])),
    spawns: (sidecar.spawns ?? []).map((s) => ({
      kind: s.kind,
      position: toBabylon(s.position),
      yawDeg: s.yawDeg,
    })),
    portals: (sidecar.portals ?? []).map((p) => ({
      name: p.name,
      position: toBabylon(p.position),
      radius: p.radius,
      target: p.target,
      arrive: { position: toBabylon(p.arrive.position), yawDeg: p.arrive.yawDeg },
    })),
    lights,
    setBakedMix: (v) => materials.setBakedMix(v),
    setWireframe(on) {
      for (const m of byRole.values()) m.wireframe = on;
    },
    setNavMeshVisible(on) {
      if (!on && !navMesh) return;
      navOverlay().setEnabled(on);
    },
    update(eye) {
      buildTrunksNear(eye);
      if (!sidecar.outdoor) return;
      if (lastEye && Vector3.DistanceSquared(lastEye, eye) < 4) return;
      lastEye = eye.clone();
      for (const c of terrainChunks) {
        const dx = c.centre.x - eye.x;
        const dz = c.centre.z - eye.z;
        const d = Math.hypot(dx, dz);
        const want = d < lodDistances[0] ? 0 : d < lodDistances[1] ? 1 : 2;
        c.lods.forEach((m, i) => m.setEnabled(i === want));
      }
      for (const f of forestChunks) {
        const d = Math.hypot(f.centre.x - eye.x, f.centre.z - eye.z);
        const on = d < forestFar;
        for (const m of f.meshes) m.setEnabled(on);
      }
    },
    setLiveLights(on, scale = 1) {
      for (const l of live) materials.removeLight(l);
      live = [];
      if (!on) return;
      for (const l of lights) {
        live.push(materials.addLight({ ...l, intensity: l.intensity * scale }));
      }
    },
    dispose() {
      for (const l of live) materials.removeLight(l);
      for (const a of aggregates) a.dispose();
      for (const b of physicsBodies) b.dispose();
      navMesh?.material?.dispose();
      root.dispose(false, true);
    },
  };
}
