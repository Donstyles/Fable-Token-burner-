/**
 * The ravine stream (DESIGN.md 15.4): a terraced brook in a trough down the gorge, a flat
 * pool on each terrace and a waterfall at each step, ending in a plunge pool near the
 * valley floor. The valley generator lays the terraces out and cuts the trough; this module
 * turns them into water surfaces and waterfall sheets for the level.
 */
import { ROLE } from '../elements/roles';
import { waterfallRibbon } from '../elements/waterfall';
import type { Waterfall, WaterSurface } from '../plan/level';
import type { GroundPath, P2 } from './spline';

export interface StreamTerrace {
  /** Arc length along the ravine where the terrace starts (downstream) and ends. */
  from: number;
  to: number;
  /** Water surface height. */
  y: number;
}

export interface StreamLayout {
  terraces: StreamTerrace[];
  /** The plunge pool at the foot of the lowest fall. */
  pool: { centre: P2; y: number; radius: number };
  /** Half-width of the water ribbons. */
  halfWidth: number;
}

/** Water ribbons along the ravine for each terrace, and the plunge pool disc. */
export function streamSurfaces(ravine: GroundPath, s: StreamLayout): WaterSurface[] {
  const out: WaterSurface[] = [];
  s.terraces.forEach((t, i) => {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const materials: number[] = [];
    let min: [number, number, number] = [Infinity, t.y - 3, Infinity];
    let max: [number, number, number] = [-Infinity, t.y, -Infinity];
    const steps = Math.max(2, Math.ceil((t.to - t.from) / 6));
    for (let k = 0; k <= steps; k++) {
      const along = t.from + ((t.to - t.from) * k) / steps;
      const p = ravine.at(along);
      const tan = ravine.nearest(p[0], p[1]).tangent;
      for (const side of [-1, 1]) {
        const x = p[0] - tan[1] * s.halfWidth * side;
        const z = p[1] + tan[0] * s.halfWidth * side;
        positions.push(x, t.y, z);
        normals.push(0, 1, 0);
        uvs.push(x, z);
        min = [Math.min(min[0], x), t.y - 3, Math.min(min[2], z)];
        max = [Math.max(max[0], x), t.y, Math.max(max[2], z)];
      }
      if (k > 0) {
        const a = (k - 1) * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        materials.push(ROLE.water, ROLE.water);
      }
    }
    // The brook flows down the gorge: against the ravine's direction.
    const head = ravine.at(t.to);
    const foot = ravine.at(t.from);
    const len = Math.hypot(foot[0] - head[0], foot[1] - head[1]) || 1;
    out.push({
      name: `brook-${i}`,
      kind: 'river',
      y: t.y,
      bounds: { min, max },
      flow: [(foot[0] - head[0]) / len, (foot[1] - head[1]) / len],
      mesh: { positions, normals, uvs, indices, materials },
    });
  });
  // The plunge pool: a disc.
  const { centre, y, radius } = s.pool;
  const segs = 16;
  const positions: number[] = [centre[0], y, centre[1]];
  const normals: number[] = [0, 1, 0];
  const uvs: number[] = [centre[0], centre[1]];
  const indices: number[] = [];
  const materials: number[] = [];
  for (let k = 0; k < segs; k++) {
    const a = (k / segs) * Math.PI * 2;
    const x = centre[0] + Math.cos(a) * radius;
    const z = centre[1] + Math.sin(a) * radius;
    positions.push(x, y, z);
    normals.push(0, 1, 0);
    uvs.push(x, z);
    const next = ((k + 1) % segs) + 1;
    indices.push(0, next, k + 1);
    materials.push(ROLE.water);
  }
  out.push({
    name: 'plunge-pool',
    kind: 'pool',
    y,
    bounds: {
      min: [centre[0] - radius, y - 3, centre[1] - radius],
      max: [centre[0] + radius, y, centre[1] + radius],
    },
    flow: [0, 0],
    mesh: { positions, normals, uvs, indices, materials },
  });
  return out;
}

/** A waterfall at the foot of every terrace, into the terrace below or the plunge pool. */
export function streamFalls(ravine: GroundPath, s: StreamLayout, width = 6): Waterfall[] {
  return s.terraces.map((t, i) => {
    const lipAt = ravine.at(t.from);
    const plungeAt = ravine.at(Math.max(0, t.from - 4));
    const below = i > 0 ? s.terraces[i - 1]!.y : s.pool.y;
    return waterfallRibbon({
      name: `cascade-${i}`,
      lip: [lipAt[0], t.y, lipAt[1]],
      plunge: [plungeAt[0], below + 0.1, plungeAt[1]],
      width,
    });
  });
}
