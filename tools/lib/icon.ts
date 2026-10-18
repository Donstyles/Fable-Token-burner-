/**
 * Spell icons from Meshy pictures (DESIGN.md 16.22), built as MM6 built its icons: one
 * bitmap of the subject on a parchment oval (icon critic, pass 1: 68 by 52, (184,172,150),
 * the same oval as an empty slot), the subject's soft edge and glow running into the
 * parchment, transparent only outside the oval where the subject is under half there, 255
 * colours. A picture generated on a plain ground is keyed by its distance from the ground's
 * colour and its tones mapped onto the parchment (icon critic, pass 2: the ground to 173,
 * black, 60 and white kept), so the subject sits darker than its oval as MM6's do; a pure
 * light effect keeps its own exposure. A picture with an alpha channel (Meshy's background
 * removal) is un-premultiplied and its haze dropped. The subject is fitted 68 by 50 in the
 * oval (a bolt wider, up to 84, the page's place) and the whole box is taken from the
 * picture around it, so a glow runs on to the oval's edge; the parchment carries a mottle of
 * four levels. A subject darker than MM6's is lifted, never darkened.
 */
import sharp from 'sharp';

/** The smallest icon box, in UI pixels; a wide subject widens it. */
export const ICON_SIZE = { width: 72, height: 54 } as const;
/** MM6's oval in every icon and every empty slot. */
export const ICON_OVAL = { width: 68, height: 52 } as const;
/** MM6's parchment inside the oval: flat, about four levels either way. */
export const ICON_PARCHMENT = [184, 172, 150] as const;
/**
 * The subject's fit (icon critic, pass 2: MM6's subjects span 68 by 49); wide ones overhang
 * the oval, at most to the place's 84 pixels (screens critic, round 13: a 100-pixel bolt ran
 * into its neighbour).
 */
export const ICON_FIT = { width: 68, height: 50, wide: 84 } as const;

export interface SubjectStats {
  /** Mean luma (Rec. 601) of the subject's pixels, its 5th percentile, its share under 50. */
  mean: number;
  p5: number;
  dark: number;
}

export interface IconReport {
  width: number;
  height: number;
  /** Opaque pixels and distinct colours among them. */
  opaque: number;
  colours: number;
  /** How the subject was cut from the picture. */
  matte: 'alpha' | 'key';
  /** The subject before any lift, and whether it was lifted. */
  subject: SubjectStats;
  lifted: boolean;
}

export interface IconOptions {
  /** Colours in the finished bitmap (MM6: 255 and the key). */
  colours?: number;
  /** Lift a subject darker than MM6's (default on; off for the dark school). */
  lift?: boolean;
  /**
   * 'map' (default): the picture's tones mapped onto the parchment, its ground to the
   * parchment's 173; 'keep': its own exposure, for a pure light effect (a bolt, sparks).
   */
  expose?: 'map' | 'keep';
  /** Key the parchment out so the page shows through (default on). */
  keyParchment?: boolean;
  /**
   * The share of the picture's own grain put back inside a mapped subject (default 0.5; 0
   * leaves the smooth lanczos3 sample alone; a kept light effect never takes it). See
   * `middleThirds`.
   */
  grain?: number;
}

const luma = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Median cut over the pixels with any cover, alpha a fourth channel (a soft-keyed edge is
 * colours at part cover): the box with the widest channel is split at its median until
 * there are `count` boxes, and every pixel takes its box's mean. Done here because the
 * bundled image library writes a palette PNG only when it was built with a quantiser, and
 * silently writes true colour when it was not.
 */
