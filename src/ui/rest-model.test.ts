import { describe, expect, it } from 'vitest';
import { afflict } from '../game/conditions';
import { freshState } from '../game/fixtures';
import { doRest, doWait, formatDuration, HOSTILES_NEARBY, restView, tryRest } from './rest-model';

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

describe('no rest with foes about', () => {
  /** What a refused rest must leave alone: the clock, the food and every member. */
  const snapshot = (state: ReturnType<typeof freshState>): string =>
    JSON.stringify({ clock: state.clock, food: state.food, gold: state.gold, party: state.party });

  it("refuses a rest and a wait with the runtime's line and changes nothing", () => {
    const state = freshState();
    state.party[0]!.hp -= 5;
    state.party[3]!.sp -= 4;
    afflict(state.party[1]!.conditions, 'asleep', 0);
    const before = snapshot(state);
    for (const kind of ['rest', 'dawn'] as const) {
      const r = tryRest(state, kind, HOSTILES_NEARBY);
      expect(r).toEqual({ ok: false, message: 'There are hostile creatures nearby!' });
      expect(snapshot(state)).toBe(before);
    }
    expect(state.clock.minutes).toBe(9 * 60);
    expect(state.food).toBe(7);
  });

  it("gives MM6's own line for a blank reason", () => {
    const state = freshState();
    expect(tryRest(state, 'rest', '  ')).toEqual({ ok: false, message: HOSTILES_NEARBY });
    expect(state.food).toBe(7);
  });

  it('rests and waits as before when nothing blocks', () => {
    const state = freshState();
    const rested = tryRest(state, 'rest', null);
    expect(rested.ok && rested.summary.kind).toBe('rest');
    expect(state.food).toBe(6);
    expect(state.clock.minutes).toBe(17 * 60);
    const waited = tryRest(state, 'dawn', undefined);
    expect(waited.ok && waited.summary.kind).toBe('dawn');
    expect(restView(state).time).toBe('05:00');
  });
});

describe("MM6's waits without healing", () => {
  it('passes an hour or five minutes and heals nothing', () => {
    const s = freshState();
    const hp = s.party[0]!.hp;
    s.party[0]!.hp = Math.max(1, hp - 5);
    const before = s.clock.minutes;
    const hour = tryRest(s, 'hour', null);
    expect(hour.ok).toBe(true);
    expect(s.clock.minutes).toBe(before + 60);
    expect(s.party[0]!.hp).toBe(Math.max(1, hp - 5));
    tryRest(s, 'minutes', null);
    expect(s.clock.minutes).toBe(before + 65);
  });

  it('is refused with foes about, as resting is', () => {
    const s = freshState();
    const before = s.clock.minutes;
    expect(tryRest(s, 'hour', '').ok).toBe(false);
    expect(s.clock.minutes).toBe(before);
  });

  it("gives the hourglass box MM6's clock and date", () => {
    const s = freshState();
    s.clock.minutes = 9 * 60 + 12;
    const v = restView(s);
    expect([v.clock12, v.day, v.month, v.year]).toEqual(['9:12 am', 1, 1, 1165]);
  });
});
