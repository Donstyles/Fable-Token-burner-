/**
 * A desert (DESIGN.md 15.5): dune fields running north to south, three flat-topped mesas,
 * an oasis with a ring of trees, and a road from the pass on the eastern edge down across
 * the sand to the oasis and on to the mesas. Everything derives from one seed.
 */
import type { Vec3 } from '../core/math';
import type { NamedPoint } from '../plan/level';
import { Heightfield } from './heightfield';
import type { TerrainBase } from './mesh';
import { fbm, ridged, smoothstep } from './noise';
import { layRoad } from './road';
import { GroundPath, headingDeg, smoothPath, type P2 } from './spline';
import type { TreeInstance } from './trees';

export interface DesertSpec {
  seed: number;
  width: number;
  cell: number;
}

export interface DesertResult extends TerrainBase {
  spec: DesertSpec;
  road: GroundPath;
  roadWidth: number;
  oasis: { centre: P2; y: number; radius: number };
  trees: TreeInstance[];
  spawn: { position: Vec3; yawDeg: number };
  points: NamedPoint[];
}

const BASE = 20;
const ROAD_WIDTH = 9;

export function generateDesert(spec: DesertSpec): DesertResult {
  const { seed, width, cell } = spec;
  const half = width / 2;
  const cells = Math.round(width / cell);
  const hf = new Heightfield(cells, cell);
  const n = hf.n;
  const k = half / 800;

  // The road: from the pass on the eastern edge, down the escarpment, across the dunes to
  // the oasis, and on to the mesas in the west.
  const entry: P2 = [half - 14, 0];
  const oasisCentre: P2 = [-half * 0.1, half * 0.15];
  const road = new GroundPath(
    smoothPath(
      [
        entry,
        [half * 0.72, -half * 0.05],
        [half * 0.45, half * 0.08],
        [half * 0.2, half * 0.02],
        // Round the oasis on its northern side, never through it.
        [oasisCentre[0] + 70 * k, oasisCentre[1] + 20 * k],
        [oasisCentre[0] + 20 * k, oasisCentre[1] + 70 * k],
        [oasisCentre[0] - 60 * k, oasisCentre[1] + 55 * k],
        [-half * 0.35, half * 0.05],
        [-half * 0.6, -half * 0.3],
      ],
      10,
    ),
  );
  const mesas = [
    { x: -half * 0.62, z: -half * 0.42, r: 150 * k, h: 62 },
    { x: -half * 0.55, z: half * 0.55, r: 120 * k, h: 48 },
    { x: half * 0.3, z: -half * 0.6, r: 170 * k, h: 70 },
  ];
  const OASIS_R = 28;

  const base = (x: number, z: number): number => {
    // Dunes: ridges elongated north to south, their height varying slowly.
    const amp = 10 + 8 * (fbm(x, z, 520, seed + 5) * 0.5 + 0.5);
    let h = BASE + ridged(x * 0.9, z * 0.35, 150, seed) * amp;
    h += fbm(x, z, 48, seed + 3) * 2.2;
    // The escarpment the pass comes down: the land rises to the eastern edge.
    h += 85 * smoothstep(half - 320, half - 60, x);
    // Mesas: flat tops, steep sides.
    for (const m of mesas) {
      const d = Math.hypot(x - m.x, z - m.z);
      h += m.h * (1 - smoothstep(m.r - 12, m.r + 28, d));
    }
    return h;
  };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) hf.set(i, j, base(hf.x(i), hf.z(j)));
  }
  // The oasis: a bowl in the dunes with water in its floor; the road skirts it on a shelf.
  const oasisY = hf.sample(oasisCentre[0], oasisCentre[1]) - 2;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(hf.x(i) - oasisCentre[0], hf.z(j) - oasisCentre[1]);
      if (d > OASIS_R + 30) continue;
      if (road.nearest(hf.x(i), hf.z(j)).distance < ROAD_WIDTH / 2 + 6) continue;
      const bowl = oasisY - 3 + 3 * Math.min(1, d / OASIS_R) ** 2;
      const w = 1 - smoothstep(OASIS_R, OASIS_R + 30, d);
      hf.set(i, j, Math.min(hf.get(i, j), bowl * w + hf.get(i, j) * (1 - w)));
    }
  }
  layRoad(hf, road, { width: ROAD_WIDTH, cutTo: 20, maxGradeDeg: 20, allowDescent: true });

  // Splat: path on the road, rock on steep faces, nothing in the snow slot; sand is the rest.
  const splat = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = hf.x(i);
      const z = hf.z(j);
      const s = hf.slopeDeg(i, j);
      const dRoad = road.nearest(x, z).distance;
      let path = 1 - smoothstep(ROAD_WIDTH / 2, ROAD_WIDTH / 2 + 3, dRoad);
      let rock = smoothstep(26, 40, s);
      const total = path + rock;
      if (total > 1) {
        path /= total;
        rock /= total;
      }
      const q = (j * n + i) * 3;
      splat[q] = path;
      splat[q + 1] = rock;
      splat[q + 2] = 0;
    }
  }

  // Trees round the oasis: a ring of broadleaf, none elsewhere.
  let a = (seed * 7919 + 101) >>> 0;
  const rng = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const trees: TreeInstance[] = [];
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + (rng() - 0.5) * 0.3;
    const dist = OASIS_R + 4 + rng() * 14;
    const x = oasisCentre[0] + Math.cos(angle) * dist;
    const z = oasisCentre[1] + Math.sin(angle) * dist;
    if (road.nearest(x, z).distance < ROAD_WIDTH / 2 + 3) continue;
    trees.push({
      kind: 'broadleaf',
      x,
      y: hf.sample(x, z),
      z,
      yaw: rng() * Math.PI * 2,
      scale: 0.9 + rng() * 0.4,
    });
  }

  const at3 = (p: P2): Vec3 => [p[0], hf.sample(p[0], p[1]), p[1]];
  const start = road.at(12);
  const tangent = road.nearest(start[0], start[1]).tangent;
  // The oasis point: on the bowl's rim, on the road's side of it.
  const nearRoad = road.at(road.nearest(...oasisCentre).along);
  const toRoad = [nearRoad[0] - oasisCentre[0], nearRoad[1] - oasisCentre[1]];
  const toRoadLen = Math.hypot(toRoad[0]!, toRoad[1]!) || 1;
  const rim: P2 = [
    oasisCentre[0] + (toRoad[0]! / toRoadLen) * (OASIS_R + 6),
    oasisCentre[1] + (toRoad[1]! / toRoadLen) * (OASIS_R + 6),
  ];
  const points: NamedPoint[] = [
    { name: 'oasis', position: at3(rim), kind: 'poi' },
    { name: 'road-mid', position: at3(road.at(road.length * 0.4)), kind: 'poi' },
    { name: 'mesa', position: at3(road.at(road.length - 8)), kind: 'poi' },
  ];
  return {
    spec,
    height: hf,
    splat,
    road,
    roadWidth: ROAD_WIDTH,
    oasis: { centre: oasisCentre, y: oasisY - 0.6, radius: OASIS_R },
    trees,
    spawn: { position: at3(start), yawDeg: headingDeg(tangent[0], tangent[1]) },
    points,
  };
}

