/**
 * Spell icons from Meshy pictures (DESIGN.md 16.22), built as MM6 built its icons: one
 * bitmap of the subject composited onto a flat parchment oval (icon critic, pass 1: 68 by 52,
 * (184,172,150), the same oval as an empty slot), the subject's soft edge and glow blended
 * into the parchment, transparent only outside the oval where the subject is under half
 * there, 255 colours. The subject is matted from Meshy's alpha (un-premultiplied, the faint
 * haze dropped) or, for a picture kept on its plain background, keyed by its distance from
 * the background's colour, so a halo survives. It is fitted 64 by 48 into the oval, a bolt
 * or a beam wider (up to 100), and lifted, never darkened, when it is darker than MM6's
 * (subject p5 under 45, more than 5% under luma 50, or a mean under 105).
 */
import sharp from 'sharp';

/** The smallest icon box, in UI pixels; a wide subject widens it. */
export const ICON_SIZE = { width: 72, height: 54 } as const;
/** MM6's oval in every icon and every empty slot. */
export const ICON_OVAL = { width: 68, height: 52 } as const;
/** MM6's parchment inside the oval: flat, about four levels either way. */
export const ICON_PARCHMENT = [184, 172, 150] as const;
/** The subject's fit: most of the oval's height, a narrow margin each side; wide ones overhang. */
export const ICON_FIT = { width: 64, height: 48, wide: 100 } as const;

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
}

const luma = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Median cut over the opaque pixels: the box of colours with the widest channel is split at
 * its median until there are `count` boxes, and every pixel takes its box's mean. Done here
 * because the bundled image library writes a palette PNG only when it was built with a
 * quantiser, and silently writes true colour when it was not.
 */
export function reduceColours(rgba: Buffer, count: number): void {
  const idx: number[] = [];
  for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3]! >= 128) idx.push(i);
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
      for (let c = 0; c < 3; c++) {
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
    for (const i of b) {
      r += rgba[i]!;
      g += rgba[i + 1]!;
      bl += rgba[i + 2]!;
    }
    const n = b.length;
    for (const i of b) {
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(bl / n);
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

/** MM6's light: subject p5 at least 45, at most 5% under luma 50, a mean of 105 or more. */
export function lightEnough(s: SubjectStats): boolean {
  return s.p5 >= 45 && s.dark <= 0.05 && s.mean >= 105;
}

/**
 * Lift the subject's tones so its 5th, 50th and 95th percentiles land on 80, 140 and 235,
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
  const xs = [0, q(0.05), q(0.5), q(0.95), 255];
  const ys = [0, 80, 140, 235, 255];
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

/** True inside the oval of `w` by `h` centred at (cx, cy), pixel centres. */
function inOval(x: number, y: number, cx: number, cy: number, w: number, h: number): boolean {
  const dx = (x + 0.5 - cx) / (w / 2);
  const dy = (y + 0.5 - cy) / (h / 2);
  return dx * dx + dy * dy <= 1;
}

export async function postProcessIcon(
  input: string,
  output: string,
  o: IconOptions = {},
): Promise<IconReport> {
  const src = sharp(input).ensureAlpha();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  const cut = matte(data, info.width, info.height);
  // What the picture shows: the bounding box of its pixels at least a third covered (half,
  // when keyed, so a slight shading of the ground does not count).
  const edge = cut.kind === 'key' ? 128 : 85;
  let x0 = info.width;
  let y0 = info.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (cut.rgba[(y * info.width + x) * 4 + 3]! < edge) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error(`${input}: no subject left after the matte`);
  // Keep the faint glow just outside the box.
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03);
  const left = Math.max(0, x0 - pad);
  const top = Math.max(0, y0 - pad);
  const width = Math.min(info.width - left, x1 - x0 + 1 + 2 * pad);
  const height = Math.min(info.height - top, y1 - y0 + 1 + 2 * pad);
  // The fit: the oval's height less two pixels each side; wider than the oval only for a
  // subject much wider than tall (a bolt), as 36 of MM6's 99 are.
  const aspect = width / height;
  let fw: number;
  let fh: number;
  if (aspect * ICON_FIT.height <= ICON_FIT.width) {
    fh = ICON_FIT.height;
    fw = Math.max(1, Math.round(aspect * fh));
  } else if (aspect >= 1.6) {
    fw = Math.min(ICON_FIT.wide, Math.round(aspect * ICON_FIT.height));
    fh = Math.max(1, Math.round(fw / aspect));
  } else {
    fw = ICON_FIT.width;
    fh = Math.max(1, Math.round(fw / aspect));
  }
  const fitted = await sharp(cut.rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract({ left, top, width, height })
    .resize(fw, fh, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sub = fitted.data;
  const subject = subjectStats(sub);
  const lifted = (o.lift ?? true) && !lightEnough(subject);
  if (lifted) lift(sub);
  const W = Math.max(ICON_SIZE.width, fw + 4 + ((fw + 4) % 2));
  const H = ICON_SIZE.height;
  const box = Buffer.alloc(W * H * 4);
  const cx = W / 2;
  const cy = H / 2;
  const ox = Math.floor((W - fw) / 2);
  const oy = Math.floor((H - fh) / 2);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = (y * W + x) * 4;
      const sx = x - ox;
      const sy = y - oy;
      const s = sx >= 0 && sy >= 0 && sx < fw && sy < fh ? (sy * fw + sx) * 4 : -1;
      const a = s >= 0 ? sub[s + 3]! / 255 : 0;
      if (inOval(x, y, cx, cy, ICON_OVAL.width, ICON_OVAL.height)) {
        // On the parchment: the subject blended in by its cover.
        for (let c = 0; c < 3; c++) {
          const fg = s >= 0 ? sub[s + c]! : 0;
          box[d + c] = Math.round(a * fg + (1 - a) * ICON_PARCHMENT[c]!);
        }
        box[d + 3] = 255;
      } else if (a >= 0.5) {
        // Past the oval, as MM6's bolts overhang it: the subject alone, keyed.
        box[d] = sub[s]!;
        box[d + 1] = sub[s + 1]!;
        box[d + 2] = sub[s + 2]!;
        box[d + 3] = 255;
      }
    }
  }
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
