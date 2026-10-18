import { describe, expect, it } from 'vitest';
import {
  advanceClock,
  createClock,
  daylightFactor,
  formatDate,
  formatTime,
  gameDate,
  isDaylight,
  MINUTES_PER_DAY,
  minutesUntilDawn,
  START_MINUTES,
} from './time';

describe('game clock', () => {
  it('starts at nine on the first of January 1165, a Monday', () => {
    const clock = createClock();
    expect(clock.minutes).toBe(START_MINUTES);
    expect(formatTime(clock.minutes)).toBe('09:00');
    expect(formatDate(clock.minutes)).toBe('Monday, 1 January 1165');
  });

  it('advances through 28-day months and 336-day years', () => {
    const clock = createClock(0);
    advanceClock(clock, 28 * MINUTES_PER_DAY + 90);
    const d = gameDate(clock.minutes);
    expect(d).toEqual({ year: 1165, month: 1, day: 1, weekday: 0, hour: 1, minute: 30 });
    advanceClock(clock, 335 * MINUTES_PER_DAY);
    expect(gameDate(clock.minutes).year).toBe(1166);
    expect(gameDate(clock.minutes).month).toBe(0);
    expect(gameDate(clock.minutes).day).toBe(28);
    advanceClock(clock, -50);
    expect(gameDate(clock.minutes).minute).toBe(30);
  });

  it('adds up fractions of a minute, as the world advances it a frame at a time', () => {
    const clock = createClock();
    // Sixty frames a second at one game minute a real second, for ten seconds.
    for (let i = 0; i < 600; i++) advanceClock(clock, 1 / 60);
    expect(clock.minutes).toBeGreaterThanOrEqual(START_MINUTES + 9);
    expect(clock.minutes).toBeLessThanOrEqual(START_MINUTES + 10);
    expect(Number.isInteger(clock.minutes)).toBe(true);
  });

  it('is light from five to nine and knows the way to dawn', () => {
    expect(isDaylight(5 * 60)).toBe(true);
    expect(isDaylight(5 * 60 - 1)).toBe(false);
    expect(isDaylight(21 * 60 - 1)).toBe(true);
    expect(isDaylight(21 * 60)).toBe(false);
    expect(minutesUntilDawn(3 * 60)).toBe(120);
    expect(minutesUntilDawn(5 * 60)).toBe(MINUTES_PER_DAY);
    expect(minutesUntilDawn(22 * 60)).toBe(7 * 60);
    expect(daylightFactor(12 * 60)).toBe(1);
    expect(daylightFactor(0)).toBe(0);
    expect(daylightFactor(5 * 60)).toBeCloseTo(0.5);
    expect(daylightFactor(21 * 60)).toBeCloseTo(0.5);
  });
});
