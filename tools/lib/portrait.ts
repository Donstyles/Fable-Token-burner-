/**
 * Party portraits (DESIGN.md 12.2): the owner's ChatGPT pictures cut to the band's oval. Each
 * appearance's head box is set once on its neutral picture (pipeline/portraits.json); every
 * expression, an edit of the neutral one in the same framing, is cut by the same box. The cut
 * is resampled (lanczos3) to one image pixel a UI pixel, the shell's own pitch, and put on
 * MM6's sixteen bits as the shell's pieces are, with no posterising, then keyed to the ring's
 * opening (owner, 2026-10-18: posterised to 128 colours it was "still too pixelated"; at three
 * image pixels a UI pixel it was "too high res, not matching the UI").
 */
import sharp from 'sharp';

/** The band ring's opening in UI pixels: `.hud-frame` (src/ui/hud.css), 66 by 90, less its five bands. */
export const PORTRAIT_SIZE = { width: 56, height: 80 } as const;
/** Image pixels a UI pixel: one, so the face is drawn on the shell's own grid. */
export const PORTRAIT_DENSITY = 1;

/** The head's box in the neutral picture, in its pixels. */
export interface HeadBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PortraitReport {
  width: number;
  height: number;
  /** Opaque pixels and the distinct colours among them. */
  opaque: number;
  colours: number;
}

/** True inside the oval filling a `w` by `h` box, by pixel centres (paint.ts `inOval`). */
export function inOval(x: number, y: number, w: number, h: number): boolean {
  const dx = (x + 0.5 - w / 2) / (w / 2);
  const dy = (y + 0.5 - h / 2) / (h / 2);
  return dx * dx + dy * dy <= 1;
}

/** A channel to five or six bits and back, the low bits copied from the high (brush.ts). */
export function to565(v: number, bits: 5 | 6): number {
  const q = v >> (8 - bits);
  return bits === 5 ? (q << 3) | (q >> 2) : (q << 2) | (q >> 4);
}

/**
 * Cut one picture to the opening: the head box resampled to `density` image pixels a UI pixel
 * of `size`, on sixteen bits, keyed to the opening's oval by whole UI pixels.
 */
export async function cutPortrait(
  input: string,
  output: string,
  box: HeadBox,
  size: { width: number; height: number } = PORTRAIT_SIZE,
  density = PORTRAIT_DENSITY,
): Promise<PortraitReport> {
  const width = size.width * density;
  const height = size.height * density;
  const rgb = await sharp(input)
    .removeAlpha()
    .extract(box)
    .resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer();
  const rgba = Buffer.alloc(width * height * 4);
  const colours = new Set<number>();
  let opaque = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!inOval(Math.floor(x / density), Math.floor(y / density), size.width, size.height))
        continue;
      const i = y * width + x;
      const r = to565(rgb[i * 3]!, 5);
      const g = to565(rgb[i * 3 + 1]!, 6);
      const b = to565(rgb[i * 3 + 2]!, 5);
      rgba[i * 4] = r;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = b;
      rgba[i * 4 + 3] = 255;
      colours.add((r << 16) | (g << 8) | b);
      opaque++;
    }
  }
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
  return { width, height, opaque, colours: colours.size };
}
