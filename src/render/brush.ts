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

/** A field of specks and blobs: grass, dirt, sand, snow, rubble, by its ramp and counts. */
export function speckle(
  w: number,
  h: number,
  seed: number,
  tones: Tone[],
  o: { fine?: number; fineTone?: number; blobs?: number; blobTone?: number; blobSize?: number },
): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  const blobs = o.blobs ?? 60;
  const blobTone = o.blobTone ?? 24;
  const blobSize = o.blobSize ?? 10;
  for (let i = 0; i < blobs; i++) {
    const t = 128 + (r() - 0.5) * 2 * blobTone;
    const s = blobSize * (0.6 + r() * 0.8);
    dab(g, w, h, r() * w, r() * h, s, s * (0.5 + r() * 0.6), r() * Math.PI, t, 0.5);
  }
  const fine = o.fine ?? 3000;
  const fineTone = o.fineTone ?? 60;
  for (let i = 0; i < fine; i++) {
    const t = 128 + (r() - 0.5) * 2 * fineTone;
    const s = 0.7 + r() * 0.9;
    dab(g, w, h, r() * w, r() * h, s, s, 0, t, 0.6);
  }
  posterise(g, w, h, tones, null, 70, 190);
  return c;
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

/** Soft smudges across a surface: wide, faint, wandering strokes, light or dark, wrapped. */
export function smudge(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  count: number,
  color: string,
  alpha: number,
  width: [number, number],
  length: [number, number],
  angle = -0.7,
): void {
  const r = die(seed);
  for (let v = 0; v < count; v++) {
    let x = r() * w;
    let y = r() * h;
    let ang = angle + (r() - 0.5) * 0.6;
    const pts: [number, number][] = [];
    const len = length[0] + r() * (length[1] - length[0]);
    for (let t = 0; t < len; t += 3) {
      ang += (r() - 0.5) * 0.12;
      x += Math.cos(ang) * 3;
      y += Math.sin(ang) * 3;
      pts.push([x, y]);
    }
    const wd = width[0] + r() * (width[1] - width[0]);
    const rgba = (a: number): string =>
      color.replace(')', `,${a.toFixed(3)})`).replace('rgb(', 'rgba(');
    stroke(g, w, h, pts, rgba(alpha * 0.5), wd * 1.8);
    stroke(g, w, h, pts.slice(1, -1), rgba(alpha), wd);
  }
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
 * dotted in by hand. No soft brush: every texel is one of the ramp's tones.
 */
export function grain(
  w: number,
  h: number,
  seed: number,
  tones: Tone[],
  o: { marks?: number; clods?: number; clodSize?: number; base?: number },
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
    const k = Math.min(n - 1, Math.floor(r() * n));
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
  // Sixty strokes round the whole horizon, whatever the strip's size: the brush scales with
  // the strip, so the cover stays the same.
  const masses = 60;
  for (let m = 0; m < masses; m++) {
    const cx = r() * w;
    const v = 0.1 + r() * 0.75;
    const cy = h - v * h;
    const streak = r() < 0.5;
    const n = streak ? 5 + Math.floor(r() * 5) : 6 + Math.floor(r() * 6);
    const spread = (streak ? 80 + r() * 140 : 20 + r() * 30) * (w / 1024);
    const slope = (r() - 0.5) * 0.12;
    for (let k = 0; k < n; k++) {
      const t = (k / Math.max(1, n - 1) - 0.5) * spread;
      const x = cx + t + (r() - 0.5) * 10;
      const y = cy + t * slope + (r() - 0.5) * (streak ? 4 : 12) * (h / 192);
      const rx = (streak ? 22 + r() * 40 : 7 + r() * 12) * (w / 1024);
      const ry = (streak ? 2.5 + r() * 3 : 5 + r() * 8) * (h / 192);
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
  const at = (x: number, y: number): number => {
    const xx = ((x % w) + w) % w;
    if (y < 0 || y >= h) return 0;
    return density[y * w + xx]!;
  };
  // The tone: lit along each mass's top, shading down into it over `reach`, with a mottle
  // of value noise through it (critics, round 9: one top-light gradient over the mass plus
  // a mottle, not a vertical ramp per column).
  const reach = Math.max(8, Math.round(h / 10));
  // Three to four texels, stretched two to one along the sky (critics, round 10: MM6's
  // cloud runs are twice as long across as up).
  const hw = Math.max(1, Math.floor(w / 2));
  const mottleHalf = valueNoise(hw, h, 3, seed + 77);
  const mottle = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) mottle[y * w + x] = mottleHalf[y * hw + Math.min(hw - 1, x >> 1)]!;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const dens = density[i]!;
      let tone = 0.5;
      if (dens >= 0.3) {
        let up = reach;
        for (let k = 1; k <= reach; k++) {
          if (at(x, y - k) < 0.3) {
            up = k;
            break;
          }
        }
        tone = Math.max(0, Math.min(1, 1 - (0.8 * up) / reach + mottle[i]! * 0.7));
      }
      d[i * 4] = Math.round(dens * 255);
      d[i * 4 + 1] = Math.round(tone * 255);
      d[i * 4 + 2] = 0;
      d[i * 4 + 3] = 255;
    }
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

/**
 * Veins as the isolines of a noise field: wherever the field crosses one of `levels`, a
 * one-pixel line of `color`, closed loops that wander and tile, two to four across a hand's
 * width at the period MM6's marble shows (critics, round 8).
 */
export function veins(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  period: number,
  levels: number[],
  color: string,
): void {
  const n = valueNoise(w, h, period, seed);
  const n2 = valueNoise(w, h, Math.max(3, period * 0.31), seed + 5);
  const f = (x: number, y: number): number => {
    const i = (((y % h) + h) % h) * w + (((x % w) + w) % w);
    return n[i]! + 0.3 * n2[i]!;
  };
  const band = (v: number): number => {
    let k = 0;
    for (const l of levels) if (v > l) k++;
    return k;
  };
  g.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = band(f(x, y));
      if (k !== band(f(x + 1, y)) || k !== band(f(x, y + 1))) g.fillRect(x, y, 1, 1);
    }
  }
}

