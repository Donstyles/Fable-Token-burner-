/**
 * Ground shade (DESIGN.md 17.4): soft shadows under every tree, bush, house, rock and prop of
 * an outdoor level, painted once at load into one texture over the whole map and multiplied
 * into the terrain's light by its shader. Nothing is drawn per frame for it: no shadow map, no
 * caster pass, one texture read per ground pixel.
 *
 * Each texel carries two occlusions, both 0 (open sky) to 1:
 * - **sun**, the share of the direct sun a caster takes: under a crown, a pool from the
 *   crown's own silhouette seen from above, set a little away from the day's average sun; round
 *   a house or a prop, its shadow cast along that sun onto the ground at its foot.
 * - **sky**, the share of the sky's ambient light it takes: the walls' skirt, darkest under the
 *   eaves and fading over a metre or two, and a broader, lighter pool under a crown.
 *
 * The casters are the models' own triangles placed by the same matrices as their thin
 * instances, so the shade lines up with what is drawn by construction, mirror and all.
 */
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { daylightAt } from './daylight';

/** Texels across the map: 640 m at about 31 cm a texel, fine enough to seat a wall. */
export const SHADE_TEXELS = 2048;

/** A square of the level's ground plane in scene space (x mirrored from the kernel's). */
export interface ShadeGrid {
  minX: number;
  minZ: number;
  /** Metres across, in x and in z. */
  size: number;
  texels: number;
}

/** A model's triangles in its own metres, foot at y = 0, as the loaded mesh holds them. */
export interface ShadeMesh {
  positions: ArrayLike<number>;
  indices: ArrayLike<number>;
}

export interface ShadeCaster {
  /** A tree or a bush: a pool under its crown rather than a cast of a solid. */
  canopy: boolean;
  mesh: ShadeMesh;
}

/** One placed model: its id and its instance matrix (Babylon's row-major 16 floats). */
export interface ShadeInstance {
  model: string;
  matrix: ArrayLike<number>;
}

/**
 * How far a caster's shadow is set along the ground for every metre of height: the
 * horizontal step of the day's average sun, a quarter of it for crowns (the pool stays
 * under the tree, which the sun circles) and four fifths for houses and props (a cast to the
 * north that shows past a house's sides, about half a metre for every metre of wall and roof).
 */
const CROWN_CAST = 0.25;
const SOLID_CAST = 0.8;
/** Optical depth a layer of foliage adds: two layers (a crown's top and underside) take 75%. */
const LEAF_DEPTH = 0.7;
/** A crown lets more sky through than a roof: its sky pool is lighter. */
const CROWN_SKY = 0.6;
/**
 * Softness, as a Gaussian's spread in metres: a crown's sun pool and its broader sky pool; a
 * house's cast; and its skirt, spread from the eaves' line over three metres and lifted so it
 * stays full a good way past that line, darkest at the walls: a skirt only a metre or two wide
 * hid under the eaves and did not read from the street (owner, 2026-10-23: "I want shadows
 * under trees and buildings").
 */
const CROWN_SOFT = 0.6;
const CROWN_SKY_SOFT = 1.1;
const CAST_SOFT = 0.75;
const SKIRT_SOFT = 3.2;
const SKIRT_LIFT = 3.2;
/** Metres a texel of a crown's own mask. */
const MASK_RES = 0.25;

/** The box radius whose three passes spread about `sigma` metres at `cell` metres a texel. */
function blurRadius(sigma: number, cell: number): number {
  // Three passes of a box of radius r spread sqrt(r (r + 1)) texels.
  const s = sigma / cell;
  return Math.max(1, Math.round((Math.sqrt(1 + 4 * s * s) - 1) / 2));
}

/** The grid over a level's bounds (kernel space) in scene space. */
export function shadeGridFor(
  bounds: { min: [number, number, number]; max: [number, number, number] },
  texels = SHADE_TEXELS,
): ShadeGrid {
  // Mirrored on X: the kernel's max x is the scene's min.
  const minX = -bounds.max[0];
  const maxX = -bounds.min[0];
  const size = Math.max(maxX - minX, bounds.max[2] - bounds.min[2]);
  return { minX, minZ: bounds.min[2], size, texels };
}

/**
 * The day's average sun as a shadow's step along the ground per metre of height, in scene
 * space: the sun's direction averaged over its hours above the horizon, weighted by its
 * strength, then turned round. The sun rises in the east and sets in the west, so the step
 * points north (+z), about 0.6 m a metre for Gullhaven's sun path.
 */
