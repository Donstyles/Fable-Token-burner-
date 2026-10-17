/**
 * The paint shop (DESIGN.md 16.10, 16.12): every surface of the shell painted as pixel art at
 * startup on the game's pixel grid, the way a 1998 artist painted MM6's marble, wood and gold,
 * and shown with `image-rendering: pixelated`. Nothing here is noise handed to a filter: each
 * texture is a base coat, dabs of a wide brush, veins or grain drawn stroke by stroke, then
 * the whole posterised into a short ramp of tones, as an 8-bit palette did. The strokes'
 * jitter comes from a seeded die, so every build paints the same picture.
 *
 * One gold, one light. Every gold edge is drawn from the same seven-swatch ramp (`GOLD`) and
 * every bevel is lit from the top left: a light lip above and left, a dark one below and
 * right; a recess has them the other way about. The critics of 2026-10-17 read our earlier
 * CSS hairlines and gradients as "bordered boxes with a filter"; this is the answer.
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
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d');
  if (!g) throw new Error('no 2d context');
  return [c, g];
}

/** Put one pixel. */
function px(g: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  g.fillStyle = color;
  g.fillRect(x, y, 1, 1);
}

/** A soft dab of a wide brush, wrapped across the tile's seams. */
function dab(
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

/** A wandering line, wrapped across the seams. */
function stroke(
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

/** The one gold of the shell, darkest to lightest. */
export const GOLD = {
  line: '#2a1a06',
  dark: '#503808',
  shadow: '#7a5a18',
  body: '#b08a30',
  light: '#d8b858',
  highlight: '#f0d880',
  glint: '#fff8d0',
};
const GOLD_RAMP = [
  GOLD.dark,
  GOLD.shadow,
  GOLD.body,
  GOLD.light,
  GOLD.highlight,
  GOLD.glint,
] as const;

/** MM6's HUD marble: warm putty, cream patches, taupe and dark veins; eight tones. */
const MARBLE: Tone[] = [
  { cool: [96, 88, 82], warm: [102, 88, 78] },
  { cool: [118, 108, 102], warm: [126, 108, 98] },
  { cool: [140, 128, 122], warm: [150, 128, 118] },
  { cool: [160, 150, 144], warm: [170, 150, 140] },
  { cool: [178, 170, 164], warm: [188, 170, 160] },
  { cool: [196, 188, 182], warm: [206, 188, 178] },
  { cool: [212, 206, 198], warm: [222, 206, 194] },
  { cool: [226, 220, 212], warm: [236, 220, 206] },
];
/** The sheet's slate: grey-green, seven tones. */
const SLATE: Tone[] = [
  { cool: [56, 60, 54], warm: [60, 58, 52] },
  { cool: [68, 72, 66], warm: [72, 70, 62] },
  { cool: [80, 84, 78], warm: [84, 82, 74] },
  { cool: [92, 96, 90], warm: [96, 94, 86] },
  { cool: [104, 108, 102], warm: [108, 106, 98] },
  { cool: [116, 120, 112], warm: [120, 118, 108] },
  { cool: [128, 132, 124], warm: [132, 130, 120] },
];

/**
 * Marble: a grey base, mottling at the scale of a thumb over broader clouds, then veins one
 * pixel wide running diagonally and branching, each with a pale halo below and right, the
 * whole posterised warm and cool.
 */
function paintMarble(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 34; i++) {
    const tone = 128 + (r() - 0.5) * 44;
    dab(g, w, h, r() * w, r() * h, 22 + r() * 26, 12 + r() * 18, r() * Math.PI, tone, 0.5);
  }
  for (let i = 0; i < 260; i++) {
    const tone = 128 + (r() - 0.5) * 70;
    dab(g, w, h, r() * w, r() * h, 5 + r() * 12, 3 + r() * 8, r() * Math.PI, tone, 0.45);
  }
  const vein = (x: number, y: number, ang: number, len: number, dark: boolean): void => {
    const pts: [number, number][] = [];
    for (let s = 0; s < len; s += 2) {
      ang += (r() - 0.5) * 0.45;
      x += Math.cos(ang) * 2;
      y += Math.sin(ang) * 2;
      pts.push([x, y]);
      if (len > 30 && r() < 0.03) {
        vein(x, y, ang + (r() < 0.5 ? -0.75 : 0.75), len * (0.2 + r() * 0.3), dark);
      }
    }
    stroke(g, w, h, pts, 'rgba(238,232,226,0.75)', 1, 1, 1);
    stroke(g, w, h, pts, dark ? 'rgba(56,48,44,0.9)' : 'rgba(96,88,84,0.7)', 1);
  };
  for (let v = 0; v < 9; v++) {
    vein(r() * w, r() * h, -0.75 + (r() - 0.5) * 0.8, 70 + r() * 150, r() < 0.6);
  }
  // The tint field: broad patches, cream or rose.
  const patches: [number, number, number, number][] = [];
  for (let i = 0; i < 12; i++) patches.push([r() * w, r() * h, 40 + r() * 70, r() < 0.5 ? 0 : 1]);
  const tint = (x: number, y: number): number => {
    let acc = 0.5;
    for (const [pxx, pyy, rad, warm] of patches) {
      const dx = Math.min(Math.abs(x - pxx), w - Math.abs(x - pxx));
      const dy = Math.min(Math.abs(y - pyy), h - Math.abs(y - pyy));
      const d = Math.hypot(dx, dy);
      if (d < rad) acc += (warm ? 0.5 : -0.5) * (1 - d / rad) * 0.8;
    }
    return Math.max(0, Math.min(1, acc));
  };
  posterise(g, w, h, MARBLE, tint, 46, 212);
  return c;
}

/** Slate: fine grain of a pointed brush and two or three broad soft smudges on the diagonal. */
function paintSlate(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    const rot = -0.55 + (r() - 0.5) * 0.3;
    dab(g, w, h, r() * w, r() * h, 60 + r() * 50, 12 + r() * 10, rot, i < 3 ? 160 : 100, 0.55);
  }
  for (let i = 0; i < 3200; i++) {
    const tone = 128 + (r() - 0.5) * 100;
    dab(g, w, h, r() * w, r() * h, 0.8 + r() * 1.4, 0.8 + r() * 1.4, 0, tone, 0.6);
  }
  const tint = (x: number, y: number): number => 0.5 + 0.5 * Math.sin((x + y * 0.5) / 60);
  posterise(g, w, h, SLATE, tint, 62, 198);
  return c;
}

