import { describe, expect, it } from 'vitest';
import {
  baseHp,
  baseSp,
  canLearn,
  CLASS_DEFS,
  CLASSES,
  classDef,
  classSchools,
  levelGains,
  maxRank,
} from './classes';
import { STATS } from './stats';

describe('class table', () => {
  it('defines six classes whose starting skills are learnable and distinct', () => {
    expect(CLASSES).toHaveLength(6);
    for (const id of CLASSES) {
      const cls = CLASS_DEFS[id];
      expect(cls.id).toBe(id);
      const [a, b] = cls.fixedSkills;
      expect(a).not.toBe(b);
      expect(canLearn(cls, a)).toBe(true);
      expect(canLearn(cls, b)).toBe(true);
      for (const s of cls.optionalSkills) {
        expect(canLearn(cls, s)).toBe(true);
        expect(cls.fixedSkills).not.toContain(s);
      }
      expect(new Set(cls.optionalSkills).size).toBe(cls.optionalSkills.length);
      for (const stat of STATS) expect(cls.baseStats[stat]).toBeGreaterThanOrEqual(7);
    }
  });

  it('keeps magic from knights and plate from casters', () => {
    expect(classSchools(classDef('knight'))).toEqual([]);
    expect(canLearn(classDef('knight'), 'meditation')).toBe(false);
    expect(classSchools(classDef('sorcerer'))).toEqual(['fire', 'air', 'water', 'earth']);
    expect(classSchools(classDef('cleric'))).toEqual(['spirit', 'mind', 'body']);
    expect(classSchools(classDef('druid'))).toHaveLength(7);
    expect(canLearn(classDef('sorcerer'), 'plate')).toBe(false);
    expect(maxRank(classDef('paladin'), 'dagger')).toBe('expert');
    expect(maxRank(classDef('knight'), 'plate')).toBe('master');
  });
});

describe('hit and spell points', () => {
  it('follow base + (level + bonus) × factor', () => {
    const knight = classDef('knight');
    expect(baseHp(knight, 1, 2)).toBe(30 + 3 * 5);
    expect(baseSp(knight, 5, 3)).toBe(0);
    const sorcerer = classDef('sorcerer');
    expect(baseHp(sorcerer, 1, 0)).toBe(17);
    expect(baseSp(sorcerer, 1, 3)).toBe(10 + 4 * 3);
    expect(levelGains(sorcerer)).toEqual({ hp: 2, sp: 3 });
    expect(classDef('druid').spStats).toEqual(['intellect', 'personality']);
  });
});
