/**
 * Asset pipeline CLI (DESIGN.md 10.9, PLAN.md Phase 4 steps 1 and 3).
 *
 *   npm run asset -- manifest                       list recorded assets
 *   npm run asset -- validate                       check manifests, files, sizes, polycounts, clips
 *   npm run asset -- card <kind> <id> "<subject>"   write pipeline/cards/<id>.md for the owner
 *   npm run asset -- batch new <name> <id>:<height-m>[:civilian] [...] [--pose t-pose]   plan a humanoid batch
 *   npm run asset -- batch show <nnn>
 *   npm run asset -- batch approve <nnn>            after the owner approves it in chat
 *   npm run asset -- batch icons <name> <specs.json> [--grant <purpose>]   plan spell icons
 *   npm run asset -- icon accept <nnn> <asset-id> [<spell-id>]   take a processed icon into assets/
 *   npm run asset -- icon reprocess <nnn> [<asset-id>...]         post-process a batch's pictures again
 *   npm run asset -- inbox <id> <picture>           key the owner's concept picture (fuchsia ground) into the inbox
 *   npm run asset -- run <nnn> [--dry-run] [--force] run an approved batch through Meshy
 *   npm run asset -- review <id>...                 each model's review sheet in pipeline/work/review/
 *   npm run asset -- windows <id>... [--accept]     find a house's window panes; --accept takes the mask
 *
 * Only `run` talks to Meshy, and only for an approved batch (`--dry-run` prints the commands).
 */