/** Oak planks: a brown coat, grain drawn line by line, staggered ends, nails, a knot or two. */
function paintWood(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  const plank = 28;
  const grey = (t: number): string => `rgb(${t},${t},${t})`;
  for (let y0 = 0; y0 < h; y0 += plank) {
    // Each plank its own shade.
    const shade = 118 + (r() - 0.5) * 40;
    g.fillStyle = grey(shade);
    g.fillRect(0, y0, w, plank);
    const lines = 7 + Math.floor(r() * 4);
    for (let i = 0; i < lines; i++) {
      const yb = y0 + 2 + r() * (plank - 4);
      const amp = 0.6 + r() * 2.2;
      const period = 18 + r() * 30;
      const phase = r() * 10;
      const tone = shade + (r() < 0.5 ? -22 - r() * 18 : 16 + r() * 14);
      const pts: [number, number][] = [];
      for (let x = 0; x <= w; x += 2) {
        pts.push([x, yb + amp * Math.sin(x / period + phase) + 0.5 * Math.sin(x / 6 + phase * 3)]);
      }
      stroke(g, w, 0, pts, grey(tone), 1);
    }
    // A knot on some planks: rings round a dark eye.
    if (r() < 0.45) {
      const kx = r() * w;
      const ky = y0 + plank * (0.35 + r() * 0.3);
      for (let k = 4; k >= 0; k--) {
        g.strokeStyle = grey(shade - 30 + k * 9);
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(kx, ky, 3 + k * 2.2, 1.6 + k * 1.2, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    // The plank's end: a dark seam with a lit edge beside it, and an iron nail each side.
    const ex = Math.floor(r() * w);
    g.fillStyle = grey(44);
    g.fillRect(ex, y0, 1, plank);
    g.fillStyle = grey(168);
    g.fillRect((ex + 1) % w, y0, 1, plank);
    for (const nx of [(ex - 5 + w) % w, (ex + 4) % w]) {
      const ny = y0 + Math.floor(plank / 2) - 1;
      g.fillStyle = grey(36);
      g.fillRect(nx, ny, 2, 2);
      g.fillStyle = grey(196);
      g.fillRect(nx, ny, 1, 1);
    }
    // The seam: a dark line under the plank and a lit edge on the next.
    g.fillStyle = grey(44);
    g.fillRect(0, y0 + plank - 1, w, 1);
    g.fillStyle = grey(172);
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
    const tone = 128 + (r() - 0.5) * 90;
    dab(g, w, h, r() * w, r() * h, 2 + r() * 9, 2 + r() * 7, r() * Math.PI, tone, 0.5);
  }
  for (let i = 0; i < 40; i++) {
    const x = r() * w;
    const y = r() * h;
    const a = (r() - 0.5) * 1.4;
    const len = 4 + r() * 14;
    stroke(
      g,
      w,
      h,
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

/** Parchment: warm cream with an even grain. */
function paintParchment(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    const tone = 128 + (r() - 0.5) * 30;
    dab(g, w, h, r() * w, r() * h, 20 + r() * 60, 10 + r() * 30, r() * Math.PI, tone, 0.5);
  }
  for (let i = 0; i < 2600; i++) {
    const tone = 128 + (r() - 0.5) * 56;
    dab(g, w, h, r() * w, r() * h, 0.8 + r() * 1.2, 0.8 + r() * 1.2, 0, tone, 0.5);
  }
  posterise(
    g,
    w,
    h,
    [
      { cool: [196, 176, 138], warm: [196, 176, 138] },
      { cool: [212, 194, 156], warm: [212, 194, 156] },
      { cool: [224, 208, 172], warm: [224, 208, 172] },
      { cool: [232, 220, 192], warm: [232, 220, 192] },
      { cool: [240, 230, 206], warm: [240, 230, 206] },
    ],
    null,
    70,
    190,
  );
  return c;
}

export interface Surfaces {
  marble: HTMLCanvasElement;
  slate: HTMLCanvasElement;
  wood: HTMLCanvasElement;
  leather: HTMLCanvasElement;
  parchment: HTMLCanvasElement;
}

let surfaces: Surfaces | null = null;

/** Paint the surfaces once and hand them to CSS as `--stone`, `--stone-dark`, `--wood`... */
export function installPaint(): Surfaces {
  if (surfaces) return surfaces;
  surfaces = {
    marble: paintMarble(256, 256, 7),
    slate: paintSlate(256, 256, 21),
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
  set('--stone-dark', surfaces.slate);
  set('--wood', surfaces.wood);
  set('--leather', surfaces.leather);
  set('--parchment', surfaces.parchment);
  root.setProperty('--px', `${PX}px`);
  return surfaces;
}

/** True inside the oval inset `inset` pixels from the box `w` by `h`. */
function inOval(x: number, y: number, w: number, h: number, inset: number): boolean {
  const rx = w / 2 - inset;
  const ry = h / 2 - inset;
  if (rx <= 0 || ry <= 0) return false;
  const dx = (x + 0.5 - w / 2) / rx;
  const dy = (y + 0.5 - h / 2) / ry;
  return dx * dx + dy * dy <= 1;
}

/** How lit a point on a ring is: 1 at the top left, -1 at the bottom right. */
function litness(x: number, y: number, w: number, h: number): number {
  const ang = Math.atan2((y + 0.5 - h / 2) / h, (x + 0.5 - w / 2) / w);
  return Math.cos(ang + Math.PI * 0.75);
}

/**
 * A gold oval button of `w` by `h` UI pixels: a near-black outline, a dark inner rim, and the
 * gold shaded round a hot spot a third in from the top left falling to bronze at the bottom
 * right, in six tones. Pressed, the hot spot moves to the bottom right and the gold goes dull.
 * Buttons too wide for an oval are slabs (`paintSlab`).
 */
export function paintButton(w: number, h: number, pressed: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const hx = pressed ? w * 0.62 : w * 0.34;
  const hy = pressed ? h * 0.66 : h * 0.3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      let tone: string;
      if (!inOval(x, y, w, h, 1)) tone = GOLD.line;
      else if (!inOval(x, y, w, h, 2)) tone = pressed ? GOLD.line : GOLD.dark;
      else {
        const dx = (x + 0.5 - hx) / (w / 2);
        const dy = (y + 0.5 - hy) / (h / 2);
        const t = Math.max(0, 1 - Math.hypot(dx, dy) / 1.3);
        let k = t > 0.9 ? 5 : t > 0.68 ? 4 : t > 0.46 ? 3 : t > 0.26 ? 2 : t > 0.1 ? 1 : 0;
        if (pressed) k = Math.max(0, Math.min(3, k - 1));
        tone = GOLD_RAMP[k]!;
      }
      px(g, x, y, tone);
    }
  }
  return c;
}

/** A wide button: a dark red-brown slab with a one-pixel bevel, lit from the top left. */
export function paintSlab(w: number, h: number, pressed: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#1a0c08';
  g.fillRect(0, 0, w, h);
  g.fillStyle = pressed ? '#3a1c12' : '#4a2418';
  g.fillRect(1, 1, w - 2, h - 2);
  g.fillStyle = pressed ? '#2a1410' : '#8a5a40';
  g.fillRect(1, 1, w - 2, 1);
  g.fillRect(1, 1, 1, h - 2);
  g.fillStyle = pressed ? '#6a4030' : '#1a0c08';
  g.fillRect(1, h - 2, w - 2, 1);
  g.fillRect(w - 2, 1, 1, h - 2);
  return c;
}

/**
 * The portrait frame: an oval opening in a gold ring three pixels wide, the gold turned round
 * the oval (bright at the top left, bronze at the bottom right, a glint at the top), a dark
 * line inside it, and the recess darkened at its top as a face under glass is.
 */
export function paintRing(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      let tone: string;
      if (!inOval(x, y, w, h, 1)) tone = GOLD.line;
      else if (!inOval(x, y, w, h, 4)) {
        const l = litness(x, y, w, h);
        const mid = !inOval(x, y, w, h, 2) && inOval(x, y, w, h, 3);
        tone =
          l > 0.92 && mid
            ? GOLD.glint
            : l > 0.55
              ? GOLD.highlight
              : l > 0.15
                ? GOLD.light
                : l > -0.4
                  ? GOLD.body
                  : l > -0.8
                    ? GOLD.shadow
                    : GOLD.dark;
      } else if (!inOval(x, y, w, h, 5)) tone = '#100c08';
      else {
        // The recess: leather under glass, shadowed under the upper rim.
        const near = !inOval(x, y, w, h, 8);
        tone = y < h / 2 && near ? '#120e0a' : near ? '#2a2018' : '#1e1812';
      }
      px(g, x, y, tone);
    }
  }
  return c;
}

/** A near-black recessed slot for gold lettering: a dark lip above, a lit one below. */
export function paintSlot(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#1c1a18';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#060604';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = '#5a5650';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  return c;
}

/** A dark grey plate recessed into the marble: the cell behind a portrait and its bars. */
export function paintRecess(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#2a2622';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#5a5652';
  g.fillRect(1, 1, w - 2, h - 2);
  g.fillStyle = '#9c9890';
  g.fillRect(1, 1, w - 2, 1);
  g.fillRect(1, 1, 1, h - 2);
  g.fillStyle = '#302c28';
  g.fillRect(1, h - 2, w - 2, 1);
  g.fillRect(w - 2, 1, 1, h - 2);
  return c;
}

/** A brass bar: a highlight band across its top third, a dark lower bevel, a rivet each corner. */
export function paintPlate(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y++) {
    const t = y / Math.max(1, h - 1);
    const tone =
      y === 0 || y === h - 1
        ? GOLD.line
        : y === 1
          ? GOLD.glint
          : t < 0.34
            ? GOLD.highlight
            : t < 0.68
              ? GOLD.body
              : y === h - 2
                ? GOLD.dark
                : GOLD.shadow;
    g.fillStyle = tone;
    g.fillRect(0, y, w, 1);
  }
  g.fillStyle = GOLD.line;
  g.fillRect(0, 0, 1, h);
  g.fillRect(w - 1, 0, 1, h);
  if (w >= 16 && h >= 10) {
    for (const rx of [3, w - 5]) {
      for (const ry of [3, h - 5]) {
        g.fillStyle = GOLD.dark;
        g.fillRect(rx, ry, 2, 2);
        g.fillStyle = GOLD.glint;
        g.fillRect(rx, ry, 1, 1);
      }
    }
  }
  return c;
}

/**
 * A leather spine: a cylinder of dark red-brown lit a third in from the left, crimson bands
 * top and bottom edged with gold fillets, a dark gap at its right where the next book stands.
 */
export function paintSpine(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const leather = ['#2a1808', '#3a2410', '#5a3418', '#6a4020', '#8a5a34'];
  for (let x = 0; x < w; x++) {
    const t = x / Math.max(1, w - 1);
    const l = Math.cos((t - 0.32) * Math.PI * 1.2);
    const k = l > 0.95 ? 4 : l > 0.6 ? 3 : l > 0.1 ? 2 : l > -0.5 ? 1 : 0;
    g.fillStyle = leather[k]!;
    g.fillRect(x, 0, 1, h);
  }
  for (const y of [4, h - 9]) {
    g.fillStyle = GOLD.light;
    g.fillRect(1, y, w - 2, 1);
    g.fillStyle = '#8a1818';
    g.fillRect(1, y + 1, w - 2, 3);
    g.fillStyle = '#5a0c0c';
    g.fillRect(1, y + 3, w - 2, 1);
    g.fillStyle = GOLD.dark;
    g.fillRect(1, y + 4, w - 2, 1);
  }
  g.fillStyle = '#1a0c06';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  g.fillRect(0, 0, 1, h);
  return c;
}

/**
 * A glass tube in a recessed slot, empty or filled: the cylinder shaded in a dark, a mid and
 * a bright stripe, as MM6's bars, with a dark stone cap at the base.
 */
export function paintTube(w: number, h: number, kind: 'empty' | 'hp' | 'sp'): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const stripes =
    kind === 'hp'
      ? ['#104010', '#20a020', '#50f050', '#20a020']
      : kind === 'sp'
        ? ['#202080', '#4040e0', '#8080ff', '#4040e0']
        : ['#0a0806', '#141210', '#1e1c18', '#141210'];
  const pattern = [0, 1, 1, 2, 2, 3];
  const inset = kind === 'empty' ? 1 : 0;
  const n = Math.max(1, w - inset * 2);
  for (let i = 0; i < n; i++) {
    const k = pattern[Math.min(5, Math.floor((i / n) * 6))]!;
    g.fillStyle = stripes[k]!;
    g.fillRect(i + inset, 0, 1, h);
  }
  if (kind === 'empty') {
    // The slot: a dark lip above and left, a lit one below and right, the stone cap.
    g.fillStyle = '#060604';
    g.fillRect(0, 0, w, 1);
    g.fillRect(0, 0, 1, h);
    g.fillStyle = '#6a665e';
    g.fillRect(0, h - 1, w, 1);
    g.fillRect(w - 1, 0, 1, h);
    g.fillStyle = '#2e2a26';
    g.fillRect(1, h - 3, w - 2, 2);
  }
  return c;
}