/**
 * Hairline cracks: one-pixel random walks of twenty to sixty pixels, a pixel at a time so no
 * edge is anti-aliased, wrapped across the tile; MM6's stone fissures (critics, round 8).
 */
export function cracks(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  count: number,
  length: [number, number],
  color: string,
  wobble = 0.6,
  halo: string | null = null,
): void {
  const r = die(seed);
  for (let v = 0; v < count; v++) {
    let x = r() * w;
    let y = r() * h;
    let ang = r() * Math.PI * 2;
    const len = length[0] + r() * (length[1] - length[0]);
    const pts: [number, number][] = [];
    for (let t = 0; t < len; t++) {
      ang += (r() - 0.5) * wobble;
      x += Math.cos(ang);
      y += Math.sin(ang);
      pts.push([Math.floor(((x % w) + w) % w), Math.floor(((y % h) + h) % h)]);
    }
    // A vein (MM6's marble): a soft darker halo three pixels wide under the crisp core.
    if (halo) {
      g.fillStyle = halo;
      for (const [px0, py0] of pts) g.fillRect(px0 - 1, py0 - 1, 3, 3);
    }
    g.fillStyle = color;
    for (const [px0, py0] of pts) g.fillRect(px0, py0, 1, 1);
  }
}

/**
 * Crazed marble as MM6's rest screen (critics, round 8): the surface broken into cells, each
 * a shade lighter or darker, their boundaries crisp one-pixel pale cracks with a dark pixel
 * along one side; the cells from the nearest of `count` points on the torus of the tile.
 */
