/**
 * The world's textures, painted (DESIGN.md 16.13). MM6's ground, walls and roofs were small
 * bitmaps a painter speckled and ruled by hand: dirt in five browns, grass in four greens,
 * cobbles drawn stone by stone, ashlar in courses with mortar lines, planks with grain. The
 * photographed CC0 textures read as smooth 3D under the posteriser (critics, 2026-10-17);
 * these are drawn at startup with the shell's brushes, 128 pixels to a tile, and sampled
 * nearest so the texels show, as they did in 1998.
 */
import { Constants } from '@babylonjs/core/Engines/constants';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import { ROLE } from '../../kernel/elements/roles';
import {
  canvas,
  dab,
  die,
  expand,
  grain,
  posterise,
  ramp,
  stroke,
  type Tone,
  valueNoise,
} from '../render/brush';
import { applyRetroSampling } from '../render/materials';
import { palettise } from '../render/palette';
import { lampPane, stillWater, type RoleTextures } from './textures';

const T = 128;

function grass(): HTMLCanvasElement {
  // MM6's turf (critics, round 9: (61,84,45), green twenty levels over red; round 11: clumps
  // of eight to twelve texels; round 12: the step down overshot, lifted back about 15%).
  // (talk-world critic, round 13: the lift overshot everywhere, the meadow (53,91,45) and
  // green 38 over red where MM6's is (47,65,33) and 18): round 12's ramp with green 5% and
  // blue 12% down; the marks within three steps of the base, since a mark of any of the
  // sixteen tones is white noise (meadow hp3 9.6 to 11.2, MM6 6.0 to 8.8).
  const tones = ramp('#223715', '#2c411c', '#364e23', '#415b2a', '#4c6831', '#5b7737');
  const c = grain(T, T, 31, tones, { marks: 2400, spread: 3, clods: 120, clodSize: 5, base: 7 });
  // After the snap, a hue jitter on every texel: red eight down or up on an eighth each,
  // green four down or up on three tenths each, blue four up on seven twentieths.
  const g = c.getContext('2d')!;
  const img = g.getImageData(0, 0, T, T);
  const d = img.data;
  const r = die(37);
  for (let i = 0; i < d.length; i += 4) {
    const jr = r();
    const jg = r();
    d[i] = d[i]! + (jr < 0.125 ? -8 : jr < 0.25 ? 8 : 0);
    d[i + 1] = d[i + 1]! + (jg < 0.3 ? -4 : jg < 0.6 ? 4 : 0);
    d[i + 2] = d[i + 2]! + (r() < 0.35 ? 4 : 0);
  }
  g.putImageData(img, 0, 0);
  return c;
}

