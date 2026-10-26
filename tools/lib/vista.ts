/**
 * The rest screen's vista (DESIGN.md 16.34): the owner's four pictures of one view, at sunrise,
 * in the day, at sunset and at night, each on a flat fuchsia sky (owner, 2026-10-26). The sky is
 * keyed out (tools/lib/key.ts), so the game draws a live one behind the land; the four are
 * checked to line up, a small shift taken out, and the same strip cut from each, wide and low as
 * the rest screen's picture box, into one atlas, the times stacked. A picture that does not line
 * up (ChatGPT redrew it instead of relighting it) is refused, to be generated again.
 */
import sharp from 'sharp';
import { keyFuchsia } from './key';

/** The strip's size: MM6's picture box on a phone in landscape, about eight to one. */
export const VISTA_SIZE = { width: 800, height: 96 } as const;
/** The times, in the atlas's order from the top. */
export const VISTA_TIMES = ['sunrise', 'day', 'sunset', 'night'] as const;
export type VistaTime = (typeof VISTA_TIMES)[number];
/** The most a time's skyline may stray from the day's, pixels on average, once shifted. */
export const MAX_MISMATCH = 3;
/** The farthest a time is searched for against the day, pixels each way. */
const SEARCH = 8;

/** Marks by hand (pipeline/vistas.json). */
export interface VistaMarks {
  /** The strip's first row in the pictures. */
  top: number;
}

export interface CutVista {
  /** The four strips stacked, sunrise at the top: RGBA, the sky clear. */
  atlas: Buffer;
  /** Each time's shift onto the day (dx, dy, source pixels) and what was left over. */
  shifts: Record<VistaTime, { dx: number; dy: number; mismatch: number }>;
  /** The strip's rows in the pictures. */
  rows: [number, number];
  /** The skyline in the strip: its highest row and its mean. */
  skyline: { top: number; mean: number };
}

interface Keyed {
  data: Buffer;
  width: number;
  height: number;
}

/** A picture keyed: RGBA, the fuchsia sky clear. Throws when the sky is not fuchsia. */
export async function keyed(path: string): Promise<Keyed> {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // The sky's colour: the median of the top rows, all sky in a landscape.
  const rows = Math.max(2, Math.round(info.height * 0.04));
  const ch: [number[], number[], number[]] = [[], [], []];
  for (let i = 0; i < info.width * rows; i++)
    for (let c = 0; c < 3; c++) ch[c]!.push(data[i * 4 + c]!);
  const ground = ch.map((v) => v.sort((a, b) => a - b)[v.length >> 1]!) as [number, number, number];
  keyFuchsia(data, info.width, info.height, ground);
  return { data, width: info.width, height: info.height };
}

/** Each column's first row that is mostly land: the skyline. */
export function skylineOf(k: Keyed): Int32Array {
  const out = new Int32Array(k.width);
  for (let x = 0; x < k.width; x++) {
    let y = 0;
    while (y < k.height && k.data[(y * k.width + x) * 4 + 3]! < 128) y++;
    out[x] = y;
  }
  return out;
}

/**
 * The whole-pixel shift that best lays one skyline on another (the picture moved by dx, dy
 * reads as the base), and the mean distance left between them.
 */
export function alignSkylines(
  base: Int32Array,
  other: Int32Array,
  reach = SEARCH,
): { dx: number; dy: number; mismatch: number } {
  let best = { dx: 0, dy: 0, mismatch: Infinity };
  for (let dx = -reach; dx <= reach; dx++) {
    for (let dy = -reach; dy <= reach; dy++) {
      let sum = 0;
      let n = 0;
      for (let x = reach; x < base.length - reach; x++) {
        sum += Math.abs(other[x + dx]! - dy - base[x]!);
        n++;
      }
      const mismatch = sum / n;
      if (mismatch < best.mismatch) best = { dx, dy, mismatch };
    }
  }
  return best;
}

/** A keyed picture moved so that its (x + dx, y + dy) lands on (x, y), the edges held. */
function shifted(k: Keyed, dx: number, dy: number): Keyed {
  if (!dx && !dy) return k;
  const out = Buffer.alloc(k.data.length);
  for (let y = 0; y < k.height; y++) {
    const sy = Math.min(k.height - 1, Math.max(0, y + dy));
    for (let x = 0; x < k.width; x++) {
      const sx = Math.min(k.width - 1, Math.max(0, x + dx));
      k.data.copy(out, (y * k.width + x) * 4, (sy * k.width + sx) * 4, (sy * k.width + sx) * 4 + 4);
    }
  }
  return { ...k, data: out };
}

/** The strip of a keyed picture at VISTA_SIZE, from source row `top`. */
async function strip(k: Keyed, top: number): Promise<Buffer> {
  const { width, height } = VISTA_SIZE;
  const scale = width / k.width;
  const scaledHeight = Math.round(k.height * scale);
  const y = Math.round(top * scale);
  if (y < 0 || y + height > scaledHeight) {
    throw new Error(`the strip from row ${top} runs off the picture`);
  }
  return sharp(k.data, { raw: { width: k.width, height: k.height, channels: 4 } })
    .resize(width, scaledHeight, { kernel: 'lanczos3' })
    .extract({ left: 0, top: y, width, height })
    .raw()
    .toBuffer();
}

/** Cuts the four pictures in `dir` (sunrise.png, day.png, sunset.png, night.png). */
export async function cutVista(dir: string, marks: VistaMarks): Promise<CutVista> {
  const pictures = {} as Record<VistaTime, Keyed>;
  for (const time of VISTA_TIMES) pictures[time] = await keyed(`${dir}/${time}.png`);
  const day = pictures.day;
  const base = skylineOf(day);
  const shifts = {} as CutVista['shifts'];
  for (const time of VISTA_TIMES) {
    const k = pictures[time];
    if (k.width !== day.width || k.height !== day.height) {
      throw new Error(
        `${time}.png is ${k.width} by ${k.height}, the day's ${day.width} by ${day.height}`,
      );
    }
    const s = time === 'day' ? { dx: 0, dy: 0, mismatch: 0 } : alignSkylines(base, skylineOf(k));
    if (s.mismatch > MAX_MISMATCH) {
      throw new Error(
        `${time}.png does not line up with day.png (its skyline is ${s.mismatch.toFixed(1)} px off ` +
          `at best): generate it again as an edit of the day picture`,
      );
    }
    shifts[time] = { ...s, mismatch: Math.round(s.mismatch * 10) / 10 };
    pictures[time] = shifted(k, s.dx, s.dy);
  }
  const { width, height } = VISTA_SIZE;
  const strips = await Promise.all(VISTA_TIMES.map((t) => strip(pictures[t], marks.top)));
  const atlas = Buffer.concat(strips);
  // The skyline in the day's strip.
  const sky = skylineOf({ data: strips[1]!, width, height });
  let topRow: number = height;
  let sum = 0;
  for (const y of sky) {
    topRow = Math.min(topRow, y);
    sum += y;
  }
  const rows = Math.round((height * day.width) / width);
  return {
    atlas,
    shifts,
    rows: [marks.top, marks.top + rows],
    skyline: { top: topRow, mean: Math.round((sum / width) * 10) / 10 },
  };
}
