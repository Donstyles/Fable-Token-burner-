import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ICON_SIZE, postProcessIcon } from './icon';

describe('spell icon post-process', () => {
  it('crops, fits, cuts the alpha hard and keeps a small palette', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'icon-'));
    try {
      // A soft-edged orange disc off centre on transparency, 400 by 300.
      const w = 400;
      const h = 300;
      const px = Buffer.alloc(w * h * 4);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const d = Math.hypot(x - 260, y - 120) / 70;
          const i = (y * w + x) * 4;
          px[i] = 240;
          px[i + 1] = Math.round(120 + 100 * Math.max(0, 1 - d));
          px[i + 2] = 20;
          px[i + 3] = Math.round(255 * Math.max(0, Math.min(1, (1.2 - d) * 3)));
        }
      }
      const input = join(dir, 'in.png');
      await sharp(px, { raw: { width: w, height: h, channels: 4 } })
        .png()
        .toFile(input);
      const output = join(dir, 'out.png');
      const report = await postProcessIcon(input, output, { ...ICON_SIZE, colours: 32 });
      const meta = await sharp(output).metadata();
      expect([meta.width, meta.height]).toEqual([ICON_SIZE.width, ICON_SIZE.height]);
      expect(report.colours).toBeLessThanOrEqual(32);
      expect(report.opaque).toBeGreaterThan(1500);
      const { data } = await sharp(output)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (let i = 3; i < data.length; i += 4) expect([0, 255]).toContain(data[i]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
