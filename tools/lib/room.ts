/**
 * A house's room (DESIGN.md 17.8): the owner's picture of it cut to the view's box, and the
 * lights the game animates on it, found on the picture's own paint. The flames are its
 * brightest white-yellow paint, the coals the red-orange paint under and round them, and each
 * fire throws a wide soft light over the room that rises and falls with its flicker.
 *
 * The lights picture packs four masks: red the flames, green the coals, blue the biggest
 * fire's light, alpha the light of the others.
 */
import sharp from 'sharp';

/** The room's picture: the phone's view box (DESIGN.md 16.34) at one UI pixel. */
export const ROOM_SIZE = { width: 640, height: 296 } as const;

export interface Fire {
  /** Its box in the cut picture's pixels, before scaling to ROOM_SIZE. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** Pixels of flame core. */
  area: number;
}

export interface RoomLights {
  /** Width × height bytes each, 0–255, at ROOM_SIZE. */
  flame: Uint8Array;
  coal: Uint8Array;
  light: Uint8Array;
  others: Uint8Array;
  /** The fires, biggest first, in ROOM_SIZE pixels. */
  fires: Fire[];
  /** Where sparks rise from: the biggest fire's coal bed (x from, x to, y), or null. */
  sparks: [number, number, number] | null;
}

/** A flame's core: white-yellow paint, brighter and yellower than the firelit stone round it. */
export function isFlame(r: number, g: number, b: number): boolean {
  return r >= 245 && g >= 175 && b <= 190 && r - b >= 70;
}

/** A coal's or an ember's paint: red-orange, glowing but not white. */
export function isCoal(r: number, g: number, b: number): boolean {
  return r >= 150 && g <= 150 && b <= 90 && r - g >= 60;
}

/** Box blur by running sums, edges held, `rad` pixels each way, in place on a copy. */
function boxBlur(src: Float32Array, w: number, h: number, rad: number): Float32Array {
  if (rad < 1) return src;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const n = 2 * rad + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let i = -rad; i <= rad; i++) sum += src[y * w + Math.min(w - 1, Math.max(0, i))]!;
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / n;
      sum += src[y * w + Math.min(w - 1, x + rad + 1)]! - src[y * w + Math.max(0, x - rad)]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let i = -rad; i <= rad; i++) sum += tmp[Math.min(h - 1, Math.max(0, i)) * w + x]!;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / n;
      sum += tmp[Math.min(h - 1, y + rad + 1) * w + x]! - tmp[Math.max(0, y - rad) * w + x]!;
    }
  }
  return out;
}

/** Near-gaussian blur: three box blurs. */
function blur(src: Float32Array, w: number, h: number, rad: number): Float32Array {
  let m = src;
  for (let i = 0; i < 3; i++) m = boxBlur(m, w, h, Math.max(1, Math.round(rad / 2)));
  return m;
}

/**
 * The band of a `height`-tall picture, `band` rows high, to keep: every fire inside with a
 * margin if it can be, else the fires' middle; the picture's middle when it has no fire.
 */
export function chooseBand(height: number, band: number, fires: Fire[]): number {
  const mid = Math.round((height - band) / 2);
  if (!fires.length || band >= height) return Math.max(0, mid);
  const top = Math.min(...fires.map((f) => f.y0));
  const bottom = Math.max(...fires.map((f) => f.y1));
  const margin = Math.round(band * 0.15);
  const lo = Math.max(0, bottom + margin - band);
  const hi = Math.min(height - band, top - margin);
  if (lo <= hi) return Math.min(hi, Math.max(lo, mid));
  return Math.min(height - band, Math.max(0, Math.round((top + bottom - band) / 2)));
}

/** A fire as found: its box and its number in the label image. */
export type FirePiece = Fire & { n: number };

