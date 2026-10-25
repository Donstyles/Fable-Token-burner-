/**
 * Where a tree's trunk stands and how thick it is (DESIGN.md 17.7), read off the model's own
 * geometry for its collider: the trunk is what stands solid at a party's chest, so the model's
 * triangles between `band` metres are drawn from above on a grid, every ring filled, thin spurs
 * (a root's flare, a twig) taken off, and the solid piece nearest the model's middle measured:
 * its middle, and the radius of a disc of its area. A fir whose boughs sweep the ground measures
 * as its boughs, as the party would meet them. Metres in the model's own frame (glTF's, as
 * kernel/terrain/props.ts gives a door), the model standing `height` tall.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { type Triangles, trianglesOf } from './quality';

export const TRUNK = {
  /** Metres a grid cell. */
  cell: 0.05,
  /** The heights the trunk is read between: over the roots' flare, under the crown. */
  band: [1.0, 1.8],
  /** How far round the model's middle to look, metres. */
  reach: 4,
  /** Spurs thinner than twice this are taken off, metres. */
  spur: 0.15,
} as const;

export interface Trunk {
  /** Its middle, metres in the model's frame (x, z). */
  at: [number, number];
  /** The radius of a disc of its area. */
  radius: number;
}

/** The solid ground plan of a tree's triangles between `band` metres, seen from above. */
interface Plan {
  solid: Uint8Array;
  n: number;
  /** The grid's corner, metres. */
  x0: number;
  z0: number;
  /** The model's middle, metres. */
  cx: number;
  cz: number;
}

function planOf(
  t: Triangles,
  o: { cell: number; band: readonly [number, number]; reach: number; spur: number },
): Plan {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < t.data.length; i += 3) {
    x0 = Math.min(x0, t.data[i]!);
    x1 = Math.max(x1, t.data[i]!);
    z0 = Math.min(z0, t.data[i + 2]!);
    z1 = Math.max(z1, t.data[i + 2]!);
  }
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const n = Math.round((2 * o.reach) / o.cell);
  const at = (x: number, z: number): number => {
    const i = Math.floor((x - cx + o.reach) / o.cell);
    const j = Math.floor((z - cz + o.reach) / o.cell);
    return i >= 0 && j >= 0 && i < n && j < n ? j * n + i : -1;
  };
  // The surfaces in the band, seen from above: each triangle sampled finer than a cell.
  const wall = new Uint8Array(n * n);
  const [lo, hi] = o.band;
  for (let k = 0; k < t.count; k++) {
    const p = t.data.subarray(k * 9, k * 9 + 9);
    if (Math.max(p[1]!, p[4]!, p[7]!) < lo || Math.min(p[1]!, p[4]!, p[7]!) > hi) continue;
    const span = Math.max(
      Math.hypot(p[3]! - p[0]!, p[5]! - p[2]!, p[4]! - p[1]!),
      Math.hypot(p[6]! - p[0]!, p[8]! - p[2]!, p[7]! - p[1]!),
    );
    const steps = Math.min(400, Math.max(2, Math.ceil(span / (o.cell / 2))));
    for (let a = 0; a <= steps; a++) {
      for (let b = 0; a + b <= steps; b++) {
        const u = a / steps;
        const v = b / steps;
        const w = 1 - u - v;
        const y = p[1]! * w + p[4]! * u + p[7]! * v;
        if (y < lo || y > hi) continue;
        const c = at(p[0]! * w + p[3]! * u + p[6]! * v, p[2]! * w + p[5]! * u + p[8]! * v);
        if (c >= 0) wall[c] = 1;
      }
    }
  }
  // Solid is everything the outside cannot reach without crossing a surface.
  const outside = new Uint8Array(n * n);
  const stack: number[] = [];
  const seed = (k: number): void => {
    if (wall[k] || outside[k]) return;
    outside[k] = 1;
    stack.push(k);
  };
  for (let i = 0; i < n; i++) {
    seed(i);
    seed((n - 1) * n + i);
    seed(i * n);
    seed(i * n + n - 1);
  }
  while (stack.length) {
    const k = stack.pop()!;
    const x = k % n;
    const y = (k - x) / n;
    if (x > 0) seed(k - 1);
    if (x < n - 1) seed(k + 1);
    if (y > 0) seed(k - n);
    if (y < n - 1) seed(k + n);
  }
  let solid: Uint8Array = new Uint8Array(n * n);
  for (let k = 0; k < n * n; k++) solid[k] = outside[k] ? 0 : 1;
  // Spurs off: shrink by `spur`, then grow back, a cell at a time.
  const step = (src: Uint8Array, grow: boolean): Uint8Array => {
    const out = new Uint8Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const k = y * n + x;
        const near = [
          src[k]!,
          x > 0 ? src[k - 1]! : 0,
          x < n - 1 ? src[k + 1]! : 0,
          y > 0 ? src[k - n]! : 0,
          y < n - 1 ? src[k + n]! : 0,
        ];
        out[k] = grow ? (near.some((v) => v) ? 1 : 0) : near.every((v) => v) ? 1 : 0;
      }
    }
    return out;
  };
  const r = Math.max(1, Math.round(o.spur / o.cell));
  for (let i = 0; i < r; i++) solid = step(solid, false);
  for (let i = 0; i < r; i++) solid = step(solid, true);
  return { solid, n, x0: cx - o.reach, z0: cz - o.reach, cx, cz };
}

