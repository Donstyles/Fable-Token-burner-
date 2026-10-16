import { describe, expect, it } from 'vitest';
import { afflict } from '../game/conditions';
import { freshState } from '../game/fixtures';
import { doRest, doWait, formatDuration, restView } from './rest-model';

describe('rest view', () => {
  it('shows the clock, the food and the members', () => {
    const state = freshState();
    const v = restView(state);
    expect(v.time).toBe('09:00');
    expect(v.date).toBe('Monday, 1 January 1165');
    expect(v.daylight).toBe(true);
    expect(v.food).toBe(7);
    expect(v.hungry).toBe(false);
    expect(v.dawnIn).toBe('20 h 0 min');
    expect(v.members).toHaveLength(4);
    expect(v.members[0]).toMatchObject({ name: 'Alric', condition: 'Good', living: true });
    expect(v.members[0]!.hp).toBe(v.members[0]!.maxHp);
  });

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h 0 min');
    expect(formatDuration(725)).toBe('12 h 5 min');
  });
});

describe('resting and waiting', () => {
  it('rests eight hours on one food and heals', () => {
    const state = freshState();
    const knight = state.party[0]!;
    knight.hp -= 5;
    afflict(knight.conditions, 'asleep', 0);
    const s = doRest(state);
    expect(s.kind).toBe('rest');
    expect(state.food).toBe(6);
    expect(state.clock.minutes).toBe(17 * 60);
    expect(s.lines[0]).toBe('Eight hours pass; one food is eaten.');
    expect(s.lines[1]).toBe('Alric heals 5 hit points, Asleep passed.');
    expect(s.lines.at(-1)).toBe('It is now 17:00, Monday, 1 January 1165.');
  });

  it('rests hungry without food', () => {
    const state = freshState();
    state.food = 0;
    state.party[0]!.hp -= 5;
    const s = doRest(state);
    expect(s.lines[0]).toBe('There is no food: the party rests hungry and grows weak.');
    expect(s.lines[1]).toBe('Alric went hungry and is weak.');
    expect(state.party[0]!.conditions.weak).toBeDefined();
    expect(restView(state).hungry).toBe(true);
  });

  it('waits until dawn', () => {
    const state = freshState();
    state.clock.minutes = 17 * 60;
    const s = doWait(state);
    expect(s.kind).toBe('dawn');
    expect(s.lines[0]).toBe('You wait 12 h 0 min; it is dawn.');
    expect(state.clock.minutes).toBe(24 * 60 + 5 * 60);
    expect(restView(state).time).toBe('05:00');
    expect(restView(state).date).toBe('Tuesday, 2 January 1165');
  });
});
