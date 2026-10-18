import { describe, expect, it } from 'vitest';
import {
  armorClass,
  attackBonus,
  bodyBuildingHp,
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
  meditationSp,
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
    // Her Meditation 1 adds the Sorcerer's 3 spell points a level.
    expect(maxHp(c)).toBe(27);
    expect(maxSp(c)).toBe(37);
    c.skills.bodybuilding = { level: 2, rank: 'normal' };
    c.skills.meditation = { level: 2, rank: 'expert' };
    expect(maxHp(c)).toBe(31);
    expect(maxSp(c)).toBe(46);
    c.level = 3;
    expect(maxHp(c)).toBe(35);
    const knight = createCharacter(knightInput());
    if (knight.ok) expect(maxSp(knight.character)).toBe(0);
  });

  it('adds Body Building and Meditation as skill × class factor, ×2 Expert, ×3 Master', () => {
    // MM6-GAPS.md 4, RPGC: the skill times the class's points a level.
    const c = sorcerer();
    delete c.skills.meditation;
    const hp = maxHp(c);
    const sp = maxSp(c);
    c.skills.bodybuilding = { level: 4, rank: 'normal' };
    c.skills.meditation = { level: 4, rank: 'normal' };
    expect(bodyBuildingHp(c)).toBe(4 * 2);
    expect(meditationSp(c)).toBe(4 * 3);
    expect(maxHp(c)).toBe(hp + 8);
    expect(maxSp(c)).toBe(sp + 12);
    c.skills.bodybuilding.rank = 'expert';
    c.skills.meditation.rank = 'master';
    expect(bodyBuildingHp(c)).toBe(4 * 2 * 2);
    expect(meditationSp(c)).toBe(4 * 3 * 3);
    const r = createCharacter(knightInput());
    if (!r.ok) throw new Error('fixture');
    const k = r.character;
    k.skills.bodybuilding = { level: 3, rank: 'master' };
    expect(bodyBuildingHp(k)).toBe(3 * 3 * 5);
    expect(meditationSp(k)).toBe(0);
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
  it('stays up at 0, falls below 0, wakes at 0 when healed (MM6-GAPS.md 10, 11)', () => {
    const c = sorcerer();
    expect(damageCharacter(c, maxHp(c), 100)).toEqual({ hp: 0, fell: false, died: false });
    expect(isConscious(c)).toBe(true);
    expect(damageCharacter(c, 1, 101)).toEqual({ hp: -1, fell: true, died: false });
    expect(isConscious(c)).toBe(false);
    expect(isLiving(c)).toBe(true);
    expect(canActNow(c)).toBe(false);
    expect(c.conditions.unconscious?.since).toBe(101);
    expect(healCharacter(c, 1)).toBe(1);
    expect(isConscious(c)).toBe(true);
    expect(c.conditions.unconscious).toBeUndefined();
  });

  it('dies below minus the Endurance score: at Endurance 24, −24 lives and −25 dies', () => {
    const c = sorcerer();
    expect(c.stats.endurance).toBe(24);
    expect(deathThreshold(c)).toBe(-24);
    expect(damageCharacter(c, c.hp + 24, 150)).toEqual({ hp: -24, fell: true, died: false });
    expect(damageCharacter(c, 1, 200)).toEqual({ hp: -25, fell: false, died: true });
    expect(isLiving(c)).toBe(false);
    expect(c.conditions.unconscious).toBeUndefined();
    expect(c.conditions.dead?.since).toBe(200);
    expect(healCharacter(c, 99)).toBe(0);
    expect(damageCharacter(c, 5, 300).hp).toBe(-25);
  });

  it('matches MMW’s example: at Endurance 30, death at −31', () => {
    const r = createCharacter(knightInput());
    if (!r.ok) throw new Error('fixture');
    const k = r.character;
    expect(k.stats.endurance).toBe(30);
    expect(damageCharacter(k, k.hp + 30, 0).died).toBe(false);
    expect(damageCharacter(k, 1, 1)).toEqual({ hp: -31, fell: false, died: true });
  });

  it('wakes a sleeper when struck and clamps to the maxima', () => {
    const c = sorcerer();
    afflict(c.conditions, 'asleep', 0, { minutes: 60 });
    damageCharacter(c, 1, 1);
    expect(c.conditions.asleep).toBeUndefined();
    c.sp = 0;
    expect(restoreSp(c, 10)).toBe(10);
    expect(restoreSp(c)).toBe(27);
    c.hp = 999;
    c.sp = 999;
    clampToMax(c);
    expect(c.hp).toBe(27);
    expect(c.sp).toBe(37);
  });

  it('tells a character sheet from test data', () => {
    expect(isCharacter(sorcerer())).toBe(true);
    expect(isCharacter(TEST_PARTY[0])).toBe(false);
    expect(isCharacter(null)).toBe(false);
  });
});
