import { describe, expect, it } from 'vitest';
import {
  activeBuffs,
  applyBuff,
  buffLabel,
  buffPower,
  expireBuffs,
  formatLeft,
  hasBuff,
  isMemberBuffId,
  isPartyBuffId,
  type MemberBuffs,
  type PartyBuffs,
} from './buffs';

describe('the buff store (DESIGN 17.17, magic.md 5.5)', () => {
  it('puts a buff on with its end on the clock, and replaces it only by the patch’s rule', () => {
    const set: MemberBuffs = {};
    expect(applyBuff(set, 'bless', 100, { minutes: 65, power: 6, skill: 1 })).toBe('new');
    expect(set.bless).toEqual({ until: 165, power: 6, skill: 1 });
    // Weaker and shorter: kept as it was.
    expect(applyBuff(set, 'bless', 120, { minutes: 10, power: 5, skill: 1 })).toBe('kept');
    expect(set.bless).toEqual({ until: 165, power: 6, skill: 1 });
    // The same power but longer: the new one.
    expect(applyBuff(set, 'bless', 120, { minutes: 65, power: 6, skill: 1 })).toBe('replaced');
    expect(set.bless?.until).toBe(185);
    // Stronger, even if shorter: the new one (GF-P).
    expect(applyBuff(set, 'bless', 120, { minutes: 5, power: 9, skill: 4 })).toBe('replaced');
    expect(set.bless).toEqual({ until: 125, power: 9, skill: 4 });
    expect(buffPower(set, 'bless')).toBe(9);
    expect(buffPower(set, 'haste')).toBe(0);
    expect(hasBuff(set, 'bless')).toBe(true);
  });

  it('runs buffs out on the clock and lists the ones left, longest first', () => {
    const set: PartyBuffs = {};
    applyBuff(set, 'torch-light', 0, { minutes: 60, power: 1, skill: 1 });
    applyBuff(set, 'protection-fire', 0, { minutes: 180, power: 3, skill: 3 });
    applyBuff(set, 'wizard-eye', 0, { minutes: 30, power: 1, skill: 1 });
    expect(activeBuffs(set, 10).map((b) => [b.id, b.minutesLeft])).toEqual([
      ['protection-fire', 170],
      ['torch-light', 50],
      ['wizard-eye', 20],
    ]);
    expect(expireBuffs(set, 29)).toEqual([]);
    expect(expireBuffs(set, 60).sort()).toEqual(['torch-light', 'wizard-eye']);
    expect(Object.keys(set)).toEqual(['protection-fire']);
    expect(activeBuffs(set, 500)[0]?.minutesLeft).toBe(0);
  });

  it('names a buff with the time it has left', () => {
    expect(formatLeft(5)).toBe('5 min');
    expect(formatLeft(65)).toBe('1 h 5 min');
    expect(formatLeft(120)).toBe('2 h');
    expect(formatLeft(24 * 60 + 5 * 60)).toBe('1 d 5 h');
    expect(buffLabel('stone-skin', 75)).toBe('Stone Skin (1 h 15 min)');
    expect(isMemberBuffId('haste')).toBe(true);
    expect(isMemberBuffId('torch-light')).toBe(false);
    expect(isPartyBuffId('torch-light')).toBe(true);
    expect(isPartyBuffId('bless')).toBe(false);
  });
});