/** The flame cores' pieces, pieces of one fire (tongues parted by a log) joined. */
export function findFires(
  rgb: Uint8Array,
  w: number,
  h: number,
  minArea: number,
): { fires: FirePiece[]; label: Int32Array } {
  const core = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (isFlame(rgb[i * 3]!, rgb[i * 3 + 1]!, rgb[i * 3 + 2]!)) core[i] = 1;
  }
  const label = new Int32Array(w * h);
  const pieces: FirePiece[] = [];
  const queue = new Int32Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (!core[s] || label[s]) continue;
    const n = pieces.length + 1;
    let head = 0;
    let tail = 0;
    queue[tail++] = s;
    label[s] = n;
    const f = { n, x0: w, x1: 0, y0: h, y1: 0, area: 0 };
    while (head < tail) {
      const k = queue[head++]!;
      const x = k % w;
      const y = (k - x) / w;
      f.area++;
      f.x0 = Math.min(f.x0, x);
      f.x1 = Math.max(f.x1, x);
      f.y0 = Math.min(f.y0, y);
      f.y1 = Math.max(f.y1, y);
      // Two pixels each way: a flame's paint is broken by its own dark streaks.
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const q = yy * w + xx;
          if (core[q] && !label[q]) {
            label[q] = n;
            queue[tail++] = q;
          }
        }
      }
    }
    pieces.push(f);
  }
  let fires = pieces.filter((f) => f.area >= minArea);
  // Pieces within a few pixels of each other are one fire.
  const near = Math.round(Math.max(w, h) * 0.03);
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < fires.length; i++) {
      for (let j = i + 1; j < fires.length; j++) {
        const p = fires[i]!;
        const q = fires[j]!;
        const gap = Math.max(p.x0 - q.x1, q.x0 - p.x1, p.y0 - q.y1, q.y0 - p.y1);
        if (gap > near) continue;
        for (let k = 0; k < w * h; k++) if (label[k] === q.n) label[k] = p.n;
        p.area += q.area;
        p.x0 = Math.min(p.x0, q.x0);
        p.x1 = Math.max(p.x1, q.x1);
        p.y0 = Math.min(p.y0, q.y0);
        p.y1 = Math.max(p.y1, q.y1);
        fires = fires.filter((f) => f !== q);
        merged = true;
        break outer;
      }
    }
  }
  fires.sort((a, b) => b.area - a.area);
  return { fires, label };
}

/** Shrink a w × h float mask (0–1) to ROOM_SIZE bytes. */
async function shrink(m: Float32Array, w: number, h: number): Promise<Uint8Array> {
  const bytes = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bytes[i] = Math.round(Math.min(1, Math.max(0, m[i]!)) * 255);
  const out = await sharp(bytes, { raw: { width: w, height: h, channels: 1 } })
    .resize(ROOM_SIZE.width, ROOM_SIZE.height, { fit: 'fill', kernel: 'linear' })
    // sharp writes three channels unless told to keep one.
    .extractChannel(0)
    .raw()
    .toBuffer();
  return new Uint8Array(out.buffer, out.byteOffset, ROOM_SIZE.width * ROOM_SIZE.height);
}

/**
 * The lights of a cut picture (its RGB bytes, `w` × `h`, already the view box's shape),
 * as masks at ROOM_SIZE.
 */
