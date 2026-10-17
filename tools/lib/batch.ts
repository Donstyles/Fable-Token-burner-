/**
 * Meshy batches (DESIGN.md 10.9): Claude writes `pipeline/batches/NNN-name.json` with an
 * estimated credit cost, the owner approves it by number, and only then does the client
 * run it. No batch runs twice without `--force`. Nothing here talks to Meshy.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { writeJsonFile } from './json';

export const BATCH_DIR = 'pipeline/batches';

export {
  CIVILIAN_CLIPS,
  HUMANOID_ACTIONS,
  HUMANOID_CLIPS,
  actionIds,
  clipSet,
  type ClipSet,
  type HumanoidClip,
} from '../../kernel/characters/clips';
import { actionIds, clipSet, type ClipSet } from '../../kernel/characters/clips';

/**
 * Credit estimates. Text-to-image and animation prices are documented in DESIGN.md 10.0;
 * image-to-3D and rigging are what Meshy reported (`consumed_credits`) for batch 001 on
 * 2026-10-15 (smart topology meshy-t2.5 at 4,000 triangles with a 2k texture; rigging).
 */
export const CREDITS = {
  textToImage: {
    'nano-banana-2-lite': 3,
    'nano-banana': 3,
    'nano-banana-2': 6,
    'nano-banana-pro': 9,
  } as const,
  imageTo3d: { credits: 15, basis: 'reported by Meshy for batch 001 (2026-10-15)' },
  rig: { credits: 5, basis: 'reported by Meshy for batch 001 (2026-10-15)' },
  animatePerAction: { credits: 3, basis: 'documented (DESIGN.md 10.0), confirmed by batch 001' },
  textTo3dPreview: { credits: 5, basis: 'measured, batch 003 (2026-10-17)' },
  textTo3dRefine: { credits: 10, basis: 'measured, batch 003 (2026-10-17)' },
} as const;

export type BatchStep =
  'image-to-3d' | 'rig' | 'animate' | 'text-to-image' | 'text-to-3d-preview' | 'text-to-3d-refine';

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
  /** Submissions tried per "<assetId>/<step>": a rejected one (no task) gets a fresh operation id. */
  attempts?: Record<string, number>;
}

export interface Batch {
  number: number;
  name: string;
  created: string;
  approved: boolean;
  /**
   * Creatures start as text-to-image concepts (owner, 2026-10-17: never text-to-3D). A run
   * stops after the images until they are looked at and `batch approve-images` sets this.
   */
  imagesReviewed?: boolean;
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
export type PoseMode = 'a-pose' | 't-pose';

export function humanoidItems(
  assetId: string,
  heightMetres: number,
  input: string,
  set: ClipSet = 'combat',
  pose: PoseMode = 'a-pose',
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
        pose_mode: pose,
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

/** A creature or villager made image first: a prompt, then the humanoid's three steps. */
export interface CreatureSpec {
  id: string;
  /** Standing height in metres, for the rig. */
  height: number;
  /** The concept image's description; the pose, framing and look are added here. */
  prompt: string;
  set?: ClipSet;
}

export const CONCEPT_STYLE =
  'Full-body front view, standing straight in an A-pose with the arms held slightly out ' +
  'from the sides and the feet apart, the whole figure centred and visible from head to ' +
  'foot, plain white background, no ground shadow, nothing else in the frame. The look of ' +
  'a late-1990s first-person RPG character: simple readable shapes, painted textures, flat ' +
  'even lighting, muted natural colours.';

/** Text-to-image through Meshy's cheapest model, then image-to-3D, rig and clips. */
export function creatureItems(spec: CreatureSpec, pose: PoseMode = 'a-pose'): BatchItem[] {
  const input = `${spec.id}.png`;
  return [
    {
      assetId: spec.id,
      step: 'text-to-image',
      input,
      params: {
        prompt: `${spec.prompt} ${CONCEPT_STYLE}`,
        ai_model: 'nano-banana-2-lite',
        pose_mode: pose,
        aspect_ratio: '1:1',
        remove_background: true,
      },
      estimatedCredits: CREDITS.textToImage['nano-banana-2-lite'],
      estimateBasis: 'documented (DESIGN.md 10.0); the cheapest image model',
    },
    ...humanoidItems(spec.id, spec.height, input, spec.set ?? 'combat', pose),
  ];
}

export function totalCredits(items: readonly BatchItem[]): number {
  return items.reduce((sum, i) => sum + i.estimatedCredits, 0);
}

/** A prop made from a text prompt: trees, rocks, furniture (DESIGN.md 10.1). */
export interface PropSpec {
  id: string;
  prompt: string;
  /** Target face count for smart topology (meshy-t2.5: 100 to 30,000). */
  polycount: number;
}

/** The two Meshy steps of a text-to-3D prop: a preview mesh, then its textured refinement. */
export function propItems(spec: PropSpec): BatchItem[] {
  return [
    {
      assetId: spec.id,
      step: 'text-to-3d-preview',
      params: {
        mode: 'preview',
        prompt: spec.prompt,
        model_type: 'smart-topology',
        ai_model: 'meshy-t2.5',
        target_polycount: spec.polycount,
        pose_mode: 'auto',
        target_formats: ['glb'],
      },
      estimatedCredits: CREDITS.textTo3dPreview.credits,
      estimateBasis: CREDITS.textTo3dPreview.basis,
    },
    {
      assetId: spec.id,
      step: 'text-to-3d-refine',
      params: {
        mode: 'refine',
        enable_pbr: false,
        texture_resolution: '2k',
        target_formats: ['glb'],
      },
      estimatedCredits: CREDITS.textTo3dRefine.credits,
      estimateBasis: CREDITS.textTo3dRefine.basis,
    },
  ];
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
