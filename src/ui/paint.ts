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
  chroma,
  cloudy,
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
  stroke,
  valueNoise,
  type VeinOptions,
  noise1,
  roseVeins,
  stoneField,
  veinField,
  wisps,
} from '../render/brush';
import { arc, fill, polyline, quad, type Pt } from '../render/pen';
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

/** One pass of veins over a marble: how many per pixel, how long, how deep. */
interface VeinPass {
  density: number;
  length: [number, number];
  centre: number;
  side: number;
  heading?: number;
  spread?: number;
}

/** The HUD marble's veins (critics, round 11): continuous ones, and half as many faint one-pixel ones. */
const MARBLE_VEINS: VeinPass[] = [
  { density: 1 / 1200, length: [60, 160], centre: 0.82, side: 0.91 },
  { density: 1 / 2400, length: [30, 90], centre: 0.95, side: 1 },
];

/**
 * MM6's HUD marble, to the critics' measured recipe (rounds 9 to 11): a base of
 * (170,160,152), a mottle at fourteen pixels of forty levels and at six of fourteen, a
 * warm-cool tint at sixteen, six levels of grain, continuous veins about twenty levels deep
 * at the core, a Bayer checker, then RGB565 with bit replication.
 */
function paintMarble(
  w: number,
  h: number,
  seed: number,
  base: Rgb = [170, 160, 152],
  spread = 1,
  passes: readonly VeinPass[] = MARBLE_VEINS,
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const img = g.createImageData(w, h);
  const d = img.data;
  const nA = valueNoise(w, h, 14, seed);
  const nB = valueNoise(w, h, 6, seed + 101);
  const nT = valueNoise(w, h, 16, seed + 7);
  const r = die(seed + 13);
  for (let i = 0; i < w * h; i++) {
    const l = (nA[i]! * 40 + nB[i]! * 14) * spread + (r() - 0.5) * 12;
    const t = nT[i]! * 2;
    d[i * 4] = Math.max(0, Math.min(255, base[0] + l + 8 * t));
    d[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + l));
    d[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + l - 4 * t));
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  passes.forEach((p, k) => {
    const o: VeinOptions = { centre: p.centre, side: p.side };
    if (p.heading !== undefined) {
      o.heading = p.heading;
      o.spread = p.spread ?? 0.5;
    }
    veinField(g, w, h, seed + 31 + k * 16, Math.max(1, Math.round(w * h * p.density)), p.length, o);
  });
  dither(g, w, h, 2);
  quantise565(g, w, h);
  return c;
}

/**
 * MM6's sheet stone (critics, rounds 8 to 11): cool green-grey about (71,71,68) broken into
 * plates of two sizes, each offset and sloped, the seams only partly drawn, each drawn stretch
 * light or dark and never both, light streaks and smudges of their own, a jitter of red
 * against blue, 64 levels with no checker inside the plates.
 */
function paintSlate(w: number, h: number, seed: number): HTMLCanvasElement {
  // Round 12 (screens critic): a warmer grey base (67,66,63), deeper mottle, darker seams,
  // dark blotches, streaks along one heading instead of round smudges, a jitter on red only,
  // and MM6's sixteen bits.
  const c = cloudy(w, h, seed, {
    base: [67, 66, 63],
    octaves: [
      [40, 6],
      [24, 10],
      [10, 7],
    ],
    tint: 3,
    grain: 10,
  });
  const g = c.getContext('2d')!;
  stoneField(g, w, h, seed + 5, {
    offset: 9,
    slope: 6,
    light: 16,
    dark: 20,
    streaks: Math.round((w * h) / 150),
    smudges: 0,
  });
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const blot = valueNoise(w, h, 16, seed + 31);
  for (let i = 0; i < w * h; i++) {
    if (blot[i]! >= -0.28) continue;
    for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] = Math.max(0, d[i * 4 + ch]! - 14);
  }
  g.putImageData(img, 0, 0);
  const sr = die(seed + 37);
  for (let k = 0; k < Math.round((w * h) / 400); k++) {
    const a = ((-30 + (sr() - 0.5) * 40) * Math.PI) / 180;
    const len = 6 + sr() * 8;
    const x0 = sr() * w;
    const y0 = sr() * h;
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let t = 0; t < len; t++) {
      const x = Math.round(x0 + Math.cos(a) * t);
      const y = Math.round(y0 + Math.sin(a) * t);
      g.fillRect(((x % w) + w) % w, ((y % h) + h) % h, 1, 1);
    }
  }
  chroma(g, w, h, seed + 2, 6, true);
  quantise565(g, w, h);
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
 * Mahogany for the talk panel (DESIGN.md 16.15; critics, rounds 10 to 12): one slab of
 * vertical bands that never cross, sharing one gentle wobble, a third of them the slab's full
 * height: seventy dark ones one to three pixels wide, dashed, over a dark-brown edge, and
 * fifty light ones one or two wide on the ramp's top tones; the darks (8,0,0) to (42,14,8),
 * a mid tone of (74,47,31) and a top of (150,110,80); the grain after the colour as short
 * vertical specks, multiplied, then RGB565.
 */
function paintMahogany(w: number, h: number, seed: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, w, h);
  const grey = (t: number): string => `rgb(${Math.round(t)},${Math.round(t)},${Math.round(t)})`;
  for (let i = 0; i < 8; i++) {
    dab(
      g,
      w,
      h,
      r() * w,
      r() * h,
      12 + r() * 24,
      60 + r() * 100,
      (r() - 0.5) * 0.1,
      r() < 0.5 ? 104 : 150,
      0.3,
    );
  }
  // One wobble for the whole slab, so the bands run side by side and never cross (talk
  // critic, round 12: 120 strokes, the darks one to three pixels wide and dashed, each over a
  // brown stroke two pixels wider so its edge steps through dark brown, not black).
  const phi = r() * 10;
  const bands = 120;
  const order = Array.from({ length: bands }, (_, i) => i);
  for (let i = bands - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  for (let i = 0; i < bands; i++) {
    const dark = i < 70;
    const x0 = ((order[i]! + r()) * w) / bands;
    const slope = (r() - 0.5) * 0.3;
    const full = r() < 1 / 3;
    const len = full ? Math.max(150, Math.min(400, h + 20)) : 80 + r() * 120;
    const y0 = full ? -10 : r() * h;
    const pts: [number, number][] = [];
    for (let y = y0; y <= y0 + len; y += 3) {
      pts.push([x0 + slope * (y - y0) + 1.5 * Math.sin(y / 60 + phi), y]);
    }
    if (dark) {
      const width = r() < 0.25 ? 1 : r() < 0.67 ? 2 : 3;
      stroke(g, w, h, pts, grey(75), width + 2);
      let k = 0;
      while (k < pts.length - 1) {
        const dash = 1 + Math.floor(r() * 4);
        stroke(g, w, h, pts.slice(k, k + dash + 1), grey(30 + r() * 25), width);
        k += dash + 1 + Math.floor(r() * 2);
      }
    } else {
      stroke(g, w, h, pts, grey(165 + r() * 35), r() < 0.5 ? 1 : 2);
    }
  }
  for (let i = 0; i < 6; i++) {
    const kx = r() * w;
    const ky = r() * h;
    const tilt = (r() - 0.5) * 0.3;
    g.strokeStyle = grey(112);
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(kx, ky, 4.5, 11, tilt, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = grey(24);
    g.beginPath();
    g.ellipse(kx, ky, 1.6, 5, tilt, 0, Math.PI * 2);
    g.fill();
  }
  posterise(
    g,
    w,
    h,
    ramp('#080000', '#180400', '#2a0e08', '#33190e', '#4a2f1f', '#6a4630', '#875f43', '#966e50'),
    null,
    24,
    220,
  );
  // The grain after the colour (critics, round 11: per-pixel specks read as static, MM6's
  // grain runs with the wood): fourteen levels, smeared four pixels down.
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const noise = new Float32Array(w * (h + 3));
  for (let i = 0; i < noise.length; i++) noise[i] = (r() - 0.5) * 28;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let k = 0; k < 4; k++) v += noise[(y + k) * w + x]!;
      v /= 2;
      const i = (y * w + x) * 4;
      // Multiplied, so a dark band stays brown rather than greying.
      for (let ch = 0; ch < 3; ch++)
        d[i + ch] = Math.max(0, Math.min(255, d[i + ch]! * (1 + v / 100)));
    }
  }
  g.putImageData(img, 0, 0);
  quantise565(g, w, h);
  return c;
}

