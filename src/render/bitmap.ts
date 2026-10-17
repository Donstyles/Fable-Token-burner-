/**
 * Loaded model textures as 1998 bitmaps (DESIGN.md 16.14). Meshy paints a model's skin at a
 * thousand pixels or more with smooth shading; MM6's sprites and walls were a few hundred
 * pixels of 8-bit colour. Each albedo texture is read back, shrunk to `size` on its long
 * side with a box filter, posterised to `levels` per channel and re-uploaded as a dynamic
 * texture sampled nearest, so the texels show and the shading steps as a painter's did.
 */
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { applyRetroSampling } from './materials';
import { snapToPalette } from './palette';

export interface BitmapOptions {
  /** Pixels on the long side. */
  size: number;
  /** Tones per channel. */
  levels: number;
}

function ready(texture: Texture): Promise<void> {
  if (texture.isReady()) return Promise.resolve();
  return new Promise((resolve) => texture.onLoadObservable.addOnce(() => resolve()));
}

/** Shrink and posterise RGBA pixels; `flipY` turns GPU order (bottom row first) the right way up. */
export function bitmapPixels(
  src: Uint8Array,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  levels: number,
  flipY: boolean,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(dw * dh * 4));
  const step = 255 / (levels - 1);
  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor((y * sh) / dh);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor((x * sw) / dw);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / dw));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = y0; sy < y1; sy++) {
        const row = flipY ? sh - 1 - sy : sy;
        for (let sx = x0; sx < x1; sx++) {
          const i = (row * sw + sx) * 4;
          const wa = src[i + 3]! / 255;
          r += src[i]! * wa;
          g += src[i + 1]! * wa;
          b += src[i + 2]! * wa;
          a += src[i + 3]!;
          n++;
        }
      }
      const o = (y * dw + x) * 4;
      const cover = a / 255;
      if (cover > 0) {
        // A grain of half a step on every texel before the posterise, so smooth plaster
        // breaks into speckle as a painted bitmap did, not into flat bands with stepped
        // edges (the blocks on the village walls, round 9).
        const hash = ((Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0) & 0xff;
        const grain = (hash / 255 - 0.5) * step;
        out[o] = Math.round((r / cover + grain) / step) * step;
        out[o + 1] = Math.round((g / cover + grain) / step) * step;
        out[o + 2] = Math.round((b / cover + grain) / step) * step;
      }
      out[o + 3] = a / n >= 128 ? 255 : 0;
    }
  }
  snapToPalette(out);
  return out;
}

const cache = new Map<string, Promise<DynamicTexture>>();

/**
 * A nearest-sampled bitmap copy of a loaded texture, once it has loaded; one per source
 * file, since a monster loaded nine times should be converted once. The GPU's own mip chain
 * does the shrinking: the level nearest `size` is read back, so a two-thousand-pixel skin
 * costs a loop over sixty-five thousand pixels, not four million.
 */
export function bitmapTexture(
  source: Texture,
  scene: Scene,
  o: BitmapOptions,
): Promise<DynamicTexture> {
  const key = `${source.url ?? source.name}|${o.size}|${o.levels}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const made = (async (): Promise<DynamicTexture> => {
    await ready(source);
    const { width, height } = source.getSize();
    const level = Math.max(0, Math.round(Math.log2(Math.max(width, height) / o.size)));
    const sw = Math.max(1, width >> level);
    const sh = Math.max(1, height >> level);
    const raw = (await source.readPixels(0, level)) as Uint8Array | null;
    const dyn = new DynamicTexture(`${source.name}:bitmap`, { width: sw, height: sh }, scene, true);
    const g = dyn.getContext();
    if (raw && raw.length >= sw * sh * 4) {
      // readPixels gives the rows bottom first; the canvas wants them top first.
      const px = bitmapPixels(raw, sw, sh, sw, sh, o.levels, true);
      g.putImageData(new ImageData(px, sw, sh), 0, 0);
    }
    dyn.hasAlpha = true;
    dyn.wrapU = source.wrapU;
    dyn.wrapV = source.wrapV;
    dyn.update(true);
    applyRetroSampling(dyn, true);
    return dyn;
  })();
  cache.set(key, made);
  return made;
}
