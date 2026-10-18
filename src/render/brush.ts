/**
 * The brushes behind every painted surface (DESIGN.md 16.10, 16.13): a seeded die, soft dabs
 * of a wide brush and wandering strokes that wrap across a tile's seams, and the posteriser
 * that maps a grey painting into a short ramp of tones, warm or cool by a tint field, as an
 * 8-bit palette did. The shell's paint shop (src/ui/paint.ts) and the world's painted
 * textures (src/world/painted-textures.ts) share them.
 */

export type Rgb = [number, number, number];
export interface Tone {
  cool: Rgb;
  warm: Rgb;
}

/** A seeded die in [0, 1): every build paints the same picture. */
export function die(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** A ramp of `n` tones interpolated through the given ones. */
export function expand(tones: Tone[], n: number): Tone[] {
  const out: Tone[] = [];
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * (tones.length - 1);
    const i = Math.min(tones.length - 2, Math.floor(t));
    const f = t - i;
    out.push({
      cool: mix(tones[i]!.cool, tones[i + 1]!.cool, f),
      warm: mix(tones[i]!.warm, tones[i + 1]!.warm, f),
    });
  }
  return out;
}

/** A plain ramp of tones, the same warm and cool. */
export function ramp(...hexes: string[]): Tone[] {
  return hexes.map((h) => {
    const rgb: Rgb = [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
    return { cool: rgb, warm: rgb };
  });
}

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d');
  if (!g) throw new Error('no 2d context');
  return [c, g];
}

/** Put one pixel. */
export function px(g: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  g.fillStyle = color;
  g.fillRect(x, y, 1, 1);
}