/**
 * MM6's inventory hide (critics, rounds 8 to 11): near-black (38,13,1), half the pixel grain of
 * before over a mottle of six to twelve pixels, bright flecks on a tenth, worn patches of
 * twenty-five to fifty pixels a step lighter, a jitter of red against blue.
 */
function paintLeather(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = cloudy(w, h, seed, {
    base: [35, 12, 0],
    octaves: [
      [32, 8],
      [9, 12],
      [3, 4],
    ],
    tint: 2,
    grain: 5,
  });
  const g = c.getContext('2d')!;
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const r = die(seed + 23);
  for (let p = 0; p < Math.round((w * h) / 365); p++) {
    const cx = r() * w;
    const cy = r() * h;
    const rad = Math.sqrt((25 + r() * 25) / Math.PI);
    const rx = rad * 1.3;
    const ry = rad * 0.8;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
        const i = ((((y % h) + h) % h) * w + (((x % w) + w) % w)) * 4;
        // Worn patches warm, not grey (screens critic, round 12).
        d[i] = Math.min(255, d[i]! + 12);
        d[i + 1] = Math.min(255, d[i + 1]! + 5);
      }
    }
  }
  g.putImageData(img, 0, 0);
  const fr = die(seed + 17);
  for (let i = 0; i < (w * h) / 10; i++) {
    g.fillStyle = fr() < 0.5 ? 'rgba(130,70,8,0.35)' : 'rgba(96,46,0,0.4)';
    g.fillRect(Math.floor(fr() * w), Math.floor(fr() * h), 1, 1);
  }
  chroma(g, w, h, seed + 3, 7, true);
  // MM6's hide carries no blue in its lights: blue at most a twentieth of the red.
  const lit = g.getImageData(0, 0, w, h);
  for (let i = 0; i < lit.data.length; i += 4) {
    lit.data[i + 2] = Math.min(lit.data[i + 2]!, Math.round(lit.data[i]! * 0.05));
  }
  g.putImageData(lit, 0, 0);
  quantise565(g, w, h);
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
 * MM6's rest-screen marble (critics, rounds 8 to 11): zones of twenty to thirty pixels from a
 * rust (168,108,76) to a pale pink (196,150,130), ten levels darker than before, a mottle of
 * eighteen; the crazing network, pale veins whose cores flare forty-five to seventy-five
 * levels bright, dark (120,80,56) veins along the stronger pale ones and a few of their own, a
 * jitter of red against blue.
 */
function paintRose(w: number, h: number, seed: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const img = g.createImageData(w, h);
  const d = img.data;
  const zone = valueNoise(w, h, 25, seed + 3);
  const nA = valueNoise(w, h, 12, seed + 5);
  const nB = valueNoise(w, h, 5, seed + 9);
  const r = die(seed + 1);
  for (let i = 0; i < w * h; i++) {
    const base = mix(
      [168, 108, 76],
      [196, 150, 130],
      Math.max(0, Math.min(1, 0.5 + zone[i]! * 1.6)),
    );
    const l = nA[i]! * 36 + nB[i]! * 10 + (r() - 0.5) * 8 - 10;
    d[i * 4] = Math.max(0, Math.min(255, base[0] + l));
    d[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + l));
    d[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + l));
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // Round 12 (screens critic: a crisp crackle where MM6 has soft veins): the crazing twice
  // as wide in pitch and softer, fewer pale veins, a seventh of the dark ones a deeper
  // brown, MM6's sixteen bits.
  crazed2(g, w, h, seed + 11, 110, [196, 151, 128], [120, 80, 56], 6);
  roseVeins(g, w, h, seed + 19, {
    pale: Math.round((w * h) / 900),
    dark: Math.round((w * h * 0.85) / 1500),
    paleTint: [1, 0.86, 0.8],
    darkColor: [120, 80, 56],
  });
  roseVeins(g, w, h, seed + 23, {
    pale: 0,
    dark: Math.round((w * h * 0.15) / 1500),
    paleTint: [1, 0.86, 0.8],
    darkColor: [72, 44, 30],
  });
  chroma(g, w, h, seed + 2, 6, true);
  quantise565(g, w, h);
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

/**
 * The shelf's emblems, as MM6's reference shelf drew its sword, leaf, globe and key (critics,
 * rounds 9 to 11): one-pixel lines on the grid of an 18 by 28 box, solid only where the object
 * is solid; a rapier on the diagonal, a satchel, a leaf, a key, a latticed globe.
 */
export const EMBLEM_ART: Record<string, () => Pt[]> = {
  // A sword that reads as one (HUD critic, round 12: the curled guard and the blob of a
  // pommel read as a broom): a one-pixel blade at fifteen degrees from upright, a straight
  // seven-pixel guard square to it at seven tenths of its length, a three-pixel grip and a
  // two-by-two pommel.
  sheet: () => {
    const along = (t: number): [number, number] => [
      14 - t * Math.sin(Math.PI / 12),
      0.5 + t * Math.cos(Math.PI / 12),
    ];
    const across: [number, number] = [Math.cos(Math.PI / 12), Math.sin(Math.PI / 12)];
    const guard = along(18.5);
    const pommel = along(23);
    return [
      ...polyline([along(0), along(18.5)]),
      ...polyline([
        [guard[0] - 3.5 * across[0], guard[1] - 3.5 * across[1]],
        [guard[0] + 3.5 * across[0], guard[1] + 3.5 * across[1]],
      ]),
      ...polyline([along(18.5), along(21.5)]),
      ...fill([
        [pommel[0] - 1, pommel[1] - 1],
        [pommel[0] + 1, pommel[1] - 1],
        [pommel[0] + 1, pommel[1] + 1],
        [pommel[0] - 1, pommel[1] + 1],
      ]),
    ];
  },
  items: () => [
    ...polyline([
      [3, 10],
      [14, 10],
      [16, 26],
      [1, 26],
      [3, 10],
    ]),
    ...polyline([
      [3, 10],
      [8.5, 16],
      [14, 10],
    ]),
    ...polyline(quad([6, 10], [8.5, 2], [11, 10])),
    ...fill([
      [7.5, 15.5],
      [9.5, 15.5],
      [9.5, 17.5],
      [7.5, 17.5],
    ]),
  ],
  spells: () => [
    ...polyline(quad([3, 26], [1, 8], [15, 1])),
    ...polyline(quad([3, 26], [17, 17], [15, 1])),
    ...polyline(quad([3, 26], [8, 13], [15, 1])),
    ...polyline([
      [3, 26],
      [1, 27],
    ]),
  ],
  quests: () => [
    ...polyline(arc(6, 6, 4, 4, 0, Math.PI * 2, 32)),
    ...polyline([
      [8.8, 8.8],
      [14.5, 26],
    ]),
    ...polyline([
      [12.7, 22.3],
      [15.5, 21.3],
    ]),
    ...polyline([
      [13.7, 25.2],
      [16.5, 24.2],
    ]),
  ],
  map: () => [
    ...polyline(arc(8.5, 14, 8, 8, 0, Math.PI * 2, 48)),
    ...polyline([
      [0.5, 14],
      [16.5, 14],
    ]),
    ...polyline(quad([2, 9.5], [8.5, 10.8], [15, 9.5])),
    ...polyline(quad([2, 18.5], [8.5, 19.8], [15, 18.5])),
    ...polyline([
      [8.5, 6],
      [8.5, 22],
    ]),
    ...polyline(arc(8.5, 14, 4, 8, -Math.PI / 2, Math.PI / 2, 24)),
    ...polyline(arc(8.5, 14, 4, 8, Math.PI / 2, (Math.PI * 3) / 2, 24)),
  ],
};

