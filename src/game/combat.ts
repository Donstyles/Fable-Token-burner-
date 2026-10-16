/**
 * Attack resolution (DESIGN.md 14.2). Chance to hit follows the MM6 formula the community
 * documents: (15 + 2 × attack bonus) / (30 + 2 × attack bonus + armour class). Damage is the
 * weapon's dice plus bonuses. Everything is pure; the caller supplies the dice.
 */
import { rollDice, type Dice, type Rng } from './rng';

export function hitChance(attackBonus: number, armorClass: number): number {
  const a = Math.max(0, attackBonus);
  const ac = Math.max(0, armorClass);
  return (15 + 2 * a) / (30 + 2 * a + ac);
}

export interface AttackResult {
  hit: boolean;
  damage: number;
  chance: number;
}

export function resolveAttack(
  attackBonus: number,
  damage: Dice,
  armorClass: number,
  rng: Rng,
): AttackResult {
  const chance = hitChance(attackBonus, armorClass);
  const hit = rng() < chance;
  return { hit, damage: hit ? Math.max(1, rollDice(damage, rng)) : 0, chance };
}
