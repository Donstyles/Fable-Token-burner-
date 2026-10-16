/**
 * Roads on terrain (DESIGN.md 15.1): the land under a ground path is smoothed into a
 * profile that never drops along the way and never exceeds a cart's grade, and the
 * terrain is cut or filled to meet it across the road and a shoulder.
 */
import type { Heightfield } from './heightfield';
import { lerp, smoothstep } from './noise';
import type { GroundPath } from './spline';

export interface RoadOptions {
  width: number;
  /** Shoulder: the cut or fill blends into the land this far from the centreline. */
  cutTo: number;
  maxGradeDeg: number;
  /** Let the profile fall along the path (a road down into a desert) as well as rise. */
  allowDescent?: boolean;
}

export const DEFAULT_ROAD: RoadOptions = { width: 10, cutTo: 22, maxGradeDeg: 22 };

/** Flatten the heightfield under the road; returns the height along it. */
export function layRoad(
  hf: Heightfield,
  road: GroundPath,
  o: RoadOptions = DEFAULT_ROAD,
): (along: number) => number {
  const samples = Math.ceil(road.length / 4);
  const profile: number[] = [];
  for (let s = 0; s <= samples; s++) {
    const p = road.at((s / samples) * road.length);
    profile.push(hf.sample(p[0], p[1]));
  }
  for (let pass = 0; pass < 3; pass++) {
    for (let s = 1; s < profile.length - 1; s++) {
      profile[s] = (profile[s - 1]! + profile[s]! * 2 + profile[s + 1]!) / 4;
    }
  }
  const maxRise = Math.tan((o.maxGradeDeg * Math.PI) / 180) * (road.length / samples);
  for (let s = 1; s < profile.length; s++) {
    const prev = profile[s - 1]!;
    const floor = o.allowDescent ? prev - maxRise : prev;
    profile[s] = Math.min(Math.max(profile[s]!, floor), prev + maxRise);
  }
  const roadHeight = (along: number): number => {
    const f = (along / road.length) * samples;
    const a = Math.min(samples, Math.max(0, Math.floor(f)));
    const b = Math.min(samples, a + 1);
    return lerp(profile[a]!, profile[b]!, f - a);
  };
  const n = hf.n;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = hf.x(i);
      const z = hf.z(j);
      const hit = road.nearest(x, z);
      if (hit.distance > o.cutTo) continue;
      const w = 1 - smoothstep(o.width / 2 + 2, o.cutTo, hit.distance);
      hf.set(i, j, lerp(hf.get(i, j), roadHeight(hit.along), w));
    }
  }
  return roadHeight;
}