/** The class sigils in the portrait ovals, the same one-pixel gold on an 18-pixel box. */
export const SIGIL_ART: Record<string, () => Pt[]> = {
  knight: () => [
    ...polyline([
      [9, 1],
      [9, 11],
    ]),
    ...polyline([
      [5, 11],
      [13, 11],
    ]),
    ...polyline([
      [9, 12],
      [9, 15],
    ]),
    ...fill([
      [7.5, 15.5],
      [10.5, 15.5],
      [10.5, 17.5],
      [7.5, 17.5],
    ]),
  ],
  paladin: () => [
    ...polyline([
      [3, 2],
      [15, 2],
      [15, 8],
    ]),
    ...polyline(quad([15, 8], [15, 14], [9, 17])),
    ...polyline(quad([9, 17], [3, 14], [3, 8])),
    ...polyline([
      [3, 8],
      [3, 2],
    ]),
    ...polyline([
      [9, 4],
      [9, 13],
    ]),
    ...polyline([
      [6, 7],
      [12, 7],
    ]),
  ],
  archer: () => [
    ...polyline(quad([5, 1], [14, 9], [5, 17])),
    ...polyline([
      [5, 1],
      [5, 17],
    ]),
    ...polyline([
      [2, 9],
      [16, 9],
    ]),
    ...polyline([
      [13, 6],
      [16, 9],
      [13, 12],
    ]),
  ],
  cleric: () => [
    ...polyline(arc(9, 4.5, 3, 3, 0, Math.PI * 2, 24)),
    ...polyline([
      [9, 8],
      [9, 17],
    ]),
    ...polyline([
      [5, 11],
      [13, 11],
    ]),
  ],
  sorcerer: () => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? 8 : 3.3;
      pts.push([9 + rr * Math.cos(a), 9.5 + rr * Math.sin(a)]);
    }
    return polyline(pts);
  },
  druid: () => [
    ...polyline(quad([3, 16], [1, 4], [15, 2])),
    ...polyline(quad([3, 16], [16, 14], [15, 2])),
    ...polyline(quad([3, 16], [8, 9], [15, 2])),
  ],
};

/**
 * Gold line art onto a canvas, modelled (HUD critic, round 12: two tones read as stamped
 * foil; MM6's emblems carry 84 to 149): each gold pixel toned by which way it faces, the
 * light (255,231,181) where only its upper-left neighbour is clear, the shade (156,121,57)
 * where only its lower-right is, (232,210,140) where both are, the body (214,186,99)
 * inside; lighter toward the top of the art by up to twenty levels, a die of six; the
 * shadow (115,85,41) a pixel down and right where no gold falls.
 */
function drawGold(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  pixels: readonly Pt[],
  ox: number,
  oy: number,
  seed: number,
): void {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const gold = new Uint8Array(w * h);
  let top = h;
  let bottom = 0;
  for (const [x, y] of pixels) {
    const X = Math.round(x + ox);
    const Y = Math.round(y + oy);
    if (X >= 0 && X < w && Y >= 0 && Y < h) {
      gold[Y * w + X] = 1;
      top = Math.min(top, Y);
      bottom = Math.max(bottom, Y);
    }
  }
  const set = (i: number, r0: number, g0: number, b0: number): void => {
    d[i * 4] = Math.max(0, Math.min(255, Math.round(r0)));
    d[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(g0)));
    d[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(b0)));
    d[i * 4 + 3] = 255;
  };
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      if (gold[y * w + x] && !gold[(y + 1) * w + x + 1]) set((y + 1) * w + x + 1, 115, 85, 41);
    }
  }
  const r = die(seed);
  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : gold[y * w + x]!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!gold[i]) continue;
      const ul = !at(x - 1, y - 1);
      const lr = !at(x + 1, y + 1);
      const base: Rgb =
        ul && lr ? [232, 210, 140] : ul ? [255, 231, 181] : lr ? [156, 121, 57] : [214, 186, 99];
      const ramp = 20 - (40 * (y - top)) / Math.max(1, bottom - top);
      const n = (r() - 0.5) * 12;
      set(i, base[0] + ramp + n, base[1] + ramp + n, base[2] + (ramp + n) * 0.6);
    }
  }
  g.putImageData(img, 0, 0);
}

/** A class sigil for a portrait oval until the portraits are painted. */
export function paintSigil(w: number, h: number, classId: string): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const art = SIGIL_ART[classId];
  if (art) drawGold(g, w, h, art(), Math.floor((w - 18) / 2), Math.floor((h - 18) / 2), w * 3 + h);
  return c;
}

/** A transparent speckle for the talk window (critics, round 10): two-pixel blocks of sixteen levels over the head and its ground. */
export function paintSpeckle(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const r = die(w * 29 + h);
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const v = r();
      if (v < 0.3) g.fillStyle = 'rgba(255,255,255,0.08)';
      else if (v < 0.6) g.fillStyle = 'rgba(0,0,0,0.14)';
      else continue;
      g.fillRect(x, y, 2, 2);
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
      // The shadow outside the outline at the lower right only, fading from a half into the
      // stone over three pixels (critics, round 11: no ring all round).
      if (!inOval(x, y, w, h, margin)) {
        if (litness(x, y, w, h) > -0.15) continue;
        let k = 0;
        while (k < margin && inOval(x, y, w, h, k + 1)) k++;
        px(g, x, y, `rgba(0,0,0,${((0.5 * (k + 1)) / margin).toFixed(3)})`);
        continue;
      }
      if (!inOval(x, y, w, h, margin + 1)) {
        px(g, x, y, '#000000');
        continue;
      }
      const sx = (x + 0.5) / w;
      const sy = (y + 0.5) / h;
      const lift = (pressed ? 70 : 110) * gauss(sx - lx, sy - ly, 0.22, 0.22);
      const sink = (pressed ? 30 : 60) * gauss(sx - 0.75, sy - 0.75, 0.4, 0.4);
      const dl = lift - sink;
      let col: Rgb = [base[0] * (1 + dl / 156), base[1] * (1 + dl / 156), base[2] * (1 + dl / 156)];
      if (dl > 30) col = mix(col, [247, 243, 214], Math.min(1, (dl - 30) / 60));
      // The socket (critics, round 10): a near-black pool at the lower right with a soft edge.
      const sd = Math.hypot((x + 0.5 - w * 0.78) / w, (y + 0.5 - h * 0.78) / h);
      const socket = 1 - Math.max(0, Math.min(1, (sd - 0.16) / 0.06));
      col = mix(col, [col[0] * 0.1, col[1] * 0.1, col[2] * 0.1], pressed ? 0 : socket);
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
 * The portrait frame at MM6's proportions (HUD critic, round 12: MM6's rings are five to
 * eight pixels in a 69-pixel oval, leaving 71 to 83% open; ours had copied fourteen bands
 * into an oval half the size). Five bands from the outside in: grey stone for the others,
 * a silver and gold thread for the member in hand only; the stone a step lighter above and
 * darker below; the opening dark, lighter toward the bottom.
 */
