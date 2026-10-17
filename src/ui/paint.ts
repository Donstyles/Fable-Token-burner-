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
import { type Tone, canvas, dab, die, posterise, px, stroke } from '../render/brush';
import { PX } from './pixel-text';

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

/** MM6's HUD marble: warm putty, cream patches, taupe and dark veins; eight tones. */
const MARBLE: Tone[] = [
  { cool: [118, 108, 108], warm: [126, 108, 100] },
  { cool: [138, 128, 128], warm: [148, 128, 118] },
  { cool: [156, 146, 146], warm: [166, 146, 136] },
  { cool: [172, 162, 162], warm: [182, 162, 152] },
  { cool: [186, 178, 176], warm: [196, 178, 166] },
  { cool: [198, 190, 188], warm: [208, 190, 178] },
  { cool: [208, 202, 198], warm: [218, 202, 190] },
  { cool: [216, 210, 206], warm: [226, 210, 198] },
  { cool: [224, 218, 214], warm: [232, 218, 206] },
  { cool: [230, 226, 220], warm: [238, 226, 214] },
  { cool: [236, 232, 226], warm: [242, 232, 222] },
  { cool: [242, 238, 232], warm: [246, 238, 230] },
];
/** The sheet's slate: grey-green, seven tones. */
const SLATE: Tone[] = [
  { cool: [42, 46, 44], warm: [46, 46, 42] },
  { cool: [62, 68, 64], warm: [66, 66, 60] },
  { cool: [84, 92, 86], warm: [88, 88, 80] },
  { cool: [106, 114, 108], warm: [110, 110, 100] },
  { cool: [128, 136, 130], warm: [132, 132, 122] },
  { cool: [150, 158, 152], warm: [154, 154, 144] },
];

/**
 * Marble in three passes, as a 1998 painter laid it in: clouds of a wide brush at the scale
 * of a hand, then a fine grain of near-white and oatmeal, then soft veins two to four pixels
 * wide that fade in and out, with broken pale threads beside them; twelve tones, ivory to
 * grey-pink, the patches warm or cool.
 */
function paintMarble(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 44; i++) {
    const tone = 128 + (r() - 0.5) * 56;
    dab(g, w, h, r() * w, r() * h, 26 + r() * 40, 14 + r() * 24, r() * Math.PI, tone, 0.5);
  }
  for (let i = 0; i < 2200; i++) {
    const tone = 128 + (r() - 0.5) * 36;
    const sz = 0.7 + r() * 1.3;
    dab(g, w, h, r() * w, r() * h, sz, sz, 0, tone, 0.5);
  }
  const vein = (x: number, y: number, ang: number, len: number, deep: boolean): void => {
    const pts: [number, number][] = [];
    for (let t = 0; t < len; t += 3) {
      ang += (r() - 0.5) * 0.4;
      x += Math.cos(ang) * 3;
      y += Math.sin(ang) * 3;
      pts.push([x, y]);
    }
    // The vein fades in and out: three overlapping soft strokes of different lengths.
    const a = deep ? 0.2 : 0.14;
    stroke(g, w, h, pts, `rgba(70,56,56,${a})`, 4);
    stroke(g, w, h, pts.slice(2, -2), `rgba(70,56,56,${a + 0.08})`, 2);
    const m = Math.floor(pts.length / 2);
    stroke(g, w, h, pts.slice(m - 6, m + 6), `rgba(70,56,56,${a + 0.14})`, 1);
    // Broken pale threads beside it.
    for (let k = 3; k < pts.length - 3; k += 7) {
      if (r() < 0.5) continue;
      const seg = pts.slice(k, k + 3).map(([px0, py0]): [number, number] => [px0 + 2, py0 + 2]);
      stroke(g, w, h, seg, 'rgba(240,236,232,0.6)', 1);
    }
  };
  for (let v = 0; v < 8; v++) {
    vein(r() * w, r() * h, -0.7 + (r() - 0.5) * 0.9, 80 + r() * 150, v < 4);
  }
  const patches: [number, number, number, number][] = [];
  for (let i = 0; i < 10; i++) patches.push([r() * w, r() * h, 50 + r() * 80, r() < 0.5 ? 0 : 1]);
  const tint = (x: number, y: number): number => {
    let acc = 0.5;
    for (const [pxx, pyy, rad, warm] of patches) {
      const dx = Math.min(Math.abs(x - pxx), w - Math.abs(x - pxx));
      const dy = Math.min(Math.abs(y - pyy), h - Math.abs(y - pyy));
      const d = Math.hypot(dx, dy);
      if (d < rad) acc += (warm ? 0.5 : -0.5) * (1 - d / rad) * 0.9;
    }
    return Math.max(0, Math.min(1, acc));
  };
  posterise(g, w, h, MARBLE, tint, 62, 200);
  return c;
}

