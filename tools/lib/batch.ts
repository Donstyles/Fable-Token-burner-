/**
 * Meshy batches (DESIGN.md 10.9): Claude writes `pipeline/batches/NNN-name.json` with an
 * estimated credit cost, the owner approves it by number, and only then does the client
 * run it. No batch runs twice without `--force`. Nothing here talks to Meshy.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { writeJsonFile } from './json';

export const BATCH_DIR = 'pipeline/batches';

/** Standard humanoid clip set (DESIGN.md 10.1), names fixed project-wide. */
export const HUMANOID_CLIPS = [
  'idle',
  'walk',
  'run',
  'attack_1',
  'attack_2',
  'hit',
  'death',
  'cast',
  'talk',
  'block',
] as const;

export type HumanoidClip = (typeof HUMANOID_CLIPS)[number];

/** Walking townsfolk: no combat. Service NPCs behind a counter are portraits, no model at all. */
export const CIVILIAN_CLIPS = ['idle', 'walk', 'talk'] as const satisfies readonly HumanoidClip[];

export type ClipSet = 'combat' | 'civilian';

export function clipSet(set: ClipSet): readonly HumanoidClip[] {
  return set === 'civilian' ? CIVILIAN_CLIPS : HUMANOID_CLIPS;
}

/**
 * Meshy animation-library actions behind each clip, chosen once from the catalog
 * (678 actions, 2026-10-15) and reused for every humanoid so all characters share one set.
 */
export const HUMANOID_ACTIONS: Record<HumanoidClip, { id: number; name: string }> = {
  idle: { id: 0, name: 'Idle' },
  walk: { id: 30, name: 'Casual Walk' },
  run: { id: 14, name: 'Run 2' },
  attack_1: { id: 97, name: 'Left Slash' },
  attack_2: { id: 240, name: 'Thrust Slash' },
  hit: { id: 178, name: 'Hit Reaction' },
  death: { id: 188, name: 'Fall Dead from Abdominal Injury' },
  cast: { id: 125, name: 'Charged Spell Cast' },
  talk: { id: 313, name: 'Talk with Hands Open' },
  block: { id: 138, name: 'Block1' },
};

export function actionIds(clips: readonly HumanoidClip[]): number[] {
  return clips.map((c) => HUMANOID_ACTIONS[c].id);
}

/**
 * Credit estimates. Text-to-image and animation prices are documented in DESIGN.md 10.0;
 * image-to-3D and rigging are what Meshy reported (`consumed_credits`) for batch 001 on
 * 2026-10-15 (smart topology meshy-t2.5 at 4,000 triangles with a 2k texture; rigging).
 */
export const CREDITS = {
  textToImage: { 'nano-banana': 3, 'nano-banana-2': 6, 'nano-banana-pro': 9 } as const,
  imageTo3d: { credits: 15, basis: 'reported by Meshy for batch 001 (2026-10-15)' },
  rig: { credits: 5, basis: 'reported by Meshy for batch 001 (2026-10-15)' },
  animatePerAction: { credits: 3, basis: 'documented (DESIGN.md 10.0), confirmed by batch 001' },
} as const;

export type BatchStep = 'image-to-3d' | 'rig' | 'animate' | 'text-to-image';

export interface BatchItem {
  assetId: string;
  step: BatchStep;
  /** Input file under pipeline/inbox/, for steps that take an image. */
  input?: string;
  params: Record<string, unknown>;
  estimatedCredits: number;
  estimateBasis: string;
}

/** One Meshy task of a run, enough to resume or audit it. */
export interface TaskRecord {
  taskId: string;
  status: string;
  /** What Meshy reported for the task; null when the server did not say. */
  consumedCredits: number | null;
  operationId: string;
}

/**
 * Appended by the client. A run without `finished` is resumed by the next `asset run`;
 * task records are written after every step so a crash loses nothing billable.
 */
export interface BatchRun {
  started: string;
  finished?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  /** Balance before minus balance after: what the batch really cost. */
  consumedCredits?: number;
  taskIds: string[];
  tasks: Record<string, Partial<Record<BatchStep, TaskRecord>>>;
}