/** A condition gem: a bead of three tones in a dark socket, a white speck at the top left. */
export function paintGem(w: number, h: number, kind: string): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const ramps: Record<string, string[]> = {
    good: ['#0c4a14', '#1f8a2a', '#50e060'],
    weak: ['#6a4e08', '#c8a020', '#f0d050'],
    ill: ['#601a08', '#c84020', '#f08050'],
    out: ['#303030', '#707070', '#a0a0a0'],
    dead: ['#000000', '#181818', '#383838'],
  };
  const r = ramps[kind] ?? ramps['good']!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      let tone: string;
      if (!inOval(x, y, w, h, 1)) tone = '#0a0806';
      else if (!inOval(x, y, w, h, 1.5)) tone = r[0]!;
      else {
        const l = litness(x, y, w, h);
        const d = Math.hypot(x + 0.5 - w * 0.38, y + 0.5 - h * 0.38);
        tone = d < 0.8 ? '#ffffff' : l > 0.2 ? r[2]! : l > -0.5 ? r[1]! : r[0]!;
      }
      px(g, x, y, tone);
    }
  }
  return c;
}

/**
 * A marble pillar: the marble shaded as a cylinder in five bands, a cream highlight two
 * pixels wide a third in from the left, a dark contour at the right.
 */
export function paintPillar(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y += marble.height) g.drawImage(marble, 0, y);
  const hi = Math.round(w * 0.3);
  for (let x = 0; x < w; x++) {
    const t = x / Math.max(1, w - 1);
    const l = Math.cos((t - 0.3) * Math.PI * 1.15);
    const band = l > 0.6 ? 0 : l > 0.15 ? -0.1 : l > -0.3 ? -0.25 : l > -0.7 ? -0.4 : -0.55;
    if (band < 0) {
      g.fillStyle = `rgba(20,14,10,${-band})`;
      g.fillRect(x, 0, 1, h);
    }
  }
  g.fillStyle = 'rgba(255,250,240,0.5)';
  g.fillRect(hi, 0, 2, h);
  g.fillStyle = 'rgba(255,250,240,0.35)';
  g.fillRect(0, 0, 1, h);
  g.fillStyle = 'rgba(10,8,6,0.7)';
  g.fillRect(w - 1, 0, 1, h);
  return c;
}

