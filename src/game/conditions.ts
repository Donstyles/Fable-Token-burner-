/**
 * Conditions (Phase 5 step 1). MM6's fourteen states in its order of severity; a character's
 * displayed condition is the worst one present. Which states stop a character from acting and
 * which are cured by rest, a spell or a temple follow MM6. The statistic penalties are ours:
 * MM6 reduces statistics by condition but the community has no agreed table, so each
 * affliction keeps a fraction of the affected statistics (Poisoned and Diseased grow more
 * severe with every rest, 1 to 3, and their penalty with them). Cursed makes half of all
 * actions fail, the MM6 rule. Asleep, Afraid and Drunk pass with time and with a rest;
 * Unconscious ends when healing lifts the hit points above zero (a fed rest does); Weak and the
 * rest need a cure. Simplification: Dead needs no body count, so Eradicated differs only in its
 * cure.
 */
import type { SpellId } from './spells';
import { STATS, type Stat, type Stats } from './stats';

export const CONDITIONS = [
  'good',
  'cursed',
  'weak',
  'asleep',
  'afraid',
  'drunk',
  'insane',
  'poisoned',
  'diseased',
  'paralyzed',
  'unconscious',
  'dead',
  'stoned',
  'eradicated',
] as const;
export type ConditionId = (typeof CONDITIONS)[number];
export type Affliction = Exclude<ConditionId, 'good'>;

export interface ConditionDef {
  id: ConditionId;
  name: string;
  /** Can the character attack, cast and use items? */
  canAct: boolean;
  /** Can the character walk with the party (Afraid can; Asleep cannot)? */
  canMove: boolean;
  /** Fraction of each listed statistic that remains; multiplied by severity for worsening ones. */
  statFactors: Partial<Record<Stat, number>>;
  /** Chance that an action fails outright. */
  failChance: number;
  /** Ends when its time is up. */
  timed: boolean;
  /** Grows one step more severe at every rest, to 3. */
  worsens: boolean;
  /** A full rest clears it. */
  restClears: boolean;
  /** Taking damage clears it. */
  damageClears: boolean;
  /** Cures beyond rest: the MM6 spell and whether a temple can do it. */
  cure: { spell?: SpellId; temple: boolean };
  /** Is the character alive in the sense of counting towards the party's survival? */
  alive: boolean;
}

const ALL_STATS = (factor: number): Partial<Record<Stat, number>> => {
  const f: Partial<Record<Stat, number>> = {};
  for (const s of STATS) f[s] = factor;
  return f;
};

const BASE: Omit<ConditionDef, 'id' | 'name' | 'cure'> = {
  canAct: true,
  canMove: true,
  statFactors: {},
  failChance: 0,
  timed: false,
  worsens: false,
  restClears: false,
  damageClears: false,
  alive: true,
};

export const CONDITION_DEFS: Record<ConditionId, ConditionDef> = {
  good: { ...BASE, id: 'good', name: 'Good', cure: { temple: false } },
  cursed: {
    ...BASE,
    id: 'cursed',
    name: 'Cursed',
    failChance: 0.5,
    cure: { spell: 'remove-curse', temple: true },
  },
  weak: {
    ...BASE,
    id: 'weak',
    name: 'Weak',
    statFactors: { might: 0.75, endurance: 0.75, accuracy: 0.75, speed: 0.75 },
    cure: { spell: 'cure-weakness', temple: true },
  },
  asleep: {
    ...BASE,
    id: 'asleep',
    name: 'Asleep',
    canAct: false,
    canMove: false,
    timed: true,
    restClears: true,
    damageClears: true,
    cure: { spell: 'awaken', temple: true },
  },
  afraid: {
    ...BASE,
    id: 'afraid',
    name: 'Afraid',
    canAct: false,
    timed: true,
    restClears: true,
    cure: { spell: 'remove-fear', temple: true },
  },
  drunk: {
    ...BASE,
    id: 'drunk',
    name: 'Drunk',
    statFactors: { might: 1.25, intellect: 0.75, personality: 0.75, accuracy: 0.75 },
    timed: true,
    restClears: true,
    cure: { temple: true },
  },
  insane: {
    ...BASE,
    id: 'insane',
    name: 'Insane',
    statFactors: { might: 1.5, endurance: 1.25, intellect: 0.5, personality: 0.5 },
    cure: { spell: 'cure-insanity', temple: true },
  },
  poisoned: {
    ...BASE,
    id: 'poisoned',
    name: 'Poisoned',
    statFactors: ALL_STATS(0.85),
    worsens: true,
    cure: { spell: 'cure-poison', temple: true },
  },
  diseased: {
    ...BASE,
    id: 'diseased',
    name: 'Diseased',
    statFactors: ALL_STATS(0.85),
    worsens: true,
    cure: { spell: 'cure-disease', temple: true },
  },
  paralyzed: {
    ...BASE,
    id: 'paralyzed',
    name: 'Paralyzed',
    canAct: false,
    canMove: false,
    timed: true,
    cure: { spell: 'cure-paralysis', temple: true },
  },
  unconscious: {
    ...BASE,
    id: 'unconscious',
    name: 'Unconscious',
    canAct: false,
    canMove: false,
    cure: { temple: true },
  },
  dead: {
    ...BASE,
    id: 'dead',
    name: 'Dead',
    canAct: false,
    canMove: false,
    alive: false,
    cure: { spell: 'raise-dead', temple: true },
  },
  stoned: {
    ...BASE,
    id: 'stoned',
    name: 'Stoned',
    canAct: false,
    canMove: false,
    alive: false,
    cure: { spell: 'stone-to-flesh', temple: true },
  },
  eradicated: {
    ...BASE,
    id: 'eradicated',
    name: 'Eradicated',
    canAct: false,
    canMove: false,
    alive: false,
    cure: { spell: 'resurrection', temple: true },
  },
};

