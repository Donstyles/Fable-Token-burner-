/**
 * Where a house's chimneys stand (DESIGN.md 17.6): read off the model's own geometry, seen from
 * above. The roof is drawn as a height map a few centimetres a cell; a chimney is a short column
 * standing clear of the roof round it, so its cells top everything within a metre and stand at
 * least forty centimetres over the ring of roof a metre and a half out (a ridge is as high along
 * itself, so it never counts). Each chimney is given as the middle of its top in metres in the
 * model's frame (kernel/terrain/props.ts: x across the front, positive to the right as you face
 * it, y up from the foot, z towards the front); the points go into the props table as the
 * model's `chimneys` once a marked review render shows them right.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { type Triangles, trianglesOf } from './quality';

/** The height map's cell and the tests a chimney's top must pass, metres. */
export const CHIMNEY = { cell: 0.1, peak: 1.0, ring: 1.5, rise: 0.4, maxArea: 3 } as const;

export interface Chimney {
  /** The middle of the chimney's top, metres in the model's frame. */
  at: [number, number, number];
  /** Square metres of its top. */
  area: number;
  /** How far it stands over the roof round it. */
  rise: number;
}

/** The highest surface over each cell of the model's plan, NaN where nothing is. */
export function heightMap(
  t: Triangles,
  cell: number,
): { h: Float32Array; w: number; d: number; x0: number; z0: number } {
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
  const w = Math.max(1, Math.ceil((x1 - x0) / cell) + 1);
  const d = Math.max(1, Math.ceil((z1 - z0) / cell) + 1);
  const h = new Float32Array(w * d).fill(Number.NaN);
  for (let k = 0; k < t.count; k++) {
    const o = k * 9;
    const ax = (t.data[o]! - x0) / cell;
    const ay = t.data[o + 1]!;
    const az = (t.data[o + 2]! - z0) / cell;
    const bx = (t.data[o + 3]! - x0) / cell;
    const by = t.data[o + 4]!;
    const bz = (t.data[o + 5]! - z0) / cell;
    const cx = (t.data[o + 6]! - x0) / cell;
    const cy = t.data[o + 7]!;
    const cz = (t.data[o + 8]! - z0) / cell;
    const area = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    if (Math.abs(area) < 1e-9) continue;
    const i0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const i1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
    const j0 = Math.max(0, Math.floor(Math.min(az, bz, cz)));
    const j1 = Math.min(d - 1, Math.ceil(Math.max(az, bz, cz)));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        // Barycentric weights of the cell's middle; slightly outside still counts, so thin
        // walls seen edge-on leave their height.
        const px = i + 0.5;
        const pz = j + 0.5;
        const w0 = ((bx - px) * (cz - pz) - (bz - pz) * (cx - px)) / area;
        const w1 = ((cx - px) * (az - pz) - (cz - pz) * (ax - px)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue;
        const y = w0 * ay + w1 * by + w2 * cy;
        const idx = j * w + i;
        if (!(h[idx]! >= y)) h[idx] = y;
      }
    }
  }
  return { h, w, d, x0, z0 };
}

/** Every chimney on the model, tallest first. */
export function chimneysOf(t: Triangles, opts = CHIMNEY): Chimney[] {
  const { h, w, d, x0, z0 } = heightMap(t, opts.cell);
  const peakR = Math.round(opts.peak / opts.cell);
  const ringR = Math.round(opts.ring / opts.cell);
  const at = (i: number, j: number): number =>
    i < 0 || j < 0 || i >= w || j >= d ? Number.NaN : h[j * w + i]!;
  const tops = new Uint8Array(w * d);
  const rise = new Float32Array(w * d);
  for (let j = 0; j < d; j++) {
    for (let i = 0; i < w; i++) {
      const y = at(i, j);
      if (Number.isNaN(y)) continue;
      // Nothing within a metre stands higher.
      let peak = true;
      for (let b = -peakR; b <= peakR && peak; b++) {
        for (let a = -peakR; a <= peakR; a++) {
          if (a * a + b * b > peakR * peakR) continue;
          if (at(i + a, j + b) > y + 1e-6) {
            peak = false;
            break;
          }
        }
      }
      if (!peak) continue;
      // The roof round it, a metre and a half out: its highest point on the ring.
      let ringTop = -Infinity;
      for (let s = 0; s < 48; s++) {
        const ang = (s / 48) * Math.PI * 2;
        const v = at(i + Math.round(Math.cos(ang) * ringR), j + Math.round(Math.sin(ang) * ringR));
        if (!Number.isNaN(v)) ringTop = Math.max(ringTop, v);
      }
      if (ringTop === -Infinity || y - ringTop < opts.rise) continue;
      tops[j * w + i] = 1;
      rise[j * w + i] = y - ringTop;
    }
  }
  // The top cells that touch are one chimney; its top the cells within ten centimetres of it.
  const seen = new Uint8Array(w * d);
  const out: Chimney[] = [];
  for (let start = 0; start < w * d; start++) {
    if (!tops[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    const level = h[start]!;
    let top = -Infinity;
    let best = 0;
    const cells: number[] = [];
    while (stack.length) {
      const k = stack.pop()!;
      cells.push(k);
      top = Math.max(top, h[k]!);
      best = Math.max(best, rise[k]!);
      const i = k % w;
      const j = (k - i) / w;
      for (const [a, b] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const ni = i + a;
        const nj = j + b;
        if (ni < 0 || nj < 0 || ni >= w || nj >= d) continue;
        const nk = nj * w + ni;
        if (seen[nk]) continue;
        // The chimney's top spreads over the cells about its height, peak or not; never down
        // the roof.
        if (tops[nk] || h[nk]! >= level - 0.15) {
          seen[nk] = 1;
          stack.push(nk);
        }
      }
    }
    const crown = cells.filter((k) => h[k]! >= top - 0.1);
    let sx = 0;
    let sz = 0;
    for (const k of crown) {
      const i = k % w;
      sx += x0 + (i + 0.5) * opts.cell;
      sz += z0 + ((k - i) / w + 0.5) * opts.cell;
    }
    const area = crown.length * opts.cell * opts.cell;
    if (area > opts.maxArea) continue;
    out.push({
      at: [+(sx / crown.length).toFixed(2), +top.toFixed(2), +(sz / crown.length).toFixed(2)],
      area: +area.toFixed(2),
      rise: +best.toFixed(2),
    });
  }
  return out.sort((a, b) => b.at[1] - a.at[1]);
}

/** The chimneys of the model at `path` standing `height` metres tall. */
export async function findChimneys(path: string, height: number): Promise<Chimney[]> {
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(path);
  return chimneysOf(trianglesOf(doc, height));
}
