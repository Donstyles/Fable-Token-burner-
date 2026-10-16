/**
 * Skills (Phase 5 step 1). The 26 MM6 skills the slice uses, grouped as the MM6 skill screen
 * groups them: weapons, armour, the seven magic schools and the miscellaneous skills (MM6's
 * Diplomacy is left out). Three ranks, Normal, Expert and Master. Raising a skill from level n
 * to n + 1 costs n + 1 skill points, the MM6 rule. Expert and Master are taught by trainers once
 * the level is high enough, 4 and 7, for 1000 and 2000 gold: MM6's usual prices; some MM6
 * masters asked more or a quest, which content may add per teacher.
 */
export const WEAPON_SKILLS = ['staff', 'sword', 'dagger', 'axe', 'spear', 'bow', 'mace'] as const;
export const ARMOR_SKILLS = ['shield', 'leather', 'chain', 'plate'] as const;
export const MAGIC_SKILLS = ['fire', 'air', 'water', 'earth', 'spirit', 'mind', 'body'] as const;
export const MISC_SKILLS = [
  'bodybuilding',
  'meditation',
  'merchant',
  'perception',
  'repair',
  'identify',
  'disarm',
  'learning',
] as const;
export const SKILLS = [...WEAPON_SKILLS, ...ARMOR_SKILLS, ...MAGIC_SKILLS, ...MISC_SKILLS] as const;

export type WeaponSkill = (typeof WEAPON_SKILLS)[number];
export type ArmorSkill = (typeof ARMOR_SKILLS)[number];
export type MagicSchool = (typeof MAGIC_SKILLS)[number];
export type MiscSkill = (typeof MISC_SKILLS)[number];
export type SkillId = (typeof SKILLS)[number];
export type SkillGroup = 'weapon' | 'armor' | 'magic' | 'misc';

export const SKILL_NAMES: Record<SkillId, string> = {
  staff: 'Staff',
  sword: 'Sword',
  dagger: 'Dagger',
  axe: 'Axe',
  spear: 'Spear',
  bow: 'Bow',
  mace: 'Mace',
  shield: 'Shield',
  leather: 'Leather',
  chain: 'Chain',
  plate: 'Plate',
  fire: 'Fire Magic',
  air: 'Air Magic',
  water: 'Water Magic',
  earth: 'Earth Magic',
  spirit: 'Spirit Magic',
  mind: 'Mind Magic',
  body: 'Body Magic',
  bodybuilding: 'Bodybuilding',
  meditation: 'Meditation',
  merchant: 'Merchant',
  perception: 'Perception',
  repair: 'Repair Item',
  identify: 'Identify Item',
  disarm: 'Disarm Trap',
  learning: 'Learning',
};

export function isSkillId(value: unknown): value is SkillId {
  return typeof value === 'string' && (SKILLS as readonly string[]).includes(value);
}

export function isMagicSchool(value: unknown): value is MagicSchool {
  return typeof value === 'string' && (MAGIC_SKILLS as readonly string[]).includes(value);
}

export function skillGroup(id: SkillId): SkillGroup {
  if ((WEAPON_SKILLS as readonly string[]).includes(id)) return 'weapon';
  if ((ARMOR_SKILLS as readonly string[]).includes(id)) return 'armor';
  if ((MAGIC_SKILLS as readonly string[]).includes(id)) return 'magic';
  return 'misc';
}

export const RANKS = ['normal', 'expert', 'master'] as const;
export type SkillRank = (typeof RANKS)[number];

/** MM6 scales most skill effects by rank: Normal ×1, Expert ×2, Master ×3. */
export const RANK_MULTIPLIER: Record<SkillRank, number> = { normal: 1, expert: 2, master: 3 };

export function rankIndex(rank: SkillRank): number {
  return RANKS.indexOf(rank);
}

export function rankAtLeast(rank: SkillRank, wanted: SkillRank): boolean {
  return rankIndex(rank) >= rankIndex(wanted);
}

