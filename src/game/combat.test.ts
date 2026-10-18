import { describe, expect, it } from 'vitest';
import { hitChance, monsterHitChance, resolveAttack, resolveMonsterAttack } from './combat';
import { MONSTERS } from './monsters';
import { Party, TEST_PARTY } from './party';
import { diceText, mulberry32, rollDice } from './rng';
import { statBonus } from './stats';

describe('stat bonuses', () => {
  it('anchors at zero for 11 and 12 and climbs in steps', () => {
    expect(statBonus(11)).toBe(0);
    expect(statBonus(12)).toBe(0);
    expect(statBonus(13)).toBe(1);
    expect(statBonus(20)).toBe(4);
    expect(statBonus(21)).toBe(5);
    expect(statBonus(50)).toBe(10);
    expect(statBonus(3)).toBe(-5);
    expect(statBonus(0)).toBe(-6);
  });
});

describe('dice', () => {
  it('rolls within range and repeats with the same seed', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const r = rollDice({ count: 2, sides: 4, bonus: 1 }, a);
      expect(r).toBeGreaterThanOrEqual(3);
      expect(r).toBeLessThanOrEqual(9);
      expect(rollDice({ count: 2, sides: 4, bonus: 1 }, b)).toBe(r);
    }
    expect(diceText({ count: 1, sides: 6, bonus: 1 })).toBe('1d6+1');
  });
});

describe('to-hit', () => {
  it('follows (15 + 2a) / (30 + 2a + ac)', () => {
    expect(hitChance(0, 0)).toBeCloseTo(0.5);
    expect(hitChance(5, 10)).toBeCloseTo(25 / 50);
    expect(hitChance(10, 0)).toBeCloseTo(35 / 50);
  });

  it('deals no damage on a miss and at least one on a hit', () => {
    const rng = mulberry32(3);
    let hits = 0;
    for (let i = 0; i < 200; i++) {
      const r = resolveAttack(3, { count: 1, sides: 6 }, 8, rng);
      if (r.hit) {
        hits++;
        expect(r.damage).toBeGreaterThanOrEqual(1);
      } else expect(r.damage).toBe(0);
    }
    // 21 / 44 ≈ 0.48 expected.
    expect(hits).toBeGreaterThan(60);
    expect(hits).toBeLessThan(140);
  });
});

describe('monster to-hit (MM6-GAPS.md 8, GF-M)', () => {
  it('follows (5 + 2 × level) / (10 + 2 × level + ac)', () => {
    expect(monsterHitChance(0, 0)).toBeCloseTo(0.5);
    expect(monsterHitChance(1, 0)).toBeCloseTo(7 / 12);
    // A level-2 bandit against armour class 10: 9 in 24, not the party formula's 21 in 46.
    expect(monsterHitChance(MONSTERS.bandit!.level, 10)).toBeCloseTo(9 / 24);
    expect(hitChance(MONSTERS.bandit!.attackBonus, 10)).toBeCloseTo(21 / 46);
    expect(monsterHitChance(10, 30)).toBeCloseTo(25 / 60);
  });

  it('rolls the monster’s dice on a hit and nothing on a miss', () => {
    const bandit = MONSTERS.bandit!;
    const hit = resolveMonsterAttack(bandit, 10, () => 0.1);
    expect(hit.hit).toBe(true);
    expect(hit.chance).toBeCloseTo(9 / 24);
    expect(hit.damage).toBeGreaterThanOrEqual(2);
    expect(hit.damage).toBeLessThanOrEqual(7);
    expect(resolveMonsterAttack(bandit, 10, () => 0.5)).toEqual({
      hit: false,
      damage: 0,
      chance: 9 / 24,
    });
  });
});

describe('party attacks', () => {
  it('attacks with the selected member, then advances to the next ready one', () => {
    const party = new Party(TEST_PARTY);
    const rng = mulberry32(1);
    const dummy = {
      armorClass: 0,
      taken: 0,
      takeDamage(n: number) {
        this.taken += n;
      },
    };
    const first = party.attack(dummy, 0, rng);
    expect(first?.member.def.name).toBe('Alric');
    expect(party.selected).toBe(1);
    expect(party.members[0]!.isReady(0)).toBe(false);
    party.attack(dummy, 0, rng);
    party.attack(dummy, 0, rng);
    party.attack(dummy, 0, rng);
    // Everyone is recovering now.
    expect(party.attack(dummy, 0, rng)).toBeNull();
    expect(party.members[0]!.isReady(2)).toBe(true);
    expect(party.attack(dummy, 2, rng)).not.toBeNull();
  });

  it('skips a fallen member and keeps the party alive while one stands', () => {
    const party = new Party(TEST_PARTY);
    party.takeDamage(0, 999);
    expect(party.members[0]!.alive).toBe(false);
    expect(party.selected).toBe(1);
    expect(party.readyIndex(0)).toBe(1);
    expect(party.alive).toBe(true);
    const rng = mulberry32(2);
    for (let i = 0; i < 20; i++) expect(party.randomLivingIndex(rng)).not.toBe(0);
  });
});