/** A gold rail: the ramp laid in rows, the highlight at the upper third. */
export function paintRail(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y++) {
    const tone =
      y === 0 || y === h - 1
        ? GOLD.line
        : y === 1
          ? GOLD.highlight
          : y === 2
            ? GOLD.light
            : y === h - 2
              ? GOLD.shadow
              : GOLD.body;
    g.fillStyle = tone;
    g.fillRect(0, y, w, 1);
  }
  return c;
}

/** A block of marble with a bevel and a gold ring: a capital (ring below) or a plinth (above). */
export function paintCapital(
  w: number,
  h: number,
  marble: HTMLCanvasElement,
  ring: 'below' | 'above',
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.drawImage(marble, 10, 30, w, h, 0, 0, w, h);
  g.fillStyle = 'rgba(255,250,240,0.55)';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = 'rgba(10,8,6,0.55)';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  const rail = paintRail(w, 5);
  g.drawImage(rail, 0, ring === 'below' ? h - 5 : 0);
  return c;
}

/** The lintel over the view: a strip of marble with a gold rail along its lower edge. */
export function paintLintel(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let x = 0; x < w; x += marble.width) g.drawImage(marble, x, 0);
  g.fillStyle = 'rgba(255,250,240,0.5)';
  g.fillRect(0, 0, w, 1);
  const railH = Math.min(5, h);
  g.drawImage(paintRail(w, railH), 0, h - railH);
  return c;
}