export function crazed(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  count: number,
  line: string,
  shade: string,
  tone: number,
): void {
  const r = die(seed);
  // Cells of uneven size (each point carries a weight) with boundaries bent by a noise
  // field, so the cracks curve and the slab reads as broken stone, not a honeycomb.
  const pts: [number, number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    pts.push([r() * w, r() * h, (r() - 0.5) * 2 * tone, r() * r() * 900]);
  }
  const bendX = valueNoise(w, h, 18, seed + 3);
  const bendY = valueNoise(w, h, 18, seed + 4);
  const cell = new Int16Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i0 = y * w + x;
      const sx = x + bendX[i0]! * 10;
      const sy = y + bendY[i0]! * 10;
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < pts.length; i++) {
        let dx = Math.abs(sx - pts[i]![0]);
        let dy = Math.abs(sy - pts[i]![1]);
        if (dx > w / 2) dx = w - dx;
        if (dy > h / 2) dy = h - dy;
        const dd = dx * dx * 0.85 + dy * dy * 1.2 - pts[i]![3];
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
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = at(x, y);
      if (k !== at(x + 1, y) || k !== at(x, y + 1)) {
        g.fillStyle = shade;
        g.fillRect((x + 1) % w, (y + 1) % h, 1, 1);
        g.fillStyle = line;
        g.fillRect(x, y, 1, 1);
      }
    }
  }
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
 * The tails of a painted surface (critics, round 9): where a slow noise field peaks the
 * stone lightens (lichen, worn patches), where it dips it darkens (pits), each about eight
 * percent of the pixels; `toward`, if given, blends the light tail toward a colour instead.
 */
