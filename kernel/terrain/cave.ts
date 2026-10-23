/**
 * The cave mouth (DESIGN.md 15.3): a dark arched opening at the foot of a rock face in the
 * hillside, a rough rock tunnel behind it that falls off into darkness, and the portal at its
 * back into the dungeon. Local frame: the mouth at the origin, +Z into the hill, Y up; the
 * floor is y = 0.
 *
 * The owner saw the first mouth from the road and asked what it was (2026-10-23): a box of
 * stone on the slope, its front a slab with a hole, its sides sloped planes, its tunnel a
 * lit corridor. This one is built from the ground up:
 *
 * - The terrain is a heightfield of 5 m cells and holds no hole, so the ground round the mouth
 *   is drawn again, finer: a sheet of the terrain's own material on a 1.2 m grid that follows
 *   the hillside, is dug into an apron before the mouth and rises into a brow over it.
 *   Its splat is the terrain's own, so it meets the coarse ground with no seam, and the
 *   coarse ground is pressed down under it (`press`). Where the rock face stands the sheet is
 *   cut, and the face fills the cut exactly: its outer edge runs through the sheet's own
 *   vertices, its inner edge is the arch.
 * - The face, the tunnel and its earth floor are faceted: every vertex of the arch and of the
 *   tunnel's rings is pushed out by its own amount, so no two metres of wall are alike. Their
 *   vertex colours carry the daylight that reaches them, full at the rim and nothing ten
 *   metres in, so the tunnel reads as depth from outside and only the party's torch shows
 *   its walls deeper in; the far end is black. A warm grey-brown in the colours sets the
 *   painted rock beside Meshy's.
 * - Meshy's rocks (assets/props) stand about the face as its cheeks and brow, half in the
 *   ground, and on the slope round it; none of their boxes reaches the way in.
 */
import catalogue from '../../assets/props/catalogue.json';
import type { MeshData } from '../core/mesh';
import { ROLE } from '../elements/roles';
import type { Heightfield } from './heightfield';
import type { ColouredMeshData } from './mesh';
import { fbm, lerp, smoothstep } from './noise';
import type { PropPlacement } from './plots';
import type { PropCatalogue } from './props';
import { box, nb, transformInto, type V3 } from './solids';

const CATALOGUE = catalogue as unknown as PropCatalogue;

export interface CaveSpec {
  x: number;
  /** The floor's height. */
  y: number;
  z: number;
  /** Rotation about Y so local +Z points into the hill. */
  yaw: number;
}

export const CAVE = {
  // Wide enough that recast's 1.5 m cells keep a walkable strip after eroding the agent radius.
  width: 6.4,
  /** The arch's crown at the mouth; the tunnel narrows and lowers a little toward its end. */
  height: 4.5,
  /** From the mouth to the tunnel's end. */
  length: 16,
  /** The floor lies this far below the ground at the threshold point: the mouth is dug in. */
  sink: 3.2,
  /** The ground over the mouth stands this high above the floor. */
  brow: 5.9,
  /** Half the width of the rock face, where the cut in the fine ground ends. */
  face: 8.4,
  /** Where the brow and the apron have run out into the hillside, either side of the mouth. */
  taper: 11,
  /** The fine ground's grid spacing, and its reach to each side, out in front and behind. */
  cell: 1.2,
  side: 21.6,
  front: 16.8,
  back: 38.4,
  /** The portal's trigger: wide enough that nobody walks past it along the narrowing wall. */
  portalRadius: 2.4,
} as const;

/** The land the mouth is set into. */
export interface CaveGround {
  /** The ground's height before the cave touches it (after roads and pads). */
  height(x: number, z: number): number;
  /** The terrain's splat at a point: path, scree and the fourth slot, as the region lays it. */
  splat(x: number, z: number, h: number, slopeDeg: number): [number, number, number];
}

