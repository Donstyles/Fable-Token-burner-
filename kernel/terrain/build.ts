/** Everything a terrain level writes: geometry, collider, water, sidecar fields. */
import type { MeshData } from '../core/mesh';
import { ROLE } from '../elements/roles';
import type {
  LightPlacement,
  NamedPoint,
  PortalRecord,
  SpaceRecord,
  WaterSurface,
} from '../plan/level';
import { caveMouth } from './cave';
import { terrainChunks, type TerrainChunk } from './chunks';
import { appendMesh, terrainMesh, type ColouredMeshData } from './mesh';
import { riverSurface } from './river';
import { buildTown, type TownResult } from './town';
import { forestMeshes, placeTrees, type ForestOptions, type TreeInstance } from './trees';
import { generateValley, type ValleyResult } from './valley';

export interface TerrainSpec {
  seed: number;
  width: number;
  cell: number;
  /** Cells per chunk side; must divide width / cell. */
  chunkCells: number;
  forest?: ForestOptions;
}

export interface TerrainLevel {
  valley: ValleyResult;
  chunks: TerrainChunk[];
  /** The village: houses and the well, chunked by the exporter's centroid grouping. */
  visual: MeshData;
  town: TownResult;
  /** Forest geometry, for statistics; trees ship as instances. */
  forest: MeshData;
  trees: TreeInstance[];
  /** Everything the navmesh is built on: terrain, trunks, houses. */
  collider: MeshData;
  /** What the runtime adds to the terrain chunks for physics: houses, the well, the cave. */
  solids: MeshData;
  lights: LightPlacement[];
  portals: PortalRecord[];
  water: WaterSurface[];
  points: NamedPoint[];
  spaces: SpaceRecord[];
  spawn: ValleyResult['spawn'];
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

function appendPlain(into: MeshData, mesh: MeshData): void {
  const base = into.positions.length / 3;
  for (const v of mesh.positions) into.positions.push(v);
  for (const v of mesh.normals) into.normals.push(v);
  for (const v of mesh.uvs) into.uvs.push(v);
  for (const idx of mesh.indices) into.indices.push(idx + base);
  for (const m of mesh.materials) into.materials.push(m);
}

export function buildTerrainLevel(spec: TerrainSpec): TerrainLevel {
  const valley = generateValley(spec);
  const chunks = terrainChunks(valley, spec.chunkCells);
  const trees = placeTrees(valley, spec.forest);
  const forest = forestMeshes(trees);
  const town = buildTown({
    centre: valley.town.centre,
    y: valley.town.y,
    radius: valley.town.radius,
    seed: spec.seed,
    roadDirection: valley.town.roadDirection,
  });
  const cave = caveMouth(valley.cave);
  const visual: MeshData = { positions: [], normals: [], uvs: [], indices: [], materials: [] };
  appendPlain(visual, town.visual);
  appendPlain(visual, cave.visual);
  const solids: MeshData = { positions: [], normals: [], uvs: [], indices: [], materials: [] };
  appendPlain(solids, town.collider);
  appendPlain(solids, cave.collider);
  // The navmesh collider is the full-detail terrain plus the trunks, the houses and the cave.
  const collider: ColouredMeshData = terrainMesh(valley);
  appendMesh(collider, forest.collider);
  appendMesh(collider, solids);
  const colliderPlain: MeshData = {
    positions: collider.positions,
    normals: collider.normals,
    uvs: collider.uvs,
    indices: collider.indices,
    materials: collider.materials.map(() => ROLE.collider),
  };
  const half = spec.width / 2;
  const bounds = {
    min: [-half, valley.height.min - 10, -half] as [number, number, number],
    max: [half, valley.height.max + 50, half] as [number, number, number],
  };
  return {
    valley,
    chunks,
    visual,
    town,
    forest: forest.visual,
    trees,
    collider: colliderPlain,
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
        arrive: {
          position: cave.arrive,
          yawDeg: ((valley.cave.yaw + Math.PI) * 180) / Math.PI,
        },
      },
    ],
    water: [riverSurface(valley)],
    // The cave's portal is a point too, so the build checks the tunnel is reachable.
    points: [...valley.points, { name: 'cave', position: cave.portal, kind: 'door' }],
    spaces: [
      {
        name: 'valley',
        kind: 'cavern',
        bounds,
        fog: { density: 0.0017, color: [0.62, 0.68, 0.78] },
      },
    ],
    spawn: valley.spawn,
    bounds,
  };
}
