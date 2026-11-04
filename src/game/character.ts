/**
 * The character sheet (Phase 5 steps 1 and 2) and the numbers derived from it. A `Character`
 * is plain JSON-safe data: identity, class, level, statistics, skills, hit and spell points,
 * conditions, known spells, inventory grid and equipment. The derived values follow MM6 as
 * DESIGN 14 records: hit points = class base + (level + Endurance bonus) × class factor +
 * Bodybuilding skill × rank multiplier × class factor; spell points likewise from the class's
 * magic statistic(s) and Meditation (MM6-GAPS.md 4, RPGC);
 * attack bonus = Accuracy bonus + weapon skill at every rank (+ Bless); melee damage adds the Might bonus
 * and the skill of a Mace from Expert or an Axe or Spear at Master; armour class = Speed bonus +
 * equipment + the skill of a Staff or Spear from Expert (MM6-GAPS.md 4, RPGC). Not built: Master
 * Staff and Mace stun, Master Dagger triple damage, Master Bow's two arrows, a weapon in the left
 * hand (Expert Dagger, Master Sword). Recovery is MM6's sum in its units: the
 * weapon type's base plus worn armour, less the Speed effect and, from Expert in Sword, Axe or
 * Bow, the skill, and 25 under Haste; at least 30 for melee, 0 for bows; Heroism adds to
 * damage and Stone Skin to armour class (the buff store, DESIGN.md 17.17); a struck member recovers 20 − Endurance
 * effect (MM6-GAPS.md 8, GF-M). `recoverySec` converts at 60 units a second (ours, DESIGN 14.2).
 * Death as MM6 (MM6-GAPS.md 11, MMW): unconscious below 0 hit points, dead below minus the
 * Endurance score. A monster's special attack is saved against here (docs/gaps/monsters.md 2.6,
 * GF-M): it lands with chance 30 / (30 + Luck effect + X), X the effect of the statistic MM6
 * names for the kind; poison and magic resistance stand at 0 until the sheet carries them
 * (characters.md 11).
 */
import { baseHp, baseSp, classDef, type ClassId } from './classes';
import {
  buffPower,
  expireBuffs,
  hasBuff,
  HASTE_RECOVERY,
  type MemberBuffId,
  type MemberBuffs,
  TEMP_STAT,
} from './buffs';
import { specialLandChance } from './combat';
import { BONUS_STAT, type StandardBonus } from './enchant';
import {
  afflict,
  type Affliction,
  canAct,
  type ConditionSet,
  cure,
  damageConditions,
  damageFactor,
  effectiveStats,
  hasCondition,
  isAlive,
} from './conditions';
import type { MonsterSpecial, SpecialKind } from './monsters';
import {
  type Equipment,
  equipmentArmor,
  equipmentRecoveryPenalty,
  equippedItems,
  type InventoryGrid,
  meleeWeapon,
  rangedWeapon,
} from './inventory';
import type { Dice, Rng } from './rng';
import {
  rankAtLeast,
  skillBonus,
  type SkillId,
  skillLevel,
  skillRank,
  type SkillRank,
  type SkillSet,
} from './skills';
import type { SpellId } from './spells';
import { type Stat, statBonus, type Stats } from './stats';

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
  /** Timed spells on the member (DESIGN.md 17.17). */
  buffs: MemberBuffs;
  spells: SpellId[];
  grid: InventoryGrid;
  equipment: Equipment;
}

export function isCharacter(value: unknown): value is Character {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['classId'] === 'string' && typeof v['level'] === 'number' && 'skills' in v;
}

/**
 * Statistics with the temporary ones Meditation and its kin give, then after the character's
 * conditions (the MM7 engine adds the buff before the condition's share; MM6 unverified).
 */
export function currentStats(c: Character): Stats {
  const raised = { ...c.stats };
  for (const [id, stat] of Object.entries(TEMP_STAT) as [MemberBuffId, Stat][]) {
    raised[stat] += buffPower(c.buffs, id);
  }
  // Worn enchantments, "of Might" and its kin (DESIGN.md 17.18).
  for (const [bonus, stat] of Object.entries(BONUS_STAT) as [StandardBonus, Stat][]) {
    raised[stat] += wornBonus(c, bonus);
  }
  return effectiveStats(raised, c.conditions);
}

