/**
 * Where a house's windows are painted (DESIGN.md 17.6), for lighting them at night: read off
 * the model's own colour picture, as `glow.ts` reads its lamps. Two kinds of pane are found:
 * glass, cooler than the timber and plaster round it (the inn's leaded panes, the farmhouse's
 * small barred ones), and dark panes set in a pale wall (a cottage's). The mask is a grey
 * picture the size of the model's skin, white where a pane is. `npm run asset -- windows <id>`
 * writes it to pipeline/work/windows/ and draws it lit on the review sheet's night row; once
 * looked at, `--accept` puts it beside the model as `<id>.windows.png`, where the game adds the
 * lamplight as the night comes (src/render/materials.ts `windows`).
 */
import { type Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';

/** The tests a pane must pass, in 8-bit tones and pixels of a 1024-pixel skin. */
export const PANES = {
  /**
   * Glass: dark, no redder than blue, and bluer than red by `cooler` more than the mean within
   * `reach` pixels round it.
   */
  glass: {
    lo: 20,
    hi: 110,
    blueOverRed: -2,
    blueOverGreen: -6,
    cooler: 12,
    reach: 10,
    least: 16,
    most: 8000,
    bridge: 1,
    aspect: [0.3, 3.3],
    fill: 0.3,
    /** Blue over red on the panes, on average. */
    cast: 3,
  },
  /**
   * On the model: a pane is drawn on an upright face (`upright`, the share of its pixels), at
   * no less than `scale` of the skin's usual pixels a square metre; a patch smeared over a
   * soffit or a gable's underside is not a window.
   */
  drawn: { upright: 0.5, scale: 0.25, steep: 0.5 },
  /**
   * A pane's size on the model, metres, at least and at most each way: a leaded pane may be a
   * hand across, but a dark pane is a whole window, so a timber post in the plaster is too
   * narrow for one; no pane is as big as a gable.
   */
  size: { glass: [0.08, 3], dark: [0.35, 3] },
  /** A pane is tidied when it is this many pixels and fills this share of its box. */
  tidy: { least: 60, solid: 0.55 },
  /** A dark pane in a pale wall. */
  dark: { below: 72, least: 150, most: 6000, fill: 0.55, aspect: [0.35, 2.8], wall: 105, ring: 6 },
} as const;

export interface WindowMask {
  width: number;
  height: number;
  /** 255 on a pane, 0 elsewhere, row by row. */
  mask: Uint8Array;
  /** The panes found, as boxes in the picture's pixels. */
  boxes: { x: number; y: number; w: number; h: number; kind: 'glass' | 'dark' }[];
}

/** The 4-connected components of the pixels `on` marks, each as its pixel indices. */
function components(on: Uint8Array, w: number, h: number, most = Infinity): number[][] {
  const seen = new Uint8Array(w * h);
  const out: number[][] = [];
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!on[start] || seen[start]) continue;
    const comp: number[] = [];
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const k = stack.pop()!;
      comp.push(k);
      const x = k % w;
      const y = (k - x) / w;
      if (comp.length > most) continue;
      for (const [ok, nk] of [
        [x > 0, k - 1],
        [x < w - 1, k + 1],
        [y > 0, k - w],
        [y < h - 1, k + w],
      ] as const) {
        if (!ok || !on[nk] || seen[nk]) continue;
        seen[nk] = 1;
        stack.push(nk);
      }
    }
    out.push(comp);
  }
  return out;
}

/**
 * A solid pane's outline cleaned of the soft paint's raggedness: its notches filled and its
 * spurs taken off, a pixel's breadth each, within its own box. A leaded window's grid of small
 * panes, which this would fill, is left as it is.
 */
