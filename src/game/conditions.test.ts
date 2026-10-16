import { describe, expect, it } from 'vitest';
import {
  afflict,
  canAct,
  canMove,
  CONDITION_DEFS,
  CONDITIONS,
  type ConditionSet,
  cure,
  cureAll,
  damageConditions,
  effectiveStats,
  expireConditions,
  failChance,
  isAlive,
  restConditions,
  worsenConditions,
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

describe('acting and moving', () => {
  it('stops sleepers and the paralysed, lets the afraid walk, and curses half the actions', () => {
    const set: ConditionSet = {};
    expect(canAct(set)).toBe(true);
    afflict(set, 'afraid', 0, { minutes: 30 });
    expect(canAct(set)).toBe(false);
    expect(canMove(set)).toBe(true);
    cure(set, 'afraid');
    afflict(set, 'asleep', 0, { minutes: 60 });
    expect(canMove(set)).toBe(false);
    expect(damageConditions(set)).toEqual(['asleep']);
    expect(canAct(set)).toBe(true);
    afflict(set, 'cursed', 0);
    expect(failChance(set)).toBe(0.5);
  });

  it('expires timed conditions and keeps the later end', () => {
    const set: ConditionSet = {};
    afflict(set, 'drunk', 0, { minutes: 60 });
    afflict(set, 'drunk', 10, { minutes: 20 });
    expect(set.drunk!.until).toBe(60);
    expect(expireConditions(set, 59)).toEqual([]);
    expect(expireConditions(set, 60)).toEqual(['drunk']);
    afflict(set, 'weak', 0);
    expect(expireConditions(set, 99999)).toEqual([]);
  });
});

describe('severity and stats', () => {
  it('worsens poison on rest up to the cap and scales the penalty', () => {
    const set: ConditionSet = {};
    afflict(set, 'poisoned', 0);
    const base = stats({ might: 20 });
    expect(effectiveStats(base, set).might).toBe(17);
    expect(worsenConditions(set)).toEqual(['poisoned']);
    expect(effectiveStats(base, set).might).toBe(14);
    worsenConditions(set);
    expect(worsenConditions(set)).toEqual([]);
    expect(set.poisoned!.severity).toBe(3);
    expect(effectiveStats(base, set).might).toBe(11);
  });

  it('raises Might and lowers wits when insane, never below one', () => {
    const set: ConditionSet = {};
    afflict(set, 'insane', 0);
    const s = effectiveStats(stats({ might: 10, intellect: 1 }), set);
    expect(s.might).toBe(15);
    expect(s.intellect).toBe(1);
    expect(s.luck).toBe(12);
  });

  it('rest clears what time clears and cureAll clears everything', () => {
    const set: ConditionSet = {};
    afflict(set, 'asleep', 0, { minutes: 10 });
    afflict(set, 'weak', 0);
    afflict(set, 'unconscious', 0);
    expect(restConditions(set).sort()).toEqual(['asleep']);
    expect(cureAll(set).sort()).toEqual(['unconscious', 'weak']);
    expect(worstCondition(set)).toBe('good');
  });
});
