/**
 * Character sheet view-model (Phase 5 step 10): the rows the sheet shows for one character
 * and its one action, raising a skill with skill points. Pure functions over `Character`;
 * `sheet.ts` only lays the rows out.
 */
import {
  armorClass,
  attackBonus,
  type Character,
  currentStats,
  damageDice,
  maxHp,
  maxSp,
  recoverySec,
} from '../game/character';
import { classDef } from '../game/classes';
import { afflictions, CONDITION_DEFS, worstCondition } from '../game/conditions';
import { canLevelUp, xpForLevel } from '../game/experience';
import { type Dice, diceText } from '../game/rng';
import {
  raiseCost,
  raiseSkill,
  type RaiseResult,
  SKILL_NAMES,
  SKILLS,
  type SkillGroup,
  type SkillId,
  type SkillRank,
  skillGroup,
} from '../game/skills';
import { type Stat, STATS, statBonus } from '../game/stats';

export const STAT_LABELS: Record<Stat, string> = {
  might: 'Might',
  intellect: 'Intellect',
  personality: 'Personality',
  endurance: 'Endurance',
  accuracy: 'Accuracy',
  speed: 'Speed',
  luck: 'Luck',
};

export const GROUP_LABELS: Record<SkillGroup, string> = {
  weapon: 'Weapons',
  armor: 'Armour',
  magic: 'Magic',
  misc: 'Miscellaneous',
};

export const RANK_LABELS: Record<SkillRank, string> = {
  normal: 'Normal',
  expert: 'Expert',
  master: 'Master',
};

export interface StatRow {
  stat: Stat;
  label: string;
  base: number;
  /** After conditions. */
  current: number;
  bonus: number;
}

export interface SkillRow {
  id: SkillId;
  name: string;
  group: SkillGroup;
  level: number;
  rank: SkillRank;
  rankLabel: string;
  /** Skill points the next level costs. */
  cost: number;
  canRaise: boolean;
}

export interface SkillGroupRows {
  group: SkillGroup;
  label: string;
  rows: SkillRow[];
}

export interface SheetView {
  name: string;
  className: string;
  sex: string;
  level: number;
  xp: number;
  /** Experience the next level needs in all. */
  xpNext: number;
  /** Experience still missing; zero once a trainer can raise the level. */
  xpToNext: number;
  canTrain: boolean;
  age: number;
  condition: string;
  afflictions: string[];
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  /** False for classes without spell points. */
  hasSp: boolean;
  armorClass: number;
  attack: number;
  damage: string;
  rangedAttack: number | null;
  rangedDamage: string | null;
  /** The damage as MM6's sheet gave it, least to most ("5 - 11"). */
  damageRange: string;
  rangedRange: string | null;
  recovery: string;
  skillPoints: number;
  stats: StatRow[];
  skills: SkillGroupRows[];
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** A roll's least and most, as MM6's sheet gave damage: "5 - 11". */
export function damageRange(d: Dice): string {
  const bonus = d.bonus ?? 0;
  return `${d.count + bonus} - ${d.count * d.sides + bonus}`;
}

export function formatSeconds(s: number): string {
  return Number.isFinite(s) ? `${s.toFixed(2)} s` : '—';
}

export function statRows(c: Character): StatRow[] {
  const current = currentStats(c);
  return STATS.map((stat) => ({
    stat,
    label: STAT_LABELS[stat],
    base: c.stats[stat],
    current: current[stat],
    bonus: statBonus(current[stat]),
  }));
}

/** The learnt skills in the skill list's order, each with the cost of its next level. */
export function skillRows(c: Character): SkillRow[] {
  const rows: SkillRow[] = [];
  for (const id of SKILLS) {
    const s = c.skills[id];
    if (!s) continue;
    const cost = raiseCost(s.level);
    rows.push({
      id,
      name: SKILL_NAMES[id],
      group: skillGroup(id),
      level: s.level,
      rank: s.rank,
      rankLabel: RANK_LABELS[s.rank],
      cost,
      canRaise: c.skillPoints >= cost,
    });
  }
  return rows;
}

/** The groups that have rows, in MM6's order. */
export function skillGroups(rows: readonly SkillRow[]): SkillGroupRows[] {
  const groups: SkillGroup[] = ['weapon', 'armor', 'magic', 'misc'];
  return groups
    .map((group) => ({
      group,
      label: GROUP_LABELS[group],
      rows: rows.filter((r) => r.group === group),
    }))
    .filter((g) => g.rows.length > 0);
}

export function sheetView(c: Character): SheetView {
  const cls = classDef(c.classId);
  const xpNext = xpForLevel(c.level + 1);
  const ranged = damageDice(c, true);
  return {
    name: c.name,
    className: cls.name,
    sex: c.sex === 'male' ? 'Male' : 'Female',
    level: c.level,
    xp: c.xp,
    xpNext,
    xpToNext: Math.max(0, xpNext - c.xp),
    canTrain: canLevelUp(c),
    age: c.age,
    condition: CONDITION_DEFS[worstCondition(c.conditions)].name,
    afflictions: afflictions(c.conditions).map((id) => CONDITION_DEFS[id].name),
    hp: c.hp,
    maxHp: maxHp(c),
    sp: c.sp,
    maxSp: maxSp(c),
    hasSp: cls.spFactor > 0,
    armorClass: armorClass(c),
    attack: attackBonus(c),
    damage: diceText(damageDice(c) ?? { count: 1, sides: 3 }),
    rangedAttack: ranged ? attackBonus(c, true) : null,
    rangedDamage: ranged ? diceText(ranged) : null,
    damageRange: damageRange(damageDice(c) ?? { count: 1, sides: 3 }),
    rangedRange: ranged ? damageRange(ranged) : null,
    recovery: formatSeconds(recoverySec(c)),
    skillPoints: c.skillPoints,
    stats: statRows(c),
    skills: skillGroups(skillRows(c)),
  };
}

/** Spend skill points on one level of a skill; the sheet's only action. */
export function raise(c: Character, id: SkillId): RaiseResult {
  const r = raiseSkill(c.skills, id, c.skillPoints);
  if (r.ok) c.skillPoints = r.pointsLeft;
  return r;
}

export function raiseMessage(r: RaiseResult, id: SkillId): string {
  const name = SKILL_NAMES[id];
  if (r.ok) return `${name} is now level ${r.level} (${r.pointsLeft} points left).`;
  return r.reason === 'points' ? `Not enough skill points for ${name}.` : `${name} is not learnt.`;
}
