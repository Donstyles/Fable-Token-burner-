/**
 * The game clock (Phase 5 step 3). Time is counted in game minutes from the MM6 epoch, the
 * first of January 1165 at midnight; a new game starts at nine in the morning. MM6's calendar
 * has twelve months of four seven-day weeks (336 days a year). It is light from five in the
 * morning until nine in the evening, the MM6 day. Everything here is pure arithmetic.
 */
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;
export const DAYS_PER_WEEK = 7;
export const DAYS_PER_MONTH = 28;
export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
export const MINUTES_PER_YEAR = DAYS_PER_YEAR * MINUTES_PER_DAY;

export const DAWN_HOUR = 5;
export const DUSK_HOUR = 21;

export const START_YEAR = 1165;
/** A new game begins at 09:00 on day one. */
export const START_MINUTES = 9 * MINUTES_PER_HOUR;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export interface GameClock {
  /** Game minutes since the epoch. */
  minutes: number;
}

export function createClock(minutes = START_MINUTES): GameClock {
  return { minutes };
}

export function advanceClock(clock: GameClock, minutes: number): void {
  clock.minutes += Math.max(0, Math.floor(minutes));
}

export interface GameDate {
  year: number;
  /** 0 to 11. */
  month: number;
  /** 1 to 28. */
  day: number;
  /** 0 is Monday. */
  weekday: number;
  hour: number;
  minute: number;
}

export function gameDate(minutes: number): GameDate {
  const totalDays = Math.floor(minutes / MINUTES_PER_DAY);
  const minuteOfDay = minutes - totalDays * MINUTES_PER_DAY;
  return {
    year: START_YEAR + Math.floor(totalDays / DAYS_PER_YEAR),
    month: Math.floor((totalDays % DAYS_PER_YEAR) / DAYS_PER_MONTH),
    day: (totalDays % DAYS_PER_MONTH) + 1,
    weekday: totalDays % DAYS_PER_WEEK,
    hour: Math.floor(minuteOfDay / MINUTES_PER_HOUR),
    minute: minuteOfDay % MINUTES_PER_HOUR,
  };
}

export function minuteOfDay(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function isDaylight(minutes: number): boolean {
  const m = minuteOfDay(minutes);
  return m >= DAWN_HOUR * MINUTES_PER_HOUR && m < DUSK_HOUR * MINUTES_PER_HOUR;
}

/** Minutes to the next dawn, a full day when it is dawn now. */
export function minutesUntilDawn(minutes: number): number {
  const dawn = DAWN_HOUR * MINUTES_PER_HOUR;
  const m = minuteOfDay(minutes);
  return m < dawn ? dawn - m : MINUTES_PER_DAY - m + dawn;
}

/** Sunlight as a 0 to 1 factor with half-hour ramps at dawn and dusk, for the renderer. */
export function daylightFactor(minutes: number): number {
  const m = minuteOfDay(minutes) / MINUTES_PER_HOUR;
  const ramp = 0.5;
  if (m < DAWN_HOUR - ramp || m >= DUSK_HOUR + ramp) return 0;
  if (m < DAWN_HOUR + ramp) return (m - (DAWN_HOUR - ramp)) / (2 * ramp);
  if (m >= DUSK_HOUR - ramp) return 1 - (m - (DUSK_HOUR - ramp)) / (2 * ramp);
  return 1;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatTime(minutes: number): string {
  const d = gameDate(minutes);
  return `${pad(d.hour)}:${pad(d.minute)}`;
}

export function formatDate(minutes: number): string {
  const d = gameDate(minutes);
  return `${WEEKDAY_NAMES[d.weekday]}, ${d.day} ${MONTH_NAMES[d.month]} ${d.year}`;
}
