/**
 * The character sheet (Phase 5 steps 1 and 2) and the numbers derived from it. A `Character`
 * is plain JSON-safe data: identity, class, level, statistics, skills, hit and spell points,
 * conditions, known spells, inventory grid and equipment. The derived values follow MM6 as
 * DESIGN 14 records: hit points = class base + (level + Endurance bonus) × class factor +
 * Bodybuilding bonus; spell points likewise from the class's magic statistic(s) and Meditation;
 * attack bonus = Accuracy bonus + weapon skill (Master doubles the skill); melee damage adds the
 * Might bonus; armour class = Speed bonus + equipment. Recovery is the weapon's seconds plus the
 * armour penalty, less 0.05 s per point of Speed bonus and per skill point from Expert rank,
 * never under half a second. Death: unconscious at or below 0 hit points, dead at or below
 * minus half the maximum (ours; MM6's exact threshold is undocumented).
 */
import { baseHp, baseSp, classDef, type ClassId } from './classes';
import {
  afflict,
  canAct,
  type ConditionSet,
  cure,
  damageConditions,
  effectiveStats,
  hasCondition,
  isAlive,
} from './conditions';
import {
  type Equipment,
  equipmentArmor,
  equipmentRecoveryPenalty,
  type InventoryGrid,
  meleeWeapon,
  rangedWeapon,
} from './inventory';
import type { Dice } from './rng';
import { skillBonus, skillLevel, skillRank, type SkillSet } from './skills';
import type { SpellId } from './spells';
import { statBonus, type Stats } from './stats';

export type Sex = 'male' | 'female';

export interface Character {
  name: string;
  sex: Sex;
  /** Portrait id under the Phase 4 portrait pipeline. */
  portrait: string;
  classId: ClassId;
  level: number;
  xp: number;
  age: number;
  stats: Stats;
  skills: SkillSet;
  skillPoints: number;
  hp: number;
  sp: number;
  conditions: ConditionSet;
  spells: SpellId[];
  grid: InventoryGrid;
  equipment: Equipment;
}

export function isCharacter(value: unknown): value is Character {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['classId'] === 'string' && typeof v['level'] === 'number' && 'skills' in v;
}

/** Statistics after the character's conditions. */
export function currentStats(c: Character): Stats {
  return effectiveStats(c.stats, c.conditions);
}

export function maxHp(c: Character): number {
  const cls = classDef(c.classId);
  const endurance = statBonus(currentStats(c).endurance);
  return Math.max(1, baseHp(cls, c.level, endurance) + skillBonus(c.skills, 'bodybuilding'));
}

export function maxSp(c: Character): number {
  const cls = classDef(c.classId);
  if (cls.spFactor === 0) return 0;
  const stats = currentStats(c);
  const bonuses = cls.spStats.reduce((sum, s) => sum + statBonus(stats[s]), 0);
  return Math.max(0, baseSp(cls, c.level, bonuses) + skillBonus(c.skills, 'meditation'));
}

/** Weapon skill contribution to hit: the level, doubled at Master. */
function weaponSkillToHit(c: Character, ranged: boolean): number {
  const weapon = ranged ? rangedWeapon(c.equipment) : meleeWeapon(c.equipment);
  const skill = weapon?.def?.skill;
  if (!skill) return 0;
  const level = skillLevel(c.skills, skill);
  return skillRank(c.skills, skill) === 'master' ? 2 * level : level;
}

export function attackBonus(c: Character, ranged = false): number {
  return statBonus(currentStats(c).accuracy) + weaponSkillToHit(c, ranged);
}

/** Damage dice in hand; melee adds the Might bonus. */
export function damageDice(c: Character, ranged = false): Dice | null {
  if (ranged) {
    const bow = rangedWeapon(c.equipment);
    return bow ? bow.damage : null;
  }
  const weapon = meleeWeapon(c.equipment);
  const bonus = (weapon.damage.bonus ?? 0) + statBonus(currentStats(c).might);
  return { count: weapon.damage.count, sides: weapon.damage.sides, bonus };
}

export function armorClass(c: Character): number {
  return Math.max(0, statBonus(currentStats(c).speed) + equipmentArmor(c.equipment, c.skills));
}

export function recoverySec(c: Character, ranged = false): number {
  const weapon = ranged ? rangedWeapon(c.equipment) : meleeWeapon(c.equipment);
  if (!weapon) return Infinity;
  let t = weapon.recoverySec + equipmentRecoveryPenalty(c.equipment, c.skills);
  t -= 0.05 * statBonus(currentStats(c).speed);
  const skill = weapon.def?.skill;
  if (skill && skillRank(c.skills, skill) !== 'normal') t -= 0.05 * skillLevel(c.skills, skill);
  return Math.max(0.5, t);
}

/** Alive as a body: not dead, stoned or eradicated. */
export function isLiving(c: Character): boolean {
  return isAlive(c.conditions);
}

/** Up and able to be targeted and to be selected: living with hit points above zero. */
export function isConscious(c: Character): boolean {
  return isLiving(c) && c.hp > 0 && !hasCondition(c.conditions, 'unconscious');
}

/** Can the character attack, cast or use an item right now? */
export function canActNow(c: Character): boolean {
  return isConscious(c) && canAct(c.conditions);
}

/** Hit points at or below which a character dies. */
export function deathThreshold(c: Character): number {
  return -Math.ceil(maxHp(c) / 2);
}

export interface DamageOutcome {
  hp: number;
  fell: boolean;
  died: boolean;
}

/** Apply damage at game minute `now`; wakes a sleeper, fells at zero, kills past the threshold. */
export function damageCharacter(c: Character, amount: number, now: number): DamageOutcome {
  if (!isLiving(c)) return { hp: c.hp, fell: false, died: false };
  const before = c.hp;
  c.hp -= Math.max(0, Math.floor(amount));
  damageConditions(c.conditions);
  let fell = false;
  let died = false;
  if (c.hp <= deathThreshold(c)) {
    cure(c.conditions, 'unconscious');
    afflict(c.conditions, 'dead', now);
    died = true;
  } else if (c.hp <= 0 && before > 0) {
    afflict(c.conditions, 'unconscious', now);
    fell = true;
  } else if (c.hp <= 0) {
    afflict(c.conditions, 'unconscious', now);
  }
  return { hp: c.hp, fell, died };
}

/** Heal up to the maximum; a character brought above zero wakes. Returns the points healed. */
export function healCharacter(c: Character, amount: number): number {
  if (!isLiving(c)) return 0;
  const max = maxHp(c);
  const target = Math.min(max, c.hp + Math.max(0, Math.floor(amount)));
  const healed = target - c.hp;
  c.hp = target;
  if (c.hp > 0) cure(c.conditions, 'unconscious');
  return healed;
}

export function restoreSp(c: Character, amount = Infinity): number {
  const max = maxSp(c);
  const target = Math.min(max, c.sp + Math.max(0, amount));
  const restored = target - c.sp;
  c.sp = target;
  return restored;
}

/** Clamp hit and spell points to the current maxima after stats or level change. */
export function clampToMax(c: Character): void {
  c.hp = Math.min(c.hp, maxHp(c));
  c.sp = Math.min(c.sp, maxSp(c));
}