/** The sum of a standard bonus over the member's worn items (items.md 3.1). */
export function wornBonus(c: Character, kind: StandardBonus): number {
  let total = 0;
  for (const item of equippedItems(c.equipment)) {
    if (item.bonus?.kind === kind) total += item.bonus.power;
  }
  return total;
}

/** Drop the member's buffs whose end has come; Haste leaves Weak behind (magic.md F5). */
export function expireCharacterBuffs(c: Character, now: number): MemberBuffId[] {
  const ended = expireBuffs(c.buffs, now);
  if (ended.includes('haste') && isLiving(c)) afflict(c.conditions, 'weak', now);
  return ended;
}

/** Body Building adds skill × the class's hit points a level, ×2 Expert, ×3 Master (RPGC). */
export function bodyBuildingHp(c: Character): number {
  return skillBonus(c.skills, 'bodybuilding') * classDef(c.classId).hpFactor;
}

/** Meditation adds skill × the class's spell points a level, ×2 Expert, ×3 Master (RPGC). */
export function meditationSp(c: Character): number {
  return skillBonus(c.skills, 'meditation') * classDef(c.classId).spFactor;
}

export function maxHp(c: Character): number {
  const cls = classDef(c.classId);
  const endurance = statBonus(currentStats(c).endurance);
  return Math.max(1, baseHp(cls, c.level, endurance) + bodyBuildingHp(c) + wornBonus(c, 'hp'));
}

export function maxSp(c: Character): number {
  const cls = classDef(c.classId);
  if (cls.spFactor === 0) return 0;
  const stats = currentStats(c);
  const bonuses = cls.spStats.reduce((sum, s) => sum + statBonus(stats[s]), 0);
  return Math.max(0, baseSp(cls, c.level, bonuses) + meditationSp(c) + wornBonus(c, 'sp'));
}

/** Weapon skill contribution to hit: the level, at every rank (MM6-GAPS.md 4, RPGC). */
function weaponSkillToHit(c: Character, ranged: boolean): number {
  const weapon = ranged ? rangedWeapon(c.equipment) : meleeWeapon(c.equipment);
  const skill = weapon?.def?.skill;
  return skill ? skillLevel(c.skills, skill) : 0;
}

/** The rank from which the melee weapon's skill adds to damage (MM6-GAPS.md 4, RPGC). */
const SKILL_TO_DAMAGE: Partial<Record<SkillId, SkillRank>> = {
  mace: 'expert',
  axe: 'master',
  spear: 'master',
};

/** The rank from which the melee weapon's skill adds to armour class (MM6-GAPS.md 4, RPGC). */
const SKILL_TO_ARMOR: Partial<Record<SkillId, SkillRank>> = { staff: 'expert', spear: 'expert' };

/** The melee weapon's skill level when its rank has reached the table's rank, else 0. */
function meleeSkillFrom(c: Character, table: Partial<Record<SkillId, SkillRank>>): number {
  const skill = meleeWeapon(c.equipment).def?.skill;
  const from = skill ? table[skill] : undefined;
  const rank = skill ? skillRank(c.skills, skill) : null;
  return skill && from && rank && rankAtLeast(rank, from) ? skillLevel(c.skills, skill) : 0;
}

/** Attack (or Shoot) bonus: Accuracy, the weapon skill, and Bless (melee and missile). */
export function attackBonus(c: Character, ranged = false): number {
  return (
    statBonus(currentStats(c).accuracy) + weaponSkillToHit(c, ranged) + buffPower(c.buffs, 'bless')
  );
}

/** The member's damage as a fraction of the roll: a half when Weak (MW6; OE). */
export function damageScale(c: Character): number {
  return damageFactor(c.conditions);
}

