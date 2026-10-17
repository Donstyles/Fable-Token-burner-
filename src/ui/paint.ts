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
  canvas,
  cloudy,
  dab,
  die,
  posterise,
  px,
  ramp,
  smudge,
  stroke,
} from '../render/brush';
import { PX } from './pixel-text';

/** The one gold of the shell, darkest to lightest. */
export const GOLD = {
  // MM6's bronze (critics, round 7: 185,155,91 at a third saturation, up to 255,231,181).
  line: '#312408',
  dark: '#5a4320',
  shadow: '#8a6e3c',
  body: '#b99b5b',
  light: '#d4b878',
  highlight: '#e8d2a0',
  glint: '#ffe7b5',
};

/**
 * MM6's HUD marble (critics, round 5: mean ~150,141,137, veins from 41 to 189): a grey-white
 * stone with warm and cool drifts, dark veins, nothing near white; twelve tones.
 */

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
  base: Rgb = [159, 151, 148],
  spread = 1,
): HTMLCanvasElement {
  // MM6's marble (critics, round 7): warm, hundreds of levels, a luminance spread of 24 to 45,
  // the veins soft smudges three to twenty-five pixels wide, no line on a fill.
  const c = cloudy(w, h, seed, {
    base,
    octaves: [
      [64, 30 * spread],
      [24, 16 * spread],
      [8, 7 * spread],
    ],
    tint: 6,
    grain: 4,
  });
  const g = c.getContext('2d')!;
  smudge(g, w, h, seed + 31, 10, 'rgb(60,52,50)', 0.16 * spread, [4, 18], [100, 260]);
  smudge(g, w, h, seed + 37, 7, 'rgb(240,232,226)', 0.14 * spread, [3, 12], [80, 220]);
  smudge(g, w, h, seed + 41, 5, 'rgb(40,34,34)', 0.22 * spread, [1, 3], [60, 160]);
  return c;
}

/**
 * Slate in three passes, as MM6's sheet: cloudy patches of a wide brush, a one-pixel
 * speckle, then veins as broken lines in the second-lightest tone; six tones, near-black to
 * pale mineral, grey-green.
 */