/** A soft dab of a wide brush, wrapped across the tile's seams (`h` 0: across x only). */
export function dab(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot: number,
  tone: number,
  alpha: number,
): void {
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  grad.addColorStop(0, `rgba(${tone},${tone},${tone},${alpha})`);
  grad.addColorStop(1, `rgba(${tone},${tone},${tone},0)`);
  for (const dx of [-w, 0, w]) {
    for (const dy of h > 0 ? [-h, 0, h] : [0]) {
      g.save();
      g.translate(x + dx, y + dy);
      g.rotate(rot);
      g.scale(Math.max(0.5, rx), Math.max(0.5, ry));
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, 1, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
}

/** A wandering line, wrapped across the seams (`h` 0: across x only). */
export function stroke(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  points: [number, number][],
  color: string,
  width: number,
  ox = 0,
  oy = 0,
): void {
  for (const dx of [-w, 0, w]) {
    for (const dy of h > 0 ? [-h, 0, h] : [0]) {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.lineCap = 'round';
      g.beginPath();
      points.forEach(([x, y], i) => {
        if (i) g.lineTo(x + dx + ox, y + dy + oy);
        else g.moveTo(x + dx + ox, y + dy + oy);
      });
      g.stroke();
    }
  }
}

/** Map a grey painting into a ramp of tones, warm or cool by a slow tint field. */
export function posterise(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  ramp: Tone[],
  tint: ((x: number, y: number) => number) | null,
  low = 40,
  high = 215,
): void {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const n = ramp.length;
  for (let i = 0; i < d.length; i += 4) {
    const p = i / 4;
    const lum = d[i]!;
    const k = Math.max(0, Math.min(n - 1, Math.round(((lum - low) / (high - low)) * (n - 1))));
    const t = ramp[k]!;
    const col = tint ? mix(t.cool, t.warm, tint(p % w, Math.floor(p / w))) : t.warm;
    d[i] = col[0];
    d[i + 1] = col[1];
    d[i + 2] = col[2];
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

/** Tiling value noise, centred on zero (-0.5 to 0.5), smooth between lattice points `period` apart. */
export function valueNoise(w: number, h: number, period: number, seed: number): Float32Array {
  const r = die(seed);
  const gw = Math.max(1, Math.round(w / period));
  const gh = Math.max(1, Math.round(h / period));
  const lattice = new Float32Array(gw * gh);
  for (let i = 0; i < lattice.length; i++) lattice[i] = r();
  const out = new Float32Array(w * h);
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) {
    const gy = (y / h) * gh;
    const y0 = Math.floor(gy);
    const y1 = (y0 + 1) % gh;
    const fy = smooth(gy - y0);
    for (let x = 0; x < w; x++) {
      const gx = (x / w) * gw;
      const x0 = Math.floor(gx);
      const x1 = (x0 + 1) % gw;
      const fx = smooth(gx - x0);
      const a = lattice[y0 * gw + x0]!;
      const b = lattice[y0 * gw + x1]!;
      const c = lattice[y1 * gw + x0]!;
      const d = lattice[y1 * gw + x1]!;
      out[y * w + x] = (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy - 0.5;
    }
  }
  return out;
}

/**
 * A cloudy surface as MM6's scans were (critics, round 7): a base colour, octaves of value
 * noise each of a period and an amplitude in luminance, a slow per-channel tint, a
 * pixel-wide grain; hundreds of levels, no ramp.
 */
export function cloudy(
  w: number,
  h: number,
  seed: number,
  o: { base: Rgb; octaves: [number, number][]; tint?: number; grain?: number },
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const img = g.createImageData(w, h);
  const d = img.data;
  const layers = o.octaves.map(([p, a], i) => [valueNoise(w, h, p, seed + i * 101), a] as const);
  const tint = o.tint ?? 0;
  const tr = tint ? valueNoise(w, h, 40, seed + 7) : null;
  const tb = tint ? valueNoise(w, h, 52, seed + 9) : null;
  const grain = o.grain ?? 0;
  const r = die(seed + 13);
  for (let i = 0; i < w * h; i++) {
    let l = 0;
    for (const [n, a] of layers) l += n[i]! * 2 * a;
    const gr = grain ? (r() - 0.5) * 2 * grain : 0;
    const dr = tr ? tr[i]! * 2 * tint : 0;
    const db = tb ? tb[i]! * 2 * tint : 0;
    d[i * 4] = Math.max(0, Math.min(255, o.base[0] + l + gr + dr));
    d[i * 4 + 1] = Math.max(0, Math.min(255, o.base[1] + l + gr));
    d[i * 4 + 2] = Math.max(0, Math.min(255, o.base[2] + l + gr + db));
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Snap every pixel to the nearest tone of a ramp: hard pixel art out of soft brushwork. */
export function snap(g: CanvasRenderingContext2D, w: number, h: number, tones: Tone[]): void {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < tones.length; k++) {
      const t = tones[k]!.warm;
      const dd = (d[i]! - t[0]) ** 2 + (d[i + 1]! - t[1]) ** 2 + (d[i + 2]! - t[2]) ** 2;
      if (dd < bestD) {
        bestD = dd;
        best = k;
      }
    }
    const t = tones[best]!.warm;
    d[i] = t[0];
    d[i + 1] = t[1];
    d[i + 2] = t[2];
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

/**
 * Hard-edged pixel grain (DESIGN.md 16.14): clods a tone up or down, then single pixels and
 * short dashes in every tone of the ramp, the extremes rarer, as a 1998 ground tile was
 * dotted in by hand. No soft brush: every texel is one of the ramp's tones. With `spread`,
 * each mark keeps within that many steps of the base instead of taking any tone.
 */
export function grain(
  w: number,
  h: number,
  seed: number,
  tones: Tone[],
  o: { marks?: number; clods?: number; clodSize?: number; base?: number; spread?: number },
): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  // Sixteen steps through the ramp (critics, round 8: MM6's dirt has hundreds of colours
  // in runs of two pixels, not five in runs of eight).
  tones = tones.length < 16 ? expand(tones, 16) : tones;
  const n = tones.length;
  const hex = (t: Tone): string => `rgb(${t.warm.map(Math.round).join(',')})`;
  const base = o.base !== undefined ? Math.round((o.base / (n - 1)) * (n - 1)) : Math.floor(n / 2);
  g.fillStyle = hex(tones[base]!);
  g.fillRect(0, 0, w, h);
  const clods = o.clods ?? 40;
  const clodSize = o.clodSize ?? 8;
  for (let i = 0; i < clods; i++) {
    const step = (r() < 0.5 ? -1 : 1) * (r() < 0.75 ? 3 : 6);
    const k = Math.max(0, Math.min(n - 1, base + step));
    const x = r() * w;
    const y = r() * h;
    const rx = clodSize * (0.5 + r());
    const ry = rx * (0.4 + r() * 0.6);
    const rot = r() * Math.PI;
    g.fillStyle = hex(tones[k]!);
    for (const dx of [-w, 0, w]) {
      for (const dy of [-h, 0, h]) {
        g.save();
        g.translate(x + dx, y + dy);
        g.rotate(rot);
        g.scale(rx, ry);
        g.beginPath();
        g.arc(0, 0, 1, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    }
  }
  const marks = (o.marks ?? 2500) * 2;
  for (let i = 0; i < marks; i++) {
    // A mark of any tone is white noise (talk-world critic, round 13); the grass keeps its
    // marks within three steps of the base.
    const k =
      o.spread === undefined
        ? Math.min(n - 1, Math.floor(r() * n))
        : Math.max(0, Math.min(n - 1, base + Math.round((2 * r() - 1) * o.spread)));
    g.fillStyle = hex(tones[k]!);
    const x = Math.floor(r() * w);
    const y = Math.floor(r() * h);
    const len = r() < 0.3 ? 2 : 1;
    g.fillRect(x, y, len, 1);
    if (x + len > w) g.fillRect(x - w, y, len, 1);
  }
  snap(g, w, h, tones);
  return c;
}

/**
 * A sky strip, as MM6 painted its skies (DESIGN.md 16.14): cumulus masses and long level
 * streaks, chunky at the edges, thinning toward the horizon. The red channel holds the
 * cloud's density (the sky shader cuts it at a threshold set by the weather), the green its
 * tone: 0 the shaded underside, 0.5 the body, 1 the lit top. The strip wraps across its
 * width round the horizon, bottom at the horizon, top at the zenith.
 */
export function paintSkyStrip(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#000000';
  g.fillRect(0, 0, w, h);
  // MM6's skies were streaked: long level strokes of cloud at every height, ragged along
  // their edges, with a few small cumulus; never one mass across the view. The strokes
  // slope a little, as a brush dragged across the sky does.
  // Fifty-five strokes round the whole horizon, whatever the strip's size: the brush scales
  // with the strip, so the cover stays the same. Fewer, lower and a fifth thinner than before
  // (talk-world critic, round 14: a hundred centred up to 0.85 of the strip covered 68% of
  // the sky in one sheet of elongation 6.1, where MM6's cover is 27 to 41% and its masses
  // 3.8 to 5.0): centred up to 0.6, at the price of open blue above about 42 degrees.
  const masses = 55;
  for (let m = 0; m < masses; m++) {
    // Each in its own fifty-fifth of the horizon, widened by three tenths of one either side
    // (talk-world critic, round 15: placed at random, fifty left the talk view's sky 15%
    // cloud and sixteen azimuths 20 to 33%, where MM6's views run 27 to 41%).
    const cx = ((m - 0.3 + 1.6 * r()) / masses) * w;
    const v = 0.05 + r() * 0.55;
    const cy = h - v * h;
    // Three in four masses are wind-swept streaks, half as long again (critics, round 11:
    // MM6's bodies are streaks, elongation 4.3 to 5.6).
    const streak = r() < 0.75;
    const n = streak ? 5 + Math.floor(r() * 5) : 6 + Math.floor(r() * 6);
    const spread = (streak ? (80 + r() * 140) * 1.5 : 20 + r() * 30) * (w / 1024);
    const slope = (r() - 0.5) * 0.12;
    for (let k = 0; k < n; k++) {
      const t = (k / Math.max(1, n - 1) - 0.5) * spread;
      const x = cx + t + (r() - 0.5) * 10 * (w / 1024);
      const y = cy + t * slope + (r() - 0.5) * (streak ? 4 : 12) * (h / 192);
      const rx = (streak ? 22 + r() * 40 : 7 + r() * 12) * (w / 1024);
      const ry = (streak ? 2.5 + r() * 3 : 5 + r() * 8) * (h / 192) * 0.8;
      dab(g, w, 0, x, y, rx, ry, slope, 255, 0.95);
      // Lumps along the top edge, so the stroke's edge is ragged rather than ruled.
      for (let j = 0; j < 2; j++) {
        const lr = (2.5 + r() * 4) * (w / 1024);
        dab(
          g,
          w,
          0,
          x + (r() - 0.5) * rx * 1.4,
          y - ry * (0.5 + r() * 0.6),
          lr,
          lr * 0.8,
          0,
          255,
          0.95,
        );
      }
      // Stipple round the mass (critics, round 9): a few small faint dabs below the
      // weather's threshold on their own, over it where they overlap the mass's edge, so
      // the cut lands on a feathered edge, not a cliff.
      for (let j = 0; j < 2; j++) {
        const sr = (1 + r() * 2) * (w / 1024);
        dab(
          g,
          w,
          0,
          x + (r() - 0.5) * rx * 2.4,
          y + (r() - 0.5) * ry * 2.6,
          sr,
          sr * 0.7,
          0,
          255,
          0.2 + r() * 0.15,
        );
      }
    }
  }
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const density = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) density[i] = d[i * 4]! / 255;
  // The tone (critics, rounds 11 and 12): lit where the density rises from the row above,
  // grey where it falls to the row below, from the density blurred over three texels and
  // three rows so the light runs smoothly across columns; a mottle of twelve by six pixels
  // and striations of sixteen by four through it. Rows run toward the horizon.
  const blur = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          sum += density[yy * w + ((((x + dx) % w) + w) % w)]!;
          n++;
        }
      }
      blur[y * w + x] = sum / n;
    }
  }
  const db = (x: number, y: number): number => (y < 0 || y >= h ? 0 : blur[y * w + x]!);
  const mottle = valueNoise(w, h, 3, seed + 77);
  const sw = Math.max(1, w >> 1);
  const stria = valueNoise(sw, h, 2, seed + 91);
  const tones = new Float32Array(w * h).fill(0.5);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (density[i]! < 0.3) continue;
      const here = db(x, y);
      // A soft clip, not a clamp (talk-world critic, round 13: the clamp piled a quarter of
      // the cloud on one cream, (197,186,140), where MM6's top tone is 6 to 12%): no upper
      // clamp on the light, and the tone through a logistic, so the lit tops spread over the
      // upper tones.
      const base = Math.max(
        0.15,
        0.62 + 1.6 * (here - db(x, y - 3)) - 0.9 * Math.max(0, here - db(x, y + 3)),
      );
      const m = mottle[i]! * 0.7;
      const st = stria[y * sw + Math.min(sw - 1, x >> 1)]! * 0.46;
      tones[i] = 1 / (1 + Math.exp(-4 * (base + m + st - 0.45)));
    }
  }
  for (let i = 0; i < w * h; i++) {
    d[i * 4] = Math.round(density[i]! * 255);
    d[i * 4 + 1] = Math.round(tones[i]! * 255);
    d[i * 4 + 2] = 0;
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * Round every channel to a multiple of `step` (8: the five-bit grid of a 1998 frame buffer,
 * where three quarters of MM6's channel values sit; critics, round 8). Smooth clouds step
 * into patches, and a surface counts its colours in the hundreds, not the thousands.
 */
export function quantise(g: CanvasRenderingContext2D, w: number, h: number, step = 8): void {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    d[i] = Math.min(255, Math.round(d[i]! / step) * step);
    d[i + 1] = Math.min(255, Math.round(d[i + 1]! / step) * step);
    d[i + 2] = Math.min(255, Math.round(d[i + 2]! / step) * step);
  }
  g.putImageData(img, 0, 0);
}

/** Per-pixel speckle, unblurred: every pixel nudged by up to `amp` either way in luminance. */
export function speck(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  amp: number,
): void {
  const r = die(seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const t = (r() - 0.5) * 2 * amp;
    d[i] = Math.max(0, Math.min(255, d[i]! + t));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + t));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + t));
  }
  g.putImageData(img, 0, 0);
}