export function averageShadowStep(): { x: number; z: number } {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let minute = 0; minute < 24 * 60; minute += 10) {
    const { sunDirection: s, daylight } = daylightAt(minute);
    if (s.y <= 0) continue;
    x += s.x * daylight;
    y += s.y * daylight;
    z += s.z * daylight;
  }
  return { x: -x / y, z: -z / y };
}

/** Fill a triangle into a tile, in tile texels (texel centres at +0.5): add or keep the max. */
function fillTriangle(
  tile: Float32Array,
  w: number,
  h: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  value: number,
  add: boolean,
): void {
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(area) < 1e-9) return;
  const i0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5));
  const i1 = Math.min(w - 1, Math.floor(Math.max(ax, bx, cx) - 0.5));
  const j0 = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5));
  const j1 = Math.min(h - 1, Math.floor(Math.max(ay, by, cy) - 0.5));
  const s = area > 0 ? 1 : -1;
  for (let j = j0; j <= j1; j++) {
    const py = j + 0.5;
    for (let i = i0; i <= i1; i++) {
      const px = i + 0.5;
      const e0 = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) * s;
      const e1 = ((cx - bx) * (py - by) - (cy - by) * (px - bx)) * s;
      const e2 = ((ax - cx) * (py - cy) - (ay - cy) * (px - cx)) * s;
      if (e0 < 0 || e1 < 0 || e2 < 0) continue;
      const k = j * w + i;
      tile[k] = add ? tile[k]! + value : Math.max(tile[k]!, value);
    }
  }
}

/** A box blur of radius r texels along rows, then along columns; three make a Gaussian. */
function boxBlur(tile: Float32Array, w: number, h: number, r: number, passes = 3): void {
  if (r <= 0) return;
  const line = new Float32Array(Math.max(w, h));
  const norm = 1 / (2 * r + 1);
  const run = (n: number, at: (i: number) => number, set: (i: number, v: number) => void) => {
    for (let i = 0; i < n; i++) line[i] = at(i);
    let sum = 0;
    for (let i = 0; i <= Math.min(r, n - 1); i++) sum += line[i]!;
    for (let i = 0; i < n; i++) {
      set(i, sum * norm);
      const add = i + r + 1;
      const drop = i - r;
      if (add < n) sum += line[add]!;
      if (drop >= 0) sum -= line[drop]!;
    }
  };
  for (let p = 0; p < passes; p++) {
    for (let j = 0; j < h; j++) {
      const row = j * w;
      run(
        w,
        (i) => tile[row + i]!,
        (i, v) => (tile[row + i] = v),
      );
    }
    for (let i = 0; i < w; i++) {
      run(
        h,
        (j) => tile[j * w + i]!,
        (j, v) => (tile[j * w + i] = v),
      );
    }
  }
}

/** A crown's shade in its own metres: sun and sky masks and its height of shade. */
interface CanopyMask {
  x0: number;
  z0: number;
  w: number;
  h: number;
  /** Shade as bytes, 0 to 255, row by row along z. */
  sun: Uint8Array;
  sky: Uint8Array;
  /** Mean height of the foliage, weighted by the ground it covers. */
  crown: number;
}

/**
 * A crown seen from straight above: every triangle laid on the ground adds a layer of leaves,
 * and the layers' depth makes the shade, so a dense oak is dark at its heart and a dead tree's
 * bare branches let most of the sun through.
 */
