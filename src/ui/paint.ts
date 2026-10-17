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
  crazed2,
  dab,
  die,
  dither,
  mix,
  posterise,
  px,
  quantise,
  quantise565,
  ramp,
  speck,
  stroke,
  tails,
  valueNoise,
  veinWalk,
  veins,
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
 * MM6's HUD marble, to the critics' measured recipe (round 9): a base of (165,156,149), a
 * mottle at fourteen pixels of fourteen levels and at six pixels of seven, a warm-cool tint
 * at sixteen pixels (eight red, four blue), veins as two-pixel random walks stamped three
 * pixels wide as a multiply (twenty levels deep, soft), a Bayer checker, then RGB565 with
 * bit replication, so the highlights reach the 180s and the colours number in the dozens.
 */
function paintMarble(
  w: number,
  h: number,
  seed: number,
  base: Rgb = [165, 156, 149],
  spread = 1,
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const img = g.createImageData(w, h);
  const d = img.data;
  const nA = valueNoise(w, h, 14, seed);
  const nB = valueNoise(w, h, 6, seed + 101);
  const nT = valueNoise(w, h, 16, seed + 7);
  const r = die(seed + 13);
  for (let i = 0; i < w * h; i++) {
    const l = (nA[i]! * 28 + nB[i]! * 14) * spread + (r() - 0.5) * 4;
    const t = nT[i]! * 2;
    d[i * 4] = Math.max(0, Math.min(255, base[0] + l + 8 * t));
    d[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + l));
    d[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + l - 4 * t));
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  veinWalk(g, w, h, seed + 31, Math.round((w * h) / 2400), [40, 120], 0.86, 0.93);
  dither(g, w, h, 2);
  quantise565(g, w, h);
  return c;
}

/**
 * MM6's sheet stone (critics, rounds 8 and 9): cool green-grey about (71,71,68), a spread of
 * thirteen with both tails (lichen blotches eighteen levels light, pits eighteen dark, each
 * about eight percent), a one-pixel speckle of twelve levels, dark hairline fissures and a
 * few pale ones, a hundred-odd colours on a 64-level grid.
 */