export function paintRing(w: number, h: number, active: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const bands: Rgb[] = active
    ? [
        [41, 44, 41],
        [173, 166, 165],
        [222, 215, 156],
        [173, 142, 82],
        [33, 32, 33],
      ]
    : [
        [49, 48, 41],
        [82, 81, 74],
        [90, 89, 90],
        [123, 121, 115],
        [33, 32, 33],
      ];
  // The grey and silver bands take the light; the gold and the dark lines do not.
  const lit = active ? [false, true, false, false, false] : [false, true, true, true, false];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      let k = 0;
      while (k < bands.length && inOval(x, y, w, h, k + 1)) k++;
      if (k >= bands.length) {
        const t = y / Math.max(1, h - 1);
        px(g, x, y, t < 0.5 ? 'rgb(18,14,10)' : 'rgb(30,24,18)');
        continue;
      }
      let [r0, g0, b0] = bands[k]!;
      if (lit[k]) {
        const shift = y < h / 2 ? 12 : -16;
        r0 += shift;
        g0 += shift;
        b0 += shift;
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
 * A member's panel, with MM6's edges (HUD critic, round 12): along the top one light, one
 * dark and one gold row, then the marble; a dark left edge on the first cell only (the
 * others meet the previous cell's light ridge); along the right two light columns and along
 * the foot two light rows; and MM6's gold spandrel in the top-left corner, seven rows from
 * (165,146,82) to (189,174,123) out to the portrait oval's centre line, a dark line under it.
 */
export function paintRecess(
  w: number,
  h: number,
  marble: HTMLCanvasElement,
  first = false,
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y += marble.height) {
    for (let x = 0; x < w; x += marble.width) g.drawImage(marble, x + 37, y + 61, w, h, x, y, w, h);
  }
  ['#b5b2ad', '#635d5a', '#9c864a'].forEach((tone, i) => {
    g.fillStyle = tone;
    g.fillRect(0, i, w, 1);
  });
  if (first) {
    g.fillStyle = '#313031';
    g.fillRect(0, 0, 1, h);
    g.fillStyle = '#4a494a';
    g.fillRect(1, 1, 1, h - 1);
  }
  // The spandrel, to the oval's centre line (hud.css: the frame stands four pixels in and
  // is thirty-six wide).
  const x0 = first ? 2 : 0;
  const x1 = Math.min(w, 22);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const col = mix([165, 146, 82], [189, 174, 123], t);
    g.fillStyle = `rgb(${col.map(Math.round).join(',')})`;
    g.fillRect(x0, 3 + i, x1 - x0, 1);
  }
  g.fillStyle = '#635d5a';
  g.fillRect(x0, 10, x1 - x0, 1);
  g.fillStyle = '#adaa9c';
  g.fillRect(w - 2, 3, 1, h - 3);
  g.fillStyle = '#c6bebd';
  g.fillRect(w - 1, 3, 1, h - 3);
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
 * A leather spine, as MM6's (critics, rounds 9 to 11): flat (57,36,16) with a mottle of six
 * levels, edges darkening to near black over two pixels, a bump of six at most down the
 * middle, maroon bands ruled with gold, the emblem drawn as one-pixel gold line art on the grid
 * (`EMBLEM_ART`), the whole on RGB565.
 */
export function paintSpine(w: number, h: number, emblem: string | null = null): HTMLCanvasElement {
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
      if (e < 2) col = mix(edge[e + 1]!, col, 0.25);
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
    g.fillStyle = '#8c755a';
    g.fillRect(2, y, w - 4, 1);
    g.fillStyle = '#5a0000';
    g.fillRect(2, y + 1, w - 4, 4);
    g.fillStyle = '#630000';
    g.fillRect(2, y + 1, Math.max(1, Math.floor(w * 0.4)), 2);
    g.fillStyle = '#a5927b';
    g.fillRect(2, y + 5, w - 4, 1);
  }
  const art = emblem ? EMBLEM_ART[emblem] : undefined;
  if (art) drawGold(g, w, h, art(), Math.floor((w - 18) / 2), bandTop + 6, w * 17 + h);
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
 * A marble pillar as MM6 shaded it (critics, rounds 9 to 11): veins running down the shaft
 * within thirty degrees of upright, painted on a wider tile and cropped, then every column
 * scaled to the convex profile 96 plus 75 times the cosine of a quarter turn over t to the
 * 0.7, the highlight 171 one pixel in; on RGB565. The right pillar is this one mirrored.
 */
export function paintPillar(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  void marble;
  const tw = Math.max(w, 64);
  const tile = paintMarble(tw, h, w * 7 + h, [150, 141, 136], 1.2, [
    {
      density: 7 / (tw * h),
      length: [h / 3, h],
      centre: 0.82,
      side: 0.91,
      heading: Math.PI / 2,
      spread: Math.PI / 6,
    },
    {
      density: 4 / (tw * h),
      length: [h / 6, h / 2],
      centre: 0.95,
      side: 1,
      heading: Math.PI / 2,
      spread: Math.PI / 6,
    },
  ]);
  const [c, g] = canvas(w, h);
  g.drawImage(tile, Math.floor((tw - w) / 2), 0, w, h, 0, 0, w, h);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  let sum = 0;
  for (let i = 0; i < w * h; i++)
    sum += 0.299 * d[i * 4]! + 0.587 * d[i * 4 + 1]! + 0.114 * d[i * 4 + 2]!;
  const mean = sum / (w * h);
  for (let x = 0; x < w; x++) {
    const t = Math.max(0, x - 1) / Math.max(1, w - 2);
    const f = (96 + 75 * Math.cos((Math.PI / 2) * Math.pow(t, 0.7))) / mean;
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      d[i] = Math.min(255, d[i]! * f);
      d[i + 1] = Math.min(255, d[i + 1]! * f);
      d[i + 2] = Math.min(255, d[i + 2]! * f);
    }
  }
  g.putImageData(img, 0, 0);
  quantise565(g, w, h);
  return c;
}

/**
 * The band's top edge, as MM6's (critics, rounds 8 to 11): a lip of (173,154,148) two rows
 * deep, a groove of (41,40,33), then a trough of the marble at twice the spread taken to
 * sixty-two percent, veined deep after.
 */
export function paintRail(w: number, h: number): HTMLCanvasElement {
  const c = paintMarble(w, h, w * 5 + h, [170, 160, 152], 2, []);
  const g = c.getContext('2d')!;
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = 'rgb(158,158,158)';
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  veinField(g, w, h, w * 9 + h, Math.max(1, Math.round((w * h) / 900)), [60, 160], {
    centre: 0.8,
    side: 0.9,
  });
  quantise565(g, w, h);
  g.fillStyle = '#ad9a94';
  g.fillRect(0, 0, w, 2);
  g.fillStyle = '#292821';
  g.fillRect(0, 2, w, 1);
  return c;
}

/**
 * A capital or a plinth. The capital (critics, rounds 9 to 12): an abacus of three rows, lit
 * on top and dark beneath; a mid-grey bell of seven to nine irregular acanthus leaves, a few
 * tips breaking its outline; a small dark volute at each upper corner; the collar MM6's five
 * row bands turned with the shaft's cosine. The plinth: two steps. On RGB565.
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
  const collar = 10;
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
  });
  if (ring === 'below') {
    const bell = h - collar;
    g.fillStyle = 'rgba(255,250,240,0.35)';
    g.fillRect(0, 0, w, 1);
    g.fillStyle = 'rgba(20,16,12,0.6)';
    g.fillRect(0, 2, w, 1);
    // The bell (HUD critic, round 12: two rows of identical lobes read as pearls): a
    // mid-grey ground and seven to nine leaves, each a tear-drop three or four wide and four
    // to six tall with its tip turned out and down, jittered and sized apart, lit at the
    // upper left and never over 160, a dark pixel at its lower right; a few tips break the
    // bell's outline over the view.
    for (let y = 3; y < bell; y++) {
      const [x, rw2] = rows[y]!;
      g.fillStyle = 'rgb(90,85,82)';
      g.fillRect(x, y, rw2, 1);
    }
    const rr = die(w * 13 + h);
    const leafAt = new Uint8Array(w * h);
    const count = 7 + Math.floor(rr() * 3);
    const perRow = Math.ceil(count / 2);
    let tips = 0;
    for (let k = 0; k < count; k++) {
      const row = k % 2;
      const slot = Math.floor(k / 2);
      const cx = Math.round(((slot + 0.5 + row * 0.5) * w) / perRow + (rr() - 0.5) * 2);
      const cy = Math.round(3 + (row ? 5 : 0) + (rr() - 0.5) * 2);
      const lw = 3 + Math.floor(rr() * 2);
      const lh = 4 + Math.floor(rr() * 3);
      const out = cx < w / 2 ? -1 : 1;
      const breaks = tips < 4 && (cx < w * 0.2 || cx > w * 0.8) && rr() < 0.8;
      if (breaks) tips++;
      for (let dy = 0; dy < lh; dy++) {
        const t = (dy + 0.5) / lh;
        const half = Math.max(
          0.5,
          (lw / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.7),
        );
        const shift = Math.round(out * Math.max(0, t - 0.5) * 3);
        const y = cy + dy;
        if (y < 3 || y >= bell + (breaks ? 2 : 0)) continue;
        for (let dx = -Math.floor(half); dx <= Math.ceil(half) - 1; dx++) {
          const x = cx + dx + shift;
          if (x < 0 || x >= w) continue;
          const [ix, iw] = rows[Math.min(y, h - 1)]!;
          const inside = x >= ix && x < ix + iw && y < bell;
          if (!inside && !(breaks && dy >= lh - 3)) continue;
          const upperLeft = dx <= -Math.floor(half) + 1 && t < 0.6;
          const lum = upperLeft ? 140 + rr() * 16 : t < 0.5 ? 120 + rr() * 10 : 100 + rr() * 12;
          px(
            g,
            x,
            y,
            `rgb(${Math.round(lum)},${Math.round(lum * 0.95)},${Math.round(lum * 0.92)})`,
          );
          leafAt[y * w + x] = 1;
        }
      }
    }
    for (let y = 3; y < bell + 2 && y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        if (!leafAt[y * w + x] || leafAt[(y + 1) * w + x + 1]) continue;
        const [ix, iw] = rows[Math.min(y + 1, h - 1)]!;
        if (x + 1 < ix || x + 1 >= ix + iw || y + 1 >= bell) continue;
        px(g, x + 1, y + 1, rr() < 0.5 ? 'rgb(24,20,16)' : 'rgb(41,40,41)');
      }
    }
    // The volutes: a small dark C at each upper corner with one light pixel, no eye.
    for (const [vx, dir] of [
      [2, 1],
      [w - 3, -1],
    ] as const) {
      for (const [dx, dy] of [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ] as const) {
        px(g, vx + dir * dx, 4 + dy, 'rgb(41,40,41)');
      }
      px(g, vx, 4, 'rgb(140,134,132)');
    }
  }
  const [rx, rw] = rows[ring === 'below' ? h - 1 : 0]!;
  const y0 = ring === 'below' ? h - collar : 0;
  const bands: Rgb[] = [
    [192, 172, 122],
    [170, 147, 92],
    [170, 147, 92],
    [170, 147, 92],
    [170, 147, 92],
    [175, 154, 101],
    [175, 154, 101],
    [175, 154, 101],
    [190, 173, 123],
    [199, 184, 139],
  ];
  for (let y = 0; y < collar; y++) {
    const band = bands[Math.min(bands.length - 1, y)]!;
    for (let x = rx; x < rx + rw; x++) {
      const t = (x - rx) / Math.max(1, rw - 1);
      const k = 0.78 + 0.32 * Math.cos((Math.PI / 2) * Math.pow(t, 0.7));
      px(
        g,
        x,
        y0 + y,
        `rgb(${Math.min(255, Math.round(band[0] * k))},${Math.min(255, Math.round(band[1] * k))},${Math.min(255, Math.round(band[2] * k))})`,
      );
    }
  }
  quantise565(g, w, h);
  return c;
}

/** The lintel over the view (critics, round 11): a lighter marble with faint one-pixel veins, its top row (158,149,145) and its foot (154,146,143). */
export function paintLintel(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  void marble;
  const c = paintMarble(w, h, w * 3 + h, [178, 168, 161], 1, [
    { density: 1 / 2400, length: [30, 90], centre: 0.93, side: 1 },
  ]);
  const g = c.getContext('2d')!;
  g.fillStyle = '#9e9591';
  g.fillRect(0, 0, w, 1);
  g.fillStyle = '#9a928f';
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
 * The rest button, as MM6's oval (HUD critic, round 12): twenty-two by forty (aspect 0.55)
 * in its box, an (8,8,0) outline; a three-pixel bevel whose light follows the angle round the
 * oval (bright at the top, dark at the left and lower left), a one-pixel (214,178,99) rim
 * light at the lower right; the body (125,103,62) falling from 150 near the top to 60 at
 * the foot with a three-pixel mottle and a die; a (247,247,214) specular near the top; the
 * moon near black, a third of the width in radius, a warm edge at its lower right. RGB565.
 */
export function paintCartouche(w: number, h: number, pressed: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const ow = Math.min(w, 22);
  const oh = Math.min(h, 40);
  const ox = Math.floor((w - ow) / 2);
  const oy = Math.floor((h - oh) / 2);
  const n3 = valueNoise(ow, oh, 3, w * 5 + h);
  const r = die(w * 11 + h);
  const toned = (lum: number): Rgb => {
    const k = lum / 151;
    return [180 * k, 150 * k, 80 * k];
  };
  // The bevel's light by angle (y up, 0 at the right), between MM6's samples.
  const bevel = [85, 50, 60, 130, 130, 105, 70, 60, 50, 60, 90, 95, 85];
  const rowLum = (t: number): number => {
    const pts: [number, number][] = [
      [0, 160],
      [0.1, 150],
      [0.3, 125],
      [0.5, 100],
      [0.7, 88],
      [0.9, 60],
      [1, 55],
    ];
    for (let k = 1; k < pts.length; k++) {
      if (t <= pts[k]![0]) {
        const [t0, l0] = pts[k - 1]!;
        const [t1, l1] = pts[k]!;
        return l0 + ((t - t0) / (t1 - t0)) * (l1 - l0);
      }
    }
    return 55;
  };
  const lift = pressed ? 12 : 0;
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      if (!inOval(x, y, ow, oh, 0)) continue;
      const X = ox + x;
      const Y = oy + y;
      if (!inOval(x, y, ow, oh, 1)) {
        px(g, X, Y, 'rgb(8,8,0)');
        continue;
      }
      let col: Rgb;
      const deg =
        ((Math.atan2(-(y + 0.5 - oh / 2) / oh, (x + 0.5 - ow / 2) / ow) * 180) / Math.PI + 360) %
        360;
      if (!inOval(x, y, ow, oh, 4)) {
        const k = Math.floor(deg / 30);
        const f = deg / 30 - k;
        const lum = bevel[k]! + f * (bevel[k + 1]! - bevel[k]!);
        col = toned(lum + lift);
        // The rim light on the bevel's inner row, from -20 to -50 degrees.
        if (inOval(x, y, ow, oh, 3) && deg >= 310 && deg <= 340) col = [214, 178, 99];
      } else {
        const lum = rowLum(y / Math.max(1, oh - 1)) + n3[y * ow + x]! * 20 + (r() - 0.5) * 12;
        col = [125 * (lum / 106), 103 * (lum / 106), 62 * (lum / 106)];
        col = [col[0] + lift, col[1] + lift, col[2] + lift];
        const dx = (x + 0.5 - ow * 0.5) / 3.5;
        const dy = (y + 0.5 - oh * (pressed ? 0.18 : 0.12)) / 2.6;
        col = mix(col, [247, 247, 214], Math.min(1, Math.exp(-(dx * dx + dy * dy) / 2)));
      }
      px(
        g,
        X,
        Y,
        `rgb(${Math.max(0, Math.min(255, Math.round(col[0])))},${Math.max(0, Math.min(255, Math.round(col[1])))},${Math.max(0, Math.min(255, Math.round(col[2])))})`,
      );
    }
  }
  const mr = ow * 0.33;
  const mx = ox + ow * 0.5;
  const my = oy + oh * 0.56;
  const moon = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inA = Math.hypot(x + 0.5 - mx, y + 0.5 - my) < mr;
      const inB = Math.hypot(x + 0.5 - (mx + mr * 0.45), y + 0.5 - (my - mr * 0.3)) < mr * 0.85;
      if (inA && !inB) moon[y * w + x] = 1;
    }
  }
  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      if (moon[y * w + x]) px(g, x, y, '#080800');
      else if (moon[(y - 1) * w + x - 1]) px(g, x, y, '#634d29');
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
 * A screen's frame, as MM6's (critics, rounds 9 to 11): the lintel along the top and the foot
 * the light marble, bevelled twelve levels down on its outer row and fifteen on its inner one
 * and twelve up between; down each side a pillar of the rose marble at a quarter of its
 * saturation and a quarter brighter, turned with a cosine and stirred a little row by row,
 * with a two-row gold band at its head and foot; no line where it meets the stone.
 */
