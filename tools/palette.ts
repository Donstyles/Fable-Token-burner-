/**
 * Build the project palette and the colour look-up table used by the retro filter.
 *
 *   npm run palette
 *
 * Reads the 3D viewport region of the reference screenshots (a palette of colours is not
 * copyrightable; no pixels are reused), quantises the whole set to 256 colours, and writes:
 *   src/render/palette-mm6.json   the palette, sorted by luminance
 *   public/filter/lut-mm6.png     a 64³ LUT packed as 64 slices of 64×64 (4096×64)
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'artwork/reference';
const TILE = { w: 268, h: 200 };
const VIEWPORT = { left: 810, top: 40, width: 1340, height: 1000 }; // 3440×1440 captures
const COLOURS = 256;
const LUT = 64;

const files = readdirSync(SRC)
  .filter((f) => /^screenshot-\d+\.png$/.test(f))
  .sort();

const tiles: Buffer[] = [];
for (const f of files) {
  const path = join(SRC, f);
  const meta = await sharp(path).metadata();
  if (meta.width !== 3440 || meta.height !== 1440) continue;
  tiles.push(await sharp(path).extract(VIEWPORT).resize(TILE.w, TILE.h).png().toBuffer());
}
if (tiles.length === 0) throw new Error('no 3440×1440 screenshots found');

const cols = 5;
const rows = Math.ceil(tiles.length / cols);
const mosaic = await sharp({
  create: { width: cols * TILE.w, height: rows * TILE.h, channels: 3, background: '#000000' },
})
  .composite(
    tiles.map((input, i) => ({
      input,
      left: (i % cols) * TILE.w,
      top: Math.floor(i / cols) * TILE.h,
    })),
  )
  .png()
  .toBuffer();

// libimagequant palette; dithering off so the output holds only palette colours.
const quantised = await sharp(mosaic)
  .png({ palette: true, colours: COLOURS, dither: 0 })
  .toBuffer();
const { data, info } = await sharp(quantised).raw().toBuffer({ resolveWithObject: true });
const unique = new Set<number>();
for (let i = 0; i < data.length; i += info.channels) {
  unique.add(((data[i] ?? 0) << 16) | ((data[i + 1] ?? 0) << 8) | (data[i + 2] ?? 0));
}
const palette = [...unique]
  .map((v) => [(v >> 16) & 255, (v >> 8) & 255, v & 255] as const)
  .sort((a, b) => lum(a) - lum(b));

function lum(c: readonly [number, number, number]): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

mkdirSync('src/render', { recursive: true });
writeFileSync(
  'src/render/palette-mm6.json',
  JSON.stringify(
    {
      source: `${tiles.length} reference screenshots, viewport region, quantised to ${COLOURS} colours`,
      colours: palette.map((c) => '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('')),
    },
    null,
    2,
  ) + '\n',
);

// LUT: every (r, g, b) cell snaps to its nearest palette colour (perceptually weighted RGB).
const lut = Buffer.alloc(LUT * LUT * LUT * 3);
const pr = new Float32Array(palette.map((c) => c[0]));
const pg = new Float32Array(palette.map((c) => c[1]));
const pb = new Float32Array(palette.map((c) => c[2]));
for (let b = 0; b < LUT; b++) {
  for (let g = 0; g < LUT; g++) {
    for (let r = 0; r < LUT; r++) {
      const R = (r / (LUT - 1)) * 255;
      const G = (g / (LUT - 1)) * 255;
      const B = (b / (LUT - 1)) * 255;
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < pr.length; i++) {
        const dr = (pr[i] ?? 0) - R;
        const dg = (pg[i] ?? 0) - G;
        const db = (pb[i] ?? 0) - B;
        const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      // x = slice(b) * LUT + r, y = g
      const o = (g * LUT * LUT + (b * LUT + r)) * 3;
      lut[o] = pr[best] ?? 0;
      lut[o + 1] = pg[best] ?? 0;
      lut[o + 2] = pb[best] ?? 0;
    }
  }
}
mkdirSync('public/filter', { recursive: true });
await sharp(lut, { raw: { width: LUT * LUT, height: LUT, channels: 3 } })
  .png({ compressionLevel: 9 })
  .toFile('public/filter/lut-mm6.png');

console.info(`palette: ${palette.length} colours from ${tiles.length} screenshots`);
console.info('wrote src/render/palette-mm6.json and public/filter/lut-mm6.png');
