/**
 * Rest view-model (Phase 5 step 10): the clock, the food and the members as the rest screen
 * shows them, and the two actions, an eight-hour rest and a wait until dawn, applied to the
 * state through `src/game/rest.ts` and summarised in plain lines. The tavern room reuses the
 * summary.
 */
import { type Character, isLiving, maxHp, maxSp } from '../game/character';
import { type Affliction, CONDITION_DEFS, worstCondition } from '../game/conditions';
import { isHungry, type MemberRest, rest, type RestResult, waitUntilDawn } from '../game/rest';
import type { GameState } from '../game/state';
import { formatDate, formatTime, isDaylight, minutesUntilDawn } from '../game/time';
import type { RestKind } from './context';

export interface MemberLine {
  name: string;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  condition: string;
  living: boolean;
}

export interface RestView {
  time: string;
  date: string;
  daylight: boolean;
  food: number;
  /** No food: resting heals nothing and weakens the party. */
  hungry: boolean;
  dawnIn: string;
  members: MemberLine[];
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function memberLine(c: Character): MemberLine {
  return {
    name: c.name,
    hp: c.hp,
    maxHp: maxHp(c),
    sp: c.sp,
    maxSp: maxSp(c),
    condition: CONDITION_DEFS[worstCondition(c.conditions)].name,
    living: isLiving(c),
  };
}

export function restView(state: GameState): RestView {
  const minutes = state.clock.minutes;
  return {
    time: formatTime(minutes),
    date: formatDate(minutes),
    daylight: isDaylight(minutes),
    food: state.food,
    hungry: isHungry(state),
    dawnIn: formatDuration(minutesUntilDawn(minutes)),
    members: state.party.map(memberLine),
  };
}

function names(ids: readonly Affliction[]): string {
  return ids.map((id) => CONDITION_DEFS[id].name).join(', ');
}

function memberSummary(c: Character, m: MemberRest): string | null {
  const parts: string[] = [];
  if (m.healed > 0) parts.push(`heals ${m.healed} hit points`);
  if (m.spRestored > 0) parts.push(`regains ${m.spRestored} spell points`);
  if (m.cleared.length) parts.push(`${names(m.cleared)} passed`);
  if (m.worsened.length) parts.push(`${names(m.worsened)} worsened`);
  if (m.starved) parts.push('went hungry and is weak');
  return parts.length ? `${c.name} ${parts.join(', ')}.` : null;
}

/** Plain lines for a rest result; the first says what passed and what was eaten. */
export function restSummary(state: GameState, result: RestResult, room = false): string[] {
  const lines: string[] = [];
  if (room) lines.push('The party sleeps the night in a rented room.');
  else if (result.hungry) {
    lines.push('There is no food: the party rests hungry and grows weak.');
  } else lines.push('Eight hours pass; one food is eaten.');
  for (const m of result.members) {
    const c = state.party[m.index];
    if (!c) continue;
    const line = memberSummary(c, m);
    if (line) lines.push(line);
  }
  lines.push(`It is now ${formatTime(state.clock.minutes)}, ${formatDate(state.clock.minutes)}.`);
  return lines;
}

export interface RestSummary {
  kind: RestKind;
  lines: string[];
}

/** Eight hours of rest, applied to the state. */
export function doRest(state: GameState): RestSummary {
  const result = rest(state.party, state, state.clock);
  return { kind: 'rest', lines: restSummary(state, result) };
}

/** Wait until five in the morning, applied to the state. */
export function doWait(state: GameState): RestSummary {
  const minutes = waitUntilDawn(state.party, state.clock);
  return {
    kind: 'dawn',
    lines: [
      `You wait ${formatDuration(minutes)}; it is dawn.`,
      `It is now ${formatTime(state.clock.minutes)}, ${formatDate(state.clock.minutes)}.`,
    ],
  };
}

/** MM6's refusal when foes are about (interface.md 9.7: "no rest near foes"). */
export const HOSTILES_NEARBY = 'There are hostile creatures nearby!';

/** A rest or a wait as asked: done, or refused with the line to show and nothing changed. */
export type RestOutcome = { ok: true; summary: RestSummary } | { ok: false; message: string };

/**
 * Rest eight hours (`rest`) or wait until dawn (`dawn`), unless the runtime gives a reason the
 * party may not (`blocked`, from `ScreenHooks.restBlocked`): then the clock, the food and every
 * member stay as they are and the reason is the line to show (MM6's own when it is blank).
 */
export function tryRest(
  state: GameState,
  kind: 'rest' | 'dawn',
  blocked: string | null | undefined,
): RestOutcome {
  if (typeof blocked === 'string') {
    return { ok: false, message: blocked.trim() || HOSTILES_NEARBY };
  }
  return { ok: true, summary: kind === 'rest' ? doRest(state) : doWait(state) };
}
