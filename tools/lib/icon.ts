/**
 * Spell icons from Meshy pictures (DESIGN.md 16.22): the background-removed picture is
 * cropped to what it shows, fitted into the icon box with a little air, its alpha cut hard
 * as MM6's colour-keyed bitmaps were, and its colours reduced to a small palette, as an
 * 8-bit bitmap of 1998 had. The spellbook lays it on its own parchment oval.
 */
import sharp from 'sharp';

/** MM6's icons are about 68 by 52 pixels on a 640-pixel screen; ours are drawn on the UI pixel grid. */
export const ICON_SIZE = { width: 72, height: 54 } as const;

export interface IconReport {
  width: number;
  height: number;
  /** Opaque pixels and distinct colours among them. */
  opaque: number;
  colours: number;
}

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

export async function postProcessIcon(
  input: string,
  output: string,
  o: { width: number; height: number; colours?: number } = ICON_SIZE,
): Promise<IconReport> {
  const src = sharp(input).ensureAlpha();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  // What the picture shows: the bounding box of its clearly opaque pixels.
  let x0 = info.width;
  let y0 = info.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3]! < 48) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error(`${input}: the picture is empty after background removal`);
  const left = Math.max(0, x0 - 2);
  const top = Math.max(0, y0 - 2);
  const width = Math.min(info.width - left, x1 - x0 + 5);
  const height = Math.min(info.height - top, y1 - y0 + 5);
  // A pixel of air round the subject inside the box.
  const inner = { width: o.width - 2, height: o.height - 2 };
  const fitted = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left, top, width, height })
    .resize(inner.width, inner.height, {
      fit: 'inside',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const fw = fitted.info.width;
  const fh = fitted.info.height;
  const box = Buffer.alloc(o.width * o.height * 4);
  const ox = Math.floor((o.width - fw) / 2);
  const oy = Math.floor((o.height - fh) / 2);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const s = (y * fw + x) * 4;
      const d = ((y + oy) * o.width + (x + ox)) * 4;
      const a = fitted.data[s + 3]!;
      // A hard cut, as a colour key: half covered is in, the rest is out.
      if (a < 128) continue;
      box[d] = fitted.data[s]!;
      box[d + 1] = fitted.data[s + 1]!;
      box[d + 2] = fitted.data[s + 2]!;
      box[d + 3] = 255;
    }
  }
  reduceColours(box, o.colours ?? 96);
  await sharp(box, { raw: { width: o.width, height: o.height, channels: 4 } })
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
  return { width: o.width, height: o.height, opaque, colours: seen.size };
}
