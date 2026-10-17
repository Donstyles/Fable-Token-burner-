/**
 * An alpine valley (DESIGN.md 15): a river on a flat floor, convex slopes rising to crags and
 * peaks, a side ravine, a serpentine road climbing to a pass through the western ridge, and
 * forests on the gentler slopes. Everything derives from one seed.
 */
import type { Vec3 } from '../core/math';
import type { NamedPoint } from '../plan/level';
import { CAVE, caveLocalOf, type CaveSpec } from './cave';
import { Heightfield } from './heightfield';
import { layRoad } from './road';
import { fbm, lerp, ridged, smoothstep } from './noise';
import { GroundPath, headingDeg, smoothPath, type P2 } from './spline';
import type { StreamLayout } from './stream';

export interface ValleySpec {
  seed: number;
  /** Map width in metres, square. */
  width: number;
  /** Grid cell in metres. */
  cell: number;
}

export interface ValleyResult {
  spec: ValleySpec;
  height: Heightfield;
  /** Per vertex: path, scree, snow weights; grass is the remainder. */
  splat: Float32Array;
  /** Per vertex: 1 where a tree may stand. */
  forest: Uint8Array;
  river: GroundPath;
  riverWidth: number;
  waterLevel: number;
  road: GroundPath;
  roadWidth: number;
  ravine: GroundPath;
  /** The village square: flattened ground round the well where the road begins. */
  town: { centre: P2; y: number; radius: number; roadDirection: number };
  /** The cave mouth at the ravine head: its placement for `caveMouth`. */
  cave: CaveSpec;
  /** The terraced brook down the ravine. */
  stream: StreamLayout;
  spawn: { position: Vec3; yawDeg: number };
  points: NamedPoint[];
  peaks: { x: number; z: number; height: number }[];
}

const FLOOR = 2.5;
const BED = -1.6;
const RIVER_BED_HALF = 9;
export const WATER_LEVEL = 0.7;

