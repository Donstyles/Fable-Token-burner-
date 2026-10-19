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
} as const;

/**
 * The steps a batch may hold. There is no text-to-3D step and never will be (owner,
 * 2026-10-17 and 2026-10-19: "Never ever do text to 3d. No exceptions"); batches 003 and 004
 * hold such records from before the rule, as history only, and nothing runs them.
 */
export type BatchStep = 'image-to-3d' | 'rig' | 'animate' | 'text-to-image';

/** Refuse a batch that holds anything but the allowed steps (an old text-to-3D batch). */
export function assertImageFirst(batch: Pick<Batch, 'number' | 'items'>): void {
  const allowed: readonly string[] = ['image-to-3d', 'rig', 'animate', 'text-to-image'];
  const bad = batch.items.find((i) => !allowed.includes(i.step));
  if (bad) {
    throw new Error(
      `batch ${batch.number}: ${bad.assetId} has a ${bad.step} step; text-to-3D is never used (owner, no exceptions)`,
    );
  }
}

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
  /** The purpose-scoped grant (pipeline/budget.json `grants`) this batch spends, if any. */
  grant?: string;
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

/**
 * A spell icon (owner, 2026-10-17): one text-to-image picture, background removed, then
 * cropped, fitted and palettised for the spellbook (tools/lib/icon.ts). No 3D steps.
 */
export interface IconSpec {
  id: string;
  /** What the icon shows; the look is added from ICON_STYLE. */
  subject: string;
  /** Text-to-image model; the cheapest unless the batch says otherwise. */
  model?: keyof typeof CREDITS.textToImage;
  /** The style text appended to the subject; ICON_STYLE unless a pass tries another. */
  style?: string;
  /** The picture's shape: MM6's oval is about 4:3; a bolt across the page is wider. */
  aspect?: '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
  /**
   * Meshy's background removal (icon critic, pass 1: it strips halos and translucent magic).
   * Off by default: the picture stands on a plain parchment ground that tools/lib/icon.ts
   * keys out by colour, keeping the glow.
   */
  removeBackground?: boolean;
  /**
   * The post-process's exposure (tools/lib/icon.ts): 'map' tones the picture onto the
   * parchment; 'keep' leaves a pure light effect (a bolt, sparks) as it came.
   */
  expose?: 'map' | 'keep';
}

/**
 * The look of MM6's spell icons (pipeline/style.md "Spell icons"; icon critics, passes 1 to
 * 5, from the 99 reference icons): small 1998 pre-rendered models with coarse textures;
 * people and things mostly mid-tones a little darker than the ground with warm shadows,
 * magic on its own pale, a little lighter than the ground; the colours only those the
 * description names; slim adults; only the magic glows, as light with an uneven glow;
 * nothing the description does not name; spread wide on a mid-tone parchment ground with no
 * floor or shadow, so the matte keeps the glow (tools/lib/icon.ts).
 */
export const ICON_STYLE =
  "A tiny spell icon from a 1998 fantasy PC role-playing game's spellbook: a small " +
  'pre-rendered 3D Studio picture, low-polygon models with coarse, slightly grainy ' +
  'textures and smooth shading, the magic painted over them as glowing 2D light. Soft, ' +
  'even light from the front and above. People and things are mostly mid-tones, as a ' +
  'whole a little darker than the background, their shadows warm mid-browns or the deep ' +
  'colour of the magic, never black, with only small highlights near white. Magic on its ' +
  'own, with no person or thing, is pale: as a whole a little lighter than the ' +
  'background, its darkest parts no darker than a mid-tone. Muted, slightly faded ' +
  'colours, exactly those the description names; everything is lit by the magic and takes ' +
  'on its colour. Slim adults with realistic proportions, small heads and simple faces. ' +
  'Magic is light: a white-hot core, pale tints of its colour around it, a little deeper ' +
  'colour at its edges and tips, and an uneven glow, brightest where it touches the magic ' +
  'and fading slowly into the background, never a flat disc. Only the magic glows: ' +
  'people, their clothes and weapons have no glow, halo or rim light of their own. Show ' +
  'only what the description names: no extra people, casters, hands or wands. One ' +
  'subject, centred and spread wide, wider than it is tall wherever its shape allows, ' +
  'filling the whole width of the picture and most of its height, on a plain, flat, ' +
  'evenly lit, mid-tone greyish-beige background like old parchment in shade (about ' +
  '#B8AC96), with no ground, floor, base or cast shadow. No text, no border, no frame, no ' +
  'black outlines, no cartoon or chibi proportions, not photorealistic, not modern.';