/** Damage dice in hand; melee adds the Might bonus and the weapon skill where its rank does. */
export function damageDice(c: Character, ranged = false): Dice | null {
  // Heroism adds to every hit, a blow's or a shot's (magic.md S7).
  const heroism = buffPower(c.buffs, 'heroism');
  if (ranged) {
    const bow = rangedWeapon(c.equipment);
    if (!bow) return null;
    return heroism ? { ...bow.damage, bonus: (bow.damage.bonus ?? 0) + heroism } : bow.damage;
  }
  const weapon = meleeWeapon(c.equipment);
  const bonus =
    (weapon.damage.bonus ?? 0) +
    statBonus(currentStats(c).might) +
    meleeSkillFrom(c, SKILL_TO_DAMAGE) +
    heroism;
  // A spear's kind held in both hands, the off hand empty, adds a die of its own size.
  const both = weapon.def?.extraDieTwoHanded && !c.equipment.offHand ? 1 : 0;
  return { count: weapon.damage.count + both, sides: weapon.damage.sides, bonus };
}

export function armorClass(c: Character): number {
  const equipment = equipmentArmor(c.equipment, c.skills) + meleeSkillFrom(c, SKILL_TO_ARMOR);
  const stoneSkin = buffPower(c.buffs, 'stone-skin');
  const worn = wornBonus(c, 'ac');
  return Math.max(0, statBonus(currentStats(c).speed) + equipment + stoneSkin + worn);
}

/**
 * MM6's recovery units in one real second. MM6-GAPS.md 8 leaves the rate unverified: MMX's tick
 * is 1/128 s, and MM7's engine (OpenEnroth) multiplies recovery by 2.1333 in real time, which
 * makes 60 a second; ours until MM6 is measured.
 */
export const RECOVERY_UNITS_PER_SECOND = 60;

/** Melee recovers no faster than this; bows have no floor in real time (GF-M). */
export const MIN_MELEE_RECOVERY = 30;

/** Weapon skills whose Expert rank takes the skill off recovery (MM6-GAPS.md 4, RPGC; GF-M). */
const RECOVERY_SKILLS: ReadonlySet<SkillId> = new Set<SkillId>(['sword', 'axe', 'bow']);

/** Attack recovery in MM6's units: weapon + armour − Speed effect − skill (MM6-GAPS.md 8). */
export function recoveryUnits(c: Character, ranged = false): number {
  const weapon = ranged ? rangedWeapon(c.equipment) : meleeWeapon(c.equipment);
  if (!weapon) return Infinity;
  let t = weapon.recovery + equipmentRecoveryPenalty(c.equipment, c.skills);
  t -= statBonus(currentStats(c).speed);
  const skill = weapon.def?.skill;
  const rank = skill ? skillRank(c.skills, skill) : null;
  if (skill && rank && RECOVERY_SKILLS.has(skill) && rankAtLeast(rank, 'expert')) {
    t -= skillLevel(c.skills, skill);
  }
  // Haste: 25 units off every attack (GF-M).
  if (hasBuff(c.buffs, 'haste')) t -= HASTE_RECOVERY;
  return Math.max(ranged ? 0 : MIN_MELEE_RECOVERY, t);
}

/** Attack recovery in real seconds, for the runtime. */
export function recoverySec(c: Character, ranged = false): number {
  return recoveryUnits(c, ranged) / RECOVERY_UNITS_PER_SECOND;
}

/** Recovery from a blow for an Endurance score: 20 − its effect, at least 0 (GF-M). */
export function hitRecovery(endurance: number): number {
  return Math.max(0, 20 - statBonus(endurance));
}

/** The recovery a struck character suffers, in MM6's units (MM6-GAPS.md 3, 8, GF-M). */
export function hitRecoveryUnits(c: Character): number {
  return hitRecovery(currentStats(c).endurance);
}

/** Alive as a body: not dead, stoned or eradicated. */
export function isLiving(c: Character): boolean {
  return isAlive(c.conditions);
}

/**
 * Up and able to be targeted and to be selected: living, above 0 hit points (MM6's own help:
 * unconscious at 0 or less; docs/gaps/characters.md 12.1).
 */
