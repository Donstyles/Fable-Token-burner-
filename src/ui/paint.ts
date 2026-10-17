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
import {
  type Rgb,
  type Tone,
  canvas,
  dab,
  die,
  posterise,
  px,
  ramp,
  stroke,
} from '../render/brush';
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

/**
 * MM6's HUD marble (critics, round 5: mean ~150,141,137, veins from 41 to 189): a grey-white
 * stone with warm and cool drifts, dark veins, nothing near white; twelve tones.
 */
const MARBLE: Tone[] = Array.from({ length: 16 }, (_, k) => {
  const l = 54 + k * 8.5;
  return { cool: [l, l, l + 3], warm: [l + 6, l, l - 3] } as Tone;
});
/** The rest screen's rose marble (critics, round 6: ~172,121,97), sixteen tones. */
const ROSE: Tone[] = Array.from({ length: 16 }, (_, k) => {
  const t = k / 15;
  return {
    cool: [118 + t * 86, 72 + t * 92, 56 + t * 86],
    warm: [126 + t * 84, 74 + t * 88, 52 + t * 84],
  } as Tone;
});
/** The sheet's stone (critics, round 5: ~80,80,82 with blotches and dark veins): mid grey, eight tones. */
const SLATE: Tone[] = Array.from({ length: 16 }, (_, k) => {
  const l = 44 + k * 4.6;
  return { cool: [l, l, l + 2], warm: [l + 1, l, l - 3] } as Tone;
});

/**
 * Marble in three passes, as a 1998 painter laid it in: clouds of a wide brush at the scale
 * of a hand, then a fine grain of near-white and oatmeal, then soft veins two to four pixels
 * wide that fade in and out, with broken pale threads beside them; twelve tones, ivory to
 * grey-pink, the patches warm or cool.
 */
