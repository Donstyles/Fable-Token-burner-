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
  // Round 12 (screens critic): a warmer grey base, deeper mottle, darker seams, dark
  // blotches, streaks along one heading instead of round smudges, a jitter on red only, and
  // MM6's sixteen bits. Round 13 (it overshot dark, L 64 against MM6's 68 to 71): the base
  // (71,70,67), the blotches lighter, the seams on more of the edges. Round 14 (its plates
  // read as facets): flat plates, a smaller step between them, seams that wander, and two
  // finer octaves.
  const c = cloudy(w, h, seed, {
    base: [71, 70, 67],
    octaves: [
      [40, 6],
      [24, 10],
      [12, 10],
      [6, 9],
    ],
    tint: 3,
    grain: 10,
  });
  const g = c.getContext('2d')!;
  stoneField(g, w, h, seed + 5, {
    offset: 6,
    slope: 0,
    light: 16,
    dark: 20,
    streaks: Math.round((w * h) / 150),
    smudges: 0,
    seams: -0.15,
    warp: 5,
  });
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const blot = valueNoise(w, h, 16, seed + 31);
  for (let i = 0; i < w * h; i++) {
    if (blot[i]! >= -0.28) continue;
    for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] = Math.max(0, d[i * 4 + ch]! - 8);
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
  // The broad figure (talk critic, round 13: MM6's panel varies over fifteen pixels twice
  // as much): five long dabs, darker and lighter.
  for (let i = 0; i < 5; i++) {
    dab(
      g,
      w,
      h,
      r() * w,
      r() * h,
      18 + r() * 22,
      80 + r() * 120,
      (r() - 0.5) * 0.1,
      r() < 0.5 ? 70 : 175,
      0.45,
    );
  }
  // One wobble for the whole slab, so the bands run side by side and never cross (talk
  // critic, round 12: 120 strokes, the darks one to three pixels wide and dashed, each over a
  // brown stroke two pixels wider so its edge steps through dark brown, not black; round 13:
  // that stroke at a grey that lands a tone above the dark, (51,25,14), so the edge steps).
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
      stroke(g, w, h, pts, grey(108), width + 2);
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
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  // The darks broken up (talk critic, round 13: MM6's dark runs are two or three pixels long,
  // ours six to twelve): three in ten of the two darkest tones lifted to (42,14,8).
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 2] !== 0 || d[i]! > 24 || r() >= 0.3) continue;
    d[i] = 42;
    d[i + 1] = 14;
    d[i + 2] = 8;
  }
  // The grain after the colour (critics, round 11: per-pixel specks read as static, MM6's
  // grain runs with the wood; round 13: stronger and over two rows, so RGB565 keeps it).
  const noise = new Float32Array(w * (h + 1));
  for (let i = 0; i < noise.length; i++) noise[i] = (r() - 0.5) * 44;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = (noise[y * w + x]! + noise[(y + 1) * w + x]!) / Math.SQRT2;
      const i = (y * w + x) * 4;
      // Multiplied, so a dark band stays brown rather than greying.
      for (let ch = 0; ch < 3; ch++)
        d[i + ch] = Math.max(0, Math.min(255, d[i + ch]! * (1 + v / 100)));
      // A little hue apart from the light (talk-world critic, round 14: one factor on all
      // three channels moved every tone along one line, and RGB565 kept a few of it).
      const jr = r();
      d[i] = Math.max(0, Math.min(255, d[i]! + (jr < 0.04 ? -8 : jr < 0.08 ? 8 : 0)));
      const jb = r();
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + (jb < 0.04 ? -8 : jb < 0.08 ? 8 : 0)));
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
    // Broader worn zones (screens critic, round 15: MM6's hide varies more within a cell).
    octaves: [
      [32, 10],
      [14, 12],
      [6, 9],
      [3, 3],
    ],
    tint: 2,
    grain: 5,
  });
  const g = c.getContext('2d')!;
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const r = die(seed + 23);
  for (let p = 0; p < Math.round((w * h) / 160); p++) {
    const cx = r() * w;
    const cy = r() * h;
    const rad = Math.sqrt((40 + r() * 70) / Math.PI);
    const rx = rad * 1.3;
    const ry = rad * 0.8;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
        const i = ((((y % h) + h) % h) * w + (((x % w) + w) % w)) * 4;
        // Worn patches warm, not grey (screens critic, rounds 12 and 15).
        d[i] = Math.min(255, d[i]! + 14);
        d[i + 1] = Math.min(255, d[i + 1]! + 6);
      }
    }
  }
  g.putImageData(img, 0, 0);
  // Flecks on a fifteenth, a jitter of five (screens critic, rounds 13 and 14).
  const fr = die(seed + 17);
  for (let i = 0; i < (w * h) / 15; i++) {
    g.fillStyle = fr() < 0.5 ? 'rgba(118,68,18,0.35)' : 'rgba(88,48,8,0.4)';
    g.fillRect(Math.floor(fr() * w), Math.floor(fr() * h), 1, 1);
  }
  chroma(g, w, h, seed + 3, 5, true);
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
      [12, 2],
    ],
    tint: 3,
    grain: 0.5,
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
    const l = nA[i]! * 26 + nB[i]! * 6 + (r() - 0.5) * 14 - 10;
    d[i * 4] = Math.max(0, Math.min(255, base[0] + l));
    d[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + l));
    d[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + l));
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // Round 12 (screens critic: a crisp crackle where MM6 has soft veins): the crazing twice
  // as wide in pitch and softer, a seventh of the dark veins a deeper brown, MM6's sixteen
  // bits. Round 13 (MM6's fine detail is half ours): a calmer ground, the cracks a pixel
  // wide at half strength, fewer and longer pale veins, fewer dark ones, half the chroma.
  // Round 15 (MM6's is crackled and grainy, ours had gone smooth): a coarser crack network
  // at a pitch of 48, a grain of fourteen, straight kinked pale veins, a jitter of six.
  // Round 16 (MM6's rose has contrast: its pale web whiter and stronger, its cracks at
  // (91,71,62)): the cracks' shade MM6's, the pale veins tinted toward white.
  crazed2(g, w, h, seed + 11, 48, [196, 151, 128], [92, 72, 62], 6, { alpha: 0.65, width: 1 });
  roseVeins(g, w, h, seed + 19, {
    pale: Math.round((w * h) / 2500),
    dark: Math.round((w * h * 0.4) / 3000),
    paleTint: [0.8, 0.95, 1],
    darkColor: [120, 80, 56],
    darkAlpha: [0.35, 0.6],
  });
  roseVeins(g, w, h, seed + 23, {
    pale: 0,
    dark: Math.round((w * h * 0.15) / 3000),
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
 * Gold line art onto a canvas as rods (HUD critic, rounds 12 and 13: MM6's emblem strokes are
 * two to four pixels, a dark edge, a bright core; ours were one-pixel wires): each stroke
 * thickened a pixel (to the right, or below where it runs level), the art pixels with gold
 * at their lower right the core (222,195,107), those clear at the upper left (200,170,90),
 * the rest (189,158,82), the added pixels the edge (150,118,57); a glint (255,231,181) on
 * one core pixel in three in the art's top quarter only; lighter toward the top by up to
 * twenty levels, a die of six; the shadow (82,60,28) a pixel down and right where no gold
 * falls. `thin` keeps a lattice (the globe) one pixel wide.
 */
function drawGold(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  pixels: readonly Pt[],
  ox: number,
  oy: number,
  seed: number,
  thin = false,
): void {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const art = new Uint8Array(w * h);
  let top = h;
  let bottom = 0;
  for (const [x, y] of pixels) {
    const X = Math.round(x + ox);
    const Y = Math.round(y + oy);
    if (X >= 0 && X < w && Y >= 0 && Y < h) {
      art[Y * w + X] = 1;
      top = Math.min(top, Y);
      bottom = Math.max(bottom, Y);
    }
  }
  const at = (m: Uint8Array, x: number, y: number): number =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x]!;
  // 1 for an art pixel, 2 for a pixel added to thicken the stroke.
  const gold = Uint8Array.from(art);
  if (!thin) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!art[y * w + x]) continue;
        const level = at(art, x - 1, y) || at(art, x + 1, y);
        const nx = level ? x : x + 1;
        const ny = level ? y + 1 : y;
        if (nx < w && ny < h && !gold[ny * w + nx]) gold[ny * w + nx] = 2;
      }
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
      if (gold[y * w + x] && !gold[(y + 1) * w + x + 1]) set((y + 1) * w + x + 1, 82, 60, 28);
    }
  }
  const r = die(seed);
  let k = 0;
  const quarter = top + (bottom - top) / 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const kind = gold[i];
      if (!kind) continue;
      // The body tones a tenth under round 13's (HUD critic, round 14: MM6's gold sits a
      // class lower); the glint and the added edge stay.
      let base: Rgb;
      if (kind === 2) base = [150, 118, 57];
      else if (at(gold, x + 1, y + 1)) {
        base = y <= quarter && k++ % 3 === 0 ? [255, 231, 181] : [202, 177, 97];
      } else if (!at(gold, x - 1, y - 1)) base = [182, 155, 82];
      else base = [172, 144, 75];
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
 * The portrait frame at MM6's proportions (HUD critic, rounds 12 and 13): five bands from
 * the outside in, banded radially only (no step at the equator): grey stone lined with a
 * light grey for the others, a gold, cream and gold wire lined with grey for the member in
 * hand; the opening one dark tone until the portraits come.
 */