export async function findLights(rgb: Uint8Array, w: number, h: number): Promise<RoomLights> {
  const minArea = Math.max(40, Math.round(w * h * 1.2e-4));
  const { fires, label } = findFires(rgb, w, h, minArea);
  const flame = new Float32Array(w * h);
  const coal = new Float32Array(w * h);
  const light = new Float32Array(w * h);
  const others = new Float32Array(w * h);
  const unit = Math.max(w, h) / 1448;
  let coalBed = 0;
  fires.slice(0, 4).forEach((f, i) => {
    const m = new Float32Array(w * h);
    for (let k = 0; k < w * h; k++) if (label[k] === f.n) m[k] = 1;
    const soft = blur(m, w, h, Math.round(10 * unit));
    for (let k = 0; k < w * h; k++) flame[k] = Math.max(flame[k]!, Math.min(1, soft[k]! * 4));
    // The coals: red-orange paint in a band from the flames' top to under their foot.
    const bx0 = Math.max(0, f.x0 - Math.round(40 * unit));
    const bx1 = Math.min(w, f.x1 + Math.round(40 * unit));
    const by0 = f.y0;
    const by1 = Math.min(h, f.y1 + Math.round(50 * unit));
    const c = new Float32Array(w * h);
    let count = 0;
    for (let y = by0; y < by1; y++) {
      for (let x = bx0; x < bx1; x++) {
        const k = y * w + x;
        if (!label[k] && isCoal(rgb[k * 3]!, rgb[k * 3 + 1]!, rgb[k * 3 + 2]!)) {
          c[k] = 1;
          count++;
        }
      }
    }
    if (i === 0) coalBed = count;
    const cs = blur(c, w, h, Math.round(2 * unit));
    for (let k = 0; k < w * h; k++) coal[k] = Math.max(coal[k]!, Math.min(1, cs[k]! * 2));
    // Its light over the room: wide and soft, a little wider for a bigger fire.
    const size = Math.max(f.x1 - f.x0, f.y1 - f.y0);
    const l = blur(m, w, h, Math.round(Math.min(260 * unit, Math.max(140 * unit, size * 2.2))));
    let top = 0;
    for (let k = 0; k < w * h; k++) top = Math.max(top, l[k]!);
    const into = i === 0 ? light : others;
    for (let k = 0; k < w * h; k++) into[k] = Math.max(into[k]!, l[k]! / (top || 1));
  });
  const sx = ROOM_SIZE.width / w;
  const sy = ROOM_SIZE.height / h;
  const scaled = fires.map((f) => ({
    x0: f.x0 * sx,
    x1: f.x1 * sx,
    y0: f.y0 * sy,
    y1: f.y1 * sy,
    area: f.area,
  }));
  const big = scaled[0];
  return {
    flame: await shrink(flame, w, h),
    coal: await shrink(coal, w, h),
    light: await shrink(light, w, h),
    others: await shrink(others, w, h),
    fires: scaled,
    // Sparks rise only off a bed of coals, not off a lamp's wick.
    sparks:
      big && coalBed >= big.area * 0.5
        ? [+big.x0.toFixed(1), +big.x1.toFixed(1), +big.y1.toFixed(1)]
        : null,
  };
}

export interface CutRoom {
  /** The picture at ROOM_SIZE, RGB bytes. */
  picture: Buffer;
  lights: RoomLights;
  /** The band's top row in the source picture, and its height. */
  top: number;
  band: number;
}

/**
 * Cut the picture at `path` to the view box's shape, the band keeping its fires (or from
 * `top` when given), and find its lights.
 */
export async function cutRoom(path: string, top?: number): Promise<CutRoom> {
  const src = sharp(path).removeAlpha();
  const meta = await src.metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  const band = Math.min(H, Math.round((W * ROOM_SIZE.height) / ROOM_SIZE.width));
  const full = new Uint8Array(await src.clone().raw().toBuffer());
  const y0 =
    top !== undefined
      ? Math.max(0, Math.min(H - band, top))
      : chooseBand(H, band, findFires(full, W, H, Math.max(40, Math.round(W * H * 1.2e-4))).fires);
  const rgb = new Uint8Array(full.buffer, full.byteOffset + y0 * W * 3, W * band * 3);
  const lights = await findLights(rgb, W, band);
  const picture = await sharp(Buffer.from(rgb), { raw: { width: W, height: band, channels: 3 } })
    .resize(ROOM_SIZE.width, ROOM_SIZE.height, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();
  return { picture, lights, top: y0, band };
}

/** The four masks as one RGBA PNG. */
export async function lightsPng(l: RoomLights): Promise<Buffer> {
  const n = ROOM_SIZE.width * ROOM_SIZE.height;
  const px = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    px[i * 4] = l.flame[i]!;
    px[i * 4 + 1] = l.coal[i]!;
    px[i * 4 + 2] = l.light[i]!;
    px[i * 4 + 3] = l.others[i]!;
  }
  return sharp(px, { raw: { width: ROOM_SIZE.width, height: ROOM_SIZE.height, channels: 4 } })
    .png()
    .toBuffer();
}