export function paintMarbleFrame(
  w: number,
  h: number,
  marble: HTMLCanvasElement,
  border: number,
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const s = surfaces ?? installPaint();
  void marble;
  const b = Math.min(border, Math.floor(Math.min(w, h) / 2) - 1);
  for (let x = 0; x < w; x += s.marble.width) {
    g.drawImage(s.marble, x, 0);
    g.drawImage(s.marble, x, h - b);
  }
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const band = (y0: number): void => {
    for (let y = 0; y < b; y++) {
      const k = y === 0 ? -12 : y === b - 1 ? -15 : 12;
      for (let x = 0; x < w; x++) {
        const i = ((y0 + y) * w + x) * 4;
        d[i] = Math.max(0, Math.min(255, d[i]! + k));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + k));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + k));
      }
    }
  };
  band(0);
  band(h - b);
  const rose = s.rose.getContext('2d')!.getImageData(0, 0, s.rose.width, s.rose.height).data;
  const rw = s.rose.width;
  const rh = s.rose.height;
  const rr = die(w * 5 + h);
  // The rose averaged over five rows (screens critic, round 12: its crazing cores made the
  // pillar four times as busy along its length as MM6's).
  const roseAt = (x: number, y: number, ch: number): number => {
    let sum = 0;
    for (let k = -2; k <= 2; k++)
      sum += rose[(((((y + k) % rh) + rh) % rh) * rw + (x % rw)) * 4 + ch]!;
    return sum / 5;
  };
  for (let y = 0; y < h; y++) {
    const stir = (rr() - 0.5) * 4;
    for (let i = 0; i < b; i++) {
      const k = 0.6 + 0.4 * Math.cos((Math.PI / 2) * (i / Math.max(1, b - 1)));
      for (const x of [i, w - 1 - i]) {
        const r0 = roseAt(x, y, 0);
        const g0 = roseAt(x, y, 1);
        const b0 = roseAt(x, y, 2);
        const lum0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
        const lum = 150 + (lum0 - 150) * 0.5;
        const di = (y * w + x) * 4;
        d[di] = Math.max(0, Math.min(255, (lum + (r0 - lum) * 0.25 + 25 + stir) * k));
        d[di + 1] = Math.max(0, Math.min(255, (lum + (g0 - lum) * 0.25 + 25 + stir) * k));
        d[di + 2] = Math.max(0, Math.min(255, (lum + (b0 - lum) * 0.25 + 25 + stir) * k));
        d[di + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  // MM6's gold bands: eleven rows each, a third and two thirds of the way down the side
  // (screens critic, round 12: MM6 at y31-41 and y120-130 of its 640 by 480).
  const goldRows: Rgb[] = [
    [198, 182, 132],
    [173, 150, 99],
    [173, 158, 99],
    [173, 158, 99],
    [181, 158, 107],
    [189, 174, 123],
    [189, 174, 123],
    [189, 174, 123],
    [189, 174, 132],
    [198, 182, 140],
    [206, 199, 156],
  ];
  for (const y0 of [Math.round(h * 0.065), Math.round(h * 0.25)]) {
    goldRows.forEach((col, j) => {
      if (y0 + j >= h - b) return;
      for (let i = 0; i < b; i++) {
        const k = 0.6 + 0.4 * Math.cos((Math.PI / 2) * (i / Math.max(1, b - 1)));
        g.fillStyle = `rgb(${Math.round(col[0] * k)},${Math.round(col[1] * k)},${Math.round(col[2] * k)})`;
        g.fillRect(i, y0 + j, 1, 1);
        g.fillRect(w - 1 - i, y0 + j, 1, 1);
      }
    });
  }
  g.clearRect(b, b, w - 2 * b, h - 2 * b);
  quantise565(g, w, h);
  return c;
}

/** True when a point lies inside a polygon (even-odd). */
function inPolygon(x: number, y: number, pts: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]!;
    const b = pts[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside;
  }
  return inside;
}

/**
 * The bookmarks' school pictures (critics, round 11: MM6's tab icons are painted sprites, not
 * glyphs): a shape in a fourteen by sixteen box, a one-pixel dark edge, lit from the upper
 * left through three tones to a highlight; five or six colours.
 */
const SCHOOL_SPRITES: Record<string, { ramp: Rgb[]; inside: (x: number, y: number) => boolean }> = {
  fire: {
    ramp: [
      [110, 20, 8],
      [200, 50, 10],
      [245, 120, 20],
      [252, 200, 60],
      [255, 245, 190],
    ],
    inside: (x, y) =>
      Math.hypot(x - 7, y - 11) < 4.6 ||
      (y < 11 && y >= 0 && Math.abs(x - 7 - 1.3 * Math.sin(y / 2.4)) < (y / 11) * 4.6),
  },
  air: {
    ramp: [
      [70, 90, 130],
      [130, 160, 200],
      [190, 210, 235],
      [225, 235, 248],
      [255, 255, 255],
    ],
    inside: (x, y) =>
      Math.hypot(x - 4, y - 9) < 3.6 ||
      Math.hypot(x - 8, y - 7) < 4.2 ||
      Math.hypot(x - 11, y - 10) < 3 ||
      (y > 9 && y < 13 && x > 1 && x < 13),
  },
  water: {
    ramp: [
      [15, 35, 90],
      [30, 70, 170],
      [50, 120, 220],
      [120, 180, 245],
      [230, 245, 255],
    ],
    inside: (x, y) =>
      Math.hypot(x - 7, y - 10) < 4.6 ||
      (y >= 1 && y < 10 && Math.abs(x - 7) < ((y - 1) / 9) * 4.6),
  },
  earth: {
    ramp: [
      [45, 35, 25],
      [95, 75, 50],
      [135, 110, 75],
      [175, 150, 105],
      [215, 200, 160],
    ],
    inside: (x, y) =>
      inPolygon(x + 0.5, y + 0.5, [
        [2, 13],
        [1, 8],
        [4, 4],
        [9, 3],
        [13, 6],
        [13, 12],
        [9, 15],
        [4, 15],
      ]),
  },
  spirit: {
    ramp: [
      [120, 80, 20],
      [190, 140, 40],
      [235, 195, 80],
      [250, 230, 140],
      [255, 255, 220],
    ],
    inside: (x, y) => {
      const r = Math.hypot(x - 7, y - 8);
      return r < 3.8 || (r < 6.8 && Math.abs(Math.sin(4 * Math.atan2(y - 8, x - 7))) > 0.92);
    },
  },
  mind: {
    ramp: [
      [60, 30, 80],
      [110, 60, 150],
      [160, 110, 200],
      [205, 170, 235],
      [250, 240, 255],
    ],
    inside: (x, y) => {
      const t = (x - 7) / 6.5;
      return Math.abs(t) < 1 && Math.abs(y - 8) < 4.2 * Math.sqrt(1 - t * t);
    },
  },
  body: {
    ramp: [
      [90, 10, 10],
      [160, 30, 30],
      [210, 60, 55],
      [240, 130, 120],
      [255, 220, 215],
    ],
    inside: (x, y) => {
      const X = (x - 7) / 5.6;
      const Y = (9 - y) / 5.6;
      return (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 < 0;
    },
  },
};

function paintSchoolIcon(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  school: string,
): void {
  const sprite = SCHOOL_SPRITES[school];
  if (!sprite) return;
  const W = 14;
  const H = 16;
  const inside = (x: number, y: number): boolean =>
    x >= 0 && x < W && y >= 0 && y < H && sprite.inside(x, y);
  let cx = 0;
  let cy = 0;
  let n = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (inside(x, y)) {
        cx += x;
        cy += y;
        n++;
      }
  if (!n) return;
  cx /= n;
  cy /= n;
  const rgb = (c: Rgb): string => `rgb(${c[0]},${c[1]},${c[2]})`;
  let best: Pt = [0, 0];
  let bestN = -Infinity;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const rim = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const lit = (-(x - cx) - (y - cy)) / 7;
      if (!rim && lit > bestN) {
        bestN = lit;
        best = [x, y];
      }
      const tone = rim
        ? sprite.ramp[0]!
        : lit > 0.35
          ? sprite.ramp[3]!
          : lit < -0.3
            ? sprite.ramp[1]!
            : sprite.ramp[2]!;
      px(g, x0 + x, y0 + y, rgb(tone));
    }
  }
  px(g, x0 + best[0], y0 + best[1], rgb(sprite.ramp[4]!));
  if (school === 'mind') {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (Math.hypot(x - 7, y - 8) < 2.4) px(g, x0 + x, y0 + y, rgb(sprite.ramp[1]!));
    px(g, x0 + 7, y0 + 8, '#000000');
    px(g, x0 + 6, y0 + 7, rgb(sprite.ramp[4]!));
  }
}

/**
 * An open book filling a screen, as MM6's spellbook and quest log (critics, rounds 8 to 11):
 * inside the screen's frame (the view's pillar down each side, its lintel above), a green
 * leather cover with a two-band rim under the lintel; one parchment page from the pillar to
 * the stack, with a crease near its left edge (a ridge, then a valley nearly half down, warm
 * in its depth, narrow on its left and wide on its right) and a hump over the right page;
 * the page stack down the right as eight separate one-pixel edges each with its own tone and
 * wander, the top corner cut on a diagonal; along the foot seven edges bowing with the page;
 * page-coloured bookmarks cut on the slant, one per school known, each with its painted
 * school picture.
 */
export function paintBook(
  w: number,
  h: number,
  parchment: HTMLCanvasElement,
  schools: readonly string[] = [],
  open: string | null = null,
  lift = 0,
): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const s = surfaces ?? installPaint();
  const B = 8;
  g.drawImage(paintMarbleFrame(w, h, s.marbleDark, B), 0, 0);
  const iw = Math.max(1, w - 2 * B);
  const ih = Math.max(1, h - 2 * B);
  const cover = cloudy(iw, ih, w * 3 + h, {
    base: [28, 80, 60],
    octaves: [
      [24, 7],
      [5, 4],
    ],
    tint: 2,
    grain: 6,
  });
  quantise(cover.getContext('2d')!, iw, ih, 4);
  g.drawImage(cover, B, B);
  g.fillStyle = '#184131';
  g.fillRect(B, B, iw, 2);
  g.fillStyle = '#215542';
  g.fillRect(B, B + 2, iw, 1);
  const top = B + 10;
  const left = B;
  const right = w - B - 34;
  const bottom = h - B - 22;
  const pw = Math.max(1, right - left);
  const ph = Math.max(1, bottom - top);
  // The page runs on under the foot, which is drawn over it (screens critic, round 12: the
  // page copied down from its last row streaked 57% of the columns).
  const deep = ph + 16;
  g.save();
  g.beginPath();
  g.rect(left, top, pw, deep);
  g.clip();
  for (let y = top; y < top + deep; y += parchment.height) {
    for (let x = left; x < right; x += parchment.width) g.drawImage(parchment, x, y);
  }
  g.restore();
  const img = g.getImageData(left, top, pw, deep);
  const d = img.data;
  const gx = pw * 0.09;
  for (let x = 0; x < pw; x++) {
    const t = x / Math.max(1, pw - 1);
    const width = x < gx ? 5 : 14;
    const valley = Math.exp(-(((x - gx) / width) * ((x - gx) / width)));
    const ridge = 12 * Math.exp(-(((x - gx + 10) / 5) * ((x - gx + 10) / 5)));
    // MM6's page is brightest a quarter of the way across and falls toward the stack
    // (screens critic, round 12: 201, 214, 210 ... 181 at 15 to 95% of the width).
    const hump = 12 * Math.exp(-(((t - 0.25) / 0.2) * ((t - 0.25) / 0.2)));
    const fall = (-22 * Math.max(0, t - 0.3)) / 0.7;
    for (let y = 0; y < deep; y++) {
      const i = (y * pw + x) * 4;
      for (let k = 0; k < 3; k++) {
        const warm = k === 0 ? 6 * valley : k === 2 ? -8 * valley : 0;
        d[i + k] = Math.max(
          0,
          Math.min(255, (d[i + k]! + lift) * (1 - 0.45 * valley) + ridge + hump + fall + warm),
        );
      }
    }
  }
  g.putImageData(img, left, top);
  g.fillStyle = 'rgba(60,40,16,0.4)';
  g.fillRect(left, top, pw, 1);
  const edgeTone = (l: number): string =>
    `rgb(${Math.round(l)},${Math.round(l * 0.94)},${Math.round(l * 0.82)})`;
  // The stack (screens critic, round 12): a mid-grey backing, its outer three columns
  // darker; eight edges that drift a pixel either way over ninety rows and never cross,
  // each in its own tone with a slow jitter along it; the top corner cut on a diagonal.
  g.fillStyle = 'rgb(100,96,86)';
  g.fillRect(right, top, 9, ph + 1);
  g.fillStyle = 'rgb(61,61,53)';
  g.fillRect(right + 9, top, 2, ph + 1);
  g.fillStyle = 'rgb(53,53,48)';
  g.fillRect(right + 11, top, 1, ph + 1);
  const stackL = [146, 112, 99, 142, 126, 103, 151, 110];
  const drift = stackL.map((_, i) => noise1(ph + 1, 90, w * 7 + i * 31));
  const jitter = stackL.map((_, i) => noise1(ph + 1, 20, w * 5 + i * 17));
  for (let y = 0; y <= ph; y++) {
    let prev = right - 1;
    stackL.forEach((L, i) => {
      if (y < Math.round(((i + 1) * 12) / 8)) return;
      const x = Math.max(prev + 1, right + i + Math.round(drift[i]![y]! * 2));
      prev = x;
      px(g, x, top + y, edgeTone(L + jitter[i]![y]! * 6));
    });
  }
  // The foot: the page's last two rows shaded, a (107,101,82) backing, seven edges sharing
  // one bow, then two rows down to the cover.
  const sweep = (x: number): number =>
    Math.sin((Math.PI * Math.min(x, pw - 1)) / Math.max(1, pw - 1));
  const common = noise1(pw + 12, 40, w * 11 + h);
  const footL = [165, 140, 107, 115, 132, 156, 173];
  const shade = g.getImageData(left, top, pw, deep);
  for (let x = 0; x < pw + 10; x++) {
    const base = bottom + Math.round(8 * sweep(x) + common[x]! * 6);
    if (x < pw) {
      for (const [dy, k] of [
        [2, 0.96],
        [1, 0.87],
      ] as const) {
        const yy = base - dy - top;
        if (yy < 0 || yy >= deep) continue;
        const i = (yy * pw + x) * 4;
        const col = [0, 1, 2].map((ch) => Math.round(shade.data[i + ch]! * k));
        px(g, left + x, base - dy, `rgb(${col[0]},${col[1]},${col[2]})`);
      }
    }
    g.fillStyle = 'rgb(107,101,82)';
    g.fillRect(left + x, base, 1, footL.length);
    footL.forEach((L, j) => px(g, left + x, base + j, edgeTone(L)));
    px(g, left + x, base + footL.length, 'rgb(123,121,115)');
    px(g, left + x, base + footL.length + 1, 'rgb(82,81,74)');
  }
  // Bookmarks (screens critic, round 12): MM6's pennants, page-textured and swallowtailed,
  // coming out from under the page over the stack and the board, one per school known at a
  // pitch of 26; the open one in the page's full tone, two pixels taller, its picture
  // breaking the top edge.
  const fw = 36;
  const fh = 22;
  const fx = right - 4;
  schools.forEach((school, i) => {
    const isOpen = school === open;
    const hh = fh + (isOpen ? 2 : 0);
    const ty = B + 14 + i * 26 - (isOpen ? 1 : 0);
    if (ty + hh > h - B) return;
    g.save();
    g.beginPath();
    g.rect(right, 0, w - right, h);
    g.clip();
    g.beginPath();
    g.moveTo(fx, ty);
    g.lineTo(fx + fw, ty);
    g.lineTo(fx + fw - 7, ty + hh / 2);
    g.lineTo(fx + fw, ty + hh);
    g.lineTo(fx, ty + hh);
    g.closePath();
    g.clip();
    for (let y = ty; y < ty + hh; y += parchment.height) {
      for (let x = fx; x < fx + fw; x += parchment.width) g.drawImage(parchment, x, y);
    }
    if (!isOpen) {
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(fx, ty, fw, hh);
    }
    g.fillStyle = 'rgb(120,110,92)';
    g.fillRect(fx, ty + hh - 1, fw, 1);
    g.restore();
    paintSchoolIcon(g, fx + 14, ty + 3 - (isOpen ? 3 : 0), school);
  });
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
 * A clock's well. The HUD's (critics, round 11): MM6's recess, a (16,28,24) floor with
 * hardly a mottle, lips of (41,44,41) then (74,69,66) above and left and (165,154,148) below
 * and right, on RGB565, for white type. The rest screen's (critics, rounds 10 and 11): near-
 * black green marble (10,18,13) with thirty-odd separate wisps of two to twelve pixels fading
 * from 0.8 to 0.4, under a (198,146,123) highlight on a (82,32,24)/(74,24,16) lip.
 */
export function paintPlaque(w: number, h: number, kind: 'hud' | 'rest' = 'hud'): HTMLCanvasElement {
  if (kind === 'hud') {
    const c = cloudy(w, h, w * 7 + h, { base: [16, 28, 24], octaves: [[12, 2]], grain: 1 });
    const g = c.getContext('2d')!;
    g.fillStyle = '#292c29';
    g.fillRect(0, 0, w, 1);
    g.fillRect(0, 0, 1, h);
    g.fillStyle = '#4a4542';
    g.fillRect(1, 1, w - 1, 1);
    g.fillRect(1, 1, 1, h - 1);
    g.fillStyle = '#a59a94';
    g.fillRect(0, h - 1, w, 1);
    g.fillRect(w - 1, 0, 1, h);
    quantise565(g, w, h);
    return c;
  }
  // The rest clock's well (screens critic, round 12: wisps over 4% where MM6's cover 23 to
  // 30%): a base mottle of eight and four, twelve long wisps of forty to a hundred and
  // twenty pixels and many short ones in (48,62,50).
  const c = cloudy(w, h, w * 7 + h, {
    base: [10, 18, 13],
    octaves: [
      [16, 8],
      [5, 4],
    ],
    grain: 2,
  });
  const g = c.getContext('2d')!;
  wisps(g, w, h, w * 3 + h, 12, [40, 120], [48, 62, 50], 0.8, 0.4);
  wisps(g, w, h, w * 5 + h, Math.round((w * h) / 70), [2, 8], [48, 62, 50], 0.8, 0.4);
  g.fillStyle = '#c6927b';
  g.fillRect(0, 0, w, 1);
  g.fillRect(0, 0, 1, h);
  g.fillStyle = '#522018';
  g.fillRect(1, 1, w - 1, 1);
  g.fillRect(1, 1, 1, h - 1);
  g.fillStyle = '#4a1810';
  g.fillRect(2, 2, w - 2, 1);
  g.fillRect(2, 2, 1, h - 2);
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

/**
 * MM6's parchment inside a spell's oval (icon critic, pass 1: (184,172,150), flat), the
 * colour an icon's own oval is keyed from (tools/lib/icon.ts ICON_PARCHMENT).
 */
export const SLOT_PARCHMENT: Rgb = [184, 172, 150];

/**
 * A spell's place: MM6's oval as the page's shadow (screens critic, round 12: the page
 * multiplied by 0.89, 0.86, 0.83, its grain showing through, one softer pixel at the rim),
 * 68 by 52, centred in its box, drawn for a multiply blend (screens.css `.spell-art`).
 */
export function paintEllipse(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const ow = Math.min(w, 68);
  const oh = Math.min(h, 52);
  const ox = Math.floor((w - ow) / 2);
  const oy = Math.floor((h - oh) / 2);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      if (!inOval(x, y, ow, oh, 0)) continue;
      g.fillStyle = inOval(x, y, ow, oh, 1) ? 'rgb(227,219,212)' : 'rgb(241,237,233)';
      g.fillRect(ox + x, oy + y, 1, 1);
    }
  }
  return c;
}