export function paintRing(w: number, h: number, active: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const bands: Rgb[] = active
    ? [
        [41, 44, 41],
        [165, 142, 82],
        [222, 215, 181],
        [156, 142, 90],
        [140, 134, 132],
      ]
    : [
        [49, 48, 41],
        [74, 73, 66],
        [90, 89, 90],
        [140, 134, 132],
        [33, 32, 33],
      ];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inOval(x, y, w, h, 0)) continue;
      let k = 0;
      while (k < bands.length && inOval(x, y, w, h, k + 1)) k++;
      if (k >= bands.length) {
        px(g, x, y, 'rgb(16,12,8)');
        continue;
      }
      let [r0, g0, b0] = bands[k]!;
      if (k === 0) {
        // The outer band darkens toward the top, smoothly, as MM6's (HUD critic, round 14:
        // 16 at the top, 33 to 49 at the sides, 57 to 74 below).
        const angle = Math.atan2(h / 2 - (y + 0.5), x + 0.5 - w / 2);
        const want = 41 - 24 * Math.sin(angle);
        const has = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
        [r0, g0, b0] = [r0, g0, b0].map((v) => Math.round((v * want) / has)) as Rgb;
      }
      px(g, x, y, `rgb(${r0},${g0},${b0})`);
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
 * A member's place in the band (HUD critic, round 13: MM6's band is one marble slab, no cell
 * boundaries): transparent, so the band's marble runs on under every cell, holding only the
 * first cell's dark edge against the pillar and MM6's gold spandrel in the top-left corner, a
 * concave triangle of eleven rows under the gold row (the band's top rows are in hud.css),
 * lighter rows over darker ones, its first pixel and its tip darker, a dark line along its
 * slope.
 */
export function paintRecess(
  w: number,
  h: number,
  marble: HTMLCanvasElement,
  first = false,
): HTMLCanvasElement {
  void marble;
  const [c, g] = canvas(w, h);
  if (first) {
    g.fillStyle = '#313031';
    g.fillRect(0, 0, 1, h);
    g.fillStyle = '#4a494a';
    g.fillRect(1, 0, 1, h);
  }
  const x0 = first ? 2 : 0;
  const widths = [14, 11, 9, 7, 6, 4, 3, 3, 2, 1, 1];
  widths.forEach((wd, i) => {
    const y = 3 + i;
    if (y >= h) return;
    const col =
      i <= 6
        ? mix([168, 149, 92], [176, 159, 110], i / 6)
        : mix([159, 142, 96], [140, 117, 66], (i - 7) / 3);
    g.fillStyle = `rgb(${col.map(Math.round).join(',')})`;
    g.fillRect(x0, y, Math.min(wd, w - x0), 1);
    g.fillStyle = 'rgb(140,117,66)';
    g.fillRect(x0, y, 1, 1);
    g.fillStyle = 'rgb(99,93,82)';
    if (x0 + wd < w) g.fillRect(x0 + wd, y, 1, 1);
  });
  g.fillStyle = 'rgb(99,93,82)';
  g.fillRect(x0, 3 + widths.length, 1, 1);
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
  // The bands lit as the book's round back (HUD critic, round 14: MM6's gold rules run from
  // 50 at the left to a highlight 60 to 75 percent across, its red bands 17 to 37; ours were
  // flat boards).
  const ruleL = [50, 80, 104, 143, 205, 238, 238, 201];
  for (const y of [bandTop, bandBottom]) {
    for (let x = 2; x <= w - 3; x++) {
      const t = Math.max(0, Math.min(1, (x - 1.5) / Math.max(1, w - 4)));
      const f = t * (ruleL.length - 1);
      const k = Math.min(ruleL.length - 2, Math.floor(f));
      const L = ruleL[k]! + (ruleL[k + 1]! - ruleL[k]!) * (f - k);
      const rule = (m: number): string =>
        `rgb(${Math.round(Math.min(255, 1.12 * L + 12) * m)},${Math.round(Math.min(255, L) * m)},${Math.round((0.55 * L + 15) * m)})`;
      px(g, x, y, rule(1));
      px(g, x, y + 5, rule(0.92));
      // MM6's red band peaks at (107,20,16), not a pure red (HUD critic, round 15).
      const sv = t <= 0.7 ? t / 0.7 : 1 - (t - 0.7) / 0.6;
      g.fillStyle = `rgb(${Math.round(57 + 46 * sv)},${Math.round(18 * sv)},${Math.round(14 * sv)})`;
      g.fillRect(x, y + 1, 1, 4);
    }
  }
  const art = emblem ? EMBLEM_ART[emblem] : undefined;
  if (art)
    drawGold(g, w, h, art(), Math.floor((w - 18) / 2), bandTop + 6, w * 17 + h, emblem === 'map');
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
  // Four columns, the ramp's middle four (HUD critic, round 14: six read as thick bars beside
  // a small oval, the band being drawn at half MM6's scale).
  for (let x = 0; x < w; x++) {
    const k = 1 + Math.min(3, Math.floor((x / Math.max(1, w)) * 4));
    const [cr, cg, cb] = ramp[k]!;
    g.fillStyle = `rgb(${cr},${cg},${cb})`;
    g.fillRect(x, 0, 1, h);
  }
  return c;
}

/** The tube's gold caps (critics, round 8): five shaded rows top and bottom, a highlight on the second, clear between. */
export function paintTubeCaps(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const cap: Rgb[] = [
    [99, 89, 41],
    [173, 154, 74],
    [173, 146, 74],
    [156, 130, 66],
    [148, 117, 49],
  ];
  // Turned with the tube's cylinder, column by column (HUD critic, round 15: flat rows read
  // as dull bars; MM6's run 93, 145, 192, 168 across).
  const turn = [0.64, 1, 1.32, 1.16];
  for (const [y0, up] of [
    [0, true],
    [h - 5, false],
  ] as const) {
    cap.forEach((tone, i) => {
      for (let x = 0; x < w; x++) {
        const k = turn[Math.min(3, Math.floor((x * 4) / Math.max(1, w)))]!;
        const [r0, g0, b0] = tone.map((v) => Math.min(255, Math.round(v * k)));
        px(g, x, y0 + (up ? i : 4 - i), `rgb(${r0},${g0},${b0})`);
      }
    });
  }
  return c;
}

/**
 * A condition gem, as MM6's (HUD critic, round 15): an upright stone five by seven, lit at
 * its upper left, no ring; its heart colour by the member's state.
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
  const v = hearts[kind] ?? hearts['good']!;
  const tones: Record<string, Rgb> = {
    L: v.map((t) => Math.min(255, Math.round(1.15 * t + 49))) as Rgb,
    G: v,
    g: v.map((t) => Math.round(0.83 * t)) as Rgb,
  };
  const map = ['.LGG.', 'LLGGG', 'LGGGG', 'GGGGG', 'GGGGg', 'GGGgg', '.Ggg.'];
  const ox = Math.floor((w - 5) / 2);
  const oy = Math.floor((h - 7) / 2);
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const tone = tones[row[x]!];
      if (tone) px(g, ox + x, oy + y, `rgb(${tone[0]},${tone[1]},${tone[2]})`);
    }
  });
  return c;
}

/** MM6's gold collar under the capital, eleven rows in five bands; the shaft wears it again. */
const COLLAR: readonly Rgb[] = [
  [192, 172, 122],
  [170, 147, 92],
  [170, 147, 92],
  [170, 147, 92],
  [170, 147, 92],
  [175, 154, 101],
  [175, 154, 101],
  [175, 154, 101],
  [175, 154, 101],
  [190, 173, 123],
  [199, 184, 139],
];

/**
 * A marble pillar as MM6 shaded it (critics, rounds 9 to 11): veins running down the shaft
 * within thirty degrees of upright, painted on a wider tile and cropped, then every column
 * scaled to the convex profile 96 plus 75 times the cosine of a quarter turn over t to the
 * 0.7, the highlight 171 one pixel in; the capital's collar again at rows 120 to 130; on
 * RGB565. The right pillar is this one mirrored.
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
  // The collar again at rows 120 to 130, turned as the capital's (HUD critic, round 16:
  // MM6's shaft wears it at 31 to 41 and again at 120 to 130, in the same colours, in all
  // four screenshots; ours ran 146 plain rows to the plinth).
  if (h >= 160)
    for (let x = 0; x < w; x++) {
      const k = 0.72 + 0.54 * Math.cos((Math.PI / 2) * Math.pow(x / Math.max(1, w - 1), 0.7));
      COLLAR.forEach(([r, gr, b], j) => {
        const i = ((120 + j) * w + x) * 4;
        d[i] = Math.round(r * k);
        d[i + 1] = Math.round(gr * k);
        d[i + 2] = Math.round(b * k);
      });
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
 * A capital or a plinth. The capital (HUD critic, rounds 13 to 16): MM6's stands thirty-one
 * rows from the screen's top over an eleven-row collar. Three abacus rows and a crown of lit
 * leaf heads that stands over the lintel with an open scroll curling down at each end; a
 * bell, flaring twice, then tapering to the shaft by the twenty-sixth row, its mass a smooth
 * field of greys (a two-pixel mottle read as granite) carved by twenty short dark curls
 * hanging down, each lit three pixels up its upper left; seven pushed past the outline,
 * curling down with the sky left under them; a five-row astragal; MM6's collar bands. No
 * regular tiers: those read as fish scales or a brick wall. The plinth: the ring over MM6's
 * turned base of tori and grooves. Both turned with the shaft's cosine, on RGB565.
 */
export function paintCapital(w: number, h: number, ring: 'below' | 'above'): HTMLCanvasElement {
  if (ring === 'below') return paintAcanthus(w, h);
  const [c, g] = canvas(w, h);
  const shaft = Math.max(4, Math.round(w * 0.72));
  const margin = Math.floor((w - shaft) / 2);
  const collar = 10;
  const rows: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    const inset =
      y < collar ? margin : y < collar + Math.floor((h - collar) / 2) ? Math.floor(margin / 2) : 0;
    rows.push([inset, w - 2 * inset]);
  }
  // MM6's turned foot under the ring (HUD critic, round 14): tori and grooves by row, six of
  // them dark, each row turned with the shaft's cosine.
  const foot = [
    123, 123, 132, 123, 99, 49, 115, 132, 107, 140, 123, 74, 82, 140, 82, 66, 99, 132, 165, 165,
    123, 74,
  ];
  rows.forEach(([x0, fw], y) => {
    if (y < collar) return;
    const L =
      foot[Math.min(foot.length - 1, Math.floor(((y - collar) * foot.length) / (h - collar)))]!;
    for (let x = x0; x < x0 + fw; x++) {
      const t = (x - x0) / Math.max(1, fw - 1);
      const k = 0.78 + 0.32 * Math.cos((Math.PI / 2) * Math.pow(t, 0.7));
      px(
        g,
        x,
        y,
        `rgb(${Math.round(L * k)},${Math.round(L * k * 0.95)},${Math.round(L * k * 0.92)})`,
      );
    }
  });
  const [rx, rw] = rows[0]!;
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
        y,
        `rgb(${Math.min(255, Math.round(band[0] * k))},${Math.min(255, Math.round(band[1] * k))},${Math.min(255, Math.round(band[2] * k))})`,
      );
    }
  }
  quantise565(g, w, h);
  return c;
}

