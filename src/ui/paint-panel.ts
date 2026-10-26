/**
 * MM6's right-hand panel (DESIGN.md 16.34; reference mm6-hud-town): the arch the minimap looks
 * through with its compass plate and zoom marks, the two stained-glass windows under it, and
 * the dark glyphs of the four gold ovals at the panel's foot (cast, rest, quick reference,
 * options). Painted as the rest of the shell (paint.ts, DESIGN.md 16.10): pixel by pixel on the
 * game's grid, lit from the top left, on RGB565. Shapes are masks, so nothing is anti-aliased.
 */
import { type Rgb, canvas, die, mix, quantise565, valueNoise } from '../render/brush';

/** A mask of `w` by `h`: 1 where a path drawn by `draw` covers more than half a pixel. */
function mask(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): Uint8Array {
  const [, g] = canvas(w, h);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  draw(g);
  const d = g.getImageData(0, 0, w, h).data;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3]! > 127 ? 1 : 0;
  return m;
}

/** Steps from each pixel to the nearest pixel where `from` is set, up to `limit`. */
function distance(from: Uint8Array, w: number, h: number, limit: number): Uint8Array {
  const d = new Uint8Array(w * h).fill(limit);
  let front: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (from[i]) {
      d[i] = 0;
      front.push(i);
    }
  }
  for (let step = 1; step < limit && front.length; step++) {
    const next: number[] = [];
    for (const i of front) {
      const x = i % w;
      const y = (i - x) / w;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (d[j]! > step) {
          d[j] = step;
          next.push(j);
        }
      }
    }
    front = next;
  }
  return d;
}

const clamp = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

/**
 * The arch's outline and the minimap's opening, as masks: the outline a low pointed arch over
 * straight sides; the opening MM6's cusped window, a tall lobe over the middle and a lower one
 * at each shoulder above a straight body, two lobes at its foot meeting in a cusp.
 */
export function archShapes(w: number, h: number): { outline: Uint8Array; opening: Uint8Array } {
  const spring = Math.round(h * 0.36);
  const outline = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const t = Math.max(0, (spring - y) / spring);
    // A pointed crown: the half width falls to nothing at the apex, steeply at the last.
    const half = (w / 2) * Math.pow(1 - Math.pow(t, 1.7), 1 / 1.7);
    for (let x = 0; x < w; x++) {
      if (Math.abs(x + 0.5 - w / 2) <= half) outline[y * w + x] = 1;
    }
  }
  const m = 5;
  const body = Math.round(h * 0.42);
  const foot = h - 4;
  const lobe = Math.round(w * 0.215);
  const opening = mask(w, h, (g) => {
    g.beginPath();
    g.rect(m, body + 6, w - 2 * m, foot - lobe - (body + 6));
    g.fill();
    for (const [cx, cy, r] of [
      [w / 2, body + 2, w * 0.25],
      [m + w * 0.15, body + 10, w * 0.15],
      [w - m - w * 0.15, body + 10, w * 0.15],
      [w * 0.285, foot - lobe, lobe],
      [w * 0.715, foot - lobe, lobe],
    ] as const) {
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
    }
  });
  // The opening stays inside the arch and off its foot.
  for (let i = 0; i < w * h; i++) if (!outline[i] || i >= (foot + 1) * w) opening[i] = 0;
  return { outline, opening };
}

/**
 * The minimap's surround: the band's marble cut by the arch, the opening clear for the map
 * drawn under it, a black lip two pixels round the opening and a bevel past it, a light
 * moulding along the arch's crown, the compass plate at the apex, and the zoom marks, a − and
 * a +, cut into the shoulders. Outside the arch is clear: the sky shows there, as in MM6.
 */