/** The oasis pool as a water surface. */
export function oasisSurface(d: DesertResult): {
  name: string;
  kind: 'pool';
  y: number;
  bounds: { min: Vec3; max: Vec3 };
  flow: [number, number];
  mesh: {
    positions: number[];
    normals: number[];
    uvs: number[];
    indices: number[];
    materials: number[];
  };
} {
  const { centre, y, radius } = d.oasis;
  const segs = 20;
  const positions: number[] = [centre[0], y, centre[1]];
  const normals: number[] = [0, 1, 0];
  const uvs: number[] = [centre[0], centre[1]];
  const indices: number[] = [];
  const materials: number[] = [];
  const r = radius * 0.92;
  for (let k = 0; k < segs; k++) {
    const ang = (k / segs) * Math.PI * 2;
    positions.push(centre[0] + Math.cos(ang) * r, y, centre[1] + Math.sin(ang) * r);
    normals.push(0, 1, 0);
    uvs.push(positions[positions.length - 3]!, positions[positions.length - 1]!);
    indices.push(0, ((k + 1) % segs) + 1, k + 1);
    materials.push(10);
  }
  return {
    name: 'oasis',
    kind: 'pool',
    y,
    bounds: { min: [centre[0] - r, y - 3, centre[1] - r], max: [centre[0] + r, y, centre[1] + r] },
    flow: [0, 0],
    mesh: { positions, normals, uvs, indices, materials },
  };
}