/** MM6's capital; see `paintCapital`. Its crown stands fourteen pixels past the shaft each side, its bell six. */
function paintAcanthus(w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const img = g.createImageData(w, h);
  const d = img.data;
  // The crown stands fourteen pixels past the shaft over the lintel, the bell six (HUD
  // critic, round 15: MM6's capitals are widest at the top); the dies keep round 15's seeds.
  const rr = die(27 * 13 + h);
  const collar = Math.min(11, h);
  const top = h - collar;
  const neck = Math.max(3, top - 5);
  const shaft = Math.max(4, w - 28);
  const bw = Math.min(w, shaft + 12);
  const off = (w - bw) >> 1;
  const m = Math.floor((w - shaft) / 2);
  const put = (x: number, y: number, [r, gr, b]: Rgb, a = 255): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    d[i] = Math.max(0, Math.min(255, Math.round(r)));
    d[i + 1] = Math.max(0, Math.min(255, Math.round(gr)));
    d[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    d[i + 3] = a;
  };
  const grey = (x: number, y: number, l: number, [tr, tg, tb]: Rgb): void =>
    put(x, y, [l * tr, l * tg, l * tb]);
  const sky: Rgb = [0, 0, 0];
  // The shaft's cosine across (critics, round 12: it fits MM6's eight columns to 0.05).
  const turn = (x: number): number =>
    0.72 +
    0.54 * Math.cos((Math.PI / 2) * Math.pow(Math.max(0, x - m) / Math.max(1, shaft - 1), 0.7));
  // Two flares, at rows 8 to 11 and 17 to 20, as MM6's leaves stand out (HUD critic, round 14).
  const flare = (y: number): number => ((y >= 8 && y <= 11) || (y >= 17 && y <= 20) ? 2 : 0);
  const half = (y: number): number =>
    y < 3
      ? w / 2
      : y < 7
        ? w / 2 - 1
        : y < 9
          ? bw / 2 - 1.5 + flare(y)
          : y < neck
            ? bw / 2 -
              1.5 -
              (bw / 2 - 1.5 - shaft / 2) * Math.pow((y - 9) / Math.max(1, neck - 9), 1.15) +
              flare(y)
            : shaft / 2;
  const inset = (y: number): number => Math.max(0, Math.round(w / 2 - half(y)));
  const inside = new Uint8Array(w * h);
  for (let y = 0; y < neck; y++)
    for (let x = inset(y); x < w - inset(y); x++) inside[y * w + x] = 1;
  // The abacus: a mid grey, dark beneath, falling to the right (MM6's rows 89 to 100, then
  // 75 to 92, then dark).
  [112, 96, 38].forEach((l, y) => {
    if (y >= neck) return;
    for (let x = 0; x < w; x++) {
      const crown = x < off || x >= w - off ? 0.8 : 1;
      grey(
        x,
        y,
        l * crown * (1.08 - (0.16 * x) / Math.max(1, w - 1)) + (rr() - 0.5) * 8,
        [1, 0.96, 0.94],
      );
    }
  });
  // The mass: a smooth field on cells four across and six down (HUD critic, round 14: the
  // two-pixel mottle was white noise, MM6's stone correlates 0.6 with the pixel below), laid
  // on the bell's own grid (HUD critic, round 16: read across the crown's width, the bell
  // fell on twelve cells instead of eight and went darker and busier).
  const fr = die(27 * 7 + h);
  const gw = (bw >> 2) + 2;
  const gh = Math.floor(h / 6) + 2;
  const grid = Array.from({ length: gw * gh }, () => (fr() + fr() + fr() - 1.5) * 2);
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  const cell = (i: number, j: number): number =>
    grid[Math.min(gh - 1, j) * gw + Math.min(gw - 1, i)]!;
  const field = (x: number, y: number): number => {
    const x0 = Math.floor(x / 4);
    const y0 = Math.floor(y / 6);
    const fx = smooth(x / 4 - x0);
    const fy = smooth(y / 6 - y0);
    const top0 = cell(x0, y0) * (1 - fx) + cell(x0 + 1, y0) * fx;
    const bottom0 = cell(x0, y0 + 1) * (1 - fx) + cell(x0 + 1, y0 + 1) * fx;
    return 22 * (top0 * (1 - fy) + bottom0 * fy);
  };
  // One base of 88, the crown's too (HUD critic, round 16: its 72 read as a dark slab; the
  // leaves light it now).
  const base = 88;
  for (let y = 3; y < neck; y++)
    for (let x = 0; x < w; x++) {
      if (!inside[y * w + x]) continue;
      const l =
        base * (1 - (0.18 * (y - 3)) / 24) +
        field(Math.max(0, x - off), y) -
        10 * (x / Math.max(1, w - 1) - 0.5) +
        (rr() - 0.5) * 6;
      grey(x, y, l, [1, 0.94, 0.91]);
    }
  // The curls: twenty short hooks of three to five pixels hanging down, a pixel wide, each lit
  // three pixels up its upper left (never over 160); no more, now the leaves cover the crown
  // (HUD critic, round 16: twenty-four of twenty-eight started in the bell and darkened it).
  const dark = (): Rgb => (rr() < 0.6 ? [24, 20, 16] : [33, 32, 33]);
  const lit = (x: number, y: number, v: number): void => {
    if (y >= 3 && x >= 0 && inside[y * w + x] && d[(y * w + x) * 4]! > 60)
      grey(x, y, v, [1, 0.96, 0.93]);
  };
  for (let k = 0; k < 20 && neck > 4; k++) {
    let y = 3 + rr() * Math.min(21, neck - 4);
    let x = w / 2 + (rr() * 2 - 1) * Math.max(0, half(Math.floor(y)) - 1);
    let a = Math.PI / 2 + (rr() - 0.5) * 1.4;
    const bend = (rr() < 0.5 ? -1 : 1) * (0.15 + rr() * 0.25);
    const length = 3 + Math.floor(rr() * 3);
    for (let i = 0; i < length; i++) {
      const cx = Math.round(x);
      const cy = Math.round(y);
      const within = cy < 7 || (cx >= inset(cy) - 1 && cx <= w - inset(cy));
      if (cy >= 3 && cy < neck && cx >= 0 && cx < w && within) {
        put(cx, cy, dark());
        inside[cy * w + cx] = 1;
        const v = 140 + rr() * 20;
        lit(cx - 1, cy - 1, v);
        lit(cx - 1, cy - 2, v - 14);
        lit(cx - 1, cy - 3, v - 28);
      }
      x += Math.cos(a);
      y += Math.sin(a) * 0.8;
      a += bend;
    }
  }
  // Seven breakers at MM6's rows: a curl two pixels thick pushed two to four past the
  // outline, its tip curling down, a dark pixel under the tip and the sky left beneath it.
  for (const y of [9, 18, 10, 19, 8, 17, 11]) {
    if (y + 4 >= neck) continue;
    const side = rr() < 0.5 ? -1 : 1;
    // Within the bell's six pixels past the shaft, under the crown.
    const reach = Math.min(2 + Math.floor(rr() * 3), Math.max(1, inset(y) - off));
    const edge = side < 0 ? inset(y) : w - 1 - inset(y);
    for (let j = 1; j <= reach; j++) {
      const tip = j === reach;
      put(edge + side * j, y, tip ? [24, 20, 16] : [82, 77, 74]);
      put(edge + side * j, y + 1, tip ? [24, 20, 16] : [66, 62, 60]);
    }
    const tx = edge + side * reach;
    const drop = 1 + Math.floor(rr() * 2);
    for (let j = 0; j < drop; j++) put(tx, y + 2 + j, [24, 20, 16]);
    put(tx, y + 2 + drop, [33, 32, 33]);
    for (let j = 0; j < 2; j++) if (rr() < 0.6) put(edge - side * j, y + 2, sky, 0);
  }
  // The crown's leaves (HUD critic, round 16: MM6's crown is lit leaves, 72 with a fifth over
  // 110, ours was a dark mass of 54): heads two or three pixels wide on rows 3 and 4 or 4 and
  // 5, darkening to the right, one to three pixels apart, each shadowed a pixel down and right.
  for (let x = 5 + Math.floor(rr() * 2); x < w - 6;) {
    const hw = 2 + (rr() < 0.45 ? 1 : 0);
    const y0 = rr() < 0.55 ? 3 : 4;
    const v = 122 + rr() * 24;
    for (let j = 0; j < hw && x + j < w - 5; j++) {
      grey(x + j, y0, v - 5 * j, [1, 0.96, 0.93]);
      grey(x + j, y0 + 1, (v - 5 * j) * 0.84, [1, 0.96, 0.93]);
      if (j < hw - 1 || rr() < 0.5) put(x + j + 1, y0 + 2, dark());
    }
    x += hw + 1 + Math.floor(rr() * 3);
  }
  // Their underside hanging below them, between the scroll and the bell at each end (HUD
  // critic, round 16: MM6's two rows under the leaves average 25, ours were 42).
  const under: [number, number, number][] = [
    [5, 7, 40],
    [6, 7, 28],
    [7, 7, 52],
    [8, 7, 24],
    [9, 7, 36],
    [6, 8, 26],
    [8, 8, 30],
  ];
  for (const [x, y, l] of under) {
    grey(x, y, l, [1, 0.95, 0.92]);
    grey(w - 1 - x, y, l, [1, 0.95, 0.92]);
  }
  // A scroll curling down at each end of the crown, as MM6's (HUD critic, round 15), open on
  // a two-pixel stroke with no light inside (HUD critic, round 16: closed, it read as a "6").
  const hook = ['##   ', '##   ', '###  ', ' ####', '   ##', '   #=', '   =#', '    #'];
  const ink: Record<string, Rgb> = {
    '#': [24, 20, 16],
    '=': [41, 40, 41],
  };
  hook.forEach((row, i) => {
    for (let x = 0; x < row.length; x++) {
      const tone = ink[row[x]!];
      if (!tone) continue;
      put(x, 1 + i, tone);
      put(w - 1 - x, 1 + i, tone);
    }
  });
  // No lone light specks: a light pixel with no light neighbour goes to the mass's grey.
  const lum = (i: number): number =>
    0.299 * d[i * 4]! + 0.587 * d[i * 4 + 1]! + 0.114 * d[i * 4 + 2]!;
  const specks: number[] = [];
  for (let y = 3; y < neck; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i * 4 + 3] === 0 || lum(i) <= 110) continue;
      let alone = true;
      for (let dy = -1; dy <= 1 && alone; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (d[j * 4 + 3] !== 0 && lum(j) > 110) {
            alone = false;
            break;
          }
        }
      if (alone) specks.push(i);
    }
  for (const i of specks) grey(i % w, Math.floor(i / w), 85, [1, 0.94, 0.91]);
  // The astragal across the shaft only (MM6 rows 27 to 30: 34-85, 26-79, 42-120, 67-151).
  [60, 44, 36, 92, 132].forEach((l, j) => {
    const y = neck + j;
    if (y >= top) return;
    for (let x = 0; x < w; x++) {
      if (x >= m && x < m + shaft) grey(x, y, l * turn(x) + (rr() - 0.5) * 8, [1, 0.95, 0.93]);
      else put(x, y, sky, 0);
    }
  });
  // MM6's collar: eleven rows in five bands.
  for (let j = 0; j < collar; j++) {
    const [r, gr, b] = COLLAR[Math.min(COLLAR.length - 1, j)]!;
    for (let x = 0; x < w; x++) {
      if (x < m || x >= m + shaft) {
        put(x, top + j, sky, 0);
        continue;
      }
      const k = turn(x);
      put(x, top + j, [r * k, gr * k, b * k]);
    }
  }
  g.putImageData(img, 0, 0);
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
  // The frame falls into the recess over four columns at the left (HUD critic, round 16:
  // MM6's runs 165, 107, 57, 33, 16 into its recess, where ours stepped from 170 to 14).
  ['#6b6563', '#393431', '#212021', '#101010'].forEach((tone, x) => {
    g.fillStyle = tone;
    g.fillRect(x, 6, 1, h - 6 - wood);
  });
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
 * light at the lower right; the body (125,103,62) lit near the top, dark past the middle and
 * lit again before the foot, with a three-pixel mottle and a die; a (247,247,214) specular
 * near the top; the moon near black, a third of the width in radius, a warm edge at its
 * lower right. RGB565.
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
    // MM6's polished brass (HUD critic, round 15): darker at the very top, brightest a fifth
    // of the way down; then its reflected horizon (HUD critic, round 16: MM6's four buttons
    // all dip to 51-82 at 0.45 to 0.65 of the height and rise to 104-113 at 0.7 to 0.85,
    // where ours fell the whole way): down to 62, a second lit band of 128, then 48.
    const pts: [number, number][] = [
      [0, 96],
      [0.1, 124],
      [0.19, 146],
      [0.32, 124],
      [0.45, 84],
      [0.57, 62],
      [0.7, 100],
      [0.8, 128],
      [0.9, 84],
      [1, 48],
    ];
    for (let k = 1; k < pts.length; k++) {
      if (t <= pts[k]![0]) {
        const [t0, l0] = pts[k - 1]!;
        const [t1, l1] = pts[k]!;
        return l0 + ((t - t0) / (t1 - t0)) * (l1 - l0);
      }
    }
    return 48;
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
        const lum = bevel[k]! + f * (bevel[k + 1]! - bevel[k]!) + (r() - 0.5) * 24;
        col = toned(lum + lift);
        // The rim lights on the bevel's inner row: from -20 to -50 degrees, and at the upper
        // left from 95 to 165 (HUD critic, round 15).
        if (inOval(x, y, ow, oh, 3) && deg >= 310 && deg <= 340) col = [214, 178, 99];
        if (inOval(x, y, ow, oh, 3) && deg >= 95 && deg <= 165) col = [231, 219, 156];
      } else {
        // The tones stretched a half again about 100 (HUD critic, round 15: MM6's brass spans
        // more, with fewer equal neighbours) on a die of 20 (HUD critic, round 16: 30 sanded
        // it, half its pixels over twelve off their neighbours' mean, MM6's 35 to 46%).
        let lum = rowLum(y / Math.max(1, oh - 1)) + n3[y * ow + x]! * 20 + (r() - 0.5) * 20;
        lum = 100 + (lum - 100) * 1.45;
        col = [125 * (lum / 106), 103 * (lum / 106), 62 * (lum / 106)];
        col = [col[0] + lift, col[1] + lift, col[2] + lift];
        // A small hot specular a fifth of the way down (HUD critic, rounds 13 and 15).
        const dx = (x + 0.5 - ow * 0.5) / 1.6;
        const dy = (y + 0.5 - oh * (pressed ? 0.24 : 0.19)) / 1.4;
        col = mix(col, [247, 247, 214], 0.95 * Math.min(1, Math.exp(-(dx * dx + dy * dy) / 2)));
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
  // MM6's window frame, the smith's and the tavern's alike (talk-world critic, round 15):
  // outside in, a dark line, two of pewter and a mid line on the top and sides, the foot
  // lit, with no black or brown line and no shadow.
  const side = ['#292829', '#424542', '#424542', '#313631'];
  const foot = ['#292c31', '#52514a', '#52514a', '#394139'];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inset = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (inset > 3) continue;
      const onFoot = inset !== y && inset !== x && inset === h - 1 - y;
      px(g, x, y, (onFoot ? foot : side)[inset]!);
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
  // The rose averaged over two rows (screens critic, round 12: its crazing cores made the
  // pillar four times as busy along its length as MM6's; rounds 13 and 14: over five, then
  // three, it went half as busy).
  const roseAt = (x: number, y: number, ch: number): number => {
    let sum = 0;
    for (let k = 0; k <= 1; k++)
      sum += rose[(((((y + k) % rh) + rh) % rh) * rw + (x % rw)) * 4 + ch]!;
    return sum / 2;
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
 * The knot strip beside the book's crease (screens critic, rounds 13 to 15: MM6's twelve
 * pixels, never darker than its ground): two strands plaited on a twelve-row repeat, each a
 * one-pixel pen line with a dull pixel either side, the one on top changing at every
 * crossing; broken at its middle by an olive S between two olive corner fittings, as MM6's
 * binding, with no bright gold.
 */
function paintBinding(g: CanvasRenderingContext2D, x0: number, y0: number, y1: number): void {
  const sw = 12;
  const cx = x0 + sw / 2 - 0.5;
  const mid = Math.round((y0 + y1) / 2);
  const gap: [number, number] = [mid - 21, mid + 21];
  const olive = 'rgb(83,69,33)';
  const plate = 'rgb(123,116,103)';
  g.fillStyle = 'rgb(115,97,82)';
  g.fillRect(x0, y0, sw, y1 - y0);
  const strand = (x: number, y: number): void => {
    const xi = Math.round(x);
    px(g, xi - 1, y, 'rgb(99,93,82)');
    px(g, xi, y, 'rgb(148,130,90)');
    px(g, xi + 1, y, 'rgb(107,97,90)');
  };
  for (let y = y0; y < y1; y++) {
    if (y >= gap[0] && y <= gap[1]) continue;
    const phase = ((y - y0) / 12) * Math.PI * 2;
    const a = cx + 3.5 * Math.sin(phase);
    const b = cx - 3.5 * Math.sin(phase);
    // The strand on top changes at each crossing, every six rows.
    const aOver = Math.floor((y - y0 + 3) / 6) % 2 === 0;
    strand(aOver ? b : a, y);
    strand(aOver ? a : b, y);
  }
  // The fittings: a plate over the break and at each end an olive pair point-symmetric, as
  // MM6's (screens critic, round 16: its corners are ◥ above and ◣ below): two bars a row
  // apart joined at both sides, then the corner sloping in over six rows, a lit pixel on its
  // slope every other row and a groove a pixel inside it.
  g.fillStyle = plate;
  g.fillRect(x0, gap[0], sw, gap[1] - gap[0] + 1);
  const slope = [2, 4, 5, 6, 8, 9];
  for (const [top, dir] of [
    [gap[0], 1],
    [gap[1], -1],
  ] as const) {
    g.fillStyle = olive;
    g.fillRect(x0 + 1, top, 11, 1);
    g.fillRect(x0 + 1, top + 2 * dir, 11, 1);
    px(g, x0 + 1, top + dir, olive);
    px(g, x0 + 11, top + dir, olive);
    for (let k = 3; k <= 8; k++) {
      const y = top + dir * k;
      const from = dir === 1 ? x0 + 1 + slope[k - 3]! : x0 + 1;
      const to = dir === 1 ? x0 + 11 : x0 + 11 - slope[k - 3]!;
      g.fillStyle = olive;
      g.fillRect(from, y, to - from + 1, 1);
      const edge = dir === 1 ? from : to;
      if (k % 2 === 1) px(g, edge, y, 'rgb(165,140,82)');
      if (k >= 4 && k <= 7 && edge + dir >= from && edge + dir <= to) px(g, edge + dir, y, plate);
    }
  }
  // The S with a two-pixel pen, eleven by twenty-three, its shadow only where no pen lies
  // (round 16: ours was 8 by 21 with 45 pixels, MM6's 11 by 24 with 73).
  const pen = new Map<number, Pt>();
  for (const [x, y] of [
    ...polyline(arc(cx, mid - 5.5, 4.5, 5.5, 0.3, -Math.PI * 1.5)),
    ...polyline(arc(cx, mid + 5.5, 4.5, 5.5, -Math.PI / 2, Math.PI - 0.3)),
  ]) {
    pen.set(y * 4096 + x, [x, y]);
    pen.set(y * 4096 + x + 1, [x + 1, y]);
  }
  for (const [x, y] of pen.values())
    if (!pen.has((y + 1) * 4096 + x + 1)) px(g, x + 1, y + 1, 'rgb(92,85,78)');
  for (const [x, y] of pen.values()) px(g, x, y, olive);
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
  // The crease at seven hundredths of the page, MM6's (screens critic, round 13).
  const gx = pw * 0.07;
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
  // The spellbook's binding only: the quest log and the map write across that margin.
  if (schools.length) paintBinding(g, left + Math.round(gx) + 4, top + 8, bottom - 14);
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
  // The foot (screens critic, round 13): the page's last two rows shaded, then MM6's band
  // of page edges seen from below, two lit and seven alternating, sharing one slow bow; the
  // cover below it, never the page.
  const sweep = (x: number): number =>
    Math.sin((Math.PI * Math.min(x, pw - 1)) / Math.max(1, pw - 1));
  const common = noise1(pw + 12, 160, w * 11 + h);
  const footRgb: Rgb[] = [
    [173, 164, 148],
    [165, 156, 140],
    [140, 130, 115],
    [115, 111, 99],
    [123, 121, 107],
    [107, 101, 90],
    [82, 77, 66],
    [123, 121, 107],
    [66, 65, 57],
  ];
  // Each edge its own line (screens critic, rounds 14 and 15: all nine had stepped at one
  // x): an unrounded height per edge, the gaps between them opening and closing on their own
  // noises so edges part and meet without crossing, each edge's tone wandering along it.
  const gaps = footRgb.map((_, k) => noise1(pw + 12, 30 + 10 * ((7 * k) % 5), w * 17 + k));
  const tones = footRgb.map((_, j) => noise1(pw + 12, 18, w * 19 + j));
  // Dashes of tone along each edge (screens critic, round 16: a tone changed at a quarter of
  // the columns, MM6's at seven tenths): runs of two to six columns, each up to twelve
  // either way.
  const dashes = footRgb.map((_, j) => {
    const r = die(w * 23 + j);
    const out: number[] = [];
    while (out.length < pw + 12) {
      const run = 2 + Math.floor(r() * 5);
      const v = (r() * 2 - 1) * 12;
      for (let i = 0; i < run; i++) out.push(v);
    }
    return out;
  });
  const edgesAt = (x: number): number[] => {
    let open = 0;
    return footRgb.map((_, j) => {
      if (j > 0) open += Math.max(0, 1.6 * gaps[j]![x]! + 0.05);
      return bottom + 8 * sweep(x) + 2 * common[x]! + j + open;
    });
  };
  const shade = g.getImageData(left, top, pw, deep);
  for (let x = 0; x < pw + 10; x++) {
    const ys = edgesAt(x).map((y) => Math.round(y));
    const base = ys[0]!;
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
    const last = ys[ys.length - 1]!;
    for (let row = base; row <= last; row++) {
      let j = 0;
      while (j + 1 < ys.length && ys[j + 1]! <= row) j++;
      const t = 16 * tones[j]![x]! + dashes[j]![x]!;
      const [r0, g0, b0] = footRgb[j]!;
      px(
        g,
        left + x,
        row,
        `rgb(${Math.round(r0 + t)},${Math.round(g0 + t * 0.94)},${Math.round(b0 + t * 0.82)})`,
      );
    }
    const under = last + 1;
    const end = top + deep;
    if (end > under)
      g.drawImage(cover, left + x - B, under - B, 1, end - under, left + x, under, 1, end - under);
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
  // MM6's page holds a few tones in broad runs (screens critic, round 13).
  quantise565(g, w, h);
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
    // MM6's number well (HUD critic, round 13: MM6 has no clock in the band; its food and gold
    // sit in wells of the band's marble darkened by a third, under a dark top edge, over a
    // light lower lip).
    const [c, g] = canvas(w, h);
    const s = surfaces ?? installPaint();
    for (let y = 0; y < h; y += s.marble.height) {
      for (let x = 0; x < w; x += s.marble.width)
        g.drawImage(s.marble, x + 23, y + 41, w, h, x, y, w, h);
    }
    g.fillStyle = 'rgba(0,0,0,0.34)';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgb(82,81,74)';
    g.fillRect(0, 0, w, 1);
    g.fillStyle = 'rgb(57,52,49)';
    g.fillRect(0, 1, w, 1);
    g.fillRect(0, 0, 1, h);
    g.fillStyle = 'rgb(148,121,107)';
    g.fillRect(0, h - 2, w, 1);
    g.fillStyle = 'rgb(165,142,132)';
    g.fillRect(0, h - 1, w, 1);
    g.fillRect(w - 1, 0, 1, h);
    quantise565(g, w, h);
    return c;
  }
  const c = cloudy(w, h, w * 7 + h, {
    base: [10, 18, 13],
    octaves: [
      [16, 8],
      [5, 4],
    ],
    grain: 2,
  });
  const g = c.getContext('2d')!;
  wisps(g, w, h, w * 3 + h, 20, [40, 120], [48, 62, 50], 0.8, 0.4);
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
  else if (kind === 'capital') c = paintCapital(w, h, 'below');
  else if (kind === 'plinth') c = paintCapital(w, h, 'above');
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

/** MM6's yellow numerals, five by eight with one-pixel strokes (HUD critic, round 13). */
const NUMERALS: Record<string, readonly string[]> = {
  '0': [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  '1': ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  '2': [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],
  '3': [' ### ', '#   #', '    #', '  ## ', '    #', '    #', '#   #', ' ### '],
  '4': ['   # ', '  ## ', ' # # ', '#  # ', '#####', '   # ', '   # ', '   # '],
  '5': ['#####', '#    ', '#### ', '    #', '    #', '    #', '#   #', ' ### '],
  '6': ['  ## ', ' #   ', '#    ', '#### ', '#   #', '#   #', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '   # ', '  #  ', '  #  ', ' #   ', ' #   '],
  '8': [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', '#   #', ' ### '],
  '9': [' ### ', '#   #', '#   #', '#   #', ' ####', '    #', '   # ', ' ##  '],
  ':': [' ', ' ', '#', ' ', ' ', '#', ' ', ' '],
};

const numeralCache = new Map<string, HTMLCanvasElement>();

/**
 * A number in MM6's well type: pure yellow (255,255,0) at an eight-pixel advance, a colon
 * in four, so three clear pixels stand between every pair (HUD critic, round 14), each lit
 * pixel with a black one at its lower right. One canvas pixel per UI pixel.
 */
export function paintNumerals(text: string): HTMLCanvasElement {
  const hit = numeralCache.get(text);
  if (hit) return hit;
  const glyphs = [...text].map((ch) => NUMERALS[ch]).filter((g): g is readonly string[] => !!g);
  const advance = (glyph: readonly string[]): number => (glyph[0]!.length === 1 ? 4 : 8);
  const width = Math.max(1, glyphs.reduce((sum, glyph) => sum + advance(glyph), 0) - 2);
  const [c, g] = canvas(width, 9);
  for (const [colour, off] of [
    ['#000000', 1],
    ['#ffff00', 0],
  ] as const) {
    let x0 = 0;
    for (const glyph of glyphs) {
      const left = x0;
      glyph.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '#') px(g, left + x + off, y + off, colour);
        }
      });
      x0 += advance(glyph);
    }
  }
  numeralCache.set(text, c);
  return c;
}