function canopyMask(mesh: ShadeMesh): CanopyMask {
  const p = mesh.positions;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    minX = Math.min(minX, p[i]!);
    maxX = Math.max(maxX, p[i]!);
    minZ = Math.min(minZ, p[i + 2]!);
    maxZ = Math.max(maxZ, p[i + 2]!);
  }
  const margin = 3 * CROWN_SKY_SOFT + MASK_RES;
  const x0 = minX - margin;
  const z0 = minZ - margin;
  const w = Math.ceil((maxX - minX + 2 * margin) / MASK_RES);
  const h = Math.ceil((maxZ - minZ + 2 * margin) / MASK_RES);
  const layers = new Float32Array(w * h);
  const idx = mesh.indices;
  let areaSum = 0;
  let heightSum = 0;
  const u = (k: number): number => (p[k * 3]! - x0) / MASK_RES;
  const v = (k: number): number => (p[k * 3 + 2]! - z0) / MASK_RES;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t]!;
    const b = idx[t + 1]!;
    const c = idx[t + 2]!;
    fillTriangle(layers, w, h, u(a), v(a), u(b), v(b), u(c), v(c), 1, true);
    const area = Math.abs((u(b) - u(a)) * (v(c) - v(a)) - (v(b) - v(a)) * (u(c) - u(a)));
    areaSum += area;
    heightSum += (area * (p[a * 3 + 1]! + p[b * 3 + 1]! + p[c * 3 + 1]!)) / 3;
  }
  const sun = new Float32Array(w * h);
  for (let i = 0; i < sun.length; i++) sun[i] = 1 - Math.exp(-LEAF_DEPTH * layers[i]!);
  const sky = sun.slice();
  boxBlur(sun, w, h, blurRadius(CROWN_SOFT, MASK_RES));
  boxBlur(sky, w, h, blurRadius(CROWN_SKY_SOFT, MASK_RES));
  for (let i = 0; i < sky.length; i++) sky[i] = sky[i]! * CROWN_SKY;
  // Cropped to what rounds to a shade at all, so a stamp walks no empty margin.
  let ci0 = w;
  let ci1 = -1;
  let cj0 = h;
  let cj1 = -1;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (Math.max(sun[j * w + i]!, sky[j * w + i]!) < 0.5 / 255) continue;
      ci0 = Math.min(ci0, i);
      ci1 = Math.max(ci1, i);
      cj0 = Math.min(cj0, j);
      cj1 = Math.max(cj1, j);
    }
  }
  const crown = areaSum > 0 ? heightSum / areaSum : 0;
  if (ci1 < 0) return { x0, z0, w: 0, h: 0, sun: new Uint8Array(), sky: new Uint8Array(), crown };
  const cw = ci1 - ci0 + 1;
  const ch = cj1 - cj0 + 1;
  const crop = (src: Float32Array): Uint8Array => {
    const dst = new Uint8Array(cw * ch);
    for (let j = 0; j < ch; j++) {
      for (let i = 0; i < cw; i++)
        dst[j * cw + i] = Math.round(src[(cj0 + j) * w + ci0 + i]! * 255);
    }
    return dst;
  };
  return {
    x0: x0 + ci0 * MASK_RES,
    z0: z0 + cj0 * MASK_RES,
    w: cw,
    h: ch,
    sun: crop(sun),
    sky: crop(sky),
    crown,
  };
}

/**
 * Paint the shade of every instance into a two-channel texture over the grid, sun then sky
 * per texel, row by row along z (row 0 at the grid's min z), a byte each. Overlapping shade
 * keeps the darker of the two, so a dense wood is as dark as its densest crown and no darker:
 * the forest floor keeps its colour.
 */
export function paintGroundShade(
  grid: ShadeGrid,
  casters: ReadonlyMap<string, ShadeCaster>,
  instances: readonly ShadeInstance[],
  step: { x: number; z: number } = averageShadowStep(),
): Uint8Array {
  const n = grid.texels;
  const cell = grid.size / n;
  const out = new Uint8Array(n * n * 2);
  const put = (i: number, j: number, channel: number, v: number): void => {
    if (i < 0 || j < 0 || i >= n || j >= n || v <= 0) return;
    const k = (j * n + i) * 2 + channel;
    const b = Math.min(255, Math.round(v * 255));
    if (b > out[k]!) out[k] = b;
  };
  const masks = new Map<string, CanopyMask>();
  for (const inst of instances) {
    const caster = casters.get(inst.model);
    if (!caster) continue;
    const m = inst.matrix;
    if (caster.canopy) {
      let mask = masks.get(inst.model);
      if (!mask) masks.set(inst.model, (mask = canopyMask(caster.mesh)));
      stampCanopy(mask, m, grid, cell, step, out);
    } else {
      castSolid(caster.mesh, m, grid, cell, step, put);
    }
  }
  return out;
}

type Put = (i: number, j: number, channel: number, v: number) => void;

