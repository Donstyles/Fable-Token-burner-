/**
 * Concept pictures on a fuchsia ground (owner, 2026-10-19: "We do fuchsia backgrounds"). No
 * tree, rock or house is magenta, so the ground keys out cleanly where white would take a
 * birch's bark or a lime wall with it. A pixel's cover comes from its spill, how far its red
 * and blue both stand above its green, measured against the ground's own spill. The edge's
 * colour is not to be trusted: a generated picture's chroma bleeds a pixel or two past its
 * outline, so unmixing the ground leaves a pink or purple rim. Every part-covered pixel, and
 * every one near the ground that carries spill, takes its colour from the clean subject beside it
 * instead (bled outward a pixel a pass, the usual alpha bleed); one with no clean pixel near
 * is unmixed from the ground and what spill is left comes off its red and blue. So no pink
 * fringe reaches Meshy's texture. A picture that already has transparency (Meshy's background
 * removal) passes through as it is.
 */
import sharp from 'sharp';

/** Ground spill shares: under the first a pixel is all subject, over the second all ground. */
export const KEY_RAMP = { opaque: 0.12, clear: 0.88 } as const;
/** The least spill a ground needs to count as fuchsia (pure #FF00FF has 255). */
const MIN_GROUND_SPILL = 160;

export interface KeyReport {
  width: number;
  height: number;
  /** How the subject was cut: Meshy's own alpha, or keyed from the fuchsia ground. */
  matte: 'alpha' | 'fuchsia';
  /** The ground's colour (the border's median); null for a picture with alpha. */
  ground: [number, number, number] | null;
  /** Share of the picture fully covered by the subject, and partly covered (its edge). */
  opaque: number;
  edge: number;
}

/** How far red and blue both stand above green: fuchsia's mark, none in a green or brown. */
export function spillOf(r: number, g: number, b: number): number {
  return Math.min(r, b) - g;
}

/** The border's median colour, four per cent deep: the plain ground the picture stands on. */
export function groundOf(data: Buffer, width: number, height: number): [number, number, number] {
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
 * How far from any ground showing (pixels) a spilled pixel takes the subject's colour: a
 * generated picture's chroma bleeds up to five pixels inward past a dark outline.
 */
export const EDGE_REACH = 6;

/**
 * Keys an RGBA buffer on a fuchsia ground in place: the ground to clear, the subject opaque,
 * its edge part-covered in the subject's own colour. Throws when the ground is not fuchsia.
 */
export function keyFuchsia(
  data: Buffer,
  width: number,
  height: number,
): { ground: [number, number, number]; opaque: number; edge: number } {
  const ground = groundOf(data, width, height);
  const groundSpill = spillOf(...ground);
  if (groundSpill < MIN_GROUND_SPILL) {
    throw new Error(
      `the ground is rgb(${ground.join(', ')}), not fuchsia: ask for a plain #FF00FF background`,
    );
  }
  const n = width * height;
  const lo = KEY_RAMP.opaque * groundSpill;
  const hi = KEY_RAMP.clear * groundSpill;
  const alpha = new Float32Array(n);
  const spill = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    spill[p] = spillOf(data[i]!, data[i + 1]!, data[i + 2]!);
    alpha[p] = Math.max(0, Math.min(1, (hi - spill[p]!) / (hi - lo)));
  }
  // Within EDGE_REACH of any ground showing, the open ground or a pocket of it caught between
  // needles that never clears: grow that mask a pixel a pass.
  let near: Uint8Array = Uint8Array.from(alpha, (a) => (a < 1 ? 1 : 0));
  for (let pass = 0; pass < EDGE_REACH; pass++) near = grow(near, width, height);
  // 0: clear, 1: clean subject (a colour source), 2: an edge whose colour is replaced.
  const kind = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    if (alpha[p]! <= 0) continue;
    kind[p] = alpha[p]! < 1 || (near[p] && spill[p]! > 0) ? 2 : 1;
  }
  // The alpha bleed: each pass, every edge pixel beside a coloured one takes their mean.
  const filled = Uint8Array.from(kind, (k) => (k === 1 ? 1 : 0));
  for (let pass = 0; pass < EDGE_REACH * 2; pass++) {
    const fresh: number[] = [];
    for (let p = 0; p < n; p++) {
      if (kind[p] !== 2 || filled[p]) continue;
      const x = p % width;
      const y = (p - x) / width;
      const sum = [0, 0, 0];
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const qx = x + dx;
          const qy = y + dy;
          if (qx < 0 || qy < 0 || qx >= width || qy >= height) continue;
          const q = qy * width + qx;
          if (!filled[q]) continue;
          for (let c = 0; c < 3; c++) sum[c]! += data[q * 4 + c]!;
          count++;
        }
      }
      if (!count) continue;
      for (let c = 0; c < 3; c++) data[p * 4 + c] = Math.round(sum[c]! / count);
      fresh.push(p);
    }
    if (!fresh.length) break;
    for (const p of fresh) filled[p] = 1;
  }
  let opaque = 0;
  let edge = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const a = alpha[p]!;
    if (a <= 0) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
    if (a >= 1) opaque++;
    else edge++;
    data[i + 3] = Math.round(a * 255);
    if (kind[p] !== 2 || filled[p]) continue;
    // No clean subject near (a thin twig): unmix the ground. pixel = m * colour +
    // (1 - m) * ground, the mix m read straight off the spill.
    const m = Math.max(0.05, 1 - spill[p]! / groundSpill);
    const c = [0, 1, 2].map((k) =>
      Math.max(0, Math.min(255, ground[k]! + (data[i + k]! - ground[k]!) / m)),
    );
    // What spill is left is the ground's, not the subject's: off red and blue.
    const left = Math.max(0, spillOf(c[0]!, c[1]!, c[2]!));
    data[i] = Math.round(c[0]! - left);
    data[i + 1] = Math.round(c[1]!);
    data[i + 2] = Math.round(c[2]! - left);
  }
  return { ground, opaque: opaque / n, edge: edge / n };
}

/** A mask grown by one pixel in the eight directions. */
function grow(mask: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(mask);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const qx = x + dx;
          const qy = y + dy;
          if (qx >= 0 && qy >= 0 && qx < width && qy < height) out[qy * width + qx] = 1;
        }
      }
    }
  }
  return out;
}

/** The picture at `src` keyed to a transparent PNG at `dest`. */
export async function keyPicture(src: string, dest: string): Promise<KeyReport> {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < 250) {
      hasAlpha = true;
      break;
    }
  }
  let report: KeyReport;
  if (hasAlpha) {
    let opaque = 0;
    let edge = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 255) opaque++;
      else if (data[i]! > 0) edge++;
    }
    const n = width * height;
    report = { width, height, matte: 'alpha', ground: null, opaque: opaque / n, edge: edge / n };
  } else {
    const k = keyFuchsia(data, width, height);
    report = { width, height, matte: 'fuchsia', ...k };
  }
  await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(dest);
  return report;
}
