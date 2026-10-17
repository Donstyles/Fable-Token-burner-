/**
 * Runs an approved Meshy batch (DESIGN.md 10.1, 10.9): per humanoid, image-to-3D → rigging →
 * animation → download → post-process → manifest. Task records go into the batch file after
 * every step, so an interrupted run resumes where it stopped and never submits a step twice.
 * Nothing runs for an unapproved batch, and a finished batch needs `--force` to run again.
 */
import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  HUMANOID_CLIPS,
  actionIds,
  findBatch,
  writeBatch,
  type Batch,
  type BatchItem,
  type BatchRun,
  type BatchStep,
  type HumanoidClip,
  type TaskRecord,
} from './batch';
import { readBudget, recordSpend, remaining } from './budget';
import { CARD_DIR, INBOX_DIR } from './cards';
import { readManifest, upsertAsset, writeManifest } from './manifest';
import { MeshyClient, TERMINAL_STATES, type MeshyResource, type TaskOutcome } from './meshy';
import { postProcessCharacter, type GlbReport } from './postprocess';
import { propAssetIds, runProps } from './run-props';

export const WORK_DIR = 'pipeline/work';
export const CHARACTER_DIR = 'assets/characters';
/** Meshy's paid plans grant the account holder full rights to generated output. */
export const MESHY_LICENCE = 'Meshy output (paid plan): owner holds full rights';

const RESOURCE: Record<BatchStep, MeshyResource> = {
  'text-to-image': 'text-to-image',
  'image-to-3d': 'image-to-3d',
  rig: 'rigging',
  animate: 'animate',
  'text-to-3d-preview': 'text-to-3d',
  'text-to-3d-refine': 'text-to-3d',
};

export interface RunOptions {
  dryRun?: boolean;
  force?: boolean;
  log?: (line: string) => void;
}