export interface CaveResult {
  /**
   * The face, the tunnel and its floor in the rock and path roles, their vertex colours the
   * daylight that reaches them; and the fine ground in the terrain role, its vertex colours
   * the splat weights as the terrain's own are.
   */
  visual: ColouredMeshData;
  /** Everything drawn, solid: the party walks the fine ground and stops at the rock. */
  collider: MeshData;
  /** Meshy rocks about the face; the runtime gives each a box collider. */
  props: PropPlacement[];
  /** The rocks' boxes as the runtime builds them, for the navmesh. */
  rockBoxes: MeshData;
  /** Where the party arrives from the dungeon, on the apron, and where the portal lies. */
  arrive: V3;
  portal: V3;
  /** Press the coarse terrain down under the fine ground and the tunnel. */
  press(hf: Heightfield): void;
  /** Whether a world point lies on the shaped ground round the mouth, where no tree grows. */
  covers(x: number, z: number): boolean;
}

const HW = CAVE.width / 2;

/** The arch's outline from the left foot over the crown to the right, in half-widths and crowns. */
const PROFILE: [number, number][] = [
  [-1, 0],
  [-1.04, 0.24],
  [-1.03, 0.49],
  [-0.95, 0.69],
  [-0.74, 0.86],
  [-0.4, 0.97],
  [0, 1],
  [0.4, 0.97],
  [0.74, 0.86],
  [0.95, 0.69],
  [1.03, 0.49],
  [1.04, 0.24],
  [1, 0],
];

/** The tunnel's rings, metres into the hill; the first is the rim of the arch. */
const RINGS = [-0.6, 0.9, 2.6, 4.4, 6.3, 8.2, 10.1, 12, 13.8, 15.4];

/**
 * The Meshy rocks, in the mouth's frame: where each stands (lx, lz), its scale, its turn from
 * the mouth's heading in degrees, and how deep its foot goes into the ground as a share of its
 * height. The layered outcrop is one cheek and the brow, the mossy boulder the other cheek; the
 * angular limestone block is sunk to a slab of bedrock (standing up, its flat top read as cut
 * stone); stones lie at the apron's edges and up the slope.
 */
const ROCKS: { model: string; at: [number, number]; scale: number; turn: number; sink: number }[] =
  [
    { model: 'rock-outcrop-01', at: [8.4, 0.2], scale: 1.25, turn: -100, sink: 0.22 },
    { model: 'rock-outcrop-01', at: [-1, 4.2], scale: 1.45, turn: 15, sink: 0.3 },
    { model: 'rock-boulder-01', at: [6.8, 4.6], scale: 1.6, turn: -30, sink: 0.35 },
    { model: 'rock-outcrop-01', at: [-9.6, 6.5], scale: 1, turn: 140, sink: 0.35 },
    { model: 'rock-boulder-01', at: [-7.2, -0.4], scale: 1.9, turn: 40, sink: 0.22 },
    { model: 'rock-boulder-02', at: [-5.8, -3.8], scale: 1.2, turn: 70, sink: 0.62 },
    { model: 'rock-cluster-01', at: [4.9, -3.2], scale: 1.6, turn: 10, sink: 0.1 },
    { model: 'rock-cluster-01', at: [-5, -7.2], scale: 1.3, turn: 200, sink: 0.1 },
    { model: 'rock-boulder-02', at: [11, -4.2], scale: 1.4, turn: 130, sink: 0.6 },
    { model: 'rock-boulder-01', at: [-11.5, 5.5], scale: 1.5, turn: 160, sink: 0.3 },
    { model: 'rock-outcrop-01', at: [12.5, 11], scale: 0.9, turn: 60, sink: 0.35 },
    { model: 'rock-cluster-01', at: [5.8, 8.5], scale: 1.4, turn: 90, sink: 0.1 },
  ];

