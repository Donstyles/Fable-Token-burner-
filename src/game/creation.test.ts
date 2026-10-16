import { describe, expect, it } from 'vitest';
import { maxHp, maxSp } from './character';
import {
  createCharacter,
  CREATION_POOL,
  defaultCreation,
  pointsLeft,
  statRange,
  validateCreation,
} from './creation';
import { knightInput, sorcererInput, testCharacters } from './fixtures';

describe('creation defaults', () => {
  it('starts at the class base with the pool untouched', () => {
    const input = defaultCreation('knight');
    expect(pointsLeft('knight', input.stats)).toBe(CREATION_POOL);
    expect(statRange('knight', 'might')).toEqual({ min: 12, max: 32 });
    expect(
      validateCreation(input)
        .map((e) => e.kind)
        .sort(),
    ).toEqual(['name-empty', 'pool-unspent', 'portrait-empty', 'skill-count']);
  });
});

describe('validation', () => {
  it('reports every problem as a value', () => {
    const input = knightInput();
    input.name = 'A name far too long for the sheet';
    input.stats.might = 33;
    input.stats.luck = 1;
    input.skillPicks = ['sword', 'fire', 'axe', 'axe'];
    const errors = validateCreation(input);
    expect(errors).toContainEqual({ kind: 'name-too-long', max: 15 });
    expect(errors).toContainEqual({
      kind: 'stat-out-of-range',
      stat: 'might',
      min: 12,
      max: 32,
      value: 33,
    });
    expect(errors).toContainEqual({
      kind: 'stat-out-of-range',
      stat: 'luck',
      min: 2,
      max: 22,
      value: 1,
    });
    expect(errors).toContainEqual({ kind: 'skill-count', expected: 2, got: 4 });
    expect(errors).toContainEqual({ kind: 'skill-fixed', skill: 'sword' });
    expect(errors).toContainEqual({ kind: 'skill-not-allowed', skill: 'fire' });
    expect(errors).toContainEqual({ kind: 'skill-duplicate', skill: 'axe' });
    expect(errors.find((e) => e.kind === 'pool-overspent' || e.kind === 'pool-unspent')).toEqual({
      kind: 'pool-unspent',
      remaining: 5,
    });
    expect(createCharacter(input).ok).toBe(false);
  });

  it('lets a lowered statistic pay for a raised one', () => {
    const input = knightInput();
    input.stats.luck = 2;
    input.stats.might = 32;
    input.stats.intellect = 12;
    expect(validateCreation(input)).toEqual([]);
  });
});

describe('createCharacter', () => {
  it('builds a level-1 knight with fixed and picked skills and full hit points', () => {
    const r = createCharacter(knightInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = r.character;
    expect(c.level).toBe(1);
    expect(c.age).toBe(20);
    expect(c.xp).toBe(0);
    expect(c.skillPoints).toBe(0);
    expect(Object.keys(c.skills).sort()).toEqual(['axe', 'leather', 'shield', 'sword']);
    expect(c.hp).toBe(maxHp(c));
    expect(c.hp).toBe(30 + (1 + 7) * 5);
    expect(c.sp).toBe(0);
    expect(c.spells).toEqual([]);
    expect(c.grid.items).toEqual([]);
    expect(c.equipment).toEqual({});
  });

  it('gives a sorcerer the first spell of each starting school', () => {
    const r = createCharacter(sorcererInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = r.character;
    expect(c.sex).toBe('female');
    expect(c.spells).toEqual(['torch-light', 'wizard-eye']);
    expect(c.sp).toBe(maxSp(c));
    expect(c.sp).toBe(10 + (1 + 7) * 3 + 1);
    expect(c.hp).toBe(15 + (1 + 5) * 2);
  });

  it('builds the four test characters', () => {
    const party = testCharacters();
    expect(party.map((c) => c.classId)).toEqual(['knight', 'archer', 'cleric', 'sorcerer']);
    expect(party[2]!.spells.sort()).toEqual(['cure-weakness', 'spirit-arrow']);
  });
});