/** The shelf's alcove: a dark recess under an arched marble lintel that shadows the book tops. */
export function paintAlcove(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#2a2018';
  g.fillRect(0, 0, w, h);
  const arch = (dy: number): void => {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, 0);
    g.lineTo(w, 11 + dy);
    g.quadraticCurveTo(w / 2, -1 + dy, 0, 11 + dy);
    g.closePath();
  };
  for (const [dy, alpha] of [
    [3, 0.18],
    [2, 0.3],
    [1, 0.45],
  ] as const) {
    arch(dy);
    g.fillStyle = `rgba(0,0,0,${alpha})`;
    g.fill();
  }
  g.save();
  arch(0);
  g.clip();
  for (let x = 0; x < w; x += marble.width) g.drawImage(marble, x, -20);
  g.restore();
  arch(0);
  g.strokeStyle = '#3a3430';
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = '#0e0a06';
  g.fillRect(0, 0, 1, h);
  g.fillRect(w - 1, 0, 1, h);
  g.fillRect(0, h - 1, w, 1);
  g.fillStyle = '#5a4a34';
  g.fillRect(1, h - 2, w - 2, 1);
  return c;
}

/** A gold oval in a dark socket: the rest button, a cartouche. */
export function paintCartouche(w: number, h: number, pressed: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      const l = litness(x, y, w, h);
      const tone = !inOval(x, y, w, h, 1)
        ? l < -0.3
          ? '#6a5a40'
          : '#0a0806'
        : !inOval(x, y, w, h, 2)
          ? '#1a1410'
          : '#2a2018';
      px(g, x, y, tone);
    }
  }
  g.drawImage(paintButton(w - 6, h - 6, pressed), 3, 3);
  return c;
}

