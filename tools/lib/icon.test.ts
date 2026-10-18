import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ICON_PARCHMENT,
  ICON_SIZE,
  lift,
  lightEnough,
  postProcessIcon,
  subjectStats,
} from './icon';

let dir = '';
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'icon-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

type Paint = (x: number, y: number) => [number, number, number, number];

async function picture(name: string, w: number, h: number, paint: Paint): Promise<string> {
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = paint(x, y);
      const i = (y * w + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = a;
    }
  }
  const file = join(dir, name);
  await sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(file);
  return file;
}

async function pixels(file: string): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

describe('spell icon post-process', () => {
  it('composites a cut-out subject onto the parchment oval, keyed outside it', async () => {
    // A soft-edged orange disc off centre on transparency, 400 by 300.
    const input = await picture('disc.png', 400, 300, (x, y) => {
      const d = Math.hypot(x - 260, y - 120) / 70;
      return [
        240,
        Math.round(120 + 100 * Math.max(0, 1 - d)),
        20,
        Math.round(255 * Math.max(0, Math.min(1, (1.2 - d) * 3))),
      ];
    });
    const output = join(dir, 'disc.icon.png');
    const report = await postProcessIcon(input, output, { keyParchment: false });
    expect(report.matte).toBe('alpha');
    expect([report.width, report.height]).toEqual([ICON_SIZE.width, ICON_SIZE.height]);
    expect(report.colours).toBeLessThanOrEqual(255);
    const { data, width } = await pixels(output);
    const at = (x: number, y: number): number[] => [
      ...data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4),
    ];
    // Every alpha is a key, the corners are clear, the oval's rim is parchment.
    for (let i = 3; i < data.length; i += 4) expect([0, 255]).toContain(data[i]);
    expect(at(0, 0)[3]).toBe(0);
    // The rim is parchment, give or take its four-level mottle.
    const rim = at(2, 27);
    for (let c = 0; c < 3; c++)
      expect(Math.abs(rim[c]! - ICON_PARCHMENT[c]!)).toBeLessThanOrEqual(5);
    expect(rim[3]).toBe(255);
    // The disc sits in the middle.
    expect(at(36, 27)[0]).toBeGreaterThan(200);
  });

  it('keys a picture on a plain background and keeps its glow', async () => {
    // A dark disc in a pale halo on a flat beige ground, no alpha.
    const input = await picture('glow.png', 300, 300, (x, y) => {
      const d = Math.hypot(x - 150, y - 150);
      if (d < 50) return [90, 70, 50, 255];
      const glow = Math.max(0, 1 - (d - 50) / 60);
      return [
        Math.round(200 + 55 * glow),
        Math.round(190 + 65 * glow),
        Math.round(170 + 85 * glow),
        255,
      ];
    });
    const output = join(dir, 'glow.icon.png');
    const report = await postProcessIcon(input, output, { lift: false, keyParchment: false });
    expect(report.matte).toBe('key');
    const { data, width, height } = await pixels(output);
    // Pixels lighter than the parchment inside the oval: the halo survived.
    let glow = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (
          data[i + 3]! === 255 &&
          data[i]! > ICON_PARCHMENT[0] + 20 &&
          data[i + 2]! > ICON_PARCHMENT[2] + 20
        )
          glow++;
      }
    }
    expect(glow).toBeGreaterThan(100);
  });

  it('widens the box for a bolt and lifts a dark subject', async () => {
    const input = await picture('bolt.png', 600, 120, (x, y) => {
      const on = Math.abs(y - 60) < 30 && x > 20 && x < 580;
      return on ? [40, 30, 25, 255] : [0, 0, 0, 0];
    });
    const output = join(dir, 'bolt.icon.png');
    const report = await postProcessIcon(input, output);
    expect(report.width).toBeGreaterThan(ICON_SIZE.width);
    expect(report.subject.mean).toBeLessThan(50);
    expect(report.lifted).toBe(true);
  });
});

describe('icon light', () => {
  it('passes MM6-like light and fails a dark subject; the lift never darkens', () => {
    const px = Buffer.alloc(100 * 4);
    for (let i = 0; i < 100; i++) {
      px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 20 + i;
      px[i * 4 + 3] = 255;
    }
    const before = subjectStats(px);
    expect(lightEnough(before)).toBe(false);
    const copy = Buffer.from(px);
    lift(copy);
    for (let i = 0; i < copy.length; i += 4) expect(copy[i]!).toBeGreaterThanOrEqual(px[i]!);
    const after = subjectStats(copy);
    expect(after.p5).toBeGreaterThanOrEqual(78);
    expect(lightEnough(after)).toBe(true);
  });
});

describe('icon parchment key', () => {
  it('keys the parchment out and keeps the subject', async () => {
    const input = await picture('keyed.png', 300, 300, (x, y) => {
      const d = Math.hypot(x - 150, y - 150);
      return d < 60 ? [90, 60, 30, 255] : [184, 172, 150, 255];
    });
    const output = join(dir, 'keyed.icon.png');
    await postProcessIcon(input, output, { lift: false });
    const { data, width } = await pixels(output);
    const at = (x: number, y: number): number => data[(y * width + x) * 4 + 3]!;
    expect(at(4, 27)).toBe(0);
    expect(at(36, 27)).toBe(255);
  });
});