export function reduceColours(rgba: Buffer, count: number): void {
  const idx: number[] = [];
  for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3]! > 0) idx.push(i);
  if (!idx.length) return;
  type Box = number[];
  const range = (b: Box, c: number): number => {
    let lo = 255;
    let hi = 0;
    for (const i of b) {
      const v = rgba[i + c]!;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    return hi - lo;
  };
  const boxes: Box[] = [idx];
  while (boxes.length < count) {
    let best = -1;
    let bestRange = 0;
    let bestChannel = 0;
    boxes.forEach((b, k) => {
      if (b.length < 2) return;
      for (let c = 0; c < 4; c++) {
        const r = range(b, c);
        if (r > bestRange) {
          bestRange = r;
          best = k;
          bestChannel = c;
        }
      }
    });
    if (best < 0 || bestRange === 0) break;
    const b = boxes[best]!.sort((p, q) => rgba[p + bestChannel]! - rgba[q + bestChannel]!);
    const mid = b.length >> 1;
    boxes.splice(best, 1, b.slice(0, mid), b.slice(mid));
  }
  for (const b of boxes) {
    let r = 0;
    let g = 0;
    let bl = 0;
    let a = 0;
    for (const i of b) {
      r += rgba[i]!;
      g += rgba[i + 1]!;
      bl += rgba[i + 2]!;
      a += rgba[i + 3]!;
    }
    const n = b.length;
    for (const i of b) {
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(bl / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }
}

/**
 * The subject as straight (not premultiplied) colour and a soft alpha. A picture with an
 * alpha channel is Meshy's background removal: its part-covered pixels come darkened by
 * their cover, so they are divided back out, and cover under a tenth (haze) is dropped. A
 * picture without one stands on a plain background: the background is the median of the
 * border, cover rises with the distance from it (6 to 28 levels), and the colour is unmixed
 * from it, so a pale glow keeps its light.
 */
export function matte(
  data: Buffer,
  width: number,
  height: number,
): { rgba: Buffer; kind: 'alpha' | 'key' } {
  const out = Buffer.alloc(width * height * 4);
  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < 250) {
      hasAlpha = true;
      break;
    }
  }
  if (hasAlpha) {
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]! / 255;
      if (a < 0.1) continue;
      for (let c = 0; c < 3; c++)
        out[i + c] = Math.min(255, Math.round(data[i + c]! / Math.max(a, 0.35)));
      out[i + 3] = data[i + 3]!;
    }
    return { rgba: out, kind: 'alpha' };
  }
  // The background: the median of a border four per cent deep.
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.04));
  const samples: [number[], number[], number[]] = [[], [], []];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= band && x < width - band && y >= band && y < height - band) continue;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) samples[c]!.push(data[i + c]!);
    }
  }
  const bg = samples.map((s) => {
    s.sort((p, q) => p - q);
    return s[s.length >> 1]!;
  });
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i]! - bg[0]!;
    const dg = data[i + 1]! - bg[1]!;
    const db = data[i + 2]! - bg[2]!;
    const d = Math.sqrt(dr * dr + dg * dg + db * db);
    const a = Math.max(0, Math.min(1, (d - 6) / 22));
    if (a <= 0) continue;
    // pixel = a * colour + (1 - a) * background
    out[i] = Math.max(0, Math.min(255, Math.round(bg[0]! + dr / a)));
    out[i + 1] = Math.max(0, Math.min(255, Math.round(bg[1]! + dg / a)));
    out[i + 2] = Math.max(0, Math.min(255, Math.round(bg[2]! + db / a)));
    out[i + 3] = Math.round(a * 255);
  }
  return { rgba: out, kind: 'key' };
}

/** Luma statistics of the pixels at least half covered. */
export function subjectStats(rgba: Buffer): SubjectStats {
  const ls: number[] = [];
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3]! < 128) continue;
    ls.push(luma(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!));
  }
  if (!ls.length) return { mean: 0, p5: 0, dark: 0 };
  ls.sort((p, q) => p - q);
  const mean = ls.reduce((s, v) => s + v, 0) / ls.length;
  return {
    mean: Math.round(mean),
    p5: Math.round(ls[Math.floor(ls.length * 0.05)]!),
    dark: ls.filter((v) => v < 50).length / ls.length,
  };
}

/**
 * MM6's shadows: a subject's 5th percentile at least 60 and at most 2% under luma 50 (icon
 * critic, pass 4: judged on what the key keeps, so a halo near the parchment no longer
 * passes a dark figure).
 */
export function lightEnough(s: SubjectStats): boolean {
  return s.p5 >= 60 && s.dark <= 0.02;
}

/**
 * Lift a subject's shadows so its 5th percentile lands on 70, its median and highlights
 * kept (icon critic, pass 4: lifting all three raised a dark figure's halo into a plate),
 * never darkening a pixel, its colour scaled with its luma so the hue holds.
 */
