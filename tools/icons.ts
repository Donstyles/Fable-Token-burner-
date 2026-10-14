/**
 * Generate the PWA and iOS icons from the owner's source image.
 *
 *   npm run icons -- pipeline/inbox/app-icon.png
 *
 * Writes public/icons/*.png and public/icons/manifest-icons.json (read by vite.config.ts).
 * The source should be square, at least 1024×1024, with no transparency.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const src = process.argv[2];
if (!src) {
  console.error('usage: npm run icons -- <source-image>');
  process.exit(2);
}

const outDir = 'public/icons';
mkdirSync(outDir, { recursive: true });

const sizes = [
  { file: 'icon-192.png', size: 192, purpose: 'any' },
  { file: 'icon-512.png', size: 512, purpose: 'any' },
  { file: 'icon-maskable-512.png', size: 512, purpose: 'maskable', pad: 0.1 },
  { file: 'apple-touch-icon.png', size: 180, purpose: 'apple' },
  { file: 'favicon-32.png', size: 32, purpose: 'favicon' },
];

const image = sharp(src);
const meta = await image.metadata();
if (!meta.width || !meta.height || meta.width !== meta.height || meta.width < 1024) {
  console.error(`source must be square and at least 1024px; got ${meta.width}×${meta.height}`);
  process.exit(2);
}

const manifest: { src: string; sizes: string; type: string; purpose?: string }[] = [];
for (const s of sizes) {
  const inner = s.pad ? Math.round(s.size * (1 - 2 * s.pad)) : s.size;
  let pipeline = sharp(src).resize(inner, inner, { fit: 'cover' });
  if (s.pad) {
    const stats = await sharp(src).stats();
    const [r, g, b] = stats.channels.map((c) => Math.round(c.mean));
    const margin = Math.round((s.size - inner) / 2);
    pipeline = pipeline.extend({
      top: margin,
      bottom: s.size - inner - margin,
      left: margin,
      right: s.size - inner - margin,
      background: { r: r ?? 0, g: g ?? 0, b: b ?? 0, alpha: 1 },
    });
  }
  await pipeline.png().toFile(join(outDir, s.file));
  if (s.purpose === 'any' || s.purpose === 'maskable') {
    manifest.push({
      src: `icons/${s.file}`,
      sizes: `${s.size}x${s.size}`,
      type: 'image/png',
      purpose: s.purpose,
    });
  }
  console.info(`wrote ${outDir}/${s.file}`);
}
writeFileSync(join(outDir, 'manifest-icons.json'), JSON.stringify(manifest, null, 2) + '\n');
console.info(`wrote ${outDir}/manifest-icons.json`);
