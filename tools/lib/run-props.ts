/**
 * Props in a batch (trees, rocks, buildings), image first (owner, 2026-10-17 and 2026-10-19:
 * "Never ever do text to 3d. No exceptions"): a concept picture for every prop is submitted,
 * then waited for, and saved to the inbox; the run stops there until the owner has seen them
 * (`asset batch approve-images`); the next run turns each picture into a model. Submitting
 * all of one step before waiting means twenty props take as long as one; each outcome is
 * written to the batch file as it arrives, like the humanoid steps.
 */
import { access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Batch, BatchItem, BatchRun, TaskRecord } from './batch';
import { INBOX_DIR } from './cards';
import { imageTo3dFlags, textToImageFlags } from './flags';
import { keyPicture } from './key';
import { type Manifest, upsertAsset, writeManifest } from './manifest';
import { type MeshyClient, MeshyError, TERMINAL_STATES, type TaskOutcome } from './meshy';
import { postProcessProp, type GlbReport } from './postprocess';
import { checkModel, describeGap } from './quality';
import { PROPS, frontTurnDeg } from '../../kernel/terrain/props';

export const PROP_DIR = 'assets/props';

export interface PropRunContext {
  batch: Batch;
  run: BatchRun;
  runIndex: number;
  client: MeshyClient;
  dryRun: boolean;
  log: (line: string) => void;
  save: () => Promise<void>;
  manifest: Manifest;
  workDir: string;
  licence: string;
}

export interface PropResult {
  id: string;
  file: string;
  report: GlbReport | null;
  credits: number | null;
}

export interface PropRunOutcome {
  results: PropResult[];
  /** Props whose concept pictures wait for the owner's look before the models are made. */
  pendingReview: string[];
}

type PropStep = 'text-to-image' | 'image-to-3d';

const pad = (n: number): string => String(n).padStart(3, '0');

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Which asset ids of the batch are props: a model from a picture, with no rig. */
export function propAssetIds(batch: Batch): string[] {
  const rigged = new Set(batch.items.filter((i) => i.step === 'rig').map((i) => i.assetId));
  return [
    ...new Set(
      batch.items
        .filter((i) => i.step === 'image-to-3d' && !rigged.has(i.assetId))
        .map((i) => i.assetId),
    ),
  ];
}

