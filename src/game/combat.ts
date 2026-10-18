/**
 * Attack resolution (DESIGN.md 14.2). A member hits a monster with chance (15 + 2 × attack
 * bonus) / (30 + 2 × attack bonus + armour class); a monster hits a member with chance
 * (5 + 2 × monster level) / (10 + 2 × monster level + armour class) (MM6-GAPS.md 8, GF-M).
 * Damage is the weapon's dice plus bonuses. Everything is pure; the caller supplies the dice.
 */
import { rollDice, type Dice, type Rng } from './rng';

/** A member's chance to hit a monster (MM6-GAPS.md 8, GF-M). */
export function hitChance(attackBonus: number, armorClass: number): number {
  const a = Math.max(0, attackBonus);
  const ac = Math.max(0, armorClass);
  return (15 + 2 * a) / (30 + 2 * a + ac);
}

/** A monster's chance to hit a member: by its level, not an attack bonus (MM6-GAPS.md 8, GF-M). */
export function monsterHitChance(monsterLevel: number, armorClass: number): number {
  const level = Math.max(0, monsterLevel);
  const ac = Math.max(0, armorClass);
  return (5 + 2 * level) / (10 + 2 * level + ac);
}

export interface AttackResult {
  hit: boolean;
  damage: number;
  chance: number;
}

function roll(chance: number, damage: Dice, rng: Rng): AttackResult {
  const hit = rng() < chance;
  return { hit, damage: hit ? Math.max(1, rollDice(damage, rng)) : 0, chance };
}

/** A member's blow or shot at a monster. */
export function resolveAttack(
  attackBonus: number,
  damage: Dice,
  armorClass: number,
  rng: Rng,
): AttackResult {
  return roll(hitChance(attackBonus, armorClass), damage, rng);
}

/** What MM6's monster formula needs of the attacker. */
export interface MonsterAttacker {
  level: number;
  damage: Dice;
}

/** A monster's blow at a member of armour class `armorClass`. */
export function resolveMonsterAttack(
  monster: MonsterAttacker,
  armorClass: number,
  rng: Rng,
): AttackResult {
  return roll(monsterHitChance(monster.level, armorClass), monster.damage, rng);
}