export function generateValley(spec: ValleySpec): ValleyResult {
  const { seed, width, cell } = spec;
  const half = width / 2;
  const cells = Math.round(width / cell);
  const hf = new Heightfield(cells, cell);
  const n = hf.n;

  // The river meanders from south to north through the middle; it flows south.
  const k0 = half / 512;
  const river = new GroundPath(
    smoothPath(
      [
        [40 * k0, -half - 20],
        [-30 * k0, -half * 0.62],
        [70 * k0, -half * 0.25],
        [-60 * k0, half * 0.1],
        [30 * k0, half * 0.45],
        [-20 * k0, half + 20],
      ],
      10,
    ),
  );
  // A ravine cuts into the eastern slope from the river bank up toward the ridge.
  const ravine = new GroundPath(
    smoothPath(
      [
        [60 * k0, half * 0.05],
        [150 * k0, half * 0.12],
        [250 * k0, half * 0.1],
        [340 * k0, half * 0.2],
        [430 * k0, half * 0.26],
      ],
      8,
    ),
  );
  // The serpentine road: from the village square on the western bank, switchbacks up the
  // slope to the pass. Laid out in fractions of the map so a small test map keeps the same
  // shape.
  const k = half / 512;
  const townCentre: P2 = [-55 * k, -half * 0.3];
  const roadControls: P2[] = [
    townCentre,
    [-95 * k, -half * 0.18],
    [-150 * k, -half * 0.32],
    [-205 * k, -half * 0.12],
    [-260 * k, -half * 0.3],
    [-315 * k, -half * 0.08],
    [-370 * k, -half * 0.26],
    [-425 * k, -half * 0.06],
    [-half + 12, -half * 0.14],
  ];
  const road = new GroundPath(smoothPath(roadControls, 10));
  const pass: P2 = road.at(road.length - 1);

  // The ravine floor climbs toward the head; the brook steps down it in terraces. Each pool
  // lies level with the banks at its foot, so the water spills over the lip there, and sits
  // in a trough that deepens toward its head, where the fall from the terrace above lands.
  const ravineFloor = (along: number): number => 3 + (along / k0) * 0.24;
  const STREAM_FROM = 60;
  const TERRACE = 60;
  const streamTo = ravine.length - 60;
  const terraceCount = Math.max(1, Math.floor((streamTo - STREAM_FROM) / TERRACE));
  const terraces = Array.from({ length: terraceCount }, (_, i) => {
    const from = STREAM_FROM + i * TERRACE;
    const to = i === terraceCount - 1 ? streamTo : from + TERRACE;
    return { from, to, y: ravineFloor(from) - 0.3 };
  });
  const terraceAt = (along: number): (typeof terraces)[number] | null => {
    if (along < STREAM_FROM || along > streamTo) return null;
    const i = Math.min(terraceCount - 1, Math.floor((along - STREAM_FROM) / TERRACE));
    return terraces[i]!;
  };
  const poolCentre = ravine.at(STREAM_FROM - 10);
  const POOL_R = 10;
  const poolY = ravineFloor(STREAM_FROM - 10) - 4;
  const stream: StreamLayout = {
    terraces,
    pool: { centre: poolCentre, y: poolY, radius: POOL_R },
    halfWidth: 6.5,
  };
  const peaks = [
    { x: -half * 0.72, z: half * 0.7, height: 95, r: 150 },
    { x: half * 0.7, z: half * 0.78, height: 130, r: 130 },
    { x: half * 0.75, z: -half * 0.72, height: 80, r: 170 },
    { x: -half * 0.8, z: -half * 0.74, height: 60, r: 140 },
  ];

  // Pass 1: the land without the road.
  const base = (x: number, z: number): number => {
    const dv = river.nearest(x, z).distance;
    const t = smoothstep(55 * k0, 500 * k0, dv);
    let h = FLOOR + 230 * Math.pow(t, 1.45);
    h += (fbm(x, z, 260, seed) * 0.5 + 0.5) * 60 * smoothstep(20 * k0, 200 * k0, dv);
    h += ridged(x, z, 180, seed + 7) * 110 * smoothstep(200 * k0, 520 * k0, dv);
    h += fbm(x, z, 40, seed + 3) * 4;
    for (const p of peaks) {
      const d2 = ((x - p.x) * (x - p.x) + (z - p.z) * (z - p.z)) / (p.r * p.r);
      h += p.height * Math.exp(-d2);
    }
    // The pass: a saddle in the western ridge where the road arrives.
    const sx = (x - pass[0]) / 170;
    const sz = (z - pass[1]) / 95;
    h -= 150 * Math.exp(-(sx * sx + sz * sz));
    // River bed.
    if (dv < RIVER_BED_HALF) {
      const u = dv / RIVER_BED_HALF;
      h = Math.min(h, BED + (FLOOR - BED) * u * u);
    }
    // Ravine: a flat-bottomed gorge whose floor climbs with the slope, with the brook's
    // trough down its middle and the plunge pool's bowl at its foot.
    const r = ravine.nearest(x, z);
    const rw = 48 * k0;
    if (r.distance < rw) {
      const bottom = ravineFloor(r.along);
      const u = Math.max(0, r.distance - 13) / rw;
      h = Math.min(h, bottom + 75 * u * u);
      const t = terraceAt(r.along);
      // Deep enough that the surface between 5 m vertices never rises through the water,
      // shallowing to a sill at the lip so nothing can be seen under the water from below.
      if (t && r.distance < 7) {
        const depth = 0.5 + 2 * smoothstep(0, 12, r.along - t.from);
        h = Math.min(h, t.y - depth);
      }
      const dp = Math.hypot(x - poolCentre[0], z - poolCentre[1]);
      if (dp < POOL_R) h = Math.min(h, poolY - 1.6 + 1.6 * (dp / POOL_R) * (dp / POOL_R));
    }
    return h;
  };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) hf.set(i, j, base(hf.x(i), hf.z(j)));
  }

  // The village square: level ground round the well, blending into the slope beyond.
  const TOWN_RADIUS = 40;
  const townY = Math.max(FLOOR + 3, hf.sample(townCentre[0], townCentre[1]));
  const dTown = (x: number, z: number): number => Math.hypot(x - townCentre[0], z - townCentre[1]);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const d = dTown(hf.x(i), hf.z(j));
      if (d > TOWN_RADIUS + 40) continue;
      hf.set(i, j, lerp(townY, hf.get(i, j), smoothstep(TOWN_RADIUS, TOWN_RADIUS + 40, d)));
    }
  }

  // The cave mouth at the ravine head, facing down the ravine: the ground under the tunnel
  // is cut away so it never pokes through the floor, and the threshold in front is levelled.
  const caveAt = ravine.at(ravine.length - 25);
  const caveDir = ravine.nearest(caveAt[0], caveAt[1]).tangent;
  const cave: CaveSpec = {
    x: caveAt[0],
    y: hf.sample(caveAt[0], caveAt[1]),
    z: caveAt[1],
    yaw: Math.atan2(-caveDir[0], caveDir[1]),
  };
  const caveReach = CAVE.length + CAVE.skirt + 20;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = hf.x(i);
      const z = hf.z(j);
      if (Math.hypot(x - cave.x, z - cave.z) > caveReach) continue;
      const l = caveLocalOf(cave, x, z);
      const hw = CAVE.width / 2 + 1.5;
      if (
        Math.abs(l.x) <= hw + 0.3 &&
        l.z >= -CAVE.threshold &&
        l.z <= CAVE.length + CAVE.cutBehind
      ) {
        hf.set(i, j, Math.min(hf.get(i, j), cave.y - CAVE.cutDepth));
      } else if (l.z < -CAVE.threshold && l.z > -CAVE.threshold - 16 && Math.abs(l.x) < hw + 6) {
        const w = 1 - smoothstep(CAVE.threshold, CAVE.threshold + 16, -l.z);
        hf.set(i, j, lerp(hf.get(i, j), cave.y, w));
      }
    }
  }

  // The road: smoothed, never dropping, never steeper than a cart road; the land is cut to
  // match it within a shoulder.
  const ROAD_WIDTH = 10;
  layRoad(hf, road, { width: ROAD_WIDTH, cutTo: 22, maxGradeDeg: 22 });

  // Splat weights and the forest mask.
  const splat = new Float32Array(n * n * 3);
  const forest = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = hf.x(i);
      const z = hf.z(j);
      const h = hf.get(i, j);
      const s = hf.slopeDeg(i, j);
      const dRoad = road.nearest(x, z).distance;
      const dRiver = river.nearest(x, z).distance;
      const dRavine = ravine.nearest(x, z).distance;
      let path = Math.max(
        1 - smoothstep(ROAD_WIDTH / 2, ROAD_WIDTH / 2 + 3, dRoad),
        1 - smoothstep(TOWN_RADIUS * 0.6, TOWN_RADIUS * 0.85, dTown(x, z)),
      );
      let scree =
        smoothstep(32, 46, s) + 0.6 * smoothstep(6, 2, dRiver) * (h < FLOOR + 0.5 ? 1 : 0);
      let snow = smoothstep(235, 268, h) * (1 - smoothstep(35, 50, s));
      const total = path + scree + snow;
      if (total > 1) {
        path /= total;
        scree /= total;
        snow /= total;
      }
      const k = (j * n + i) * 3;
      splat[k] = path;
      splat[k + 1] = scree;
      splat[k + 2] = snow;
      forest[j * n + i] =
        s < 30 &&
        h > FLOOR + 1.5 &&
        h < 205 &&
        dRoad > 9 &&
        dRiver > 20 &&
        dRavine > 30 &&
        dTown(x, z) > TOWN_RADIUS + 20 &&
        fbm(x, z, 140, seed + 11) > 0.1
          ? 1
          : 0;
    }
  }

  const start = road.at(18);
  const tangent = road.nearest(start[0], start[1]).tangent;
  const yawDeg = headingDeg(tangent[0], tangent[1]);
  const at3 = (p: P2): Vec3 => [p[0], hf.sample(p[0], p[1]), p[1]];
  let top = { i: 0, j: 0, h: -Infinity };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const h = hf.get(i, j);
      if (h > top.h) top = { i, j, h };
    }
  }
  const exit = road.nearest(townCentre[0], townCentre[1]).tangent;
  const points: NamedPoint[] = [
    { name: 'town', position: at3(road.at(8)), kind: 'poi' },
    { name: 'pass', position: at3(road.at(road.length - 40)), kind: 'poi' },
    { name: 'road-mid', position: at3(road.at(road.length / 2)), kind: 'poi' },
    { name: 'ravine-head', position: at3(ravine.at(ravine.length - 45)), kind: 'poi' },
    { name: 'ford', position: at3(river.at(river.length * 0.55)), kind: 'poi' },
    { name: 'summit', position: [hf.x(top.i), top.h, hf.z(top.j)], kind: 'poi' },
  ];
  return {
    spec,
    height: hf,
    splat,
    forest,
    river,
    // Narrower than the bed, so the ribbon's edge meets the bank under the water line.
    riverWidth: 2 * RIVER_BED_HALF * 0.72,
    waterLevel: WATER_LEVEL,
    road,
    roadWidth: ROAD_WIDTH,
    ravine,
    cave,
    stream,
    town: {
      centre: townCentre,
      y: townY,
      radius: TOWN_RADIUS,
      roadDirection: Math.atan2(exit[1], exit[0]),
    },
    spawn: { position: at3(start), yawDeg },
    points,
    peaks: peaks.map((p) => ({ x: p.x, z: p.z, height: hf.sample(p.x, p.z) })),
  };
}
