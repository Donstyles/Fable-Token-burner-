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
  const n = tones.length;
  const hex = (t: Tone): string => `rgb(${t.warm.map(Math.round).join(',')})`;
  const base = o.base ?? Math.floor(n / 2);
  g.fillStyle = hex(tones[base]!);
  g.fillRect(0, 0, w, h);
  const clods = o.clods ?? 40;
  const clodSize = o.clodSize ?? 8;
  for (let i = 0; i < clods; i++) {
    const step = (r() < 0.5 ? -1 : 1) * (r() < 0.75 ? 1 : 2);
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
  const marks = o.marks ?? 2500;
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
    const streak = r() < 0.72;
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
  // The tone runs down each mass from lit at its top to shaded at its underside, by where
  // the pixel sits between the clear sky above and below it: no rim, no outline (critics,
  // round 6), a soft gradient the palette steps on its own.
  const reach = Math.max(8, Math.round(h / 12));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const dens = density[i]!;
      let tone = 0.5;
      if (dens >= 0.5) {
        let up = reach;
        let down = reach;
        for (let k = 1; k <= reach; k++) {
          if (up === reach && at(x, y - k) < 0.5) up = k;
          if (down === reach && at(x, y + k) < 0.5) down = k;
        }
        tone = down / (up + down);
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
