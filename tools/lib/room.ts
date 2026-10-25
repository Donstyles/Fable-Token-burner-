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
  /** The magic glows, in ROOM_SIZE pixels. */
  orbs: Orb[];
}

/** A flame's core: white-yellow paint, brighter and yellower than the firelit stone round it. */
export function isFlame(r: number, g: number, b: number): boolean {
  return r >= 245 && g >= 175 && b <= 190 && r - b >= 70;
}

/**
 * A candle's or a lamp's core: near white or pale yellow. It is a flame only with a flame's
 * orange beside it (`isFlameEdge`), which a lit window or a white robe has not.
 */
export function isWhiteHot(r: number, g: number, b: number): boolean {
  return Math.min(r, g, b) >= 232 || (r >= 238 && g >= 212 && b <= 230 && r - b >= 18);
}

/** A flame's orange edge. */
export function isFlameEdge(r: number, g: number, b: number): boolean {
  return r >= 200 && g >= 80 && g <= 215 && b <= 140 && r - b >= 100;
}

/** A magic glow's paint: bright, and bluer than it is red or green (an orb, a crystal). */
export function isMagic(r: number, g: number, b: number): boolean {
  return b >= 170 && b - r >= 40 && b - g >= 15 && r + g + b >= 330;
}

/** A coal's or an ember's paint: deep red-orange, glowing but not white (firelit wood is browner). */
export function isCoal(r: number, g: number, b: number): boolean {
  return r >= 170 && g <= 120 && b <= 70 && r - g >= 80;
}

/** The fewest pixels of flame that make a fire in a `w` × `h` picture: a far candle's. */
export function minFireArea(w: number, h: number): number {
  return Math.max(12, Math.round(w * h * 1.5e-5));
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
  notFlame?: Uint8Array,
): { fires: FirePiece[]; label: Int32Array } {
  const core = new Uint8Array(w * h);
  const edge = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = rgb[i * 3]!;
    const g = rgb[i * 3 + 1]!;
    const b = rgb[i * 3 + 2]!;
    if (isFlame(r, g, b)) core[i] = 1;
    else if (isFlameEdge(r, g, b)) edge[i] = 1;
  }
  // A white or pale core within a few pixels of a flame's orange is a flame too: a candle.
  const nearEdge = boxBlur(edge, w, h, Math.max(2, Math.round(Math.max(w, h) / 200)));
  for (let i = 0; i < w * h; i++) {
    if (!core[i] && nearEdge[i]! > 0 && isWhiteHot(rgb[i * 3]!, rgb[i * 3 + 1]!, rgb[i * 3 + 2]!)) {
      core[i] = 1;
    }
  }
  if (notFlame) for (let i = 0; i < w * h; i++) if (notFlame[i]) core[i] = 0;
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
  const near = Math.round(Math.max(w, h) * 0.015);
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

/** A magic glow found on the picture: its middle and radius, and its colour, picture pixels. */
export interface Orb {
  at: [number, number];
  r: number;
  colour: [number, number, number];
}

/**
 * The magic glows: pieces of bright blue paint holding near-white light, an orb's or a
 * crystal's (a dim blue window holds none). Biggest first, at most four.
 */
export function findOrbs(rgb: Uint8Array, w: number, h: number, minArea: number): Orb[] {
  const glow = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (isMagic(rgb[i * 3]!, rgb[i * 3 + 1]!, rgb[i * 3 + 2]!)) glow[i] = 1;
  }
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const orbs: (Orb & { area: number })[] = [];
  for (let s0 = 0; s0 < w * h; s0++) {
    if (!glow[s0] || seen[s0]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = s0;
    seen[s0] = 1;
    let area = 0;
    let white = 0;
    let x0 = w;
    let x1 = 0;
    let y0 = h;
    let y1 = 0;
    const sum: [number, number, number] = [0, 0, 0];
    while (head < tail) {
      const k = queue[head++]!;
      const x = k % w;
      const y = (k - x) / w;
      area++;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      sum[0] += rgb[k * 3]!;
      sum[1] += rgb[k * 3 + 1]!;
      sum[2] += rgb[k * 3 + 2]!;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const q = yy * w + xx;
          if (seen[q]) continue;
          const r = rgb[q * 3]!;
          const g = rgb[q * 3 + 1]!;
          const b = rgb[q * 3 + 2]!;
          // The white heart is part of the glow.
          if (glow[q] || Math.min(r, g, b) >= 225) {
            if (Math.min(r, g, b) >= 225) white++;
            seen[q] = 1;
            queue[tail++] = q;
          }
        }
      }
    }
    if (area < minArea || white < Math.max(4, area * 0.02)) continue;
    orbs.push({
      at: [(x0 + x1) / 2, (y0 + y1) / 2],
      r: Math.max(x1 - x0, y1 - y0) / 2,
      colour: sum.map((v) => Math.round(v / area)) as [number, number, number],
      area,
    });
  }
  orbs.sort((a, b) => b.area - a.area);
  return orbs.slice(0, 4).map(({ at, r, colour }) => ({ at, r, colour }));
}