/**
 * Slate in three passes, as MM6's sheet: cloudy patches of a wide brush, a one-pixel
 * speckle, then veins as broken lines in the second-lightest tone; six tones, near-black to
 * pale mineral, grey-green.
 */
function paintSlate(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#787878';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 48; i++) {
    const tone = 128 + (r() - 0.5) * 64;
    dab(g, w, h, r() * w, r() * h, 18 + r() * 34, 10 + r() * 20, r() * Math.PI, tone, 0.5);
  }
  for (let i = 0; i < 2600; i++) {
    const tone = 128 + (r() - 0.5) * 44;
    const sz = 0.7 + r() * 1.2;
    dab(g, w, h, r() * w, r() * h, sz, sz, 0, tone, 0.55);
  }
  for (let v = 0; v < 7; v++) {
    let x = r() * w;
    let y = r() * h;
    let ang = (r() - 0.5) * 2;
    const pts: [number, number][] = [];
    const len = 40 + r() * 100;
    for (let t = 0; t < len; t += 3) {
      ang += (r() - 0.5) * 0.6;
      x += Math.cos(ang) * 3;
      y += Math.sin(ang) * 3;
      pts.push([x, y]);
    }
    // Broken: every other short run drawn, in the pale tone.
    for (let k = 0; k < pts.length - 3; k += 6) {
      if (r() < 0.35) continue;
      stroke(g, w, h, pts.slice(k, k + 3), 'rgba(200,206,200,0.55)', 1);
    }
  }
  const tint = (x: number, y: number): number => 0.5 + 0.5 * Math.sin((x - y * 0.7) / 70);
  posterise(g, w, h, SLATE, tint, 64, 196);
  return c;
}

/**
 * Dark oak, as MM6's panels: boards standing on end in uneven widths, near black to an
 * orange-tan where the varnish catches light, long wavy grain lines one to three pixels
 * wide, a knot here and there, a heavy speckle; no nails, no seam grid.
 */
