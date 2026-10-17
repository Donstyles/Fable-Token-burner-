/**
 * Props in a batch (trees, rocks): text-to-3D previews for every prop are submitted first,
 * then waited for, then refined, then waited for again, so twenty trees take as long as
 * one; each outcome is written to the batch file as it arrives, like the humanoid steps.
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Batch, BatchItem, BatchRun, TaskRecord } from './batch';
import { type Manifest, upsertAsset, writeManifest } from './manifest';
import { type MeshyClient, MeshyError, TERMINAL_STATES, type TaskOutcome } from './meshy';
import { postProcessProp, type GlbReport } from './postprocess';

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

export function textTo3dPreviewFlags(params: Record<string, unknown>): string[] {
  const s = (k: string): string => String(params[k]);
  return [
    '--mode',
    'preview',
    '--prompt',
    s('prompt'),
    '--model-type',
    s('model_type'),
    '--ai-model',
    s('ai_model'),
    '--target-polycount',
    s('target_polycount'),
    '--pose-mode',
    s('pose_mode'),
    '--target-formats',
    (params['target_formats'] as string[]).join(','),
  ];
}

export function textTo3dRefineFlags(params: Record<string, unknown>, previewId: string): string[] {
  return [
    '--mode',
    'refine',
    '--preview-task-id',
    previewId,
    '--enable-pbr',
    String(params['enable_pbr']),
    '--texture-resolution',
    String(params['texture_resolution']),
    '--target-formats',
    (params['target_formats'] as string[]).join(','),
  ];
}

const pad = (n: number): string => String(n).padStart(3, '0');

/** Which asset ids of the batch are props (they have a text-to-3d preview item). */
export function propAssetIds(batch: Batch): string[] {
  return [
    ...new Set(batch.items.filter((i) => i.step === 'text-to-3d-preview').map((i) => i.assetId)),
  ];
}

export async function runProps(ctx: PropRunContext): Promise<PropResult[]> {
  const { batch, run, client, dryRun, log, save } = ctx;
  const ids = propAssetIds(batch);
  const results: PropResult[] = [];
  if (!ids.length) return results;
  const item = (id: string, step: BatchItem['step']): BatchItem => {
    const found = batch.items.find((i) => i.assetId === id && i.step === step);
    if (!found) throw new Error(`${id}: no ${step} item`);
    return found;
  };
  const record = (o: TaskOutcome, operationId: string): TaskRecord => ({
    taskId: o.taskId,
    status: o.status,
    consumedCredits: o.consumedCredits,
    operationId,
  });
  const pendingOf = (step: 'text-to-3d-preview' | 'text-to-3d-refine'): string[] =>
    ids.filter((id) => {
      const rec = run.tasks[id]?.[step];
      return rec !== undefined && !TERMINAL_STATES.has(rec.status) && rec.status !== 'DRY_RUN';
    });
  const isQueueFull = (e: unknown): boolean =>
    e instanceof MeshyError && (e.code === 'rate_limit' || /NoMorePendingTasks/.test(e.message));
  // Submit one step for every prop (of `only`) that has no record of it yet. Meshy queues
  // about ten tasks per account: when it refuses more, wait for the oldest pending task of
  // this step to finish and submit again, so a batch of twenty needs no hand-holding.
  const submit = async (
    step: 'text-to-3d-preview' | 'text-to-3d-refine',
    flags: (id: string) => string[],
    only: string[] = ids,
  ): Promise<void> => {
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
          outcome = await client.create('text-to-3d', flags(id), operationId);
        } catch (e) {
          const pending = pendingOf(step);
          if (!isQueueFull(e) || !pending.length) throw e;
          const oldest = pending[0]!;
          const rec = run.tasks[oldest]![step]!;
          log(`  ${id} ${step}: queue full, waiting for ${oldest} (${rec.taskId})`);
          run.tasks[oldest]![step] = record(
            await client.wait('text-to-3d', rec.taskId),
            rec.operationId,
          );
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
  const waitAll = async (step: 'text-to-3d-preview' | 'text-to-3d-refine'): Promise<string[]> => {
    const failed: string[] = [];
    for (const id of ids) {
      const records = run.tasks[id]!;
      let rec = records[step]!;
      while (!TERMINAL_STATES.has(rec.status) && rec.status !== 'DRY_RUN') {
        let outcome: TaskOutcome;
        try {
          outcome = await client.wait('text-to-3d', rec.taskId);
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
    step: 'text-to-3d-preview' | 'text-to-3d-refine',
    flags: (id: string) => string[],
    only: string[],
  ): Promise<string[]> => {
    await submit(step, flags, only);
    let failed = (await waitAll(step)).filter((id) => only.includes(id));
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
      const again = (await waitAll(step)).filter((id) => only.includes(id));
      failed = failed.filter((id) => !retry.includes(id) || again.includes(id));
    }
    return failed;
  };

  log(`props: ${ids.length} (${ids.join(', ')})`);
  const previewFailed = await runStep(
    'text-to-3d-preview',
    (id) => textTo3dPreviewFlags(item(id, 'text-to-3d-preview').params),
    ids,
  );
  const refineIds = ids.filter((id) => !previewFailed.includes(id));
  const refineFailed = await runStep(
    'text-to-3d-refine',
    (id) =>
      textTo3dRefineFlags(
        item(id, 'text-to-3d-refine').params,
        run.tasks[id]!['text-to-3d-preview']!.taskId,
      ),
    refineIds,
  );
  const failed = new Set([...previewFailed, ...refineFailed]);

  for (const id of ids) {
    if (failed.has(id)) continue;
    const records = run.tasks[id]!;
    const preview = records['text-to-3d-preview']!;
    const refine = records['text-to-3d-refine']!;
    const dir = join(ctx.workDir, id);
    const output = join(PROP_DIR, id, `${id}.glb`);
    if (!dryRun) await mkdir(dir, { recursive: true });
    const files = await client.download('text-to-3d', refine.taskId, 'model', dir);
    const glb = files.find((f) => f.endsWith('.glb'));
    let report: GlbReport | null = null;
    if (!dryRun) {
      if (!glb) throw new Error(`${id}: the model download has no .glb (${files.join(', ')})`);
      report = await postProcessProp(glb, output, 256);
      log(`  ${output}: ${report.triangles} triangles, ${(report.bytes / 1024).toFixed(0)} KiB`);
    } else {
      log(`  post-process → ${output}`);
    }
    const taskCredits = [preview, refine].map((t) => t.consumedCredits);
    const credits = taskCredits.every((c): c is number => c !== null)
      ? taskCredits.reduce((a, b) => a + b, 0)
      : null;
    if (!dryRun) {
      upsertAsset(ctx.manifest, {
        id,
        kind: 'prop',
        source: 'Meshy text-to-3D (smart topology, preview then refine)',
        prompt: String(item(id, 'text-to-3d-preview').params['prompt']),
        meshy: {
          taskIds: [preview.taskId, refine.taskId],
          params: {
            preview: item(id, 'text-to-3d-preview').params,
            refine: item(id, 'text-to-3d-refine').params,
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
  if (failed.size) {
    throw new Error(
      `props failed: ${[...failed].join(', ')} (the others are done; re-run to retry)`,
    );
  }
  return results;
}