export function paintArch(w: number, h: number, marble: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.drawImage(marble, 51, 17, w, h, 0, 0, w, h);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const { outline, opening } = archShapes(w, h);
  const toOpening = distance(opening, w, h, 6);
  const outside = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) outside[i] = outline[i] ? 0 : 1;
  const toEdge = distance(outside, w, h, 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!outline[i] || opening[i]) {
        d[i * 4 + 3] = 0;
        continue;
      }
      let col: Rgb = [d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!];
      const o = toOpening[i]!;
      // Black round the window, then the marble's cut: shaded where it faces the light (the
      // lower right of the opening), lit where it faces away.
      if (o <= 2) col = o === 1 ? [16, 16, 16] : [41, 40, 37];
      else if (o <= 4) {
        const up = y > 0 && toOpening[i - w]! < o;
        const left = x > 0 && toOpening[i - 1]! < o;
        col = mix(col, up || left ? [40, 36, 32] : [235, 230, 222], o === 3 ? 0.55 : 0.3);
      }
      const e = toEdge[i]!;
      if (e === 1) col = [24, 22, 20];
      else if (e === 2) col = mix(col, [240, 236, 228], 0.6);
      else if (e === 3) col = mix(col, [240, 236, 228], 0.25);
      d[i * 4] = clamp(col[0]);
      d[i * 4 + 1] = clamp(col[1]);
      d[i * 4 + 2] = clamp(col[2]);
    }
  }
  g.putImageData(img, 0, 0);
  // The compass plate: a pale stone tablet at the apex for the heading's letters (panel.ts),
  // a dark line round it, lit above and left, a dot either side as MM6's.
  const pw = Math.round(w * 0.36);
  const ph = 14;
  const px0 = Math.round((w - pw) / 2);
  const py0 = 3;
  g.fillStyle = 'rgb(16,16,16)';
  g.fillRect(px0 - 1, py0 - 1, pw + 2, ph + 2);
  const plate = valueNoise(pw, ph, 4, w * 3 + 1);
  const r = die(w * 7 + h);
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      let l = 196 + plate[y * pw + x]! * 18 + (r() - 0.5) * 8;
      if (y === 0 || x === 0) l = 236;
      else if (y === ph - 1 || x === pw - 1) l = 120;
      g.fillStyle = `rgb(${clamp(l)},${clamp(l * 0.95)},${clamp(l * 0.84)})`;
      g.fillRect(px0 + x, py0 + y, 1, 1);
    }
  }
  for (const dx of [5, pw - 7]) {
    g.fillStyle = 'rgb(24,20,16)';
    g.fillRect(px0 + dx, py0 + 6, 2, 2);
  }
  // The zoom marks cut into the marble at the shoulders: dark strokes with a light edge
  // under them, as engraved.
  const markY = Math.round(h * 0.4);
  const cut = (x: number, y: number, ww: number, hh: number): void => {
    g.fillStyle = 'rgba(250,246,238,0.85)';
    g.fillRect(x + 1, y + 1, ww, hh);
    g.fillStyle = 'rgb(28,26,24)';
    g.fillRect(x, y, ww, hh);
  };
  const lx = Math.round(w * 0.1);
  const rx = Math.round(w * 0.9) - 7;
  cut(lx, markY, 7, 1);
  cut(rx, markY, 7, 1);
  cut(rx + 3, markY - 3, 1, 7);
  quantise565(g, w, h);
  return c;
}

/** Where the arch's zoom marks are, for the taps (panel.ts): the − and the + centres. */
export function archMarks(w: number, h: number): { out: [number, number]; in: [number, number] } {
  const y = Math.round(h * 0.4);
  return { out: [Math.round(w * 0.1) + 3, y], in: [Math.round(w * 0.9) - 4, y] };
}

/**
 * A stained-glass window as MM6's pair under the minimap: a dark frame with a grey bevel lit
 * from the top left; inside, a blue border, a maroon saltire whose arms end in lobes, a gold
 * rosette at the crossing, and panes of milk white above, sage green at the sides and peach
 * below, every pane leaded in black.
 */