/** A repeatable number in [0, 1) for a vertex's own wobble. */
function hash(a: number, b: number, s: number): number {
  const h = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

/** Daylight reaching a point `lz` metres into the tunnel: most of it at the rim, none at ten metres. */
export function caveShade(lz: number): number {
  return Math.pow(1 - smoothstep(-1, 10.5, lz), 1.3);
}

/**
 * The rock's own colour over the painted texture: a warm grey-brown, so the face and the tunnel
 * sit with Meshy's outcrops and the earth rather than reading as cool plaster in the sun.
 */
const STONE: V3 = [1, 0.9, 0.78];

/** The smooth maximum of two heights, rounded over `k` metres. */
function smax(a: number, b: number, k: number): number {
  const d = b - a;
  if (d <= -k) return a;
  if (d >= k) return b;
  return a + ((d + k) * (d + k)) / (4 * k);
}

/** Flat-shaded triangles in the mouth's frame, each with its role, colours and planar UVs. */
class Faces {
  readonly mesh: ColouredMeshData = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    materials: [],
    colors: [],
  };

  constructor(private readonly uvOf: (p: V3, n: V3, role: number) => [number, number]) {}

  tri(a: V3, b: V3, c: V3, role: number, ca: number, cb: number, cc: number): void {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n: V3 = [
      u[1]! * v[2]! - u[2]! * v[1]!,
      u[2]! * v[0]! - u[0]! * v[2]!,
      u[0]! * v[1]! - u[1]! * v[0]!,
    ];
    const len = Math.hypot(n[0], n[1], n[2]);
    if (len < 1e-9) return;
    n[0] /= len;
    n[1] /= len;
    n[2] /= len;
    const m = this.mesh;
    const base = m.positions.length / 3;
    const tint: V3 = role === ROLE.rock ? STONE : [1, 1, 1];
    for (const [p, shade] of [
      [a, ca],
      [b, cb],
      [c, cc],
    ] as [V3, number][]) {
      m.positions.push(p[0], p[1], p[2]);
      m.normals.push(n[0], n[1], n[2]);
      m.uvs.push(...this.uvOf(p, n, role));
      m.colors.push(shade * tint[0], shade * tint[1], shade * tint[2]);
    }
    m.indices.push(base, base + 1, base + 2);
    m.materials.push(role);
  }

  /** A quad a, b, c, d counter-clockwise seen from the front, split along its shorter diagonal. */
  quad(a: V3, b: V3, c: V3, d: V3, role: number, ca: number, cb: number, cc: number, cd: number) {
    const ac = Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
    const bd = Math.hypot(b[0] - d[0], b[1] - d[1], b[2] - d[2]);
    if (ac <= bd) {
      this.tri(a, b, c, role, ca, cb, cc);
      this.tri(a, c, d, role, ca, cc, cd);
    } else {
      this.tri(a, b, d, role, ca, cb, cd);
      this.tri(b, c, d, role, cb, cc, cd);
    }
  }
}

