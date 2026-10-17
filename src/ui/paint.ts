/**
 * The paint shop (DESIGN.md 16.10): every surface of the shell painted as pixel art at startup
 * on the game's pixel grid, the way a 1998 artist painted MM6's marble, wood and gold, and
 * shown with `image-rendering: pixelated`. Nothing here is noise handed to a filter: each
 * texture is a base coat, dabs of a wide brush, veins or grain drawn stroke by stroke, then
 * the whole posterised into a short ramp of tones, as an 8-bit palette did. The strokes'
 * jitter comes from a seeded die, so every build paints the same picture.
 */
import { PX } from './pixel-text';

type Rgb = [number, number, number];
interface Tone {
  cool: Rgb;
  warm: Rgb;
}

function die(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('no 2d context');
  return [c, g];
}

/** A soft dab of a wide brush, wrapped across the tile's seam. */
function dab(
  g: CanvasRenderingContext2D,
  w: number,
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
    g.save();
    g.translate(x + dx, y);
    g.rotate(rot);
    g.scale(rx, ry);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, 1, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

/** A wandering line, wrapped across the seam. */
function stroke(
  g: CanvasRenderingContext2D,
  w: number,
  points: [number, number][],
  color: string,
  width: number,
  ox = 0,
  oy = 0,
): void {
  for (const dx of [-w, 0, w]) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.beginPath();
    points.forEach(([x, y], i) => {
      if (i) g.lineTo(x + dx + ox, y + oy);
      else g.moveTo(x + dx + ox, y + oy);
    });
    g.stroke();
  }
}

