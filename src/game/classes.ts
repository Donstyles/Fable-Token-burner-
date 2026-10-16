/**
 * The six MM6 classes (Phase 5 step 1). Hit and spell points follow the MM6 formula the
 * community documents: HP = base + (level + Endurance bonus) × factor, SP = base + (level +
 * magic stat bonus) × factor, where the magic stat is Intellect for Archers and Sorcerers,
 * Personality for Paladins and Clerics, and both bonuses summed for Druids; Knights have no
 * spell points. Base and factor values are the MM6 class table as community tables give it;
 * where the manual differs they change here and README.md records it. Skill caps and the
 * starting-skill lists approximate MM6's class restrictions (Knights learn no magic, casters
 * wear no plate, and so on); MM6 itself gates some Master ranks behind promotion quests, which
 * the slice does not have, so the caps here are the promoted ones.
 */
import type { MagicSchool, SkillId, SkillRank } from './skills';
import { MAGIC_SKILLS } from './skills';
import { type Stat, type Stats, stats } from './stats';

export const CLASSES = ['knight', 'paladin', 'archer', 'cleric', 'sorcerer', 'druid'] as const;
export type ClassId = (typeof CLASSES)[number];

export interface ClassDef {
  id: ClassId;
  name: string;
  hpBase: number;
  hpFactor: number;
  spBase: number;
  spFactor: number;
  /** The statistics whose bonuses feed spell points; empty for Knights. */
  spStats: readonly Stat[];
  /** Statistics before the creation pool is spent. */
  baseStats: Stats;
  /** Skills every member of the class starts with. */
  fixedSkills: readonly [SkillId, SkillId];
  /** Skills a new member picks two of. */
  optionalSkills: readonly SkillId[];
  /** Highest rank the class may reach per skill; a missing skill cannot be learnt. */
  skills: Partial<Record<SkillId, SkillRank>>;
}

const M = 'master';
const E = 'expert';

const MISC_ALL: Partial<Record<SkillId, SkillRank>> = {
  bodybuilding: M,
  merchant: M,
  perception: M,
  repair: M,
  identify: M,
  disarm: M,
  learning: M,
};

