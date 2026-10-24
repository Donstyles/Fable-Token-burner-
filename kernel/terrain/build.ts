/**
 * Everything an outdoor region writes (kernel/terrain/region.ts): geometry, collider, water
 * and the sidecar's fields. The generated valley and desert that first filled this type were
 * scrapped by the owner on 2026-10-19; regions are hand-written now.
 */
import type { MeshData } from '../core/mesh';
import type {
  LightPlacement,
  NamedPoint,
  PortalRecord,
  SpaceRecord,
  SpawnRecord,
  Waterfall,
  WaterSurface,
} from '../plan/level';
import type { TerrainChunk } from './chunks';
import type { Heightfield } from './heightfield';
import type { ColouredMeshData } from './mesh';
import type { PropPlacement } from './plots';
import type { TreeInstance } from './trees';

/** A hand-written region; the sidecar carries it for the runtime's per-region choices. */
export type RegionKind = 'region';

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
  /** Per vertex: path, scree and the fourth slot's weights (the map sheet reads them). */
  splat: Float32Array;
  chunks: TerrainChunk[];
  /** The ring of far mountains beyond the map edge; drawn, never collided with. */
  backdrop: ColouredMeshData;
  /** Generated structures (the cave mouth); chunked by the exporter's centroid grouping. */
  visual: MeshData;
  /** Meshy models placed in the world: buildings, props, rocks (DESIGN.md 10.3). */
  props: PropPlacement[];
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
  /** The tops of the chimneys, where the hearths' smoke rises (DESIGN.md 17.6). */
  smoke?: [number, number, number][];
  /** Points the reachability check may fail on (summits, fords). */
  unreachableOk: string[];
  spaces: SpaceRecord[];
  spawn: { position: [number, number, number]; yawDeg: number };
  bounds: { min: [number, number, number]; max: [number, number, number] };
  terrainTextures: TerrainTextures;
  environment: RegionEnvironment;
}