import { access, copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';
import {
  HUMANOID_CLIPS,
  findBatch,
  formatBatch,
  humanoidItems,
  propItems,
  type PropSpec,
  creatureItems,
  type CreatureSpec,
  iconItems,
  type IconSpec,
  CREDITS,
  makeBatch,
  nextBatchNumber,
  writeBatch,
} from './lib/batch';
import { INBOX_DIR, loadStyle, makeCard, writeCard, type CardKind } from './lib/cards';
import {
  isValidId,
  readManifest,
  upsertAsset,
  writeManifest,
  type AssetEntry,
} from './lib/manifest';
import { postProcessIcon } from './lib/icon';
import { keyPicture } from './lib/key';
import { CHARACTER_TEXTURE_SIZE, inspectGlb } from './lib/postprocess';
import { MESHY_LICENCE, WORK_DIR, runBatch } from './lib/run';
import { describeGap } from './lib/quality';
import { reviewSheets } from './lib/review';
import { findWindows, writeWindowMask } from './lib/windows';
import { PROPS } from '../kernel/terrain/props';

/** Where accepted spell icons live; the spellbook looks them up by spell id. */
const SPELL_ICON_DIR = 'assets/icons/spells';

/** Meshy targets 4000 and lands near it; a tenth over is accepted, more is a regeneration. */
const MAX_HUMANOID_TRIANGLES = 4400;
/** Boundary loops up to this wide may be gaps between parts rather than a garment's open edge. */
const MAX_GAP_METRES = 0.3;
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
        const report = await inspectGlb(file);
        if (a.kind === 'character' && report.triangles > MAX_HUMANOID_TRIANGLES) {
          problems.push(
            `${a.id}: ${file} has ${report.triangles} triangles, limit ${MAX_HUMANOID_TRIANGLES}`,
          );
        }
        if (report.triangles === 0) problems.push(`${a.id}: ${file} has no triangles`);
        if (a.kind === 'character') {
          const planned = (a.meshy?.params['animate'] as { clips?: string[] } | undefined)?.clips;
          const expected = planned ?? [...HUMANOID_CLIPS];
          if (JSON.stringify(report.clips) !== JSON.stringify(expected)) {
            problems.push(
              `${a.id}: ${file} clips are [${report.clips.join(', ')}], expected [${expected.join(', ')}]`,
            );
          }
          for (const t of report.textures) {
            if (t.width > CHARACTER_TEXTURE_SIZE || t.height > CHARACTER_TEXTURE_SIZE) {
              problems.push(
                `${a.id}: ${file} texture ${t.name || '?'} is ${t.width}x${t.height}, limit ${CHARACTER_TEXTURE_SIZE}`,
              );
            }
          }
          if (!report.textures.length) problems.push(`${a.id}: ${file} has no texture`);
          // Small boundary loops: gaps between Meshy's separated parts, or a hair piece's
          // border on the scalp. The ray test tells most apart, not all, so this is a note for
          // the owner's eye in the viewer, not a failure; nothing is patched (2026-10-16).
          const small = report.openLoops.filter((l) => l.extent <= MAX_GAP_METRES);
          if (small.length) {
            console.info(
              `  note ${a.id}: ${file} has ${small.length} small open loop(s): ${small
                .map((l) => `${(l.extent * 100).toFixed(0)} cm ${l.covered ? 'backed' : 'open'}`)
                .join(', ')} (judge in the viewer; regenerate if they show)`,
            );
          }
        }
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
    const [name, ...given] = rest;
    if (!name || !isValidId(name)) fail('batch new <name> <id>:<height-m>[:civilian] [...]');
    // `--pose t-pose` re-poses every character of the batch (legs straight, arms level).
    const poseAt = given.indexOf('--pose');
    const pose = poseAt >= 0 ? given[poseAt + 1] : 'a-pose';
    if (pose !== 'a-pose' && pose !== 't-pose') fail('--pose a-pose|t-pose');
    const specs = poseAt < 0 ? given : given.filter((_, i) => i !== poseAt && i !== poseAt + 1);
    if (!specs.length) fail('give at least one <id>:<height-m>[:civilian]');
    const items = [];
    for (const spec of specs) {
      const [id, height, set = 'combat'] = spec.split(':');
      const metres = Number(height);
      if (!id || !isValidId(id) || !(metres > 0.3 && metres < 4)) fail(`bad humanoid spec ${spec}`);
      if (set !== 'combat' && set !== 'civilian')
        fail(`${spec}: clip set must be combat or civilian`);
      const input = `${id}.png`;
      if (!(await exists(`${INBOX_DIR}/${input}`)))
        fail(`${INBOX_DIR}/${input} missing: the owner's concept image comes first`);
      items.push(...humanoidItems(id, metres, input, set, pose));
    }
    const b = makeBatch(await nextBatchNumber(), name, items);
    const path = await writeBatch(b);
    console.info(`${formatBatch(b)}\nwrote ${path}; awaiting the owner's approval by number`);
    return;
  }
  if (sub === 'props') {
    // `batch props <name> <specs.json>`: a JSON list of { id, prompt, polycount }.
    const [name, file] = rest;
    if (!name || !isValidId(name) || !file) fail('batch props <name> <specs.json>');
    const specs = JSON.parse(await readFile(file, 'utf8')) as PropSpec[];
    if (!Array.isArray(specs) || !specs.length) fail(`${file}: a non-empty JSON list`);
    const items = [];
    for (const spec of specs) {
      if (!isValidId(spec.id) || typeof spec.prompt !== 'string' || !spec.prompt.trim())
        fail(`bad prop spec ${JSON.stringify(spec)}`);
      if (!(spec.polycount >= 100 && spec.polycount <= 30000))
        fail(`${spec.id}: polycount 100..30000`);
      items.push(...propItems(spec));
    }
    const b = makeBatch(await nextBatchNumber(), name, items);
    const path = await writeBatch(b);
    console.info(`${formatBatch(b)}\nwrote ${path}; awaiting the owner's approval by number`);
    return;
  }
  if (sub === 'creatures') {
    // `batch creatures <name> <specs.json>`: { id, height, prompt, set? } each; the concept
    // image is generated first (owner, 2026-10-17) and reviewed before the 3D steps.
    const [name, file] = rest;
    if (!name || !isValidId(name) || !file) fail('batch creatures <name> <specs.json>');
    const specs = JSON.parse(await readFile(file, 'utf8')) as CreatureSpec[];
    if (!Array.isArray(specs) || !specs.length) fail(`${file}: a non-empty JSON list`);
    const items = [];
    for (const spec of specs) {
      if (!isValidId(spec.id) || typeof spec.prompt !== 'string' || !spec.prompt.trim())
        fail(`bad creature spec ${JSON.stringify(spec)}`);
      if (!(spec.height > 0.3 && spec.height < 4)) fail(`${spec.id}: height 0.3..4 m`);
      if (spec.set !== undefined && spec.set !== 'combat' && spec.set !== 'civilian')
        fail(`${spec.id}: set combat|civilian`);
      items.push(...creatureItems(spec));
    }
    const b = makeBatch(await nextBatchNumber(), name, items);
    const path = await writeBatch(b);
    console.info(`${formatBatch(b)}\nwrote ${path}; awaiting the owner's approval by number`);
    return;
  }
  if (sub === 'icons') {
    // `batch icons <name> <specs.json> [--grant <purpose>]`: { id, subject, model?, style?,
    // aspect?, removeBackground? }
    // each; one picture per icon, no 3D (owner, 2026-10-17: spell icons).
    const grantAt = rest.indexOf('--grant');
    const grant = grantAt >= 0 ? rest[grantAt + 1] : undefined;
    const [name, file] =
      grantAt < 0 ? rest : rest.filter((_, i) => i !== grantAt && i !== grantAt + 1);
    if (!name || !isValidId(name) || !file)
      fail('batch icons <name> <specs.json> [--grant <purpose>]');
    const specs = JSON.parse(await readFile(file, 'utf8')) as IconSpec[];
    if (!Array.isArray(specs) || !specs.length) fail(`${file}: a non-empty JSON list`);
    const items = [];
    for (const spec of specs) {
      if (!isValidId(spec.id) || typeof spec.subject !== 'string' || !spec.subject.trim())
        fail(`bad icon spec ${JSON.stringify(spec)}`);
      if (spec.model !== undefined && !(spec.model in CREDITS.textToImage))
        fail(`${spec.id}: model must be one of ${Object.keys(CREDITS.textToImage).join(', ')}`);
      if (spec.aspect !== undefined && !['1:1', '4:3', '3:4', '16:9', '9:16'].includes(spec.aspect))
        fail(`${spec.id}: aspect must be 1:1, 4:3, 3:4, 16:9 or 9:16`);
      if (spec.removeBackground !== undefined && typeof spec.removeBackground !== 'boolean')
        fail(`${spec.id}: removeBackground must be true or false`);
      if (spec.expose !== undefined && spec.expose !== 'map' && spec.expose !== 'keep')
        fail(`${spec.id}: expose must be map or keep`);
      items.push(...iconItems(spec));
    }
    const b = makeBatch(await nextBatchNumber(), name, items);
    if (grant) b.grant = grant;
    const path = await writeBatch(b);
    console.info(
      `${formatBatch(b)}\nwrote ${path}; ${grant ? `spends the ${grant} grant` : "awaiting the owner's approval by number"}`,
    );
    return;
  }
  const number = Number(rest[0]);
  if (!Number.isInteger(number)) fail('batch show|approve|approve-images <nnn>');
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
  if (sub === 'approve-images') {
    found.batch.imagesReviewed = true;
    await writeBatch(found.batch);
    console.info(`batch ${number}: concept images approved; the next run builds the models`);
    return;
  }
  fail('batch new|props|creatures|show|approve|approve-images');
}