export const CLASS_DEFS: Record<ClassId, ClassDef> = {
  knight: {
    id: 'knight',
    name: 'Knight',
    hpBase: 30,
    hpFactor: 5,
    spBase: 0,
    spFactor: 0,
    spStats: [],
    baseStats: stats({
      might: 17,
      intellect: 7,
      personality: 9,
      endurance: 15,
      accuracy: 13,
      speed: 11,
      luck: 7,
    }),
    fixedSkills: ['sword', 'leather'],
    optionalSkills: [
      'axe',
      'spear',
      'bow',
      'mace',
      'dagger',
      'shield',
      'chain',
      'bodybuilding',
      'merchant',
      'perception',
      'repair',
      'disarm',
      'learning',
    ],
    skills: {
      staff: M,
      sword: M,
      dagger: M,
      axe: M,
      spear: M,
      bow: M,
      mace: M,
      shield: M,
      leather: M,
      chain: M,
      plate: M,
      ...MISC_ALL,
    },
  },
  paladin: {
    id: 'paladin',
    name: 'Paladin',
    hpBase: 25,
    hpFactor: 4,
    spBase: 5,
    spFactor: 1,
    spStats: ['personality'],
    baseStats: stats({
      might: 15,
      intellect: 7,
      personality: 13,
      endurance: 15,
      accuracy: 11,
      speed: 11,
      luck: 7,
    }),
    fixedSkills: ['mace', 'spirit'],
    optionalSkills: [
      'sword',
      'axe',
      'spear',
      'shield',
      'leather',
      'chain',
      'mind',
      'body',
      'bodybuilding',
      'merchant',
      'perception',
      'repair',
      'learning',
    ],
    skills: {
      sword: M,
      dagger: E,
      axe: M,
      spear: M,
      bow: E,
      mace: M,
      shield: M,
      leather: M,
      chain: M,
      plate: M,
      spirit: M,
      mind: M,
      body: M,
      ...MISC_ALL,
      meditation: E,
      identify: E,
      disarm: E,
    },
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    hpBase: 20,
    hpFactor: 3,
    spBase: 5,
    spFactor: 1,
    spStats: ['intellect'],
    baseStats: stats({
      might: 13,
      intellect: 13,
      personality: 7,
      endurance: 11,
      accuracy: 15,
      speed: 13,
      luck: 7,
    }),
    fixedSkills: ['bow', 'leather'],
    optionalSkills: [
      'sword',
      'dagger',
      'axe',
      'spear',
      'chain',
      'fire',
      'air',
      'water',
      'earth',
      'merchant',
      'perception',
      'identify',
      'disarm',
      'learning',
    ],
    skills: {
      sword: M,
      dagger: M,
      axe: M,
      spear: M,
      bow: M,
      mace: E,
      leather: M,
      chain: M,
      fire: M,
      air: M,
      water: M,
      earth: M,
      ...MISC_ALL,
      bodybuilding: E,
      meditation: E,
      repair: E,
    },
  },
  cleric: {
    id: 'cleric',
    name: 'Cleric',
    hpBase: 20,
    hpFactor: 3,
    spBase: 10,
    spFactor: 2,
    spStats: ['personality'],
    baseStats: stats({
      might: 11,
      intellect: 9,
      personality: 17,
      endurance: 13,
      accuracy: 9,
      speed: 11,
      luck: 9,
    }),
    fixedSkills: ['mace', 'body'],
    optionalSkills: [
      'staff',
      'dagger',
      'shield',
      'leather',
      'chain',
      'spirit',
      'mind',
      'meditation',
      'bodybuilding',
      'merchant',
      'identify',
      'repair',
      'learning',
    ],
    skills: {
      staff: M,
      dagger: E,
      mace: M,
      shield: M,
      leather: M,
      chain: M,
      spirit: M,
      mind: M,
      body: M,
      meditation: M,
      ...MISC_ALL,
      bodybuilding: E,
      perception: E,
      repair: E,
      disarm: E,
    },
  },
  sorcerer: {
    id: 'sorcerer',
    name: 'Sorcerer',
    hpBase: 15,
    hpFactor: 2,
    spBase: 10,
    spFactor: 3,
    spStats: ['intellect'],
    baseStats: stats({
      might: 7,
      intellect: 17,
      personality: 9,
      endurance: 9,
      accuracy: 13,
      speed: 13,
      luck: 11,
    }),
    fixedSkills: ['dagger', 'fire'],
    optionalSkills: [
      'staff',
      'bow',
      'leather',
      'air',
      'water',
      'earth',
      'meditation',
      'merchant',
      'perception',
      'identify',
      'disarm',
      'learning',
    ],
    skills: {
      staff: M,
      dagger: M,
      bow: E,
      leather: M,
      fire: M,
      air: M,
      water: M,
      earth: M,
      meditation: M,
      ...MISC_ALL,
      bodybuilding: E,
      merchant: E,
      repair: E,
    },
  },
  druid: {
    id: 'druid',
    name: 'Druid',
    hpBase: 15,
    hpFactor: 2,
    spBase: 10,
    spFactor: 3,
    spStats: ['intellect', 'personality'],
    baseStats: stats({
      might: 9,
      intellect: 15,
      personality: 15,
      endurance: 11,
      accuracy: 9,
      speed: 11,
      luck: 9,
    }),
    fixedSkills: ['staff', 'earth'],
    optionalSkills: [
      'dagger',
      'mace',
      'leather',
      'shield',
      'fire',
      'air',
      'water',
      'spirit',
      'mind',
      'body',
      'meditation',
      'merchant',
      'perception',
      'identify',
      'learning',
    ],
    skills: {
      staff: M,
      dagger: M,
      mace: E,
      shield: E,
      leather: M,
      fire: M,
      air: M,
      water: M,
      earth: M,
      spirit: M,
      mind: M,
      body: M,
      meditation: M,
      ...MISC_ALL,
      bodybuilding: E,
      repair: E,
      disarm: E,
    },
  },
};

export function classDef(id: ClassId): ClassDef {
  return CLASS_DEFS[id];
}

export function isClassId(value: unknown): value is ClassId {
  return typeof value === 'string' && (CLASSES as readonly string[]).includes(value);
}

export function canLearn(cls: ClassDef, skill: SkillId): boolean {
  return cls.skills[skill] !== undefined;
}

export function maxRank(cls: ClassDef, skill: SkillId): SkillRank | undefined {
  return cls.skills[skill];
}

/** The magic schools a class can ever learn. */
export function classSchools(cls: ClassDef): MagicSchool[] {
  return MAGIC_SKILLS.filter((s) => canLearn(cls, s));
}

/** Hit points from class, level and the Endurance bonus alone (before Bodybuilding and items). */
export function baseHp(cls: ClassDef, level: number, enduranceBonus: number): number {
  return cls.hpBase + (level + enduranceBonus) * cls.hpFactor;
}

/** Spell points from class, level and the summed magic stat bonuses (before Meditation). */
export function baseSp(cls: ClassDef, level: number, statBonuses: number): number {
  if (cls.spFactor === 0) return 0;
  return cls.spBase + (level + statBonuses) * cls.spFactor;
}

/** What one level adds, for the level-up screen. */
export function levelGains(cls: ClassDef): { hp: number; sp: number } {
  return { hp: cls.hpFactor, sp: cls.spFactor };
}
