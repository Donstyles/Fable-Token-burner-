import { describe, expect, it } from 'vitest';
import type { DialogueDef } from '../game/dialogue';
import { freshState } from '../game/fixtures';
import { START_MINUTES } from '../game/time';
import { calendarView, moonOn, noteRows, takeNote } from './books-model';

const DEFS: Record<string, DialogueDef> = {
  a: {
    npc: 'a',
    role: 'Farmer',
    greeting: '',
    topics: [
      { kind: 'say', id: 'x', label: 'X', text: 'x', note: 'Note X' },
      { kind: 'say', id: 'y', label: 'Y', text: 'y', note: 'Note Y' },
      { kind: 'say', id: 'z', label: 'Z', text: 'z' },
    ],
  },
};

describe('the notes', () => {
  it('are made once each and listed in the order they were made', () => {
    const s = freshState();
    expect(noteRows(s, DEFS)).toEqual([]);
    expect(takeNote(s, 'a', 'y')).toBe(true);
    expect(takeNote(s, 'a', 'x')).toBe(true);
    expect(takeNote(s, 'a', 'y')).toBe(false);
    expect(noteRows(s, DEFS, { a: 'Tobin' })).toEqual([
      { from: 'Tobin', text: 'Note Y' },
      { from: 'Tobin', text: 'Note X' },
    ]);
  });
});

describe('the calendar', () => {
  it('lays the month out in four weeks from Monday, today marked', () => {
    const v = calendarView(START_MINUTES + 9 * 24 * 60 + 12);
    expect(v.title).toBe('January 1165');
    expect(v.weeks).toHaveLength(4);
    expect(v.weeks.every((w) => w.length === 7)).toBe(true);
    expect(v.weeks[1]![2]!.day).toBe(10);
    expect(
      v.weeks
        .flat()
        .filter((d) => d.today)
        .map((d) => d.day),
    ).toEqual([10]);
    expect(v.time).toBe('9:12 am');
  });

  it('marks the moon’s four quarters', () => {
    expect([1, 8, 15, 22].map(moonOn)).toEqual(['new', 'first', 'full', 'last']);
    expect(moonOn(2)).toBeNull();
  });

  it('gives the afternoon and midnight on the twelve-hour clock', () => {
    expect(calendarView(13 * 60 + 5).time).toBe('1:05 pm');
    expect(calendarView(0).time).toBe('12:00 am');
  });
});