/** Points spaced evenly along a polyline, `count` of them, ends included. */
function resample(line: V3[], count: number): V3[] {
  const lengths = [0];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    lengths.push(lengths[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  const total = lengths[lengths.length - 1]!;
  const out: V3[] = [];
  let seg = 1;
  for (let k = 0; k < count; k++) {
    const s = (total * k) / (count - 1);
    while (seg < line.length - 1 && lengths[seg]! < s) seg++;
    const a = line[seg - 1]!;
    const b = line[seg]!;
    const t = (s - lengths[seg - 1]!) / (lengths[seg]! - lengths[seg - 1]! || 1);
    out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
  }
  return out;
}

export function caveMouth(spec: CaveSpec, ground: CaveGround): CaveResult {
  const cos = Math.cos(spec.yaw);
  const sin = Math.sin(spec.yaw);
  const world = (lx: number, ly: number, lz: number): V3 => [
    spec.x + lx * cos - lz * sin,
    spec.y + ly,
    spec.z + lx * sin + lz * cos,
  ];
  /** The land under a local point, above the floor. */
  const land = (lx: number, lz: number): number => {
    const [x, , z] = world(lx, 0, lz);
    return ground.height(x, z) - spec.y;
  };

  // ── The shaped ground ─────────────────────────────────────────────────────────────────────
  // In front of the face: the land dug into an apron that falls gently from the floor, full
  // across the mouth and running out into the hillside to either side and down the slope.
  const apron = (lx: number, lz: number): number =>
    (1 - smoothstep(HW + 1.5, CAVE.taper, Math.abs(lx))) * (1 - smoothstep(5, 12, -lz));
  const front = (lx: number, lz: number): number =>
    lerp(land(lx, lz), Math.min(0, 0.12 * lz), apron(lx, lz));
  // Behind it: the hillside, raised into a brow over the mouth and the tunnel, a little lumpy,
  // falling away to the face's ends and past the tunnel's back.
  const cover = (lx: number, lz: number): number =>
    CAVE.brow +
    1.1 * fbm(lx, lz, 5, 41) +
    0.9 * (lx / CAVE.taper) -
    (CAVE.brow + 6) *
      Math.max(
        smoothstep(HW + 1.2, CAVE.taper, Math.abs(lx)),
        smoothstep(CAVE.length + 2, CAVE.length + 10, lz),
      );
  const back = (lx: number, lz: number): number => smax(land(lx, lz), cover(lx, lz), 1.5);
  /** Out at the sheet's edges it sinks under the coarse ground, so it has no edge to see. */
  const fade = (lx: number, lz: number): number =>
    Math.max(
      smoothstep(CAVE.side - 2.4, CAVE.side, Math.abs(lx)),
      smoothstep(CAVE.back - 2.4, CAVE.back, lz),
      smoothstep(CAVE.front - 2.4, CAVE.front, -lz),
    );
  const sheet = (lx: number, lz: number): number => {
    const h = lz < 0 ? front(lx, lz) : lz > 0 ? back(lx, lz) : (front(lx, 0) + back(lx, 0)) / 2;
    return h - 0.6 * fade(lx, lz);
  };
  /** Whether a local point lies in the cut where the face stands. */
  const inCut = (lx: number, lz: number): boolean =>
    Math.abs(lx) < CAVE.face && Math.abs(lz) < CAVE.cell;
  /** The ground a rock stands on: where the face stands, the foot of it. */
  const surface = (lx: number, lz: number): number =>
    inCut(lx, lz) ? Math.min(front(lx, lz), back(lx, lz)) : sheet(lx, lz);

  const visual: ColouredMeshData = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    materials: [],
    colors: [],
  };
  const C = CAVE.cell;
  const cols = Math.round(CAVE.side / C);
  const rowsFront = Math.round(CAVE.front / C);
  const rowsBack = Math.round(CAVE.back / C);
  const perRow = 2 * cols + 1;
  const vertexAt = (c: number, r: number): number => (r + rowsFront) * perRow + (c + cols);
  const sheetPoint = new Map<number, V3>();
  for (let r = -rowsFront; r <= rowsBack; r++) {
    for (let c = -cols; c <= cols; c++) {
      const lx = c * C;
      const lz = r * C;
      const h = sheet(lx, lz);
      // The normal from the sheet's own slope, the same side of the cut as the vertex; where
      // the sheet only follows the land, the land's over the coarse terrain's own span of a
      // cell either side, so the light on the two agrees where they meet.
      const e = 0.6;
      const side = (dz: number): number => {
        const z = lz + dz;
        if (r === 0) return sheet(lx, z);
        const hs = r < 0 ? front(lx, Math.min(z, -0.01)) : back(lx, Math.max(z, 0.01));
        return hs - 0.6 * fade(lx, z);
      };
      const own = Math.min(1, Math.abs(h + 0.6 * fade(lx, lz) - land(lx, lz)) / 0.5);
      const dx = lerp(
        (land(lx + 5, lz) - land(lx - 5, lz)) / 10,
        (sheet(lx + e, lz) - sheet(lx - e, lz)) / (2 * e),
        own,
      );
      const dz = lerp(
        (land(lx, lz + 5) - land(lx, lz - 5)) / 10,
        (side(e) - side(-e)) / (2 * e),
        own,
      );
      const len = Math.hypot(dx, 1, dz);
      const n: V3 = [-dx / len, 1 / len, -dz / len];
      const p = world(lx, h, lz);
      sheetPoint.set(vertexAt(c, r), [lx, h, lz]);
      visual.positions.push(p[0], p[1], p[2]);
      visual.normals.push(n[0] * cos - n[2] * sin, n[1], n[0] * sin + n[2] * cos);
      visual.uvs.push(p[0], p[2]);
      // The terrain's own splat, the land's height for its noise as the coarse ground's,
      // then dirt on the apron and stones at the foot of the face and on the brow.
      const slope = (Math.acos(Math.min(1, n[1])) * 180) / Math.PI;
      const [path0, scree0, sand0] = ground.splat(p[0], p[2], spec.y + land(lx, lz), slope);
      const quiet = 1 - smoothstep(0.1, 0.35, fade(lx, lz));
      const dirt =
        lz <= 0 ? smoothstep(0.45, 0.8, apron(lx, lz) + 0.22 * fbm(lx, lz, 3, 7)) * quiet : 0;
      const toFace = Math.hypot(
        Math.max(0, Math.abs(lx) - CAVE.face),
        Math.max(0, Math.abs(lz) - C),
      );
      const brow = smoothstep(0.3, 1.6, cover(lx, lz) - land(lx, lz));
      const stony =
        Math.max(1 - smoothstep(0.6, 3.6, toFace), brow) *
        smoothstep(-0.3, 0.3, fbm(lx + 11, lz - 4, 4, 9) + 0.25) *
        quiet;
      let path = Math.max(path0, dirt);
      let scree = Math.max(scree0, stony * (1 - dirt));
      let sand = sand0;
      const total = path + scree + sand;
      if (total > 1) {
        path /= total;
        scree /= total;
        sand /= total;
      }
      visual.colors.push(path, scree, sand);
    }
  }
  const sheetTris: number[] = [];
  for (let r = -rowsFront; r < rowsBack; r++) {
    for (let c = -cols; c < cols; c++) {
      // The cut: two rows either side of the face line, as wide as the face.
      if ((r === -1 || r === 0) && c >= -CAVE.face / C && c < CAVE.face / C) continue;
      const a = vertexAt(c, r);
      const b = vertexAt(c + 1, r);
      const d = vertexAt(c, r + 1);
      const e = vertexAt(c + 1, r + 1);
      // Counter-clockwise from above in the local frame, which keeps its turn in the world.
      sheetTris.push(a, d, b, b, d, e);
    }
  }
  for (const i of sheetTris) visual.indices.push(i);
  for (let t = 0; t < sheetTris.length / 3; t++) visual.materials.push(ROLE.terrain);

  // ── The tunnel ────────────────────────────────────────────────────────────────────────────
  const rock = new Faces((p, n, role) => {
    if (role === ROLE.path) {
      const w = world(p[0], p[1], p[2]);
      return [w[0], w[2]];
    }
    // Planar on the face's own axis, metres; the role's tile size scales it.
    const ax = Math.abs(n[0]);
    const ay = Math.abs(n[1]);
    const az = Math.abs(n[2]);
    if (ay >= ax && ay >= az) return [p[0], p[2]];
    if (ax >= az) return [p[2], p[1]];
    return [p[0], p[1]];
  });
  const narrow = (lz: number): number => 1 - 0.18 * smoothstep(7, 15, lz);
  const lower = (lz: number): number => 1 - 0.12 * smoothstep(7, 15, lz);
  const rings: V3[][] = RINGS.map((z0, r) => {
    const rim = r === 0;
    return PROFILE.map(([px, py], i) => {
      const w = HW * narrow(z0);
      const h = CAVE.height * lower(z0);
      const x = px * w;
      const y = py * h;
      const u = hash(i, r, 1);
      const dz = (hash(i, r, 2) - 0.5) * (rim ? 0.6 : 0.5);
      if (py === 0) return [x + Math.sign(px) * (0.1 + 0.25 * u), 0, z0 + dz];
      // Out from a point low in the arch, so the walls and the crown both move back.
      const ox = x;
      const oy = y - 0.4 * h;
      const ol = Math.hypot(ox, oy) || 1;
      const push = rim ? 0.2 + 0.55 * u : 0.12 + 0.38 * u;
      return [x + (ox / ol) * push, y + (oy / ol) * push, z0 + dz];
    });
  });
  const shadeAt = (p: V3): number => caveShade(p[2]) * (1 - 0.25 * (p[1] / CAVE.height));
  for (let r = 0; r + 1 < rings.length; r++) {
    const a = rings[r]!;
    const b = rings[r + 1]!;
    for (let i = 0; i + 1 < PROFILE.length; i++) {
      // Seen from inside: round the ring first, then a step further in.
      rock.quad(
        a[i]!,
        a[i + 1]!,
        b[i + 1]!,
        b[i]!,
        ROLE.rock,
        shadeAt(a[i]!),
        shadeAt(a[i + 1]!),
        shadeAt(b[i + 1]!),
        shadeAt(b[i]!),
      );
    }
    // The earth floor between the rings' feet.
    const fl = (p: V3): number => Math.min(1, caveShade(p[2]) * 1.15);
    const last = PROFILE.length - 1;
    rock.quad(
      a[0]!,
      b[0]!,
      b[last]!,
      a[last]!,
      ROLE.path,
      fl(a[0]!),
      fl(b[0]!),
      fl(b[last]!),
      fl(a[last]!),
    );
  }
  // The end: the last ring drawn in toward a point and closed, unlit.
  const end = rings[rings.length - 1]!;
  const centre: V3 = [0, CAVE.height * 0.38, CAVE.length + 1.2];
  const cap = end.map((p): V3 => [
    lerp(p[0], centre[0], 0.45),
    lerp(p[1], centre[1], 0.45),
    CAVE.length + 0.4,
  ]);
  for (let i = 0; i + 1 < end.length; i++) {
    rock.quad(end[i]!, end[i + 1]!, cap[i + 1]!, cap[i]!, ROLE.rock, 0, 0, 0, 0);
    rock.tri(cap[i]!, cap[i + 1]!, centre, ROLE.rock, 0, 0, 0);
  }
  const lastI = end.length - 1;
  rock.quad(end[0]!, cap[0]!, cap[lastI]!, end[lastI]!, ROLE.rock, 0, 0, 0, 0);
  rock.tri(cap[0]!, centre, cap[lastI]!, ROLE.rock, 0, 0, 0);

  // ── The face ──────────────────────────────────────────────────────────────────────────────
  // Its outer edge: the cut's outline through the sheet's own vertices, from the bottom edge
  // beside the mouth's left foot round over the brow to the right foot.
  const cutCols = Math.round(CAVE.face / C);
  const outline: V3[] = [];
  const foot = Math.ceil(HW / C);
  for (let c = -foot; c >= -cutCols; c--) outline.push(sheetPoint.get(vertexAt(c, -1))!);
  outline.push(sheetPoint.get(vertexAt(-cutCols, 0))!);
  for (let c = -cutCols; c <= cutCols; c++) outline.push(sheetPoint.get(vertexAt(c, 1))!);
  outline.push(sheetPoint.get(vertexAt(cutCols, 0))!);
  for (let c = cutCols; c >= foot; c--) outline.push(sheetPoint.get(vertexAt(c, -1))!);
  // Its inner edge: the arch's rim, spaced to match.
  const rim = resample(rings[0]!, outline.length);
  const steps = [0, 0.2, 0.42, 0.64, 0.84, 1];
  const face: V3[][] = steps.map((f, k) =>
    outline.map((o, i): V3 => {
      const a = rim[i]!;
      if (k === 0) return a;
      if (k === steps.length - 1) return o;
      const tall = Math.min(1, Math.max(0.3, (o[1] - a[1] + 1) / 4));
      const wob = Math.sin(Math.PI * f);
      return [
        lerp(a[0], o[0], f) + (hash(i, k, 3) - 0.5) * 0.7 * wob,
        lerp(a[1], o[1], f) + (hash(i, k, 4) - 0.5) * 0.6 * wob,
        // Bulging out into a lip over the arch, set back where it meets the hill.
        lerp(a[2], o[2], f) - 0.9 * wob * tall + (hash(i, k, 5) - 0.5) * 0.5 * wob,
      ];
    }),
  );
  // The face in its own weathered tones, darker toward the arch and the ground: the pale
  // strata of the rock texture in full sun read as plaster.
  const faceShade = (k: number, i: number, p: V3): number =>
    k === 0 ? 0.6 : (0.62 + 0.2 * hash(i, k, 6)) * (0.85 + 0.15 * smoothstep(0, 3, p[1]));
  for (let k = 0; k + 1 < face.length; k++) {
    const a = face[k]!;
    const b = face[k + 1]!;
    for (let i = 0; i + 1 < outline.length; i++) {
      // Seen from the front: out a ring, then along it.
      rock.quad(
        a[i]!,
        b[i]!,
        b[i + 1]!,
        a[i + 1]!,
        ROLE.rock,
        faceShade(k, i, a[i]!),
        faceShade(k + 1, i, b[i]!),
        faceShade(k + 1, i + 1, b[i + 1]!),
        faceShade(k, i + 1, a[i + 1]!),
      );
    }
  }
  // The floor before the arch, from the cut's bottom edge in to the rim's feet.
  const bottom: V3[] = [];
  for (let c = -foot; c <= foot; c++) bottom.push(sheetPoint.get(vertexAt(c, -1))!);
  const footL = rings[0]![0]!;
  const footR = rings[0]![PROFILE.length - 1]!;
  const fl0 = Math.min(1, caveShade(footL[2]) * 1.15);
  for (let i = 0; i + 1 < bottom.length; i++) {
    const to = i < foot ? footL : footR;
    rock.tri(bottom[i]!, to, bottom[i + 1]!, ROLE.path, 0.95, fl0, 0.95);
  }
  rock.tri(footL, footR, bottom[foot]!, ROLE.path, fl0, fl0, 0.95);

  // Into the world: the rock and earth after the sheet; everything drawn is solid.
  transformInto(visual, rock.mesh, spec);
  for (const c of rock.mesh.colors) visual.colors.push(c);
  const collider: MeshData = {
    positions: [...visual.positions],
    normals: [...visual.normals],
    uvs: [...visual.uvs],
    indices: [...visual.indices],
    materials: visual.materials.map(() => ROLE.collider),
  };

  // ── The rocks ─────────────────────────────────────────────────────────────────────────────
  const props: PropPlacement[] = [];
  const rockBoxes = nb();
  for (const r of ROCKS) {
    const m = CATALOGUE[r.model];
    if (!m) throw new Error(`cave: ${r.model} is not in the prop catalogue`);
    const yaw = spec.yaw + (r.turn * Math.PI) / 180;
    const [w, h, d] = m.size.map((v) => v * r.scale) as [number, number, number];
    const cx = (m.min[0] + m.size[0] / 2) * r.scale;
    const cz = (m.min[2] + m.size[2] / 2) * r.scale;
    // The lowest ground under the footprint, so no side of it hangs over a slope.
    const turn = (r.turn * Math.PI) / 180;
    const tc = Math.cos(turn);
    const ts = Math.sin(turn);
    let low = Infinity;
    for (const [u, v] of [
      [0, 0],
      [-0.5, -0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
    ] as [number, number][]) {
      const mx = cx + u * w;
      const mz = cz + v * d;
      low = Math.min(low, surface(r.at[0] + mx * tc - mz * ts, r.at[1] + mx * ts + mz * tc));
    }
    let foot = low - r.sink * h;
    // A rock over the tunnel stands clear of its crown.
    if (Math.abs(r.at[0]) < HW + 1 && r.at[1] > 0 && r.at[1] < CAVE.length)
      foot = Math.max(foot, CAVE.height + 0.9);
    const [x, y, z] = world(r.at[0], foot, r.at[1]);
    props.push({ model: r.model, x, y, z, yaw, scale: r.scale });
    const b = nb();
    box(b, [cx - w / 2, 0, cz - d / 2], [cx + w / 2, h, cz + d / 2], ROLE.collider);
    transformInto(rockBoxes, b, { x, y, z, yaw });
  }

  return {
    visual,
    collider,
    props,
    rockBoxes,
    arrive: world(0, front(0, -3.5), -3.5),
    // Clear of the end by more than a navmesh cell, so the crowd can reach it too.
    portal: world(0, 0, CAVE.length - 4.5),
    press(hf) {
      // Every vertex of a cell the tunnel's floor or walls touch goes below the floor, so no
      // coarse triangle rises into the tunnel; every other vertex under the sheet goes under
      // the sheet, and under the face's foot where the sheet is cut.
      const reach = Math.hypot(CAVE.side, CAVE.back) + hf.cell;
      const half = hf.width / 2;
      const tunnelCell = (i: number, j: number): boolean => {
        let x0 = Infinity;
        let x1 = -Infinity;
        let z0 = Infinity;
        let z1 = -Infinity;
        for (const [a, b] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ] as [number, number][]) {
          const l = caveLocalOf(spec, hf.x(i + a), hf.z(j + b));
          x0 = Math.min(x0, l.x);
          x1 = Math.max(x1, l.x);
          z0 = Math.min(z0, l.z);
          z1 = Math.max(z1, l.z);
        }
        return x1 > -HW - 0.8 && x0 < HW + 0.8 && z1 > -1.4 && z0 < CAVE.length + 1.6;
      };
      const ci = (x: number): number => Math.round((x + half) / hf.cell);
      const i0 = Math.max(0, ci(spec.x - reach));
      const i1 = Math.min(hf.n - 1, ci(spec.x + reach));
      const j0 = Math.max(0, ci(spec.z - reach));
      const j1 = Math.min(hf.n - 1, ci(spec.z + reach));
      const drop = new Set<number>();
      for (let j = j0; j < j1; j++) {
        for (let i = i0; i < i1; i++) {
          if (!tunnelCell(i, j)) continue;
          for (const k of [
            j * hf.n + i,
            j * hf.n + i + 1,
            (j + 1) * hf.n + i,
            (j + 1) * hf.n + i + 1,
          ])
            drop.add(k);
        }
      }
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const l = caveLocalOf(spec, hf.x(i), hf.z(j));
          let target = Infinity;
          if (drop.has(j * hf.n + i)) target = -0.4;
          else if (Math.abs(l.x) <= CAVE.side && l.z >= -CAVE.front && l.z <= CAVE.back) {
            if (fade(l.x, l.z) < 0.3) {
              target =
                Math.abs(l.x) < CAVE.face + 0.6 && Math.abs(l.z) < 1.8
                  ? Math.min(front(l.x, l.z), back(l.x, l.z)) - 0.6
                  : sheet(l.x, l.z) - 0.4;
            }
          }
          if (target < Infinity) hf.set(i, j, Math.min(hf.get(i, j), spec.y + target));
        }
      }
    },
    covers(x, z) {
      const l = caveLocalOf(spec, x, z);
      return Math.abs(l.x) < 15 && l.z > -CAVE.front && l.z < CAVE.length + 12;
    },
  };
}

/** Local coordinates of a world point, for the terrain cuts. */
export function caveLocalOf(spec: CaveSpec, x: number, z: number): { x: number; z: number } {
  const cos = Math.cos(spec.yaw);
  const sin = Math.sin(spec.yaw);
  const dx = x - spec.x;
  const dz = z - spec.z;
  return { x: dx * cos + dz * sin, z: -dx * sin + dz * cos };
}
