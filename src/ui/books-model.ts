/**
 * The notes and the calendar (DESIGN.md 16.34), MM6's second and fourth books: the notes the
 * party has made as people told it things (a topic's `note`, src/game/dialogue.ts), oldest
 * first; and the month as MM6's calendar laid it out, four weeks of seven days, today marked,
 * the moon's four quarters on their days. Pure; `books.ts` draws them.
 */
import type { DialogueDef } from '../game/dialogue';
import type { GameState } from '../game/state';
import { DAYS_PER_MONTH, DAYS_PER_WEEK, gameDate, MONTH_NAMES } from '../game/time';

/** The flag a note sets when it is made, and the one that counts them. */
export const noteFlag = (npc: string, topic: string): string => `note:${npc}/${topic}`;
export const NOTE_COUNT = 'notes';

/** Make the note a topic carries, once: true when it is new. */
export function takeNote(state: GameState, npc: string, topic: string): boolean {
  const key = noteFlag(npc, topic);
  if (state.flags[key]) return false;
  const n = (state.flags[NOTE_COUNT] ?? 0) + 1;
  state.flags[NOTE_COUNT] = n;
  state.flags[key] = n;
  return true;
}

export interface NoteRow {
  /** Who told the party. */
  from: string;
  text: string;
}

/** The notes made, in the order they were made. */
export function noteRows(
  state: GameState,
  dialogues: Readonly<Record<string, DialogueDef>>,
  names: Readonly<Record<string, string>> = {},
): NoteRow[] {
  const rows: { n: number; row: NoteRow }[] = [];
  for (const def of Object.values(dialogues)) {
    for (const t of def.topics) {
      if (t.kind !== 'say' || !t.note) continue;
      const n = state.flags[noteFlag(def.npc, t.id)];
      if (n) rows.push({ n, row: { from: names[def.npc] ?? def.role, text: t.note } });
    }
  }
  return rows.sort((a, b) => a.n - b.n).map((r) => r.row);
}

/** The moon's quarters, as MM6's calendar marked them. */
export type MoonPhase = 'new' | 'first' | 'full' | 'last';

/** The moon on a day of the month (1 to 28): a quarter every seven days from the new moon. */
export function moonOn(day: number): MoonPhase | null {
  if (day === 1) return 'new';
  if (day === 8) return 'first';
  if (day === 15) return 'full';
  if (day === 22) return 'last';
  return null;
}

export interface CalendarView {
  /** "January 1165". */
  title: string;
  /** Four weeks of seven days, Monday first: each day's number and moon. */
  weeks: { day: number; moon: MoonPhase | null; today: boolean }[][];
  /** The hour as MM6's calendar gave it: "9:12 am". */
  time: string;
}

export function calendarView(minutes: number): CalendarView {
  const d = gameDate(minutes);
  const weeks: CalendarView['weeks'] = [];
  for (let w = 0; w < DAYS_PER_MONTH / DAYS_PER_WEEK; w++) {
    const row: CalendarView['weeks'][number] = [];
    for (let k = 0; k < DAYS_PER_WEEK; k++) {
      const day = w * DAYS_PER_WEEK + k + 1;
      row.push({ day, moon: moonOn(day), today: day === d.day });
    }
    weeks.push(row);
  }
  const h12 = d.hour % 12 === 0 ? 12 : d.hour % 12;
  return {
    title: `${MONTH_NAMES[d.month]} ${d.year}`,
    weeks,
    time: `${h12}:${String(d.minute).padStart(2, '0')} ${d.hour < 12 ? 'am' : 'pm'}`,
  };
}
