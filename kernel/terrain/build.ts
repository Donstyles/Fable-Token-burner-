/** Everything a terrain level writes: geometry, collider, water, sidecar fields. */
import type { MeshData } from '../core/mesh';
import { ROLE } from '../elements/roles';
import type {
  LightPlacement,
  NamedPoint,
  PortalRecord,
  SpaceRecord,
  SpawnRecord,
  Waterfall,
  WaterSurface,
} from '../plan/level';
import { headingDeg, type GroundPath } from './spline';
import { backdropMesh } from './backdrop';
import { caveMouth } from './cave';
import { terrainChunks, type TerrainChunk } from './chunks';
import { generateDesert, oasisSurface, type DesertResult } from './desert';
import type { Heightfield } from './heightfield';
import { appendMesh, terrainMesh, type ColouredMeshData } from './mesh';
import { riverSurface } from './river';
import { streamFalls, streamSurfaces } from './stream';
import { buildTown, type TownResult } from './town';
import { forestMeshes, placeTrees, type ForestOptions, type TreeInstance } from './trees';
import { generateValley, type ValleyResult } from './valley';

export type RegionKind = 'valley' | 'desert';

export interface TerrainSpec {
  /** Which generator lays the land out; the valley when unset. */
  region?: RegionKind;
  seed: number;
  width: number;
  cell: number;
  /** Cells per chunk side; must divide width / cell. */
  chunkCells: number;
  forest?: ForestOptions;
}

/** Role names for the terrain material's four slots (DESIGN.md 15.1). */
export interface TerrainTextures {
  base: string;
  path: string;
  scree: string;
  snow: string;
}

/** Lighting, fog and sky for the region, as the runtime's environment fields. */
export interface RegionEnvironment {
  lightColor: [number, number, number];
  ambientColor: [number, number, number];
  fogColor: [number, number, number];
  fogDensity: number;
  skyZenith: [number, number, number];
  skyHorizon: [number, number, number];
  cloudAmount: number;
}

export interface TerrainLevel {
  region: RegionKind;
  height: Heightfield;
  valley?: ValleyResult;
  desert?: DesertResult;
  chunks: TerrainChunk[];
  /** The ring of far mountains beyond the map edge; drawn, never collided with. */
  backdrop: ColouredMeshData;
  /** Structures: houses, the well, the cave; chunked by the exporter's centroid grouping. */
  visual: MeshData;
  town?: TownResult;
  /** Forest geometry, for statistics; trees ship as instances. */
  forest: MeshData;
  trees: TreeInstance[];
  /** Everything the navmesh is built on: terrain, trunks, structures. */
  collider: MeshData;
  /** What the runtime adds to the terrain chunks for physics: the structures. */
  solids: MeshData;
  lights: LightPlacement[];
  portals: PortalRecord[];
  /** Monsters standing about when the level loads. */
  spawns: SpawnRecord[];
  water: WaterSurface[];
  waterfalls: Waterfall[];
  points: NamedPoint[];
  /** Points the reachability check may fail on (summits, fords). */
  unreachableOk: string[];
  spaces: SpaceRecord[];
  spawn: { position: [number, number, number]; yawDeg: number };
  bounds: { min: [number, number, number]; max: [number, number, number] };
  terrainTextures: TerrainTextures;
  environment: RegionEnvironment;
}

function appendPlain(into: MeshData, mesh: MeshData): void {
  const base = into.positions.length / 3;
  for (const v of mesh.positions) into.positions.push(v);
  for (const v of mesh.normals) into.normals.push(v);
  for (const v of mesh.uvs) into.uvs.push(v);
  for (const idx of mesh.indices) into.indices.push(idx + base);
  for (const m of mesh.materials) into.materials.push(m);
}

const empty = (): MeshData => ({ positions: [], normals: [], uvs: [], indices: [], materials: [] });

/** The navmesh collider: the full-detail terrain plus whatever else is solid. */
function navCollider(base: { height: Heightfield; splat: Float32Array }, ...solids: MeshData[]) {
  const collider: ColouredMeshData = terrainMesh(base);
  for (const s of solids) appendMesh(collider, s);
  return {
    positions: collider.positions,
    normals: collider.normals,
    uvs: collider.uvs,
    indices: collider.indices,
    materials: collider.materials.map(() => ROLE.collider),
  };
}

