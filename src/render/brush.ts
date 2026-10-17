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
