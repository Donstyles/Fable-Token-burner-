/** Everything a terrain level writes: geometry, collider, water, sidecar fields. */
import type { MeshData } from '../core/mesh';
import { ROLE } from '../elements/roles';
import type { NamedPoint, SpaceRecord, WaterSurface } from '../plan/level';
import { terrainChunks, type TerrainChunk } from './chunks';
import { appendMesh, terrainMesh, type ColouredMeshData } from './mesh';
import { riverSurface } from './river';
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
  /** Trees, chunked by the exporter's centroid grouping. */
  forest: MeshData;
  trees: TreeInstance[];
  collider: MeshData;
  water: WaterSurface[];
  points: NamedPoint[];
  spaces: SpaceRecord[];
  spawn: ValleyResult['spawn'];
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

export function buildTerrainLevel(spec: TerrainSpec): TerrainLevel {
  const valley = generateValley(spec);
  const chunks = terrainChunks(valley, spec.chunkCells);
  const trees = placeTrees(valley, spec.forest);
  const forest = forestMeshes(trees);
  // The collider is the full-detail terrain plus the trunks.
  const collider: ColouredMeshData = terrainMesh(valley);
  appendMesh(collider, forest.collider);
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
    forest: forest.visual,
    trees,
    collider: colliderPlain,
    water: [riverSurface(valley)],
    points: valley.points,
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