/** The map's height clamped to its edge, for the backdrop's join. */
function edgeSampler(height: Heightfield, half: number): (x: number, z: number) => number {
  const c = (v: number): number => Math.max(-half + 6, Math.min(half - 6, v));
  return (x, z) => height.sample(c(x), c(z));
}

/** A monster beside a path: offset to one side, facing along it. */
function besidePath(
  height: Heightfield,
  path: GroundPath,
  along: number,
  side: number,
  kind = 'bandit',
): SpawnRecord {
  const p = path.at(along);
  const t = path.nearest(p[0], p[1]).tangent;
  const x = p[0] - t[1] * side;
  const z = p[1] + t[0] * side;
  return {
    kind,
    position: [x, height.sample(x, z), z],
    yawDeg: headingDeg(-t[0], -t[1]),
  };
}

const VALLEY_ENV: RegionEnvironment = {
  lightColor: [1.0, 0.92, 0.78],
  // Ambient lifted so walls in shade still read (MM6 lit outdoors flat and bright); the fog
  // is the sky's own horizon colour so the haze and the dome meet without a band.
  ambientColor: [0.46, 0.48, 0.54],
  fogColor: [0.6, 0.7, 0.85],
  // Thin enough that the backdrop ridges two kilometres out still show through the haze.
  fogDensity: 0.0009,
  skyZenith: [0.15, 0.3, 0.7],
  skyHorizon: [0.6, 0.7, 0.85],
  cloudAmount: 0.4,
};

const DESERT_ENV: RegionEnvironment = {
  lightColor: [1.0, 0.9, 0.72],
  ambientColor: [0.5, 0.47, 0.44],
  fogColor: [0.86, 0.8, 0.68],
  fogDensity: 0.0008,
  skyZenith: [0.3, 0.5, 0.82],
  skyHorizon: [0.86, 0.8, 0.68],
  cloudAmount: 0.15,
};

function buildValleyLevel(spec: TerrainSpec): TerrainLevel {
  const valley = generateValley(spec);
  const chunks = terrainChunks(valley, spec.chunkCells);
  const trees = placeTrees(valley, spec.forest);
  const forest = forestMeshes(trees);
  // The navmesh takes only the trunks near the road and the gorge, where monsters roam:
  // recast's solo builder drops polygons at the pass once the whole forest's trunks go in
  // (a combination effect, not a tree on the road), and far trunks are physics-only.
  const navTrunks = forestMeshes(
    trees.filter(
      (t) =>
        valley.road.nearest(t.x, t.z).distance < 150 ||
        valley.ravine.nearest(t.x, t.z).distance < 150,
    ),
  ).collider;
  const town = buildTown({
    centre: valley.town.centre,
    y: valley.town.y,
    radius: valley.town.radius,
    seed: spec.seed,
    roadDirection: valley.town.roadDirection,
  });
  const cave = caveMouth(valley.cave);
  const visual = empty();
  appendPlain(visual, town.visual);
  appendPlain(visual, cave.visual);
  const solids = empty();
  appendPlain(solids, town.collider);
  appendPlain(solids, cave.collider);
  const half = spec.width / 2;
  const bounds = {
    min: [-half, valley.height.min - 10, -half] as [number, number, number],
    max: [half, valley.height.max + 50, half] as [number, number, number],
  };
  // The pass: the road's end at the western edge is the door to the desert.
  const road = valley.road;
  const at3 = (along: number): [number, number, number] => {
    const p = road.at(along);
    return [p[0], valley.height.sample(p[0], p[1]), p[1]];
  };
  const back = road.nearest(...road.at(road.length - 10)).tangent;
  const pass = at3(road.length - 4);
  return {
    region: 'valley',
    height: valley.height,
    valley,
    chunks,
    backdrop: backdropMesh({
      seed: spec.seed + 99,
      half,
      reach: 2600,
      rings: 14,
      segments: 192,
      peak: 950,
      snowLine: 280,
      edgeHeight: edgeSampler(valley.height, half),
      // The pass opens onto the desert: the land beyond it drops to the desert's plateau.
      openings: [{ x: pass[0], z: pass[2], radius: 320, floor: pass[1] - 120 }],
    }),
    visual,
    town,
    forest: forest.visual,
    trees,
    collider: navCollider(valley, navTrunks, solids),
    solids,
    lights: [
      { position: cave.light, color: [1, 0.62, 0.3], range: 10, intensity: 2.5, kind: 'glow' },
    ],
    portals: [
      {
        name: 'cave',
        position: cave.portal,
        radius: 1.6,
        target: { level: 'showcase', entry: 'exit' },
        arrive: { position: cave.arrive, yawDeg: ((valley.cave.yaw + Math.PI) * 180) / Math.PI },
      },
      {
        name: 'pass',
        position: at3(road.length - 4),
        radius: 4,
        target: { level: 'desert', entry: 'pass' },
        // Arriving from the desert: on the road just inside the pass, facing back down it.
        arrive: {
          position: at3(road.length - 12),
          yawDeg: headingDeg(-back[0], -back[1]),
        },
      },
    ],
    // Bandits: on the road above the village, along the gorge banks and at the cave.
    spawns: [
      besidePath(valley.height, road, 140, 4),
      besidePath(valley.height, road, 300, -4),
      besidePath(valley.height, road, 520, 4),
      besidePath(valley.height, road, road.length * 0.75, -4),
      besidePath(valley.height, valley.ravine, 140, 10),
      besidePath(valley.height, valley.ravine, 330, -10),
      besidePath(valley.height, valley.ravine, valley.ravine.length - 75, 9),
      besidePath(valley.height, valley.river, valley.river.length * 0.4, 22),
    ],
    water: [riverSurface(valley), ...streamSurfaces(valley.ravine, valley.stream)],
    waterfalls: streamFalls(valley.ravine, valley.stream),
    // The cave's portal is a point too, so the build checks the tunnel is reachable.
    points: [...valley.points, { name: 'cave', position: cave.portal, kind: 'door' }],
    unreachableOk: ['summit', 'ford'],
    spaces: [
      {
        name: 'valley',
        kind: 'cavern',
        bounds,
        fog: { density: VALLEY_ENV.fogDensity, color: VALLEY_ENV.fogColor },
      },
    ],
    spawn: valley.spawn,
    bounds,
    terrainTextures: { base: 'grass', path: 'path', scree: 'scree', snow: 'snow' },
    environment: VALLEY_ENV,
  };
}