/**
 * The talk window's frame: a mitred bevel three pixels wide, its top and left faces lit, its
 * bottom and right faces in shade, a line outside and a dark line inside, then a two-pixel
 * shadow where the planks meet the glass.
 */
export function paintFrame(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const top = [GOLD.glint, GOLD.highlight, GOLD.light];
  const left = [GOLD.highlight, GOLD.light, GOLD.body];
  const bottom = [GOLD.shadow, GOLD.dark, GOLD.dark];
  const right = [GOLD.shadow, GOLD.shadow, GOLD.dark];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inset = Math.min(x, y, w - 1 - x, h - 1 - y);
      let tone: string | null = null;
      if (inset === 0) tone = GOLD.line;
      else if (inset <= 3) {
        const k = inset - 1;
        const dl = x;
        const dt = y;
        const dr = w - 1 - x;
        const db = h - 1 - y;
        const m = Math.min(dl, dt, dr, db);
        tone = m === dt ? top[k]! : m === dl ? left[k]! : m === db ? bottom[k]! : right[k]!;
      } else if (inset === 4) tone = '#1a1008';
      else if (inset === 5) tone = 'rgba(0,0,0,0.45)';
      else if (inset === 6) tone = 'rgba(0,0,0,0.22)';
      if (tone) px(g, x, y, tone);
    }
  }
  return c;
}

