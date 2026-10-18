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
  hitRecovery,
  hitRecoveryUnits,
  isCharacter,
  isConscious,
  isLiving,
  maxHp,
  maxSp,
  meditationSp,
  RECOVERY_UNITS_PER_SECOND,
  recoverySec,
  recoveryUnits,
  restoreSp,
} from './character';
import { afflict } from './conditions';
import { createCharacter } from './creation';
import { knightInput, sorcererInput } from './fixtures';
import { equipItem } from './inventory';
import { createItem } from './items';
import { TEST_PARTY } from './party';
import { statBonus } from './stats';

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
    // Bare hands recover as a staff, 100, less the Speed effect.
    expect(recoveryUnits(c)).toBe(100 - statBonus(23));
    expect(recoverySec(c)).toBeCloseTo((100 - statBonus(23)) / 60);
    expect(equipItem(c.equipment, createItem('dagger'), c.skills).ok).toBe(true);
    expect(attackBonus(c)).toBe(6);
    expect(damageDice(c)).toEqual({ count: 2, sides: 2, bonus: -2 });
    c.skills.dagger = { level: 4, rank: 'master' };
    expect(attackBonus(c)).toBe(5 + 8);
    // A dagger's 60; Dagger skill takes nothing off.
    expect(recoveryUnits(c)).toBe(60 - statBonus(23));
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

describe('recovery in MM6 units (MM6-GAPS.md 8, GF-M)', () => {
  function knight() {
    const r = createCharacter(knightInput());
    if (!r.ok) throw new Error('fixture');
    return r.character;
  }

  it('adds the weapon type and worn armour and takes off the Speed effect', () => {
    const k = knight();
    const speed = statBonus(k.stats.speed);
    expect(recoveryUnits(k)).toBe(100 - speed);
    equipItem(k.equipment, createItem('long-sword'), k.skills);
    expect(recoveryUnits(k)).toBe(90 - speed);
    equipItem(k.equipment, createItem('leather-armor'), k.skills);
    equipItem(k.equipment, createItem('shield'), k.skills);
    expect(recoveryUnits(k)).toBe(90 + 10 + 10 - speed);
    expect(recoverySec(k)).toBeCloseTo((110 - speed) / RECOVERY_UNITS_PER_SECOND);
    expect(RECOVERY_UNITS_PER_SECOND).toBe(60);
  });

  it('matches GF-M’s example: a mace, a shield and leather at Speed 15', () => {
    const k = knight();
    k.stats.speed = 15;
    k.skills.mace = { level: 1, rank: 'normal' };
    equipItem(k.equipment, createItem('mace'), k.skills);
    equipItem(k.equipment, createItem('shield'), k.skills);
    equipItem(k.equipment, createItem('leather-armor'), k.skills);
    expect(recoveryUnits(k)).toBe(80 + 10 + 10 - statBonus(15));
  });

  it('takes the skill off from Expert in Sword, Axe and Bow, not in Mace', () => {
    const k = knight();
    const speed = statBonus(k.stats.speed);
    equipItem(k.equipment, createItem('long-sword'), k.skills);
    k.skills.sword = { level: 5, rank: 'normal' };
    expect(recoveryUnits(k)).toBe(90 - speed);
    k.skills.sword.rank = 'expert';
    expect(recoveryUnits(k)).toBe(90 - speed - 5);
    k.skills.axe = { level: 6, rank: 'master' };
    equipItem(k.equipment, createItem('axe'), k.skills);
    expect(recoveryUnits(k)).toBe(100 - speed - 6);
    k.skills.mace = { level: 6, rank: 'expert' };
    equipItem(k.equipment, createItem('mace'), k.skills);
    expect(recoveryUnits(k)).toBe(80 - speed);
    k.skills.bow = { level: 4, rank: 'expert' };
    equipItem(k.equipment, createItem('bow'), k.skills);
    expect(recoveryUnits(k, true)).toBe(100 - speed - 4);
  });

  it('floors melee at 30 and lets a bow go to 0 (GF-M, real time)', () => {
    const k = knight();
    k.skills.sword = { level: 80, rank: 'expert' };
    equipItem(k.equipment, createItem('long-sword'), k.skills);
    expect(recoveryUnits(k)).toBe(30);
    expect(recoverySec(k)).toBeCloseTo(0.5);
    k.skills.bow = { level: 120, rank: 'expert' };
    equipItem(k.equipment, createItem('bow'), k.skills);
    expect(recoveryUnits(k, true)).toBe(0);
  });

  it('costs a struck character 20 − Endurance effect, nothing from Endurance 350', () => {
    const c = sorcerer();
    expect(hitRecoveryUnits(c)).toBe(20 - statBonus(c.stats.endurance));
    expect(hitRecovery(0)).toBe(26);
    expect(hitRecovery(13)).toBe(20 - statBonus(13));
    expect(hitRecovery(350)).toBe(0);
    expect(hitRecovery(500)).toBe(0);
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
