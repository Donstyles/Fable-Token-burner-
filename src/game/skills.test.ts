import { describe, expect, it } from 'vitest';
import {
  canPromote,
  learnSkill,
  promoteSkill,
  raiseCost,
  raiseSkill,
  SKILLS,
  SKILL_NAMES,
  skillBonus,
  skillGroup,
  type SkillSet,
} from './skills';

describe('skill list', () => {
  it('has the 26 skills in four groups with names', () => {
    expect(SKILLS).toHaveLength(26);
    expect(new Set(SKILLS).size).toBe(26);
    for (const s of SKILLS) expect(SKILL_NAMES[s].length).toBeGreaterThan(0);
    expect(skillGroup('sword')).toBe('weapon');
    expect(skillGroup('plate')).toBe('armor');
    expect(skillGroup('spirit')).toBe('magic');
    expect(skillGroup('learning')).toBe('misc');
  });
});

describe('raising skills', () => {
  it('costs the new level in skill points', () => {
    expect(raiseCost(1)).toBe(2);
    expect(raiseCost(4)).toBe(5);
    const set: SkillSet = {};
    expect(raiseSkill(set, 'sword', 10)).toEqual({ ok: false, reason: 'not-learnt' });
    expect(learnSkill(set, 'sword')).toBe(true);
    expect(learnSkill(set, 'sword')).toBe(false);
    expect(raiseSkill(set, 'sword', 1)).toEqual({ ok: false, reason: 'points' });
    expect(raiseSkill(set, 'sword', 5)).toEqual({ ok: true, level: 2, pointsLeft: 3 });
    expect(raiseSkill(set, 'sword', 3)).toEqual({ ok: true, level: 3, pointsLeft: 0 });
  });

  it('scales the bonus by rank', () => {
    const set: SkillSet = { bodybuilding: { level: 3, rank: 'expert' } };
    expect(skillBonus(set, 'bodybuilding')).toBe(6);
    expect(skillBonus(set, 'merchant')).toBe(0);
  });
});

describe('promotions', () => {
  it('needs level 4 and 1000 gold for Expert, then level 7 and 2000 for Master', () => {
    const set: SkillSet = { sword: { level: 3, rank: 'normal' } };
    expect(canPromote(set, 'sword', 'expert', 5000, 'master')).toEqual({
      ok: false,
      reason: 'level',
    });
    set.sword!.level = 4;
    expect(canPromote(set, 'sword', 'expert', 500, 'master')).toEqual({
      ok: false,
      reason: 'gold',
    });
    expect(canPromote(set, 'sword', 'master', 5000, 'master')).toEqual({
      ok: false,
      reason: 'order',
    });
    expect(promoteSkill(set, 'sword', 'expert', 1000, 'master')).toEqual({
      ok: true,
      rank: 'expert',
      price: 1000,
    });
    expect(set.sword!.rank).toBe('expert');
    expect(canPromote(set, 'sword', 'expert', 5000, 'master')).toEqual({
      ok: false,
      reason: 'already',
    });
    set.sword!.level = 7;
    expect(canPromote(set, 'sword', 'master', 2000, 'expert')).toEqual({
      ok: false,
      reason: 'class',
    });
    expect(canPromote(set, 'sword', 'master', 2000, 'master').ok).toBe(true);
    expect(canPromote(set, 'axe', 'expert', 2000, 'master')).toEqual({
      ok: false,
      reason: 'not-learnt',
    });
  });
});
