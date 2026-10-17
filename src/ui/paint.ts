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
  cracks,
  crazed,
  dab,
  die,
  mix,
  posterise,
  px,
  quantise,
  ramp,
  speck,
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
 * MM6's HUD marble (critics, round 8): a mottle of three to six pixels at about eight
 * levels, sweeps no wider than ten, one-pixel warm-grey veins near a luminance of a hundred
 * following the stone's contours, two to four across a hand's width, the whole on the
 * five-bit grid of a 1998 frame buffer.
 */
function paintMarble(
  w: number,
  h: number,
  seed: number,
  base: Rgb = [159, 151, 148],
  spread = 1,
): HTMLCanvasElement {
  const c = cloudy(w, h, seed, {
    base,
    octaves: [
      [64, 10 * spread],
      [20, 6 * spread],
      [5, 8 * spread],
    ],
    tint: 4,
    grain: 3,
  });
  const g = c.getContext('2d')!;
  const light = base[0] > 140;
  // The veins wander gently (MM6's are streaks, not loops): a crisp core a pixel wide in
  // the warm grey, a soft halo three wide, a few of them per hand's width.
  cracks(
    g,
    w,
    h,
    seed + 31,
    Math.round((w * h) / 5000),
    [40, 130],
    light ? 'rgb(123,113,107)' : 'rgb(88,80,76)',
    0.25,
    light ? 'rgba(110,100,96,0.22)' : 'rgba(70,62,58,0.22)',
  );
  cracks(
    g,
    w,
    h,
    seed + 57,
    Math.round((w * h) / 12000),
    [20, 60],
    light ? 'rgb(104,94,90)' : 'rgb(70,62,58)',
    0.5,
  );
  quantise(g, w, h, 8);
  return c;
}

/**
 * MM6's sheet stone (critics, round 8): cool green-grey about (71,71,68), a spread of
 * thirteen, a one-pixel speckle of twelve levels either way, dark hairline fissures and a
 * few pale ones, a hundred-odd colours.
 */
function paintSlate(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = cloudy(w, h, seed, {
    base: [68, 72, 68],
    octaves: [
      [32, 7],
      [10, 5],
    ],
    tint: 3,
    grain: 12,
  });
  const g = c.getContext('2d')!;
  cracks(g, w, h, seed + 3, Math.round((w * h) / 4000), [20, 60], 'rgb(44,46,43)');
  cracks(g, w, h, seed + 9, Math.round((w * h) / 9000), [12, 30], 'rgb(92,95,90)', 0.9);
  quantise(g, w, h, 8);
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
  for (let i = 0; i < 110; i++) {
    const xb = r() * w;
    const amp = 1 + r() * 4;
    const period = 40 + r() * 90;
    const phase = r() * 10;
    const slope = (r() - 0.5) * 0.3;
    const tone = r() < 0.65 ? 20 + r() * 50 : 160 + r() * 70;
    const pts: [number, number][] = [];
    for (let y = 0; y <= h; y += 3) {
      pts.push([
        xb + slope * y + amp * Math.sin(y / period + phase) + Math.sin(y / 9 + phase * 2),
        y,
      ]);
    }
    stroke(g, w, h, pts, grey(tone), r() < 0.25 ? 2 : 1);
  }
  // Knots: rings of a darker tone, the grain bending round them.
  for (let i = 0; i < 8; i++) {
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
    // MM6's wood (critics, round 8): blacks at the bottom of the ramp, chestnut at the top.
    ramp('#000000', '#080000', '#210c08', '#2e1408', '#3c1c0c', '#4e2812', '#5e3418', '#73452a'),
    null,
    24,
    220,
  );
  return c;
}

/** MM6's inventory hide (critics, round 8): near-black (38,13,1), luminance 5 to 49, a one-pixel mottle. */
function paintLeather(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = cloudy(w, h, seed, {
    base: [35, 12, 0],
    octaves: [
      [8, 6],
      [3, 5],
    ],
    tint: 2,
    grain: 7,
  });
  quantise(c.getContext('2d')!, w, h, 4);
  return c;
}