/** The solid pieces of a plan: each one's cells, middle and area, metres. */
function piecesOf(
  plan: Plan,
  cell: number,
): { cells: number[]; at: [number, number]; area: number }[] {
  const { solid, n } = plan;
  const seen = new Uint8Array(n * n);
  const out: { cells: number[]; at: [number, number]; area: number }[] = [];
  const stack: number[] = [];
  for (let s = 0; s < n * n; s++) {
    if (!solid[s] || seen[s]) continue;
    const cells: number[] = [];
    let sx = 0;
    let sz = 0;
    seen[s] = 1;
    stack.push(s);
    while (stack.length) {
      const k = stack.pop()!;
      const x = k % n;
      const y = (k - x) / n;
      cells.push(k);
      sx += plan.x0 + (x + 0.5) * cell;
      sz += plan.z0 + (y + 0.5) * cell;
      for (const q of [x > 0 ? k - 1 : -1, x < n - 1 ? k + 1 : -1, k - n, k + n]) {
        if (q < 0 || q >= n * n || !solid[q] || seen[q]) continue;
        seen[q] = 1;
        stack.push(q);
      }
    }
    out.push({
      cells,
      at: [sx / cells.length, sz / cells.length],
      area: cells.length * cell * cell,
    });
  }
  return out;
}

/** The trunk of a tree's triangles, or null if nothing stands solid in the band. */
export function trunkOf(t: Triangles, o = TRUNK): Trunk | null {
  const plan = planOf(t, o);
  // The trunk is the piece nearest the middle, the larger if two are as near.
  let best: { at: [number, number]; area: number; d: number } | null = null;
  for (const piece of piecesOf(plan, o.cell)) {
    if (piece.area < 0.01) continue;
    const d = Math.hypot(piece.at[0] - plan.cx, piece.at[1] - plan.cz);
    if (!best || d < best.d - 0.25 || (d < best.d + 0.25 && piece.area > best.area))
      best = { at: piece.at, area: piece.area, d };
  }
  if (!best) return null;
  return {
    at: [+best.at[0].toFixed(2), +best.at[1].toFixed(2)],
    radius: +Math.sqrt(best.area / Math.PI).toFixed(2),
  };
}

export const ROOTS = {
  cell: 0.05,
  /** The heights the roots are read between: what a party's shins and knees meet. */
  band: [0.15, 0.9],
  reach: 6,
  /** Spurs thinner than twice this are taken off: a root thinner than 20 cm is stepped over. */
  spur: 0.1,
  /** At most this many discs, none thinner than `least` metres across. */
  most: 6,
  least: 0.4,
  /** Covered once this share of the roots' plan lies under a disc. */
  cover: 0.85,
} as const;