export async function runProps(ctx: PropRunContext): Promise<PropRunOutcome> {
  const { batch, run, client, dryRun, log, save } = ctx;
  const ids = propAssetIds(batch);
  const results: PropResult[] = [];
  if (!ids.length) return { results, pendingReview: [] };
  const item = (id: string, step: PropStep): BatchItem => {
    const found = batch.items.find((i) => i.assetId === id && i.step === step);
    if (!found) throw new Error(`${id}: no ${step} item`);
    return found;
  };
  const imageOf = (id: string): string =>
    join(INBOX_DIR, item(id, 'image-to-3d').input ?? `${id}.png`);
  const record = (o: TaskOutcome, operationId: string): TaskRecord => ({
    taskId: o.taskId,
    status: o.status,
    consumedCredits: o.consumedCredits,
    operationId,
  });
  const pendingOf = (step: PropStep): string[] =>
    ids.filter((id) => {
      const rec = run.tasks[id]?.[step];
      return rec !== undefined && !TERMINAL_STATES.has(rec.status) && rec.status !== 'DRY_RUN';
    });
  const isQueueFull = (e: unknown): boolean =>
    e instanceof MeshyError && (e.code === 'rate_limit' || /NoMorePendingTasks/.test(e.message));
  // Submit one step for every prop (of `only`) that has no record of it yet. Meshy queues
  // about ten tasks per account: when it refuses more, wait for the oldest pending task of
  // this step to finish and submit again, so a batch of twenty needs no hand-holding.
  const submit = async (step: PropStep, flags: (id: string) => string[], only: string[]) => {
    for (const id of only) {
      const records = (run.tasks[id] ??= {});
      if (records[step]) continue;
      const key = `${id}/${step}`;
      // Every submission gets its own operation id: the CLI remembers a rejected one.
      const nextAttempt = async (): Promise<string> => {
        const attempt = ((run.attempts ??= {})[key] = (run.attempts[key] ?? 0) + 1);
        await save();
        return `b${pad(batch.number)}-${id}-${step}-r${ctx.runIndex + 1}-a${attempt}`;
      };
      let operationId = await nextAttempt();
      let outcome: TaskOutcome | null = null;
      while (outcome === null) {
        try {
          outcome = await client.create(step, flags(id), operationId);
        } catch (e) {
          const pending = pendingOf(step);
          if (!isQueueFull(e) || !pending.length) throw e;
          const oldest = pending[0]!;
          const rec = run.tasks[oldest]![step]!;
          log(`  ${id} ${step}: queue full, waiting for ${oldest} (${rec.taskId})`);
          run.tasks[oldest]![step] = record(await client.wait(step, rec.taskId), rec.operationId);
          operationId = await nextAttempt();
        }
      }
      records[step] = record(outcome, operationId);
      if (!run.taskIds.includes(outcome.taskId)) run.taskIds.push(outcome.taskId);
      await save();
      log(`  ${id} ${step}: submitted ${outcome.taskId}`);
    }
  };
  // Wait for every prop's step; a failure is reported but does not stop the others.
  const waitAll = async (step: PropStep, only: string[]): Promise<string[]> => {
    const failed: string[] = [];
    for (const id of only) {
      const records = run.tasks[id]!;
      let rec = records[step]!;
      while (!TERMINAL_STATES.has(rec.status) && rec.status !== 'DRY_RUN') {
        let outcome: TaskOutcome;
        try {
          outcome = await client.wait(step, rec.taskId);
        } catch (e) {
          // The CLI reports a failed task as an error; it is a failed record here, not the
          // end of the run.
          if (!(e instanceof MeshyError && e.code === 'task_failed')) throw e;
          outcome = { ...rec, status: 'FAILED', consumedCredits: null, faceCount: null };
        }
        rec = record(outcome, rec.operationId);
        records[step] = rec;
        await save();
      }
      if (rec.status !== 'SUCCEEDED' && rec.status !== 'DRY_RUN') {
        failed.push(id);
        log(`  ${id} ${step}: ${rec.status} (${rec.taskId})`);
      } else {
        const credits =
          rec.consumedCredits === null ? 'credits not reported' : `${rec.consumedCredits} credits`;
        log(`  ${id} ${step}: ${rec.status} (${credits})`);
      }
    }
    return failed;
  };
  // Meshy's "A processing error occurred. Please retry." is retried once per step: the
  // failed record is dropped and the step submitted again under a second attempt number.
  const runStep = async (
    step: PropStep,
    flags: (id: string) => string[],
    only: string[],
  ): Promise<string[]> => {
    await submit(step, flags, only);
    let failed = await waitAll(step, only);
    const failures = (id: string): number => run.attempts?.[`${id}/${step}#failed`] ?? 0;
    const retry = failed.filter((id) => failures(id) < 1);
    if (retry.length) {
      log(`  retrying ${step} for ${retry.join(', ')}`);
      for (const id of retry) {
        (run.attempts ??= {})[`${id}/${step}#failed`] = failures(id) + 1;
        delete run.tasks[id]![step];
      }
      await save();
      await submit(step, flags, retry);
      const again = await waitAll(step, retry);
      failed = failed.filter((id) => !retry.includes(id) || again.includes(id));
    }
    return failed;
  };

  log(`props: ${ids.length} (${ids.join(', ')})`);
  // The concept pictures, for every prop whose picture is not in the inbox yet.
  const needPicture: string[] = [];
  for (const id of ids) if (!(await exists(imageOf(id)))) needPicture.push(id);
  const pictureFailed = needPicture.length
    ? await runStep(
        'text-to-image',
        (id) => textToImageFlags(item(id, 'text-to-image').params),
        needPicture,
      )
    : [];
  for (const id of needPicture) {
    if (pictureFailed.includes(id)) continue;
    const dir = join(ctx.workDir, id);
    if (!dryRun) await mkdir(dir, { recursive: true });
    const taskId = run.tasks[id]!['text-to-image']!.taskId;
    const files = await client.download('text-to-image', taskId, 'image', dir);
    const png = files.find((f) => /\.(png|jpe?g|webp)$/i.test(f));
    if (!dryRun) {
      if (!png) throw new Error(`${id}: the image download has no picture`);
      await mkdir(INBOX_DIR, { recursive: true });
      const keyed = await keyPicture(png, imageOf(id));
      log(`  concept → ${imageOf(id)} (${keyed.matte})`);
    }
  }
  if (pictureFailed.length) {
    throw new Error(`concept pictures failed: ${pictureFailed.join(', ')} (re-run to retry)`);
  }
  // The owner sees every picture before a credit goes on a model.
  if (!batch.imagesReviewed) return { results, pendingReview: ids };

  const modelFailed = await runStep(
    'image-to-3d',
    (id) => imageTo3dFlags(item(id, 'image-to-3d').params, imageOf(id)),
    ids,
  );
  for (const id of ids) {
    if (modelFailed.includes(id)) continue;
    const records = run.tasks[id]!;
    const picture = records['text-to-image'];
    const model = records['image-to-3d']!;
    const dir = join(ctx.workDir, id);
    const output = join(PROP_DIR, id, `${id}.glb`);
    if (!dryRun) await mkdir(dir, { recursive: true });
    const files = await client.download('image-to-3d', model.taskId, 'model', dir);
    const glb = files.find((f) => f.endsWith('.glb'));
    let report: GlbReport | null = null;
    if (!dryRun) {
      if (!glb) throw new Error(`${id}: the model download has no .glb (${files.join(', ')})`);
      // A house at 1024 pixels, the rest at 512, JPEG (owner, 2026-10-23: at 256 a whole
      // inn was painted from 256 pixels and the filters made mud of it).
      // A door Meshy delivered on a gable turns round to the front (kernel/terrain/props.ts).
      report = await postProcessProp(
        glb,
        output,
        id.startsWith('building-') ? 1024 : 512,
        'jpeg',
        frontTurnDeg(PROPS[id]?.front),
      );
      log(`  ${output}: ${report.triangles} triangles, ${(report.bytes / 1024).toFixed(0)} KiB`);
      // The quality screen (tools/lib/quality.ts); the verdict is the review sheet's, looked at
      // before the model goes into the game, and a model that fails is generated again
      // (owner, 2026-10-23: "Always retry model generation till the model has no see through
      // gaps").
      const quality = await checkModel(output, PROPS[id]?.height ?? 1, {
        targetTriangles: Number(item(id, 'image-to-3d').params['target_polycount']) || undefined,
      });
      const worst = quality.gaps[0];
      log(
        `  quality: ${
          quality.problems.length
            ? `FAILS (${quality.problems.join('; ')})`
            : quality.suspect && worst
              ? `suspect, a gap of ${describeGap(worst)}`
              : 'no gap found'
        }; review it: npm run asset -- review ${id}`,
      );
    } else {
      log(`  post-process → ${output}`);
    }
    const tasks = [picture, model].filter((t): t is TaskRecord => t !== undefined);
    const credits = tasks.every((t) => t.consumedCredits !== null)
      ? tasks.reduce((a, t) => a + (t.consumedCredits ?? 0), 0)
      : null;
    if (!dryRun) {
      upsertAsset(ctx.manifest, {
        id,
        kind: 'prop',
        source: `Meshy image-to-3D (smart topology) from the concept picture ${imageOf(id)}`,
        prompt: String(item(id, 'text-to-image').params['prompt']),
        meshy: {
          taskIds: tasks.map((t) => t.taskId),
          params: {
            textToImage: item(id, 'text-to-image').params,
            imageTo3d: item(id, 'image-to-3d').params,
          },
          consumedCredits: credits ?? 0,
        },
        licence: ctx.licence,
        files: [output],
        date: new Date().toISOString().slice(0, 10),
        notes: [`batch ${pad(batch.number)}`, report ? `${report.triangles} triangles` : '']
          .filter(Boolean)
          .join('; '),
      });
      await writeManifest(ctx.manifest);
    }
    results.push({ id, file: output, report, credits });
  }
  if (modelFailed.length) {
    throw new Error(
      `prop models failed: ${modelFailed.join(', ')} (the others are done; re-run to retry)`,
    );
  }
  return { results, pendingReview: [] };
}