/** An inventory tile: dark hide lit at the top left, a rust rim. */
export function paintTile(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#7a3a14';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#2c2014';
  g.fillRect(1, 1, w - 2, h - 2);
  g.fillStyle = '#4a3418';
  g.fillRect(1, 1, w - 2, Math.max(1, Math.floor((h - 2) * 0.45)));
  g.fillStyle = '#6a5030';
  g.fillRect(1, 1, w - 2, 1);
  g.fillRect(1, 1, 1, h - 2);
  g.fillStyle = '#1a1208';
  g.fillRect(1, h - 2, w - 2, 1);
  g.fillRect(w - 2, 1, 1, h - 2);
  return c;
}

/**
 * A screen's frame: marble `border` pixels wide round a clear middle, raised at its outer edge
 * (lit above and left) and the slate within it recessed (a dark lip above and left, a pale one
 * below and right).
 */
export function paintMarbleFrame(
  w: number,
  h: number,
  marble: HTMLCanvasElement,
  border: number,
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y += marble.height) {
    for (let x = 0; x < w; x += marble.width) g.drawImage(marble, x, y);
  }
  const b = Math.min(border, Math.floor(Math.min(w, h) / 2) - 1);
  g.clearRect(b, b, w - 2 * b, h - 2 * b);
  g.fillStyle = 'rgba(255,250,240,0.55)';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = 'rgba(10,8,6,0.6)';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  g.fillStyle = 'rgba(16,16,12,0.85)';
  g.fillRect(b, b, w - 2 * b, 1);
  g.fillRect(b, b, 1, h - 2 * b);
  g.fillStyle = 'rgba(160,160,150,0.8)';
  g.fillRect(b, h - b - 1, w - 2 * b, 1);
  g.fillRect(w - b - 1, b, 1, h - 2 * b);
  return c;
}

/** A bevel alone, the middle clear: a recessed slab (`in`) or a raised one (`out`). */
export function paintBevel(w: number, h: number, kind: 'in' | 'out'): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const dark = 'rgba(16,16,12,0.85)';
  const light = 'rgba(160,160,150,0.8)';
  g.fillStyle = kind === 'in' ? dark : light;
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = kind === 'in' ? light : dark;
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  return c;
}

/** A horizontal bar of the tube's stripes: the sheet's hit point line. */
export function paintBar(w: number, h: number, kind: 'hp' | 'sp'): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const stripes =
    kind === 'hp'
      ? ['#104010', '#20a020', '#50f050', '#20a020']
      : ['#202080', '#4040e0', '#8080ff', '#4040e0'];
  const pattern = [0, 1, 2, 2, 1, 1];
  for (let y = 0; y < h; y++) {
    const k = pattern[Math.min(5, Math.floor((y / h) * 6))]!;
    g.fillStyle = stripes[k]!;
    g.fillRect(0, y, w, 1);
  }
  return c;
}

const buttonCache = new Map<string, string>();

function buttonUrl(w: number, h: number, pressed: boolean, slab: boolean): string {
  const k = `${w}x${h}${pressed ? 'd' : 'u'}${slab ? 's' : 'o'}`;
  let url = buttonCache.get(k);
  if (!url) {
    const c = slab ? paintSlab(w, h, pressed) : paintButton(w, h, pressed);
    url = `url("${c.toDataURL('image/png')}")`;
    buttonCache.set(k, url);
  }
  return url;
}

