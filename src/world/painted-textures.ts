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
import { canvas, dab, die, grain, posterise, ramp, snap, stroke, type Tone } from '../render/brush';
import { applyRetroSampling } from '../render/materials';
import { palettise } from '../render/palette';
import { lampPane, stillWater, type RoleTextures } from './textures';

const T = 128;

function grass(): HTMLCanvasElement {
  // MM6's turf (critics, round 9: (61,84,45), green twenty levels over red).
  return grain(T, T, 31, ramp('#2c4420', '#365228', '#416030', '#4c6e38', '#5b7d3e', '#6a8c44'), {
    marks: 3200,
    clods: 54,
    clodSize: 10,
    base: 6,
  });
}

function dirt(): HTMLCanvasElement {
  // MM6's earth (critics, round 9: (57,28,16) to (107,73,57), its darkest common tone
  // (57,28,16), no black confetti).
  const tones = ramp('#391c10', '#45251a', '#513023', '#5d3b2d', '#644233', '#6b4939');
  const c = grain(T, T, 32, tones, {
    marks: 2600,
    clods: 80,
    clodSize: 7,
    base: 8,
  });
  const g = c.getContext('2d')!;
  const r = die(33);
  for (let i = 0; i < 16; i++) {
    let x = r() * T;
    let y = r() * T;
    let ang = r() * Math.PI * 2;
    const pts: [number, number][] = [[x, y]];
    const len = 10 + r() * 24;
    for (let t = 0; t < len; t += 2) {
      ang += (r() - 0.5) * 0.9;
      x += Math.cos(ang) * 2;
      y += Math.sin(ang) * 2;
      pts.push([x, y]);
    }
    stroke(g, T, T, pts, '#3a1c10', 1);
  }
  // Pits and pebbles (critics, round 10): dark clusters of two to eight texels over about
  // four percent of the tile, light pebbles over two, each a blob, not a dot.
  for (let i = 0; i < 70; i++) {
    const x = r() * T;
    const y = r() * T;
    const s = 1 + r() * 1.6;
    g.fillStyle = '#391c10';
    for (const dx of [-T, 0, T]) {
      for (const dy of [-T, 0, T]) {
        g.beginPath();
        g.ellipse(x + dx, y + dy, s, s * (0.5 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * T);
    const y = Math.floor(r() * T);
    g.fillStyle = '#7a5845';
    g.fillRect(x, y, 1 + Math.floor(r() * 2), 1);
    g.fillStyle = '#8a6a50';
    g.fillRect(x, y, 1, 1);
  }
  snap(g, T, T, tones);
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
  // Steep faces in an olive scree (critics, round 9: the grey made the hills grey; MM6's
  // hills stay green (61,84,45) with brown scars).
  return grain(T, T, 36, ramp('#3a3c20', '#484e2a', '#566034', '#64703e', '#728048'), {
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
  posterise(g, T, T, tones, null, 50, 200);
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
  grass: { paint: grass, metresPerTile: 14 },
  path: { paint: dirt, metresPerTile: 14 },
  scree: { paint: scree, metresPerTile: 6 },
  snow: { paint: snow, metresPerTile: 6 },
  bark: { paint: bark, metresPerTile: 1 },
  leaves: { paint: leaves, metresPerTile: 1.5 },
  sand: { paint: sand, metresPerTile: 8 },
  sandstone: { paint: sandstone, metresPerTile: 4 },
};

/** Paint every role's texture; `mipmaps` selects the sampling mode of the retro look. */
export function paintRoleTextures(scene: Scene, mipmaps = true): RoleTextures {
  const out: RoleTextures = new Map();
  for (const [role, { paint, metresPerTile }] of Object.entries(PAINTERS)) {
    const id = ROLE[role as keyof typeof ROLE];
    const picture = palettise(paint());
    // Mipmaps on the ground too: a magnified texel is a block whether or not the texture
    // has mipmaps, and without them the distance shimmered into colour noise (round 7).
    const mips = mipmaps;
    const texture = new DynamicTexture(`painted-${role}`, { width: T, height: T }, scene, mips);
    texture.getContext().drawImage(picture, 0, 0);
    texture.update(false);
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