function dirt(): HTMLCanvasElement {
  // MM6's earth (critics, rounds 9 to 12): thirty-two steps from (57,28,16) to (122,86,66),
  // each step with a cool twin used in patches, as MM6's (82,48,33)/(82,52,33) pairs.
  // (talk-world critic, round 13: the body was flat felt, k varying by only 2.6 steps, and the
  // pebbles were confetti, 2.5% of the near ground over luma 90 where clean MM6 has 0.09%):
  // the variance in blobs of sixteen and four texels at sixteen and twenty steps, cracks and
  // veins walked into a darkening before the tones are chosen, a hue jitter on top, pits in
  // two dark tones; no pebbles and no snap.
  const tones = expand(ramp('#391c10', '#45251a', '#513023', '#5d3b2d', '#644233', '#7a5642'), 32);
  const n16 = valueNoise(T, T, 16, 32);
  const n4 = valueNoise(T, T, 4, 35);
  const cool = valueNoise(T, T, 24, 34);
  const r = die(33);
  // The darkening, in steps of the ramp: random walks of unit steps, each texel as deep as
  // the deepest walk over it. They replace round 12's sixteen dark strokes.
  const dk = new Float32Array(T * T);
  const walk = (steps: number, depth: number): void => {
    let x = r() * T;
    let y = r() * T;
    let ang = r() * Math.PI * 2;
    const mark = (): void => {
      const i = (((Math.floor(y) % T) + T) % T) * T + (((Math.floor(x) % T) + T) % T);
      dk[i] = Math.max(dk[i]!, depth);
    };
    mark();
    for (let s = 0; s < steps; s++) {
      ang += (r() - 0.5) * 0.9;
      x += Math.cos(ang);
      y += Math.sin(ang);
      mark();
    }
  };
  // Seventy cracks ten to thirty-four steps long and eight to eleven deep; six hundred veins
  // three to nine long and eight to twelve deep.
  for (let i = 0; i < 70; i++) walk(10 + Math.floor(r() * 25), 8 + Math.floor(r() * 4));
  for (let i = 0; i < 600; i++) walk(3 + Math.floor(r() * 7), 8 + Math.floor(r() * 5));
  const [c, g] = canvas(T, T);
  const img = g.createImageData(T, T);
  const d = img.data;
  for (let i = 0; i < T * T; i++) {
    const k = Math.max(
      0,
      Math.min(31, Math.round(15.5 + 16 * n16[i]! + 20 * n4[i]! + 5 * (2 * r() - 1) - dk[i]!)),
    );
    const t = tones[k]!.warm;
    const twin = cool[i]! > 0 ? [0, 5, 4] : [0, 0, 0];
    // The hue jitter: green four down on a fifth of the texels and four up on a fifth, blue
    // four up on a quarter.
    const jg = r() < 0.2 ? -4 : r() < 0.25 ? 4 : 0;
    const jb = r() < 0.25 ? 4 : 0;
    d[i * 4] = Math.round(t[0] + twin[0]!);
    d[i * 4 + 1] = Math.round(t[1] + twin[1]! + jg);
    d[i * 4 + 2] = Math.round(t[2] + twin[2]! + jb);
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const blob = (x: number, y: number, n: number, colour: string): void => {
    let bx = x;
    let by = y;
    g.fillStyle = colour;
    for (let k = 0; k < n; k++) {
      const px = ((Math.floor(bx) % T) + T) % T;
      const py = ((Math.floor(by) % T) + T) % T;
      g.fillRect(px, py, 1, 1);
      if (r() < 0.5) bx += r() < 0.5 ? -1 : 1;
      else by += r() < 0.5 ? -1 : 1;
    }
  };
  // A hundred and sixty pits, half in each dark tone.
  for (let i = 0; i < 160; i++) {
    blob(r() * T, r() * T, 1 + Math.floor(r() * 4), i % 2 ? '#311509' : '#261008');
  }
  return c;
}

function sand(): HTMLCanvasElement {
  return grain(T, T, 34, ramp('#a68a56', '#baa06a', '#ccb47e', '#dcc892', '#ead8a8'), {
    marks: 2200,
    clods: 36,
    clodSize: 12,
  });
}

function snow(): HTMLCanvasElement {
  return grain(T, T, 35, ramp('#a8b6ca', '#c2cedc', '#d8e0ea', '#ecf0f5', '#fcfdff'), {
    marks: 1500,
    clods: 44,
    clodSize: 14,
  });
}

function scree(): HTMLCanvasElement {
  // Steep faces as MM6's brown scars (critics, round 11: the olive scree read as grass; the
  // earth's browns (57,28,16) to (107,73,57)).
  return grain(T, T, 36, ramp('#391c10', '#45251a', '#513023', '#5d3b2d', '#6b4939'), {
    marks: 2600,
    clods: 130,
    clodSize: 5,
  });
}

/** Stones drawn one by one on a grid, mortar between, each lit at its top left. */
function cobbles(
  seed: number,
  cell: number,
  mortar: number,
  tones: Tone[],
  courses: boolean,
): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(T, T);
  g.fillStyle = '#4a4a4a';
  g.fillRect(0, 0, T, T);
  const cw = courses ? cell * 2 : cell;
  for (let y = 0; y < T; y += cell) {
    const row = y / cell;
    // Courses run half a block over on alternate rows; a flagstone floor staggers by a hand.
    const shift = courses ? (row % 2 ? cw / 2 : 0) : (row * 11) % cell;
    for (let x = -cw; x < T + cw; x += cw) {
      const sx = x + shift;
      const tone = 118 + (r() - 0.5) * 50;
      const inset = mortar + Math.floor(r() * 2);
      const w = cw - inset - Math.floor(r() * 2);
      const h = cell - inset - Math.floor(r() * 2);
      g.fillStyle = `rgb(${tone},${tone},${tone})`;
      g.fillRect(sx + inset, y + inset, w, h);
      g.fillStyle = `rgb(${tone + 44},${tone + 44},${tone + 44})`;
      g.fillRect(sx + inset, y + inset, w, 1);
      g.fillRect(sx + inset, y + inset, 1, h);
      g.fillStyle = `rgb(${tone - 44},${tone - 44},${tone - 44})`;
      g.fillRect(sx + inset, y + inset + h - 1, w, 1);
      g.fillRect(sx + inset + w - 1, y + inset, 1, h);
      // A grain inside the block (critics, round 11: MM6's stones are speckled, not flat):
      // one-texel marks twelve levels up or down over two fifths of its face.
      for (let k = 0; k < w * h * 0.4; k++) {
        const v = Math.round(tone + (r() < 0.5 ? -12 : 12) * (0.5 + r() * 0.5));
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(
          sx + inset + 1 + Math.floor(r() * (w - 2)),
          y + inset + 1 + Math.floor(r() * (h - 2)),
          1,
          1,
        );
      }
      // A chip or two of wear.
      for (let k = 0; k < 2; k++) {
        if (r() < 0.5) continue;
        dab(
          g,
          0,
          0,
          sx + inset + r() * w,
          y + inset + r() * h,
          2 + r() * 4,
          1.5 + r() * 3,
          r() * 3,
          tone - 30,
          0.5,
        );
      }
    }
  }
  // Fourteen tones, so the grain survives (critics, round 11: 4 colours in 20 by 20).
  posterise(g, T, T, expand(tones, 14), null, 50, 200);
  return c;
}