/** A crown's masks laid on the ground under one instance, turned and scaled with it. */
function stampCanopy(
  mask: CanopyMask,
  m: ArrayLike<number>,
  grid: ShadeGrid,
  cell: number,
  step: { x: number; z: number },
  out: Uint8Array,
): void {
  // Local (x, 0, z) lands at (x m0 + z m8 + m12, x m2 + z m10 + m14), as Babylon transforms
  // a point by a matrix; the inverse takes a texel back into the crown's own metres.
  const a = m[0]!;
  const b = m[8]!;
  const c = m[2]!;
  const d = m[10]!;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) return;
  const heightScale = Math.hypot(m[4]!, m[5]!, m[6]!);
  const lift = mask.crown * heightScale * CROWN_CAST;
  // The sun's pool is the sky's moved along the ground by the cast.
  const ox = step.x * lift;
  const oz = step.z * lift;
  const tx = m[12]!;
  const tz = m[14]!;
  // The ground the two pools cover: the mask's corners placed, and placed again with the cast.
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const x1 = mask.x0 + mask.w * MASK_RES;
  const z1 = mask.z0 + mask.h * MASK_RES;
  for (const [lx, lz] of [
    [mask.x0, mask.z0],
    [x1, mask.z0],
    [mask.x0, z1],
    [x1, z1],
  ] as const) {
    const wx = lx * a + lz * b + tx;
    const wz = lx * c + lz * d + tz;
    minX = Math.min(minX, wx, wx + ox);
    maxX = Math.max(maxX, wx, wx + ox);
    minZ = Math.min(minZ, wz, wz + oz);
    maxZ = Math.max(maxZ, wz, wz + oz);
  }
  const n = grid.texels;
  const i0 = Math.max(0, Math.floor((minX - grid.minX) / cell));
  const i1 = Math.min(n - 1, Math.ceil((maxX - grid.minX) / cell));
  const j0 = Math.max(0, Math.floor((minZ - grid.minZ) / cell));
  const j1 = Math.min(n - 1, Math.ceil((maxZ - grid.minZ) / cell));
  // Mask texel coordinates are linear in the grid's: (u, v) at texel (i0, j), stepping
  // (du, dv) along a row, mask texel (i, j) covering [i, i + 1) by [j, j + 1); the sun's read
  // sits (su, sv) behind the sky's. The nearest mask texel: the masks are blurred smooth and
  // finer than the grid, and the GPU filters the painted texture, so a bilinear read here buys
  // nothing visible for three times the time.
  const k = 1 / (det * MASK_RES);
  const toU = (dx: number, dz: number): number => (d * dx - b * dz) * k;
  const toV = (dx: number, dz: number): number => (a * dz - c * dx) * k;
  const u0 = -mask.x0 / MASK_RES;
  const v0 = -mask.z0 / MASK_RES;
  const du = toU(cell, 0);
  const dv = toV(cell, 0);
  const su = toU(ox, oz);
  const sv = toV(ox, oz);
  const { w, h, sun, sky } = mask;
  for (let j = j0; j <= j1; j++) {
    const dz = grid.minZ + (j + 0.5) * cell - tz;
    const dx = grid.minX + (i0 + 0.5) * cell - tx;
    let u = u0 + toU(dx, dz);
    let v = v0 + toV(dx, dz);
    let o = (j * n + i0) * 2;
    for (let i = i0; i <= i1; i++, u += du, v += dv, o += 2) {
      if (u >= 0 && v >= 0 && u < w && v < h) {
        const s = sky[(v | 0) * w + (u | 0)]!;
        if (s > out[o + 1]!) out[o + 1] = s;
      }
      const us = u - su;
      const vs = v - sv;
      if (us >= 0 && vs >= 0 && us < w && vs < h) {
        const s = sun[(vs | 0) * w + (us | 0)]!;
        if (s > out[o]!) out[o] = s;
      }
    }
  }
}

/**
 * A house, a prop or a rock: its triangles placed by its matrix and laid on the ground at its
 * foot twice, cast along the average sun for the sun's shadow and straight down for the
 * skirt, whose blur spreads past the eaves and seats the walls.
 */
