/**
 * Humanoid clip sets (DESIGN.md 10.1), shared by the asset tools (which request them from
 * Meshy and name them in the GLB) and the runtime (which plays them by name).
 */

/** Combat set: enemies and guards. Names fixed project-wide. */
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

/** Clips that play once and hold their last frame. */
export const ONE_SHOT_CLIPS: ReadonlySet<string> = new Set(['death']);