export function lift(rgba: Buffer): void {
  const ls: number[] = [];
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3]! < 128) continue;
    ls.push(luma(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!));
  }
  if (ls.length < 8) return;
  ls.sort((p, q) => p - q);
  const q = (f: number): number => ls[Math.min(ls.length - 1, Math.floor(ls.length * f))]!;
  const xs = [0, q(0.05), Math.max(q(0.05) + 1, q(0.5)), 255];
  const ys = [0, 70, Math.max(70, q(0.5)), 255];
  const curve = (l: number): number => {
    for (let k = 1; k < xs.length; k++) {
      if (l <= xs[k]! || k === xs.length - 1) {
        const span = Math.max(1e-6, xs[k]! - xs[k - 1]!);
        return ys[k - 1]! + ((l - xs[k - 1]!) / span) * (ys[k]! - ys[k - 1]!);
      }
    }
    return l;
  };
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3]! === 0) continue;
    const l = luma(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!);
    const target = Math.max(l, curve(l));
    if (target <= l) continue;
    if (l < 1) {
      rgba[i] = rgba[i + 1] = rgba[i + 2] = Math.round(target);
      continue;
    }
    const k = target / l;
    for (let c = 0; c < 3; c++) rgba[i + c] = Math.min(255, Math.round(rgba[i + c]! * k));
  }
}

/**
 * The soft key (icon critic, passes 3 and 4: a hard key left a step of 25 at the subject's
 * edge against MM6's 15, and holes where the parchment showed inside it). Parchment within
 * twelve that reaches the oval's rim, and a band two pixels into the subject beside it, take
 * a cover of (largest channel distance - 4) / 16, their colour unmixed from the parchment;
 * parchment enclosed by the subject stays opaque.
 */
function softKey(box: Buffer, w: number, h: number, parch: readonly number[]): void {
  const n = w * h;
  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (box[i * 4 + 3] === 0) {
      dist[i] = -1;
      continue;
    }
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(box[i * 4 + c]! - parch[c]!));
    dist[i] = d;
  }
  const keyable = (i: number): boolean => dist[i]! >= 0 && dist[i]! <= 12;
  const keyed = new Uint8Array(n);
  const stack: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!keyable(i)) continue;
      const rim =
        x === 0 ||
        y === 0 ||
        x === w - 1 ||
        y === h - 1 ||
        dist[i - 1]! < 0 ||
        dist[i + 1]! < 0 ||
        dist[i - w]! < 0 ||
        dist[i + w]! < 0;
      if (rim) {
        keyed[i] = 1;
        stack.push(i);
      }
    }
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
      if (j < 0 || j >= n || keyed[j] || !keyable(j)) continue;
      keyed[j] = 1;
      stack.push(j);
    }
  }
  const soft = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!keyed[i]) continue;
    soft[i] = 1;
    const x = i % w;
    const y = Math.floor(i / w);
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        if (dist[yy * w + xx]! >= 0) soft[yy * w + xx] = 1;
      }
  }
  for (let i = 0; i < n; i++) {
    if (!soft[i]) continue;
    const a = Math.max(0, Math.min(1, (dist[i]! - 4) / 16));
    if (a >= 1) continue;
    if (a <= 0) {
      box[i * 4 + 3] = 0;
      continue;
    }
    for (let c = 0; c < 3; c++)
      box[i * 4 + c] = Math.max(
        0,
        Math.min(255, Math.round(parch[c]! + (box[i * 4 + c]! - parch[c]!) / a)),
      );
    box[i * 4 + 3] = Math.round(a * 255);
  }
}

/** True inside the oval of `w` by `h` centred at (cx, cy), pixel centres. */
/**
 * A box downscale of a `sw` by `sh` picture to three times `w` by `h`, sampled at each
 * block's centre: every output pixel the mean of the source pixels whose centres fall in the
 * middle third of its footprint (as PIL's box filter counts them). It keeps the picture's
 * coarse texture, which lanczos3 smooths away at 68 pixels (icon critic, final pass:
 * meditation's mail kept a detail of 5.2 against MM6's 10.5; half of this brought 8.2).
 */
