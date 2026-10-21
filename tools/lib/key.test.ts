import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { keyFuchsia, keyPicture, spillOf } from './key';

const GROUND = [252, 2, 250] as const;
const LEAF = [60, 90, 40] as const;

/** A 40 by 40 picture: fuchsia ground, a green square, a column half green half ground. */
function picture(ground: readonly number[] = GROUND): Buffer {
  const data = Buffer.alloc(40 * 40 * 4);
  for (let y = 0; y < 40; y++) {
    for (let x = 0; x < 40; x++) {
      const i = (y * 40 + x) * 4;
      const inside = x >= 10 && x < 30 && y >= 10 && y < 30;
      const edge = x === 30 && y >= 10 && y < 30;
      for (let c = 0; c < 3; c++) {
        data[i + c] = inside
          ? LEAF[c]!
          : edge
            ? Math.round((LEAF[c]! + ground[c]!) / 2)
            : ground[c]!;
      }
      data[i + 3] = 255;
    }
  }
  return data;
}

const at = (data: Buffer, x: number, y: number): number[] => {
  const i = (y * 40 + x) * 4;
  return [...data.subarray(i, i + 4)];
};

describe('fuchsia key (owner, 2026-10-19: "We do fuchsia backgrounds")', () => {
  it('clears the ground and keeps the subject as it was', () => {
    const data = picture();
    const r = keyFuchsia(data, 40, 40);
    expect(r.ground).toEqual([...GROUND]);
    expect(at(data, 2, 2)).toEqual([0, 0, 0, 0]);
    expect(at(data, 20, 20)).toEqual([...LEAF, 255]);
    expect(r.opaque).toBeCloseTo(400 / 1600, 5);
    expect(r.edge).toBeCloseTo(20 / 1600, 5);
  });

  it('leaves the edge part-covered with no pink in it', () => {
    const data = picture();
    keyFuchsia(data, 40, 40);
    const [r, g, b, a] = at(data, 30, 20);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
    expect(spillOf(r!, g!, b!)).toBeLessThanOrEqual(0);
  });

  it('recolours a pocket of ground caught inside the subject', () => {
    const data = picture();
    // A pixel of ground half showing through the middle of the square, far from the open
    // ground: still part-covered, and green, not pink.
    const i = (20 * 40 + 20) * 4;
    for (let c = 0; c < 3; c++) data[i + c] = Math.round((LEAF[c]! + GROUND[c]!) / 2);
    keyFuchsia(data, 40, 40);
    const [r, g, b, a] = at(data, 20, 20);
    expect(a).toBeLessThan(255);
    expect([r, g, b]).toEqual([...LEAF]);
  });

  it('refuses a ground that is not fuchsia', () => {
    expect(() => keyFuchsia(picture([255, 255, 255]), 40, 40)).toThrow(/not fuchsia/);
  });

  describe('keyPicture', () => {
    let dir = '';
    beforeAll(async () => {
      dir = await mkdtemp(join(tmpdir(), 'key-'));
    });
    afterAll(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it('writes a transparent PNG from a flat RGB picture', async () => {
      const rgb = Buffer.alloc(40 * 40 * 3);
      const rgba = picture();
      for (let p = 0; p < 1600; p++) rgba.copy(rgb, p * 3, p * 4, p * 4 + 3);
      const src = join(dir, 'in.png');
      await sharp(rgb, { raw: { width: 40, height: 40, channels: 3 } })
        .png()
        .toFile(src);
      const report = await keyPicture(src, join(dir, 'out.png'));
      expect(report.matte).toBe('fuchsia');
      const meta = await sharp(join(dir, 'out.png')).metadata();
      expect(meta.channels).toBe(4);
    });

    it('passes a picture with its own alpha through', async () => {
      const rgba = picture();
      for (let i = 3; i < rgba.length; i += 4) rgba[i] = i < 800 ? 0 : 255;
      const src = join(dir, 'alpha.png');
      await sharp(rgba, { raw: { width: 40, height: 40, channels: 4 } })
        .png()
        .toFile(src);
      const report = await keyPicture(src, join(dir, 'alpha-out.png'));
      expect(report.matte).toBe('alpha');
      expect(report.ground).toBeNull();
    });
  });
});
