import { describe, expect, it } from 'vitest';
import {
  BONUS_SUFFIX,
  bonusLabel,
  GOLD_PER_POINT,
  itemDisplayName,
  itemValue,
  rollBonusKind,
  rollStandardBonus,
  rollStrength,
  STANDARD_BONUSES,
  takesStandardBonus,
} from './enchant';
import { createItem, itemDef } from './items';
import { mulberry32 } from './rng';

describe('standard enchantments (DESIGN 17.18, items.md 3.1, 4.3, 4.4)', () => {
  it('names the fourteen and says which slots take them', () => {
    expect(STANDARD_BONUSES).toHaveLength(14);
    expect(BONUS_SUFFIX.might).toBe('of Might');
    expect(BONUS_SUFFIX['resist-poison']).toBe('of Poison Resistance');
    expect(takesStandardBonus('ring')).toBe(true);
    expect(takesStandardBonus('weapon')).toBe(false);
    expect(takesStandardBonus('potion')).toBe(false);
    expect(rollBonusKind('weapon', () => 0.5)).toBeNull();
  });

  it('draws the bonus by the slot’s odds: a shield never raises a statistic, boots favour Speed', () => {
    const rng = mulberry32(3);
    const shields = new Set<string>();
    const boots: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      shields.add(rollBonusKind('shield', rng)!);
      const b = rollBonusKind('boots', rng)!;
      boots[b] = (boots[b] ?? 0) + 1;
    }
    for (const stat of [
      'might',
      'intellect',
      'personality',
      'endurance',
      'accuracy',
      'speed',
      'luck',
    ]) {
      expect(shields.has(stat)).toBe(false);
    }
    expect(shields.has('ac')).toBe(true);
    // Speed weighs 25 of 110 on boots: about a quarter of them.
    expect(boots['speed']! / 2000).toBeGreaterThan(0.17);
    expect(boots['speed']! / 2000).toBeLessThan(0.3);
  });

  it('draws the strength from the level’s range and the bonus by the level’s chance', () => {
    const rng = mulberry32(5);
    expect(rollStrength(1, rng)).toBe(0);
    for (let i = 0; i < 200; i++) {
      const s2 = rollStrength(2, rng);
      expect(s2).toBeGreaterThanOrEqual(1);
      expect(s2).toBeLessThanOrEqual(5);
      const s6 = rollStrength(6, rng);
      expect(s6).toBeGreaterThanOrEqual(15);
      expect(s6).toBeLessThanOrEqual(25);
    }
    expect(rollStandardBonus('ring', 1, rng)).toBeNull();
    let withBonus = 0;
    for (let i = 0; i < 1000; i++) if (rollStandardBonus('ring', 3, rng)) withBonus++;
    // Two in five at level 3.
    expect(withBonus).toBeGreaterThan(330);
    expect(withBonus).toBeLessThan(470);
    let atSix = 0;
    for (let i = 0; i < 1000; i++) if (rollStandardBonus('armor', 6, rng)) atSix++;
    expect(atSix).toBeGreaterThan(700);
  });

  it('names and prices an enchanted copy, the generic name while unknown', () => {
    const def = itemDef('copper-ring');
    const plain = createItem('copper-ring');
    expect(itemDisplayName(plain, def)).toBe('Fine Ring');
    expect(itemValue(plain, def)).toBe(100);
    const charmed = {
      ...createItem('copper-ring', false),
      bonus: { kind: 'might' as const, power: 4 },
    };
    expect(itemDisplayName(charmed, def)).toBe('Ring');
    charmed.identified = true;
    expect(itemDisplayName(charmed, def)).toBe('Fine Ring of Might');
    expect(itemValue(charmed, def)).toBe(100 + 4 * GOLD_PER_POINT);
    expect(bonusLabel(charmed.bonus)).toBe('+4 Might');
    expect(bonusLabel({ kind: 'ac', power: 7 })).toBe('+7 Armor Class');
  });
});
