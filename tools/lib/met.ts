/**
 * Item pictures from the Met's open-access photographs (DESIGN.md 16.8): MM6's item sprites
 * were photographed props, and The Metropolitan Museum of Art photographs its arms and armour
 * on plain studio backdrops and gives the pictures away (CC0, Open Access). A museum photo is
 * fetched by object id, its backdrop keyed out (the backdrop is a smooth gradient with a soft
 * shadow, so the key grows from the border through smooth, backdrop-like pixels and stops at
 * the object's edge), and the object digitised to the bag's cells: softened, shrunk to MM6's
 * pitch, a little noise and a palette with dither, as a 1998 capture.
 */
import sharp from 'sharp';

const API = 'https://collectionapi.metmuseum.org/public/collection/v1';
/** The bag's cell, pixels: MM6's 27 (screens.css .inv-grid). An item picture is cells by cells. */
export const CELL = 27;
/** Clear pixels round an item inside its cells. */
const MARGIN = 2;

export interface MetObject {
  objectID: number;
  title: string;
  objectDate: string;
  culture: string;
  medium: string;
  isPublicDomain: boolean;
  primaryImage: string;
  primaryImageSmall: string;
  objectURL: string;
  creditLine: string;
  department: string;
}

export async function metObject(id: number): Promise<MetObject> {
  const res = await fetch(`${API}/objects/${id}`);
  if (!res.ok) throw new Error(`Met object ${id}: HTTP ${res.status}`);
  return (await res.json()) as MetObject;
}

export interface MetSearch {
  q: string;
  departmentId?: number;
  dateBegin?: number;
  dateEnd?: number;
  limit?: number;
}

/** Object ids matching a search, with pictures. */
export async function metSearch(s: MetSearch): Promise<number[]> {
  const p = new URLSearchParams({ q: s.q, hasImages: 'true', limit: String(s.limit ?? 12) });
  if (s.departmentId) p.set('departmentId', String(s.departmentId));
  if (s.dateBegin !== undefined && s.dateEnd !== undefined) {
    p.set('dateBegin', String(s.dateBegin));
    p.set('dateEnd', String(s.dateEnd));
  }
  const res = await fetch(`${API}.1/search?${p}`);
  if (!res.ok) throw new Error(`Met search: HTTP ${res.status}`);
  const d = (await res.json()) as { objectIDs?: number[] };
  return d.objectIDs ?? [];
}

export async function fetchBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export interface Raster {
  data: Buffer;
  width: number;
  height: number;
}

/** A photo decoded to RGBA, no larger than `max` on its long side. */
export async function decode(bytes: Buffer, max = 1400): Promise<Raster> {
  const { data, info } = await sharp(bytes)
    .rotate()
    .resize(max, max, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** How strongly the picture changes at each pixel (Sobel on luma, 0 to 255). */
function edges(r: Raster): Float32Array {
  const { width: w, height: h, data } = r;
  const l = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    l[p] = 0.3 * data[p * 4]! + 0.55 * data[p * 4 + 1]! + 0.15 * data[p * 4 + 2]!;
  }
  const e = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -l[i - w - 1]! +
        l[i - w + 1]! -
        2 * l[i - 1]! +
        2 * l[i + 1]! -
        l[i + w - 1]! +
        l[i + w + 1]!;
      const gy =
        -l[i - w - 1]! -
        2 * l[i - w]! -
        l[i - w + 1]! +
        l[i + w - 1]! +
        2 * l[i + w]! +
        l[i + w + 1]!;
      e[i] = Math.hypot(gx, gy) / 4;
    }
  }
  return e;
}

export interface KeyOptions {
  /** The most the picture may change at a pixel the key still grows through. */
  edge?: number;
  /** The most two neighbours may differ (sum over channels) for the key to step between them. */
  step?: number;
  /** The farthest from the backdrop's own colour (sum over channels) the key reaches. */
  reach?: number;
  /** Clear the enclosed holes that show the backdrop (a ring's middle). */
  pockets?: boolean;
}

/**
 * Keys a museum photo in place: the backdrop clear, the object opaque, its edge soft. The
 * backdrop is grown from the border a pixel at a time through pixels that are smooth and close
 * to their neighbour, so a gradient and a soft shadow are backdrop and the object's edge is
 * not; then the holes in the object that show the backdrop, ringed by its edge, are cleared.
 */
