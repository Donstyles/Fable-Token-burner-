/**
 * Item pictures from The Metropolitan Museum of Art's open-access photographs (DESIGN.md 16.8).
 *
 *   npm run met -- sheet <name> <object id>... [--cells WxH] [--rotate <deg>] [--fill]
 *       Keys and digitises each object to the cells and draws them on a leather sheet with
 *       their ids, pipeline/work/met/<name>.sheet.png, to pick from.
 *   npm run met -- find <query> [--dept <id>] [--from <year> --to <year>] [--limit <n>]
 *       Lists matching objects (public domain, with a picture) to put on a sheet.
 *   npm run met -- take <item id> <object id> [--rotate <deg>] [--no-pockets]
 *                                            [--edge <n>] [--step <n>] [--reach <n>]
 *       The picture for an item of src/game/items.ts, at its cells, into assets/items/, with the
 *       museum's record and licence in the manifest.
 *
 * The photos are cached in pipeline/work/met/src/. Nothing here needs a key.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { ITEM_IDS, ITEMS, type ItemId } from '../src/game/items';
import { readManifest, upsertAsset, writeManifest } from './lib/manifest';
import {
  CELL,
  CM_PER_PIXEL,
  decode,
  digitise,
  fetchBytes,
  type KeyOptions,
  keyPhoto,
  lengthOf,
  metObject,
  metSearch,
  type Raster,
  toPng,
} from './lib/met';

const WORK = 'pipeline/work/met';
/** Kinds drawn to fill their cells rather than true to size: too small to see otherwise. */
const FILLED = new Set(['ring', 'amulet', 'potion', 'scroll', 'misc']);
const OUT = 'assets/items';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function flag(args: string[], name: string): string | undefined {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
}

/** The key's thresholds by flag, for a photo the defaults misjudge (tools/lib/met.ts KeyOptions). */
function keyFlags(args: string[]): KeyOptions {
  const o: KeyOptions = {};
  const edge = flag(args, '--edge');
  const step = flag(args, '--step');
  const reach = flag(args, '--reach');
  if (edge) o.edge = Number(edge);
  if (step) o.step = Number(step);
  if (reach) o.reach = Number(reach);
  return o;
}

/** The object's photo, from the cache or the museum. */
async function photo(
  id: number,
): Promise<{ raster: Raster; record: Awaited<ReturnType<typeof metObject>> }> {
  await mkdir(join(WORK, 'src'), { recursive: true });
  const record = await metObject(id);
  if (!record.isPublicDomain) fail(`Met object ${id} (${record.title}) is not public domain`);
  if (!record.primaryImage) fail(`Met object ${id} (${record.title}) has no picture`);
  const cached = join(WORK, 'src', `${id}.jpg`);
  let bytes: Buffer;
  if (existsSync(cached)) bytes = await readFile(cached);
  else {
    bytes = await fetchBytes(record.primaryImage);
    await writeFile(cached, bytes);
  }
  return { raster: await decode(bytes), record };
}

async function sheet(args: string[]): Promise<void> {
  const name = args[0];
  // Object ids: the numbers that are not a flag's value.
  const ids = args
    .slice(1)
    .filter((a, i, all) => /^\d+$/.test(a) && !(i > 0 && all[i - 1]!.startsWith('--')))
    .map(Number);
  if (!name || !ids.length) fail('met sheet <name> <object id>... [--cells WxH] [--rotate <deg>]');
  const cells = (flag(args, '--cells') ?? '2x4').split('x').map(Number) as [number, number];
  const rotate = Number(flag(args, '--rotate') ?? 0);
  const tiles: { id: number; png: Buffer; title: string }[] = [];
  for (const id of ids) {
    try {
      const { raster, record } = await photo(id);
      keyPhoto(raster, keyFlags(args));
      const lengthCm = args.includes('--fill') ? undefined : (lengthOf(record) ?? undefined);
      const d = await digitise(raster, cells[0], cells[1], { rotate, lengthCm });
      tiles.push({ id, png: await toPng(d), title: `${record.title}, ${record.objectDate}` });
      console.info(
        `${id}: ${record.title} (${record.objectDate}, ${record.culture}), ${lengthOf(record) ?? '?'} cm${d.shrunk < 1 ? `, shrunk to ${Math.round(d.shrunk * 100)}% to fit` : ''}`,
      );
    } catch (e) {
      console.warn(`${id}: ${(e as Error).message}`);
    }
  }
  if (!tiles.length) fail('nothing to show');
  // Each tile twice its size on MM6's leather, its id under it.
  const tw = cells[0] * CELL * 2;
  const th = cells[1] * CELL * 2;
  const pad = 10;
  const label = 16;
  const cols = Math.min(tiles.length, Math.max(1, Math.floor(1400 / (tw + pad))));
  const rows = Math.ceil(tiles.length / cols);
  const W = cols * (tw + pad) + pad;
  const H = rows * (th + pad + label) + pad;
  const layers: OverlayOptions[] = [];
  const texts: string[] = [];
  for (const [k, t] of tiles.entries()) {
    const x = pad + (k % cols) * (tw + pad);
    const y = pad + Math.floor(k / cols) * (th + pad + label);
    layers.push({
      input: await sharp(t.png).resize(tw, th, { kernel: 'nearest' }).png().toBuffer(),
      left: x,
      top: y,
    });
    texts.push(
      `<text x="${x + 2}" y="${y + th + 12}" font-family="sans-serif" font-size="11" fill="#f0d060">${t.id}</text>`,
    );
  }
  layers.push({
    input: Buffer.from(`<svg width="${W}" height="${H}">${texts.join('')}</svg>`),
    left: 0,
    top: 0,
  });
  await mkdir(WORK, { recursive: true });
  const out = join(WORK, `${name}.sheet.png`);
  await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 24, g: 10, b: 4, alpha: 1 } },
  })
    .composite(layers)
    .png()
    .toFile(out);
  console.info(out);
}

