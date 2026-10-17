/**
 * The world's textures, painted (DESIGN.md 16.13). MM6's ground, walls and roofs were small
 * bitmaps a painter speckled and ruled by hand: dirt in five browns, grass in four greens,
 * cobbles drawn stone by stone, ashlar in courses with mortar lines, planks with grain. The
 * photographed CC0 textures read as smooth 3D under the posteriser (critics, 2026-10-17);
 * these are drawn at startup with the shell's brushes, 128 pixels to a tile, and sampled
 * nearest so the texels show, as they did in 1998.
 */
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import { ROLE } from '../../kernel/elements/roles';
import { canvas, dab, die, posterise, ramp, speckle, stroke, type Tone } from '../render/brush';
import { applyRetroSampling } from '../render/materials';
import { lampPane, stillWater, type RoleTextures } from './textures';

const T = 128;

function grass(): HTMLCanvasElement {
  return speckle(T, T, 31, ramp('#34542a', '#446a2e', '#567e36', '#6c9444'), {
    fine: 3400,
    fineTone: 56,
    blobs: 50,
    blobTone: 26,
    blobSize: 12,
  });
}

function dirt(): HTMLCanvasElement {
  const c = speckle(T, T, 32, ramp('#5c4228', '#745634', '#8c6a42', '#a07e52', '#b49466'), {
    fine: 3000,
    fineTone: 60,
    blobs: 70,
    blobTone: 28,
    blobSize: 10,
  });
  // Pebbles: a dark dot with a lit crown.
  const g = c.getContext('2d')!;
  const r = die(33);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * T);
    const y = Math.floor(r() * T);
    g.fillStyle = '#4a3420';
    g.fillRect(x, y, 2, 2);
    g.fillStyle = '#b89c72';
    g.fillRect(x, y, 1, 1);
  }
  return c;
}

function sand(): HTMLCanvasElement {
  return speckle(T, T, 34, ramp('#b09660', '#c4ac74', '#d4be88', '#e0cc9c', '#ecdcb0'), {
    fine: 3200,
    fineTone: 44,
    blobs: 40,
    blobTone: 22,
    blobSize: 14,
  });
}

function snow(): HTMLCanvasElement {
  return speckle(T, T, 35, ramp('#b4c0d2', '#ccd6e2', '#e0e6ee', '#f2f4f8'), {
    fine: 1200,
    fineTone: 30,
    blobs: 60,
    blobTone: 30,
    blobSize: 16,
  });
}

function scree(): HTMLCanvasElement {
  const c = speckle(T, T, 36, ramp('#4a4844', '#625e58', '#7a766e', '#928c82', '#aaa498'), {
    fine: 1600,
    fineTone: 70,
    blobs: 160,
    blobTone: 56,
    blobSize: 5,
  });
  return c;
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
  grass: { paint: grass, metresPerTile: 4 },
  path: { paint: dirt, metresPerTile: 4 },
  scree: { paint: scree, metresPerTile: 4 },
  snow: { paint: snow, metresPerTile: 4 },
  bark: { paint: bark, metresPerTile: 1 },
  leaves: { paint: leaves, metresPerTile: 1.5 },
  sand: { paint: sand, metresPerTile: 4 },
  sandstone: { paint: sandstone, metresPerTile: 4 },
};

/** Paint every role's texture; `mipmaps` selects the sampling mode of the retro look. */
export function paintRoleTextures(scene: Scene, mipmaps = true): RoleTextures {
  const out: RoleTextures = new Map();
  for (const [role, { paint, metresPerTile }] of Object.entries(PAINTERS)) {
    const id = ROLE[role as keyof typeof ROLE];
    const picture = paint();
    const texture = new DynamicTexture(`painted-${role}`, { width: T, height: T }, scene, mipmaps);
    texture.getContext().drawImage(picture, 0, 0);
    texture.update(false);
    applyRetroSampling(texture, mipmaps);
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