export interface SkillState {
  /** Skill level, 1 or more once learnt. */
  level: number;
  rank: SkillRank;
}

/** A character's skills; a missing entry means the skill is not learnt. */
export type SkillSet = Partial<Record<SkillId, SkillState>>;

export function skillLevel(set: SkillSet, id: SkillId): number {
  return set[id]?.level ?? 0;
}

export function skillRank(set: SkillSet, id: SkillId): SkillRank | null {
  return set[id]?.rank ?? null;
}

export function hasSkill(set: SkillSet, id: SkillId): boolean {
  return skillLevel(set, id) > 0;
}

/** Level × rank multiplier: the "skill bonus" MM6 applies to Bodybuilding, Merchant and others. */
export function skillBonus(set: SkillSet, id: SkillId): number {
  const s = set[id];
  return s ? s.level * RANK_MULTIPLIER[s.rank] : 0;
}

/** Skill points to raise a skill from `level` to `level + 1` (MM6: the new level). */
export function raiseCost(level: number): number {
  return level + 1;
}

export type RaiseResult =
  { ok: true; level: number; pointsLeft: number } | { ok: false; reason: 'not-learnt' | 'points' };

/** Spend skill points on one level of a learnt skill; mutates `set` and reports the points left. */
export function raiseSkill(set: SkillSet, id: SkillId, points: number): RaiseResult {
  const s = set[id];
  if (!s) return { ok: false, reason: 'not-learnt' };
  const cost = raiseCost(s.level);
  if (points < cost) return { ok: false, reason: 'points' };
  s.level += 1;
  return { ok: true, level: s.level, pointsLeft: points - cost };
}

/** Learn a new skill at level 1 (a teacher or a starting pick); false when already known. */
export function learnSkill(set: SkillSet, id: SkillId): boolean {
  if (set[id]) return false;
  set[id] = { level: 1, rank: 'normal' };
  return true;
}

export interface Promotion {
  minLevel: number;
  price: number;
}

/** Trainer requirements for the higher ranks (MM6's usual terms). */
export const PROMOTIONS: Record<Exclude<SkillRank, 'normal'>, Promotion> = {
  expert: { minLevel: 4, price: 1000 },
  master: { minLevel: 7, price: 2000 },
};

export type PromoteResult =
  | { ok: true; rank: SkillRank; price: number }
  | { ok: false; reason: 'not-learnt' | 'already' | 'level' | 'class' | 'gold' | 'order' };

/**
 * Check a promotion to `to` against the skill's level, the price, the class cap and the order of
 * ranks (Master needs Expert first); does not mutate.
 */
export function canPromote(
  set: SkillSet,
  id: SkillId,
  to: Exclude<SkillRank, 'normal'>,
  gold: number,
  classMax: SkillRank | undefined,
): PromoteResult {
  const s = set[id];
  if (!s) return { ok: false, reason: 'not-learnt' };
  if (rankAtLeast(s.rank, to)) return { ok: false, reason: 'already' };
  if (rankIndex(to) !== rankIndex(s.rank) + 1) return { ok: false, reason: 'order' };
  if (!classMax || !rankAtLeast(classMax, to)) return { ok: false, reason: 'class' };
  const p = PROMOTIONS[to];
  if (s.level < p.minLevel) return { ok: false, reason: 'level' };
  if (gold < p.price) return { ok: false, reason: 'gold' };
  return { ok: true, rank: to, price: p.price };
}

/** Apply a promotion `canPromote` allows; mutates `set`. The caller pays the price. */
export function promoteSkill(
  set: SkillSet,
  id: SkillId,
  to: Exclude<SkillRank, 'normal'>,
  gold: number,
  classMax: SkillRank | undefined,
): PromoteResult {
  const r = canPromote(set, id, to, gold, classMax);
  if (r.ok) set[id]!.rank = to;
  return r;
}
