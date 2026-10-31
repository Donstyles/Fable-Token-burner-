import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { CELL, decode, digitise, keyPhoto } from './met';

/**
 * A museum photo of sorts: a backdrop paling from grey at the top to white at the foot with a
 * soft shadow, a dark object with a hole in its middle, and a pale pit on the object.
 */
async function photo(): Promise<Buffer> {
  const w = 240;
  const h = 300;
  const data = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      let v = 190 + (y / h) * 50;
      // A soft shadow under the object.
      const sd = Math.hypot(x - 120, y - 250) / 40;
      if (sd < 1) v -= 40 * (1 - sd);
      let c: [number, number, number] = [v, v, v];
      const inRing = Math.hypot(x - 120, y - 150) < 70 && Math.hypot(x - 120, y - 150) > 35;
      const pit = Math.hypot(x - 172, y - 150) < 4;
      if (inRing) c = pit ? [205, 205, 205] : [70, 50, 40];
      data[i] = Math.round(c[0]);
      data[i + 1] = Math.round(c[1]);
      data[i + 2] = Math.round(c[2]);
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toBuffer();
}

describe("items from the Met's photographs (DESIGN 16.8)", () => {
  it('keys a gradient backdrop and its shadow out, keeps the object and clears its hole', async () => {
    const r = await decode(await photo());
    const { cover } = keyPhoto(r);
    const alpha = (x: number, y: number): number => r.data[(y * r.width + x) * 4 + 3]!;
    expect(alpha(10, 10)).toBe(0);
    expect(alpha(120, 290)).toBe(0); // the shadow
    expect(alpha(120, 95)).toBe(255); // the ring's band
    expect(alpha(120, 150)).toBe(0); // the hole shows the backdrop
    expect(alpha(172, 150)).toBe(255); // a pit stays on the object
    expect(cover).toBeGreaterThan(0.1);
    expect(cover).toBeLessThan(0.25);
  });

  it('digitises the object into its cells, centred, a palette with alpha', async () => {
    const r = await decode(await photo());
    keyPhoto(r);
    const d = await digitise(r, 2, 2);
    expect([d.width, d.height]).toEqual([2 * CELL, 2 * CELL]);
    const alpha = (x: number, y: number): number => d.data[(y * d.width + x) * 4 + 3]!;
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(CELL, 4)).toBeGreaterThan(200); // the ring's top
    expect(alpha(CELL, CELL)).toBe(0); // its hole
  });
});