/** A two-by-two Bayer dither of ±`amp` before a quantise, so steps break into a checker, not bands. */
export function dither(g: CanvasRenderingContext2D, w: number, h: number, amp: number): void {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const bayer = [-0.375, 0.125, 0.375, -0.125];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      const t = bayer[(y & 1) * 2 + (x & 1)]! * 2 * amp;
      d[i] = Math.max(0, Math.min(255, d[i]! + t));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + t));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + t));
    }
  }
  g.putImageData(img, 0, 0);
}

/**
 * Crazed marble as MM6's rest screen, second cut (critics, round 9): cells of fifty-five to
 * seventy pixels on a jittered grid with bent boundaries, each a shade lighter or darker;
 * the cracks pale polylines whose width (one to four) and strength (0.3 to 1) vary along
 * them, three in ten dropped, a dark pixel along one side only where the crack is strong.
 */
export function crazed2(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  pitch: number,
  line: Rgb,
  shade: Rgb,
  tone: number,
  crack: { alpha?: number; width?: number } = {},
): void {
  const r = die(seed);
  const pts: [number, number, number][] = [];
  const nx = Math.max(1, Math.round(w / pitch));
  const ny = Math.max(1, Math.round(h / pitch));
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      pts.push([
        ((i + 0.5 + (r() - 0.5)) * w) / nx,
        ((j + 0.5 + (r() - 0.5)) * h) / ny,
        (r() - 0.5) * 2 * tone,
      ]);
    }
  }
  const bendX = valueNoise(w, h, 22, seed + 3);
  const bendY = valueNoise(w, h, 22, seed + 4);
  const cell = new Int16Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i0 = y * w + x;
      const sx = x + bendX[i0]! * 14;
      const sy = y + bendY[i0]! * 14;
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < pts.length; i++) {
        let dx = Math.abs(sx - pts[i]![0]);
        let dy = Math.abs(sy - pts[i]![1]);
        if (dx > w / 2) dx = w - dx;
        if (dy > h / 2) dy = h - dy;
        const dd = dx * dx * 0.85 + dy * dy * 1.2;
        if (dd < bestD) {
          bestD = dd;
          best = i;
        }
      }
      cell[i0] = best;
    }
  }
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < w * h; i++) {
    const t = pts[cell[i]!]![2];
    d[i * 4] = Math.max(0, Math.min(255, d[i * 4]! + t));
    d[i * 4 + 1] = Math.max(0, Math.min(255, d[i * 4 + 1]! + t));
    d[i * 4 + 2] = Math.max(0, Math.min(255, d[i * 4 + 2]! + t));
  }
  g.putImageData(img, 0, 0);
  const at = (x: number, y: number): number => cell[(((y % h) + h) % h) * w + (((x % w) + w) % w)]!;
  // Each crack (a pair of cells) keeps its own fate: dropped, its strength, its phase.
  const fate = new Map<number, [boolean, number, number]>();
  const ofEdge = (a: number, b: number): [boolean, number, number] => {
    const k = Math.min(a, b) * 65536 + Math.max(a, b);
    let f = fate.get(k);
    if (!f) {
      f = [r() < 0.3, 0.3 + r() * 0.7, r() * 6.28];
      fate.set(k, f);
    }
    return f;
  };
  const paleRgba = (a: number): string => `rgba(${line[0]},${line[1]},${line[2]},${a.toFixed(2)})`;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = at(x, y);
      const kx = at(x + 1, y);
      const ky = at(x, y + 1);
      if (k === kx && k === ky) continue;
      const [dropped, strength, phase] = ofEdge(k, kx !== k ? kx : ky);
      if (dropped) continue;
      const wave = 0.5 + 0.5 * Math.sin(x * 0.11 + y * 0.07 + phase);
      const alpha = Math.min(1, strength * (0.55 + 0.45 * wave));
      const width = crack.width ?? 1 + Math.round(3 * wave * strength);
      if (alpha > 0.7) {
        g.fillStyle = `rgb(${shade[0]},${shade[1]},${shade[2]})`;
        g.fillRect((x + 1) % w, (y + 1) % h, 1, 1);
      }
      g.fillStyle = paleRgba(alpha * (crack.alpha ?? 1));
      g.fillRect(x - Math.floor((width - 1) / 2), y - Math.floor((width - 1) / 2), width, width);
    }
  }
}