export function keyPhoto(r: Raster, o: KeyOptions = {}): { cover: number } {
  const { width: w, height: h, data } = r;
  const edge = o.edge ?? 22;
  const step = o.step ?? 30;
  const reach = o.reach ?? 250;
  const n = w * h;
  const e = edges(r);
  // The backdrop's own colour: the border's median.
  const ring: number[][] = [[], [], []];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x > 1 && x < w - 2 && y > 1 && y < h - 2) continue;
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) ring[c]!.push(data[i + c]!);
    }
  }
  const bg = ring.map((v) => v.sort((a, b) => a - b)[v.length >> 1]!);
  const far = (p: number): number =>
    Math.abs(data[p * 4]! - bg[0]!) +
    Math.abs(data[p * 4 + 1]! - bg[1]!) +
    Math.abs(data[p * 4 + 2]! - bg[2]!);
  const diff = (p: number, q: number): number =>
    Math.abs(data[p * 4]! - data[q * 4]!) +
    Math.abs(data[p * 4 + 1]! - data[q * 4 + 1]!) +
    Math.abs(data[p * 4 + 2]! - data[q * 4 + 2]!);
  const back = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const seed = (p: number): void => {
    if (!back[p] && far(p) < reach) {
      back[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (head < tail) {
    const p = queue[head++]!;
    const x = p % w;
    const y = (p - x) / w;
    const around = [
      x > 0 ? p - 1 : -1,
      x < w - 1 ? p + 1 : -1,
      y > 0 ? p - w : -1,
      y < h - 1 ? p + w : -1,
    ];
    for (const q of around) {
      if (q < 0 || back[q]) continue;
      if (e[q]! > edge || diff(p, q) > step || far(q) > reach) continue;
      back[q] = 1;
      queue[tail++] = q;
    }
  }
  if (o.pockets !== false) clearPockets(r, back, e, far, edge);
  // Only the biggest piece of what is left is the object: specks of backdrop that the key
  // stepped over are cleared.
  keepLargest(back, w, h);
  // A pixel of fringe off the edge, then the edge softened.
  const alpha = erode(back, w, h);
  let cover = 0;
  for (let p = 0; p < n; p++) {
    const a = alpha[p]!;
    data[p * 4 + 3] = a;
    if (a > 0) cover++;
  }
  return { cover: cover / n };
}

/**
 * Enclosed pockets of backdrop (a ring's middle, between a hilt's bars): smooth,
 * backdrop-coloured regions the key could not reach, bounded mostly by the object's edge. A
 * highlight on steel fades into the steel instead, and stays.
 */
function clearPockets(
  r: Raster,
  back: Uint8Array,
  e: Float32Array,
  far: (p: number) => number,
  edge: number,
): void {
  const { width: w, height: h } = r;
  const n = w * h;
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (back[s] || seen[s] || far(s) > 60 || e[s]! > edge) continue;
    let top = 0;
    stack[top++] = s;
    seen[s] = 1;
    const members: number[] = [];
    let bounded = 0;
    let boundary = 0;
    while (top > 0) {
      const p = stack[--top]!;
      members.push(p);
      const x = p % w;
      const y = (p - x) / w;
      for (const q of [
        x > 0 ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1,
        y > 0 ? p - w : -1,
        y < h - 1 ? p + w : -1,
      ]) {
        if (q < 0) continue;
        const like = !back[q] && far(q) <= 60 && e[q]! <= edge;
        if (like) {
          if (!seen[q]) {
            seen[q] = 1;
            stack[top++] = q;
          }
        } else {
          boundary++;
          if (e[q]! > edge) bounded++;
        }
      }
    }
    // Smaller than a third of a percent of the picture is a pale pit on a blade, not a hole.
    if (members.length < n * 0.003 || members.length > n * 0.3) continue;
    if (boundary && bounded / boundary > 0.6) for (const p of members) back[p] = 1;
  }
}

/** Keeps only the largest connected piece of the object. */
function keepLargest(back: Uint8Array, w: number, h: number): void {
  const n = w * h;
  const label = new Int32Array(n);
  const sizes: number[] = [0];
  const stack = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (back[s] || label[s]) continue;
    const id = sizes.length;
    sizes.push(0);
    let top = 0;
    stack[top++] = s;
    label[s] = id;
    while (top > 0) {
      const p = stack[--top]!;
      sizes[id]!++;
      const x = p % w;
      const y = (p - x) / w;
      for (const q of [
        x > 0 ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1,
        y > 0 ? p - w : -1,
        y < h - 1 ? p + w : -1,
      ]) {
        if (q >= 0 && !back[q] && !label[q]) {
          label[q] = id;
          stack[top++] = q;
        }
      }
    }
  }
  let best = 0;
  for (let i = 1; i < sizes.length; i++) if (sizes[i]! > sizes[best]!) best = i;
  for (let p = 0; p < n; p++) if (!back[p] && label[p] !== best) back[p] = 1;
}

