/**
 * Experience and levels (Phase 5 step 7). MM6's curve: reaching level L needs
 * 1000 × L × (L − 1) / 2 experience (1000 for level 2, 3000 for 3, 6000 for 4, 10000 for 5).
 * Experience accrues at once; the level is raised only by a trainer, who charges 25 gold per
 * level of the new level (ours; MM6 trainers charge by town). Each level brings five skill
 * points (ours; MM6's per-level grant is not agreed in community tables) and the class's hit
 * and spell point gains, added to the current points as well as to the maximum. Learning adds
 * 9 % plus 1 % per skill point, the skill part doubled at Expert and tripled at Master
 * (MM6-GAPS.md 4, RPGC: skill 5 gives 14 %, 10 at Master 39 %).
 */
import { type Character, clampToMax, isLiving, maxHp, maxSp } from './character';
import { classDef, levelGains } from './classes';
import { skillBonus } from './skills';

export const SKILL_POINTS_PER_LEVEL = 5;
export const TRAINING_GOLD_PER_LEVEL = 25;

/** Experience needed to hold `level`. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (1000 * level * (level - 1)) / 2;
}

/** The highest level `xp` supports. */
export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function xpToNextLevel(c: Character): number {
  return Math.max(0, xpForLevel(c.level + 1) - c.xp);
}

export function canLevelUp(c: Character): boolean {
  return isLiving(c) && c.xp >= xpForLevel(c.level + 1);
}

export function trainingCost(newLevel: number, multiplier = 1): number {
  return Math.round(TRAINING_GOLD_PER_LEVEL * newLevel * multiplier);
}

/** Learning's bonus in per cent: 9 + skill × 1 / 2 / 3 once learnt, else 0 (MM6-GAPS.md 4). */
export function learningPercent(c: Character): number {
  const skill = skillBonus(c.skills, 'learning');
  return skill > 0 ? 9 + skill : 0;
}

/** Experience after the Learning bonus, rounded down. */
export function experienceWithLearning(c: Character, amount: number): number {
  return Math.floor((amount * (100 + learningPercent(c))) / 100);
}

/** Add experience to one character (dead and gone members earn none). Returns what was added. */
export function addExperience(c: Character, amount: number): number {
  if (!isLiving(c) || amount <= 0) return 0;
  const gained = experienceWithLearning(c, amount);
  c.xp += gained;
  return gained;
}

/** MM6 shares a kill's experience equally among the living members. */
export function shareExperience(party: readonly Character[], amount: number): number[] {
  const living = party.filter(isLiving);
  if (!living.length) return party.map(() => 0);
  const each = Math.floor(amount / living.length);
  return party.map((c) => addExperience(c, each));
}

export interface LevelUpResult {
  level: number;
  hpGain: number;
  spGain: number;
  skillPoints: number;
}

/** Raise the level by one (the trainer's act); the caller checks `canLevelUp` and pays. */
export function levelUp(c: Character): LevelUpResult {
  const hpBefore = maxHp(c);
  const spBefore = maxSp(c);
  c.level += 1;
  c.skillPoints += SKILL_POINTS_PER_LEVEL;
  const hpGain = maxHp(c) - hpBefore;
  const spGain = maxSp(c) - spBefore;
  c.hp += Math.max(0, hpGain);
  c.sp += Math.max(0, spGain);
  clampToMax(c);
  return { level: c.level, hpGain, spGain, skillPoints: c.skillPoints };
}

/** The gains the next level would bring, for the trainer's screen. */
export function nextLevelGains(c: Character): { hp: number; sp: number } {
  return levelGains(classDef(c.classId));
}