/**
 * Quantise to RGB565 with bit replication, as MM6's 16-bit frame (critics, round 9): red
 * and blue to 32 levels, green to 64, each level's low bits refilled from its high ones so
 * the top value is 255 and the steps are not multiples of eight.
 */
export function quantise565(g: CanvasRenderingContext2D, w: number, h: number): void {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r5 = d[i]! >> 3;
    const g6 = d[i + 1]! >> 2;
    const b5 = d[i + 2]! >> 3;
    d[i] = (r5 << 3) | (r5 >> 2);
    d[i + 1] = (g6 << 2) | (g6 >> 4);
    d[i + 2] = (b5 << 3) | (b5 >> 2);
  }
  g.putImageData(img, 0, 0);
}

/**
 * Wisps: separate one- to two-pixel random walks whose strength fades from `alpha` at the
 * start toward a fifth of it at the end, as MM6's green marble veins (critics, round 10).
 */
export function wisps(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  count: number,
  length: [number, number],
  color: Rgb,
  alpha: number,
  end = alpha * 0.2,
): void {
  const r = die(seed);
  for (let v = 0; v < count; v++) {
    let x = r() * w;
    let y = r() * h;
    let ang = r() * Math.PI * 2;
    const len = length[0] + r() * (length[1] - length[0]);
    const wide = r() < 0.4;
    for (let t = 0; t < len; t++) {
      ang += (r() - 0.5) * 0.7;
      x += Math.cos(ang);
      y += Math.sin(ang);
      const a = alpha + ((end - alpha) * t) / len;
      g.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${a.toFixed(2)})`;
      const px0 = Math.floor(((x % w) + w) % w);
      const py0 = Math.floor(((y % h) + h) % h);
      g.fillRect(px0, py0, wide ? 2 : 1, 1);
    }
  }
}

/** Independent per-channel noise on red and blue, so the warm-cool jitter MM6's scans carried shows. */
export function chroma(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  amp: number,
  redOnly = false,
): void {
  const r = die(seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.max(0, Math.min(255, d[i]! + (r() - 0.5) * 2 * amp));
    if (!redOnly) d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + (r() - 0.5) * 2 * amp));
  }
  g.putImageData(img, 0, 0);
}

/** One-dimensional value noise along a run, -0.5 to 0.5: strokes whose strength changes along them. */
export function noise1(length: number, period: number, seed: number): Float32Array {
  const r = die(seed);
  const n = Math.max(2, Math.ceil(length / period) + 2);
  const lattice = Array.from({ length: n }, () => r());
  const out = new Float32Array(Math.max(1, Math.ceil(length)));
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  for (let i = 0; i < out.length; i++) {
    const t = i / period;
    const k = Math.floor(t);
    const f = smooth(t - k);
    out[i] = lattice[k]! + (lattice[k + 1]! - lattice[k]!) * f - 0.5;
  }
  return out;
}

export interface VeinOptions {
  /** Multiplier at a vein's core at full strength (0.82: eighteen percent darker). */
  centre?: number;
  /** Multiplier one pixel either side (1: a one-pixel vein). */
  side?: number;
  /** Keep the walk within `spread` radians of this heading or its opposite: a pillar's grain. */
  heading?: number;
  spread?: number;
  /** Radians the walk may turn each step. */
  turn?: number;
}

/**
 * Veins as MM6's marble carries them (critics, rounds 9 to 11): one-pixel-step walks, each
 * vein its own strength (0.6 to 1.4 of the nominal depth) tapering in and out along its run,
 * stamped three pixels wide; each pixel keeps its deepest stamp instead of compounding them,
 * so the core depth is what `centre` says and the veins are continuous, never beaded.
 */
export function veinField(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  count: number,
  length: [number, number],
  o: VeinOptions = {},
): void {
  const centre = 1 - (o.centre ?? 0.82);
  const side = 1 - (o.side ?? 0.91);
  const turn = o.turn ?? 0.5;
  const r = die(seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const dark = new Float32Array(w * h);
  for (let v = 0; v < count; v++) {
    let x = r() * w;
    let y = r() * h;
    const base =
      o.heading === undefined ? r() * Math.PI * 2 : o.heading + (r() < 0.5 ? 0 : Math.PI);
    const spread = o.spread ?? 0.5;
    let ang = o.heading === undefined ? base : base + (r() - 0.5) * 2 * spread;
    const strength = 0.6 + r() * 0.8;
    const len = length[0] + r() * (length[1] - length[0]);
    for (let t = 0; t < len; t++) {
      ang += (r() - 0.5) * turn;
      if (o.heading !== undefined) ang = Math.max(base - spread, Math.min(base + spread, ang));
      x += Math.cos(ang);
      y += Math.sin(ang);
      const k = strength * Math.sqrt(Math.sin(Math.PI * Math.min(1, (t + 0.5) / len)));
      const cx = Math.floor(((x % w) + w) % w);
      const cy = Math.floor(((y % h) + h) % h);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const depth =
            (dx === 0 && dy === 0 ? centre : dx === 0 || dy === 0 ? side : side * 0.5) * k;
          if (depth <= 0) continue;
          const i = ((cy + dy + h) % h) * w + ((cx + dx + w) % w);
          if (depth > dark[i]!) dark[i] = depth;
        }
      }
    }
  }
  for (let i = 0; i < w * h; i++) {
    const f = 1 - Math.min(0.9, dark[i]!);
    d[i * 4] = d[i * 4]! * f;
    d[i * 4 + 1] = d[i * 4 + 1]! * f;
    d[i * 4 + 2] = d[i * 4 + 2]! * f;
  }
  g.putImageData(img, 0, 0);
}

/**
 * MM6's sheet stone, third cut (critics, round 11): plates from two Worley scales (fourteen
 * and thirty pixels) chosen by a slow mask, so plate sizes vary widely, each offset and
 * sloped; their boundaries never closed: only stretches where a twelve-pixel noise runs high
 * are stroked, each stretch light or dark and never both; independent light streaks of eight
 * to twenty pixels and light smudges on top.
 */
export function stoneField(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  o: {
    offset: number;
    slope: number;
    light: number;
    dark: number;
    streaks: number;
    smudges: number;
    /** Where along the cells' edges the seams run: over this, on a noise of -1 to 1. */
    seams?: number;
    /** Pixels the plates' lookup wanders either way, so their seams are not straight. */
    warp?: number;
  },
): void {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const warp = o.warp ?? 0;
  const wx = warp ? valueNoise(w, h, 18, seed + 7) : null;
  const wy = warp ? valueNoise(w, h, 18, seed + 8) : null;
  const worley = (pitch: number, s: number): { edge: Uint8Array; lift: Float32Array } => {
    const rr = die(s);
    const nx = Math.max(1, Math.round(w / pitch));
    const ny = Math.max(1, Math.round(h / pitch));
    const pts: number[][] = [];
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = rr() * Math.PI * 2;
        pts.push([
          ((i + 0.5 + (rr() - 0.5) * 1.2) * w) / nx,
          ((j + 0.5 + (rr() - 0.5) * 1.2) * h) / ny,
          (rr() - 0.5) * 2 * o.offset,
          Math.cos(a) * o.slope,
          Math.sin(a) * o.slope,
        ]);
      }
    }
    const edge = new Uint8Array(w * h);
    const lift = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let d1 = Infinity;
        let d2 = Infinity;
        let best = 0;
        let bx = 0;
        let by = 0;
        const qx = wx ? x + 2 * warp * wx[y * w + x]! : x;
        const qy = wy ? y + 2 * warp * wy[y * w + x]! : y;
        for (let i = 0; i < pts.length; i++) {
          let dx = qx - pts[i]![0]!;
          let dy = qy - pts[i]![1]!;
          if (dx > w / 2) dx -= w;
          if (dx < -w / 2) dx += w;
          if (dy > h / 2) dy -= h;
          if (dy < -h / 2) dy += h;
          const dd = dx * dx + dy * dy;
          if (dd < d1) {
            d2 = d1;
            d1 = dd;
            best = i;
            bx = dx;
            by = dy;
          } else if (dd < d2) d2 = dd;
        }
        const p = pts[best]!;
        const k = y * w + x;
        lift[k] = p[2]! + (bx * p[3]! + by * p[4]!) / pitch;
        if (Math.sqrt(d2) - Math.sqrt(d1) < 1.2) edge[k] = 1;
      }
    }
    return { edge, lift };
  };
  const small = worley(14, seed + 1);
  const large = worley(30, seed + 2);
  const mask = valueNoise(w, h, 60, seed + 3);
  const run = valueNoise(w, h, 12, seed + 4);
  const tone = valueNoise(w, h, 12, seed + 5);
  for (let i = 0; i < w * h; i++) {
    const W = mask[i]! > 0 ? small : large;
    let dr = W.lift[i]!;
    let dg = dr;
    let db = dr;
    if (W.edge[i] && run[i]! > (o.seams ?? 0.05)) {
      if (tone[i]! > -0.05) {
        dr += o.light + 6;
        dg += o.light + 2;
        db += o.light;
      } else {
        dr -= o.dark;
        dg -= o.dark;
        db -= o.dark - 3;
      }
    }
    d[i * 4] = Math.max(0, Math.min(255, d[i * 4]! + dr));
    d[i * 4 + 1] = Math.max(0, Math.min(255, d[i * 4 + 1]! + dg));
    d[i * 4 + 2] = Math.max(0, Math.min(255, d[i * 4 + 2]! + db));
  }
  const r = die(seed + 6);
  const lighten = (x: number, y: number, by: number): void => {
    const i = (((y % h) + h) % h) * w + (((x % w) + w) % w);
    d[i * 4] = Math.min(255, d[i * 4]! + by);
    d[i * 4 + 1] = Math.min(255, d[i * 4 + 1]! + by);
    d[i * 4 + 2] = Math.min(255, d[i * 4 + 2]! + by);
  };
  for (let s = 0; s < o.streaks; s++) {
    let x = r() * w;
    let y = r() * h;
    let ang = r() * Math.PI * 2;
    const len = 8 + r() * 12;
    for (let t = 0; t < len; t++) {
      ang += (r() - 0.5) * 0.6;
      x += Math.cos(ang);
      y += Math.sin(ang);
      lighten(Math.floor(x), Math.floor(y), 14);
    }
  }
  for (let s = 0; s < o.smudges; s++) {
    const cx = r() * w;
    const cy = r() * h;
    const rx = 1.5 + r() * 2;
    const ry = 1.2 + r() * 1.6;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) lighten(x, y, 22);
      }
    }
  }
  g.putImageData(img, 0, 0);
}

/**
 * Rose-marble veins as MM6's rest screen (critics, rounds 11 and 13): long, nearly straight
 * pale walks two pixels wide whose lift follows a one-dimensional noise along each, so most
 * of a vein is a soft pale line and its cores lighter; then dark veins, most hugging a pale
 * vein a pixel or two to its lower right, the rest wandering on their own.
 */
export function roseVeins(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  o: {
    pale: number;
    dark: number;
    paleTint: Rgb;
    darkColor: Rgb;
    /** The dark veins' strength, least to most. */
    darkAlpha?: [number, number];
  },
): void {
  const r = die(seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const at = (x: number, y: number): number =>
    ((((Math.floor(y) % h) + h) % h) * w + (((Math.floor(x) % w) + w) % w)) * 4;
  // The pale veins (screens critic, rounds 13 to 15: MM6's run straight with kinks, neither
  // straws nor the S-curves a flow field drew): 40 to 140 steps, each straight for 12 to 40
  // then turning 0.2 to 0.6 and pulled half way back to the slab's heading, a branch now and
  // then; two pixels wide with a half-lit pixel each side, never more than 70 over the
  // marble's mean.
  const mean = [0, 1, 2].map((k) => {
    let sum = 0;
    for (let i = k; i < d.length; i += 4) sum += d[i]!;
    return sum / (w * h);
  });
  const along = r() * Math.PI;
  // An angle folded into a half turn: a vein runs both ways along the flow.
  const fold = (a: number): number =>
    ((((a + Math.PI / 2) % Math.PI) + Math.PI) % Math.PI) - Math.PI / 2;
  const paths: [number, number][][] = [];
  const walk = (x0: number, y0: number, a0: number, len: number, v: number, branch: boolean) => {
    let x = x0;
    let y = y0;
    let ang = a0;
    let branched = branch;
    const n = noise1(len, 12, seed * 7 + v);
    const pts: [number, number][] = [];
    const seen = new Set<number>();
    const lift = (px0: number, py0: number, amount: number): void => {
      const i = at(px0, py0);
      if (seen.has(i)) return;
      seen.add(i);
      for (let k = 0; k < 3; k++)
        d[i + k] = Math.min(
          Math.max(d[i + k]!, mean[k]! + 85 * o.paleTint[k]!),
          d[i + k]! + amount * o.paleTint[k]!,
        );
    };
    let straight = 12 + r() * 28;
    for (let t = 0; t < len; t++) {
      if (--straight <= 0) {
        ang += (r() < 0.5 ? -1 : 1) * (0.2 + r() * 0.4);
        ang += 0.5 * fold(along - ang);
        straight = 12 + r() * 28;
      }
      ang += (r() - 0.5) * 0.012;
      x += Math.cos(ang);
      y += Math.sin(ang);
      pts.push([x, y]);
      const a = Math.max(0, Math.min(1, 0.45 + n[t]! * 1.6));
      const core = a < 0.62 ? 0 : Math.min(1, (a - 0.62) / 0.38);
      // Stronger (screens critic, round 16: pale over the mean plus 40 on 0.3 to 0.6% of the
      // stone, MM6's 0.9 to 2.4%).
      const amount = 14 + 10 * a + 28 * core * core;
      // Across the vein: its two pixels and the half-lit one either side.
      const [ax, ay] = Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang)) ? [0, 1] : [1, 0];
      lift(x, y, amount);
      lift(x + ax, y + ay, amount);
      lift(x - ax, y - ay, amount / 2);
      lift(x + 2 * ax, y + 2 * ay, amount / 2);
      if (!branched && t > 20 && r() < 1 / 90) {
        branched = true;
        const turn = (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.35);
        walk(x, y, ang + turn, Math.round((len - t) * (0.3 + r() * 0.3)), v + 1000, true);
      }
    }
    paths.push(pts);
  };
  for (let v = 0; v < o.pale; v++)
    walk(r() * w, r() * h, along + (r() - 0.5) * 0.6, Math.round(40 + r() * 100), v, false);
  const [a0, a1] = o.darkAlpha ?? [0.5, 0.85];
  for (let v = 0; v < o.dark; v++) {
    const alpha = a0 + r() * (a1 - a0);
    const wide = r() < 0.3;
    let run: [number, number][] = [];
    if (paths.length && r() < 0.6) {
      const p = paths[Math.floor(r() * paths.length)]!;
      const len = Math.min(p.length, 20 + Math.floor(r() * 20));
      const s = Math.floor(r() * Math.max(1, p.length - len));
      const ox = 1 + (r() < 0.5 ? 1 : 0);
      const oy = 1 + (r() < 0.5 ? 1 : 0);
      run = p.slice(s, s + len).map(([x, y]) => [x + ox, y + oy] as [number, number]);
    } else {
      let x = r() * w;
      let y = r() * h;
      let ang = r() * Math.PI * 2;
      const len = 20 + r() * 20;
      for (let t = 0; t < len; t++) {
        ang += (r() - 0.5) * 0.25;
        x += Math.cos(ang);
        y += Math.sin(ang);
        run.push([x, y]);
      }
    }
    for (const [x, y] of run) {
      for (const [px0, py0] of wide ? [[x, y] as const, [x, y + 1] as const] : [[x, y] as const]) {
        const i = at(px0, py0);
        d[i] = d[i]! + (o.darkColor[0] - d[i]!) * alpha;
        d[i + 1] = d[i + 1]! + (o.darkColor[1] - d[i + 1]!) * alpha;
        d[i + 2] = d[i + 2]! + (o.darkColor[2] - d[i + 2]!) * alpha;
      }
    }
  }
  g.putImageData(img, 0, 0);
}