/** The object's alpha: a pixel in from its outline, soft over the next. */
function erode(back: Uint8Array, w: number, h: number): Uint8Array {
  const n = w * h;
  const out = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (back[p]) continue;
      let open = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const qx = x + dx;
          const qy = y + dy;
          if (qx < 0 || qy < 0 || qx >= w || qy >= h || back[qy * w + qx]) open++;
        }
      }
      out[p] = open === 0 ? 255 : open <= 2 ? 150 : 60;
    }
  }
  return out;
}

export interface DigitiseOptions {
  /** Turn the photo, degrees clockwise, before fitting. */
  rotate?: number;
  /** Turn a wide photo upright. */
  upright?: boolean;
  /** Palette size. */
  colours?: number;
}

/**
 * The keyed object fitted into `cw` by `ch` cells at the bag's pitch, digitised: softened as
 * video was, shrunk, a touch of noise and less colour, then a palette with dither. RGBA,
 * exactly the cells' size, the object centred.
 */
export async function digitise(
  r: Raster,
  cw: number,
  ch: number,
  o: DigitiseOptions = {},
): Promise<Raster> {
  // The object's box.
  let x0 = r.width;
  let y0 = r.height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      if (r.data[(y * r.width + x) * 4 + 3]! > 100) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < x0) throw new Error('nothing left after the key');
  let img = sharp(r.data, { raw: { width: r.width, height: r.height, channels: 4 } }).extract({
    left: x0,
    top: y0,
    width: x1 - x0 + 1,
    height: y1 - y0 + 1,
  });
  let bw = x1 - x0 + 1;
  let bh = y1 - y0 + 1;
  let turn = o.rotate ?? 0;
  if (o.upright !== false && !turn && bw > bh * 1.25 && ch > cw) turn = 90;
  if (turn) {
    img = sharp(await img.png().toBuffer()).rotate(turn, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
    if (turn % 180 !== 0) [bw, bh] = [bh, bw];
  }
  const boxW = cw * CELL - MARGIN * 2;
  const boxH = ch * CELL - MARGIN * 2;
  const s = Math.min(boxW / bw, boxH / bh);
  const w = Math.max(1, Math.round(bw * s));
  const h = Math.max(1, Math.round(bh * s));
  // Video softness before the shrink: a blur in the photo's pixels scaled to the shrink, in a
  // pass of its own (sharp resizes before it blurs whatever the order of the calls).
  const soft = Math.max(0.3, Math.min(12, 0.6 / s));
  const softened = await sharp(await img.png().toBuffer())
    .blur(soft)
    .png()
    .toBuffer();
  const { data } = await sharp(softened)
    .resize(w, h, { kernel: 'lanczos3' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // A little noise and less colour, as a capture had.
  let seed = 1234567 + cw * 31 + ch;
  const rnd = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff - 0.5;
  };
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const m = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
    for (let c = 0; c < 3; c++) {
      const v = m + (data[i + c]! - m) * 0.88 + rnd() * 7;
      data[i + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  const png = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png({ palette: true, colours: o.colours ?? 96, dither: 1 })
    .toBuffer();
  const fitted = await sharp({
    create: {
      width: cw * CELL,
      height: ch * CELL,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: png, left: Math.round((cw * CELL - w) / 2), top: Math.round((ch * CELL - h) / 2) },
    ])
    .ensureAlpha()
    .raw()
    .toBuffer();
  return { data: fitted, width: cw * CELL, height: ch * CELL };
}

/** A keyed raster as a PNG. */
export async function toPng(r: Raster): Promise<Buffer> {
  return sharp(r.data, { raw: { width: r.width, height: r.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