async function find(args: string[]): Promise<void> {
  const q = args[0];
  if (!q) fail('met find <query> [--dept <id>] [--from <year> --to <year>] [--limit <n>]');
  const from = flag(args, '--from');
  const to = flag(args, '--to');
  const ids = await metSearch({
    q,
    departmentId: Number(flag(args, '--dept') ?? 4),
    dateBegin: from ? Number(from) : undefined,
    dateEnd: to ? Number(to) : undefined,
    limit: Number(flag(args, '--limit') ?? 12),
  });
  for (const id of ids) {
    try {
      const o = await metObject(id);
      if (!o.isPublicDomain || !o.primaryImageSmall) continue;
      console.info(`${id}\t${o.objectDate}\t${o.culture}\t${o.title}`);
    } catch {
      /* a record that does not answer is skipped */
    }
  }
}

async function take(args: string[]): Promise<void> {
  const item = args[0] as ItemId;
  const id = Number(args[1]);
  if (!item || !(ITEM_IDS as readonly string[]).includes(item) || !Number.isInteger(id)) {
    fail(`met take <item id> <object id>: items are ${ITEM_IDS.join(', ')}`);
  }
  const def = ITEMS[item];
  const { raster, record } = await photo(id);
  const { cover } = keyPhoto(raster, {
    ...keyFlags(args),
    pockets: !args.includes('--no-pockets'),
  });
  // True to size, but for the small things drawn larger than life (a ring, a phial, a scroll).
  const lengthCm = FILLED.has(def.kind) ? undefined : (lengthOf(record) ?? undefined);
  const d = await digitise(raster, def.w, def.h, {
    rotate: Number(flag(args, '--rotate') ?? 0),
    lengthCm,
  });
  if (d.shrunk < 1) {
    console.warn(
      `${def.name} is ${lengthCm} cm, longer than its ${def.w} by ${def.h} cells (${Math.round(def.h * CELL * CM_PER_PIXEL)} cm): drawn at ${Math.round(d.shrunk * 100)}%`,
    );
  }
  await mkdir(OUT, { recursive: true });
  const file = join(OUT, `${item}.png`);
  await writeFile(file, await toPng(d));
  const manifest = await readManifest();
  upsertAsset(manifest, {
    id: `item-${item}`,
    kind: 'image',
    source: `The Metropolitan Museum of Art, object ${id}: ${record.title} (${record.objectDate}, ${record.culture || record.department}), ${record.objectURL}; its backdrop keyed out and the object digitised to ${def.w} by ${def.h} cells (tools/met.ts)`,
    licence: `CC0 1.0, The Met Open Access (public domain; credit line: ${record.creditLine})`,
    files: [file],
    date: new Date().toISOString().slice(0, 10),
    notes: `${def.name}; ${lengthCm ? `${lengthCm} cm at ${CM_PER_PIXEL} cm a pixel${d.shrunk < 1 ? `, shrunk to ${Math.round(d.shrunk * 100)}% to fit` : ''}` : 'filling its cells'}; the object covered ${(cover * 100).toFixed(1)}% of its photo`,
  });
  await writeManifest(manifest);
  console.info(`${file}: ${record.title} (${record.objectDate}), object ${id}`);
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'sheet') await sheet(rest);
  else if (command === 'find') await find(rest);
  else if (command === 'take') await take(rest);
  else fail('met sheet|find|take');
}

void main();