export function tails(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  period: number,
  amp: number,
  toward: Rgb | null = null,
): void {
  const n = valueNoise(w, h, period, seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < w * h; i++) {
    const v = n[i]!;
    const o = i * 4;
    if (v > 0.2) {
      const k = Math.min(1, (v - 0.2) / 0.15);
      if (toward) {
        d[o] = d[o]! + (toward[0] - d[o]!) * 0.4 * k;
        d[o + 1] = d[o + 1]! + (toward[1] - d[o + 1]!) * 0.4 * k;
        d[o + 2] = d[o + 2]! + (toward[2] - d[o + 2]!) * 0.4 * k;
      } else {
        d[o] = Math.min(255, d[o]! + amp * k);
        d[o + 1] = Math.min(255, d[o + 1]! + amp * k);
        d[o + 2] = Math.min(255, d[o + 2]! + amp * k);
      }
    } else if (v < -0.2) {
      const k = Math.min(1, (-0.2 - v) / 0.15);
      d[o] = Math.max(0, d[o]! - amp * k);
      d[o + 1] = Math.max(0, d[o + 1]! - amp * k);
      d[o + 2] = Math.max(0, d[o + 2]! - amp * k);
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
      const width = 1 + Math.round(3 * wave * strength);
      if (alpha > 0.7) {
        g.fillStyle = `rgb(${shade[0]},${shade[1]},${shade[2]})`;
        g.fillRect((x + 1) % w, (y + 1) % h, 1, 1);
      }
      g.fillStyle = paleRgba(alpha);
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
 * Marble veins as MM6 smudged them (critics, round 9): random walks of two-pixel steps
 * turning up to thirty degrees, stamped as a three-pixel multiply, `centre` down the
 * middle and `side` either side, so a vein is twenty levels deep and soft-edged, never a
 * line.
 */
export function veinWalk(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  count: number,
  length: [number, number],
  centre = 0.95,
  side = 0.975,
): void {
  // One-pixel steps and no memory (critics, round 10): the stamps overlap along the walk,
  // so a vein is a continuous smudge, about twenty levels deep at the core, not a chain of
  // beads.
  const r = die(seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let v = 0; v < count; v++) {
    let x = r() * w;
    let y = r() * h;
    let ang = r() * Math.PI * 2;
    const len = length[0] + r() * (length[1] - length[0]);
    for (let t = 0; t < len; t++) {
      ang += (r() - 0.5) * 0.5;
      x += Math.cos(ang);
      y += Math.sin(ang);
      const cx = Math.floor(((x % w) + w) % w);
      const cy = Math.floor(((y % h) + h) % h);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const px0 = (cx + dx + w) % w;
          const py0 = (cy + dy + h) % h;
          const k = py0 * w + px0;
          const f = dx === 0 && dy === 0 ? centre : side;
          d[k * 4] = d[k * 4]! * f;
          d[k * 4 + 1] = d[k * 4 + 1]! * f;
          d[k * 4 + 2] = d[k * 4 + 2]! * f;
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
}

/**
 * Fractured plates, as MM6's sheet stone (critics, round 10): a Worley field of cells
 * eighteen to thirty-six pixels across on a jittered grid, each plate a random offset of
 * up to `offset` levels with a linear gradient of up to `slope` across it in its own
 * direction, a fissure `fissure` levels dark where two plates meet with a lit lip one
 * pixel toward the upper left.
 */
export function plates(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  pitch: number,
  offset: number,
  slope: number,
  fissure: number,
): void {
  const r = die(seed);
  const nx = Math.max(1, Math.round(w / pitch));
  const ny = Math.max(1, Math.round(h / pitch));
  const pts: [number, number, number, number, number][] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const ang = r() * Math.PI * 2;
      pts.push([
        ((i + 0.5 + (r() - 0.5) * 1.2) * w) / nx,
        ((j + 0.5 + (r() - 0.5) * 1.2) * h) / ny,
        (r() - 0.5) * 2 * offset,
        Math.cos(ang) * slope,
        Math.sin(ang) * slope,
      ]);
    }
  }
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const crack = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = 0;
      let d1 = Infinity;
      let d2 = Infinity;
      let bdx = 0;
      let bdy = 0;
      for (let i = 0; i < pts.length; i++) {
        let dx = x - pts[i]![0];
        let dy = y - pts[i]![1];
        if (dx > w / 2) dx -= w;
        if (dx < -w / 2) dx += w;
        if (dy > h / 2) dy -= h;
        if (dy < -h / 2) dy += h;
        const dd = dx * dx + dy * dy;
        if (dd < d1) {
          d2 = d1;
          d1 = dd;
          best = i;
          bdx = dx;
          bdy = dy;
        } else if (dd < d2) d2 = dd;
      }
      const p = pts[best]!;
      const lift = p[2] + (bdx * p[3] + bdy * p[4]) / pitch;
      const o = (y * w + x) * 4;
      d[o] = Math.max(0, Math.min(255, d[o]! + lift));
      d[o + 1] = Math.max(0, Math.min(255, d[o + 1]! + lift));
      d[o + 2] = Math.max(0, Math.min(255, d[o + 2]! + lift));
      if (Math.sqrt(d2) - Math.sqrt(d1) < 1.2) crack[y * w + x] = 1;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!crack[y * w + x]) continue;
      const o = (y * w + x) * 4;
      d[o] = Math.max(0, d[o]! - fissure);
      d[o + 1] = Math.max(0, d[o + 1]! - fissure);
      d[o + 2] = Math.max(0, d[o + 2]! - fissure);
      const lx = (x - 1 + w) % w;
      const ly = (y - 1 + h) % h;
      if (!crack[ly * w + lx]) {
        const lo = (ly * w + lx) * 4;
        d[lo] = Math.min(255, d[lo]! + fissure * 0.45);
        d[lo + 1] = Math.min(255, d[lo + 1]! + fissure * 0.45);
        d[lo + 2] = Math.min(255, d[lo + 2]! + fissure * 0.45);
      }
    }
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
      const a = alpha * (1 - (0.8 * t) / len);
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
): void {
  const r = die(seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.max(0, Math.min(255, d[i]! + (r() - 0.5) * 2 * amp));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + (r() - 0.5) * 2 * amp));
  }
  g.putImageData(img, 0, 0);
}