/**
 * `icon reprocess <nnn> [<asset-id>...]`: run the current post-process again on a batch's
 * downloaded pictures (no Meshy call, no credits), so a better recipe reaches icons already
 * paid for; `accept` then takes them as usual.
 */
async function reprocessIcons(nnn: string | undefined, ids: string[]): Promise<void> {
  const number = Number(nnn);
  const found = await findBatch(number);
  if (!found) fail(`no batch ${nnn}`);
  const pad = String(number).padStart(3, '0');
  const items = found.batch.items.filter(
    (i) => i.step === 'text-to-image' && (!ids.length || ids.includes(i.assetId)),
  );
  if (!items.length) fail(`batch ${number} has no such icon`);
  for (const item of items) {
    const dir = `${WORK_DIR}/batch-${pad}/${item.assetId}`;
    const picture = (await readdir(dir).catch(() => [] as string[])).find(
      (f) => /\.(png|jpe?g|webp)$/i.test(f) && !f.endsWith('.icon.png'),
    );
    if (!picture) {
      console.info(`${item.assetId}: no downloaded picture in ${dir}`);
      continue;
    }
    const out = `${dir}/${item.assetId}.icon.png`;
    const r = await postProcessIcon(`${dir}/${picture}`, out, {
      expose: item.params['expose'] === 'keep' ? 'keep' : 'map',
    });
    console.info(
      `${out}: ${r.width}x${r.height}, ${r.colours} colours, ${r.matte} matte; subject mean ${r.subject.mean}, p5 ${r.subject.p5}${r.lifted ? ', lifted' : ''}`,
    );
  }
}