/**
 * The close glyph painted on the gold (screens critic, round 12: the SVG stroke landed on
 * fractional pixels): a seven-pixel cross of two one-pixel diagonals in black, a pale gold
 * pixel under each.
 */
function drawCross(g: CanvasRenderingContext2D, w: number, h: number, pressed: boolean): void {
  const x0 = Math.floor((w - 7) / 2);
  const y0 = Math.floor((h - 7) / 2) + (pressed ? 1 : 0);
  for (let i = 0; i < 7; i++) {
    for (const x of [x0 + i, x0 + 6 - i]) {
      px(g, x, y0 + i + 1, 'rgb(206,190,140)');
    }
  }
  for (let i = 0; i < 7; i++) {
    px(g, x0 + i, y0 + i, '#000000');
    px(g, x0 + 6 - i, y0 + i, '#000000');
  }
}

function buttonUrl(
  w: number,
  h: number,
  pressed: boolean,
  slab: boolean,
  glyph: 'cross' | null = null,
): string {
  const k = `${w}x${h}${pressed ? 'd' : 'u'}${slab ? 's' : 'o'}${glyph ?? ''}`;
  let url = buttonCache.get(k);
  if (!url) {
    const c = slab ? paintSlab(w, h, pressed) : paintButton(w, h, pressed);
    if (glyph === 'cross') drawCross(c.getContext('2d')!, w, h, pressed);
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
  const glyph = b.classList.contains('ui-close') ? 'cross' : null;
  b.style.setProperty('--btn-up', buttonUrl(w, h, false, slab, glyph));
  b.style.setProperty('--btn-down', buttonUrl(w, h, true, slab, glyph));
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
  else if (kind === 'recess-first') c = paintRecess(w, h, s.marble, true);
  else if (kind === 'trough') c = paintTrough(w, h);
  else if (kind === 'pilaster') c = paintPilaster(w, h, s.marble);
  else if (kind === 'tablet') c = paintTablet(w, h, s.marble);
  else if (kind === 'ellipse') c = paintEllipse(w, h);
  else if (kind === 'plaque') c = paintPlaque(w, h, 'hud');
  else if (kind === 'plaque-rest') c = paintPlaque(w, h, 'rest');
  else if (kind === 'tube-slot') c = paintTubeSlot(w, h);
  else if (kind === 'spine') c = paintSpine(w, h);
  else if (kind.startsWith('spine-')) c = paintSpine(w, h, kind.slice(6));
  else if (kind.startsWith('sigil-')) c = paintSigil(w, h, kind.slice(6));
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
  else if (kind === 'book' || kind.startsWith('book:')) {
    // `book:<school>,<school>@<open school>`: the bookmarks of the schools known.
    // The spellbook's page is MM6's lighter one (L about 205, its ovals about 173).
    const [known = '', open = null] = kind.slice(5).split('@');
    c = paintBook(
      w,
      h,
      s.parchment,
      known ? known.split(',') : [],
      open,
      kind.startsWith('book:') ? 28 : 0,
    );
  } else if (kind === 'banner') c = paintBanner(w, h);
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
