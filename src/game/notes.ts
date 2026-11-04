/**
 * The party's book of notes (DESIGN.md 16.34, MM6's autonotes): a note is made once when
 * someone tells the party a thing worth keeping (a topic's `note`, dialogue.ts) or the party
 * reads it off a stone (sites.ts), and kept in the state's flags in the order it was made, so
 * a save carries it. `src/ui/books-model.ts` lists them.
 */
import type { GameState } from './state';

/** The flag a note sets when it is made, and the one that counts them. */
export const noteFlag = (from: string, topic: string): string => `note:${from}/${topic}`;
export const NOTE_COUNT = 'notes';

/** Make the note, once: true when it is new. */
export function takeNote(state: GameState, from: string, topic: string): boolean {
  const key = noteFlag(from, topic);
  if (state.flags[key]) return false;
  const n = (state.flags[NOTE_COUNT] ?? 0) + 1;
  state.flags[NOTE_COUNT] = n;
  state.flags[key] = n;
  return true;
}

/** When the note was made (its number), or 0 when it was not. */
export function noteOrder(state: GameState, from: string, topic: string): number {
  return state.flags[noteFlag(from, topic)] ?? 0;
}