/** Parchment: warm cream with broad faint stains and a light grain, on a four-level grid. */
function paintParchment(w: number, h: number, seed: number): HTMLCanvasElement {
  // MM6's page (critics, round 8): twenty-five levels between 167 and 207, a grain of 1.5.
  const c = cloudy(w, h, seed, {
    base: [200, 190, 172],
    octaves: [
      [32, 8],
      [8, 4],
    ],
    tint: 3,
    grain: 2,
  });
  quantise(c.getContext('2d')!, w, h, 4);
  return c;
}

/**
 * MM6's rest-screen marble (critics, round 8): (177,124,95), crazed into cells of thirty to
 * sixty pixels by crisp one-pixel pale cracks with a dark pixel along one side.
 */
function paintRose(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = cloudy(w, h, seed, {
    base: [177, 124, 95],
    octaves: [
      [48, 8],
      [12, 5],
    ],
    tint: 4,
    grain: 3,
  });
  const g = c.getContext('2d')!;
  crazed(g, w, h, seed + 11, Math.round((w * h) / 3000), 'rgb(214,178,158)', 'rgb(118,76,58)', 7);
  quantise(g, w, h, 8);
  return c;
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
    rose: paintRose(256, 256, 29),
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
 * A gold oval button, as MM6's (critics, round 8): the full range, a near-white specular at
 * the upper left falling through the golds to (90,60,10) at the lower right, a one-pixel
 * black outline, for a black glyph. Pressed, the light moves to the middle and the range
 * narrows. Buttons too wide for an oval are marble slabs (`paintSlab`).
 */
export function paintButton(w: number, h: number, pressed: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const stops: [number, Rgb][] = pressed
    ? [
        [0, [255, 240, 200]],
        [0.5, [214, 186, 99]],
        [1, [140, 104, 40]],
      ]
    : [
        [0, [255, 250, 225]],
        [0.22, [239, 215, 140]],
        [0.5, [214, 186, 99]],
        [0.78, [173, 146, 74]],
        [1, [90, 60, 10]],
      ];
  const cx = pressed ? 0.5 : 0.3;
  const cy = pressed ? 0.5 : 0.28;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      if (!inOval(x, y, w, h, 1)) {
        px(g, x, y, '#000000');
        continue;
      }
      const d = Math.min(
        1,
        Math.hypot((x + 0.5 - w * cx) / (w * 0.78), (y + 0.5 - h * cy) / (h * 0.78)),
      );
      let k = 0;
      while (k < stops.length - 2 && d > stops[k + 1]![0]) k++;
      const [d0, c0] = stops[k]!;
      const [d1, c1] = stops[k + 1]!;
      const col = mix(c0, c1, Math.max(0, Math.min(1, (d - d0) / (d1 - d0))));
      px(g, x, y, `rgb(${Math.round(col[0])},${Math.round(col[1])},${Math.round(col[2])})`);
    }
  }
  quantise(g, w, h, 8);
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
  // The lit member's thread brighter, within MM6's ceiling of (222,215,181) (critics, round 8).
  const thread: Rgb[] = active
    ? [
        [214, 196, 140],
        [222, 215, 181],
        [214, 196, 140],
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
 * A member's panel: the band's marble with MM6's seam round it (critics, round 8): one line
 * of (49,48,41) with a three-pixel shadow fading under its top and left, the line alone
 * below and right.
 */
export function paintRecess(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y += marble.height) {
    for (let x = 0; x < w; x += marble.width) g.drawImage(marble, x + 37, y + 61, w, h, x, y, w, h);
  }
  [0.34, 0.22, 0.1].forEach((a, i) => {
    g.fillStyle = `rgba(0,0,0,${a})`;
    g.fillRect(i + 1, i + 1, w - i - 1, 1);
    g.fillRect(i + 1, i + 1, 1, h - i - 1);
  });
  g.fillStyle = '#313029';
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
 * A leather spine, as MM6's (critics, round 8): a cylinder of dark leather lit a third of
 * the way in, six levels of noise on every pixel so it counts its colours in the dozens,
 * maroon bands ruled with gold, the neighbour's shadow along its left edge.
 */
export function paintSpine(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const r = die(w * 13 + h);
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let x = 0; x < w; x++) {
    const t = x / Math.max(1, w - 1);
    const k = (Math.cos((t - 0.32) * Math.PI * 1.25) + 1) / 2;
    const tone = mix([24, 14, 6], [74, 50, 22], k * k);
    for (let y = 0; y < h; y++) {
      const n = (r() - 0.5) * 12;
      const i = (y * w + x) * 4;
      d[i] = Math.max(0, Math.min(255, tone[0] + n));
      d[i + 1] = Math.max(0, Math.min(255, tone[1] + n * 0.8));
      d[i + 2] = Math.max(0, Math.min(255, tone[2] + n * 0.5));
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
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
  quantise(g, w, h, 8);
  return c;
}

/**
 * A tube, as MM6's bars (critics, round 8): the empty glass a warm-black well of six
 * columns, the fill a cylinder of six columns in MM6's greens or blues, and on the empty
 * tube a cap of five shaded gold rows top and bottom with a highlight on the second; the
 * fill stands inside the caps, so a full tube keeps its cap.
 */
export function paintTube(w: number, h: number, kind: 'empty' | 'hp' | 'sp'): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
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
  const glass: Rgb[] = [
    [33, 28, 24],
    [41, 36, 32],
    [57, 52, 49],
    [52, 47, 44],
    [45, 40, 36],
    [33, 28, 24],
  ];
  const ramp = kind === 'sp' ? blue : kind === 'hp' ? green : glass;
  for (let x = 0; x < w; x++) {
    const k = Math.min(5, Math.floor((x / Math.max(1, w)) * 6));
    const [cr, cg, cb] = ramp[k]!;
    g.fillStyle = `rgb(${cr},${cg},${cb})`;
    g.fillRect(x, 0, 1, h);
  }
  if (kind === 'empty') {
    const cap = ['#635929', '#ad9a4a', '#ad924a', '#9c8242', '#947531'];
    for (const [y0, up] of [
      [0, true],
      [h - 5, false],
    ] as const) {
      cap.forEach((tone, i) => {
        g.fillStyle = tone;
        g.fillRect(0, y0 + (up ? i : 4 - i), w, 1);
      });
      g.fillStyle = '#efd78c';
      g.fillRect(0, y0 + (up ? 1 : 3), Math.max(1, Math.floor(w * 0.4)), 1);
    }
  }
  return c;
}

/**
 * A condition gem, as MM6's (critics, round 8): a flat lozenge of (0,195-235,0) in a
 * one-pixel ring, (49,44,41) at the top left and a lit (181,178,173) lip at the bottom
 * right; no white cap, no shading.
 */
export function paintGem(w: number, h: number, kind: string): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const hearts: Record<string, Rgb> = {
    good: [0, 215, 0],
    weak: [215, 190, 40],
    ill: [215, 92, 40],
    out: [160, 160, 160],
    dead: [58, 58, 58],
  };
  const heart = hearts[kind] ?? hearts['good']!;
  const r = die(w * 31 + h + kind.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      if (!inOval(x, y, w, h, 1)) {
        px(g, x, y, litness(x, y, w, h) > 0 ? '#312c29' : '#b5b2ad');
        continue;
      }
      const n = (r() - 0.5) * 40;
      const col = heart.map((v) => (v === 0 ? 0 : Math.max(0, Math.min(255, Math.round(v + n)))));
      px(g, x, y, `rgb(${col[0]},${col[1]},${col[2]})`);
    }
  }
  quantise(g, w, h, 8);
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
  // MM6's shaft (critics, round 8): lit to 198 at the left edge sliding to 132 at the
  // right, with the marble's grain through it.
  for (let x = 0; x < w; x++) {
    const t = x / Math.max(1, w - 1);
    const k = (198 - t * 66) / 122;
    g.globalCompositeOperation = k > 1 ? 'screen' : 'multiply';
    const v = k > 1 ? Math.round((k - 1) * 255 * 0.7) : Math.round(k * 255);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, 0, 1, h);
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}

