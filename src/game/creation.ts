/**
 * Character creation (Phase 5 step 2). As in MM6 a new character takes a name, sex, portrait
 * and class; the class gives base statistics and the player spends a pool of bonus points on
 * them, one point per step, and may lower a statistic to win points back; two skills are fixed
 * by class and the player picks two more from the class list. Pool size and the range around
 * the base (−5 to +15) are ours in place of MM6's exact creation table. All bonus points must
 * be spent. Starting age is 20, level 1, no skill points, full hit and spell points, and every
 * starting magic skill brings its school's first spell. Errors are values, never exceptions.
 */
import { maxHp, maxSp, type Character, type Sex } from './character';
import { canLearn, classDef, type ClassId } from './classes';
import { createEquipment, createGrid } from './inventory';
import { skillGroup, type MagicSchool, type SkillId, type SkillSet } from './skills';
import { firstSpellOf, type SpellId } from './spells';
import { STATS, type Stat, type Stats } from './stats';

export const CREATION_POOL = 50;
export const STAT_BELOW_BASE = 5;
export const STAT_ABOVE_BASE = 15;
export const NAME_MAX_LENGTH = 15;
export const STARTING_AGE = 20;
export const SKILL_PICKS = 2;

export interface CreationInput {
  name: string;
  sex: Sex;
  portrait: string;
  classId: ClassId;
  stats: Stats;
  skillPicks: readonly SkillId[];
}

export type CreationError =
  | { kind: 'name-empty' }
  | { kind: 'name-too-long'; max: number }
  | { kind: 'portrait-empty' }
  | { kind: 'stat-out-of-range'; stat: Stat; min: number; max: number; value: number }
  | { kind: 'pool-overspent'; spent: number; pool: number }
  | { kind: 'pool-unspent'; remaining: number }
  | { kind: 'skill-count'; expected: number; got: number }
  | { kind: 'skill-not-allowed'; skill: SkillId }
  | { kind: 'skill-fixed'; skill: SkillId }
  | { kind: 'skill-duplicate'; skill: SkillId };

export type CreationResult =
  { ok: true; character: Character } | { ok: false; errors: CreationError[] };

/** A class's defaults: base statistics, no picks, the pool untouched. */
export function defaultCreation(classId: ClassId): CreationInput {
  return {
    name: '',
    sex: 'male',
    portrait: '',
    classId,
    stats: { ...classDef(classId).baseStats },
    skillPicks: [],
  };
}

export function statRange(classId: ClassId, stat: Stat): { min: number; max: number } {
  const base = classDef(classId).baseStats[stat];
  return { min: base - STAT_BELOW_BASE, max: base + STAT_ABOVE_BASE };
}

/** Bonus points spent so far; negative when statistics were lowered on balance. */
export function pointsSpent(classId: ClassId, stats: Stats): number {
  const base = classDef(classId).baseStats;
  return STATS.reduce((sum, s) => sum + (stats[s] - base[s]), 0);
}

export function pointsLeft(classId: ClassId, stats: Stats): number {
  return CREATION_POOL - pointsSpent(classId, stats);
}

export function validateCreation(input: CreationInput): CreationError[] {
  const errors: CreationError[] = [];
  const cls = classDef(input.classId);
  const name = input.name.trim();
  if (name.length === 0) errors.push({ kind: 'name-empty' });
  else if (name.length > NAME_MAX_LENGTH) {
    errors.push({ kind: 'name-too-long', max: NAME_MAX_LENGTH });
  }
  if (input.portrait.length === 0) errors.push({ kind: 'portrait-empty' });
  for (const stat of STATS) {
    const { min, max } = statRange(input.classId, stat);
    const value = input.stats[stat];
    if (!Number.isInteger(value) || value < min || value > max) {
      errors.push({ kind: 'stat-out-of-range', stat, min, max, value });
    }
  }
  const spent = pointsSpent(input.classId, input.stats);
  if (spent > CREATION_POOL) errors.push({ kind: 'pool-overspent', spent, pool: CREATION_POOL });
  else if (spent < CREATION_POOL) {
    errors.push({ kind: 'pool-unspent', remaining: CREATION_POOL - spent });
  }
  if (input.skillPicks.length !== SKILL_PICKS) {
    errors.push({ kind: 'skill-count', expected: SKILL_PICKS, got: input.skillPicks.length });
  }
  const seen = new Set<SkillId>();
  for (const skill of input.skillPicks) {
    if (seen.has(skill)) errors.push({ kind: 'skill-duplicate', skill });
    seen.add(skill);
    if (cls.fixedSkills.includes(skill)) errors.push({ kind: 'skill-fixed', skill });
    else if (!cls.optionalSkills.includes(skill) || !canLearn(cls, skill)) {
      errors.push({ kind: 'skill-not-allowed', skill });
    }
  }
  return errors;
}

/** Spells a new character knows: the first spell of each magic skill learnt. */
export function startingSpells(skills: SkillSet): SpellId[] {
  const spells: SpellId[] = [];
  for (const id of Object.keys(skills) as SkillId[]) {
    if (skillGroup(id) !== 'magic') continue;
    const first = firstSpellOf(id as MagicSchool);
    if (first) spells.push(first.id);
  }
  return spells;
}

export function createCharacter(input: CreationInput): CreationResult {
  const errors = validateCreation(input);
  if (errors.length) return { ok: false, errors };
  const cls = classDef(input.classId);
  const skills: SkillSet = {};
  for (const id of [...cls.fixedSkills, ...input.skillPicks]) {
    skills[id] = { level: 1, rank: 'normal' };
  }
  const character: Character = {
    name: input.name.trim(),
    sex: input.sex,
    portrait: input.portrait,
    classId: input.classId,
    level: 1,
    xp: 0,
    age: STARTING_AGE,
    stats: { ...input.stats },
    skills,
    skillPoints: 0,
    hp: 0,
    sp: 0,
    conditions: {},
    spells: startingSpells(skills),
    grid: createGrid(),
    equipment: createEquipment(),
  };
  character.hp = maxHp(character);
  character.sp = maxSp(character);
  return { ok: true, character };
}
