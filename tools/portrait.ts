/**
 * Cut the party's portraits (DESIGN.md 12.2): every picture the owner returned for an
 * appearance, under pipeline/inbox/portraits/<appearance>/, cut by the appearance's head box
 * (pipeline/portraits.json) to the band's oval in assets/portraits/<appearance>/, and
 * recorded in the manifest.
 *
 *   npm run portrait -- <appearance> [<expression>...]
 */
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cutPortrait, type HeadBox } from './lib/portrait';
import { isValidId, readManifest, upsertAsset, writeManifest } from './lib/manifest';

const CONFIG = 'pipeline/portraits.json';
const INBOX = 'pipeline/inbox/portraits';
const OUT = 'assets/portraits';

interface Appearance {
  neutral: string;
  head: HeadBox;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  const [appearance, ...wanted] = process.argv.slice(2);
  if (!appearance || !isValidId(appearance)) fail('portrait <appearance> [<expression>...]');
  const config = JSON.parse(await readFile(CONFIG, 'utf8')) as Record<string, Appearance>;
  const entry = config[appearance];
  if (!entry) fail(`${CONFIG} has no head box for ${appearance}`);
  const dir = join(INBOX, appearance);
  const pictures = (await readdir(dir))
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.slice(0, -4))
    .filter((e) => !wanted.length || wanted.includes(e));
  if (!pictures.length) fail(`no pictures in ${dir}`);
  await mkdir(join(OUT, appearance), { recursive: true });
  const manifest = await readManifest();
  for (const expression of pictures) {
    if (!isValidId(expression)) fail(`${expression}: name the picture in lower-case words`);
    const from = join(dir, `${expression}.png`);
    const to = join(OUT, appearance, `${expression}.png`);
    const r = await cutPortrait(from, to, entry.head);
    upsertAsset(manifest, {
      id: `portrait-${appearance}-${expression}`,
      kind: 'portrait',
      source: `The owner's ChatGPT image ${from}, its head box cut to the band's oval at ${r.width} by ${r.height}, one pixel to the UI pixel, on sixteen bits (tools/portrait.ts)`,
      licence:
        "The owner's ChatGPT image (OpenAI's terms: the output is the user's): owner holds full rights",
      files: [to],
      date: new Date().toISOString().slice(0, 10),
      notes: `head box ${JSON.stringify(entry.head)} of ${entry.neutral}`,
    });
    console.info(`${to}: ${r.width}x${r.height}, ${r.opaque} pixels, ${r.colours} colours`);
  }
  await writeManifest(manifest);
}

void main();