/** `icon accept <nnn> <asset-id> [<spell-id>]`: the processed icon into assets/, recorded in the manifest. */
async function icon(args: string[]): Promise<void> {
  if (args[0] === 'reprocess') return reprocessIcons(args[1], args.slice(2));
  const [sub, nnn, assetId, spellArg] = args;
  if (sub !== 'accept' || !nnn || !assetId)
    fail('icon accept <nnn> <asset-id> [<spell-id>] | icon reprocess <nnn> [<asset-id>...]');
  const number = Number(nnn);
  const found = await findBatch(number);
  if (!found) fail(`no batch ${number}`);
  const spellId = spellArg ?? assetId;
  if (!isValidId(spellId)) fail('spell id must be lower-case words joined by dashes');
  const item = found.batch.items.find((i) => i.assetId === assetId && i.step === 'text-to-image');
  if (!item) fail(`batch ${number} has no icon ${assetId}`);
  const run = [...found.batch.runs].reverse().find((r) => r.tasks[assetId]?.['text-to-image']);
  const task = run?.tasks[assetId]?.['text-to-image'];
  if (!task || task.status !== 'SUCCEEDED')
    fail(`${assetId}: no finished picture in batch ${number}`);
  const pad = String(number).padStart(3, '0');
  const from = `${WORK_DIR}/batch-${pad}/${assetId}/${assetId}.icon.png`;
  if (!(await exists(from))) fail(`${from} missing: run the batch first`);
  await mkdir(SPELL_ICON_DIR, { recursive: true });
  const to = `${SPELL_ICON_DIR}/${spellId}.png`;
  await copyFile(from, to);
  const manifest = await readManifest();
  upsertAsset(manifest, {
    id: `spell-icon-${spellId}`,
    kind: 'icon',
    source: `Meshy text-to-image (${String(item.params['ai_model'])}), ${item.params['remove_background'] ? 'background removed by Meshy' : 'keyed from its parchment ground'}, fitted onto the parchment oval and palettised (tools/lib/icon.ts)`,
    prompt: String(item.params['prompt']),
    meshy: {
      taskIds: [task.taskId],
      params: { textToImage: { ...item.params } },
      consumedCredits: task.consumedCredits ?? item.estimatedCredits,
    },
    licence: MESHY_LICENCE,
    files: [to],
    date: new Date().toISOString().slice(0, 10),
    notes: `batch ${pad}, asset ${assetId}${task.consumedCredits === null ? '; credits estimated' : ''}`,
  });
  await writeManifest(manifest);
  console.info(`accepted ${from} as ${to}`);
}

/**
 * `inbox <id> <picture>`: the owner's concept picture, made on a fuchsia ground (owner,
 * 2026-10-19), keyed to transparency as `pipeline/inbox/<id>.png`, where a batch's
 * image-to-3D step finds it and its text-to-image step is skipped.
 */