/**
 * The lights of a cut picture (its RGB bytes, `w` × `h`, already the view box's shape),
 * as masks at ROOM_SIZE. Each fire lights the wall round it and throws a pool on the floor
 * in front of and under it, as a hearth does.
 */
export async function findLights(rgb: Uint8Array, w: number, h: number): Promise<RoomLights> {
  const unit = Math.max(w, h) / 1448;
  const minArea = minFireArea(w, h);
  // An orb's white heart is no candle: the orbs take their pixels first.
  const orbsFound = findOrbs(rgb, w, h, minArea * 4);
  const orbPixels = new Uint8Array(w * h);
  for (const o of orbsFound) {
    const r = o.r * 1.4;
    for (let y = Math.max(0, Math.floor(o.at[1] - r)); y < Math.min(h, o.at[1] + r); y++) {
      for (let x = Math.max(0, Math.floor(o.at[0] - r)); x < Math.min(w, o.at[0] + r); x++) {
        if (Math.hypot(x - o.at[0], y - o.at[1]) <= r) orbPixels[y * w + x] = 1;
      }
    }
  }
  const { fires, label } = findFires(rgb, w, h, minArea, orbPixels);
  const index = new Map(fires.map((f, i) => [f.n, i] as const));
  const flameAll = new Float32Array(w * h);
  const coalAll = new Float32Array(w * h);
  const big = new Float32Array(w * h);
  const rest = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) {
    const i = index.get(label[k]!);
    if (i === undefined) continue;
    flameAll[k] = 1;
    (i === 0 ? big : rest)[k] = 1;
  }
  // The coals: red-orange paint in a band from each fire's middle to under its foot.
  let coalBed = 0;
  fires.forEach((f, i) => {
    const bx0 = Math.max(0, f.x0 - Math.round(40 * unit));
    const bx1 = Math.min(w, f.x1 + Math.round(40 * unit));
    const by1 = Math.min(h, f.y1 + Math.round(50 * unit));
    for (let y = Math.round((f.y0 + f.y1) / 2); y < by1; y++) {
      for (let x = bx0; x < bx1; x++) {
        const k = y * w + x;
        if (!label[k] && isCoal(rgb[k * 3]!, rgb[k * 3 + 1]!, rgb[k * 3 + 2]!)) {
          if (!coalAll[k] && i === 0) coalBed++;
          coalAll[k] = 1;
        }
      }
    }
  });
  const soft = blur(flameAll, w, h, Math.round(10 * unit));
  const flame = soft.map((v) => Math.min(1, v * 4));
  const coal = blur(coalAll, w, h, Math.round(2 * unit)).map((v) => Math.min(1, v * 2));
  // A fire's light: a wide soft field round it, and a pool on the floor before and under
  // it, wider than it is deep, as far down as the fire is wide.
  const lightOf = (fs: FirePiece[], mask: Float32Array): Float32Array => {
    const src = Float32Array.from(mask);
    for (const f of fs) {
      const size = Math.max(f.x1 - f.x0, f.y1 - f.y0, 8 * unit);
      const cx = (f.x0 + f.x1) / 2;
      const cy = f.y1 + size * 1.1;
      const rx = size * 2.2;
      const ry = size * 0.9;
      for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(h, Math.ceil(cy + ry)); y++) {
        for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(w, Math.ceil(cx + rx)); x++) {
          const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
          if (d < 1) src[y * w + x] = Math.max(src[y * w + x]!, (1 - d) * 0.35);
        }
      }
    }
    const size = fs.length ? Math.max(...fs.map((f) => Math.max(f.x1 - f.x0, f.y1 - f.y0))) : 0;
    const l = blur(src, w, h, Math.round(Math.min(260 * unit, Math.max(110 * unit, size * 2))));
    let top = 0;
    for (const v of l) top = Math.max(top, v);
    return l.map((v) => v / (top || 1));
  };
  const light = lightOf(fires.slice(0, 1), big);
  const others = lightOf(fires.slice(1), rest);
  const sx = ROOM_SIZE.width / w;
  const sy = ROOM_SIZE.height / h;
  const scaled = fires.map((f) => ({
    x0: f.x0 * sx,
    x1: f.x1 * sx,
    y0: f.y0 * sy,
    y1: f.y1 * sy,
    area: f.area,
  }));
  const first = scaled[0];
  const orbs = orbsFound.map((o) => ({
    at: [+(o.at[0] * sx).toFixed(1), +(o.at[1] * sy).toFixed(1)] as [number, number],
    r: +(o.r * sx).toFixed(1),
    colour: o.colour,
  }));
  return {
    flame: await shrink(flame, w, h),
    coal: await shrink(coal, w, h),
    light: await shrink(light, w, h),
    others: await shrink(others, w, h),
    fires: scaled,
    // Sparks rise only off a bed of coals, not off a lamp's wick.
    sparks:
      first && coalBed >= fires[0]!.area * 0.5
        ? [+first.x0.toFixed(1), +first.x1.toFixed(1), +first.y1.toFixed(1)]
        : null,
    orbs,
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
      : chooseBand(H, band, findFires(full, W, H, minFireArea(W, H)).fires);
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