function paintSlate(w: number, h: number, seed: number): HTMLCanvasElement {
  // MM6's sheet stone (critics, round 7): (74,72,68), std 14, 69 levels, olive and blue patches,
  // no streaks: value noise at 24 and 6 pixels, a per-channel tint, a pixel of grain.
  return cloudy(w, h, seed, {
    base: [74, 72, 68],
    octaves: [
      [24, 14],
      [6, 10],
    ],
    tint: 6,
    grain: 4,
  });
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
  for (let i = 0; i < 2600; i++) {
    dab(g, w, h, r() * w, r() * h, 0.8, 0.8, 0, 128 + (r() - 0.5) * 90, 0.55);
  }
  // Near-black browns (critics, round 5: ~60,40,25), the brightest a dull chestnut.
  posterise(
    g,
    w,
    h,
    ramp('#120804', '#1c0c06', '#28130a', '#341a0c', '#422212', '#542c18', '#653824', '#73452a'),
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
  // MM6's page (critics, round 7): std 10 to 17, twenty-five levels between 167 and 207.
  return cloudy(w, h, seed, {
    base: [200, 190, 172],
    octaves: [
      [24, 10],
      [6, 8],
    ],
    tint: 3,
    grain: 4,
  });
}

export interface Surfaces {
  marble: HTMLCanvasElement;
  marbleDark: HTMLCanvasElement;
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
    marbleDark: paintMarble(256, 256, 19, [122, 113, 108], 0.9),
    slate: paintSlate(256, 256, 21),
    wood: paintWood(256, 168, 11),
    leather: paintLeather(192, 192, 5),
    parchment: paintParchment(256, 256, 3),
    mahogany: paintMahogany(256, 256, 17),
    rose: paintMarble(256, 256, 29, [174, 123, 100], 0.9),
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
  set('--stone-frame', surfaces.marbleDark);
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
      if (!inOval(x, y, w, h, 1)) tone = '#312408';
      else if (pressed) tone = !inOval(x, y, w, h, 2) ? GOLD.light : GOLD.highlight;
      else if (!inOval(x, y, w, h, 2)) tone = lit ? GOLD.body : '#ffe7b5';
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
  // MM6's wide buttons (critics, round 7): the rose marble with a one-pixel light bevel
  // (222,195,181) above and left and two dark rows (90,36,24) then black below and right.
  for (let y = 0; y < h; y += s.rose.height) {
    for (let x = 0; x < w; x += s.rose.width) g.drawImage(s.rose, x + 20, y + 140);
  }
  if (pressed) {
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 0, w, h);
  }
  g.fillStyle = pressed ? '#5a2418' : '#dec3b5';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = pressed ? '#dec3b5' : '#5a2418';
  g.fillRect(0, h - 2, w, 1);
  g.fillRect(w - 2, 0, 1, h);
  g.fillStyle = pressed ? '#dec3b5' : '#000000';
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
  // MM6's oval (critics, round 7), from the marble in: (41,44,41), (74,69,66), a four-pixel warm
  // silver bevel 173 to 156, two dark (99, 49), a three-pixel gold thread, a grey, two near
  // black, then the face; the lit member's thread brighter.
  const thread: Rgb[] = active
    ? [
        [222, 215, 181],
        [255, 248, 220],
        [222, 215, 181],
      ]
    : [
        [173, 142, 82],
        [222, 215, 181],
        [173, 142, 82],
      ];
  const bands: Rgb[] = [
    [41, 44, 41],
    [74, 69, 66],
    [173, 162, 165],
    [167, 158, 160],
    [161, 153, 153],
    [156, 150, 148],
    [99, 93, 90],
    [49, 46, 44],
    ...thread,
    [110, 104, 100],
    [18, 14, 12],
    [12, 10, 8],
  ];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      let k = 0;
      while (k < bands.length && inOval(x, y, w, h, k + 1)) k++;
      if (k >= bands.length) {
        const near = !inOval(x, y, w, h, bands.length + 3);
        px(g, x, y, y < h / 2 && near ? '#120e0a' : near ? '#2a2018' : '#1e1812');
        continue;
      }
      const l = litness(x, y, w, h);
      let [r0, g0, b0] = bands[k]!;
      if (k >= 2 && k <= 5 && l < -0.3) {
        r0 -= 20;
        g0 -= 20;
        b0 -= 20;
      }
      px(g, x, y, `rgb(${Math.max(0, r0)},${Math.max(0, g0)},${Math.max(0, b0)})`);
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
    [8, 20, 57],
    [24, 44, 132],
    [41, 81, 222],
    [132, 146, 231],
    [82, 113, 222],
    [24, 52, 156],
  ];
  // The empty glass: dark and neutral, the cylinder's own shading.
  const glass: Rgb[] = [
    [14, 14, 18],
    [22, 22, 28],
    [32, 32, 40],
    [48, 48, 58],
    [38, 38, 48],
    [22, 22, 30],
  ];
  const ramp = kind === 'sp' ? blue : kind === 'hp' ? green : glass;
  for (let x = 0; x < w; x++) {
    const k = Math.min(5, Math.floor((x / Math.max(1, w)) * 6));
    const [cr, cg, cb] = ramp[k]!;
    g.fillStyle = `rgb(${cr},${cg},${cb})`;
    g.fillRect(x, 0, 1, h);
  }
  if (kind === 'empty') {
    // Matte caps of two courses (critics, round 7: 148,125,66 over 140,109,49).
    for (const y of [0, h - 2]) {
      g.fillStyle = '#947d42';
      g.fillRect(0, y, w, 1);
      g.fillStyle = '#8c6d31';
      g.fillRect(0, y + 1, w, 1);
    }
  }
  return c;
}