function buildDesertLevel(spec: TerrainSpec): TerrainLevel {
  const desert = generateDesert(spec);
  const chunks = terrainChunks(desert, spec.chunkCells);
  const forest = forestMeshes(desert.trees);
  const solids = empty();
  const half = spec.width / 2;
  const bounds = {
    min: [-half, desert.height.min - 10, -half] as [number, number, number],
    max: [half, desert.height.max + 50, half] as [number, number, number],
  };
  const road = desert.road;
  const at3 = (along: number): [number, number, number] => {
    const p = road.at(along);
    return [p[0], desert.height.sample(p[0], p[1]), p[1]];
  };
  const inward = road.nearest(...road.at(10)).tangent;
  return {
    region: 'desert',
    height: desert.height,
    desert,
    chunks,
    backdrop: backdropMesh({
      seed: spec.seed + 99,
      half,
      reach: 2600,
      rings: 12,
      segments: 160,
      peak: 260,
      snowLine: 1e9,
      edgeHeight: edgeSampler(desert.height, half),
    }),
    visual: empty(),
    forest: forest.visual,
    trees: desert.trees,
    collider: navCollider(desert, forest.collider),
    solids,
    lights: [],
    portals: [
      {
        name: 'pass',
        position: at3(3),
        radius: 4,
        target: { level: 'valley', entry: 'pass' },
        arrive: {
          position: at3(10),
          yawDeg: headingDeg(inward[0], inward[1]),
        },
      },
    ],
    spawns: [
      besidePath(desert.height, road, road.length * 0.25, 5),
      besidePath(desert.height, road, road.length * 0.45, -5),
      besidePath(desert.height, road, road.length * 0.62, 5),
      besidePath(desert.height, road, road.length * 0.85, -5),
    ],
    water: [oasisSurface(desert)],
    waterfalls: [],
    points: desert.points,
    unreachableOk: [],
    spaces: [
      {
        name: 'desert',
        kind: 'cavern',
        bounds,
        fog: { density: DESERT_ENV.fogDensity, color: DESERT_ENV.fogColor },
      },
    ],
    spawn: desert.spawn,
    bounds,
    terrainTextures: { base: 'sand', path: 'path', scree: 'sandstone', snow: 'sand' },
    environment: DESERT_ENV,
  };
}

export function buildTerrainLevel(spec: TerrainSpec): TerrainLevel {
  return (spec.region ?? 'valley') === 'desert' ? buildDesertLevel(spec) : buildValleyLevel(spec);
}
