/**
 * Fetch CC0 textures for the material roles (DESIGN.md 10.2) and reduce them to the
 * low-resolution, nearest-sampled look (DESIGN.md 4). Sources are listed in
 * pipeline/textures.json; outputs and an attribution manifest land in assets/textures/,
 * which is committed (CC0 needs no attribution, we keep it anyway).
 *
 *   npm run textures            fetch anything missing
 *   npm run textures -- --force refetch everything
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

interface RoleSource {
  source: 'polyhaven';
  id: string;
  metresPerTile: number;
}

interface Config {
  size: number;
  roles: Record<string, RoleSource>;
}

interface ManifestEntry {
  role: string;
  source: string;
  id: string;
  name: string;
  authors: string[];
  licence: string;
  url: string;
  metresPerTile: number;
  size: number;
}

const OUT = 'assets/textures';
const API = 'https://api.polyhaven.com';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return (await res.json()) as T;
}

async function fetchPolyHaven(role: string, src: RoleSource, size: number): Promise<ManifestEntry> {
  const info = await fetchJson<{ name: string; authors: Record<string, string> }>(
    `${API}/info/${src.id}`,
  );
  const files = await fetchJson<Record<string, Record<string, Record<string, { url: string }>>>>(
    `${API}/files/${src.id}`,
  );
  const diffuse = files['Diffuse']?.['1k']?.['jpg'] ?? files['Diffuse']?.['2k']?.['jpg'];
  if (!diffuse) throw new Error(`${src.id}: no 1k/2k jpg diffuse map`);
  const res = await fetch(diffuse.url);
  if (!res.ok) throw new Error(`${diffuse.url}: ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  // Area-average down to the target size: a little blur before nearest-neighbour display
  // keeps the texels readable, like the pre-filtered textures of the period.
  const png = await sharp(input)
    .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
    .modulate({ saturation: 0.92 })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  await writeFile(join(OUT, `${role}.png`), png);
  return {
    role,
    source: 'polyhaven',
    id: src.id,
    name: info.name,
    authors: Object.keys(info.authors),
    licence: 'CC0 1.0',
    url: `https://polyhaven.com/a/${src.id}`,
    metresPerTile: src.metresPerTile,
    size,
  };
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const config = JSON.parse(await readFile('pipeline/textures.json', 'utf8')) as Config;
  await mkdir(OUT, { recursive: true });
  const manifestPath = join(OUT, 'manifest.json');
  const manifest: Record<string, ManifestEntry> = (await exists(manifestPath))
    ? (JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, ManifestEntry>)
    : {};
  for (const [role, src] of Object.entries(config.roles)) {
    const out = join(OUT, `${role}.png`);
    const current = manifest[role];
    if (!force && current && current.id === src.id && (await exists(out))) {
      console.info(`${role}: up to date (${src.id})`);
      continue;
    }
    console.info(`${role}: fetching ${src.id}`);
    manifest[role] = await fetchPolyHaven(role, src, config.size);
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.info(`wrote ${manifestPath}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
