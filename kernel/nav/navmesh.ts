import {
  NavMeshQuery,
  exportNavMesh,
  getNavMeshPositionsAndIndices,
  init,
  type NavMesh,
} from '@recast-navigation/core';
import { generateSoloNavMesh, generateTiledNavMesh } from '@recast-navigation/generators';
import { v3, type Vec3 } from '../core/math';
import type { MeshData } from '../core/mesh';

/**
 * Recast navmesh baked from the collider (DESIGN.md 11.7) and the reachability check that
 * fails a level build when a marked point cannot be walked to from the spawn (11.5).
 */
export interface NavOptions {
  /** Voxel size on the ground plane, metres. */
  cellSize?: number;
  /** Voxel height, metres. */
  cellHeight?: number;
  agentHeight?: number;
  agentRadius?: number;
  /**
   * Tile side in cells. A solo mesh keeps its polygon vertices in 16-bit indices, so a
   * region kilometres wide with thousands of trunks overflows it and the last-built corner
   * (the pass, at the west edge) silently loses its polygons; tiles keep each count small.
   */
  tileSize?: number;
  /** Smallest walkable island kept, m²; trunk tops and pebbles below it are dropped. */
  minRegionArea?: number;
  /** Highest ledge the agent steps over. */
  agentMaxClimb?: number;
  agentMaxSlopeDeg?: number;
}

export interface NavResult {
  navMesh: NavMesh;
  /** Detour binary, loadable with importNavMesh. */
  bytes: Uint8Array;
  /** Debug triangles of the walkable surface. */
  debug: { positions: number[]; indices: number[] };
}

let ready: Promise<void> | null = null;

export function navInit(): Promise<void> {
  ready ??= init();
  return ready;
}

export async function buildNavMesh(collider: MeshData, o: NavOptions = {}): Promise<NavResult> {
  await navInit();
  // Fine voxels: at 0.2 m cells the helical ramps under spiral stairs lose spans to the
  // ledge filter depending on where the grid happens to fall; 0.1 m keeps them whole.
  const cs = o.cellSize ?? 0.1;
  const ch = o.cellHeight ?? 0.05;
  const config = {
    cs,
    ch,
    walkableSlopeAngle: o.agentMaxSlopeDeg ?? 50,
    walkableHeight: Math.ceil((o.agentHeight ?? 1.8) / ch),
    walkableClimb: Math.floor((o.agentMaxClimb ?? 0.45) / ch),
    walkableRadius: Math.ceil((o.agentRadius ?? 0.35) / cs),
    maxEdgeLen: Math.round(12 / cs),
    maxSimplificationError: 1.3,
    minRegionArea: Math.round((o.minRegionArea ?? 0.5) / (cs * cs)),
    mergeRegionArea: Math.round(2 / (cs * cs)),
    maxVertsPerPoly: 6,
    detailSampleDist: 6,
    detailSampleMaxError: 1,
  };
  const result = o.tileSize
    ? generateTiledNavMesh(collider.positions, collider.indices, {
        ...config,
        tileSize: o.tileSize,
      })
    : generateSoloNavMesh(collider.positions, collider.indices, config);
  if (!result.success) throw new Error(`navmesh generation failed: ${result.error}`);
  const [positions, indices] = getNavMeshPositionsAndIndices(result.navMesh);
  return {
    navMesh: result.navMesh,
    bytes: exportNavMesh(result.navMesh),
    debug: { positions, indices },
  };
}

export interface ReachTarget {
  name: string;
  position: Vec3;
}

export interface ReachReport {
  ok: boolean;
  /** One entry per target, in order. */
  results: { name: string; reachable: boolean; reason?: string; pathLength?: number }[];
}

const asV = (p: Vec3): { x: number; y: number; z: number } => ({ x: p[0], y: p[1], z: p[2] });

/** Can every target be walked to from `from`? Targets must lie within 1 m of the navmesh. */
export function checkReachability(
  navMesh: NavMesh,
  from: Vec3,
  targets: ReachTarget[],
  tolerance = 1,
): ReachReport {
  const query = new NavMeshQuery(navMesh);
  const halfExtents = { x: tolerance, y: tolerance * 2, z: tolerance };
  const start = query.findNearestPoly(asV(from), { halfExtents });
  const results: ReachReport['results'] = [];
  for (const t of targets) {
    if (!start.success || !start.nearestRef) {
      results.push({ name: t.name, reachable: false, reason: 'spawn is not on the navmesh' });
      continue;
    }
    const near = query.findNearestPoly(asV(t.position), { halfExtents });
    if (!near.success || !near.nearestRef) {
      results.push({ name: t.name, reachable: false, reason: 'not on the navmesh' });
      continue;
    }
    const nearPoint: Vec3 = [near.nearestPoint.x, near.nearestPoint.y, near.nearestPoint.z];
    if (v3.distance(nearPoint, t.position) > tolerance) {
      results.push({ name: t.name, reachable: false, reason: 'navmesh too far from the point' });
      continue;
    }
    const path = query.computePath(
      { x: start.nearestPoint.x, y: start.nearestPoint.y, z: start.nearestPoint.z },
      asV(nearPoint),
      { halfExtents, maxPathPolys: 2048, maxStraightPathPoints: 2048 },
    );
    if (!path.success || path.path.length === 0) {
      results.push({ name: t.name, reachable: false, reason: path.error?.name ?? 'no path' });
      continue;
    }
    const last = path.path[path.path.length - 1]!;
    const end: Vec3 = [last.x, last.y, last.z];
    if (v3.distance(end, nearPoint) > tolerance) {
      results.push({ name: t.name, reachable: false, reason: 'path stops short' });
      continue;
    }
    let length = 0;
    for (let i = 1; i < path.path.length; i++) {
      const a = path.path[i - 1]!;
      const b = path.path[i]!;
      length += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    }
    results.push({ name: t.name, reachable: true, pathLength: length });
  }
  query.destroy();
  return { ok: results.every((r) => r.reachable), results };
}