function paintSlate(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = cloudy(w, h, seed, {
    base: [68, 72, 68],
    octaves: [
      [40, 7],
      [24, 9],
      [10, 4],
    ],
    tint: 3,
    grain: 12,
  });
  const g = c.getContext('2d')!;
  tails(g, w, h, seed + 21, 30, 18);
  cracks(g, w, h, seed + 3, Math.round((w * h) / 4000), [20, 60], 'rgb(44,46,43)');
  cracks(g, w, h, seed + 9, Math.round((w * h) / 9000), [12, 30], 'rgb(92,95,90)', 0.9);
  dither(g, w, h, 2);
  quantise(g, w, h, 4);
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
  // A one-pixel grain field stretched six to one along the wood (critics, round 9), then
  // the long lines: a hundred and ten, most dark, a few bright, sloping up to thirty degrees.
  const field = valueNoise(w, Math.max(1, Math.round(h / 6)), 3, seed + 23);
  const fieldH = Math.max(1, Math.round(h / 6));
  const fimg = g.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = field[Math.min(fieldH - 1, Math.floor(y / 6)) * w + x]! * 28;
      const i = (y * w + x) * 4;
      fimg.data[i] = Math.max(0, Math.min(255, fimg.data[i]! + v));
      fimg.data[i + 1] = fimg.data[i]!;
      fimg.data[i + 2] = fimg.data[i]!;
    }
  }
  g.putImageData(fimg, 0, 0);
  for (let i = 0; i < 110; i++) {
    const xb = r() * w;
    const amp = 1 + r() * 4;
    const period = 40 + r() * 90;
    const phase = r() * 10;
    const slope = (r() - 0.5) * 1.2;
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
  // Knots (critics, round 9): one elongated dark eye each, a faint ring or two round it.
  for (let i = 0; i < 8; i++) {
    const kx = r() * w;
    const ky = r() * h;
    const tilt = (r() - 0.5) * 0.5;
    for (let k = 2; k >= 1; k--) {
      g.strokeStyle = grey(96 + k * 16);
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(kx, ky, 2 + k * 2.5, 6 + k * 5, tilt, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = grey(30);
    g.beginPath();
    g.ellipse(kx, ky, 1.6, 5, tilt, 0, Math.PI * 2);
    g.fill();
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

/**
 * MM6's inventory hide (critics, rounds 8 and 9): near-black (38,13,1), luminance 5 to 49, a
 * one-pixel mottle under a slow one of eight levels, worn patches blending toward a tan
 * (120,72,28) where the hide has rubbed.
 */
function paintLeather(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = cloudy(w, h, seed, {
    base: [35, 12, 0],
    octaves: [
      [32, 8],
      [8, 6],
      [3, 5],
    ],
    tint: 2,
    grain: 7,
  });
  const g = c.getContext('2d')!;
  tails(g, w, h, seed + 17, 40, 10, [120, 72, 28]);
  dither(g, w, h, 2);
  quantise(g, w, h, 4);
  return c;
}

/** Parchment: warm cream, a tenth darker than before (critics, round 9), broad faint stains, a light grain, barely quantised. */
function paintParchment(w: number, h: number, seed: number): HTMLCanvasElement {
  // MM6's page (critics, rounds 8 and 9): 166 to 189, a grain of three, no bands.
  const c = cloudy(w, h, seed, {
    base: [182, 172, 155],
    octaves: [
      [32, 8],
      [8, 4],
    ],
    tint: 3,
    grain: 3,
  });
  quantise(c.getContext('2d')!, w, h, 2);
  return c;
}

/**
 * MM6's rest-screen marble (critics, rounds 8 and 9): (177,124,95), a slow mottle of thirty
 * pixels so the stone runs from 112 to 165, crazed into cells of sixty pixels by pale
 * cracks that broaden and fade along their length, with a dark side where they are strong.
 */
function paintRose(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = cloudy(w, h, seed, {
    base: [177, 124, 95],
    octaves: [
      [48, 10],
      [30, 9],
      [12, 5],
    ],
    tint: 4,
    grain: 3,
  });
  const g = c.getContext('2d')!;
  crazed2(g, w, h, seed + 11, 62, [214, 178, 158], [120, 80, 56], 7);
  dither(g, w, h, 2);
  quantise(g, w, h, 4);
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

/** A spine's emblem: a line drawing in a 24 by 40 box, and a solid part where the object is solid. */
export interface Emblem {
  line: string;
  fill?: string;
}

/**
 * The shelf's emblems, as MM6's reference shelf drew its sword, leaf, globe and key: gold
 * lines two pixels wide (critics, round 9). A sword, a satchel, an open book, a scroll, a
 * compass rose.
 */
export const EMBLEMS: Record<string, Emblem> = {
  sheet: { line: 'M12 3v21M7 24h10M12 24v10M9.5 35h5', fill: 'M12 2l2 4v17h-4V6z' },
  items: { line: 'M5 14h14l3 22H2zM9 14v-4a3 3 0 0 1 6 0v4M5 22h14' },
  spells: {
    line: 'M2 8c4-2 7-2 10 1v24c-3-3-6-3-10-1zM22 8c-4-2-7-2-10 1v24c3-3 6-3 10-1zM12 9v24M5 15c2-1 4-1 6 0M13 15c2-1 4-1 6 0',
  },
  quests: { line: 'M6 4h12v28H6zM9 11h6M9 17h6M9 23h4M6 32a2 2 0 0 0 4 0' },
  map: { line: 'M12 4l3 10 9 3-9 3-3 10-3-10-9-3 9-3zM15 17a3 3 0 1 0-6 0a3 3 0 1 0 6 0' },
};

/** A transparent speckle for the talk window (critics, round 9): a grain of eight levels over the head and its ground. */
export function paintSpeckle(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const r = die(w * 29 + h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = r();
      if (v < 0.3) px(g, x, y, 'rgba(255,255,255,0.05)');
      else if (v < 0.6) px(g, x, y, 'rgba(0,0,0,0.08)');
    }
  }
  return c;
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
 * A gold oval button, as MM6's (critics, round 9): a body of (156,130,74) lifted ninety
 * levels by a specular at the upper left and sunk sixty by a shade at the lower right, the
 * outer six pixels darkening toward (24,20,8), a one-pixel black outline, a three-pixel
 * shadow fading into the stone outside it; the peak a near-white (247,243,214); 64 levels.
 * Pressed, the light moves to the middle and the range narrows. Buttons too wide for an
 * oval are marble slabs (`paintSlab`).
 */
export function paintButton(w: number, h: number, pressed: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const margin = 3;
  const gauss = (dx: number, dy: number, sx: number, sy: number): number =>
    Math.exp(-((dx * dx) / (2 * sx * sx) + (dy * dy) / (2 * sy * sy)));
  const base: Rgb = [156, 130, 74];
  const lx = pressed ? 0.5 : 0.3;
  const ly = pressed ? 0.5 : 0.3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      // The shadow outside the outline, fading into the stone.
      if (!inOval(x, y, w, h, margin)) {
        let k = 0;
        while (k < margin && !inOval(x, y, w, h, k + 1)) k++;
        px(g, x, y, `rgba(0,0,0,${(0.6 * (k + 1)) / (margin + 1)})`);
        continue;
      }
      if (!inOval(x, y, w, h, margin + 1)) {
        px(g, x, y, '#000000');
        continue;
      }
      const sx = (x + 0.5) / w;
      const sy = (y + 0.5) / h;
      const lift = (pressed ? 60 : 90) * gauss(sx - lx, sy - ly, 0.25, 0.25);
      const sink = (pressed ? 30 : 60) * gauss(sx - 0.75, sy - 0.75, 0.4, 0.4);
      const dl = lift - sink;
      let col: Rgb = [base[0] * (1 + dl / 156), base[1] * (1 + dl / 156), base[2] * (1 + dl / 156)];
      if (dl > 40) col = mix(col, [247, 243, 214], Math.min(1, (dl - 40) / 50) * 0.7);
      // The rim: the last six pixels darken toward (24,20,8).
      let e = 0;
      while (e < 6 && inOval(x, y, w, h, margin + 1 + e + 1)) e++;
      if (e < 6) col = mix([24, 20, 8], col, 0.2 + (0.8 * e) / 6);
      px(g, x, y, `rgb(${Math.round(col[0])},${Math.round(col[1])},${Math.round(col[2])})`);
    }
  }
  quantise(g, w, h, 4);
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
  quantise565(g, w, h);
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
 * A member's panel, with MM6's edges (critics, round 9): along the top and left a groove
 * of (181,174,173) over (107,97,90), the dark line (49,48,41), then three rows of shadow
 * at 74, 82 and 90; along the right two light columns (173,170,156)/(198,190,189) and
 * along the foot two light rows (181,174,173)/(189,182,181).
 */
export function paintRecess(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y += marble.height) {
    for (let x = 0; x < w; x += marble.width) g.drawImage(marble, x + 37, y + 61, w, h, x, y, w, h);
  }
  const top = ['#b5aead', '#6b615a', '#313029', '#4a4642', '#524e4a', '#5a5652'];
  top.forEach((tone, i) => {
    g.fillStyle = tone;
    g.fillRect(i, i, w - i, 1);
    g.fillRect(i, i, 1, h - i);
  });
  g.fillStyle = '#adaa9c';
  g.fillRect(w - 2, 2, 1, h - 2);
  g.fillStyle = '#c6bebd';
  g.fillRect(w - 1, 1, 1, h - 1);
  g.fillStyle = '#b5aead';
  g.fillRect(2, h - 2, w - 2, 1);
  g.fillStyle = '#bdb6b5';
  g.fillRect(1, h - 1, w - 1, 1);
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
 * A leather spine, as MM6's (critics, round 9): flat (57,36,16) with a mottle of six levels
 * at one to three pixels, three-pixel edges darkening to near black, a bump of six at the
 * most down the middle, maroon bands ruled with gold; the emblem a gold line drawing two
 * pixels wide, its shade a pixel down and right, a thread of light a half up and left,
 * twelve levels of noise on the gold, the whole on RGB565.
 */
export function paintSpine(w: number, h: number, glyph: Emblem | null = null): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const r = die(w * 13 + h);
  const n2 = valueNoise(w, h, 2, w * 3 + h);
  const img = g.createImageData(w, h);
  const d = img.data;
  const edge: Rgb[] = [
    [8, 8, 8],
    [20, 16, 8],
    [33, 24, 8],
  ];
  for (let x = 0; x < w; x++) {
    const t = x / Math.max(1, w - 1);
    const bump = 6 * Math.cos((t - 0.5) * Math.PI) - 2;
    const e = Math.min(x, w - 1 - x);
    for (let y = 0; y < h; y++) {
      const i = y * w + x;
      const n = n2[i]! * 12 + (r() - 0.5) * 6 + bump;
      let col: Rgb = [57 + n, 36 + n * 0.8, 16 + n * 0.5];
      if (e < 3) col = mix(edge[e]!, col, 0.25);
      d[i * 4] = Math.max(0, Math.min(255, col[0]));
      d[i * 4 + 1] = Math.max(0, Math.min(255, col[1]));
      d[i * 4 + 2] = Math.max(0, Math.min(255, col[2]));
      d[i * 4 + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const bandTop = Math.round(h * 0.15) - 3;
  const bandBottom = Math.round(h * 0.85) - 3;
  for (const y of [bandTop, bandBottom]) {
    // A gold line, four of MM6's dark red, a gold line (critics, round 9: (90,0,0) with
    // (140,117,90) and (165,146,123)).
    g.fillStyle = '#8c755a';
    g.fillRect(2, y, w - 4, 1);
    g.fillStyle = '#5a0000';
    g.fillRect(2, y + 1, w - 4, 4);
    g.fillStyle = '#630000';
    g.fillRect(2, y + 1, Math.max(1, Math.floor(w * 0.4)), 2);
    g.fillStyle = '#a5927b';
    g.fillRect(2, y + 5, w - 4, 1);
  }
  if (glyph) {
    // The 24 by 40 drawing fitted between the bands, two pixels wide at the spine's scale.
    const boxTop = bandTop + 8;
    const boxBottom = bandBottom - 2;
    const scale = Math.min((w - 8) / 24, (boxBottom - boxTop) / 40);
    const ox = (w - 24 * scale) / 2;
    const oy = boxTop + (boxBottom - boxTop - 40 * scale) / 2;
    const line = new Path2D(glyph.line);
    const fill = glyph.fill ? new Path2D(glyph.fill) : null;
    const pass = (dx: number, dy: number, color: string, width: number): void => {
      g.save();
      g.translate(ox + dx, oy + dy);
      g.scale(scale, scale);
      g.lineWidth = width / scale;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = color;
      g.fillStyle = color;
      g.stroke(line);
      if (fill) {
        g.fill(fill);
        g.lineWidth = 1 / scale;
        g.stroke(fill);
      }
      g.restore();
    };
    pass(1, 1, 'rgb(115,85,41)', 2);
    pass(0, 0, 'rgb(214,186,99)', 2);
    pass(-0.5, -0.5, 'rgb(255,223,115)', 1);
    const gold = g.getImageData(0, 0, w, h);
    const gd = gold.data;
    const rr = die(w * 17 + h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      if (gd[o]! > 150 && gd[o + 2]! < 150 && gd[o]! > gd[o + 2]! + 40) {
        const n = (rr() - 0.5) * 24;
        gd[o] = Math.max(0, Math.min(255, gd[o]! + n));
        gd[o + 1] = Math.max(0, Math.min(255, gd[o + 1]! + n));
        gd[o + 2] = Math.max(0, Math.min(255, gd[o + 2]! + n * 0.6));
      }
    }
    g.putImageData(gold, 0, 0);
  }
  dither(g, w, h, 2);
  quantise565(g, w, h);
  return c;
}

/**
 * A tube, as MM6's bars: the empty glass a warm-black well of six columns, the fill a
 * cylinder of six columns in MM6's greens or blues; the gold caps are a separate overlay
 * (`paintTubeCaps`) painted over the fill, so a full tube keeps its cap.
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
  return c;
}

/** The tube's gold caps (critics, round 8): five shaded rows top and bottom, a highlight on the second, clear between. */
export function paintTubeCaps(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
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
 * A marble pillar as MM6 shaded it (critics, round 9): a convex profile with the highlight
 * one pixel in from the left edge, 168, 171, 162, 148, 136, 125, 113, 96 across the shaft,
 * through the marble's own grain.
 */
export function paintPillar(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const s = surfaces ?? installPaint();
  void marble;
  for (let y = 0; y < h; y += s.marbleDark.height) g.drawImage(s.marbleDark, 0, y);
  const profile = [168, 171, 162, 148, 136, 125, 113, 96];
  for (let x = 0; x < w; x++) {
    const t = (x / Math.max(1, w - 1)) * (profile.length - 1);
    const i = Math.min(profile.length - 2, Math.floor(t));
    const lum = profile[i]! + (profile[i + 1]! - profile[i]!) * (t - i);
    const k = lum / 122;
    g.globalCompositeOperation = k > 1 ? 'screen' : 'multiply';
    const v = k > 1 ? Math.round((k - 1) * 255 * 0.7) : Math.round(k * 255);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, 0, 1, h);
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}

/**
 * The band's top edge, as MM6's (critics, rounds 8 and 9): a lip of (173,154,148) two rows
 * deep, a groove of (41,40,33), then a trough of the marble at sixty-two percent down to
 * the cells.
 */
export function paintRail(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const s = surfaces ?? installPaint();
  for (let x = 0; x < w; x += s.marble.width) g.drawImage(s.marble, x, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = 'rgb(158,158,158)';
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#ad9a94';
  g.fillRect(0, 0, w, 2);
  g.fillStyle = '#292821';
  g.fillRect(0, 2, w, 1);
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
  const collar = 11;
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
    // The bell as three overlapping leaf lobes (critics, round 9): each outlined in
    // (41,40,41), filled a mid grey, lit (165,158,148) along its upper left, a grain of ten
    // over the lot.
    const bell = h - collar;
    g.fillStyle = '#3e3a38';
    g.fillRect(0, 3, w, Math.max(1, bell - 3));
    const lobes = 3;
    const ry = Math.max(3, (bell - 4) * 0.62);
    for (let i = 0; i < lobes; i++) {
      const cx = ((i + 0.5) * w) / lobes;
      const cy = bell - 1;
      const rxl = (w / lobes) * 0.78;
      g.fillStyle = '#6a6262';
      g.beginPath();
      g.ellipse(cx, cy, rxl, ry, 0, Math.PI, Math.PI * 2);
      g.closePath();
      g.fill();
      g.strokeStyle = '#a59e94';
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(cx - 1, cy - 1, rxl - 1.5, ry - 1.5, 0, Math.PI * 1.05, Math.PI * 1.6);
      g.stroke();
      g.strokeStyle = '#292829';
      g.beginPath();
      g.ellipse(cx, cy, rxl, ry, 0, Math.PI, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#292829';
      g.fillRect(Math.round(cx), Math.round(cy - ry + 2), 1, Math.max(1, Math.round(ry - 3)));
    }
    speck(g, w, bell, w * 7 + h, 10);
  }
  const [rx, rw] = rows[ring === 'below' ? h - 1 : 0]!;
  const y0 = ring === 'below' ? h - collar : 0;
  // MM6's collar (critics, round 9): eleven rows from a dark (165,142,74) at the top to a
  // bright (206,190,148) at the foot, a (198,182,140) highlight column one pixel in, the
  // whole fading to (132,97,33) at the right as the shaft turns away.
  for (let y = 0; y < collar; y++) {
    const ty = y / Math.max(1, collar - 1);
    const vert = mix([165, 142, 74], [206, 190, 148], ty);
    for (let x = rx; x < rx + rw; x++) {
      const tx = (x - rx) / Math.max(1, rw - 1);
      let col = mix(vert, [132, 97, 33], Math.pow(tx, 1.5));
      if (x - rx === 1) col = mix(col, [198, 182, 140], 0.7);
      px(g, x, y0 + y, `rgb(${Math.round(col[0])},${Math.round(col[1])},${Math.round(col[2])})`);
    }
  }
  return c;
}

/** The lintel over the view (critics, round 9): the marble itself, no brightening, a dark line along its foot. */
export function paintLintel(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let x = 0; x < w; x += marble.width) g.drawImage(marble, x, 0);
  g.fillStyle = '#292821';
  g.fillRect(0, h - 1, w, 1);
  return c;
}

/** The shelf's alcove: the marble's lip along the top, a black shadow, a dark recess, the books on a wooden shelf. */
export function paintAlcove(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  // MM6's shelf (critics, rounds 6, 8 and 9): three rows of the marble itself along the
  // top, three of black shadow under them, a recess of (16,14,10) (not black) behind the
  // books, then six rows of (57,36,16) wood.
  g.drawImage(marble, 0, 0, w, h, 0, 0, w, h);
  const wood = 6;
  g.fillStyle = '#100e0a';
  g.fillRect(0, 6, w, h - 6 - wood);
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
  return c;
}

/**
 * The rest button, as MM6's oval (critics, round 9): a body of (181,150,82), a near-white
 * (247,243,206) specular eight pixels wide a fifth of the way down, the bottom third sunk
 * toward dark, a (74,69,57) edge, RGB565; the moon glyph sits on it in black.
 */
export function paintCartouche(w: number, h: number, pressed: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const base: Rgb = pressed ? [196, 166, 100] : [181, 150, 82];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      if (!inOval(x, y, w, h, 1)) {
        px(g, x, y, '#4a4539');
        continue;
      }
      const dx = (x + 0.5 - w * 0.5) / 4;
      const dy = (y + 0.5 - h * (pressed ? 0.45 : 0.2)) / 3;
      const spec = Math.exp(-(dx * dx + dy * dy) / 2);
      let col = mix(base, [247, 243, 206], Math.min(1, spec));
      const ty = (y + 0.5) / h;
      const sink = ty < 0.7 ? 0 : (ty - 0.7) / 0.3;
      const k = 1 - 0.8 * (sink * sink * (3 - 2 * sink));
      col = [col[0] * k, col[1] * k, col[2] * k];
      px(g, x, y, `rgb(${Math.round(col[0])},${Math.round(col[1])},${Math.round(col[2])})`);
    }
  }
  quantise565(g, w, h);
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
 * A screen's frame (critics, round 9): no hairline, no flat band, no corner block; each
 * side an eight-pixel column of the marble shaded 176 at its outer edge to 106 at its inner
 * one, straight into the stone, the stone within under a dark line and a half-dark one.
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
  // The shading: a multiply or screen per column (and per row) from 176 to 106 over a
  // marble whose mean is about 122.
  const shade = (k: number): void => {
    g.globalCompositeOperation = k > 1 ? 'screen' : 'multiply';
    const v = k > 1 ? Math.round((k - 1) * 255 * 0.7) : Math.round(k * 255);
    g.fillStyle = `rgb(${v},${v},${v})`;
  };
  for (let i = 0; i < b; i++) {
    const k = (176 - (i / Math.max(1, b - 1)) * 70) / 122;
    shade(k);
    g.fillRect(i, 0, 1, h);
    g.fillRect(w - 1 - i, 0, 1, h);
    g.fillRect(0, i, w, 1);
    g.fillRect(0, h - 1 - i, w, 1);
  }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(8,8,6,0.85)';
  g.fillRect(b, b, w - 2 * b, 1);
  g.fillRect(b, b, 1, h - 2 * b);
  g.fillStyle = 'rgba(8,8,6,0.45)';
  g.fillRect(b + 1, b + 1, w - 2 * b - 2, 1);
  g.fillRect(b + 1, b + 1, 1, h - 2 * b - 2);
  g.fillStyle = 'rgba(170,170,160,0.6)';
  g.fillRect(b, h - b - 1, w - 2 * b, 1);
  g.fillRect(w - b - 1, b, 1, h - 2 * b);
  return c;
}

/**
 * An open book filling a screen, as MM6's spellbook and quest log (critics, rounds 8 and
 * 9): a green leather cover (28,80,60) with a two-band rim, one parchment spread with a
 * crease near its left edge sixty levels deep and a hump across the right page falling
 * toward the edge, the page stack along the right as MM6's irregular band of greys and
 * along the foot a dark crease then a ramp, and `tabs` page-coloured bookmarks with a
 * slanted outer corner and a black mark; no brackets, no shadows, no colour caps.
 */
export function paintBook(
  w: number,
  h: number,
  parchment: HTMLCanvasElement,
  tabs = 4,
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const cover = cloudy(w, h, w * 3 + h, {
    base: [28, 80, 60],
    octaves: [
      [24, 7],
      [5, 4],
    ],
    tint: 2,
    grain: 6,
  });
  g.drawImage(cover, 0, 0);
  g.fillStyle = '#184131';
  g.fillRect(0, 0, w, 2);
  g.fillRect(0, 0, 2, h);
  g.fillRect(0, h - 2, w, 2);
  g.fillRect(w - 2, 0, 2, h);
  g.fillStyle = '#215542';
  g.fillRect(2, 2, w - 4, 1);
  g.fillRect(2, 2, 1, h - 4);
  g.fillRect(2, h - 3, w - 4, 1);
  g.fillRect(w - 3, 2, 1, h - 4);
  const top = 9;
  const left = 9;
  const right = w - 34;
  const bottom = h - 16;
  const pw = right - left;
  const ph = bottom - top;
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
  const gx = pw * 0.08;
  for (let x = 0; x < pw; x++) {
    const t = x / Math.max(1, pw - 1);
    const crease = 1 - 0.35 * Math.exp(-(((x - gx) / 6) * ((x - gx) / 6)));
    const hump = t > 0.55 ? 25 * Math.sin((Math.PI * (t - 0.55)) / 0.45) : 0;
    const fall = t > 0.85 ? -20 * ((t - 0.85) / 0.15) : 0;
    for (let y = 0; y < ph; y++) {
      const i = (y * pw + x) * 4;
      for (let k = 0; k < 3; k++) {
        d[i + k] = Math.max(0, Math.min(255, d[i + k]! * crease + hump + fall));
      }
    }
  }
  g.putImageData(img, left, top);
  // The page stack: along the right MM6's band of greys, column by column; along the foot
  // a dark crease then a ramp of ten rows.
  const stack = [156, 115, 107, 148, 132, 107, 156, 115, 90, 66, 82, 57, 57];
  stack.forEach((l, i) => {
    g.fillStyle = `rgb(${l},${Math.round(l * 0.94)},${Math.round(l * 0.82)})`;
    g.fillRect(right + i, top + 2 + i, 1, ph);
  });
  g.fillStyle = 'rgb(107,100,88)';
  g.fillRect(left, bottom, pw + 4, 1);
  for (let i = 0; i < 10; i++) {
    const l = Math.round(115 + (173 - 115) * (i / 9));
    g.fillStyle = `rgb(${l},${Math.round(l * 0.94)},${Math.round(l * 0.82)})`;
    g.fillRect(left + 1 + i, bottom + 1 + i, pw + 4, 1);
  }
  // Bookmarks: page-coloured squares with the outer corner cut on the slant, a thin edge,
  // a black mark on each.
  const tw = 20;
  const th = 24;
  const tx = right + 14;
  for (let i = 0; i < tabs; i++) {
    const ty = top + 8 + i * (th + 8);
    const shape = (): void => {
      g.beginPath();
      g.moveTo(tx, ty);
      g.lineTo(tx + tw, ty);
      g.lineTo(tx + tw, ty + th - 6);
      g.lineTo(tx + tw - 6, ty + th);
      g.lineTo(tx, ty + th);
      g.closePath();
    };
    g.fillStyle = '#6b655a';
    shape();
    g.fill();
    g.save();
    shape();
    g.clip();
    g.fillStyle = '#bdb29c';
    g.fillRect(tx + 1, ty + 1, tw - 2, th - 2);
    g.restore();
    // The mark: a small black figure, one per bookmark, drawn in pixels.
    g.fillStyle = '#000000';
    const mx = tx + 6;
    const my = ty + 7;
    if (i % 4 === 0) {
      g.fillRect(mx + 3, my, 2, 9);
      g.fillRect(mx + 1, my + 2, 6, 2);
      g.fillRect(mx + 2, my + 9, 4, 1);
    } else if (i % 4 === 1) {
      g.fillRect(mx + 1, my + 1, 6, 1);
      g.fillRect(mx, my + 2, 8, 5);
      g.fillRect(mx + 1, my + 7, 6, 1);
      g.fillRect(mx + 3, my + 8, 2, 2);
    } else if (i % 4 === 2) {
      g.fillRect(mx, my + 8, 8, 2);
      g.fillRect(mx + 2, my + 5, 4, 3);
      g.fillRect(mx + 3, my + 1, 2, 4);
    } else {
      g.fillRect(mx + 3, my, 2, 10);
      g.fillRect(mx, my + 4, 8, 2);
    }
  }
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

/**
 * The clock's well, as MM6's (critics, round 9): near-black green marble (13,25,19) with
 * one- to two-pixel veins of (33,52,41) and (57,69,57) along noise contours and a grain of
 * four, a (49,44,41) lip above and left, a (165,154,148) one below and right, for white type.
 */
export function paintPlaque(w: number, h: number): HTMLCanvasElement {
  const c = cloudy(w, h, w * 7 + h, {
    base: [13, 25, 19],
    octaves: [
      [24, 4],
      [8, 2],
    ],
    grain: 4,
  });
  const g = c.getContext('2d')!;
  veins(g, w, h, w * 3 + h, 28, [-0.1, 0.16], 'rgb(33,52,41)');
  veins(g, w, h, w * 5 + h, 44, [0.04], 'rgb(57,69,57)');
  g.fillStyle = '#312c29';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = '#a59a94';
  g.fillRect(0, h - 1, w, 1);
  g.fillRect(w - 1, 0, 1, h);
  return c;
}

/**
 * The well both tubes stand in, as MM6's (critics, round 9): a three-column wall at the
 * left (33,28,24)/(57,52,49)/(82,77,74), (107,101,99) between the tubes, a light bevel of
 * three rows along the top, two light columns at the right, a (239,215,140) line under the
 * caps along the foot.
 */
export function paintTubeSlot(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#6b6563';
  g.fillRect(0, 0, w, h);
  ['#211c18', '#393431', '#524d4a'].forEach((tone, i) => {
    g.fillStyle = tone;
    g.fillRect(i, 0, 1, h);
  });
  ['#8c8a84', '#949294', '#a59a9c'].forEach((tone, i) => {
    g.fillStyle = tone;
    g.fillRect(0, i, w, 1);
  });
  g.fillStyle = '#8c8284';
  g.fillRect(w - 2, 0, 1, h);
  g.fillStyle = '#b5aaad';
  g.fillRect(w - 1, 0, 1, h);
  g.fillStyle = '#efd78c';
  g.fillRect(0, h - 1, w, 1);
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
  else if (kind.startsWith('spine-')) c = paintSpine(w, h, EMBLEMS[kind.slice(6)] ?? null);
  else if (kind === 'tube-caps') c = paintTubeCaps(w, h);
  else if (kind === 'speckle') c = paintSpeckle(w, h);
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
  else if (kind === 'marble-frame') c = paintMarbleFrame(w, h, s.marbleDark, 8);
  else if (kind === 'book' || kind.startsWith('book-'))
    c = paintBook(w, h, s.parchment, kind === 'book' ? 4 : Number(kind.slice(5)) || 0);
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
