import { describe, expect, it } from 'vitest';
import {
  afflict,
  canAct,
  canMove,
  CONDITION_DEFS,
  CONDITIONS,
  conditionLabel,
  type ConditionSet,
  conditionTone,
  cure,
  cureAll,
  damageConditions,
  damageFactor,
  effectiveStats,
  expireConditions,
  failChance,
  isAlive,
  restConditions,
  restHealFraction,
  restSpFraction,
  worstCondition,
} from './conditions';
import { SPELLS } from './spells';
import { stats } from './stats';

describe('condition table', () => {
  it('lists the fourteen MM6 states in order and names a real cure spell for each', () => {
    expect(CONDITIONS).toHaveLength(14);
    expect(CONDITIONS[0]).toBe('good');
    expect(CONDITIONS[13]).toBe('eradicated');
    for (const id of CONDITIONS) {
      const def = CONDITION_DEFS[id];
      expect(def.id).toBe(id);
      if (def.cure.spell) expect(SPELLS[def.cure.spell]).toBeDefined();
    }
  });

  it('reports the worst condition present', () => {
    const set: ConditionSet = {};
    expect(worstCondition(set)).toBe('good');
    afflict(set, 'weak', 0);
    afflict(set, 'poisoned', 0);
    expect(worstCondition(set)).toBe('poisoned');
    afflict(set, 'dead', 0);
    expect(worstCondition(set)).toBe('dead');
    expect(isAlive(set)).toBe(false);
  });
});

describe('acting and moving (characters.md 10.2)', () => {
  it('stops sleepers and the paralysed, lets the afraid act, and curses half the actions', () => {
    const set: ConditionSet = {};
    expect(canAct(set)).toBe(true);
    afflict(set, 'afraid', 0);
    expect(canAct(set)).toBe(true);
    expect(canMove(set)).toBe(true);
    cure(set, 'afraid');
    afflict(set, 'asleep', 0);
    expect(canAct(set)).toBe(false);
    expect(canMove(set)).toBe(false);
    expect(damageConditions(set)).toEqual(['asleep']);
    expect(canAct(set)).toBe(true);
    afflict(set, 'paralyzed', 0);
    expect(canAct(set)).toBe(false);
    cure(set, 'paralyzed');
    afflict(set, 'cursed', 0);
    expect(failChance(set)).toBe(0.5);
  });

  it('halves a weak member’s damage and nothing else', () => {
    const set: ConditionSet = {};
    expect(damageFactor(set)).toBe(1);
    afflict(set, 'weak', 0);
    expect(damageFactor(set)).toBe(0.5);
    expect(effectiveStats(stats({ might: 20 }), set).might).toBe(20);
  });

  it('runs out a condition only when its cause gave it a span, keeping the later end', () => {
    const set: ConditionSet = {};
    afflict(set, 'drunk', 0, { minutes: 60 });
    afflict(set, 'drunk', 10, { minutes: 20 });
    expect(set.drunk!.until).toBe(60);
    expect(expireConditions(set, 59)).toEqual([]);
    expect(expireConditions(set, 60)).toEqual(['drunk']);
    afflict(set, 'asleep', 0);
    afflict(set, 'weak', 0);
    expect(expireConditions(set, 99999)).toEqual([]);
  });
});

describe('MM6’s table (characters.md 10.2)', () => {
  it('sets the statistics by the displayed condition alone, at its level', () => {
    const set: ConditionSet = {};
    const base = stats({
      might: 20,
      intellect: 20,
      personality: 20,
      endurance: 20,
      accuracy: 20,
      speed: 20,
    });
    afflict(set, 'poisoned', 0);
    expect(effectiveStats(base, set)).toMatchObject({
      might: 15,
      endurance: 15,
      accuracy: 15,
      speed: 15,
      intellect: 20,
    });
    afflict(set, 'poisoned', 0, { severity: 2 });
    expect(set.poisoned!.severity).toBe(2);
    expect(effectiveStats(base, set)).toMatchObject({ might: 10, intellect: 15, personality: 15 });
    afflict(set, 'poisoned', 0, { severity: 1 });
    expect(set.poisoned!.severity).toBe(2);
    afflict(set, 'diseased', 0, { severity: 3 });
    // Disease is the worse: 10 % of the physical statistics, 30 % of the wits; poison no longer counts.
    expect(effectiveStats(base, set)).toMatchObject({ might: 2, intellect: 6, personality: 6 });
    expect(conditionLabel(set)).toBe('Diseased 3');
    expect(conditionTone(set)).toBe('red');
    cure(set, 'diseased');
    expect(conditionLabel(set)).toBe('Poisoned 2');
    expect(conditionTone(set)).toBe('yellow');
  });

  it('follows the table for Afraid, Drunk and Insane, never below one', () => {
    const base = stats({
      might: 10,
      intellect: 10,
      personality: 10,
      endurance: 10,
      accuracy: 10,
      speed: 10,
      luck: 10,
    });
    const afraid: ConditionSet = {};
    afflict(afraid, 'afraid', 0);
    expect(effectiveStats(base, afraid)).toEqual({
      ...base,
      might: 12,
      intellect: 5,
      personality: 5,
      accuracy: 5,
      speed: 12,
    });
    const drunk: ConditionSet = {};
    afflict(drunk, 'drunk', 0);
    expect(effectiveStats(base, drunk)).toEqual({
      ...base,
      might: 5,
      intellect: 2,
      personality: 2,
      endurance: 5,
      accuracy: 1,
      speed: 2,
      luck: 20,
    });
    const insane: ConditionSet = {};
    afflict(insane, 'insane', 0);
    expect(effectiveStats(stats({ might: 10, intellect: 1 }), insane)).toMatchObject({
      might: 20,
      intellect: 1,
      endurance: 18,
      speed: 14,
    });
    expect(conditionTone(afraid)).toBe('green');
  });

  it('rests to a half, a third or a quarter when poisoned or diseased, and insane to no spell points', () => {
    const set: ConditionSet = {};
    expect(restHealFraction(set)).toBe(1);
    expect(restSpFraction(set)).toBe(1);
    afflict(set, 'poisoned', 0);
    expect(restHealFraction(set)).toBe(1 / 2);
    afflict(set, 'diseased', 0, { severity: 2 });
    expect(restHealFraction(set)).toBe(1 / 3);
    afflict(set, 'poisoned', 0, { severity: 3 });
    expect(restHealFraction(set)).toBe(1 / 4);
    afflict(set, 'insane', 0);
    expect(restSpFraction(set)).toBe(0);
  });

  it('rest clears Asleep, Afraid, Drunk and Weak; cureAll clears everything', () => {
    const set: ConditionSet = {};
    afflict(set, 'asleep', 0);
    afflict(set, 'afraid', 0);
    afflict(set, 'weak', 0);
    afflict(set, 'cursed', 0);
    afflict(set, 'unconscious', 0);
    expect(restConditions(set).sort()).toEqual(['afraid', 'asleep', 'weak']);
    expect(cureAll(set).sort()).toEqual(['cursed', 'unconscious']);
    expect(worstCondition(set)).toBe('good');
    expect(conditionTone(set)).toBe('good');
  });
});
