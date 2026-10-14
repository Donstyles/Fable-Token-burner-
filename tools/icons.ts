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

/**
 * The prompt card keeps the subject inside the central 70 percent, which is within the
 * maskable safe zone, so the maskable icon is the same crop with a different purpose.
 */
const sizes = [
  { file: 'icon-192.png', size: 192, purpose: 'any' },
  { file: 'icon-512.png', size: 512, purpose: 'any' },
  { file: 'icon-maskable-512.png', size: 512, purpose: 'maskable' },
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
  await sharp(src)
    .resize(s.size, s.size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, s.file));
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
