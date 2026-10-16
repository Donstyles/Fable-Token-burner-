import { describe, expect, it } from 'vitest';
import {
  armorClass,
  attackBonus,
  canActNow,
  clampToMax,
  damageCharacter,
  damageDice,
  deathThreshold,
  healCharacter,
  isCharacter,
  isConscious,
  isLiving,
  maxHp,
  maxSp,
  recoverySec,
  restoreSp,
} from './character';
import { afflict } from './conditions';
import { createCharacter } from './creation';
import { knightInput, sorcererInput } from './fixtures';
import { equipItem } from './inventory';
import { createItem } from './items';
import { TEST_PARTY } from './party';

function sorcerer() {
  const r = createCharacter(sorcererInput());
  if (!r.ok) throw new Error('fixture');
  return r.character;
}

describe('derived numbers', () => {
  it('computes hit and spell points from class, level, stats and skills', () => {
    const c = sorcerer();
    expect(maxHp(c)).toBe(27);
    expect(maxSp(c)).toBe(35);
    c.skills.bodybuilding = { level: 2, rank: 'normal' };
    c.skills.meditation = { level: 2, rank: 'expert' };
    expect(maxHp(c)).toBe(29);
    expect(maxSp(c)).toBe(38);
    c.level = 3;
    expect(maxHp(c)).toBe(33);
    const knight = createCharacter(knightInput());
    if (knight.ok) expect(maxSp(knight.character)).toBe(0);
  });

  it('derives attack, damage, armour and recovery from equipment', () => {
    const c = sorcerer();
    expect(attackBonus(c)).toBe(5);
    expect(damageDice(c)).toEqual({ count: 1, sides: 3, bonus: -2 });
    expect(damageDice(c, true)).toBeNull();
    expect(armorClass(c)).toBe(5);
    expect(recoverySec(c)).toBeCloseTo(0.8 - 0.25);
    expect(equipItem(c.equipment, createItem('dagger'), c.skills).ok).toBe(true);
    expect(attackBonus(c)).toBe(6);
    expect(damageDice(c)).toEqual({ count: 2, sides: 2, bonus: -2 });
    c.skills.dagger = { level: 4, rank: 'master' };
    expect(attackBonus(c)).toBe(5 + 8);
    expect(recoverySec(c)).toBeCloseTo(0.5);
    equipItem(c.equipment, createItem('leather-armor'), c.skills);
    expect(equipItem(c.equipment, createItem('leather-armor'), c.skills).ok).toBe(false);
    c.skills.leather = { level: 1, rank: 'normal' };
    equipItem(c.equipment, createItem('leather-armor'), c.skills);
    expect(armorClass(c)).toBe(9);
    expect(recoverySec(c, true)).toBe(Infinity);
  });

  it('lets conditions pull the derived numbers down', () => {
    const c = sorcerer();
    afflict(c.conditions, 'weak', 0);
    expect(maxHp(c)).toBeLessThan(27);
    expect(attackBonus(c)).toBeLessThan(5);
  });
});

describe('damage and healing', () => {
  it('fells at zero, wakes when healed, dies past half the maximum below zero', () => {
    const c = sorcerer();
    expect(deathThreshold(c)).toBe(-14);
    expect(damageCharacter(c, 27, 100)).toEqual({ hp: 0, fell: true, died: false });
    expect(isConscious(c)).toBe(false);
    expect(isLiving(c)).toBe(true);
    expect(canActNow(c)).toBe(false);
    expect(c.conditions.unconscious?.since).toBe(100);
    expect(healCharacter(c, 5)).toBe(5);
    expect(isConscious(c)).toBe(true);
    expect(c.conditions.unconscious).toBeUndefined();
    expect(damageCharacter(c, 30, 200)).toEqual({ hp: -25, fell: false, died: true });
    expect(isLiving(c)).toBe(false);
    expect(c.conditions.unconscious).toBeUndefined();
    expect(c.conditions.dead?.since).toBe(200);
    expect(healCharacter(c, 99)).toBe(0);
    expect(damageCharacter(c, 5, 300).hp).toBe(-25);
  });

  it('wakes a sleeper when struck and clamps to the maxima', () => {
    const c = sorcerer();
    afflict(c.conditions, 'asleep', 0, { minutes: 60 });
    damageCharacter(c, 1, 1);
    expect(c.conditions.asleep).toBeUndefined();
    c.sp = 0;
    expect(restoreSp(c, 10)).toBe(10);
    expect(restoreSp(c)).toBe(25);
    c.hp = 999;
    c.sp = 999;
    clampToMax(c);
    expect(c.hp).toBe(27);
    expect(c.sp).toBe(35);
  });

  it('tells a character sheet from test data', () => {
    expect(isCharacter(sorcerer())).toBe(true);
    expect(isCharacter(TEST_PARTY[0])).toBe(false);
    expect(isCharacter(null)).toBe(false);
  });
});