export function tidyPane(pixels: readonly number[], w: number, h: number): number[] {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (const k of pixels) {
    const x = k % w;
    const y = (k - x) / w;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const bw = x1 - x0 + 3;
  const bh = y1 - y0 + 3;
  if (pixels.length < PANES.tidy.least || pixels.length / ((bw - 2) * (bh - 2)) < PANES.tidy.solid)
    return [...pixels];
  // On a local grid with a pixel's margin round the box.
  let on: Uint8Array = new Uint8Array(bw * bh);
  for (const k of pixels) {
    const x = k % w;
    on[((k - x) / w - y0 + 1) * bw + x - x0 + 1] = 1;
  }
  const step = (src: Uint8Array, grow: boolean): Uint8Array => {
    const out = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        let hit = !grow;
        for (let dy = -1; dy <= 1 && hit !== grow; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            const v = xx >= 0 && yy >= 0 && xx < bw && yy < bh ? src[yy * bw + xx]! : 0;
            if (grow ? v : !v) {
              hit = grow;
              break;
            }
          }
        }
        out[y * bw + x] = hit ? 1 : 0;
      }
    }
    return out;
  };
  on = step(step(on, true), false);
  on = step(step(on, false), true);
  const out: number[] = [];
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const gx = x + x0 - 1;
      const gy = y + y0 - 1;
      if (on[y * bw + x] && gx >= 0 && gy >= 0 && gx < w && gy < h) out.push(gy * w + gx);
    }
  }
  return out.length ? out : [...pixels];
}

/** The panes of a picture of `w` by `h` RGB pixels. */
export function findPanes(
  rgb: Uint8Array,
  w: number,
  h: number,
  /** Whether the pane on these pixels is drawn as one; by default every pane is. */
  drawn: (pixels: readonly number[], kind: 'glass' | 'dark') => boolean = () => true,
): WindowMask {
  // A three-pixel box blur for the dark panes, so a pane's grain does not break it up.
  const lum = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const o = (yy * w + xx) * 3;
          acc += rgb[o]! * 0.3 + rgb[o + 1]! * 0.6 + rgb[o + 2]! * 0.1;
          n++;
        }
      }
      lum[y * w + x] = acc / n;
    }
  }
  const mask = new Uint8Array(w * h);
  const boxes: WindowMask['boxes'] = [];
  const box = (comp: number[]): { x0: number; y0: number; x1: number; y1: number } => {
    let x0 = w;
    let y0 = h;
    let x1 = -1;
    let y1 = -1;
    for (const k of comp) {
      const x = k % w;
      const y = (k - x) / w;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    return { x0, y0, x1, y1 };
  };
  // Glass, read off the picture unblurred: a farmhouse's panes are four pixels across between
  // their bars. A pane is cool against the wall round it: bluer than red by more than the
  // timber, plaster and stone within a few centimetres are, so grey stone, as cool all over,
  // never counts. The bars are bridged by a pixel's growth, so a window's panes count as one;
  // only the panes themselves are lit, the bars stay dark.
  const g = PANES.glass;
  // The mean of blue over red round each pixel, from a summed table.
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3;
      row += rgb[o + 2]! - rgb[o]!;
      sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1]! + row;
    }
  }
  const glass = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const ya = Math.max(0, y - g.reach);
    const yb = Math.min(h, y + g.reach + 1);
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const r = rgb[i * 3]!;
      const gr = rgb[i * 3 + 1]!;
      const b = rgb[i * 3 + 2]!;
      const l = r * 0.3 + gr * 0.6 + b * 0.1;
      if (l < g.lo || l > g.hi || b < gr + g.blueOverGreen || b < r + g.blueOverRed) continue;
      const xa = Math.max(0, x - g.reach);
      const xb = Math.min(w, x + g.reach + 1);
      const around =
        (sum[yb * (w + 1) + xb]! -
          sum[ya * (w + 1) + xb]! -
          sum[yb * (w + 1) + xa]! +
          sum[ya * (w + 1) + xa]!) /
        ((xb - xa) * (yb - ya));
      if (b - r - around >= g.cooler) glass[i] = 1;
    }
  }
  const grown = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!glass[y * w + x]) continue;
      for (let dy = -g.bridge; dy <= g.bridge; dy++) {
        for (let dx = -g.bridge; dx <= g.bridge; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h) grown[yy * w + xx] = 1;
        }
      }
    }
  }
  for (const comp of components(grown, w, h, g.most)) {
    if (comp.length > g.most) continue;
    const panes = comp.filter((k) => glass[k]);
    if (panes.length < g.least) continue;
    // A window is a squarish block of panes; a cool seam where stone meets timber is a strip.
    const b = box(comp);
    const bw = b.x1 - b.x0 + 1;
    const bh = b.y1 - b.y0 + 1;
    if (bw / bh < g.aspect[0] || bw / bh > g.aspect[1]) continue;
    if (panes.length / (bw * bh) < g.fill) continue;
    // Glass has a blue cast; grey stone that only reads cool against brown timber has none.
    let cast = 0;
    for (const k of panes) cast += rgb[k * 3 + 2]! - rgb[k * 3]!;
    if (cast / panes.length < g.cast) continue;
    if (!drawn(panes, 'glass')) continue;
    for (const k of tidyPane(panes, w, h)) mask[k] = 255;
    boxes.push({ x: b.x0, y: b.y0, w: bw, h: bh, kind: 'glass' });
  }
  // Dark panes in a pale wall.
  const d = PANES.dark;
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (lum[i]! < d.below) dark[i] = 1;
  for (const comp of components(dark, w, h, d.most)) {
    if (comp.length < d.least || comp.length > d.most) continue;
    const b = box(comp);
    const bw = b.x1 - b.x0 + 1;
    const bh = b.y1 - b.y0 + 1;
    if (comp.length / (bw * bh) < d.fill) continue;
    if (bw / bh < d.aspect[0] || bw / bh > d.aspect[1]) continue;
    // The wall round it: the middle tone of a ring of pixels outside its box.
    const ring: number[] = [];
    for (let y = b.y0 - d.ring; y <= b.y1 + d.ring; y++) {
      for (let x = b.x0 - d.ring; x <= b.x1 + d.ring; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) continue;
        ring.push(lum[y * w + x]!);
      }
    }
    if (!ring.length) continue;
    ring.sort((p, q) => p - q);
    if (ring[ring.length >> 1]! < d.wall) continue;
    if (!drawn(comp, 'dark')) continue;
    for (const k of tidyPane(comp, w, h)) mask[k] = 255;
    boxes.push({ x: b.x0, y: b.y0, w: bw, h: bh, kind: 'dark' });
  }
  return { width: w, height: h, mask, boxes };
}