export const MAX_SEVERITY = 3;

export interface ConditionState {
  /** Game minute the condition started. */
  since: number;
  /** Game minute a timed condition ends. */
  until?: number;
  /** 1 to 3 for worsening conditions. */
  severity?: number;
}

/** A character's afflictions; none means Good. JSON-safe. */
export type ConditionSet = Partial<Record<Affliction, ConditionState>>;

export function severityOrder(id: ConditionId): number {
  return CONDITIONS.indexOf(id);
}

export function isConditionId(value: unknown): value is ConditionId {
  return typeof value === 'string' && (CONDITIONS as readonly string[]).includes(value);
}

export function afflictions(set: ConditionSet): Affliction[] {
  return (Object.keys(set) as Affliction[]).filter((k) => set[k] !== undefined);
}

/** The condition shown for the character: the most severe present, or Good. */
export function worstCondition(set: ConditionSet): ConditionId {
  let worst: ConditionId = 'good';
  for (const id of afflictions(set)) {
    if (severityOrder(id) > severityOrder(worst)) worst = id;
  }
  return worst;
}

export function hasCondition(set: ConditionSet, id: Affliction): boolean {
  return set[id] !== undefined;
}

export function canAct(set: ConditionSet): boolean {
  return afflictions(set).every((id) => CONDITION_DEFS[id].canAct);
}

export function canMove(set: ConditionSet): boolean {
  return afflictions(set).every((id) => CONDITION_DEFS[id].canMove);
}

/** False once the character is dead, stoned or eradicated. */
export function isAlive(set: ConditionSet): boolean {
  return afflictions(set).every((id) => CONDITION_DEFS[id].alive);
}

/** The chance an action fails before it starts (Cursed). */
export function failChance(set: ConditionSet): number {
  let chance = 0;
  for (const id of afflictions(set)) chance = Math.max(chance, CONDITION_DEFS[id].failChance);
  return chance;
}

export interface AfflictOptions {
  /** Duration in game minutes for timed conditions. */
  minutes?: number;
  severity?: number;
}

/**
 * Add a condition at game minute `now`. A condition already present keeps its start; a timed
 * one takes the later end, a worsening one the higher severity. Returns true when new.
 */
export function afflict(
  set: ConditionSet,
  id: Affliction,
  now: number,
  options: AfflictOptions = {},
): boolean {
  const def = CONDITION_DEFS[id];
  const existing = set[id];
  const state: ConditionState = existing ?? { since: now };
  if (def.timed && options.minutes !== undefined) {
    const until = now + options.minutes;
    if (state.until === undefined || until > state.until) state.until = until;
  }
  if (def.worsens) {
    const severity = Math.min(MAX_SEVERITY, Math.max(1, options.severity ?? 1));
    state.severity = Math.max(state.severity ?? 1, severity);
  }
  set[id] = state;
  return existing === undefined;
}

export function cure(set: ConditionSet, id: Affliction): boolean {
  if (set[id] === undefined) return false;
  delete set[id];
  return true;
}

export function cureAll(set: ConditionSet): Affliction[] {
  const cured = afflictions(set);
  for (const id of cured) delete set[id];
  return cured;
}

/** Drop timed conditions whose end has passed. */
export function expireConditions(set: ConditionSet, now: number): Affliction[] {
  const ended: Affliction[] = [];
  for (const id of afflictions(set)) {
    const s = set[id]!;
    if (CONDITION_DEFS[id].timed && s.until !== undefined && now >= s.until) {
      delete set[id];
      ended.push(id);
    }
  }
  return ended;
}

/** Each worsening condition gains one step of severity, to the cap. */
export function worsenConditions(set: ConditionSet): Affliction[] {
  const worsened: Affliction[] = [];
  for (const id of afflictions(set)) {
    if (!CONDITION_DEFS[id].worsens) continue;
    const s = set[id]!;
    const next = Math.min(MAX_SEVERITY, (s.severity ?? 1) + 1);
    if (next !== s.severity) {
      s.severity = next;
      worsened.push(id);
    }
  }
  return worsened;
}

/** What a full rest clears: timed and rest-cleared conditions. */
export function restConditions(set: ConditionSet): Affliction[] {
  const cleared: Affliction[] = [];
  for (const id of afflictions(set)) {
    const def = CONDITION_DEFS[id];
    if (def.restClears || def.timed) {
      delete set[id];
      cleared.push(id);
    }
  }
  return cleared;
}

/** What taking damage clears (Asleep). */
export function damageConditions(set: ConditionSet): Affliction[] {
  const cleared: Affliction[] = [];
  for (const id of afflictions(set)) {
    if (CONDITION_DEFS[id].damageClears) {
      delete set[id];
      cleared.push(id);
    }
  }
  return cleared;
}

/** Statistics after the conditions' penalties, each at least 1. */
export function effectiveStats(base: Stats, set: ConditionSet): Stats {
  const out = { ...base };
  for (const id of afflictions(set)) {
    const def = CONDITION_DEFS[id];
    const severity = def.worsens ? (set[id]!.severity ?? 1) : 1;
    for (const stat of STATS) {
      const f = def.statFactors[stat];
      if (f === undefined) continue;
      const factor = f < 1 ? 1 - (1 - f) * severity : f;
      out[stat] = Math.max(1, Math.floor(out[stat] * Math.max(0, factor) + 1e-9));
    }
  }
  return out;
}