function flagstone(): HTMLCanvasElement {
  return cobbles(
    41,
    32,
    3,
    ramp('#3c3a38', '#54524e', '#6a6864', '#807e78', '#96948c', '#aaa8a0'),
    false,
  );
}

function ashlar(): HTMLCanvasElement {
  return cobbles(
    42,
    32,
    2,
    ramp('#6a5a44', '#847258', '#9c8a6c', '#b09e80', '#c4b494', '#d4c6a8'),
    true,
  );
}

function sandstone(): HTMLCanvasElement {
  return cobbles(
    43,
    32,
    2,
    ramp('#8a6a44', '#a48058', '#b89468', '#c8a878', '#d8bc8c', '#e4cca0'),
    true,
  );
}

/** Boards with grain, across the tile. */
function boards(seed: number, tones: Tone[], low: number, high: number): HTMLCanvasElement {
  const r = die(seed);
  const [c, g] = canvas(T, T);
  const grey = (t: number): string => `rgb(${t},${t},${t})`;
  let y0 = 0;
  while (y0 < T) {
    const board = Math.min(T - y0, 18 + Math.floor(r() * 10));
    const shade = 118 + (r() - 0.5) * 40;
    g.fillStyle = grey(shade);
    g.fillRect(0, y0, T, board);
    const lines = 3 + Math.floor(r() * 3);
    for (let i = 0; i < lines; i++) {
      const yb = y0 + 2 + r() * (board - 4);
      const amp = 0.6 + r() * 1.8;
      const period = 24 + r() * 40;
      const phase = r() * 10;
      const tone = shade + (r() < 0.65 ? -24 - r() * 22 : 16 + r() * 14);
      const pts: [number, number][] = [];
      for (let x = 0; x <= T; x += 2) {
        pts.push([x, yb + amp * Math.sin(x / period + phase) + 0.4 * Math.sin(x / 6 + phase * 3)]);
      }
      stroke(g, T, 0, pts, grey(tone), r() < 0.3 ? 2 : 1);
    }
    if (r() < 0.4) {
      const kx = r() * T;
      const ky = y0 + board * (0.3 + r() * 0.4);
      for (let k = 3; k >= 0; k--) {
        g.strokeStyle = grey(shade - 32 + k * 9);
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(kx, ky, 2.5 + k * 2, 1.4 + k * 1.1, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.fillStyle = grey(40);
    g.fillRect(0, y0 + board - 1, T, 1);
    g.fillStyle = grey(shade + 24);
    g.fillRect(0, y0, T, 1);
    y0 += board;
  }
  posterise(g, T, T, tones, null, low, high);
  return c;
}

function plank(): HTMLCanvasElement {
  return boards(
    51,
    ramp('#3a2410', '#4e3418', '#624420', '#78562a', '#8c6836', '#a07c44', '#b49056'),
    40,
    200,
  );
}

function bark(): HTMLCanvasElement {
  const r = die(52);
  const [c, g] = canvas(T, T);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, T, T);
  for (let i = 0; i < 60; i++) {
    dab(g, T, T, r() * T, r() * T, 4 + r() * 8, 10 + r() * 24, 0, 128 + (r() - 0.5) * 60, 0.5);
  }
  for (let i = 0; i < 46; i++) {
    let x = r() * T;
    const pts: [number, number][] = [];
    for (let y = 0; y <= T; y += 3) {
      x += (r() - 0.5) * 2.2;
      pts.push([x, y]);
    }
    stroke(
      g,
      T,
      T,
      pts,
      `rgb(${r() < 0.7 ? 56 : 190},${r() < 0.7 ? 56 : 190},${r() < 0.7 ? 56 : 190})`,
      1 + Math.floor(r() * 2),
    );
  }
  posterise(
    g,
    T,
    T,
    ramp('#2a1c12', '#3c2a1a', '#4e3824', '#62482e', '#78583a', '#8e6c4a'),
    null,
    40,
    200,
  );
  return c;
}

function plaster(): HTMLCanvasElement {
  const r = die(53);
  const [c, g] = canvas(T, T);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, T, T);
  for (let i = 0; i < 34; i++) {
    dab(
      g,
      T,
      T,
      r() * T,
      r() * T,
      14 + r() * 30,
      10 + r() * 20,
      r() * Math.PI,
      128 + (r() - 0.5) * 36,
      0.5,
    );
  }
  for (let v = 0; v < 3; v++) {
    let x = r() * T;
    let y = r() * T;
    let ang = (r() - 0.5) * 2;
    const pts: [number, number][] = [];
    for (let t = 0; t < 40 + r() * 50; t += 3) {
      ang += (r() - 0.5) * 0.7;
      x += Math.cos(ang) * 3;
      y += Math.sin(ang) * 3;
      pts.push([x, y]);
    }
    stroke(g, T, T, pts, 'rgba(60,54,48,0.45)', 1);
  }
  posterise(g, T, T, ramp('#b4a488', '#c8ba9e', '#d8ccb2', '#e6dcc4'), null, 90, 170);
  return c;
}

function rock(): HTMLCanvasElement {
  const r = die(54);
  const [c, g] = canvas(T, T);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, T, T);
  for (let i = 0; i < 50; i++) {
    dab(
      g,
      T,
      T,
      r() * T,
      r() * T,
      10 + r() * 24,
      6 + r() * 14,
      -0.3 + (r() - 0.5) * 0.4,
      128 + (r() - 0.5) * 90,
      0.5,
    );
  }
  // Strata: the beds of the cliff, running a little downhill.
  for (let i = 0; i < 14; i++) {
    const y0 = r() * T;
    const pts: [number, number][] = [];
    for (let x = 0; x <= T; x += 4) pts.push([x, y0 + x * 0.12 + Math.sin(x / 11 + i) * 1.5]);
    stroke(
      g,
      T,
      T,
      pts,
      `rgba(${r() < 0.6 ? '40,36,32' : '200,192,180'},0.4)`,
      1 + Math.floor(r() * 2),
    );
  }
  for (let i = 0; i < 900; i++) {
    dab(g, T, T, r() * T, r() * T, 0.8, 0.8, 0, 128 + (r() - 0.5) * 100, 0.5);
  }
  posterise(
    g,
    T,
    T,
    ramp('#46403a', '#5c5650', '#726a62', '#888078', '#a0988e', '#b4aca0'),
    null,
    50,
    200,
  );
  return c;
}