export function iconItems(spec: IconSpec): BatchItem[] {
  const model = spec.model ?? 'nano-banana-2-lite';
  return [
    {
      assetId: spec.id,
      step: 'text-to-image',
      params: {
        prompt: `${spec.subject.trim()} ${spec.style ?? ICON_STYLE}`,
        subject: spec.subject.trim(),
        ai_model: model,
        aspect_ratio: spec.aspect ?? '4:3',
        remove_background: spec.removeBackground ?? false,
        // Ours, not Meshy's: the post-process reads it (textToImageFlags passes only its own).
        ...(spec.expose ? { expose: spec.expose } : {}),
      },
      estimatedCredits: CREDITS.textToImage[model],
      estimateBasis: `documented (DESIGN.md 10.0), ${model}`,
    },
  ];
}

/** True for a batch's image-only assets (icons): every item of the asset is a text-to-image step. */
export function imageOnlyAssetIds(batch: Batch): string[] {
  const ids = [...new Set(batch.items.map((i) => i.assetId))];
  return ids.filter((id) =>
    batch.items.every((i) => i.assetId !== id || i.step === 'text-to-image'),
  );
}

export function totalCredits(items: readonly BatchItem[]): number {
  return items.reduce((sum, i) => sum + i.estimatedCredits, 0);
}

/**
 * A prop (a tree, a rock, a building): a concept picture first, seen by the owner, then
 * image-to-3D (owner, 2026-10-17 and 2026-10-19: never text-to-3D, no exceptions).
 */
export interface PropSpec {
  id: string;
  /** What the concept picture shows; the framing and look are added here. */
  prompt: string;
  /** Target face count for smart topology (meshy-t2.5: 100 to 30,000). */
  polycount: number;
}

export const PROP_CONCEPT_STYLE =
  'Seen from the side at eye height, the whole of it in the frame from the ground to the ' +
  'top, alone, centred, plain flat fuchsia (#FF00FF) background, no ground, no shadow, ' +
  'nothing else in the frame. The look of a late-1990s first-person RPG: simple solid ' +
  'readable shapes, painted textures, flat even lighting, muted natural colours.';

/** The two Meshy steps of a prop: the concept picture, then image-to-3D from it. */
export function propItems(spec: PropSpec): BatchItem[] {
  const input = `${spec.id}.png`;
  return [
    {
      assetId: spec.id,
      step: 'text-to-image',
      input,
      params: {
        prompt: `${spec.prompt} ${PROP_CONCEPT_STYLE}`,
        ai_model: 'nano-banana-2-lite',
        aspect_ratio: '1:1',
        remove_background: true,
      },
      estimatedCredits: CREDITS.textToImage['nano-banana-2-lite'],
      estimateBasis: 'documented (DESIGN.md 10.0); the cheapest image model',
    },
    {
      assetId: spec.id,
      step: 'image-to-3d',
      input,
      params: {
        model_type: 'smart-topology',
        ai_model: 'meshy-t2.5',
        target_polycount: spec.polycount,
        should_texture: true,
        texture_resolution: '2k',
        enable_pbr: false,
        origin_at: 'bottom',
        target_formats: ['glb'],
      },
      estimatedCredits: CREDITS.imageTo3d.credits,
      estimateBasis: CREDITS.imageTo3d.basis,
    },
  ];
}

export function makeBatch(
  number: number,
  name: string,
  items: BatchItem[],
  created = new Date(),
): Batch {
  assertImageFirst({ number, items });
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
