/**
 * Autosave (DESIGN.md 16.6): the game state in the browser's storage, written when a screen
 * closes, after a rest, before the party steps through a portal, and once a minute on the
 * walk; read back when the next level loads so the party, its gold, its clock and its
 * quests travel with it. One slot; a corrupt or older file is ignored, never crashed on.
 */
import { fromJson, toJson } from '../game/save';
import type { GameState } from '../game/state';
import { diag } from './diag';

const KEY = 'ftb-autosave';

export function saveGame(state: GameState): boolean {
  try {
    localStorage.setItem(KEY, toJson(state, Date.now()));
    return true;
  } catch (e) {
    diag(`autosave failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return null;
    const result = fromJson(text);
    if (!result.ok) {
      diag(`autosave ignored: ${result.error}`);
      return null;
    }
    return result.state;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage may be unavailable; nothing to clear then.
  }
}
