/**
 * The rest screen's vista drawn (DESIGN.md 16.34; reference mm6-rest): the owner's mountains,
 * their four painted lights blended as the sun goes (`vista-model.ts`), over a live sky in the
 * world's colours: a gradient paling to the horizon, a warm glow round a low sun, the sun and
 * the moon in its phase crossing it behind the range, stars at night, and long streaks of cloud
 * drifting with the hours (racing while the party rests). Drawn on a 2D canvas at the box's
 * own pixels, on RGB565 as the painted panels are, a frame every tenth of a second, MM6's step.
 */
import { quantise565, valueNoise } from '../render/brush';
import { type Rgb, VISTA_TIMES, type VistaSky, vistaSky } from './vista-model';

interface VistaData {
  /** One strip's size; the atlas stacks the four times. */
  size: [number, number];
  /** The range's skyline in a strip: its highest row and its mean. */
  skyline: { top: number; mean: number };
}

const PICTURES = import.meta.glob('../../assets/vistas/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const DATA = import.meta.glob('../../assets/vistas/*.json', {
  import: 'default',
  eager: true,
}) as Record<string, VistaData>;

/** The vista the rest screen shows. */
export const VISTA_ID = 'mountains';
/** MM6's animation step, seconds. */
export const VISTA_STEP = 0.1;

const css = (c: Rgb, a = 1): string =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export class VistaPainter {
  private readonly g: CanvasRenderingContext2D;
  private readonly data: VistaData | null;
  private atlas: HTMLImageElement | null = null;
  /** The clouds' cover, white, as wide as two boxes so it wraps as it drifts. */
  private clouds: HTMLCanvasElement | null = null;
  private tint: HTMLCanvasElement | null = null;
  private cloudsFor = '';

  constructor(
    private readonly canvas: HTMLCanvasElement,
    id = VISTA_ID,
  ) {
    // Read back every frame for its RGB565 step.
    const g = canvas.getContext('2d', { willReadFrequently: true });
    if (!g) throw new Error('no 2d context');
    this.g = g;
    this.data = DATA[`../../assets/vistas/${id}.json`] ?? null;
    const url = PICTURES[`../../assets/vistas/${id}.png`];
    if (url) {
      const img = new Image();
      img.onload = () => {
        this.atlas = img;
      };
      img.src = url;
    }
  }

  /** Whether the land has loaded (the sky draws without it). */
  get ready(): boolean {
    return this.atlas !== null;
  }

  /** Draws the vista at a minute of the game clock, `seconds` of real time for what drifts. */
  draw(minutes: number, seconds: number): void {
    const { canvas, g } = this;
    const w = canvas.width;
    const h = canvas.height;
    const [vw, vh] = this.data?.size ?? [800, 96];
    // The strip covers the box, its middle kept.
    const s = Math.max(w / vw, h / vh);
    const ox = (w - vw * s) / 2;
    const oy = (h - vh * s) / 2;
    // The horizon a little under the range's mean skyline, so the sun sets behind the peaks.
    const horizon = oy + ((this.data?.skyline.mean ?? vh * 0.7) + 4) * s;
    const sky = vistaSky(minutes);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    const grad = g.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, css(sky.zenith));
    grad.addColorStop(0.6, css(mixRgb(sky.zenith, sky.horizon, 0.45)));
    grad.addColorStop(1, css(sky.horizon));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    if (sky.glow.strength > 0.01) {
      const gx = sky.glow.x * w;
      const glow = g.createRadialGradient(gx, horizon, 0, gx, horizon, w * 0.38);
      glow.addColorStop(0, css([255, 150, 92], 0.6 * sky.glow.strength));
      glow.addColorStop(1, css([255, 150, 92], 0));
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);
    }
    this.stars(sky, w, horizon, seconds);
    this.moon(sky, w, horizon);
    this.sun(sky, w, horizon);
    this.drift(sky, w, Math.ceil(horizon), minutes, seconds);

    // The land: its four painted lights, each laid over the last by its share.
    if (this.atlas) {
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      let total = 0;
      for (const time of ['night', 'sunrise', 'sunset', 'day'] as const) {
        const share = sky.weights[time];
        if (share <= 0.001) continue;
        total += share;
        g.globalAlpha = share / total;
        const row = VISTA_TIMES.indexOf(time);
        g.drawImage(this.atlas, 0, row * vh, vw, vh, ox, oy, vw * s, vh * s);
      }
      g.globalAlpha = 1;
    }
    quantise565(g, w, h);
  }

  /** Where a body stands in the box. */
  private place(body: { x: number; y: number }, w: number, horizon: number): [number, number] {
    return [Math.round(body.x * w), Math.round(horizon - body.y * (horizon - 4))];
  }

  /** Stars twinkling in the night, a pixel each, fainter and brighter. */
  private stars(sky: VistaSky, w: number, horizon: number, seconds: number): void {
    if (sky.stars <= 0.01) return;
    const { g } = this;
    const count = Math.round((w * horizon) / 260);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(hash(i * 3.1) * w);
      const y = Math.floor(hash(i * 7.7 + 1) * (horizon - 3));
      const tw = 0.6 + 0.4 * Math.sin(seconds * (1.3 + 3 * hash(i + 0.5)) + hash(i * 1.9) * 40);
      const a = sky.stars * tw * (0.3 + 0.7 * hash(i * 5.3 + 2));
      g.fillStyle = css([226, 228, 255], a);
      g.fillRect(x, y, 1, 1);
    }
  }

  /** The moon in its phase: lit from the right as it waxes, from the left as it wanes. */
  private moon(sky: VistaSky, w: number, horizon: number): void {
    const m = sky.moon;
    if (!m.visible) return;
    const { g } = this;
    const [cx, cy] = this.place(m, w, horizon);
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, 12);
    halo.addColorStop(0, css([210, 216, 240], 0.22 * m.brightness * sky.stars));
    halo.addColorStop(1, css([210, 216, 240], 0));
    g.fillStyle = halo;
    g.fillRect(cx - 12, cy - 12, 24, 24);
    const r = 3.6;
    const turn = Math.cos(2 * Math.PI * m.phase);
    g.fillStyle = css([240, 236, 214], m.brightness);
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const nx = dx / r;
        const ny = dy / r;
        if (nx * nx + ny * ny > 1) continue;
        const half = Math.sqrt(1 - ny * ny);
        const lit = m.phase < 0.5 ? nx > turn * half : nx < -turn * half;
        if (lit) g.fillRect(cx + dx, cy + dy, 1, 1);
      }
    }
  }

  /** The sun, orange near the horizon and pale high up, in a halo of its light. */
  private sun(sky: VistaSky, w: number, horizon: number): void {
    if (!sky.sun.visible) return;
    const { g } = this;
    const [cx, cy] = this.place(sky.sun, w, horizon);
    const high = Math.max(0, Math.min(1, sky.sun.y / 0.3));
    const col = mixRgb([255, 168, 88], [255, 248, 226], high);
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, 16);
    halo.addColorStop(0, css(col, 0.5));
    halo.addColorStop(1, css(col, 0));
    g.fillStyle = halo;
    g.fillRect(cx - 16, cy - 16, 32, 32);
    g.fillStyle = css(col);
    g.beginPath();
    g.arc(cx, cy, 4.2, 0, Math.PI * 2);
    g.fill();
  }

  /** Long streaks of cloud in the sky's own light, drifting east to west with the hours. */
  private drift(sky: VistaSky, w: number, horizon: number, minutes: number, seconds: number): void {
    const { g } = this;
    const cw = w * 2;
    const key = `${cw}x${horizon}`;
    if (this.cloudsFor !== key) {
      this.cloudsFor = key;
      this.clouds = cloudCover(cw, horizon);
      this.tint = document.createElement('canvas');
      this.tint.width = cw;
      this.tint.height = horizon;
    }
    const tint = this.tint!;
    // In memory as the box's own canvas is, so drawing one into the other reads nothing back.
    const t = tint.getContext('2d', { willReadFrequently: true })!;
    t.globalCompositeOperation = 'copy';
    t.drawImage(this.clouds!, 0, 0);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = css(sky.cloud);
    t.fillRect(0, 0, cw, horizon);
    const off = (((seconds * 1.5 + minutes * 0.12) % cw) + cw) % cw;
    g.globalAlpha = 0.85;
    g.drawImage(tint, -off, 0);
    g.drawImage(tint, cw - off, 0);
    g.globalAlpha = 1;
  }
}

/** The clouds' cover: streaks lying along the sky, thicker toward the horizon; it wraps. */
function cloudCover(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const img = g.createImageData(w, h);
  // Noise squeezed eight to one, so the streaks lie long across the sky.
  const nw = Math.max(8, Math.round(w / 8));
  const a = valueNoise(nw, h, 6, 61);
  const b = valueNoise(nw, h, 3, 67);
  for (let y = 0; y < h; y++) {
    const fall = 0.45 + 0.55 * (y / h);
    for (let x = 0; x < w; x++) {
      const fx = (x / w) * nw;
      const x0 = Math.floor(fx) % nw;
      const x1 = (x0 + 1) % nw;
      const f = fx - Math.floor(fx);
      const n = (k: Float32Array): number => k[y * nw + x0]! * (1 - f) + k[y * nw + x1]! * f;
      const v = n(a) + 0.5 * n(b);
      const cover = Math.max(0, Math.min(1, (v - 0.05) / 0.3)) * fall;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(cover * cover * 200);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