export interface Batch {
  number: number;
  name: string;
  created: string;
  approved: boolean;
  items: BatchItem[];
  estimatedCredits: number;
  runs: BatchRun[];
}

export function batchFileName(number: number, name: string): string {
  return `${String(number).padStart(3, '0')}-${name}.json`;
}

export async function nextBatchNumber(dir = BATCH_DIR): Promise<number> {
  let max = 0;
  for (const f of await readdir(dir)) {
    const m = /^(\d{3})-/.exec(f);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** The three Meshy steps that turn one concept image into a rigged, animated humanoid. */
export function humanoidItems(
  assetId: string,
  heightMetres: number,
  input: string,
  set: ClipSet = 'combat',
): BatchItem[] {
  const clips = clipSet(set);
  return [
    {
      assetId,
      step: 'image-to-3d',
      input,
      params: {
        model_type: 'smart-topology',
        ai_model: 'meshy-t2.5',
        target_polycount: 4000,
        pose_mode: 'a-pose',
        should_texture: true,
        texture_resolution: '2k',
        enable_pbr: false,
        auto_size: true,
        origin_at: 'bottom',
        target_formats: ['glb'],
      },
      estimatedCredits: CREDITS.imageTo3d.credits,
      estimateBasis: CREDITS.imageTo3d.basis,
    },
    {
      assetId,
      step: 'rig',
      params: { height_meters: heightMetres },
      estimatedCredits: CREDITS.rig.credits,
      estimateBasis: CREDITS.rig.basis,
    },
    {
      assetId,
      step: 'animate',
      params: { clips: [...clips], action_ids: actionIds(clips) },
      estimatedCredits: CREDITS.animatePerAction.credits * clips.length,
      estimateBasis: `${clips.length} actions, ${CREDITS.animatePerAction.basis}`,
    },
  ];
}

export function totalCredits(items: readonly BatchItem[]): number {
  return items.reduce((sum, i) => sum + i.estimatedCredits, 0);
}

export function makeBatch(
  number: number,
  name: string,
  items: BatchItem[],
  created = new Date(),
): Batch {
  return {
    number,
    name,
    created: created.toISOString().slice(0, 10),
    approved: false,
    items,
    estimatedCredits: totalCredits(items),
    runs: [],
  };
}

export async function writeBatch(batch: Batch, dir = BATCH_DIR): Promise<string> {
  const path = join(dir, batchFileName(batch.number, batch.name));
  await writeJsonFile(path, batch);
  return path;
}

export async function findBatch(
  number: number,
  dir = BATCH_DIR,
): Promise<{ path: string; batch: Batch } | null> {
  const prefix = `${String(number).padStart(3, '0')}-`;
  for (const f of await readdir(dir)) {
    if (!f.startsWith(prefix) || !f.endsWith('.json')) continue;
    const path = join(dir, f);
    return { path, batch: JSON.parse(await readFile(path, 'utf8')) as Batch };
  }
  return null;
}

export function formatBatch(batch: Batch): string {
  const lines = [
    `batch ${String(batch.number).padStart(3, '0')} ${batch.name}  (${batch.approved ? 'approved' : 'awaiting approval'}, created ${batch.created})`,
  ];
  for (const i of batch.items) {
    lines.push(
      `  ${i.assetId.padEnd(20)} ${i.step.padEnd(14)} ${String(i.estimatedCredits).padStart(4)} cr  ${i.estimateBasis}`,
    );
  }
  lines.push(`  estimated total ${batch.estimatedCredits} credits; runs: ${batch.runs.length}`);
  for (const r of batch.runs) {
    const cost = r.consumedCredits === undefined ? 'cost unknown' : `${r.consumedCredits} credits`;
    lines.push(
      `    run ${r.started} ${r.finished ? `finished ${r.finished}, ${cost}` : 'unfinished (resumable)'}, ${r.taskIds.length} task(s)`,
    );
  }
  return lines.join('\n');
}