export interface RunSummary {
  batch: Batch;
  run: BatchRun;
  assets: { id: string; file: string; report: GlbReport | null; credits: number | null }[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

/** The fenced prompt of the asset's card, if a card exists. */
export async function cardPrompt(assetId: string): Promise<string | undefined> {
  const path = join(CARD_DIR, `${assetId}.md`);
  if (!(await exists(path))) return undefined;
  const m = /```\n([\s\S]*?)\n```/.exec(await readFile(path, 'utf8'));
  return m?.[1]?.trim() || undefined;
}

export function imageTo3dFlags(params: Record<string, unknown>, imagePath: string): string[] {
  const flag = (name: string, key: string): string[] =>
    params[key] === undefined ? [] : [`--${name}`, String(params[key])];
  const formats = Array.isArray(params['target_formats'])
    ? (params['target_formats'] as string[]).join(',')
    : 'glb';
  const data: Record<string, unknown> = {};
  for (const key of ['auto_size', 'origin_at'])
    if (params[key] !== undefined) data[key] = params[key];
  return [
    '--image-url',
    imagePath,
    ...flag('model-type', 'model_type'),
    ...flag('ai-model', 'ai_model'),
    ...flag('target-polycount', 'target_polycount'),
    ...flag('pose-mode', 'pose_mode'),
    ...flag('should-texture', 'should_texture'),
    ...flag('texture-resolution', 'texture_resolution'),
    ...flag('enable-pbr', 'enable_pbr'),
    '--target-formats',
    formats,
    ...(Object.keys(data).length ? ['--data', JSON.stringify(data)] : []),
  ];
}

export function textToImageFlags(params: Record<string, unknown>): string[] {
  const flag = (name: string, key: string): string[] =>
    params[key] === undefined ? [] : [`--${name}`, String(params[key])];
  return [
    '--prompt',
    String(params['prompt']),
    ...flag('ai-model', 'ai_model'),
    ...flag('pose-mode', 'pose_mode'),
    ...flag('aspect-ratio', 'aspect_ratio'),
    ...flag('remove-background', 'remove_background'),
  ];
}

export function rigFlags(params: Record<string, unknown>, inputTaskId: string): string[] {
  return [
    '--input-task-id',
    inputTaskId,
    '--height-meters',
    String(params['height_meters'] ?? 1.7),
  ];
}

export function animateFlags(params: Record<string, unknown>, rigTaskId: string): string[] {
  const ids = Array.isArray(params['action_ids'])
    ? (params['action_ids'] as number[])
    : actionIds((params['clips'] as HumanoidClip[] | undefined) ?? HUMANOID_CLIPS);
  return ['--rig-task-id', rigTaskId, '--action-ids', ids.join(',')];
}

export function clipsOf(params: Record<string, unknown>): readonly string[] {
  return Array.isArray(params['clips']) ? (params['clips'] as string[]) : HUMANOID_CLIPS;
}

export async function runBatch(number: number, opts: RunOptions = {}): Promise<RunSummary> {
  const dryRun = opts.dryRun ?? false;
  const log = opts.log ?? ((line: string) => console.info(line));
  const found = await findBatch(number);
  if (!found) throw new Error(`no batch ${number}`);
  const { batch } = found;
  const label = `batch ${pad(batch.number)} ${batch.name}`;
  // A batch runs when the owner approved it by number, or within a standing credit grant
  // (pipeline/budget.json) that covers its estimate; the grant is spent as runs report costs.
  const budget = await readBudget();
  const covered = budget !== null && remaining(budget) >= batch.estimatedCredits;
  if (!batch.approved && !covered && !dryRun) {
    throw new Error(
      `${label} is not approved and no credit grant covers its ${batch.estimatedCredits} credits` +
        (budget ? ` (${remaining(budget)} of ${budget.granted} left)` : ''),
    );
  }
  if (!batch.approved && covered && !dryRun) {
    log(
      `${label}: running under the owner's grant (${remaining(budget!)} of ${budget!.granted} credits left)`,
    );
  }

  let run = batch.runs.find((r) => !r.finished);
  if (run) {
    log(`${label}: resuming the run started ${run.started}`);
  } else {
    const last = batch.runs.at(-1);
    if (last && !opts.force) {
      throw new Error(
        `${label} already ran (finished ${last.finished}); pass --force to run it again`,
      );
    }
    run = { started: new Date().toISOString(), taskIds: [], tasks: {} };
    if (!dryRun) batch.runs.push(run);
  }
  const runIndex =
    dryRun && !batch.runs.includes(run) ? batch.runs.length : batch.runs.indexOf(run);
  const save = async (): Promise<void> => {
    if (!dryRun) await writeBatch(batch);
  };

  const client = new MeshyClient({ dryRun, log });
  const before = await client.balance();
  log(`balance ${before.balance} credits; ${label} estimates ${batch.estimatedCredits}`);
  if (before.balance < batch.estimatedCredits && !opts.force) {
    throw new Error(
      `not enough credits for the estimate (${before.balance} < ${batch.estimatedCredits})`,
    );
  }
  // A run that has not submitted anything yet takes the current balance as its start, so a
  // plan change between a refused attempt and this one does not show up as credits.
  if (run.balanceBefore === undefined || run.taskIds.length === 0)
    run.balanceBefore = before.balance;
  await save();
  if (dryRun) log('dry run: commands are printed, nothing is submitted');

  const manifest = await readManifest();
  const summary: RunSummary = { batch, run, assets: [] };
  const props = propAssetIds(batch);
  const assetIds = [...new Set(batch.items.map((i) => i.assetId))].filter(
    (id) => !props.includes(id),
  );
  if (props.length) {
    const results = await runProps({
      batch,
      run,
      runIndex,
      client,
      dryRun,
      log,
      save,
      manifest,
      workDir: join(WORK_DIR, `batch-${pad(batch.number)}`),
      licence: MESHY_LICENCE,
    });
    for (const r of results) summary.assets.push(r);
  }

  // Creatures whose concept images were made this run and await a look before the 3D steps.
  const pendingReview: string[] = [];
  for (const assetId of assetIds) {
    const items = batch.items.filter((i) => i.assetId === assetId);
    const records = (run.tasks[assetId] ??= {});
    log(`${assetId}:`);

    const step = async (item: BatchItem, flags: () => string[]): Promise<TaskRecord> => {
      const resource = RESOURCE[item.step];
      const existing = records[item.step];
      // The CLI journals every submission by operation id and refuses to reuse one that was
      // rejected (no task created), so each attempt gets its own id; an accepted attempt is
      // recorded as a task below before another could start.
      const attemptKey = `${assetId}/${item.step}`;
      const attempt = existing
        ? (run.attempts?.[attemptKey] ?? 1)
        : ((run.attempts ??= {})[attemptKey] = (run.attempts[attemptKey] ?? 0) + 1);
      if (!existing) await save();
      const operationId = `b${pad(batch.number)}-${assetId}-${item.step}-r${runIndex + 1}-a${attempt}`;
      if (existing && TERMINAL_STATES.has(existing.status)) {
        if (existing.status !== 'SUCCEEDED') {
          throw new Error(`${assetId} ${item.step}: task ${existing.taskId} ${existing.status}`);
        }
        log(`  ${item.step}: already done (${existing.taskId})`);
        return existing;
      }
      let outcome: TaskOutcome = existing
        ? await client.wait(resource, existing.taskId)
        : await client.create(resource, flags(), operationId);
      const record = (o: TaskOutcome): TaskRecord => ({
        taskId: o.taskId,
        status: o.status,
        consumedCredits: o.consumedCredits,
        operationId,
      });
      records[item.step] = record(outcome);
      if (!run.taskIds.includes(outcome.taskId)) run.taskIds.push(outcome.taskId);
      await save();
      while (!TERMINAL_STATES.has(outcome.status)) {
        outcome = await client.wait(resource, outcome.taskId);
        records[item.step] = record(outcome);
        await save();
      }
      if (outcome.status !== 'SUCCEEDED' && outcome.status !== 'DRY_RUN') {
        throw new Error(`${assetId} ${item.step}: task ${outcome.taskId} ${outcome.status}`);
      }
      const credits =
        outcome.consumedCredits === null
          ? 'credits not reported'
          : `${outcome.consumedCredits} credits`;
      log(`  ${item.step}: ${outcome.status} ${outcome.taskId} (${credits})`);
      return records[item.step] as TaskRecord;
    };

    const toModel = items.find((i) => i.step === 'image-to-3d');
    const toRig = items.find((i) => i.step === 'rig');
    const toAnimate = items.find((i) => i.step === 'animate');
    if (!toModel || !toRig || !toAnimate) {
      throw new Error(`${assetId}: a humanoid needs image-to-3d, rig and animate items`);
    }
    const image = join(INBOX_DIR, toModel.input ?? `${assetId}.png`);
    const toImage = items.find((i) => i.step === 'text-to-image');
    if (toImage && !(await exists(image))) {
      // Image first (owner, 2026-10-17): the concept is generated, saved to the inbox like an
      // owner-supplied one, and the run stops there until the images have been looked at.
      const concept = await step(toImage, () => textToImageFlags(toImage.params));
      const dir = join(WORK_DIR, `batch-${pad(batch.number)}`, assetId);
      if (!dryRun) await mkdir(dir, { recursive: true });
      const files = await client.download('text-to-image', concept.taskId, 'image', dir);
      const png = files.find((f) => /\.(png|jpe?g|webp)$/i.test(f));
      if (!dryRun) {
        if (!png) throw new Error(`${assetId}: the image download has no picture`);
        await copyFile(png, image);
        log(`  concept → ${image}`);
      }
    }
    if (!(await exists(image)) && !dryRun) throw new Error(`${assetId}: ${image} missing`);
    if (toImage && !batch.imagesReviewed) {
      pendingReview.push(assetId);
      continue;
    }

    const model = await step(toModel, () => imageTo3dFlags(toModel.params, image));
    const rig = await step(toRig, () => rigFlags(toRig.params, model.taskId));
    const anim = await step(toAnimate, () => animateFlags(toAnimate.params, rig.taskId));

    const workDir = join(WORK_DIR, `batch-${pad(batch.number)}`, assetId);
    const output = join(CHARACTER_DIR, assetId, `${assetId}.glb`);
    if (!dryRun) await mkdir(workDir, { recursive: true });
    const files = await client.download('animate', anim.taskId, 'animation', workDir);
    const glb = files.find((f) => f.endsWith('.glb'));
    let report: GlbReport | null = null;
    if (!dryRun) {
      if (!glb)
        throw new Error(`${assetId}: the animation download has no .glb (${files.join(', ')})`);
      report = await postProcessCharacter(glb, output, clipsOf(toAnimate.params));
      log(
        `  ${output}: ${report.triangles} triangles, ${report.clips.length} clips, ${report.textures
          .map((t) => `${t.width}x${t.height}`)
          .join(' ')}, ${(report.bytes / 1024).toFixed(0)} KiB`,
      );
    } else {
      log(`  post-process → ${output} (clips ${clipsOf(toAnimate.params).join(', ')})`);
    }

    const taskCredits = [model, rig, anim].map((t) => t.consumedCredits);
    const credits = taskCredits.every((c): c is number => c !== null)
      ? taskCredits.reduce((a, b) => a + b, 0)
      : null;
    if (!dryRun) {
      upsertAsset(manifest, {
        id: assetId,
        kind: 'character',
        source: `Meshy image-to-3D (smart topology) from the owner's concept image ${image}`,
        ...(await cardPrompt(assetId).then((p) => (p ? { prompt: p } : {}))),
        meshy: {
          taskIds: [model.taskId, rig.taskId, anim.taskId],
          params: { imageTo3d: toModel.params, rig: toRig.params, animate: toAnimate.params },
          consumedCredits: credits ?? 0,
        },
        licence: MESHY_LICENCE,
        files: [output],
        date: new Date().toISOString().slice(0, 10),
        notes: [
          `batch ${pad(batch.number)}`,
          report ? `${report.triangles} triangles, ${report.clips.length} clips` : '',
          credits === null ? 'some tasks did not report credits; see the batch run' : '',
        ]
          .filter(Boolean)
          .join('; '),
      });
      await writeManifest(manifest);
    }
    summary.assets.push({ id: assetId, file: output, report, credits });
  }

  if (pendingReview.length) {
    log(
      `concept images ready in ${INBOX_DIR}: ${pendingReview.join(', ')}. Look at them, then ` +
        `\`asset batch approve-images ${batch.number}\` and run again for the models.`,
    );
  }
  const after = await client.balance();
  if (!dryRun) {
    run.balanceAfter = after.balance;
    // What the tasks reported is the cost; the balance delta is the cross-check (monthly
    // credits can change under a run), and the fallback when a task did not report.
    const reported = Object.values(run.tasks)
      .flatMap((steps) => Object.values(steps))
      .map((t) => t.consumedCredits);
    const delta = (run.balanceBefore ?? after.balance) - after.balance;
    run.consumedCredits = reported.every((c): c is number => c !== null)
      ? reported.reduce((a, b) => a + b, 0)
      : delta;
    run.finished = new Date().toISOString();
    await save();
    if (budget && !batch.approved) await recordSpend(budget, batch.number, run.consumedCredits);
    const check = delta === run.consumedCredits ? '' : ` (balance moved by ${delta})`;
    log(
      `${label}: done, ${run.consumedCredits} credits consumed (balance ${after.balance})${check}`,
    );
  } else {
    log(`${label}: dry run complete, balance still ${after.balance}`);
  }
  return summary;
}