function paintWood(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  const grey = (t: number): string => `rgb(${t},${t},${t})`;
  let x0 = 0;
  while (x0 < w) {
    const board = Math.min(w - x0, 18 + Math.floor(r() * 20));
    const shade = 100 + (r() - 0.5) * 56;
    g.fillStyle = grey(shade);
    g.fillRect(x0, 0, board, h);
    const lines = 4 + Math.floor(r() * 4);
    for (let i = 0; i < lines; i++) {
      const xb = x0 + 2 + r() * (board - 4);
      const amp = 1 + r() * 3;
      const period = 24 + r() * 50;
      const phase = r() * 10;
      const tone = shade + (r() < 0.65 ? -30 - r() * 30 : 24 + r() * 30);
      const pts: [number, number][] = [];
      for (let y = 0; y <= h; y += 2) {
        pts.push([xb + amp * Math.sin(y / period + phase) + 0.5 * Math.sin(y / 7 + phase * 3), y]);
      }
      stroke(g, 0, h, pts, grey(tone), r() < 0.35 ? 2 : 1);
    }
    if (r() < 0.4) {
      const kx = x0 + board * (0.3 + r() * 0.4);
      const ky = r() * h;
      for (let k = 3; k >= 0; k--) {
        g.strokeStyle = grey(shade - 40 + k * 10);
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(kx, ky, 1.4 + k * 1.1, 2.5 + k * 2, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.fillStyle = grey(30);
    g.fillRect(x0 + board - 1, 0, 1, h);
    g.fillStyle = grey(shade + 30);
    g.fillRect(x0, 0, 1, h);
    x0 += board;
  }
  for (let i = 0; i < 1800; i++) {
    const tone = 128 + (r() - 0.5) * 70;
    dab(g, w, h, r() * w, r() * h, 0.8, 0.8, 0, tone, 0.5);
  }
  posterise(
    g,
    w,
    h,
    [
      { cool: [14, 8, 4], warm: [14, 8, 4] },
      { cool: [30, 16, 8], warm: [30, 16, 8] },
      { cool: [48, 26, 12], warm: [48, 26, 12] },
      { cool: [68, 38, 16], warm: [68, 38, 16] },
      { cool: [90, 52, 22], warm: [90, 52, 22] },
      { cool: [116, 70, 30], warm: [116, 70, 30] },
      { cool: [144, 92, 40], warm: [144, 92, 40] },
      { cool: [172, 116, 52], warm: [172, 116, 52] },
    ],
    null,
    30,
    210,
  );
  return c;
}

/** Hide, as MM6's cordovan: dark, a faint large mottle, a fine directional grain. */
function paintLeather(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    const tone = 128 + (r() - 0.5) * 36;
    dab(g, w, h, r() * w, r() * h, 16 + r() * 30, 10 + r() * 20, r() * Math.PI, tone, 0.45);
  }
  for (let i = 0; i < 520; i++) {
    const x = r() * w;
    const y = r() * h;
    const len = 2 + r() * 5;
    const a = -0.5 + (r() - 0.5) * 0.5;
    const tone = r() < 0.5 ? 96 : 160;
    stroke(
      g,
      w,
      h,
      [
        [x, y],
        [x + Math.cos(a) * len, y + Math.sin(a) * len],
      ],
      `rgba(${tone},${tone},${tone},0.5)`,
      1,
    );
  }
  posterise(
    g,
    w,
    h,
    [
      { cool: [40, 18, 10], warm: [40, 18, 10] },
      { cool: [52, 24, 14], warm: [52, 24, 14] },
      { cool: [64, 30, 18], warm: [64, 30, 18] },
      { cool: [78, 38, 22], warm: [78, 38, 22] },
      { cool: [92, 46, 26], warm: [92, 46, 26] },
    ],
    null,
    80,
    180,
  );
  return c;
}

/** Parchment: warm cream with broad faint stains, four tones. */
function paintParchment(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    const tone = 128 + (r() - 0.5) * 34;
    dab(g, w, h, r() * w, r() * h, 30 + r() * 60, 16 + r() * 36, r() * Math.PI, tone, 0.5);
  }
  posterise(
    g,
    w,
    h,
    [
      { cool: [206, 186, 148], warm: [206, 186, 148] },
      { cool: [220, 204, 168], warm: [220, 204, 168] },
      { cool: [230, 218, 190], warm: [230, 218, 190] },
      { cool: [238, 228, 204], warm: [238, 228, 204] },
    ],
    null,
    100,
    160,
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
 * A gold oval button, as MM6's: a black outline, then bands top to bottom, a near-white rim,
 * a bright highlight band, the mid gold, the lower third in bronze, a dark line at the foot.
 * Pressed, it is uniformly brighter and flatter, the highlight band gone. Buttons too wide
 * for an oval are stone insets (`paintSlab`).
 */
export function paintButton(w: number, h: number, pressed: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      let tone: string;
      const t = (y + 0.5) / h;
      if (!inOval(x, y, w, h, 1)) tone = '#100a04';
      else if (pressed) tone = !inOval(x, y, w, h, 2) ? GOLD.light : GOLD.highlight;
      else if (!inOval(x, y, w, h, 2)) tone = t < 0.5 ? GOLD.glint : GOLD.dark;
      else if (t < 0.14) tone = GOLD.glint;
      else if (t < 0.4) tone = GOLD.highlight;
      else if (t < 0.66) tone = GOLD.light;
      else if (t < 0.9) tone = GOLD.shadow;
      else tone = GOLD.dark;
      px(g, x, y, tone);
    }
  }
  return c;
}

/** A wide button, as MM6's rest screen: a dark green slab with a hard bevel. */
export function paintSlab(w: number, h: number, pressed: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#0c1208';
  g.fillRect(0, 0, w, h);
  g.fillStyle = pressed ? '#3a4a2c' : '#2c3c22';
  g.fillRect(1, 1, w - 2, h - 2);
  g.fillStyle = pressed ? '#1a2412' : '#6a7c58';
  g.fillRect(1, 1, w - 2, 1);
  g.fillRect(1, 1, 1, h - 2);
  g.fillStyle = pressed ? '#6a7c58' : '#1a2412';
  g.fillRect(1, h - 2, w - 2, 1);
  g.fillRect(w - 2, 1, 1, h - 2);
  return c;
}

/**
 * The portrait frame, as MM6's: an oval cut from grey stone, a dark line outside, a bevel
 * three pixels wide lit cream at the top left and dark at the bottom right, a thread of
 * white light along its upper-left inner edge (brighter for the member in hand), a dark
 * line, then the recess. A chip or two in the stone's edge.
 */
export function paintRing(w: number, h: number, active: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const r = die(w * 31 + h);
  const chips = [r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      const l = litness(x, y, w, h);
      const ang = Math.atan2(y + 0.5 - h / 2, x + 0.5 - w / 2);
      const chipped = chips.some(
        (a) => Math.abs(((ang - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.09,
      );
      let tone: string;
      if (!inOval(x, y, w, h, 1)) tone = chipped ? '#6e6860' : '#2a2622';
      else if (!inOval(x, y, w, h, 4)) {
        tone = l > 0.55 ? '#e8e0d4' : l > 0.1 ? '#c4bcb2' : l > -0.45 ? '#9a9288' : '#5e5850';
        if (chipped && !inOval(x, y, w, h, 2)) tone = '#5e5850';
      } else if (!inOval(x, y, w, h, 5)) {
        tone = l > 0.3 ? (active ? '#ffffff' : '#e8e4dc') : l > -0.3 ? '#8a847c' : '#3a3630';
      } else if (!inOval(x, y, w, h, 6)) tone = '#100c08';
      else {
        const near = !inOval(x, y, w, h, 9);
        tone = y < h / 2 && near ? '#120e0a' : near ? '#2a2018' : '#1e1812';
      }
      px(g, x, y, tone);
    }
  }
  return c;
}

/** A dark well for gold lettering: a soft shadow under its top and left, no bright line. */
export function paintSlot(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#2a2826';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#0e0c0c';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = '#1a1818';
  g.fillRect(1, 1, w - 1, 1);
  g.fillRect(1, 1, 1, h - 1);
  g.fillStyle = '#3e3c38';
  g.fillRect(1, h - 1, w - 1, 1);
  return c;
}

/**
 * A member's panel: the marble itself sunk a step into the band, darker, with a two-pixel
 * shadow under its upper edge and a lit lip along its lower one.
 */
export function paintRecess(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y += marble.height) {
    for (let x = 0; x < w; x += marble.width) g.drawImage(marble, x + 37, y + 61, w, h, x, y, w, h);
  }
  g.fillStyle = 'rgba(20,14,10,0.16)';
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,8,6,0.5)';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = 'rgba(10,8,6,0.25)';
  g.fillRect(1, 1, w - 2, 1);
  g.fillStyle = 'rgba(255,250,240,0.5)';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
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
 * A leather spine, as MM6's: chocolate to umber, a cylinder lit a third in from the left with
 * a bright rim along its rounded top, maroon bands raised as ridges (a light line above, a
 * dark one below) ruled with gold, the neighbour's shadow falling along its left edge.
 */
export function paintSpine(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const leather = ['#1e0e06', '#2e180a', '#3e2212', '#4e2e1a', '#604024', '#7a5434'];
  for (let x = 0; x < w; x++) {
    const t = x / Math.max(1, w - 1);
    const l = Math.cos((t - 0.32) * Math.PI * 1.25);
    const k = l > 0.9 ? 5 : l > 0.6 ? 4 : l > 0.2 ? 3 : l > -0.3 ? 2 : l > -0.7 ? 1 : 0;
    g.fillStyle = leather[k]!;
    g.fillRect(x, 0, 1, h);
  }
  for (const y of [5, h - 10]) {
    g.fillStyle = '#9a7a56';
    g.fillRect(1, y, w - 2, 1);
    g.fillStyle = '#6a1818';
    g.fillRect(1, y + 1, w - 2, 3);
    g.fillStyle = '#8a2a24';
    g.fillRect(1, y + 1, Math.max(1, Math.floor(w * 0.4)), 2);
    g.fillStyle = GOLD.light;
    g.fillRect(1, y + 2, w - 2, 1);
    g.fillStyle = '#3a0c0c';
    g.fillRect(1, y + 4, w - 2, 1);
  }
  g.fillStyle = '#9a7a56';
  g.fillRect(1, 0, w - 2, 1);
  g.fillStyle = '#5a3c22';
  g.fillRect(1, 1, w - 2, 1);
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(1, 2, 1, h - 3);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(2, 2, 1, h - 3);
  g.fillStyle = '#120804';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  g.fillRect(0, 0, 1, h);
  return c;
}

/**
 * A tube in its well, as MM6's bars: the well dark with a shadow under its top, a thread of
 * light along its right and foot, and a gold cap at the base; the fill a cylinder of three
 * columns, a pale highlight at the left, the saturated core, a dark edge at the right, with a
 * light cap on top.
 */
export function paintTube(w: number, h: number, kind: 'empty' | 'hp' | 'sp'): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  if (kind === 'empty') {
    g.fillStyle = '#12141c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#04060a';
    g.fillRect(0, 0, w, 2);
    g.fillRect(0, 0, 1, h);
    g.fillStyle = '#3a4050';
    g.fillRect(w - 1, 0, 1, h);
    g.fillStyle = GOLD.dark;
    g.fillRect(0, h - 3, w, 3);
    g.fillStyle = GOLD.body;
    g.fillRect(0, h - 3, w, 1);
    g.fillStyle = GOLD.highlight;
    g.fillRect(0, h - 3, 1, 1);
    return c;
  }
  const [hi, core, dark, cap] =
    kind === 'hp'
      ? ['#90f0a0', '#20c020', '#105010', '#d0ffd0']
      : ['#a0c0ff', '#3058f0', '#182878', '#d8e4ff'];
  g.fillStyle = core;
  g.fillRect(0, 0, w, h);
  g.fillStyle = hi;
  g.fillRect(0, 0, 1, h);
  g.fillStyle = dark;
  g.fillRect(w - 1, 0, 1, h);
  g.fillStyle = cap;
  g.fillRect(0, 0, w, 1);
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
 * A marble pillar as MM6 shaded it: a dark slate edge at the left, an off-white highlight
 * three pixels wide a third of the way in, the mid grey falling to a dark edge at the right,
 * the veining bending across the curve.
 */
export function paintPillar(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y += marble.height) g.drawImage(marble, 0, y);
  const hi = Math.round(w * 0.3);
  for (let x = 0; x < w; x++) {
    const t = x / Math.max(1, w - 1);
    const l = Math.cos((t - 0.3) * Math.PI * 1.2);
    const shade =
      x < 2 ? 0.55 : l > 0.4 ? 0 : l > 0 ? 0.1 : l > -0.4 ? 0.22 : l > -0.8 ? 0.36 : 0.5;
    if (shade > 0) {
      g.fillStyle = `rgba(20,16,14,${shade})`;
      g.fillRect(x, 0, 1, h);
    }
  }
  g.fillStyle = 'rgba(255,252,246,0.55)';
  g.fillRect(hi, 0, 3, h);
  g.fillStyle = 'rgba(255,252,246,0.3)';
  g.fillRect(hi - 1, 0, 1, h);
  g.fillRect(hi + 3, 0, 1, h);
  g.fillStyle = 'rgba(10,8,6,0.75)';
  g.fillRect(w - 1, 0, 1, h);
  return c;
}

/** The band's top edge: a stone lip, a dark line over a cream one, then the marble. */
export function paintRail(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const s = surfaces ?? installPaint();
  for (let x = 0; x < w; x += s.marble.width) g.drawImage(s.marble, x, 0);
  g.fillStyle = '#2a2420';
  g.fillRect(0, 0, w, 1);
  g.fillStyle = '#ece4d8';
  g.fillRect(0, 1, w, 1);
  return c;
}

/**
 * A capital or a plinth: for the capital, an abacus over a bell that flares out with a
 * volute curling at each corner and a leaf between; for the plinth, two steps. A gold collar
 * six pixels tall where it meets the shaft: mustard edges, a bright line near the top, a
 * dark olive line at the foot.
 */
export function paintCapital(
  w: number,
  h: number,
  marble: HTMLCanvasElement,
  ring: 'below' | 'above',
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const shaft = Math.max(4, Math.round(w * 0.72));
  const margin = Math.floor((w - shaft) / 2);
  const collar = 6;
  const rows: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    let inset: number;
    if (ring === 'below') {
      const bell = h - collar;
      inset =
        y < 3 ? 0 : y >= bell ? margin : Math.round((margin * (y - 3)) / Math.max(1, bell - 3));
    } else {
      inset =
        y < collar
          ? margin
          : y < collar + Math.floor((h - collar) / 2)
            ? Math.floor(margin / 2)
            : 0;
    }
    rows.push([inset, w - 2 * inset]);
  }
  rows.forEach(([x, rw], y) => {
    g.drawImage(marble, 12 + x, 40 + y, rw, 1, x, y, rw, 1);
    g.fillStyle = 'rgba(255,250,240,0.5)';
    g.fillRect(x, y, 1, 1);
    g.fillStyle = 'rgba(10,8,6,0.5)';
    g.fillRect(x + rw - 1, y, 1, 1);
  });
  for (let y = 1; y < h; y++) {
    const [x, rw] = rows[y]!;
    const [px0, pw] = rows[y - 1]!;
    if (rw > pw) {
      g.fillStyle = 'rgba(255,250,240,0.55)';
      g.fillRect(x, y, rw, 1);
    } else if (rw < pw) {
      g.fillStyle = 'rgba(10,8,6,0.45)';
      g.fillRect(px0, y, pw, 1);
    }
  }
  if (ring === 'below') {
    // The volutes: a curl at each corner of the bell, a leaf between them.
    const bell = h - collar;
    const curl = (cx: number, dir: number): void => {
      g.strokeStyle = 'rgba(30,24,20,0.7)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(cx, 6, 2.5, Math.PI * 0.5, Math.PI * 2.1);
      g.stroke();
      g.strokeStyle = 'rgba(255,250,240,0.6)';
      g.beginPath();
      g.arc(cx + dir * 0.5, 5.5, 1.5, Math.PI * 0.6, Math.PI * 1.9);
      g.stroke();
    };
    curl(4, 1);
    curl(w - 5, -1);
    g.fillStyle = 'rgba(30,24,20,0.6)';
    g.fillRect(Math.floor(w / 2), 4, 1, bell - 5);
    g.fillRect(Math.floor(w / 2) - 1, bell - 3, 3, 1);
  }
  const [rx, rw] = rows[ring === 'below' ? h - 1 : 0]!;
  const y0 = ring === 'below' ? h - collar : 0;
  const collarTones = [GOLD.body, GOLD.glint, GOLD.light, GOLD.body, GOLD.shadow, '#4a4010'];
  collarTones.forEach((tone, i) => {
    g.fillStyle = tone;
    g.fillRect(rx, y0 + i, rw, 1);
  });
  return c;
}