async function inbox(args: string[]): Promise<void> {
  const [id, picture] = args;
  if (!id || !picture) fail('inbox <id> <picture>');
  if (!isValidId(id)) fail('id must be lower-case words joined by dashes');
  if (!(await exists(picture))) fail(`${picture} missing`);
  await mkdir(INBOX_DIR, { recursive: true });
  const dest = `${INBOX_DIR}/${id}.png`;
  try {
    const r = await keyPicture(picture, dest);
    const pct = (v: number): string => `${(v * 100).toFixed(1)}%`;
    console.info(
      `${dest}: ${r.width}x${r.height}, ${r.matte === 'fuchsia' ? `keyed from rgb(${r.ground!.join(', ')})` : 'its own alpha'}; subject ${pct(r.opaque)}, edge ${pct(r.edge)}`,
    );
  } catch (e) {
    fail(`asset inbox: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function review(ids: string[]): Promise<void> {
  // `review <id>...`: each model's review sheet (tools/lib/review.ts), looked at before the
  // model goes into the game.
  if (!ids.length) fail('review <asset id>...');
  try {
    for (const s of await reviewSheets(ids)) {
      const g = s.report.gaps[0];
      const note = s.report.problems.length
        ? `FAILS: ${s.report.problems.join('; ')}`
        : s.report.suspect && g
          ? `look hard: ${describeGap(g)}`
          : 'no gap found';
      console.info(`${s.id.padEnd(24)} ${s.file}  ${note}`);
    }
  } catch (e) {
    fail(`asset review: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Where the window masks wait to be looked at (tools/lib/windows.ts). */
const WINDOWS_DIR = `${WORK_DIR}/windows`;

async function windows(args: string[]): Promise<void> {
  // `windows <id>... [--accept]`: each house's window panes found on its skin, the mask written
  // to pipeline/work/windows/ and drawn lit on the review sheet's night row; once the sheet has
  // been looked at, `--accept` takes the masks beside the models, where the game lights them.
  const accept = args.includes('--accept');
  const ids = args.filter((a) => a !== '--accept');
  if (!ids.length) fail('windows <asset id>... [--accept]');
  try {
    await mkdir(WINDOWS_DIR, { recursive: true });
    const masks: Record<string, string> = {};
    for (const id of ids) {
      const draft = `${WINDOWS_DIR}/${id}.windows.png`;
      if (accept) {
        await copyFile(draft, `assets/props/${id}/${id}.windows.png`);
        console.info(`${id.padEnd(24)} assets/props/${id}/${id}.windows.png`);
        continue;
      }
      const spec = PROPS[id];
      if (!spec) fail(`${id}: not in the props table`);
      const mask = await findWindows(`assets/props/${id}/${id}.glb`, spec.height);
      if (!mask) fail(`${id}: the model has no base colour texture`);
      await writeWindowMask(mask, draft);
      masks[id] = draft;
      const glazed = mask.boxes.filter((b) => b.kind === 'glass').length;
      console.info(
        `${id.padEnd(24)} ${glazed} glazed and ${mask.boxes.length - glazed} dark panes  ${draft}`,
      );
    }
    if (accept) return;
    for (const s of await reviewSheets(ids, masks)) console.info(`${s.id.padEnd(24)} ${s.file}`);
  } catch (e) {
    fail(`asset windows: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function run(args: string[]): Promise<void> {
  const number = Number(args[0]);
  if (!Number.isInteger(number)) fail('run <nnn> [--dry-run] [--force]');
  const flags = new Set(args.slice(1));
  for (const f of flags) if (f !== '--dry-run' && f !== '--force') fail(`unknown flag ${f}`);
  try {
    const summary = await runBatch(number, {
      dryRun: flags.has('--dry-run'),
      force: flags.has('--force'),
    });
    if (!summary.run.finished) return;
    for (const a of summary.assets) {
      console.info(
        `${a.id.padEnd(24)} ${a.file}  ${a.credits === null ? 'credits not reported per task' : `${a.credits} cr`}`,
      );
    }
    await validate();
  } catch (e) {
    fail(`asset run: ${e instanceof Error ? e.message : String(e)}`);
  }
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
  case 'run':
    await run(args);
    break;
  case 'icon':
    await icon(args);
    break;
  case 'inbox':
    await inbox(args);
    break;
  case 'review':
    await review(args);
    break;
  case 'windows':
    await windows(args);
    break;
  default: {
    const size = (await stat('pipeline/style.md')).size;
    console.info(
      `usage: asset manifest | validate | card <kind> <id> "<subject>" | batch new|show|approve | run <nnn> [--dry-run] [--force]\n(style bible: pipeline/style.md, ${size} bytes)`,
    );
  }
}
