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
import { parseGlb, type GlbNode, type GlbPrimitive } from './glb';
import type { RoleTextures } from './textures';

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
}

export interface SidecarSpace {
  name: string;
  kind: 'hall' | 'shaft' | 'corridor' | 'cavern';
  bounds: { min: V3; max: V3 };
  fog?: { density: number; color: V3 };
}

export interface LevelSidecar {
  name: string;
  spawn: { position: V3; yawDeg: number };
  points: { name: string; position: V3; kind: string }[];
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
  /** The level's static lights in Babylon space; baked into the vertices, not registered. */
  lights: LevelLight[];
  /** 1 shows the baked light, 0 the environment's key and ambient light instead. */
  setBakedMix(v: number): void;
  setWireframe(on: boolean): void;
  setNavMeshVisible(on: boolean): void;
  /** Register the static lights as live per-pixel lights too (comparison only). */
  setLiveLights(on: boolean, scale?: number): void;
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
    mat = materials.create({
      name: `level-role-${role}`,
      texture: tex.texture,
      uvScale: [s, s],
      ...(baked ? { baked: true } : {}),
      ...(tex.emissive ? { emissive: tex.emissive } : {}),
      ...(tex.tint ? { tint: tex.tint } : {}),
    });
    byRole.set(role, mat);
    return mat;
  };

  const find = (name: string): GlbNode | undefined => nodes.find((n) => n.name === name);
  const visual = find('visual');
  for (const chunk of visual?.children ?? []) {
    chunk.primitives.forEach((p, i) => {
      const mesh = new Mesh(`${chunk.name}:${i}`, scene);
      toVertexData(p).applyToMesh(mesh, false);
      mesh.material = materialFor(roleOf(p.material), p.colors !== null);
      mesh.parent = root;
      mesh.freezeWorldMatrix();
      mesh.doNotSyncBoundingInfo = true;
      meshes.push(mesh);
    });
  }
  // Water bodies and waterfalls keep their own meshes; LevelWater gives them materials.
  const named = (prefix: string, material: string | null): string =>
    material?.startsWith(prefix) ? material.slice(prefix.length) : '';
  const water: LevelWaterBody[] = [];
  for (const p of find('water')?.primitives ?? []) {
    const name = named('water:', p.material);
    const body = sidecar.water.find((w) => w.name === name);
    if (!body) continue;
    const mesh = new Mesh(`water:${name}`, scene);
    toVertexData(p).applyToMesh(mesh, false);
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

  // Collider: invisible static mesh shape.
  const collider = new Mesh('level-collider', scene);
  const cp = find('collider')?.primitives[0];
  if (!cp) throw new Error('level has no collider');
  toVertexData(cp).applyToMesh(collider, false);
  collider.isVisible = false;
  collider.isPickable = false;
  collider.parent = root;
  const aggregate = new PhysicsAggregate(
    collider,
    PhysicsShapeType.MESH,
    { mass: 0, friction: 0.8, restitution: 0 },
    scene,
  );

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
    lights,
    setBakedMix: (v) => materials.setBakedMix(v),
    setWireframe(on) {
      for (const m of byRole.values()) m.wireframe = on;
    },
    setNavMeshVisible(on) {
      if (!on && !navMesh) return;
      navOverlay().setEnabled(on);
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
      aggregate.dispose();
      navMesh?.material?.dispose();
      root.dispose(false, true);
    },
  };
}