/** The lintel over the view: marble with a lit lip and a dark line along its lower edge. */
export function paintLintel(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let x = 0; x < w; x += marble.width) g.drawImage(marble, x, 0);
  g.fillStyle = 'rgba(255,250,240,0.5)';
  g.fillRect(0, 0, w, 1);
  g.fillStyle = '#ece4d8';
  g.fillRect(0, h - 2, w, 1);
  g.fillStyle = '#2a2420';
  g.fillRect(0, h - 1, w, 1);
  return c;
}

/** The shelf's alcove: a dark recess under an arched marble lintel that shadows the book tops. */
export function paintAlcove(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#3a3026';
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
 * The talk window's frame, as MM6's: a dark line outside, a bevel two pixels wide lit above
 * and left and in shade below and right, a dark line inside, then a shadow where the planks
 * meet the glass.
 */
export function paintFrame(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const top = [GOLD.glint, GOLD.light];
  const left = [GOLD.highlight, GOLD.body];
  const bottom = [GOLD.shadow, GOLD.dark];
  const right = [GOLD.shadow, GOLD.dark];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inset = Math.min(x, y, w - 1 - x, h - 1 - y);
      let tone: string | null = null;
      if (inset === 0) tone = GOLD.line;
      else if (inset <= 2) {
        const k = inset - 1;
        const m = Math.min(x, y, w - 1 - x, h - 1 - y);
        tone = m === y ? top[k]! : m === x ? left[k]! : m === h - 1 - y ? bottom[k]! : right[k]!;
      } else if (inset === 3) tone = '#1a1008';
      else if (inset === 4) tone = 'rgba(0,0,0,0.4)';
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
 * A screen's frame, as MM6's carved architrave: marble `border` pixels wide round a clear
 * middle, a fluted pilaster down each side, a block at each corner, the top rail casting a
 * shadow onto the slate, and the slate within recessed under a dark lip above and left and
 * a pale one below and right.
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
  // The pilasters: a highlight down each side a third of the way in, a dark edge outside.
  for (const x0 of [0, w - b]) {
    g.fillStyle = 'rgba(255,252,246,0.5)';
    g.fillRect(x0 + Math.round(b * 0.3), b, 2, h - 2 * b);
    g.fillStyle = 'rgba(20,16,14,0.3)';
    g.fillRect(x0 + b - 2, b, 1, h - 2 * b);
  }
  // Corner blocks, raised: lit above and left, dark below and right.
  const cb = Math.min(16, b + 7);
  for (const [cx, cy] of [
    [0, 0],
    [w - cb, 0],
    [0, h - cb],
    [w - cb, h - cb],
  ] as const) {
    g.drawImage(marble, 60 + cx, 20 + cy, cb, cb, cx, cy, cb, cb);
    g.fillStyle = 'rgba(255,252,246,0.6)';
    g.fillRect(cx, cy, cb, 1);
    g.fillRect(cx, cy, 1, cb);
    g.fillStyle = 'rgba(10,8,6,0.6)';
    g.fillRect(cx, cy + cb - 1, cb, 1);
    g.fillRect(cx + cb - 1, cy, 1, cb);
  }
  g.fillStyle = 'rgba(255,250,240,0.55)';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = 'rgba(10,8,6,0.6)';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  // The recess and the rail's shadow onto the slate.
  g.fillStyle = 'rgba(8,8,6,0.85)';
  g.fillRect(b, b, w - 2 * b, 1);
  g.fillRect(b, b, 1, h - 2 * b);
  g.fillStyle = 'rgba(8,8,6,0.4)';
  g.fillRect(b + 1, b + 1, w - 2 * b - 2, 1);
  g.fillStyle = 'rgba(8,8,6,0.2)';
  g.fillRect(b + 1, b + 2, w - 2 * b - 2, 1);
  g.fillStyle = 'rgba(170,170,160,0.8)';
  g.fillRect(b, h - b - 1, w - 2 * b, 1);
  g.fillRect(w - b - 1, b, 1, h - 2 * b);
  return c;
}

/**
 * An open book filling a screen, as MM6's spellbook and quest log: a dark leather cover with
 * brass corners and a band of it along the top for the title and tabs, two parchment pages
 * meeting at a shadowed gutter, the stack of pages drawn as eight lines stepping out below
 * and to the right, a curl at the lower corners, cloth tabs down the right edge, and a faint
 * engraving watermarked across the pages.
 */
export function paintBook(w: number, h: number, parchment: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#1a0c06';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#3a2410';
  g.fillRect(1, 1, w - 2, h - 2);
  g.fillStyle = '#6a4a28';
  g.fillRect(1, 1, w - 2, 1);
  g.fillRect(1, 1, 1, h - 2);
  g.fillStyle = '#1a0c06';
  g.fillRect(1, h - 2, w - 2, 1);
  g.fillRect(w - 2, 1, 1, h - 2);
  const top = 30;
  const left = 7;
  const right = w - 16;
  const bottom = h - 16;
  for (let i = 8; i >= 1; i--) {
    g.fillStyle = i % 2 ? '#b89c70' : '#e4d8bc';
    g.fillRect(left + i, top + i, right - left, bottom - top);
  }
  g.save();
  g.beginPath();
  g.rect(left, top, right - left, bottom - top);
  g.clip();
  for (let y = top; y < bottom; y += parchment.height) {
    for (let x = left; x < right; x += parchment.width) g.drawImage(parchment, x, y);
  }
  // The watermark: an engraving of a rose compass, faint, across the right page.
  const r = die(9);
  const cx = Math.floor((left + right) * 0.72);
  const cy = Math.floor((top + bottom) / 2);
  const rad = Math.min(right - left, bottom - top) * 0.3;
  g.strokeStyle = 'rgba(120,96,60,0.16)';
  g.lineWidth = 1;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const len = k % 4 === 0 ? rad : k % 2 === 0 ? rad * 0.7 : rad * 0.45;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    g.stroke();
  }
  for (const rr of [rad * 0.35, rad * 0.6, rad * 0.95]) {
    g.beginPath();
    g.arc(cx, cy, rr, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 30; i++) {
    const a = r() * Math.PI * 2;
    const d = rad * (0.4 + r() * 0.6);
    g.beginPath();
    g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1 + r() * 3, 0, Math.PI * 2);
    g.stroke();
  }
  // The gutter: the pages curve down into the spine.
  const gx = Math.floor((left + right) / 2);
  for (let d = -7; d <= 7; d++) {
    const t = 1 - Math.abs(d) / 8;
    g.fillStyle = `rgba(40,24,8,${(0.4 * t * t).toFixed(3)})`;
    g.fillRect(gx + d, top, 1, bottom - top);
  }
  g.fillStyle = 'rgba(30,18,6,0.7)';
  g.fillRect(gx, top, 1, bottom - top);
  // The lower corners curl: a lighter triangle with a shadow under it.
  for (const [xx, dir] of [
    [left, 1],
    [right - 1, -1],
  ] as const) {
    for (let k = 0; k < 7; k++) {
      g.fillStyle = 'rgba(255,250,236,0.55)';
      g.fillRect(xx + dir * k, bottom - 1 - k, dir, 1);
      g.fillStyle = 'rgba(60,40,16,0.35)';
      g.fillRect(xx + dir * (k + 1), bottom - 1 - k, dir * (7 - k), 1);
    }
  }
  g.fillStyle = 'rgba(90,60,24,0.5)';
  g.fillRect(left, top, right - left, 1);
  g.fillRect(left, bottom - 1, right - left, 1);
  g.fillRect(left, top, 1, bottom - top);
  g.fillRect(right - 1, top, 1, bottom - top);
  g.restore();
  // Cloth tabs down the right edge of the cover.
  const tabs = ['#8a2a24', '#2a5a3a', '#2a3a7a', '#7a5a18'];
  tabs.forEach((tone, i) => {
    const ty = top + 10 + i * 18;
    g.fillStyle = '#1a0c06';
    g.fillRect(right + 8, ty, 7, 13);
    g.fillStyle = tone;
    g.fillRect(right + 9, ty + 1, 5, 11);
    g.fillStyle = 'rgba(255,250,240,0.4)';
    g.fillRect(right + 9, ty + 1, 5, 1);
  });
  const corner = (x: number, y: number, sx: number, sy: number): void => {
    g.fillStyle = GOLD.line;
    g.fillRect(x, y, 8 * sx, 3 * sy);
    g.fillRect(x, y, 3 * sx, 8 * sy);
    g.fillStyle = GOLD.body;
    g.fillRect(x + sx, y + sy, 6 * sx, sy);
    g.fillRect(x + sx, y + sy, sx, 6 * sy);
    g.fillStyle = GOLD.highlight;
    g.fillRect(x + sx, y + sy, sx, sy);
  };
  corner(2, 2, 1, 1);
  corner(w - 3, 2, -1, 1);
  corner(2, h - 3, 1, -1);
  corner(w - 3, h - 3, -1, -1);
  return c;
}

