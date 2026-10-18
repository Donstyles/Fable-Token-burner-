import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cutPortrait, inOval, PORTRAIT_DENSITY, PORTRAIT_SIZE } from './portrait';

let dir = '';
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'portrait-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('portrait cut', () => {
  it('cuts the head box to the opening at three pixels a UI pixel, keyed by whole UI pixels', async () => {
    // A 400 by 600 picture: a warm ground left of x 300, a cool one right of it.
    const w = 400;
    const h = 600;
    const px = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      const warm = i % w < 300;
      px.set(warm ? [200, 120, 60] : [40, 60, 200], i * 3);
    }
    const input = join(dir, 'neutral.png');
    await sharp(px, { raw: { width: w, height: h, channels: 3 } })
      .png()
      .toFile(input);
    const output = join(dir, 'cut.png');
    // The head box is the picture's left half: all warm.
    const r = await cutPortrait(input, output, { left: 0, top: 0, width: 200, height: 300 });
    const W = PORTRAIT_SIZE.width * PORTRAIT_DENSITY;
    const H = PORTRAIT_SIZE.height * PORTRAIT_DENSITY;
    expect([r.width, r.height]).toEqual([W, H]);
    const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height, info.channels]).toEqual([W, H, 4]);
    const at = (x: number, y: number): number[] => [
      ...data.subarray((y * W + x) * 4, (y * W + x) * 4 + 4),
    ];
    // Outside the oval clear, inside it the head box's warm ground in full colour.
    expect(at(0, 0)[3]).toBe(0);
    expect(at(W / 2, H / 2)).toEqual([200, 120, 60, 255]);
    // Every UI pixel is in or out whole, as the ring's opening is.
    for (let y = 0; y < PORTRAIT_SIZE.height; y++) {
      for (let x = 0; x < PORTRAIT_SIZE.width; x++) {
        const want = inOval(x, y, PORTRAIT_SIZE.width, PORTRAIT_SIZE.height) ? 255 : 0;
        for (let k = 0; k < PORTRAIT_DENSITY * PORTRAIT_DENSITY; k++) {
          const sx = x * PORTRAIT_DENSITY + (k % PORTRAIT_DENSITY);
          const sy = y * PORTRAIT_DENSITY + Math.floor(k / PORTRAIT_DENSITY);
          expect(at(sx, sy)[3]).toBe(want);
        }
      }
    }
    expect(r.opaque).toBe(data.filter((_, i) => i % 4 === 3 && data[i] === 255).length);
  });
});
