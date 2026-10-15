/**
 * Runs an approved Meshy batch (DESIGN.md 10.1, 10.9): per humanoid, image-to-3D → rigging →
 * animation → download → post-process → manifest. Task records go into the batch file after
 * every step, so an interrupted run resumes where it stopped and never submits a step twice.
 * Nothing runs for an unapproved batch, and a finished batch needs `--force` to run again.
 */
import { access, mkdir, readFile } from 'node:fs/promises';
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
import { CARD_DIR, INBOX_DIR } from './cards';
import { readManifest, upsertAsset, writeManifest } from './manifest';
import { MeshyClient, TERMINAL_STATES, type MeshyResource, type TaskOutcome } from './meshy';
import { postProcessCharacter, type GlbReport } from './postprocess';

export const WORK_DIR = 'pipeline/work';
export const CHARACTER_DIR = 'assets/characters';
/** Meshy's paid plans grant the account holder full rights to generated output. */
export const MESHY_LICENCE = 'Meshy output (paid plan): owner holds full rights';

const RESOURCE: Record<Exclude<BatchStep, 'text-to-image'>, MeshyResource> = {
  'image-to-3d': 'image-to-3d',
  rig: 'rigging',
  animate: 'animate',
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
  if (!batch.approved && !dryRun) {
    throw new Error(`${label} is not approved; the owner approves it by number first`);
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
  if (run.balanceBefore === undefined) run.balanceBefore = before.balance;
  await save();
  if (dryRun) log('dry run: commands are printed, nothing is submitted');

  const manifest = await readManifest();
  const summary: RunSummary = { batch, run, assets: [] };
  const assetIds = [...new Set(batch.items.map((i) => i.assetId))];

  for (const assetId of assetIds) {
    const items = batch.items.filter((i) => i.assetId === assetId);
    const records = (run.tasks[assetId] ??= {});
    log(`${assetId}:`);

    const step = async (item: BatchItem, flags: () => string[]): Promise<TaskRecord> => {
      if (item.step === 'text-to-image')
        throw new Error(`${assetId}: text-to-image is not run here`);
      const resource = RESOURCE[item.step];
      const operationId = `b${pad(batch.number)}-${assetId}-${item.step}-r${runIndex + 1}`;
      const existing = records[item.step];
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
    if (!(await exists(image))) throw new Error(`${assetId}: ${image} missing`);

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

  const after = await client.balance();
  if (!dryRun) {
    run.balanceAfter = after.balance;
    run.consumedCredits = (run.balanceBefore ?? after.balance) - after.balance;
    run.finished = new Date().toISOString();
    await save();
    log(`${label}: done, ${run.consumedCredits} credits consumed (balance ${after.balance})`);
  } else {
    log(`${label}: dry run complete, balance still ${after.balance}`);
  }
  return summary;
}