export function isConscious(c: Character): boolean {
  return isLiving(c) && c.hp > 0 && !hasCondition(c.conditions, 'unconscious');
}

/** Can the character attack, cast or use an item right now? */
export function canActNow(c: Character): boolean {
  return isConscious(c) && canAct(c.conditions);
}

/**
 * A character dies when hit points reach this: minus the base Endurance score, before
 * conditions (docs/gaps/characters.md 12.1: MW6 and the MM7 engine agree, at Endurance 100
 * dead at -100; MMW's "at 30, death at -31" is a point off against both).
 */
export function deathThreshold(c: Character): number {
  return -c.stats.endurance;
}

export interface DamageOutcome {
  hp: number;
  fell: boolean;
  died: boolean;
}

/** Apply damage at game minute `now`; wakes a sleeper, fells at 0, kills at the threshold. */
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

/** Heal up to the maximum; a character brought above 0 wakes. Returns the points healed. */
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

/** The condition each special attack lays, and the statistic it is saved by (monsters.md 2.6). */
export const SPECIAL_EFFECTS: Record<
  SpecialKind,
  { condition: Affliction; save: Stat | 'resistPoison' | 'resistMagic' }
> = {
  curse: { condition: 'cursed', save: 'personality' },
  weak: { condition: 'weak', save: 'endurance' },
  asleep: { condition: 'asleep', save: 'endurance' },
  drunk: { condition: 'drunk', save: 'endurance' },
  insane: { condition: 'insane', save: 'intellect' },
  poison: { condition: 'poisoned', save: 'resistPoison' },
  disease: { condition: 'diseased', save: 'endurance' },
  paralyze: { condition: 'paralyzed', save: 'resistMagic' },
  unconscious: { condition: 'unconscious', save: 'endurance' },
  dead: { condition: 'dead', save: 'resistMagic' },
  stone: { condition: 'stoned', save: 'resistMagic' },
  eradicate: { condition: 'eradicated', save: 'resistMagic' },
  afraid: { condition: 'afraid', save: 'endurance' },
};

/** X in the saving roll: the effect of the named statistic, or the resistance (0 until built). */
export function specialSaveEffect(c: Character, kind: SpecialKind): number {
  const save = SPECIAL_EFFECTS[kind].save;
  if (save === 'resistPoison' || save === 'resistMagic') return 0;
  return statBonus(currentStats(c)[save]);
}

/** The chance a tried special of this kind takes hold of the member. */
export function specialChance(c: Character, kind: SpecialKind): number {
  return specialLandChance(statBonus(currentStats(c).luck), specialSaveEffect(c, kind));
}

export interface SpecialOutcome {
  condition: Affliction;
  /** The condition took hold; false when the member shrugged it off. */
  landed: boolean;
}

/**
 * A monster's special attack against the member at game minute `now`: the saving roll, then
 * the condition at the special's level. A member already dead, stoned or eradicated is beyond
 * it; one laid dead or unconscious takes the hit points that go with the state.
 */
export function sufferSpecial(
  c: Character,
  special: MonsterSpecial,
  now: number,
  rng: Rng,
): SpecialOutcome | null {
  if (!isLiving(c)) return null;
  const { condition } = SPECIAL_EFFECTS[special.kind];
  if (rng() >= specialChance(c, special.kind)) return { condition, landed: false };
  const options = special.level !== undefined ? { severity: special.level } : {};
  if (condition === 'dead' || condition === 'stoned' || condition === 'eradicated') {
    cure(c.conditions, 'unconscious');
    c.hp = Math.min(c.hp, 0);
  } else if (condition === 'unconscious') c.hp = Math.min(c.hp, 0);
  afflict(c.conditions, condition, now, options);
  return { condition, landed: true };
}

/** Clamp hit and spell points to the current maxima after stats or level change. */
export function clampToMax(c: Character): void {
  c.hp = Math.min(c.hp, maxHp(c));
  c.sp = Math.min(c.sp, maxSp(c));
}