/** Map a grey painting into a ramp of tones, warm or cool by a slow tint field. */
function posterise(
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

interface MarbleOptions {
  seed: number;
  dabs: number;
  dabTone: number;
  veins: number;
  veinDark: string;
  veinPale: string;
  ramp: Tone[];
}

/** Marble: a grey base, cloudy dabs, veins with a pale edge, posterised warm and cool. */
function paintMarble(w: number, h: number, o: MarbleOptions): HTMLCanvasElement {
  const r = die(o.seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < o.dabs; i++) {
    dab(
      g,
      w,
      r() * w,
      r() * h,
      12 + r() * 50,
      6 + r() * 26,
      r() * Math.PI,
      128 + (r() - 0.5) * 2 * o.dabTone,
      0.55,
    );
  }
  for (let v = 0; v < o.veins; v++) {
    let x = r() * w;
    let y = r() * h;
    let ang = (r() - 0.5) * 1.2;
    const pts: [number, number][] = [];
    const len = 60 + r() * 140;
    for (let s = 0; s < len; s += 3) {
      ang += (r() - 0.5) * 0.5;
      x += Math.cos(ang) * 3;
      y += Math.sin(ang) * 3;
      pts.push([x, y]);
    }
    stroke(g, w, pts, o.veinPale, 1, 1, 1);
    stroke(g, w, pts, o.veinDark, r() < 0.4 ? 2 : 1);
  }
  // The tint field: a few broad patches, warm or cool.
  const patches: [number, number, number, number][] = [];
  for (let i = 0; i < 14; i++) patches.push([r() * w, r() * h, 40 + r() * 80, r() < 0.5 ? 0 : 1]);
  const tint = (x: number, y: number): number => {
    let acc = 0.5;
    for (const [px, py, rad, warm] of patches) {
      const dx = Math.min(Math.abs(x - px), w - Math.abs(x - px));
      const d = Math.hypot(dx, y - py);
      if (d < rad) acc += (warm ? 0.5 : -0.5) * (1 - d / rad) * 0.8;
    }
    return Math.max(0, Math.min(1, acc));
  };
  posterise(g, w, h, o.ramp, tint);
  return c;
}

/** Oak planks: a brown coat, grain lines drawn one by one, seams, a knot or two. */
function paintWood(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  const plank = 28;
  for (let y0 = 0; y0 < h; y0 += plank) {
    // Each plank its own shade.
    const shade = 118 + (r() - 0.5) * 36;
    g.fillStyle = `rgb(${shade},${shade},${shade})`;
    g.fillRect(0, y0, w, plank);
    const lines = 7 + Math.floor(r() * 4);
    for (let i = 0; i < lines; i++) {
      const yb = y0 + 2 + r() * (plank - 4);
      const amp = 0.6 + r() * 1.6;
      const period = 18 + r() * 30;
      const phase = r() * 10;
      const tone = shade + (r() < 0.5 ? -22 - r() * 18 : 16 + r() * 14);
      const pts: [number, number][] = [];
      for (let x = 0; x <= w; x += 2) {
        pts.push([x, yb + amp * Math.sin(x / period + phase) + 0.5 * Math.sin(x / 6 + phase * 3)]);
      }
      stroke(g, w, pts, `rgb(${tone},${tone},${tone})`, 1);
    }
    // A knot on some planks: rings round a dark eye.
    if (r() < 0.45) {
      const kx = r() * w;
      const ky = y0 + plank * (0.35 + r() * 0.3);
      for (let k = 4; k >= 0; k--) {
        const tone = shade - 30 + k * 9;
        g.strokeStyle = `rgb(${tone},${tone},${tone})`;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(kx, ky, 3 + k * 2.2, 1.6 + k * 1.2, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    // The seam: a dark line under the plank and a lit edge on the next.
    g.fillStyle = 'rgb(48,48,48)';
    g.fillRect(0, y0 + plank - 1, w, 1);
    g.fillStyle = 'rgb(170,170,170)';
    g.fillRect(0, y0 + plank, w, 1);
  }
  posterise(
    g,
    w,
    h,
    [
      { cool: [34, 18, 8], warm: [34, 18, 8] },
      { cool: [58, 32, 14], warm: [58, 32, 14] },
      { cool: [82, 46, 20], warm: [82, 46, 20] },
      { cool: [104, 62, 28], warm: [104, 62, 28] },
      { cool: [126, 80, 38], warm: [126, 80, 38] },
      { cool: [150, 102, 52], warm: [150, 102, 52] },
      { cool: [176, 128, 70], warm: [176, 128, 70] },
    ],
    null,
    30,
    200,
  );
  return c;
}

/** Hide: a dark coat, a mottle of small dabs, scuffs of a lighter brush. */
function paintLeather(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) {
    dab(
      g,
      w,
      r() * w,
      r() * h,
      2 + r() * 9,
      2 + r() * 7,
      r() * Math.PI,
      128 + (r() - 0.5) * 90,
      0.5,
    );
  }
  for (let i = 0; i < 40; i++) {
    const x = r() * w;
    const y = r() * h;
    const a = (r() - 0.5) * 1.4;
    const len = 4 + r() * 14;
    stroke(
      g,
      w,
      [
        [x, y],
        [x + Math.cos(a) * len, y + Math.sin(a) * len],
      ],
      'rgb(175,175,175)',
      1,
    );
  }
  posterise(
    g,
    w,
    h,
    [
      { cool: [30, 16, 8], warm: [30, 16, 8] },
      { cool: [46, 26, 12], warm: [46, 26, 12] },
      { cool: [62, 36, 16], warm: [62, 36, 16] },
      { cool: [78, 46, 22], warm: [78, 46, 22] },
      { cool: [96, 58, 28], warm: [96, 58, 28] },
    ],
    null,
    50,
    205,
  );
  return c;
}

/** Parchment: cream with the fibres of the sheet showing, barely. */
function paintParchment(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    dab(
      g,
      w,
      r() * w,
      r() * h,
      20 + r() * 60,
      10 + r() * 30,
      r() * Math.PI,
      128 + (r() - 0.5) * 40,
      0.5,
    );
  }
  for (let i = 0; i < 90; i++) {
    const x = r() * w;
    const y = r() * h;
    const len = 6 + r() * 30;
    const a = (r() - 0.5) * 0.5;
    stroke(
      g,
      w,
      [
        [x, y],
        [x + Math.cos(a) * len, y + Math.sin(a) * len],
      ],
      `rgb(${r() < 0.5 ? 108 : 150},${r() < 0.5 ? 108 : 150},${r() < 0.5 ? 108 : 150})`,
      1,
    );
  }
  posterise(
    g,
    w,
    h,
    [
      { cool: [182, 160, 120], warm: [182, 160, 120] },
      { cool: [204, 184, 142], warm: [204, 184, 142] },
      { cool: [222, 204, 164], warm: [222, 204, 164] },
      { cool: [236, 222, 186], warm: [236, 222, 186] },
      { cool: [246, 236, 206], warm: [246, 236, 206] },
    ],
    null,
    70,
    190,
  );
  return c;
}

/** MM6's HUD marble: cream to rose, grey-brown veins. */
const MARBLE: Tone[] = [
  { cool: [104, 92, 96], warm: [120, 96, 92] },
  { cool: [150, 138, 140], warm: [168, 140, 132] },
  { cool: [188, 178, 178], warm: [204, 180, 168] },
  { cool: [212, 204, 202], warm: [226, 206, 192] },
  { cool: [228, 222, 220], warm: [238, 224, 210] },
  { cool: [240, 236, 234], warm: [246, 236, 224] },
];
/** The sheet's stone: grey-green, darker. */
const STONE: Tone[] = [
  { cool: [44, 48, 46], warm: [52, 50, 44] },
  { cool: [66, 72, 68], warm: [76, 72, 64] },
  { cool: [88, 94, 88], warm: [98, 92, 82] },
  { cool: [108, 114, 106], warm: [118, 112, 100] },
  { cool: [126, 132, 124], warm: [136, 130, 118] },
  { cool: [146, 150, 142], warm: [154, 146, 134] },
];

export interface Surfaces {
  marble: HTMLCanvasElement;
  stone: HTMLCanvasElement;
  wood: HTMLCanvasElement;
  leather: HTMLCanvasElement;
  parchment: HTMLCanvasElement;
}

let surfaces: Surfaces | null = null;

/** Paint the surfaces once and hand them to CSS as `--stone`, `--stone-dark`, `--wood`... */
export function installPaint(): Surfaces {
  if (surfaces) return surfaces;
  surfaces = {
    marble: paintMarble(320, 160, {
      seed: 7,
      dabs: 110,
      dabTone: 70,
      veins: 8,
      veinDark: 'rgba(60,50,52,0.9)',
      veinPale: 'rgba(235,228,224,0.8)',
      ramp: MARBLE,
    }),
    stone: paintMarble(320, 160, {
      seed: 21,
      dabs: 170,
      dabTone: 60,
      veins: 6,
      veinDark: 'rgba(30,34,30,0.9)',
      veinPale: 'rgba(190,196,186,0.6)',
      ramp: STONE,
    }),
    wood: paintWood(256, 168, 11),
    leather: paintLeather(192, 192, 5),
    parchment: paintParchment(256, 256, 3),
  };
  const root = document.documentElement.style;
  const set = (name: string, c: HTMLCanvasElement): void => {
    root.setProperty(name, `url("${c.toDataURL('image/png')}")`);
    root.setProperty(`${name}-size`, `${c.width * PX}px ${c.height * PX}px`);
  };
  set('--stone', surfaces.marble);
  set('--stone-dark', surfaces.stone);
  set('--wood', surfaces.wood);
  set('--leather', surfaces.leather);
  set('--parchment', surfaces.parchment);
  root.setProperty('--px', `${PX}px`);
  return surfaces;
}

const GOLD_UP = ['#1a1008', '#7a5416', '#a07428', '#c89a3a', '#e0b850', '#f4d878', '#fff0b0'];
const GOLD_DOWN = ['#1a1008', '#4a3010', '#6a4812', '#8a6420', '#a87c28', '#c09438', '#d0a848'];

/**
 * A gold oval button of `w` by `h` UI pixels: bands of gold light above and dark below, a
 * highlight crescent at the top left, a darker recess for the label, a black rim. Pressed,
 * the bands turn over and the gold goes dull.
 */
export function paintButton(w: number, h: number, pressed: boolean): HTMLCanvasElement {
  const golds = pressed ? GOLD_DOWN : GOLD_UP;
  const [c, g] = canvas(Math.max(6, w), Math.max(6, h));
  const oval = (inset: number, tone: string, dx = 0, dy = 0): void => {
    g.fillStyle = tone;
    g.beginPath();
    g.ellipse(w / 2 + dx, h / 2 + dy, w / 2 - inset, h / 2 - inset, 0, 0, Math.PI * 2);
    g.fill();
  };
  oval(0, golds[0]!);
  g.save();
  g.beginPath();
  g.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
  g.clip();
  for (let y = 1; y < h - 1; y++) {
    const t = pressed ? 1 - (y - 1) / (h - 2) : (y - 1) / (h - 2);
    const k = Math.min(golds.length - 2, 1 + Math.floor((1 - t) * (golds.length - 2)));
    g.fillStyle = golds[k]!;
    g.fillRect(0, y, w, 1);
  }
  g.restore();
  g.save();
  g.beginPath();
  g.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2);
  g.clip();
  oval(4, golds[golds.length - 1]!, -2, -3);
  oval(4, golds[pressed ? 2 : 4]!, -1, -1);
  g.restore();
  oval(6, pressed ? '#4a3410' : '#7a5416', 0, 1);
  oval(6, pressed ? '#5a4014' : '#a07c2c');
  return c;
}

const buttonCache = new Map<string, string>();

function buttonUrl(w: number, h: number, pressed: boolean): string {
  const k = `${w}x${h}${pressed ? 'd' : 'u'}`;
  let url = buttonCache.get(k);
  if (!url) {
    url = `url("${paintButton(w, h, pressed).toDataURL('image/png')}")`;
    buttonCache.set(k, url);
  }
  return url;
}

/** Give a button its painted faces for its current size. */
function dress(b: HTMLElement): void {
  const w = Math.round(b.offsetWidth / PX);
  const h = Math.round(b.offsetHeight / PX);
  if (w < 6 || h < 6) return;
  b.style.setProperty('--btn-up', buttonUrl(w, h, false));
  b.style.setProperty('--btn-down', buttonUrl(w, h, true));
}

/** Paint every `.ui-btn` under `root` as it appears and whenever it changes size. */
export function installPaintedButtons(root: HTMLElement): void {
  const sizes =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver((entries) => {
          for (const e of entries) dress(e.target as HTMLElement);
        })
      : null;
  const adopt = (el: Element): void => {
    const buttons = el.matches('.ui-btn') ? [el] : [...el.querySelectorAll('.ui-btn')];
    // The shelf's spines are leather, not gold.
    for (const b of buttons) {
      if (b.classList.contains('ui-shelf-btn')) continue;
      dress(b as HTMLElement);
      sizes?.observe(b);
    }
  };
  adopt(root);
  new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) if (n.nodeType === Node.ELEMENT_NODE) adopt(n as Element);
    }
  }).observe(root, { childList: true, subtree: true });
}