function castSolid(
  mesh: ShadeMesh,
  m: ArrayLike<number>,
  grid: ShadeGrid,
  cell: number,
  step: { x: number; z: number },
  put: Put,
): void {
  const p = mesh.positions;
  const count = p.length / 3;
  if (!count) return;
  const footY = m[13]!;
  const flat = new Float64Array(count * 2);
  const cast = new Float64Array(count * 2);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let k = 0; k < count; k++) {
    const x = p[k * 3]!;
    const y = p[k * 3 + 1]!;
    const z = p[k * 3 + 2]!;
    const wx = x * m[0]! + y * m[4]! + z * m[8]! + m[12]!;
    const wy = x * m[1]! + y * m[5]! + z * m[9]! + m[13]!;
    const wz = x * m[2]! + y * m[6]! + z * m[10]! + m[14]!;
    const rise = Math.max(0, wy - footY) * SOLID_CAST;
    flat[k * 2] = wx;
    flat[k * 2 + 1] = wz;
    cast[k * 2] = wx + step.x * rise;
    cast[k * 2 + 1] = wz + step.z * rise;
    minX = Math.min(minX, wx, cast[k * 2]!);
    maxX = Math.max(maxX, wx, cast[k * 2]!);
    minZ = Math.min(minZ, wz, cast[k * 2 + 1]!);
    maxZ = Math.max(maxZ, wz, cast[k * 2 + 1]!);
  }
  // A tile on the grid's own texels round the caster, with room for the blur.
  const margin = 3 * SKIRT_SOFT + cell;
  const i0 = Math.floor((minX - margin - grid.minX) / cell);
  const j0 = Math.floor((minZ - margin - grid.minZ) / cell);
  const w = Math.ceil((maxX + margin - grid.minX) / cell) - i0;
  const h = Math.ceil((maxZ + margin - grid.minZ) / cell) - j0;
  const sun = new Float32Array(w * h);
  const sky = new Float32Array(w * h);
  const tu = (xy: Float64Array, k: number): number => (xy[k * 2]! - grid.minX) / cell - i0;
  const tv = (xy: Float64Array, k: number): number => (xy[k * 2 + 1]! - grid.minZ) / cell - j0;
  const idx = mesh.indices;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t]!;
    const b = idx[t + 1]!;
    const c = idx[t + 2]!;
    fillTriangle(
      sun,
      w,
      h,
      tu(cast, a),
      tv(cast, a),
      tu(cast, b),
      tv(cast, b),
      tu(cast, c),
      tv(cast, c),
      1,
      false,
    );
    fillTriangle(
      sky,
      w,
      h,
      tu(flat, a),
      tv(flat, a),
      tu(flat, b),
      tv(flat, b),
      tu(flat, c),
      tv(flat, c),
      1,
      false,
    );
  }
  boxBlur(sun, w, h, blurRadius(CAST_SOFT, cell));
  boxBlur(sky, w, h, blurRadius(SKIRT_SOFT, cell));
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      put(i0 + i, j0 + j, 0, sun[j * w + i]!);
      put(i0 + i, j0 + j, 1, Math.min(1, sky[j * w + i]! * SKIRT_LIFT));
    }
  }
}

/** The shade at a point of the ground in scene space, nearest texel: for tests and the dev. */
export function shadeAt(
  data: Uint8Array,
  grid: ShadeGrid,
  x: number,
  z: number,
): { sun: number; sky: number } {
  const cell = grid.size / grid.texels;
  const i = Math.floor((x - grid.minX) / cell);
  const j = Math.floor((z - grid.minZ) / cell);
  if (i < 0 || j < 0 || i >= grid.texels || j >= grid.texels) return { sun: 0, sky: 0 };
  const k = (j * grid.texels + i) * 2;
  return { sun: data[k]! / 255, sky: data[k + 1]! / 255 };
}

/**
 * The level's shade texture: made blank with the terrain's material, painted once the models
 * have loaded. Sampled bilinear with mipmaps, clamped at the map's edge; it goes with the
 * terrain's material when the level is disposed.
 */
export class GroundShade {
  readonly texture: RawTexture;
  data: Uint8Array | null = null;
  /** Milliseconds the last paint took on the CPU, and its upload with the mipmaps. */
  paintMs = 0;
  uploadMs = 0;

  constructor(
    scene: Scene,
    readonly grid: ShadeGrid,
  ) {
    this.texture = RawTexture.CreateLuminanceAlphaTexture(
      null,
      grid.texels,
      grid.texels,
      scene,
      true,
      false,
      Texture.TRILINEAR_SAMPLINGMODE,
    );
    this.texture.name = 'ground-shade';
    this.texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  /** The material's view of the grid: (min x, min z, 1 / size, 1 / size). */
  get rect(): [number, number, number, number] {
    const g = this.grid;
    return [g.minX, g.minZ, 1 / g.size, 1 / g.size];
  }

  paint(casters: ReadonlyMap<string, ShadeCaster>, instances: readonly ShadeInstance[]): void {
    const t0 = performance.now();
    this.data = paintGroundShade(this.grid, casters, instances);
    const t1 = performance.now();
    this.texture.update(this.data);
    this.paintMs = t1 - t0;
    this.uploadMs = performance.now() - t1;
  }

  /** The painted shade at a point of the ground in scene space. */
  at(x: number, z: number): { sun: number; sky: number } {
    return this.data ? shadeAt(this.data, this.grid, x, z) : { sun: 0, sky: 0 };
  }
}