/** A condition gem: a bead of three tones in a dark socket, a white speck at the top left. */
export function paintGem(w: number, h: number, kind: string): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  // MM6's gem (critics, round 7): a soft blob from (74,255,74) at its heart to (33,154,33) at
  // its rim, straight on the marble, no bezel, no white cap.
  const ramps: Record<string, [Rgb, Rgb]> = {
    good: [
      [74, 255, 74],
      [33, 154, 33],
    ],
    weak: [
      [255, 226, 90],
      [160, 128, 24],
    ],
    ill: [
      [255, 130, 80],
      [160, 56, 24],
    ],
    out: [
      [180, 180, 180],
      [90, 90, 90],
    ],
    dead: [
      [70, 70, 70],
      [20, 20, 20],
    ],
  };
  const [heart, rim] = ramps[kind] ?? ramps['good']!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      const d = Math.hypot((x + 0.5 - w * 0.42) / (w * 0.5), (y + 0.5 - h * 0.42) / (h * 0.5));
      const t = Math.max(0, Math.min(1, d));
      const edge = !inOval(x, y, w, h, 1) ? 0.72 : 1;
      const col = heart.map((v, i) => Math.round((v + (rim[i]! - v) * t) * edge));
      px(g, x, y, `rgb(${col[0]},${col[1]},${col[2]})`);
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
  const s = surfaces ?? installPaint();
  void marble;
  for (let y = 0; y < h; y += s.marbleDark.height) g.drawImage(s.marbleDark, 0, y);
  // MM6's shaft (critics, round 7): warm (181,174,165) at the left edge sliding to (107,97,99)
  // at the right, with the marble's grain through it.
  for (let x = 0; x < w; x++) {
    const t = x / Math.max(1, w - 1);
    const k = (181 - t * 74) / 122;
    g.globalCompositeOperation = k > 1 ? 'screen' : 'multiply';
    const v = k > 1 ? Math.round((k - 1) * 255 * 0.7) : Math.round(k * 255);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, 0, 1, h);
  }
  g.globalCompositeOperation = 'source-over';
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
  const collar = 8;
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
  // MM6's bands (critics, round 7): eight rows of matte (140,113,49) with one (173,150,82) row.
  const collarTones = [
    '#8c7131',
    '#8c7131',
    '#ad9652',
    '#8c7131',
    '#8c7131',
    '#8c7131',
    '#6a5424',
    '#4a3a18',
  ];
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
  // MM6's frame (critics, round 7): a dark line and two of pewter (66,69,66), no bevel.
  const top = ['#424542', '#424542'];
  const left = ['#424542', '#424542'];
  const bottom = ['#3a3d3a', '#3a3d3a'];
  const right = ['#3a3d3a', '#3a3d3a'];
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
  // MM6's cell (critics, round 7): leather at (35,12,2) with a mottle of two to four pixels,
  // a rust line (105,40,8) above and left, a dark line below and right.
  const c = cloudy(w, h, w * 17 + h, {
    base: [35, 12, 2],
    octaves: [
      [4, 14],
      [2, 8],
    ],
    grain: 5,
  });
  const g = c.getContext('2d')!;
  g.fillStyle = '#692808';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = '#100400';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
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
  // MM6's spread (critics, round 7): the right page a step darker than the left with a hard
  // edge, the gutter a single dark line, no airbrushed valley.
  const gx = Math.floor((left + right) / 2);
  g.fillStyle = 'rgba(40,24,8,0.14)';
  g.fillRect(gx, top, right - gx, bottom - top);
  g.fillStyle = 'rgba(30,18,6,0.8)';
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
  // MM6's compass plaque (critics, round 7): brass (156,146,118) with a lit edge above and
  // left and a dark one below and right, for dark serif numerals.
  g.fillStyle = '#9c9276';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#c4ba9a';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = '#5a5238';
  g.fillRect(0, h - 1, w, 1);
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
export function paintEllipse(
  w: number,
  h: number,
  parchment: HTMLCanvasElement,
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  // MM6's slot (critics, round 7): the page's own mottle ten to fourteen steps darker, a
  // two-pixel edge a little darker still, no outline.
  g.drawImage(parchment, 40, 60, w, h, 0, 0, w, h);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!inOval(x, y, w, h, 0)) {
        d[i + 3] = 0;
        continue;
      }
      const k = !inOval(x, y, w, h, 2) ? 20 : 12;
      d[i] = d[i]! - k;
      d[i + 1] = d[i + 1]! - k;
      d[i + 2] = d[i + 2]! - k;
    }
  }
  g.putImageData(img, 0, 0);
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
  else if (kind === 'ellipse') c = paintEllipse(w, h, s.parchment);
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
  else if (kind === 'marble-frame') c = paintMarbleFrame(w, h, s.marbleDark, 9);
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
