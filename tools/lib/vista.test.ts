import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { alignSkylines, cutVista, VISTA_SIZE, VISTA_TIMES } from './vista';

const W = 160;
const H = 120;

/** A range against a fuchsia sky: land under a wavy skyline, its colour given. */
async function picture(
  path: string,
  land: [number, number, number],
  ridge: (x: number) => number,
): Promise<void> {
  const data = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = y >= ridge(x) ? land : [255, 0, 255];
      data.set(c, (y * W + x) * 3);
    }
  }
  await sharp(data, { raw: { width: W, height: H, channels: 3 } })
    .png()
    .toFile(path);
}

const ridge = (x: number): number => 50 + 10 * Math.sin(x / 9) + 4 * Math.sin(x / 3.1);

describe('the rest screen vista (owner, 2026-10-26)', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vista-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('finds the shift that lays one skyline on another', () => {
    const base = Int32Array.from({ length: 100 }, (_, x) => Math.round(ridge(x)));
    // The other picture drawn two pixels right and one down.
    const other = Int32Array.from({ length: 100 }, (_, x) => Math.round(ridge(x - 2)) + 1);
    expect(alignSkylines(base, other)).toEqual({ dx: 2, dy: 1, mismatch: 0 });
  });

  it('keys the sky, lines the four up and cuts one strip of each', async () => {
    const set = join(dir, 'aligned');
    await mkdir(set);
    await picture(join(set, 'sunrise.png'), [200, 140, 90], ridge);
    await picture(join(set, 'day.png'), [90, 110, 90], ridge);
    await picture(join(set, 'sunset.png'), [220, 120, 80], ridge);
    // The night's relit picture came back a pixel lower.
    await picture(join(set, 'night.png'), [20, 30, 60], (x) => ridge(x) + 1);
    // Rows 55 to 74: sky over the ridge at the middle, land at the foot.
    const v = await cutVista(set, { top: 55 });
    expect(v.shifts.night).toMatchObject({ dx: 0, dy: 1 });
    const { width, height } = VISTA_SIZE;
    expect(v.atlas.length).toBe(width * height * VISTA_TIMES.length * 4);
    // Each strip's sky clear at its top, its land opaque at its foot, in its own colour.
    for (let s = 0; s < VISTA_TIMES.length; s++) {
      const at = (x: number, y: number): number => ((s * height + y) * width + x) * 4;
      expect(v.atlas[at(400, 0) + 3]).toBe(0);
      expect(v.atlas[at(400, height - 1) + 3]).toBe(255);
    }
    const night = ((3 * height + height - 1) * width + 400) * 4;
    expect(v.atlas[night + 2]).toBeGreaterThan(v.atlas[night]!);
    expect(v.skyline.mean).toBeGreaterThan(0);
    expect(v.skyline.mean).toBeLessThan(height);
  });

  it('refuses a time that was drawn again instead of relit', async () => {
    const set = join(dir, 'redrawn');
    await mkdir(set);
    for (const t of ['sunrise', 'day', 'sunset'] as const) {
      await picture(join(set, `${t}.png`), [90, 110, 90], ridge);
    }
    await picture(join(set, 'night.png'), [20, 30, 60], (x) => 40 + 18 * Math.sin(x / 5 + 2));
    await expect(cutVista(set, { top: 4 })).rejects.toThrow(/night\.png does not line up/);
  });
});