/** A carved stone banner for a book's heading: a pale band with a bevel and curled ends. */
export function paintBanner(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const mid = Math.floor(h / 2);
  g.fillStyle = '#8a8070';
  g.fillRect(4, 1, w - 8, h - 2);
  g.fillStyle = '#c8bca4';
  g.fillRect(5, 2, w - 10, h - 4);
  g.fillStyle = '#e0d6c0';
  g.fillRect(5, 2, w - 10, 1);
  g.fillRect(5, 2, 1, h - 4);
  g.fillStyle = '#6a6050';
  g.fillRect(5, h - 3, w - 10, 1);
  g.fillRect(w - 6, 2, 1, h - 4);
  // The ends curl back: a dark fold and a lit edge each side.
  for (const [x, dir] of [
    [0, 1],
    [w - 1, -1],
  ] as const) {
    g.fillStyle = '#5a5044';
    g.fillRect(x, mid - 3, 5 * dir, 6);
    g.fillStyle = '#9a9080';
    g.fillRect(x, mid - 3, 5 * dir, 1);
    g.fillStyle = '#3a3028';
    g.fillRect(x, mid + 2, 5 * dir, 1);
  }
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
  if (kind === 'ring') c = paintRing(w, h, false);
  else if (kind === 'ring-active') c = paintRing(w, h, true);
  else if (kind === 'plate') c = paintPlate(w, h);
  else if (kind === 'slot') c = paintSlot(w, h);
  else if (kind === 'recess') c = paintRecess(w, h, s.marble);
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
  else if (kind === 'book') c = paintBook(w, h, s.parchment);
  else if (kind === 'banner') c = paintBanner(w, h);
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