/**
 * The band's top edge, as MM6's (critics, round 8): a lip of (173,154,148) two rows deep, a
 * groove of (41,40,33), then a trough of (99,89,82) with a little grain down to the cells.
 */
export function paintRail(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#ad9a94';
  g.fillRect(0, 0, w, 2);
  g.fillStyle = '#292821';
  g.fillRect(0, 2, w, 1);
  g.fillStyle = '#635952';
  g.fillRect(0, 3, w, Math.max(0, h - 3));
  speck(g, w, h, w * 5 + h, 4);
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
  // The collar turns with the shaft (critics, round 8): lit at the left, in shade at the right.
  for (let x = rx; x < rx + rw; x++) {
    const t = (x - rx) / Math.max(1, rw - 1);
    const k = 1.22 - t * 0.5;
    g.globalCompositeOperation = k > 1 ? 'screen' : 'multiply';
    const v = k > 1 ? Math.round((k - 1) * 255 * 0.7) : Math.round(k * 255);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, y0, 1, collar);
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}

/** The lintel over the view, as MM6's (critics, round 8): seven rows of flat light marble, 173 to 189, no bevel. */
export function paintLintel(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  void marble;
  g.fillStyle = '#b5aea8';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#bdb6b0';
  g.fillRect(0, 0, w, 1);
  g.fillStyle = '#ada6a0';
  g.fillRect(0, h - 1, w, 1);
  speck(g, w, h, w * 3 + h, 4);
  return c;
}