function iron(): HTMLCanvasElement {
  const r = die(55);
  const [c, g] = canvas(T, T);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, T, T);
  for (let i = 0; i < 240; i++) {
    dab(g, T, T, r() * T, r() * T, 2 + r() * 6, 2 + r() * 6, 0, 128 + (r() - 0.5) * 50, 0.5);
  }
  for (let k = 0; k < T; k += 64) {
    g.fillStyle = 'rgb(40,40,40)';
    g.fillRect(0, k, T, 1);
    g.fillRect(k, 0, 1, T);
    g.fillStyle = 'rgb(190,190,190)';
    g.fillRect(0, k + 1, T, 1);
    g.fillRect(k + 1, 0, 1, T);
    for (let m = 8; m < T; m += 16) {
      for (const [x, y] of [
        [k + 5, m],
        [m, k + 5],
      ] as const) {
        g.fillStyle = 'rgb(40,40,40)';
        g.fillRect(x, y, 3, 3);
        g.fillStyle = 'rgb(210,210,210)';
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  posterise(
    g,
    T,
    T,
    ramp('#2c2c30', '#404044', '#545458', '#68686c', '#808084', '#9a9a9e'),
    null,
    40,
    210,
  );
  return c;
}

function marble(): HTMLCanvasElement {
  const r = die(56);
  const [c, g] = canvas(T, T);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, T, T);
  for (let i = 0; i < 26; i++) {
    dab(
      g,
      T,
      T,
      r() * T,
      r() * T,
      16 + r() * 26,
      10 + r() * 18,
      r() * Math.PI,
      128 + (r() - 0.5) * 44,
      0.5,
    );
  }
  for (let v = 0; v < 5; v++) {
    let x = r() * T;
    let y = r() * T;
    let ang = -0.7 + (r() - 0.5) * 0.9;
    const pts: [number, number][] = [];
    for (let t = 0; t < 60 + r() * 90; t += 3) {
      ang += (r() - 0.5) * 0.4;
      x += Math.cos(ang) * 3;
      y += Math.sin(ang) * 3;
      pts.push([x, y]);
    }
    stroke(g, T, T, pts, 'rgba(80,76,84,0.25)', 3);
    stroke(g, T, T, pts, 'rgba(80,76,84,0.3)', 1);
  }
  posterise(
    g,
    T,
    T,
    ramp('#8e8a90', '#a6a2a8', '#b8b4ba', '#c8c6ca', '#d8d6da', '#e6e4e6', '#f0eef0'),
    null,
    70,
    196,
  );
  return c;
}

/** A moulded stone trim: the plaster's tones with three courses of light and shade. */
function trim(): HTMLCanvasElement {
  const c = plaster();
  const g = c.getContext('2d')!;
  for (const y of [0.2, 0.5, 0.8]) {
    const yy = Math.round(y * T);
    g.fillStyle = 'rgba(255,250,240,0.55)';
    g.fillRect(0, yy - 2, T, 2);
    g.fillStyle = 'rgba(30,24,20,0.5)';
    g.fillRect(0, yy + 1, T, 1);
  }
  return c;
}

function leaves(): HTMLCanvasElement {
  const r = die(57);
  const [c, g] = canvas(T, T);
  g.fillStyle = '#606060';
  g.fillRect(0, 0, T, T);
  for (let i = 0; i < 90; i++) {
    dab(g, T, T, r() * T, r() * T, 2 + r() * 4, 2 + r() * 4, 0, 40, 0.8);
  }
  for (let i = 0; i < 260; i++) {
    const t = 110 + r() * 110;
    dab(g, T, T, r() * T, r() * T, 2.5 + r() * 4.5, 2 + r() * 3.5, r() * Math.PI, t, 0.75);
  }
  posterise(g, T, T, ramp('#203a16', '#2e5420', '#40702a', '#568c38', '#74a84a'), null, 40, 220);
  return c;
}

export const PAINTERS: Record<string, { paint: () => HTMLCanvasElement; metresPerTile: number }> = {
  ashlar: { paint: ashlar, metresPerTile: 2 },
  flagstone: { paint: flagstone, metresPerTile: 2 },
  plank: { paint: plank, metresPerTile: 2 },
  iron: { paint: iron, metresPerTile: 1 },
  plaster: { paint: plaster, metresPerTile: 2 },
  rock: { paint: rock, metresPerTile: 4 },
  marble: { paint: marble, metresPerTile: 2 },
  trim: { paint: trim, metresPerTile: 1 },
  // Five metres to a tile (critics, round 11: about four centimetres a texel, MM6's two
  // or three screen pixels at the foot of the view).
  grass: { paint: grass, metresPerTile: 5 },
  path: { paint: dirt, metresPerTile: 5 },
  scree: { paint: scree, metresPerTile: 6 },
  snow: { paint: snow, metresPerTile: 6 },
  bark: { paint: bark, metresPerTile: 1 },
  leaves: { paint: leaves, metresPerTile: 1.5 },
  sand: { paint: sand, metresPerTile: 8 },
  sandstone: { paint: sandstone, metresPerTile: 2 },
};

/**
 * Mip levels that keep the tile's tones and some of its grain (critics, rounds 11 to 13). Two
 * chains run down the levels: the mean of every two by two of the level above, carried
 * unsnapped, and one texel of every two by two picked by a hash so no lattice shows (round
 * 12's picked levels). Each level is uploaded halfway from its mean to its pick, snapped to
 * the nearest of the tile's own colours, so a far road keeps the ground's palette instead of
 * fading into in-between browns (talk-world critic, round 13: the mean alone flattened the
 * far hill to hp5 1.2, picking alone salted it to 10.9; MM6's is 4.1 to 8.5). Uploaded
 * straight into the WebGL texture after Babylon generated its chain; elsewhere the generated
 * chain stays.
 */
function snappedMips(scene: Scene, texture: DynamicTexture, picture: HTMLCanvasElement): void {
  const engine = scene.getEngine() as unknown as {
    _gl?: WebGL2RenderingContext;
    _bindTextureDirectly?(target: number, texture: unknown, forUpdate?: boolean): boolean;
  };
  const gl = engine._gl;
  const internal = texture.getInternalTexture();
  if (!gl || !internal || !engine._bindTextureDirectly) return;
  let w = picture.width;
  let h = picture.height;
  const base = picture.getContext('2d')!.getImageData(0, 0, w, h).data;
  // The tile's own colours, once.
  const seen = new Set<number>();
  const palette: number[] = [];
  for (let i = 0; i < base.length; i += 4) {
    const key = (base[i]! << 16) | (base[i + 1]! << 8) | base[i + 2]!;
    if (seen.has(key)) continue;
    seen.add(key);
    palette.push(base[i]!, base[i + 1]!, base[i + 2]!);
  }
  let level = new Float32Array(w * h * 3);
  for (let i = 0, j = 0; i < base.length; i += 4, j += 3) {
    level[j] = base[i]!;
    level[j + 1] = base[i + 1]!;
    level[j + 2] = base[i + 2]!;
  }
  // The picked chain starts from the same picture.
  let picked = level;
  const target = new Float32Array(3);
  engine._bindTextureDirectly(gl.TEXTURE_2D, internal, true);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  for (let mip = 1; w > 1 || h > 1; mip++) {
    const nw = Math.max(1, w >> 1);
    const nh = Math.max(1, h >> 1);
    const next = new Float32Array(nw * nh * 3);
    const nextPicked = new Float32Array(nw * nh * 3);
    const out = new Uint8ClampedArray(nw * nh * 4);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const d = (y * nw + x) * 3;
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const sx = Math.min(w - 1, 2 * x + dx);
              const sy = Math.min(h - 1, 2 * y + dy);
              sum += level[(sy * w + sx) * 3 + c]!;
            }
          }
          next[d + c] = sum / 4;
        }
        // Round 12's pick: one texel of the two by two of the picked level above, by a hash
        // of its place and level.
        const pick =
          Math.imul((x * 73856093) ^ (y * 19349663) ^ (mip * 83492791), 2654435761) >>> 30;
        const px = Math.min(w - 1, 2 * x + (pick & 1));
        const py = Math.min(h - 1, 2 * y + (pick >> 1));
        const s = (py * w + px) * 3;
        // Uploaded halfway from the mean to the pick.
        for (let c = 0; c < 3; c++) {
          nextPicked[d + c] = picked[s + c]!;
          target[c] = next[d + c]! + 0.5 * (nextPicked[d + c]! - next[d + c]!);
        }
        let best = 0;
        let bestD = Infinity;
        for (let k = 0; k < palette.length; k += 3) {
          const dr = target[0]! - palette[k]!;
          const dg = target[1]! - palette[k + 1]!;
          const db = target[2]! - palette[k + 2]!;
          const dd = dr * dr + dg * dg + db * db;
          if (dd < bestD) {
            bestD = dd;
            best = k;
          }
        }
        const o = (y * nw + x) * 4;
        out[o] = palette[best]!;
        out[o + 1] = palette[best + 1]!;
        out[o + 2] = palette[best + 2]!;
        out[o + 3] = 255;
      }
    }
    gl.texSubImage2D(gl.TEXTURE_2D, mip, 0, 0, nw, nh, gl.RGBA, gl.UNSIGNED_BYTE, out);
    // The mean runs on unsnapped, the pick on its own picks.
    level = next;
    picked = nextPicked;
    w = nw;
    h = nh;
  }
  engine._bindTextureDirectly(gl.TEXTURE_2D, null);
}

