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
import { TREE_KINDS } from '../../kernel/terrain/trees';
import { PROPS, treesOfClass } from '../../kernel/terrain/props';
import { CATALOGUE, loadPropModels, pickModel } from './props';
import { Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector';
import {
  PhysicsShapeBox,
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
  /** Meshy prop models placed by `props`, by index (DESIGN.md 10.3). */
  propModels?: string[];
  /** Buildings, rocks and small props as [model, x, y, z, yaw, scale] in kernel space. */
  props?: [number, number, number, number, number, number][];
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
  // Instanced things switched by distance from the eye: near detail, far detail, off.
  const forestChunks: { near: Mesh[]; far: Mesh[]; centre: Vector3; keep?: boolean }[] = [];
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
      forestChunks.push({ near: group, far: [], centre: b.centerWorld.clone() });
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
  // Static colliders for trunks, buildings and rocks: one body per 200 m cell, built the
  // first time the eye comes within 60 m of the cell, so ten thousand trees cost the load
  // nothing and the party never walks through a trunk or a wall it can reach.
  const physicsBodies: PhysicsBody[] = [];
  const CELL = 200;
  type Cylinder = { kind: 'cylinder'; x: number; y: number; z: number; r: number; h: number };
  type Box = { kind: 'box'; centre: Vector3; yaw: number; extents: Vector3 };
  const colliderBuckets = new Map<string, (Cylinder | Box)[]>();
  const cellKey = (x: number, z: number): string =>
    `${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`;
  const addCollider = (x: number, z: number, c: Cylinder | Box): void => {
    const k = cellKey(x, z);
    (colliderBuckets.get(k) ?? colliderBuckets.set(k, []).get(k)!).push(c);
  };
  const cellsBuilt = new Set<string>();
  const buildCollidersNear = (eye: Vector3): void => {
    if (!colliderBuckets.size) return;
    const cx = Math.floor(eye.x / CELL);
    const cz = Math.floor(eye.z / CELL);
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let z = cz - 1; z <= cz + 1; z++) {
        const key = `${x}:${z}`;
        if (cellsBuilt.has(key)) continue;
        const dx = Math.max(x * CELL - eye.x, 0, eye.x - (x + 1) * CELL);
        const dz = Math.max(z * CELL - eye.z, 0, eye.z - (z + 1) * CELL);
        if (dx * dx + dz * dz > 60 * 60) continue;
        cellsBuilt.add(key);
        const shapes = colliderBuckets.get(key);
        if (!shapes?.length) continue;
        const cellRoot = new TransformNode(`level-colliders:${key}`, scene);
        cellRoot.parent = root;
        const container = new PhysicsShapeContainer(scene);
        for (const c of shapes) {
          const shape =
            c.kind === 'cylinder'
              ? new PhysicsShapeCylinder(
                  new Vector3(c.x, c.y, c.z),
                  new Vector3(c.x, c.y + c.h, c.z),
                  c.r,
                  scene,
                )
              : new PhysicsShapeBox(
                  c.centre,
                  Quaternion.RotationAxis(Vector3.Up(), c.yaw),
                  c.extents.scale(2),
                  scene,
                );
          container.addChildFromParent(cellRoot, shape, cellRoot);
        }
        const body = new PhysicsBody(cellRoot, PhysicsMotionType.STATIC, false, scene);
        body.shape = container;
        physicsBodies.push(body);
      }
    }
  };
  // Forests, rocks, bushes and buildings: Meshy models (DESIGN.md 10.3) drawn as thin
  // instances in six by six regions, each region with a near and a far copy of every model,
  // switched by distance so the whole valley's forest costs a few draw calls.
  const propPlacements: { model: string; position: Vector3; yaw: number; scale: number }[] = [];
  if (sidecar.outdoor && (sidecar.trees?.length || sidecar.props?.length)) {
    const half = Math.max(
      Math.abs(sidecar.bounds.min[0]),
      Math.abs(sidecar.bounds.max[0]),
      Math.abs(sidecar.bounds.min[2]),
      Math.abs(sidecar.bounds.max[2]),
    );
    const regions = 6;
    const regionSize = (2 * half) / regions;
    // Instances per model per region; buildings in one bucket each, never switched off.
    const buckets = new Map<
      string,
      { model: string; rx: number; rz: number; matrices: Matrix[] }
    >();
    const place = (
      model: string,
      kx: number,
      ky: number,
      kz: number,
      yaw: number,
      scale: number,
      keep: boolean,
    ): void => {
      const rx = keep ? -1 : Math.min(regions - 1, Math.floor((kx + half) / regionSize));
      const rz = keep ? -1 : Math.min(regions - 1, Math.floor((kz + half) / regionSize));
      const key = `${model}:${rx}:${rz}`;
      // Kernel space is mirrored on X: position and yaw flip with it.
      const m = Matrix.Compose(
        new Vector3(scale, scale, scale),
        Quaternion.RotationAxis(Vector3.Up(), -yaw),
        new Vector3(-kx, ky, kz),
      );
      (
        buckets.get(key) ?? buckets.set(key, { model, rx, rz, matrices: [] }).get(key)!
      ).matrices.push(m);
    };
    for (const [kind, kx, ky, kz, yaw, scale] of sidecar.trees ?? []) {
      const cls = TREE_KINDS[kind];
      if (!cls) throw new Error(`tree kind ${kind} is not in TREE_KINDS`);
      const model = pickModel(treesOfClass(cls), kx, kz);
      place(model, kx, ky, kz, yaw, scale, false);
      const trunk = (PROPS[model]?.trunk ?? 0.3) * scale;
      addCollider(-kx, kz, { kind: 'cylinder', x: -kx, y: ky, z: kz, r: trunk, h: 4 });
    }
    const propModels = sidecar.propModels ?? [];
    for (const [mi, kx, ky, kz, yaw, scale] of sidecar.props ?? []) {
      const model = propModels[mi];
      if (!model) throw new Error(`prop model ${mi} is not in propModels`);
      const spec = PROPS[model];
      const measure = CATALOGUE[model];
      if (!spec || !measure) throw new Error(`prop ${model}: not in the catalogue`);
      const keep = spec.kind === 'building';
      place(model, kx, ky, kz, yaw, scale, keep);
      propPlacements.push({ model, position: new Vector3(-kx, ky, kz), yaw: -yaw, scale });
      if (spec.kind === 'building' || spec.kind === 'rock' || spec.kind === 'prop') {
        // A box round the model's footprint; the loader mirrors x, hence the sign.
        const [w, h, d] = measure.size;
        const lx = -(measure.min[0] + w / 2) * scale;
        const lz = (measure.min[2] + d / 2) * scale;
        const c = Math.cos(-yaw);
        const sn = Math.sin(-yaw);
        const centre = new Vector3(
          -kx + lx * c + lz * sn,
          ky + (h * scale) / 2,
          kz - lx * sn + lz * c,
        );
        addCollider(centre.x, centre.z, {
          kind: 'box',
          centre,
          yaw: -yaw,
          extents: new Vector3((w * scale) / 2, (h * scale) / 2, (d * scale) / 2),
        });
      }
    }
    buildCollidersNear(toBabylon(sidecar.spawn.position));
    const models = await loadPropModels(
      scene,
      materials,
      [...buckets.values()].map((b) => b.model),
    );
    for (const [key, bucket] of buckets) {
      const model = models.get(bucket.model)!;
      const buffer = new Float32Array(bucket.matrices.length * 16);
      bucket.matrices.forEach((m, i) => m.copyToArray(buffer, i * 16));
      const instanced = (proto: Mesh, suffix: string): Mesh => {
        const mesh = proto.clone(`props:${key}${suffix}`, null);
        // A clone shares its source's geometry, and thin-instance buffers hang off the
        // geometry: without its own copy every bucket of a model would draw the matrices
        // of whichever bucket set them last.
        mesh.makeGeometryUnique();
        mesh.isVisible = true;
        mesh.thinInstanceSetBuffer('matrix', buffer, 16, true);
        mesh.thinInstanceRefreshBoundingInfo(false);
        mesh.parent = root;
        mesh.isPickable = false;
        meshes.push(mesh);
        return mesh;
      };
      const near = [instanced(model.mesh, '')];
      const far = model.far ? [instanced(model.far, ':far')] : [];
      const keep = bucket.rx < 0;
      const centre = keep
        ? Vector3.Zero()
        : new Vector3(
            -(-half + (bucket.rx + 0.5) * regionSize),
            0,
            -half + (bucket.rz + 0.5) * regionSize,
          );
      forestChunks.push({ near, far, centre, keep });
    }
  }
  const forestNear = 180;
  const lodDistances = sidecar.lod?.distances ?? [300, 700];
  const forestFar = Math.min(sidecar.lod?.forestFar ?? 700, 450);
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
      buildCollidersNear(eye);
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
        if (f.keep) continue;
        const d = Math.hypot(f.centre.x - eye.x, f.centre.z - eye.z);
        const near = d < forestNear || (f.far.length === 0 && d < forestFar);
        for (const m of f.near) m.setEnabled(near);
        for (const m of f.far) m.setEnabled(!near && d < forestFar);
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
