/**
 * Asset pipeline CLI (DESIGN.md 10.9, PLAN.md Phase 4 step 1).
 *
 *   npm run asset -- manifest                       list recorded assets
 *   npm run asset -- validate                       check manifests, files, sizes, polycounts
 *   npm run asset -- card <kind> <id> "<subject>"   write pipeline/cards/<id>.md for the owner
 *   npm run asset -- batch new <name> <id>:<height-m> [...]   plan a humanoid batch
 *   npm run asset -- batch show <nnn>
 *   npm run asset -- batch approve <nnn>            after the owner approves it in chat
 *
 * Nothing here calls Meshy; the client (step 3) runs approved batches only.
 */
import { access, readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { parseGlb } from '../src/world/glb';
import {
  findBatch,
  formatBatch,
  humanoidItems,
  makeBatch,
  nextBatchNumber,
  writeBatch,
} from './lib/batch';
import { INBOX_DIR, loadStyle, makeCard, writeCard, type CardKind } from './lib/cards';
import { isValidId, readManifest, type AssetEntry } from './lib/manifest';

const MAX_HUMANOID_TRIANGLES = 4000;
const TEXTURE_MANIFEST = 'assets/textures/manifest.json';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function validate(): Promise<void> {
  const problems: string[] = [];
  let checked = 0;

  // Textures: one PNG per role at the manifest size, with attribution.
  if (await exists(TEXTURE_MANIFEST)) {
    const textures = JSON.parse(await readFile(TEXTURE_MANIFEST, 'utf8')) as Record<
      string,
      { role: string; name: string; authors: string[]; licence: string; url: string; size: number }
    >;
    for (const [role, t] of Object.entries(textures)) {
      checked++;
      const file = `assets/textures/${role}.png`;
      if (!(await exists(file))) {
        problems.push(`${file}: missing`);
        continue;
      }
      const meta = await sharp(file).metadata();
      if (meta.width !== t.size || meta.height !== t.size) {
        problems.push(`${file}: ${meta.width}x${meta.height}, manifest says ${t.size}`);
      }
      for (const field of ['name', 'licence', 'url'] as const) {
        if (!t[field]) problems.push(`${TEXTURE_MANIFEST}: ${role} has no ${field}`);
      }
      if (!t.authors?.length) problems.push(`${TEXTURE_MANIFEST}: ${role} has no authors`);
    }
  }

  // Everything else: ids, files, licences, polycounts.
  const manifest = await readManifest();
  const seen = new Set<string>();
  for (const a of manifest.assets) {
    checked++;
    if (!isValidId(a.id)) problems.push(`${a.id}: id must be lower-case words joined by dashes`);
    if (seen.has(a.id)) problems.push(`${a.id}: listed twice`);
    seen.add(a.id);
    if (!a.licence) problems.push(`${a.id}: no licence`);
    if (!a.files.length) problems.push(`${a.id}: no files`);
    for (const file of a.files) {
      if (!file.startsWith('assets/')) problems.push(`${a.id}: ${file} is outside assets/`);
      if (!(await exists(file))) {
        problems.push(`${a.id}: ${file} missing`);
        continue;
      }
      if (
        file.endsWith('.glb') &&
        (a.kind === 'character' || a.kind === 'prop' || a.kind === 'building')
      ) {
        const buffer = await readFile(file);
        const nodes = parseGlb(
          buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        );
        const triangles = nodes.reduce(
          (n, node) => n + node.primitives.reduce((m, p) => m + p.indices.length / 3, 0),
          0,
        );
        if (a.kind === 'character' && triangles > MAX_HUMANOID_TRIANGLES) {
          problems.push(
            `${a.id}: ${file} has ${triangles} triangles, limit ${MAX_HUMANOID_TRIANGLES}`,
          );
        }
        if (triangles === 0) problems.push(`${a.id}: ${file} has no triangles`);
      }
      if (/\.(png|jpg|jpeg|webp)$/i.test(file)) {
        const meta = await sharp(file).metadata();
        if ((meta.width ?? 0) > 2048 || (meta.height ?? 0) > 2048) {
          problems.push(`${a.id}: ${file} is ${meta.width}x${meta.height}, larger than 2048`);
        }
      }
    }
    if (a.meshy && a.meshy.consumedCredits < 0) problems.push(`${a.id}: negative credits`);
  }

  if (problems.length) {
    for (const p of problems) console.error(`  ${p}`);
    fail(`asset validate: ${problems.length} problem(s) in ${checked} asset(s)`);
  }
  console.info(`asset validate: ok (${checked} asset(s))`);
}

async function listManifest(): Promise<void> {
  const manifest = await readManifest();
  if (!manifest.assets.length) {
    console.info('no assets recorded yet (textures are listed in assets/textures/manifest.json)');
    return;
  }
  for (const a of manifest.assets as AssetEntry[]) {
    const credits = a.meshy ? `${a.meshy.consumedCredits} cr` : '';
    console.info(
      `${a.id.padEnd(24)} ${a.kind.padEnd(10)} ${a.source.padEnd(12)} ${a.licence.padEnd(10)} ${credits}`,
    );
  }
}

async function card(kind: string, id: string, subject: string): Promise<void> {
  const kinds: CardKind[] = ['humanoid', 'prop', 'building', 'texture', 'portrait', 'icon', 'sky'];
  if (!kinds.includes(kind as CardKind)) fail(`kind must be one of ${kinds.join(', ')}`);
  if (!isValidId(id)) fail('id must be lower-case words joined by dashes');
  if (!subject) fail('subject text is required');
  const c = makeCard(id, kind as CardKind, subject, await loadStyle());
  const path = await writeCard(c);
  console.info(`wrote ${path}; the owner returns ${c.returnPath}`);
}

async function batch(args: string[]): Promise<void> {
  const [sub, ...rest] = args;
  if (sub === 'new') {
    const [name, ...specs] = rest;
    if (!name || !isValidId(name)) fail('batch new <name> <id>:<height-m> [...]');
    if (!specs.length) fail('give at least one <id>:<height-m>');
    const items = [];
    for (const spec of specs) {
      const [id, height] = spec.split(':');
      const metres = Number(height);
      if (!id || !isValidId(id) || !(metres > 0.3 && metres < 4)) fail(`bad humanoid spec ${spec}`);
      const input = `${id}.png`;
      if (!(await exists(`${INBOX_DIR}/${input}`)))
        fail(`${INBOX_DIR}/${input} missing: the owner's concept image comes first`);
      items.push(...humanoidItems(id, metres, input));
    }
    const b = makeBatch(await nextBatchNumber(), name, items);
    const path = await writeBatch(b);
    console.info(`${formatBatch(b)}\nwrote ${path}; awaiting the owner's approval by number`);
    return;
  }
  const number = Number(rest[0]);
  if (!Number.isInteger(number)) fail('batch show|approve <nnn>');
  const found = await findBatch(number);
  if (!found) fail(`no batch ${number}`);
  if (sub === 'show') {
    console.info(formatBatch(found.batch));
    return;
  }
  if (sub === 'approve') {
    found.batch.approved = true;
    await writeBatch(found.batch);
    console.info(`batch ${number} approved (${found.batch.estimatedCredits} credits estimated)`);
    return;
  }
  fail('batch new|show|approve');
}

const [command, ...args] = process.argv.slice(2);
switch (command) {
  case 'manifest':
    await listManifest();
    break;
  case 'validate':
    await validate();
    break;
  case 'card':
    await card(args[0] ?? '', args[1] ?? '', args.slice(2).join(' '));
    break;
  case 'batch':
    await batch(args);
    break;
  default: {
    const size = (await stat('pipeline/style.md')).size;
    console.info(
      `usage: asset manifest | validate | card <kind> <id> "<subject>" | batch new|show|approve\n(style bible: pipeline/style.md, ${size} bytes)`,
    );
  }
}