/** The shelf's alcove: a dark recess under a light stone lip, the books standing on a wooden shelf. */
export function paintAlcove(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  // MM6's shelf (critics, rounds 6 and 8): three rows of light stone along the top, three of
  // black shadow under them, the books, then six rows of (57,36,16) wood.
  g.drawImage(marble, 0, 0, w, h, 0, 0, w, h);
  const wood = 6;
  g.fillStyle = '#1e1812';
  g.fillRect(0, 6, w, h - 6 - wood);
  g.fillStyle = '#b5aaa5';
  g.fillRect(0, 0, w, 3);
  g.fillStyle = '#000000';
  g.fillRect(0, 3, w, 3);
  g.fillStyle = '#392410';
  g.fillRect(0, h - wood, w, wood);
  const r = die(w * 11 + h);
  for (let i = 0; i < w; i += 2) {
    g.fillStyle = r() < 0.5 ? '#452c14' : '#2e1c0c';
    g.fillRect(i, h - wood + 1 + Math.floor(r() * (wood - 1)), 1 + Math.floor(r() * 4), 1);
  }
  g.fillStyle = '#5a3c1c';
  g.fillRect(0, h - wood, w, 1);
  g.fillStyle = '#0e0c0a';
  g.fillRect(0, 6, 1, h - 6 - wood);
  g.fillRect(w - 1, 6, 1, h - 6 - wood);
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
 * A screen's frame: marble `border` pixels wide round a clear middle, one dark line round
 * the outside with a lit lip inside it (critics, round 8: no double hairline, no corner
 * blocks), the stone within recessed under a dark lip above and left and a pale one below
 * and right.
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
  g.fillStyle = '#100c08';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  g.fillStyle = 'rgba(255,250,240,0.35)';
  g.fillRect(1, 1, w - 2, 1);
  g.fillRect(1, 1, 1, h - 2);
  g.fillStyle = 'rgba(10,8,6,0.45)';
  g.fillRect(1, h - 2, w - 2, 1);
  g.fillRect(w - 2, 1, 1, h - 2);
  // The recess and the rail's shadow onto the stone.
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
 * An open book filling a screen, as MM6's spellbook and quest log (critics, round 8): a dark
 * green leather cover, one parchment spread bowed across its width (a luminance of 164 at
 * the left edge rising to 210 at the middle and falling to 174 at the right), seven stacked
 * page edges stepping out along the foot and the right, and ribbon tabs cut diagonally
 * standing off the right edge; no corner brackets, no gutter line.
 */
export function paintBook(w: number, h: number, parchment: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const cover = cloudy(w, h, w * 3 + h, {
    base: [34, 62, 40],
    octaves: [
      [24, 6],
      [5, 4],
    ],
    tint: 2,
    grain: 3,
  });
  g.drawImage(cover, 0, 0);
  g.fillStyle = '#0e1c10';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  g.fillStyle = '#4a7a52';
  g.fillRect(1, 1, w - 2, 1);
  g.fillRect(1, 1, 1, h - 2);
  g.fillStyle = '#142218';
  g.fillRect(1, h - 2, w - 2, 1);
  g.fillRect(w - 2, 1, 1, h - 2);
  const top = 9;
  const left = 9;
  const right = w - 34;
  const bottom = h - 16;
  const pw = right - left;
  const ph = bottom - top;
  for (let i = 7; i >= 1; i--) {
    g.fillStyle = i % 2 ? '#9a8c70' : '#c8bc9e';
    g.fillRect(left + i, bottom + i - 1, pw, 1);
    g.fillRect(right + i - 1, top + i, 1, ph);
  }
  g.save();
  g.beginPath();
  g.rect(left, top, pw, ph);
  g.clip();
  for (let y = top; y < bottom; y += parchment.height) {
    for (let x = left; x < right; x += parchment.width) g.drawImage(parchment, x, y);
  }
  g.restore();
  const img = g.getImageData(left, top, pw, ph);
  const d = img.data;
  for (let x = 0; x < pw; x++) {
    const t = x / Math.max(1, pw - 1);
    const off = 164 + 41 * Math.sin(Math.PI * t) + 10 * t - 190;
    for (let y = 0; y < ph; y++) {
      const i = (y * pw + x) * 4;
      d[i] = Math.max(0, Math.min(255, d[i]! + off));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + off));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + off));
    }
  }
  g.putImageData(img, left, top);
  g.fillStyle = 'rgba(60,40,16,0.4)';
  g.fillRect(left, top, pw, 1);
  g.fillRect(left, top, 1, ph);
  // Ribbon tabs down the right, their lower corner cut on the slant, a band of the book's
  // colour across the head of each.
  const tabs = ['#8a2a24', '#2a5a3a', '#2a3a7a', '#7a5a18'];
  const tw = 16;
  const th = 30;
  const tx = right + 9;
  tabs.forEach((tone, i) => {
    const ty = top + 6 + i * (th + 6);
    const shape = (dx: number, dy: number): void => {
      g.beginPath();
      g.moveTo(tx + dx, ty + dy);
      g.lineTo(tx + tw + dx, ty + dy);
      g.lineTo(tx + tw + dx, ty + th - 9 + dy);
      g.lineTo(tx + tw - 9 + dx, ty + th + dy);
      g.lineTo(tx + dx, ty + th + dy);
      g.closePath();
    };
    g.fillStyle = 'rgba(0,0,0,0.45)';
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
  quantise(g, w, h, 4);
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

/** The clock's well, as MM6's (critics, round 8): a recess of (16,28,24), a (49,44,41) lip above and left, a (165,154,148) one below and right, for white type. */
export function paintPlaque(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#101c18';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#312c29';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = '#a59a94';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  return c;
}

/** The marble the tubes stand on (critics, round 8): a shadow of two columns at the left, marble to the right, no stripe. */
export function paintTubeSlot(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const s = surfaces ?? installPaint();
  for (let y = 0; y < h; y += s.marble.height) {
    for (let x = 0; x < w; x += s.marble.width)
      g.drawImage(s.marble, x + 120, y + 30, w, h, x, y, w, h);
  }
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, 0, 1, h);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(1, 0, 1, h);
  return c;
}

/** A spell's slot in the book (critics, round 5): a grey ellipse with a dark line and a lit crown. */
export function paintEllipse(
  w: number,
  h: number,
  parchment: HTMLCanvasElement,
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  // MM6's slot (critics, round 8): the page's own mottle twenty-six levels darker, flat, a
  // two-pixel edge half as dark, no outline, no emboss.
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
      const k = !inOval(x, y, w, h, 2) ? 13 : 26;
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