export function paintGlass(w: number, h: number, seed = 1): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const img = g.createImageData(w, h);
  const d = img.data;
  const n = valueNoise(w, h, 5, w * 31 + h + seed);
  const r = die(w * 13 + h * 5 + seed);
  const fr = 4;
  const iw = w - 2 * fr;
  const ih = h - 2 * fr;
  // Each pixel of the glass: its region, so leads can be drawn where regions meet.
  const region = new Int8Array(w * h).fill(-1);
  const BORDER = 0;
  const ARM = 1;
  const ROSE = 2;
  const HEART = 3;
  const TOP = 4;
  const SIDE = 5;
  const BOTTOM = 6;
  const MILK = 7;
  for (let y = 0; y < ih; y++) {
    for (let x = 0; x < iw; x++) {
      const u = (x + 0.5) / iw;
      const v = (y + 0.5) / ih;
      let k: number;
      const bu = 3 / iw;
      const bv = 3 / ih;
      const du = u - 0.5;
      const dv = (v - 0.5) * (ih / iw);
      const rr = Math.hypot(du, dv);
      const onArm = Math.abs(u - v) < 0.11 || Math.abs(u + v - 1) < 0.11;
      const lobe = [
        [0.17, 0.17],
        [0.83, 0.17],
        [0.17, 0.83],
        [0.83, 0.83],
      ].some(([a, b]) => Math.hypot(u - a!, (v - b!) * (ih / iw)) < 0.12);
      if (u < bu || u > 1 - bu || v < bv || v > 1 - bv) k = BORDER;
      else if (rr < 0.075) k = HEART;
      else if (rr < 0.15) k = ROSE;
      else if (onArm || lobe) k = ARM;
      else if (v < u && v < 1 - u) k = u < 0.5 && v < 0.3 ? MILK : TOP;
      else if (v > u && v > 1 - u) k = BOTTOM;
      else k = SIDE;
      region[(y + fr) * w + x + fr] = k;
    }
  }
  const tone: Record<number, Rgb> = {
    [BORDER]: [58, 92, 150],
    [ARM]: [104, 50, 58],
    [ROSE]: [200, 162, 82],
    [HEART]: [128, 88, 40],
    [TOP]: [222, 222, 214],
    [MILK]: [236, 232, 214],
    [SIDE]: [150, 176, 112],
    [BOTTOM]: [222, 180, 138],
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const k = region[i]!;
      let col: Rgb;
      if (k < 0) {
        // The frame: black outside, two grey rows lit at the top left, black inside.
        const e = Math.min(x, y, w - 1 - x, h - 1 - y);
        if (e === 0 || e === 3) col = [20, 20, 20];
        else {
          const topLeft = Math.min(x, y) <= Math.min(w - 1 - x, h - 1 - y);
          col = topLeft ? [150, 148, 142] : [76, 72, 68];
          if (e === 2) col = mix(col, [104, 100, 96], 0.5);
        }
      } else {
        // Leads where the region changes to the right or below.
        const right = x + 1 < w ? region[i + 1]! : k;
        const down = y + 1 < h ? region[i + w]! : k;
        if ((right >= 0 && right !== k) || (down >= 0 && down !== k)) col = [26, 22, 20];
        else {
          const base = tone[k]!;
          // The glass lit from the top left, cloudy, a highlight where the light comes in.
          const light = 1 + n[i]! * 0.12 + (r() - 0.5) * 0.06 - 0.12 * ((x + y) / (w + h) - 0.5);
          col = [base[0] * light, base[1] * light, base[2] * light];
        }
      }
      d[i * 4] = clamp(col[0]);
      d[i * 4 + 1] = clamp(col[1]);
      d[i * 4 + 2] = clamp(col[2]);
      d[i * 4 + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // A small gold cross on the milk pane, as MM6's left window carries.
  const cx = fr + Math.round(iw * 0.3);
  const cy = fr + Math.round(ih * 0.2);
  g.fillStyle = 'rgb(176,150,70)';
  g.fillRect(cx - 3, cy, 7, 1);
  g.fillRect(cx, cy - 3, 1, 7);
  quantise565(g, w, h);
  return c;
}

/** The glyphs MM6 cut into its four gold ovals, and the moon of our old rest button. */
export type OvalGlyph = 'moon' | 'star' | 'tent' | 'scroll' | 'disk';

/**
 * The glyph's pixels for an oval `ow` by `oh` placed at (`ox`, `oy`) in a box `w` by `h`: 1 for
 * the dark glyph, 2 for a part cut back to the gold inside it (a door, a label, a shutter).
 */
export function ovalGlyph(
  kind: OvalGlyph,
  w: number,
  h: number,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
): Uint8Array {
  const X = (u: number): number => ox + u * ow;
  const Y = (v: number): number => oy + v * oh;
  const poly = (g: CanvasRenderingContext2D, pts: readonly [number, number][]): void => {
    g.beginPath();
    pts.forEach(([u, v], k) => (k ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v))));
    g.closePath();
    g.fill();
  };
  const rect = (
    g: CanvasRenderingContext2D,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
  ): void =>
    g.fillRect(
      Math.round(X(u0)),
      Math.round(Y(v0)),
      Math.round(X(u1) - X(u0)),
      Math.round(Y(v1) - Y(v0)),
    );
  let dark: (g: CanvasRenderingContext2D) => void;
  let clear: ((g: CanvasRenderingContext2D) => void) | null = null;
  if (kind === 'star') {
    dark = (g) => {
      const pts: [number, number][] = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const rad = k % 2 ? 0.17 : 0.42;
        pts.push([0.5 + rad * Math.cos(a), 0.53 + (rad * Math.sin(a) * ow) / oh]);
      }
      poly(g, pts);
    };
  } else if (kind === 'tent') {
    dark = (g) => {
      poly(g, [
        [0.5, 0.36],
        [0.88, 0.72],
        [0.12, 0.72],
      ]);
      rect(g, 0.47, 0.22, 0.53, 0.37);
      poly(g, [
        [0.53, 0.22],
        [0.76, 0.26],
        [0.53, 0.3],
      ]);
    };
    clear = (g) =>
      poly(g, [
        [0.5, 0.52],
        [0.62, 0.72],
        [0.38, 0.72],
      ]);
  } else if (kind === 'scroll') {
    dark = (g) => {
      // The sheet, its head rolled over at the left and its foot at the right.
      poly(g, [
        [0.3, 0.33],
        [0.74, 0.31],
        [0.7, 0.7],
        [0.26, 0.72],
      ]);
      g.beginPath();
      g.ellipse(X(0.3), Y(0.36), ow * 0.13, oh * 0.06, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(X(0.7), Y(0.68), ow * 0.13, oh * 0.06, 0, 0, Math.PI * 2);
      g.fill();
    };
    clear = (g) => {
      g.beginPath();
      g.ellipse(X(0.3), Y(0.36), ow * 0.05, oh * 0.02, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(X(0.7), Y(0.68), ow * 0.05, oh * 0.02, 0, 0, Math.PI * 2);
      g.fill();
    };
  } else if (kind === 'disk') {
    dark = (g) =>
      poly(g, [
        [0.22, 0.36],
        [0.7, 0.36],
        [0.78, 0.41],
        [0.78, 0.72],
        [0.22, 0.72],
      ]);
    clear = (g) => {
      rect(g, 0.36, 0.36, 0.64, 0.47);
      rect(g, 0.31, 0.56, 0.69, 0.72);
    };
  } else {
    dark = (g) => {
      g.beginPath();
      g.arc(X(0.5), Y(0.56), ow * 0.33, 0, Math.PI * 2);
      g.fill();
    };
    clear = (g) => {
      g.beginPath();
      g.arc(X(0.5 + 0.33 * 0.45), Y(0.56) - ow * 0.33 * 0.3, ow * 0.33 * 0.85, 0, Math.PI * 2);
      g.fill();
    };
  }
  const m = mask(w, h, dark);
  if (clear) {
    const k = mask(w, h, clear);
    for (let i = 0; i < w * h; i++) if (m[i] && k[i]) m[i] = kind === 'moon' ? 0 : 2;
  }
  // A one-pixel slot in the disk's shutter, dark again.
  if (kind === 'disk') {
    const sx = Math.round(X(0.56));
    for (let y = Math.round(Y(0.38)); y < Math.round(Y(0.45)); y++) {
      if (y >= 0 && y < h && sx >= 0 && sx < w) m[y * w + sx] = 1;
    }
  }
  return m;
}

/** The glyphs MM6 cut into the gold ovals along its screens' feet. */
export type ButtonGlyph = 'head' | 'hand' | 'items' | 'award' | 'exit' | 'cast' | 'close-book';

/**
 * A glyph for a gold oval button `w` by `h` (paint.ts `paintButton`): 1 for dark ink, 2 for a
 * part cut back to the gold. MM6's member pages (reference mm6-stats): a head, a hand, a sword
 * over a shield, a medal on its ribbon and a door with the way out; the spellbook's wand and
 * the book's clasp.
 */
export function buttonGlyph(kind: ButtonGlyph, w: number, h: number): Uint8Array {
  // The glyph's box: the oval's middle, as tall as the oval leaves inside its rim.
  const gh = Math.max(8, Math.round(h * 0.62));
  const gw = gh * 1.25;
  const ox = (w - gw) / 2;
  const oy = (h - gh) / 2 + 0.5;
  const X = (u: number): number => ox + u * gw;
  const Y = (v: number): number => oy + v * gh;
  const S = (u: number): number => u * gh;
  const poly = (g: CanvasRenderingContext2D, pts: readonly [number, number][]): void => {
    g.beginPath();
    pts.forEach(([u, v], k) => (k ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v))));
    g.closePath();
    g.fill();
  };
  const disc = (g: CanvasRenderingContext2D, u: number, v: number, r: number): void => {
    g.beginPath();
    g.arc(X(u), Y(v), S(r), 0, Math.PI * 2);
    g.fill();
  };
  let dark: (g: CanvasRenderingContext2D) => void;
  let clear: ((g: CanvasRenderingContext2D) => void) | null = null;
  switch (kind) {
    case 'head':
      // A bust facing left: the head, the neck, the shoulders.
      dark = (g) => {
        disc(g, 0.52, 0.32, 0.25);
        poly(g, [
          [0.26, 0.3],
          [0.36, 0.32],
          [0.3, 0.42],
        ]);
        poly(g, [
          [0.44, 0.5],
          [0.62, 0.5],
          [0.66, 0.66],
          [0.86, 0.76],
          [0.88, 1],
          [0.16, 1],
          [0.2, 0.76],
          [0.4, 0.66],
        ]);
      };
      break;
    case 'hand':
      // An open hand, fingers up, the thumb out to the left.
      dark = (g) => {
        poly(g, [
          [0.3, 0.5],
          [0.74, 0.5],
          [0.74, 0.86],
          [0.62, 1],
          [0.38, 1],
          [0.3, 0.86],
        ]);
        for (const [u, top] of [
          [0.34, 0.12],
          [0.46, 0.02],
          [0.58, 0.06],
          [0.69, 0.18],
        ] as const)
          g.fillRect(
            Math.round(X(u)),
            Math.round(Y(top)),
            Math.max(2, Math.round(S(0.1))),
            Math.round(Y(0.56) - Y(top)),
          );
        poly(g, [
          [0.3, 0.58],
          [0.14, 0.42],
          [0.1, 0.48],
          [0.26, 0.74],
        ]);
      };
      break;
    case 'items':
      // A sword upright over a round shield.
      dark = (g) => disc(g, 0.5, 0.56, 0.36);
      clear = (g) => {
        g.fillRect(
          Math.round(X(0.47)),
          Math.round(Y(0.0)),
          Math.max(2, Math.round(S(0.08))),
          Math.round(S(0.98)),
        );
        g.fillRect(
          Math.round(X(0.34)),
          Math.round(Y(0.3)),
          Math.round(S(0.38)),
          Math.max(2, Math.round(S(0.07))),
        );
      };
      break;
    case 'award':
      // A medal on its ribbon.
      dark = (g) => {
        poly(g, [
          [0.3, 0],
          [0.44, 0],
          [0.56, 0.42],
          [0.44, 0.46],
        ]);
        poly(g, [
          [0.7, 0],
          [0.56, 0],
          [0.44, 0.42],
          [0.56, 0.46],
        ]);
        disc(g, 0.5, 0.7, 0.28);
      };
      clear = (g) => disc(g, 0.5, 0.7, 0.13);
      break;
    case 'exit':
      // A doorway with the way out: the door ajar, an arrow leaving it.
      dark = (g) =>
        poly(g, [
          [0.18, 0],
          [0.56, 0],
          [0.56, 1],
          [0.18, 1],
        ]);
      clear = (g) => {
        poly(g, [
          [0.24, 0.08],
          [0.5, 0.08],
          [0.5, 1],
          [0.24, 1],
        ]);
      };
      {
        const door = dark;
        dark = (g) => {
          door(g);
          poly(g, [
            [0.3, 0.12],
            [0.42, 0.2],
            [0.42, 0.98],
            [0.3, 0.9],
          ]);
          poly(g, [
            [0.6, 0.44],
            [0.8, 0.44],
            [0.8, 0.32],
            [1, 0.52],
            [0.8, 0.72],
            [0.8, 0.6],
            [0.6, 0.6],
          ]);
        };
      }
      break;
    case 'cast':
      // A wand with a star at its tip.
      dark = (g) => {
        poly(g, [
          [0.08, 0.92],
          [0.14, 0.98],
          [0.6, 0.48],
          [0.54, 0.42],
        ]);
        const pts: [number, number][] = [];
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const r = k % 2 ? 0.1 : 0.26;
          pts.push([0.72 + (r * Math.cos(a) * gh) / gw, 0.28 + r * Math.sin(a)]);
        }
        poly(g, pts);
      };
      break;
    case 'close-book':
      // MM6's book closer: a clasp, its strap over the boards.
      dark = (g) =>
        poly(g, [
          [0.1, 0.3],
          [0.7, 0.3],
          [0.7, 0.1],
          [0.92, 0.1],
          [0.92, 0.9],
          [0.7, 0.9],
          [0.7, 0.7],
          [0.1, 0.7],
        ]);
      clear = (g) =>
        poly(g, [
          [0.76, 0.24],
          [0.86, 0.24],
          [0.86, 0.76],
          [0.76, 0.76],
        ]);
      break;
  }
  const m = mask(w, h, dark);
  if (clear) {
    const k = mask(w, h, clear);
    for (let i = 0; i < w * h; i++) if (k[i]) m[i] = m[i] ? 2 : 0;
  }
  return m;
}