/**
 * A tree's roots (owner, 2026-10-25: "Can still Walk through the Roots of this big tree"): the
 * solid ground plan at shin height that holds the trunk, covered by a few discs (x, z,
 * radius), widest first, each the widest that fits where the roots are not yet covered. The
 * collider stands a short cylinder on each. Empty where the roots are no wider than the trunk.
 */
export function rootsOf(t: Triangles, trunk: Trunk, o = ROOTS): [number, number, number][] {
  const plan = planOf(t, o);
  const { n } = plan;
  // The piece under the trunk, or nearest it.
  const pieces = piecesOf(plan, o.cell);
  let piece: (typeof pieces)[number] | undefined;
  let near = Infinity;
  for (const p of pieces) {
    const d = Math.min(
      ...p.cells.map((k) => {
        const x = plan.x0 + ((k % n) + 0.5) * o.cell;
        const z = plan.z0 + (Math.floor(k / n) + 0.5) * o.cell;
        return Math.hypot(x - trunk.at[0], z - trunk.at[1]);
      }),
    );
    if (d < near) {
      near = d;
      piece = p;
    }
  }
  if (!piece || near > trunk.radius + 0.5) return [];
  const mine = new Uint8Array(n * n);
  for (const k of piece.cells) mine[k] = 1;
  // Each cell's distance to the outside of the piece, in cells (two passes, chamfer).
  const far = new Float32Array(n * n);
  for (let k = 0; k < n * n; k++) far[k] = mine[k] ? 1e9 : 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const k = y * n + x;
      if (!far[k]) continue;
      const a = x > 0 ? far[k - 1]! + 1 : 1;
      const b = y > 0 ? far[k - n]! + 1 : 1;
      const c = x > 0 && y > 0 ? far[k - n - 1]! + 1.414 : 1.414;
      const d = x < n - 1 && y > 0 ? far[k - n + 1]! + 1.414 : 1.414;
      far[k] = Math.min(far[k]!, a, b, c, d);
    }
  }
  for (let y = n - 1; y >= 0; y--) {
    for (let x = n - 1; x >= 0; x--) {
      const k = y * n + x;
      if (!far[k]) continue;
      const a = x < n - 1 ? far[k + 1]! + 1 : 1;
      const b = y < n - 1 ? far[k + n]! + 1 : 1;
      const c = x < n - 1 && y < n - 1 ? far[k + n + 1]! + 1.414 : 1.414;
      const d = x > 0 && y < n - 1 ? far[k + n - 1]! + 1.414 : 1.414;
      far[k] = Math.min(far[k]!, a, b, c, d);
    }
  }
  // The trunk's own disc first, then the widest disc where the roots are not yet covered.
  const covered = new Uint8Array(n * n);
  const discs: [number, number, number][] = [];
  const lay = (x: number, z: number, r: number): void => {
    discs.push([+x.toFixed(2), +z.toFixed(2), +r.toFixed(2)]);
    for (const k of piece!.cells) {
      const cx = plan.x0 + ((k % n) + 0.5) * o.cell;
      const cz = plan.z0 + (Math.floor(k / n) + 0.5) * o.cell;
      if (Math.hypot(cx - x, cz - z) <= r + o.cell) covered[k] = 1;
    }
  };
  lay(trunk.at[0], trunk.at[1], trunk.radius);
  while (discs.length < o.most + 1) {
    let left = 0;
    let best = -1;
    for (const k of piece.cells) {
      if (covered[k]) continue;
      left++;
      if (best < 0 || far[k]! > far[best]!) best = k;
    }
    if (left <= piece.cells.length * (1 - o.cover) || best < 0) break;
    const r = far[best]! * o.cell;
    if (r * 2 < o.least) break;
    lay(plan.x0 + ((best % n) + 0.5) * o.cell, plan.z0 + (Math.floor(best / n) + 0.5) * o.cell, r);
  }
  return discs.slice(1);
}

/** The trunk of the tree model at `path`, standing `height` metres tall, and its roots. */
export async function findTrunk(
  path: string,
  height: number,
): Promise<(Trunk & { roots: [number, number, number][] }) | null> {
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(path);
  const t = trianglesOf(doc, height);
  const trunk = trunkOf(t);
  return trunk && { ...trunk, roots: rootsOf(t, trunk) };
}