export function middleThirds(
  src: Buffer,
  sw: number,
  sh: number,
  channels: number,
  w: number,
  h: number,
): Float32Array {
  const span = (n: number, size: number, out: number): [number, number] => {
    const s = size / (out * 3);
    const half = Math.max(s, 1) / 2;
    const centre = (3 * n + 1.5) * s;
    const lo = Math.max(0, Math.floor(centre - half - 0.5) + 1);
    const hi = Math.min(size - 1, Math.floor(centre + half - 0.5));
    return lo <= hi ? [lo, hi] : [Math.min(size - 1, lo), Math.min(size - 1, lo)];
  };
  const out = new Float32Array(w * h * channels);
  for (let y = 0; y < h; y++) {
    const [y0, y1] = span(y, sh, h);
    for (let x = 0; x < w; x++) {
      const [x0, x1] = span(x, sw, w);
      const k = 1 / ((y1 - y0 + 1) * (x1 - x0 + 1));
      for (let c = 0; c < channels; c++) {
        let sum = 0;
        for (let v = y0; v <= y1; v++)
          for (let u = x0; u <= x1; u++) sum += src[(v * sw + u) * channels + c]!;
        out[(y * w + x) * channels + c] = sum * k;
      }
    }
  }
  return out;
}

function inOval(x: number, y: number, cx: number, cy: number, w: number, h: number): boolean {
  const dx = (x + 0.5 - cx) / (w / 2);
  const dy = (y + 0.5 - cy) / (h / 2);
  return dx * dx + dy * dy <= 1;
}

/** The border's median colour: the plain ground a picture was generated on. */
function groundOf(data: Buffer, width: number, height: number): [number, number, number] {
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.04));
  const samples: [number[], number[], number[]] = [[], [], []];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= band && x < width - band && y >= band && y < height - band) continue;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) samples[c]!.push(data[i + c]!);
    }
  }
  const med = samples.map((v) => {
    v.sort((p, q) => p - q);
    return v[v.length >> 1]!;
  });
  return [med[0]!, med[1]!, med[2]!];
}

/**
 * The tone map onto the parchment: luma through (0,0), (60,60), (ground,173), (255,255),
 * the colour scaled with its luma so hue and saturation hold.
 */
export function toneMap(
  ground: number,
): (r: number, g: number, b: number) => [number, number, number] {
  const target = luma(...ICON_PARCHMENT);
  const xs = ground > 70 && ground < 250 ? [0, 60, ground, 255] : [0, 255];
  const ys = ground > 70 && ground < 250 ? [0, 60, target, 255] : [0, 255];
  const curve = (l: number): number => {
    for (let k = 1; k < xs.length; k++) {
      if (l <= xs[k]! || k === xs.length - 1) {
        const span = Math.max(1e-6, xs[k]! - xs[k - 1]!);
        return ys[k - 1]! + ((l - xs[k - 1]!) / span) * (ys[k]! - ys[k - 1]!);
      }
    }
    return l;
  };
  return (r, g, b) => {
    const l = luma(r, g, b);
    if (l < 1) return [r, g, b];
    const k = curve(l) / l;
    return [Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)];
  };
}

/** A smooth mottle of four levels either way, as MM6's icon parchment carries. */
function mottle(w: number, h: number, seed: number): Float32Array {
  const step = 4;
  const gw = Math.ceil(w / step) + 2;
  const gh = Math.ceil(h / step) + 2;
  let s = seed >>> 0 || 1;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) {
    s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
    grid[i] = ((s >>> 8) / 16777216) * 8 - 4;
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = x / step;
      const gy = y / step;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = gx - x0;
      const fy = gy - y0;
      const at = (i: number, j: number): number => grid[j * gw + i]!;
      const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
      const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
      out[y * w + x] = top * (1 - fy) + bottom * fy;
    }
  }
  return out;
}

