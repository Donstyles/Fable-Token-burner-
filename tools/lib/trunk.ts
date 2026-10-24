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

/** The trunk of a tree's triangles, or null if nothing stands solid in the band. */
export function trunkOf(t: Triangles, o = TRUNK): Trunk | null {
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
  // The solid pieces; the trunk is the one nearest the middle, the larger if two are as near.
  const label = new Int32Array(n * n).fill(-1);
  let best: { at: [number, number]; area: number; d: number } | null = null;
  for (let s = 0; s < n * n; s++) {
    if (!solid[s] || label[s]! >= 0) continue;
    let count = 0;
    let sx = 0;
    let sz = 0;
    label[s] = s;
    stack.push(s);
    while (stack.length) {
      const k = stack.pop()!;
      const x = k % n;
      const y = (k - x) / n;
      count++;
      sx += cx - o.reach + (x + 0.5) * o.cell;
      sz += cz - o.reach + (y + 0.5) * o.cell;
      for (const q of [x > 0 ? k - 1 : -1, x < n - 1 ? k + 1 : -1, k - n, k + n]) {
        if (q < 0 || q >= n * n || !solid[q] || label[q]! >= 0) continue;
        label[q] = s;
        stack.push(q);
      }
    }
    const piece = {
      at: [sx / count, sz / count] as [number, number],
      area: count * o.cell * o.cell,
      d: Math.hypot(sx / count - cx, sz / count - cz),
    };
    if (piece.area < 0.01) continue;
    if (!best || piece.d < best.d - 0.25 || (piece.d < best.d + 0.25 && piece.area > best.area))
      best = piece;
  }
  if (!best) return null;
  return {
    at: [+best.at[0].toFixed(2), +best.at[1].toFixed(2)],
    radius: +Math.sqrt(best.area / Math.PI).toFixed(2),
  };
}

/** The trunk of the tree model at `path`, standing `height` metres tall. */
export async function findTrunk(path: string, height: number): Promise<Trunk | null> {
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(path);
  return trunkOf(trianglesOf(doc, height));
}