/**
 * For each pixel of a `w` by `h` skin, the face of the model drawn with it: 1 in `upright` where
 * the face stands within `PANES.drawn.steep` of upright, and in `density` how many of the skin's
 * pixels a square unit of it takes (NaN where no face is drawn), and in `at` where on the model it
 * is, in its own units; with the middle density over the model's surface and how tall the model
 * stands in its units.
 */
export function skinFaces(
  doc: Document,
  w: number,
  h: number,
): { upright: Uint8Array; density: Float32Array; at: Float32Array; usual: number; rise: number } {
  const upright = new Uint8Array(w * h);
  const density = new Float32Array(w * h).fill(Number.NaN);
  const at = new Float32Array(w * h * 3);
  let lo = Infinity;
  let hi = -Infinity;
  const faces: { dens: number; area: number }[] = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')?.getArray();
      const uv = prim.getAttribute('TEXCOORD_0')?.getArray();
      if (!pos || !uv) continue;
      const idx = prim.getIndices()?.getArray() ?? null;
      const n = idx ? idx.length : pos.length / 3;
      const world = (v: number): [number, number, number] => {
        const x = pos[v * 3]!;
        const y = pos[v * 3 + 1]!;
        const z = pos[v * 3 + 2]!;
        return [
          m[0] * x + m[4] * y + m[8] * z + m[12],
          m[1] * x + m[5] * y + m[9] * z + m[13],
          m[2] * x + m[6] * y + m[10] * z + m[14],
        ];
      };
      for (let t = 0; t + 2 < n; t += 3) {
        const v = [0, 1, 2].map((k) => (idx ? idx[t + k]! : t + k));
        const [a, b, c] = v.map(world) as [number, number, number][];
        lo = Math.min(lo, a![1], b![1], c![1]);
        hi = Math.max(hi, a![1], b![1], c![1]);
        const e1 = [b![0] - a![0], b![1] - a![1], b![2] - a![2]];
        const e2 = [c![0] - a![0], c![1] - a![1], c![2] - a![2]];
        const nx = e1[1]! * e2[2]! - e1[2]! * e2[1]!;
        const ny = e1[2]! * e2[0]! - e1[0]! * e2[2]!;
        const nz = e1[0]! * e2[1]! - e1[1]! * e2[0]!;
        const len = Math.hypot(nx, ny, nz);
        if (len < 1e-12) continue;
        const up = Math.abs(ny) / len < PANES.drawn.steep ? 1 : 0;
        // The face on the skin, in pixels (glTF's v runs down the picture).
        const [pa, pb, pc] = v.map((k) => [uv[k * 2]! * w, uv[k * 2 + 1]! * h]) as [
          number,
          number,
        ][];
        const area = (pb![0] - pa![0]) * (pc![1] - pa![1]) - (pc![0] - pa![0]) * (pb![1] - pa![1]);
        if (Math.abs(area) < 1e-9) continue;
        const dens = Math.abs(area) / len;
        faces.push({ dens, area: len });
        const x0 = Math.max(0, Math.floor(Math.min(pa![0], pb![0], pc![0])));
        const x1 = Math.min(w - 1, Math.ceil(Math.max(pa![0], pb![0], pc![0])));
        const y0 = Math.max(0, Math.floor(Math.min(pa![1], pb![1], pc![1])));
        const y1 = Math.min(h - 1, Math.ceil(Math.max(pa![1], pb![1], pc![1])));
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const px = x + 0.5;
            const py = y + 0.5;
            const w0 = ((pb![0] - px) * (pc![1] - py) - (pc![0] - px) * (pb![1] - py)) / area;
            const w1 = ((pc![0] - px) * (pa![1] - py) - (pa![0] - px) * (pc![1] - py)) / area;
            if (w0 < 0 || w1 < 0 || w0 + w1 > 1) continue;
            const k = y * w + x;
            upright[k] = up;
            density[k] = dens;
            const w2 = 1 - w0 - w1;
            for (let j = 0; j < 3; j++) at[k * 3 + j] = w0 * a![j]! + w1 * b![j]! + w2 * c![j]!;
          }
        }
      }
    }
  }
  // The usual density is the middle one over the model's surface, face by face as large as it is.
  faces.sort((p, q) => p.dens - q.dens);
  const total = faces.reduce((a, f) => a + f.area, 0);
  let usual = 0;
  for (let i = 0, acc = 0; i < faces.length; i++) {
    acc += faces[i]!.area;
    usual = faces[i]!.dens;
    if (acc >= total / 2) break;
  }
  return { upright, density, at, usual, rise: hi > lo ? hi - lo : 1 };
}