function paintMarble(
  w: number,
  h: number,
  seed: number,
  tones: Tone[] = MARBLE,
): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  // Clouds of a wide brush at two scales.
  for (let i = 0; i < 40; i++) {
    const tone = 128 + (r() - 0.5) * 50;
    dab(g, w, h, r() * w, r() * h, 26 + r() * 40, 14 + r() * 24, r() * Math.PI, tone, 0.5);
  }
  for (let i = 0; i < 90; i++) {
    const tone = 128 + (r() - 0.5) * 40;
    dab(g, w, h, r() * w, r() * h, 8 + r() * 14, 5 + r() * 9, r() * Math.PI, tone, 0.45);
  }
  // The figure: soft diagonal streaks three to six pixels wide, lighter and darker, as MM6's
  // marble (critics, round 6: no one-pixel lines on a fill, tones stepping 115 to 173).
  for (let v = 0; v < 14; v++) {
    let x = r() * w;
    let y = r() * h;
    let ang = -0.7 + (r() - 0.5) * 0.6;
    const pts: [number, number][] = [];
    const len = 100 + r() * 160;
    for (let t = 0; t < len; t += 3) {
      ang += (r() - 0.5) * 0.12;
      x += Math.cos(ang) * 3;
      y += Math.sin(ang) * 3;
      pts.push([x, y]);
    }
    const tone = r() < 0.5 ? 'rgba(235,230,226,' : 'rgba(60,52,50,';
    stroke(g, w, h, pts, `${tone}0.12)`, 3 + r() * 3);
    stroke(g, w, h, pts.slice(2, -2), `${tone}0.16)`, 1 + r() * 2);
  }
  // A grain a pixel wide over the lot.
  for (let i = 0; i < 2600; i++) {
    const tone = 128 + (r() - 0.5) * 44;
    const sz = 0.7 + r() * 1.2;
    dab(g, w, h, r() * w, r() * h, sz, sz, 0, tone, 0.55);
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
  posterise(g, w, h, tones, tint, 56, 200);
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
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  // MM6's sheet stone (critics, round 6): soft blotches twenty to forty pixels across, a
  // pixel-wide speckle over them, no linework at all, in sixteen close greys.
  for (let i = 0; i < 36; i++) {
    const tone = 128 + (r() - 0.5) * 26;
    const sz = 20 + r() * 20;
    dab(g, w, h, r() * w, r() * h, sz, sz * (0.6 + r() * 0.5), r() * Math.PI, tone, 0.5);
  }
  for (let i = 0; i < 90; i++) {
    const tone = 128 + (r() - 0.5) * 22;
    const sz = 8 + r() * 10;
    dab(g, w, h, r() * w, r() * h, sz, sz * (0.6 + r() * 0.5), r() * Math.PI, tone, 0.45);
  }
  for (let i = 0; i < 5200; i++) {
    const tone = 128 + (r() - 0.5) * 60;
    const sz = 0.6 + r() * 0.9;
    dab(g, w, h, r() * w, r() * h, sz, sz, 0, tone, 0.6);
  }
  const tint = (x: number, y: number): number => 0.5 + 0.5 * Math.sin((x - y * 0.7) / 70);
  posterise(g, w, h, SLATE, tint, 72, 184);
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

/**
 * Mahogany for the talk panel (DESIGN.md 16.15): one seamless slab, long slow grain in eight
 * reds and browns with the broad figure of the wood under it; no boards, no seams.
 */
function paintMahogany(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  const grey = (t: number): string => `rgb(${Math.round(t)},${Math.round(t)},${Math.round(t)})`;
  for (let i = 0; i < 10; i++) {
    dab(
      g,
      w,
      h,
      r() * w,
      r() * h,
      10 + r() * 22,
      50 + r() * 90,
      (r() - 0.5) * 0.2,
      r() < 0.5 ? 108 : 148,
      0.3,
    );
  }
  // Fine, high-contrast grain: ninety lines a pixel wide, most dark, a few bright.
  for (let i = 0; i < 90; i++) {
    const xb = r() * w;
    const amp = 1 + r() * 4;
    const period = 40 + r() * 90;
    const phase = r() * 10;
    const tone = r() < 0.65 ? 40 + r() * 50 : 160 + r() * 60;
    const pts: [number, number][] = [];
    for (let y = 0; y <= h; y += 3) {
      pts.push([xb + amp * Math.sin(y / period + phase) + Math.sin(y / 9 + phase * 2), y]);
    }
    stroke(g, w, h, pts, grey(tone), 1);
  }
  // Knots: rings of a darker tone, the grain bending round them.
  for (let i = 0; i < 4; i++) {
    const kx = r() * w;
    const ky = r() * h;
    for (let k = 4; k >= 0; k--) {
      g.strokeStyle = grey(70 + k * 14);
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(kx, ky, 1.5 + k * 1.2, 3 + k * 2.4, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
  for (let i = 0; i < 1800; i++) {
    dab(g, w, h, r() * w, r() * h, 0.8, 0.8, 0, 128 + (r() - 0.5) * 70, 0.5);
  }
  // Near-black browns (critics, round 5: ~60,40,25), the brightest a dull chestnut.
  posterise(
    g,
    w,
    h,
    ramp('#100804', '#1a0c06', '#26120a', '#32190c', '#3e2010', '#4e2a16', '#5e3620', '#6b4931'),
    null,
    50,
    205,
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
  // Cloudy, as MM6's pages (critics, round 5: ~189,174,156 to 206,199,181): soft clouds at
  // two scales in six close tones, so the steps between them read as a wash, not a dither.
  for (let i = 0; i < 40; i++) {
    const tone = 128 + (r() - 0.5) * 34;
    dab(g, w, h, r() * w, r() * h, 30 + r() * 60, 16 + r() * 36, r() * Math.PI, tone, 0.5);
  }
  for (let i = 0; i < 90; i++) {
    const tone = 128 + (r() - 0.5) * 22;
    dab(g, w, h, r() * w, r() * h, 10 + r() * 18, 6 + r() * 12, r() * Math.PI, tone, 0.4);
  }
  posterise(
    g,
    w,
    h,
    ramp(
      '#b2a28c',
      '#b7a791',
      '#bcac96',
      '#c0b19b',
      '#c5b6a0',
      '#c9bba6',
      '#cebfab',
      '#d2c4b1',
      '#d6c9b6',
      '#daceba',
    ),
    null,
    92,
    168,
  );
  return c;
}

export interface Surfaces {
  marble: HTMLCanvasElement;
  slate: HTMLCanvasElement;
  wood: HTMLCanvasElement;
  leather: HTMLCanvasElement;
  parchment: HTMLCanvasElement;
  mahogany: HTMLCanvasElement;
  rose: HTMLCanvasElement;
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
    mahogany: paintMahogany(256, 256, 17),
    rose: paintMarble(256, 256, 29, ROSE),
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
  set('--mahogany', surfaces.mahogany);
  set('--rose', surfaces.rose);
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
      // The light sits in the upper-left third (critics, round 5): a radial glint falling
      // to the body, a darker rim at the lower right, a black line round the lot.
      const d = Math.hypot((x + 0.5 - w * 0.34) / (w * 0.5), (y + 0.5 - h * 0.34) / (h * 0.5));
      const lit = x / w + y / h < 0.9;
      if (!inOval(x, y, w, h, 1)) tone = '#100a04';
      else if (pressed) tone = !inOval(x, y, w, h, 2) ? GOLD.light : GOLD.highlight;
      else if (!inOval(x, y, w, h, 2)) tone = lit ? GOLD.light : GOLD.dark;
      else if (d < 0.14) tone = '#fffac8';
      else if (d < 0.32) tone = GOLD.glint;
      else if (d < 0.52) tone = GOLD.highlight;
      else if (d < 0.8) tone = GOLD.light;
      else if (d < 1.1) tone = GOLD.body;
      else if (d < 1.4) tone = GOLD.shadow;
      else tone = GOLD.dark;
      px(g, x, y, tone);
    }
  }
  return c;
}

/** A wide button, as MM6's rest screen: a dark green slab with a hard bevel. */
export function paintSlab(w: number, h: number, pressed: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const s = surfaces ?? installPaint();
  // MM6's wide buttons (critics, round 6): the marble itself with a one-pixel light bevel
  // above and left and a dark one below and right, turned over when pressed.
  for (let y = 0; y < h; y += s.marble.height) {
    for (let x = 0; x < w; x += s.marble.width) g.drawImage(s.marble, x + 20, y + 140);
  }
  if (pressed) {
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 0, w, h);
  }
  g.fillStyle = pressed ? '#2a2420' : '#dcd4cc';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = pressed ? '#dcd4cc' : '#2a2420';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
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
  // MM6's oval (critics, round 6): from the outside in 41, 74, 173, 165, 156, 156, 115, 49;
  // the lit member's rim a step brighter, never white; a shadow on the lower right.
  const bands = [41, 74, active ? 190 : 173, 165, 156, 156, 115, 49];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      let k = 0;
      while (k < bands.length && inOval(x, y, w, h, k + 1)) k++;
      const l = litness(x, y, w, h);
      if (k >= bands.length) {
        const near = !inOval(x, y, w, h, 11);
        px(g, x, y, y < h / 2 && near ? '#120e0a' : near ? '#2a2018' : '#1e1812');
        continue;
      }
      let v = bands[k]!;
      if (k >= 2 && k <= 6 && l < -0.3) v -= 22;
      if (k >= 2 && k <= 5 && l > 0.5) v += 8;
      v = Math.max(20, Math.min(190, v));
      px(g, x, y, `rgb(${v + 4},${v},${v - 3})`);
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
  // MM6's band is one marble surface (critics, round 6): a member's seam is a single line
  // a dozen lum steps darker, no light line, no double outline.
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
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
  // Mottled dark red-brown leather (critics, round 5: ~77,55,29) with a noisy grain over the
  // spine's curve, lit a third of the way across.
  const leather = ['#1c1008', '#261608', '#2e1c0c', '#36220e', '#3c2810', '#452e14'];
  const r = die(w * 13 + h);
  for (let x = 0; x < w; x++) {
    const t = x / Math.max(1, w - 1);
    const l = Math.cos((t - 0.32) * Math.PI * 1.25);
    const k = l > 0.9 ? 5 : l > 0.6 ? 4 : l > 0.2 ? 3 : l > -0.3 ? 2 : l > -0.7 ? 1 : 0;
    for (let y = 0; y < h; y++) {
      const j = Math.max(0, Math.min(5, k + (r() < 0.22 ? (r() < 0.5 ? -1 : 1) : 0)));
      g.fillStyle = leather[j]!;
      g.fillRect(x, y, 1, 1);
    }
  }
  for (const y of [Math.round(h * 0.15) - 3, Math.round(h * 0.85) - 3]) {
    // A gold line, four of dark red, a gold line (critics, round 6: 82,0,0 and 148,134,107).
    g.fillStyle = '#94866b';
    g.fillRect(1, y, w - 2, 1);
    g.fillStyle = '#520000';
    g.fillRect(1, y + 1, w - 2, 4);
    g.fillStyle = '#6a0a06';
    g.fillRect(1, y + 1, Math.max(1, Math.floor(w * 0.4)), 2);
    g.fillStyle = '#94866b';
    g.fillRect(1, y + 5, w - 2, 1);
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
  // MM6's tubes (critics, round 6): six columns, the glass's own shading, no well, a gold cap
  // of three courses top and bottom.
  const green: Rgb[] = [
    [0, 48, 0],
    [0, 105, 8],
    [0, 178, 8],
    [0, 239, 16],
    [0, 211, 16],
    [0, 125, 8],
  ];
  const blue: Rgb[] = [
    [0, 4, 60],
    [8, 24, 124],
    [16, 56, 196],
    [40, 88, 240],
    [24, 70, 220],
    [8, 32, 132],
  ];
  const ramp = kind === 'sp' ? blue : green;
  const dim = kind === 'empty' ? 0.2 : 1;
  for (let x = 0; x < w; x++) {
    const k = Math.min(5, Math.floor((x / Math.max(1, w)) * 6));
    const [cr, cg, cb] = ramp[k]!;
    g.fillStyle = `rgb(${Math.round(cr * dim)},${Math.round(cg * dim)},${Math.round(cb * dim)})`;
    g.fillRect(x, 0, 1, h);
  }
  if (kind === 'empty') {
    for (const y of [0, h - 3]) {
      g.fillStyle = GOLD.dark;
      g.fillRect(0, y, w, 3);
      g.fillStyle = GOLD.body;
      g.fillRect(0, y + 1, w, 1);
      g.fillStyle = GOLD.highlight;
      g.fillRect(1, y + 1, Math.max(1, Math.floor(w / 2)), 1);
      g.fillStyle = GOLD.line;
      g.fillRect(0, y === 0 ? 2 : h - 1, w, 1);
    }
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
        const d = Math.hypot(x + 0.5 - w * 0.36, y + 0.5 - h * 0.36);
        tone = d < (w >= 8 ? 1.3 : 0.8) ? '#ffffff' : l > 0.2 ? r[2]! : l > -0.5 ? r[1]! : r[0]!;
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
  // MM6's shaft (critics, round 6): lit at the left edge, sliding to shade at the right.
  for (let x = 0; x < w; x++) {
    const t = x / Math.max(1, w - 1);
    const lift = Math.max(0, 0.28 - t * 0.9);
    if (lift > 0) {
      g.fillStyle = `rgba(255,250,244,${lift.toFixed(3)})`;
      g.fillRect(x, 0, 1, h);
    }
    const shade = Math.max(0, (t - 0.3) * 0.62);
    if (shade > 0) {
      g.fillStyle = `rgba(20,16,14,${shade.toFixed(3)})`;
      g.fillRect(x, 0, 1, h);
    }
  }
  g.fillStyle = 'rgba(10,8,6,0.6)';
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
    // A carved capital in shadow (critics, round 5): under the abacus the bell is dark grey,
    // a volute curling at each corner and three leaf tongues between, their edges lit from
    // the upper left, their hollows near black; the collar below.
    const bell = h - collar;
    g.fillStyle = '#3e3a38';
    g.fillRect(0, 3, w, Math.max(1, bell - 3));
    for (let y = 3; y < bell; y++) {
      const [ri, rwid] = rows[y]!;
      g.fillStyle = '#1e1c1a';
      if (ri > 0) {
        g.fillRect(0, y, ri, 1);
        g.fillRect(ri + rwid, y, w - ri - rwid, 1);
      }
    }
    const lobes = 3;
    const y0 = 4;
    const y1 = bell - 1;
    for (let i = 0; i < lobes; i++) {
      const x0 = Math.round((i * w) / lobes) + 2;
      const x1 = Math.round(((i + 1) * w) / lobes) - 2;
      const lw = x1 - x0;
      if (lw < 3) continue;
      for (let y = y0; y < y1; y++) {
        const k = y - y0;
        const inset = k >= 3 ? 0 : [Math.ceil(lw / 2) - 1, 1, 0][k]!;
        const [ri, rwid] = rows[y]!;
        const xs = Math.max(x0 + inset, ri);
        const xe = Math.min(x1 - inset, ri + rwid);
        if (xe <= xs) continue;
        g.fillStyle = k < 2 ? '#8a8480' : '#5c5856';
        g.fillRect(xs, y, xe - xs, 1);
        if (k >= 2) {
          g.fillStyle = '#9a948e';
          g.fillRect(xs, y, 1, 1);
          g.fillStyle = '#1e1c1a';
          g.fillRect(xe - 1, y, 1, 1);
        }
      }
      g.fillStyle = '#141210';
      g.fillRect(x0 + Math.floor(lw / 2), y0 + 3, 1, Math.max(1, y1 - y0 - 4));
    }
    // Volutes: a curl at each upper corner, lit along its outer turn.
    for (const [cx, dir] of [
      [4, 1],
      [w - 5, -1],
    ] as const) {
      g.strokeStyle = '#9a948e';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(cx, 7, 3, Math.PI * 0.5, Math.PI * 2.1);
      g.stroke();
      g.strokeStyle = '#141210';
      g.beginPath();
      g.arc(cx + dir * 0.5, 7.5, 1.6, Math.PI * 0.6, Math.PI * 1.9);
      g.stroke();
    }
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
  // MM6's shelf (critics, round 6): three rows of light stone along the top, three of black
  // shadow under them, the books, then a pale ledge with the marble shading under it.
  g.drawImage(marble, 0, 0, w, h, 0, 0, w, h);
  g.fillStyle = '#1e1812';
  g.fillRect(0, 6, w, h - 9);
  g.fillStyle = '#b5aaa5';
  g.fillRect(0, 0, w, 3);
  g.fillStyle = '#000000';
  g.fillRect(0, 3, w, 3);
  g.fillStyle = '#c6beb5';
  g.fillRect(0, h - 3, w, 1);
  g.fillStyle = '#847c78';
  g.fillRect(0, h - 2, w, 1);
  g.fillStyle = '#ada5a1';
  g.fillRect(0, h - 1, w, 1);
  g.fillStyle = '#0e0c0a';
  g.fillRect(0, 6, 1, h - 9);
  g.fillRect(w - 1, 6, 1, h - 9);
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
  // A thin frame (critics, round 6): a dark line, a dark-gold line inside it, no bevel.
  const top = ['#6a5020', '#2a2018'];
  const left = ['#6a5020', '#2a2018'];
  const bottom = ['#4a3814', '#1a1410'];
  const right = ['#4a3814', '#1a1410'];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inset = Math.min(x, y, w - 1 - x, h - 1 - y);
      let tone: string | null = null;
      if (inset === 0) tone = '#0a0806';
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
  const r = die(w * 17 + h);
  // MM6's cell (critics, round 6): leather at (38,12,1) with a blotchy grain, a one-pixel
  // rust line above and left, a two-pixel near-black shadow below and right, a sunken tile.
  g.fillStyle = '#260c01';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < Math.round((w * h) / 6); i++) {
    g.fillStyle = r() < 0.5 ? '#2e1004' : '#1e0800';
    g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1 + Math.floor(r() * 2), 1);
  }
  g.fillStyle = '#6b2408';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = '#100400';
  g.fillRect(0, h - 2, w, 2);
  g.fillRect(w - 2, 0, 2, h);
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
  // The cover's thickness (DESIGN.md 16.15): a raised ridge four pixels in, the leather
  // inside it a shade darker, so the boards read as boards and not a flat.
  g.fillStyle = '#2e1a0a';
  g.fillRect(5, 5, w - 10, h - 10);
  g.fillStyle = '#7a5030';
  g.fillRect(5, 5, w - 10, 1);
  g.fillRect(5, 5, 1, h - 10);
  g.fillStyle = '#140804';
  g.fillRect(5, h - 6, w - 10, 1);
  g.fillRect(w - 6, 5, 1, h - 10);
  // No cover band above the pages (critics, round 5): the pages fill the boards, three
  // stacked page edges three pixels each showing below and to the right.
  const top = 8;
  const left = 8;
  const right = w - 26;
  const bottom = h - 14;
  for (let i = 3; i >= 1; i--) {
    g.fillStyle = i % 2 ? '#a08c66' : '#cfc2a4';
    g.fillRect(left + i * 3 - 2, top + i * 3 - 2, right - left, bottom - top);
    g.fillStyle = '#6a5a3c';
    g.fillRect(left + i * 3 - 2, bottom + i * 3 - 3, right - left, 1);
  }
  g.save();
  g.beginPath();
  g.rect(left, top, right - left, bottom - top);
  g.clip();
  for (let y = top; y < bottom; y += parchment.height) {
    for (let x = left; x < right; x += parchment.width) g.drawImage(parchment, x, y);
  }
  // The left page darkens toward its outer edge over twenty-five pixels, as a bound page does.
  for (let d = 0; d < 25; d++) {
    const t = 1 - d / 25;
    g.fillStyle = `rgba(60,44,20,${(0.28 * t * t).toFixed(3)})`;
    g.fillRect(left + d, top, 1, bottom - top);
  }
  // The gutter: the pages curve down into the spine.
  const gx = Math.floor((left + right) / 2);
  for (let d = -40; d <= 40; d++) {
    const t = 1 - Math.abs(d) / 41;
    g.fillStyle = `rgba(40,24,8,${(0.34 * t * t * t).toFixed(3)})`;
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
  // Cloth tabs down the right edge of the cover, full size, each a shade darker at its
  // lower edge and lit along its top.
  // Parchment tabs (critics, round 5): full size, a chevron cut into the right edge, a dark
  // outline, a two-pixel shadow under each, a band of colour across the top for the book.
  const tabs = ['#8a2a24', '#2a5a3a', '#2a3a7a', '#7a5a18'];
  const tw = 17;
  const th = 32;
  tabs.forEach((tone, i) => {
    const tx = right + 4;
    const ty = top + 4 + i * (th + 4);
    const shape = (dx: number, dy: number): void => {
      g.beginPath();
      g.moveTo(tx + dx, ty + dy);
      g.lineTo(tx + tw + dx, ty + dy);
      g.lineTo(tx + tw - 5 + dx, ty + th / 2 + dy);
      g.lineTo(tx + tw + dx, ty + th + dy);
      g.lineTo(tx + dx, ty + th + dy);
      g.closePath();
    };
    g.fillStyle = 'rgba(0,0,0,0.4)';
    shape(2, 2);
    g.fill();
    g.fillStyle = '#1a0c06';
    shape(0, 0);
    g.fill();
    g.save();
    shape(0, 0);
    g.clip();
    g.fillStyle = '#c4b59f';
    g.fillRect(tx + 1, ty + 1, tw - 2, th - 2);
    g.fillStyle = tone;
    g.fillRect(tx + 1, ty + 1, tw - 2, 7);
    g.fillStyle = 'rgba(255,250,240,0.35)';
    g.fillRect(tx + 1, ty + 1, tw - 2, 1);
    g.restore();
  });
  // Corner ornaments: a gold angle with a stepped inner edge and a boss at the corner.
  const corner = (x: number, y: number, sx: number, sy: number): void => {
    g.fillStyle = GOLD.line;
    g.fillRect(x, y, 12 * sx, 4 * sy);
    g.fillRect(x, y, 4 * sx, 12 * sy);
    g.fillRect(x + 4 * sx, y + 4 * sy, 3 * sx, 2 * sy);
    g.fillRect(x + 4 * sx, y + 4 * sy, 2 * sx, 3 * sy);
    g.fillStyle = GOLD.body;
    g.fillRect(x + sx, y + sy, 10 * sx, 2 * sy);
    g.fillRect(x + sx, y + sy, 2 * sx, 10 * sy);
    g.fillStyle = GOLD.highlight;
    g.fillRect(x + sx, y + sy, 9 * sx, sy);
    g.fillRect(x + sx, y + sy, sx, 9 * sy);
    g.fillStyle = GOLD.glint;
    g.fillRect(x + 2 * sx, y + 2 * sy, sx, sy);
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
  // MM6's heading ribbon (critics, round 5): rounded ends, a dark line round it, a darker
  // band of parchment with a lit upper edge, for white script with a black outline.
  const rr = Math.max(2, Math.floor(h / 2));
  const ribbon = (inset: number): void => {
    g.beginPath();
    g.moveTo(rr, inset);
    g.lineTo(w - rr, inset);
    g.arc(w - rr, h / 2, Math.max(0.5, rr - inset), -Math.PI / 2, Math.PI / 2);
    g.lineTo(rr, h - inset);
    g.arc(rr, h / 2, Math.max(0.5, rr - inset), Math.PI / 2, (Math.PI * 3) / 2);
    g.closePath();
  };
  g.fillStyle = '#2a2018';
  ribbon(0);
  g.fill();
  g.fillStyle = '#a89878';
  ribbon(1);
  g.fill();
  g.fillStyle = '#c0b090';
  ribbon(2);
  g.fill();
  g.fillStyle = '#d8ccb0';
  g.fillRect(rr, 2, w - 2 * rr, 1);
  g.fillStyle = '#8a7a5a';
  g.fillRect(rr, h - 3, w - 2 * rr, 1);
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

/**
 * The band's one sunk trough (DESIGN.md 16.15): a dark umber floor with a faint mottle, a
 * shadow two deep under its upper edge and along its left, a lit lip below and right.
 */
export function paintTrough(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const r = die(w * 7 + h);
  g.fillStyle = '#26190f';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < Math.round((w * h) / 40); i++) {
    g.fillStyle = r() < 0.5 ? '#2c1e12' : '#20150c';
    g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1 + Math.floor(r() * 3), 1);
  }
  g.fillStyle = '#080503';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = '#140d07';
  g.fillRect(1, 1, w - 2, 1);
  g.fillRect(1, 1, 1, h - 2);
  g.fillStyle = '#4a3a2a';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  return c;
}

/**
 * A pilaster dividing the band: a marble shaft lit along its left edge and in shade along
 * its right, a cap and a base of three courses each.
 */
export function paintPilaster(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y += marble.height) {
    const rows = Math.min(marble.height, h - y);
    g.drawImage(marble, 90, 20, w, rows, 0, y, w, rows);
  }
  g.fillStyle = 'rgba(255,250,240,0.6)';
  g.fillRect(0, 0, 1, h);
  g.fillStyle = 'rgba(255,250,240,0.25)';
  g.fillRect(1, 0, 1, h);
  g.fillStyle = 'rgba(10,8,6,0.55)';
  g.fillRect(w - 1, 0, 1, h);
  g.fillStyle = 'rgba(10,8,6,0.25)';
  g.fillRect(w - 2, 0, 1, h);
  for (const y of [0, h - 3]) {
    g.fillStyle = y === 0 ? '#f0ece4' : '#d8d2c8';
    g.fillRect(0, y, w, 1);
    g.fillStyle = '#b8b0a4';
    g.fillRect(0, y + 1, w, 1);
    g.fillStyle = '#4a4440';
    g.fillRect(0, y + 2, w, 1);
  }
  return c;
}

/** The clock's stone tablet: marble with a bevel, lit above and left, in shade below and right. */
export function paintTablet(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.drawImage(marble, 30, 100, w, h, 0, 0, w, h);
  g.fillStyle = 'rgba(255,250,240,0.7)';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = 'rgba(255,250,240,0.3)';
  g.fillRect(1, 1, w - 2, 1);
  g.fillRect(1, 1, 1, h - 2);
  g.fillStyle = 'rgba(10,8,6,0.6)';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  g.fillStyle = 'rgba(10,8,6,0.3)';
  g.fillRect(1, h - 2, w - 2, 1);
  g.fillRect(w - 2, 1, 1, h - 2);
  return c;
}

/** The clock's recess (critics, round 6): grey a step below the marble, a shadow line above, a ledge below. */
export function paintPlaque(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#6b6163';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#424242';
  g.fillRect(0, 0, w, 1);
  g.fillStyle = '#565052';
  g.fillRect(0, 0, 1, h);
  g.fillStyle = '#a5a5a5';
  g.fillRect(0, h - 1, w, 1);
  g.fillStyle = '#8a8486';
  g.fillRect(w - 1, 0, 1, h);
  return c;
}

/** The slot both tubes stand in (critics, round 5): a two-pixel dark border round a dark-grey fill. */
export function paintTubeSlot(w: number, h: number): HTMLCanvasElement {
  // The marble beside the tubes (critics, round 6): a shadow of two columns at the left
  // (33,57,82), the marble between, a highlight of two columns at the right (140,181,198).
  const [c, g] = canvas(w, h);
  g.fillStyle = '#6b6563';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#213952';
  g.fillRect(0, 0, 2, h);
  g.fillStyle = '#8cb5c6';
  g.fillRect(w - 2, 0, 2, h);
  return c;
}

/** A spell's slot in the book (critics, round 5): a grey ellipse with a dark line and a lit crown. */
export function paintEllipse(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  // MM6's slot (critics, round 6): an oval a dozen steps darker than the page, its edge a
  // step softer, no outline.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      const tone = !inOval(x, y, w, h, 1)
        ? '#b8ab96'
        : !inOval(x, y, w, h, 2)
          ? '#b2a590'
          : '#ab9e8a';
      px(g, x, y, tone);
    }
  }
  return c;
}

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
  else if (kind === 'trough') c = paintTrough(w, h);
  else if (kind === 'pilaster') c = paintPilaster(w, h, s.marble);
  else if (kind === 'tablet') c = paintTablet(w, h, s.marble);
  else if (kind === 'ellipse') c = paintEllipse(w, h);
  else if (kind === 'plaque') c = paintPlaque(w, h);
  else if (kind === 'tube-slot') c = paintTubeSlot(w, h);
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
