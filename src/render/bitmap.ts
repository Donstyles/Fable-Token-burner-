/**
 * Loaded model textures as 1998 bitmaps (DESIGN.md 16.14). Meshy paints a model's skin at a
 * thousand pixels or more with smooth shading; MM6's sprites and walls were a few hundred
 * pixels of 8-bit colour. Each albedo texture is read back, shrunk to `size` on its long
 * side with a box filter, posterised to `levels` per channel and re-uploaded as a raw
 * texture sampled nearest, so the texels show and the shading steps as a painter's did.
 *
 * The bitmap is a raw texture, not a dynamic one, and the source is let go once it has been
 * read (DESIGN.md 17.28): a dynamic texture keeps a canvas the size of the picture alive for
 * as long as it lives, and iOS counts every canvas against one budget; the source's thousand
 * pixels sat on the GPU beside the bitmap, twice the memory for a picture never drawn.
 */
import { Constants } from '@babylonjs/core/Engines/constants';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { applyRetroSampling } from './materials';
import { snapToPalette } from './palette';

export interface BitmapOptions {
  /** Pixels on the long side. */
  size: number;
  /** Tones per channel. */
  levels: number;
  /** The grain before the posterise, in steps of a tone (half a step unless said). */
  grain?: number;
  /**
   * Snap to MM6's 256 colours (default on). Off for trees and bushes: the palette was read
   * from the reference shots and has none of the owner's light yellow-greens, so a willow's
   * leaves snapped to tan (owner's concept pictures, 2026-10-23).
   */
  palette?: boolean;
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
  grainSteps = 1,
  palette = true,
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
        const grain = (hash / 255 - 0.5) * step * grainSteps;
        out[o] = Math.round((r / cover + grain) / step) * step;
        out[o + 1] = Math.round((g / cover + grain) / step) * step;
        out[o + 2] = Math.round((b / cover + grain) / step) * step;
      }
      out[o + 3] = a / n >= 128 ? 255 : 0;
    }
  }
  if (palette) snapToPalette(out);
  return out;
}

const cache = new Map<string, Promise<Texture>>();

/**
 * A nearest-sampled bitmap copy of a loaded texture, once it has loaded; one per source
 * file, since a monster loaded nine times should be converted once. The GPU's own mip chain
 * does the shrinking: the level nearest `size` is read back, so a two-thousand-pixel skin
 * costs a loop over sixty-five thousand pixels, not four million. The source is disposed
 * once read, whether it was the one read or another load of the same file.
 */
export function bitmapTexture(source: Texture, scene: Scene, o: BitmapOptions): Promise<Texture> {
  const key = `${source.url ?? source.name}|${o.size}|${o.levels}|${o.grain ?? 0.5}|${o.palette ?? true}`;
  const hit = cache.get(key);
  if (hit) {
    // Another wrapper of the same picture: let it go once the first has been read.
    void hit.then(
      () => source.dispose(),
      () => undefined,
    );
    return hit;
  }
  const made = (async (): Promise<Texture> => {
    await ready(source);
    const { width, height } = source.getSize();
    const level = Math.max(0, Math.round(Math.log2(Math.max(width, height) / o.size)));
    const sw = Math.max(1, width >> level);
    const sh = Math.max(1, height >> level);
    const raw = (await source.readPixels(0, level)) as Uint8Array | null;
    const { wrapU, wrapV, name } = source;
    source.dispose();
    // Kept in GPU order (bottom row first) and uploaded without a flip, so the bitmap reads
    // as the source did: no row is turned twice on the way.
    const px =
      raw && raw.length >= sw * sh * 4
        ? bitmapPixels(
            raw,
            sw,
            sh,
            sw,
            sh,
            o.levels,
            false,
            (o.grain ?? 0.5) * 2,
            o.palette ?? true,
          )
        : new Uint8ClampedArray(sw * sh * 4);
    const tex = RawTexture.CreateRGBATexture(
      px,
      sw,
      sh,
      scene,
      true,
      false,
      Texture.NEAREST_NEAREST_MIPNEAREST,
    );
    tex.name = `${name}:bitmap`;
    tex.hasAlpha = true;
    tex.wrapU = wrapU;
    tex.wrapV = wrapV;
    applyRetroSampling(tex, true);
    return tex;
  })();
  cache.set(key, made);
  return made;
}

/**
 * A grey picture as a one-channel texture at most `size` pixels a side, for a mask whose
 * shader reads one channel (a house's window panes, src/world/props.ts): a thousand-pixel
 * mask as a plain texture cost five megabytes with its mipmaps, this a quarter of one. The
 * canvas it is read through is let go at once.
 */
export async function maskTexture(url: string, scene: Scene, size: number): Promise<Texture> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`mask failed to load: ${url}`));
    img.src = url;
  });
  const w = Math.max(1, Math.min(size, img.naturalWidth));
  const h = Math.max(1, Math.min(size, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error(`mask ${url}: no canvas`);
  g.drawImage(img, 0, 0, w, h);
  const rgba = g.getImageData(0, 0, w, h).data;
  c.width = c.height = 0;
  const r = new Uint8Array(w * h);
  for (let i = 0; i < r.length; i++) r[i] = rgba[i * 4]!;
  // Top row first as glTF lays a picture, uploaded without a flip: the mask's first row is
  // at v = 0, where the skin's is.
  // Bytes, not the floats the factory assumes: a float red texture has no mipmaps and iOS
  // refuses the upload outright.
  const tex = RawTexture.CreateRTexture(
    r,
    w,
    h,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPNEAREST,
    Constants.TEXTURETYPE_UNSIGNED_BYTE,
  );
  tex.name = `${url.split('/').pop() ?? url}:mask`;
  applyRetroSampling(tex, true);
  return tex;
}