/**
 * The ground's two tiles keep their own colours, as each of MM6's bitmaps carried its own
 * palette: snapped to the frame's 256 the dirt fell from 384 colours to 17 and the grass to
 * 11 (talk-world critic, round 13: the near dirt flat, 19 colours to MM6's 85).
 */
const OWN_COLOURS = new Set(['grass', 'path']);

/** Paint every role's texture; `mipmaps` selects the sampling mode of the retro look. */
export function paintRoleTextures(scene: Scene, mipmaps = true): RoleTextures {
  const out: RoleTextures = new Map();
  for (const [role, { paint, metresPerTile }] of Object.entries(PAINTERS)) {
    const id = ROLE[role as keyof typeof ROLE];
    const picture = OWN_COLOURS.has(role) ? paint() : palettise(paint());
    // Mipmaps on the ground too: a magnified texel is a block whether or not the texture
    // has mipmaps, and without them the distance shimmered into colour noise (round 7).
    const mips = mipmaps;
    const texture = new DynamicTexture(`painted-${role}`, { width: T, height: T }, scene, mips);
    texture.getContext().drawImage(picture, 0, 0);
    texture.update(false);
    if (mips) snappedMips(scene, texture, picture);
    // A tile repeats across the world; a dynamic texture clamps unless told otherwise, and
    // clamped it paints the whole ground in its corner texel.
    texture.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
    texture.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
    applyRetroSampling(texture, mips);
    out.set(id, { texture, metresPerTile });
  }
  out.set(ROLE.glass, {
    texture: lampPane(scene),
    metresPerTile: 0.3,
    emissive: new Color3(1.1, 0.74, 0.38),
  });
  out.set(ROLE.water, {
    texture: stillWater(scene),
    metresPerTile: 3,
    tint: new Color3(0.8, 0.95, 1),
    emissive: new Color3(0.06, 0.11, 0.13),
  });
  return out;
}
