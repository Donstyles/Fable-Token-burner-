import { describe, expect, it } from 'vitest';
import {
  FAMILIES,
  familyRecords,
  FLEE_AT,
  fleesAt,
  hpForLevel,
  MONSTERS,
  xpForLevel,
} from './monsters';

describe('monster records as data (DESIGN 17.16, monsters.md 3.2)', () => {
  it('derives hit points and experience from the level for every tiered type', () => {
    // MM6's Goblin (level 4), Skeleton Knight (10) and Skeleton Lord (14).
    expect(hpForLevel(4)).toBe(13);
    expect(xpForLevel(4)).toBe(56);
    expect(hpForLevel(10)).toBe(40);
    expect(xpForLevel(10)).toBe(200);
    expect(hpForLevel(14)).toBe(61);
    expect(xpForLevel(14)).toBe(336);
    for (const f of FAMILIES) {
      for (const def of familyRecords(f).filter((m) => !f.uniques?.some((u) => u.id === m.id))) {
        expect(def.hp).toBe(hpForLevel(def.level));
        expect(def.xp).toBe(xpForLevel(def.level));
      }
    }
  });

  it('builds three tiers a family on one body, the upper two tinted', () => {
    for (const f of FAMILIES) {
      const tiers = familyRecords(f).filter((m) => !f.uniques?.some((u) => u.id === m.id));
      expect(tiers.map((t) => t.tier)).toEqual(['A', 'B', 'C']);
      expect(tiers.every((t) => t.character === f.character)).toBe(true);
      expect(tiers[0]!.tint).toBeUndefined();
      expect(tiers[1]!.tint).toEqual(f.tints[0]);
      expect(tiers[2]!.tint).toEqual(f.tints[1]);
      // Within a family the level rises and the armour class never falls (3.2).
      expect(tiers[1]!.level).toBeGreaterThan(tiers[0]!.level);
      expect(tiers[2]!.level).toBeGreaterThan(tiers[1]!.level);
      expect(tiers[1]!.armorClass).toBeGreaterThanOrEqual(tiers[0]!.armorClass);
      expect(tiers[2]!.armorClass).toBeGreaterThanOrEqual(tiers[1]!.armorClass);
    }
  });

  it('keeps the ids the levels and quests name, and the warden its own hit points', () => {
    for (const id of ['goblin-scout', 'bandit', 'skeleton-warrior', 'nomad-raider']) {
      expect(MONSTERS[id]?.tier).toBe('A');
    }
    expect(MONSTERS['goblin-shaman']?.missile).toMatchObject({ kind: 'fire', range: 18 });
    expect(MONSTERS['nomad-archer']?.missile).toMatchObject({ kind: 'arrow', range: 25 });
    expect(MONSTERS['skeleton-knight']?.special).toEqual({ kind: 'afraid', multiplier: 1 });
    expect(MONSTERS['skeleton-lord']?.special).toEqual({ kind: 'curse', multiplier: 2 });
    const warden = MONSTERS['skeleton-warden']!;
    expect(warden).toMatchObject({
      family: 'skeleton',
      tier: 'C',
      hp: 70,
      character: 'skeleton-warrior',
    });
    expect(warden.tint).toEqual(MONSTERS['skeleton-lord']!.tint);
    expect(Object.keys(MONSTERS)).toHaveLength(14);
  });

  it('flees by its AI type: a wimp at 30 %, normal at 20 %, aggressive at 10 %, suicidal never', () => {
    expect(FLEE_AT).toEqual({ wimp: 0.3, normal: 0.2, aggressive: 0.1, suicidal: 0 });
    expect(fleesAt(MONSTERS['goblin-scout']!)).toBe(0.3);
    expect(fleesAt(MONSTERS['bandit']!)).toBe(0.2);
    expect(fleesAt(MONSTERS['skeleton-warrior']!)).toBe(0.1);
    expect(fleesAt(MONSTERS['skeleton-lord']!)).toBe(0);
  });

  it("paces the swings by MM6's recovery at 60 units a second", () => {
    expect(MONSTERS['goblin-scout']!.attackEverySec).toBeCloseTo(100 / 60);
    expect(MONSTERS['skeleton-lord']!.attackEverySec).toBeCloseTo(80 / 60);
  });
});