/** Give a button its painted faces for its current size: an oval, or a slab when too wide. */
function dress(b: HTMLElement): void {
  const w = Math.round(b.offsetWidth / PX);
  const h = Math.round(b.offsetHeight / PX);
  if (w < 6 || h < 6) return;
  const slab = w / h > 4.5;
  b.classList.toggle('slab', slab);
  b.style.setProperty('--btn-up', buttonUrl(w, h, false, slab));
  b.style.setProperty('--btn-down', buttonUrl(w, h, true, slab));
}

const paintCache = new Map<string, string>();

/** The painted piece named by an element's `data-paint`, at its size. */
function pieceUrl(kind: string, w: number, h: number): string | null {
  const k = `${kind}:${w}x${h}`;
  const hit = paintCache.get(k);
  if (hit) return hit;
  const s = surfaces ?? installPaint();
  let c: HTMLCanvasElement | null = null;
  if (kind === 'ring') c = paintRing(w, h);
  else if (kind === 'plate') c = paintPlate(w, h);
  else if (kind === 'slot') c = paintSlot(w, h);
  else if (kind === 'recess') c = paintRecess(w, h);
  else if (kind === 'spine') c = paintSpine(w, h);
  else if (kind === 'gold') c = paintCartouche(w, h, false);
  else if (kind === 'frame') c = paintFrame(w, h);
  else if (kind === 'tile') c = paintTile(w, h);
  else if (kind === 'tube') c = paintTube(w, h, 'empty');
  else if (kind === 'tube-hp') c = paintTube(w, h, 'hp');
  else if (kind === 'tube-sp') c = paintTube(w, h, 'sp');
  else if (kind === 'bar-hp') c = paintBar(w, h, 'hp');
  else if (kind === 'bar-sp') c = paintBar(w, h, 'sp');
  else if (kind.startsWith('gem-')) c = paintGem(w, h, kind.slice(4));
  else if (kind === 'pillar') c = paintPillar(w, Math.min(h, 512), s.marble);
  else if (kind === 'capital') c = paintCapital(w, h, s.marble, 'below');
  else if (kind === 'plinth') c = paintCapital(w, h, s.marble, 'above');
  else if (kind === 'rail') c = paintRail(Math.min(w, 64), h);
  else if (kind === 'lintel') c = paintLintel(w, h, s.marble);
  else if (kind === 'alcove') c = paintAlcove(w, h, s.marble);
  else if (kind === 'marble-frame') c = paintMarbleFrame(w, h, s.marble, 9);
  else if (kind === 'bevel-in') c = paintBevel(w, h, 'in');
  else if (kind === 'bevel-out') c = paintBevel(w, h, 'out');
  if (!c) return null;
  const url = `url("${c.toDataURL('image/png')}")`;
  paintCache.set(k, url);
  return url;
}

function dressPiece(el: HTMLElement): void {
  const kind = el.dataset['paint'];
  if (!kind) return;
  const w = Math.max(1, Math.round(el.offsetWidth / PX));
  const h = Math.max(1, Math.round(el.offsetHeight / PX));
  const url = pieceUrl(kind, w, h);
  if (url) el.style.setProperty('--paint', url);
}

/**
 * Paint every `.ui-btn` (gold, two faces) and every `[data-paint]` piece under `root` as it
 * appears, whenever it changes size, and when its `data-paint` changes (a gem's colour).
 */
export function installPaintedButtons(root: HTMLElement): void {
  const sizes =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver((entries) => {
          for (const e of entries) {
            const t = e.target as HTMLElement;
            if (t.dataset['paint']) dressPiece(t);
            else dress(t);
          }
        })
      : null;
  const adopt = (el: Element): void => {
    const buttons = [...(el.matches('.ui-btn') ? [el] : []), ...el.querySelectorAll('.ui-btn')];
    // The shelf's spines are leather, not gold; they carry their own paint.
    for (const b of buttons) {
      if (b.classList.contains('ui-shelf-btn')) continue;
      dress(b as HTMLElement);
      sizes?.observe(b);
    }
    const pieces = [
      ...(el.matches('[data-paint]') ? [el] : []),
      ...el.querySelectorAll('[data-paint]'),
    ];
    for (const p of pieces) {
      dressPiece(p as HTMLElement);
      sizes?.observe(p);
    }
  };
  adopt(root);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes') dressPiece(r.target as HTMLElement);
      for (const n of r.addedNodes) if (n.nodeType === Node.ELEMENT_NODE) adopt(n as Element);
    }
  }).observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-paint'],
  });
}