/**
 * MM6's hourglass on the rest screen (reference mm6-rest): two glass bulbs meeting at a waist
 * between turned wooden ends and three posts, the sand mostly run into the lower bulb, a thread
 * of it falling; lit from the left. `run`, while the party rests, is how far its sand has run,
 * 0 to 1, the upper bulb emptying into the lower.
 */
export function paintHourglass(w: number, h: number, run?: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const img = g.createImageData(w, h);
  const d = img.data;
  const cap = Math.max(4, Math.round(h * 0.1));
  const mid = h / 2;
  const half = (w - 6) / 2;
  const put = (x: number, y: number, col: Rgb): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    d[i] = clamp(col[0]);
    d[i + 1] = clamp(col[1]);
    d[i + 2] = clamp(col[2]);
    d[i + 3] = 255;
  };
  for (let y = cap; y < h - cap; y++) {
    // The bulbs' half width: full near the ends, a pixel at the waist.
    const t = Math.abs(y + 0.5 - mid) / (mid - cap);
    const bw = Math.max(1, half * Math.sin(Math.min(1, t) * Math.PI * 0.5) ** 0.7);
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - w / 2;
      if (Math.abs(dx) > bw) continue;
      const lower = y > mid;
      // The share of each bulb the sand fills, from its end at the waist side.
      const upperShare = run === undefined ? 0.4 : 0.75 - 0.7 * run;
      const lowerShare = run === undefined ? 0.65 : 0.25 + 0.65 * run;
      const lowerFill = lower && y > h - cap - (h - cap - mid) * lowerShare;
      const upperFill = !lower && y > mid - (mid - cap) * upperShare;
      const thread = Math.abs(dx) < 0.6 && lower && !lowerFill;
      let col: Rgb = [178, 200, 210];
      if (lowerFill || upperFill || thread) col = [222, 196, 140];
      const lit = dx < -bw * 0.4 ? 1.18 : dx > bw * 0.5 ? 0.8 : 1;
      if (Math.abs(Math.abs(dx) - bw) < 1) col = [96, 110, 118];
      put(x, y, [col[0] * lit, col[1] * lit, col[2] * lit]);
    }
  }
  // The turned wooden ends and the posts between them.
  for (const y0 of [0, h - cap]) {
    for (let y = y0; y < y0 + cap; y++) {
      const t = (y - y0) / cap;
      for (let x = 0; x < w; x++) {
        const lit = x < w * 0.3 ? 1.2 : x > w * 0.75 ? 0.75 : 1;
        const edge = t < 0.2 || t > 0.8 ? 0.7 : 1;
        put(x, y, [112 * lit * edge, 58 * lit * edge, 28 * lit * edge]);
      }
    }
  }
  for (const px0 of [1, w - 3]) {
    for (let y = cap; y < h - cap; y++) {
      put(px0, y, [130, 70, 34]);
      put(px0 + 1, y, [76, 38, 18]);
    }
  }
  g.putImageData(img, 0, 0);
  quantise565(g, w, h);
  return c;
}