export async function postProcessIcon(
  input: string,
  output: string,
  o: IconOptions = {},
): Promise<IconReport> {
  const src = sharp(input).ensureAlpha();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const cut = matte(data, width, height);
  // The picture as it will sit on the parchment: each pixel toned, then its ground swapped
  // for the parchment by how far it is ground; the cover kept apart for the oval's edge.
  const n = width * height;
  const rgb = Buffer.alloc(n * 3);
  const cover = Buffer.alloc(n);
  const parch = ICON_PARCHMENT;
  if (cut.kind === 'key') {
    const ground = groundOf(data, width, height);
    const tone =
      (o.expose ?? 'map') === 'map'
        ? toneMap(luma(...ground))
        : (r: number, g: number, b: number): [number, number, number] => [r, g, b];
    const tg = tone(...ground);
    for (let i = 0; i < n; i++) {
      const a = cut.rgba[i * 4 + 3]! / 255;
      const t = tone(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!);
      for (let c = 0; c < 3; c++) {
        rgb[i * 3 + c] = Math.max(
          0,
          Math.min(255, Math.round(t[c]! + (1 - a) * (parch[c]! - tg[c]!))),
        );
      }
      cover[i] = cut.rgba[i * 4 + 3]!;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const a = cut.rgba[i * 4 + 3]! / 255;
      for (let c = 0; c < 3; c++) {
        rgb[i * 3 + c] = Math.round(a * cut.rgba[i * 4 + c]! + (1 - a) * parch[c]!);
      }
      cover[i] = cut.rgba[i * 4 + 3]!;
    }
  }
  // What the picture shows: the bounding box of its pixels at least a third covered (half,
  // when keyed, so a slight shading of the ground does not count), leaving out specks: a
  // pixel with fewer than twenty covered in its nine-by-nine window (icon critic, pass 3: a
  // grainy ground's specks spread stun's box over the whole frame).
  const edge = cut.kind === 'key' ? 128 : 85;
  const sum = new Int32Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      if (cover[y * width + x]! >= edge) row++;
      sum[(y + 1) * (width + 1) + x + 1] = sum[y * (width + 1) + x + 1]! + row;
    }
  }
  const near = (x: number, y: number): number => {
    const ax = Math.max(0, x - 4);
    const ay = Math.max(0, y - 4);
    const bx = Math.min(width, x + 5);
    const by = Math.min(height, y + 5);
    return (
      sum[by * (width + 1) + bx]! -
      sum[ay * (width + 1) + bx]! -
      sum[by * (width + 1) + ax]! +
      sum[ay * (width + 1) + ax]!
    );
  };
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cover[y * width + x]! < edge || near(x, y) < 20) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error(`${input}: no subject left after the matte`);
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  // The fit: 68 by 50 in the oval; wider than the oval only for a subject much wider than
  // tall (a bolt), as 36 of MM6's 99 are.
  const aspect = bw / bh;
  let scale: number;
  if (aspect * ICON_FIT.height <= ICON_FIT.width) scale = ICON_FIT.height / bh;
  else if (aspect >= 1.6) scale = Math.min(ICON_FIT.wide, aspect * ICON_FIT.height) / bw;
  else scale = ICON_FIT.width / bw;
  const fw = Math.round(bw * scale);
  const W = Math.max(ICON_SIZE.width, fw + 4 + ((fw + 4) % 2));
  const H = ICON_SIZE.height;
  // The whole box from the picture round the subject, padded with the parchment past its edge.
  const cx = (x0 + x1 + 1) / 2;
  const cy = (y0 + y1 + 1) / 2;
  const rw = W / scale;
  const rh = H / scale;
  const left = Math.round(cx - rw / 2);
  const top = Math.round(cy - rh / 2);
  const ext = {
    left: Math.max(0, -left),
    top: Math.max(0, -top),
    right: Math.max(0, left + Math.round(rw) - width),
    bottom: Math.max(0, top + Math.round(rh) - height),
  };
  const region = {
    left: left + ext.left,
    top: top + ext.top,
    width: Math.round(rw),
    height: Math.round(rh),
  };
  // Two passes: sharp extracts before it extends within one pipeline.
  const sample = async (buf: Buffer, channels: 1 | 3, fill: number[]): Promise<Buffer> => {
    const padded = await sharp(buf, { raw: { width, height, channels } })
      .extend({
        ...ext,
        background:
          channels === 3 ? { r: fill[0]!, g: fill[1]!, b: fill[2]! } : { r: 0, g: 0, b: 0 },
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const out = await sharp(padded.data, {
      raw: {
        width: padded.info.width,
        height: padded.info.height,
        channels: padded.info.channels as 1 | 3,
      },
    })
      .extract(region)
      .resize(W, H, { fit: 'fill', kernel: 'lanczos3' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    // A one-channel picture may come back with more channels; keep the first.
    if (out.info.channels === channels) return out.data;
    const one = Buffer.alloc(W * H * channels);
    for (let i = 0; i < W * H; i++) {
      for (let c = 0; c < channels; c++)
        one[i * channels + c] = out.data[i * out.info.channels + c]!;
    }
    return one;
  };
  const col = await sample(rgb, 3, [...parch]);
  const alpha = await sample(cover, 1, [0]);
  // The picture's grain put back where the subject is solid, at least 160 covered two pixels
  // in, so its edges and alpha stay on lanczos3; a pure light effect keeps its smooth glow
  // (icon critic, final pass: at half strength every p5 and edge step within 3 of before).
  const grain = (o.expose ?? 'map') === 'map' ? (o.grain ?? 0.5) : 0;
  if (grain > 0) {
    const padded = await sharp(rgb, { raw: { width, height, channels: 3 } })
      .extend({ ...ext, background: { r: parch[0]!, g: parch[1]!, b: parch[2]! } })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const cropped = await sharp(padded.data, {
      raw: { width: padded.info.width, height: padded.info.height, channels: 3 },
    })
      .extract(region)
      .raw()
      .toBuffer();
    const fine = middleThirds(cropped, region.width, region.height, 3, W, H);
    let solid = Uint8Array.from(alpha, (a) => (a >= 160 ? 1 : 0));
    for (let pass = 0; pass < 2; pass++) {
      const next = new Uint8Array(W * H);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          next[i] = solid[i]! & solid[i - 1]! & solid[i + 1]! & solid[i - W]! & solid[i + W]!;
        }
      }
      solid = next;
    }
    for (let i = 0; i < W * H; i++) {
      if (!solid[i]) continue;
      for (let c = 0; c < 3; c++) {
        const v = col[i * 3 + c]!;
        col[i * 3 + c] = Math.max(0, Math.min(255, Math.round(v + grain * (fine[i * 3 + c]! - v))));
      }
    }
  }
  // The subject's light, judged on what is at least half covered.
  const sub = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    sub[i * 4] = col[i * 3]!;
    sub[i * 4 + 1] = col[i * 3 + 1]!;
    sub[i * 4 + 2] = col[i * 3 + 2]!;
    sub[i * 4 + 3] = alpha[i]!;
  }
  // Judged on what the key keeps: covered pixels more than the key's twelve from the
  // parchment.
  const kept = Buffer.from(sub);
  for (let i = 0; i < W * H; i++) {
    let near = true;
    for (let c = 0; c < 3; c++) if (Math.abs(kept[i * 4 + c]! - parch[c]!) > 12) near = false;
    if (near) kept[i * 4 + 3] = 0;
  }
  const subject = subjectStats(kept);
  const lifted = (o.lift ?? true) && !lightEnough(subject);
  if (lifted) lift(sub);
  const box = Buffer.alloc(W * H * 4);
  const ocx = W / 2;
  const ocy = H / 2;
  const mott = mottle(W, H, W * 31 + H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = sub[i * 4 + 3]! / 255;
      if (inOval(x, y, ocx, ocy, ICON_OVAL.width, ICON_OVAL.height)) {
        const m = (1 - a) * mott[i]!;
        for (let c = 0; c < 3; c++)
          box[i * 4 + c] = Math.max(0, Math.min(255, Math.round(sub[i * 4 + c]! + m)));
        box[i * 4 + 3] = 255;
      } else if (a >= 0.5) {
        // Past the oval, as MM6's bolts overhang it: the subject alone, keyed.
        box[i * 4] = sub[i * 4]!;
        box[i * 4 + 1] = sub[i * 4 + 1]!;
        box[i * 4 + 2] = sub[i * 4 + 2]!;
        box[i * 4 + 3] = 255;
      }
    }
  }
  // The parchment keyed out (screens critic, round 12): the game lays the icon on the page's
  // own shadow (paint.ts `ellipse`, multiplied), so the page's grain and light show through
  // round the subject as they do in MM6's book; the subject and its glow stay.
  if (o.keyParchment ?? true) softKey(box, W, H, parch);
  reduceColours(box, o.colours ?? 255);
  await sharp(box, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile(output);
  // Count what was written.
  const back = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const seen = new Set<number>();
  let opaque = 0;
  for (let i = 0; i < back.data.length; i += 4) {
    if (back.data[i + 3]! < 128) continue;
    opaque++;
    seen.add((back.data[i]! << 16) | (back.data[i + 1]! << 8) | back.data[i + 2]!);
  }
  return { width: W, height: H, opaque, colours: seen.size, matte: cut.kind, subject, lifted };
}