/** The spread of some values from their twentieth to their ninety-fifth part. */
function spread(v: number[]): number {
  v.sort((p, q) => p - q);
  return v[Math.floor(v.length * 0.95)]! - v[Math.floor(v.length * 0.05)]!;
}

/** The panes on the skin of the model at `path`, which stands `height` metres tall. */
export async function findWindows(path: string, height: number): Promise<WindowMask | null> {
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(path);
  const tex = doc
    .getRoot()
    .listMaterials()
    .map((m) => m.getBaseColorTexture()?.getImage())
    .find((i) => i);
  if (!tex) return null;
  const { data, info } = await sharp(Buffer.from(tex))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const faces = skinFaces(doc, info.width, info.height);
  const o = PANES.drawn;
  const metres = height / faces.rise;
  return findPanes(new Uint8Array(data), info.width, info.height, (pixels, kind) => {
    let up = 0;
    const dens: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (const k of pixels) {
      up += faces.upright[k]!;
      if (Number.isNaN(faces.density[k]!)) continue;
      dens.push(faces.density[k]!);
      xs.push(faces.at[k * 3]!);
      ys.push(faces.at[k * 3 + 1]!);
      zs.push(faces.at[k * 3 + 2]!);
    }
    if (dens.length < pixels.length / 2 || up < pixels.length * o.upright) return false;
    dens.sort((p, q) => p - q);
    if (dens[dens.length >> 1]! < o.scale * faces.usual) return false;
    const [least, most] = PANES.size[kind];
    const tall = spread(ys) * metres;
    const across = Math.hypot(spread(xs), spread(zs)) * metres;
    return Math.min(tall, across) >= least && Math.max(tall, across) <= most;
  });
}

/** Write a mask as the grey picture the runtime loads. */
export async function writeWindowMask(m: WindowMask, out: string): Promise<void> {
  await sharp(Buffer.from(m.mask), { raw: { width: m.width, height: m.height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
}
