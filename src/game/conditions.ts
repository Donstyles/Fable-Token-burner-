/**
 * Conditions (Phase 5 step 1; MM6's table since DESIGN.md 17.16). MM6 keeps one field per
 * condition and a member may carry several; the fourteen here stand for MM6's seventeen, with
 * poison and disease carrying their level 1 to 3 as a severity (docs/gaps/characters.md 10.1).
 * The displayed condition is the worst one present, in the likely original order (10.5), and
 * that one alone sets the statistics (10.2's table, cell for cell; MW6 and the MM7 engine
 * agree). Asleep, Paralyzed, Unconscious, Dead, Stoned and Eradicated stop a member acting;
 * Afraid, Drunk, Insane, the poisons and the diseases do not. Weak halves the member's damage.
 * Cursed makes half of all actions fail (MW6: spells two in three, the MM7 engine one in two;
 * ours until measured). A rest cures Asleep, Afraid, Drunk and Weak and wakes the unconscious
 * by its healing; no condition worsens with time or rest (10.3). Nothing runs on a timer unless
 * the cause gives it one: MM6's engine keeps none (10.3), the party's own cures lift them.
 */
import type { SpellId } from './spells';
import type { Stat, Stats } from './stats';

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

/** The sheet's colour for a condition (10.5): green, yellow or red by its gravity. */
export type ConditionTone = 'good' | 'green' | 'yellow' | 'red';

type Factors = Partial<Record<Stat, number>>;

export interface ConditionDef {
  id: ConditionId;
  name: string;
  /** Can the character attack, cast and use items? */
  canAct: boolean;
  /** Can the character walk with the party (Afraid can; Asleep cannot)? */
  canMove: boolean;
  /**
   * Each statistic as a fraction of its value, one table per severity (poison and disease
   * have three; the rest one). A statistic not listed is unchanged.
   */
  statFactors: readonly Factors[];
  /** The member's damage as a fraction (Weak halves it). */
  damageFactor: number;
  /** Chance that an action fails outright. */
  failChance: number;
  /** A fed rest clears it. */
  restClears: boolean;
  /** Taking damage clears it. */
  damageClears: boolean;
  /** Cures beyond rest: the MM6 spell and whether a temple can do it. */
  cure: { spell?: SpellId; temple: boolean };
  /** Is the character alive in the sense of counting towards the party's survival? */
  alive: boolean;
  /** The colour at each severity. */
  tones: readonly ConditionTone[];
}

const BASE: Omit<ConditionDef, 'id' | 'name' | 'cure'> = {
  canAct: true,
  canMove: true,
  statFactors: [{}],
  damageFactor: 1,
  failChance: 0,
  restClears: false,
  damageClears: false,
  alive: true,
  tones: ['green'],
};

const physical = (f: number): Factors => ({ might: f, endurance: f, accuracy: f, speed: f });

export const CONDITION_DEFS: Record<ConditionId, ConditionDef> = {
  good: { ...BASE, id: 'good', name: 'Good', tones: ['good'], cure: { temple: false } },
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
    damageFactor: 0.5,
    restClears: true,
    cure: { spell: 'cure-weakness', temple: true },
  },
  asleep: {
    ...BASE,
    id: 'asleep',
    name: 'Asleep',
    canAct: false,
    canMove: false,
    restClears: true,
    damageClears: true,
    cure: { spell: 'awaken', temple: true },
  },
  afraid: {
    ...BASE,
    id: 'afraid',
    name: 'Afraid',
    statFactors: [{ might: 1.2, intellect: 0.5, personality: 0.5, accuracy: 0.5, speed: 1.2 }],
    restClears: true,
    cure: { spell: 'remove-fear', temple: true },
  },
  drunk: {
    ...BASE,
    id: 'drunk',
    name: 'Drunk',
    statFactors: [
      {
        might: 0.5,
        intellect: 0.25,
        personality: 0.25,
        endurance: 0.5,
        accuracy: 0.1,
        speed: 0.2,
        luck: 2,
      },
    ],
    restClears: true,
    cure: { temple: true },
  },
  insane: {
    ...BASE,
    id: 'insane',
    name: 'Insane',
    statFactors: [{ might: 2, intellect: 0.1, personality: 0.1, endurance: 1.5, speed: 1.2 }],
    cure: { spell: 'cure-insanity', temple: true },
  },
  poisoned: {
    ...BASE,
    id: 'poisoned',
    name: 'Poisoned',
    statFactors: [
      physical(0.75),
      { ...physical(0.5), intellect: 0.75, personality: 0.75 },
      { ...physical(0.25), intellect: 0.5, personality: 0.5 },
    ],
    tones: ['green', 'yellow', 'red'],
    cure: { spell: 'cure-poison', temple: true },
  },
  diseased: {
    ...BASE,
    id: 'diseased',
    name: 'Diseased',
    statFactors: [
      physical(0.6),
      { ...physical(0.3), intellect: 0.6, personality: 0.6 },
      { ...physical(0.1), intellect: 0.3, personality: 0.3 },
    ],
    tones: ['green', 'yellow', 'red'],
    cure: { spell: 'cure-disease', temple: true },
  },
  paralyzed: {
    ...BASE,
    id: 'paralyzed',
    name: 'Paralyzed',
    canAct: false,
    canMove: false,
    tones: ['yellow'],
    cure: { spell: 'cure-paralysis', temple: true },
  },
  unconscious: {
    ...BASE,
    id: 'unconscious',
    name: 'Unconscious',
    canAct: false,
    canMove: false,
    tones: ['yellow'],
    cure: { temple: true },
  },
  dead: {
    ...BASE,
    id: 'dead',
    name: 'Dead',
    canAct: false,
    canMove: false,
    alive: false,
    tones: ['red'],
    cure: { spell: 'raise-dead', temple: true },
  },
  stoned: {
    ...BASE,
    id: 'stoned',
    name: 'Stoned',
    canAct: false,
    canMove: false,
    alive: false,
    tones: ['red'],
    cure: { spell: 'stone-to-flesh', temple: true },
  },
  eradicated: {
    ...BASE,
    id: 'eradicated',
    name: 'Eradicated',
    canAct: false,
    canMove: false,
    alive: false,
    tones: ['red'],
    cure: { spell: 'resurrection', temple: true },
  },
};

export const MAX_SEVERITY = 3;

export interface ConditionState {
  /** Game minute the condition started. */
  since: number;
  /** Game minute the condition ends, when its cause gave it a span. */
  until?: number;
  /** 1 to 3 for poison and disease: the level the attacker set. */
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

/** Conditions that carry a level: poison and disease. */
export function hasLevels(id: ConditionId): boolean {
  return CONDITION_DEFS[id].statFactors.length > 1;
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

/** The level of a condition present, 1 to 3; 1 for those without levels. */
export function conditionLevel(set: ConditionSet, id: Affliction): number {
  const s = set[id];
  if (!s) return 0;
  return hasLevels(id) ? Math.min(MAX_SEVERITY, Math.max(1, s.severity ?? 1)) : 1;
}

/** The displayed condition's name, with its level for poison and disease ("Poisoned 2"). */
export function conditionLabel(set: ConditionSet): string {
  const id = worstCondition(set);
  if (id === 'good') return CONDITION_DEFS.good.name;
  const level = conditionLevel(set, id);
  return hasLevels(id) ? `${CONDITION_DEFS[id].name} ${level}` : CONDITION_DEFS[id].name;
}

/** The sheet's colour for the displayed condition (10.5). */
export function conditionTone(set: ConditionSet): ConditionTone {
  const id = worstCondition(set);
  if (id === 'good') return 'good';
  const tones = CONDITION_DEFS[id].tones;
  return tones[Math.min(tones.length, conditionLevel(set, id)) - 1] ?? 'green';
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

/** The member's damage as a fraction of the roll: a half when Weak (MW6; OE). */
export function damageFactor(set: ConditionSet): number {
  let factor = 1;
  for (const id of afflictions(set)) factor = Math.min(factor, CONDITION_DEFS[id].damageFactor);
  return factor;
}

export interface AfflictOptions {
  /** A span in game minutes, when the cause has one (MM6's engine gives none). */
  minutes?: number;
  /** The level, 1 to 3, for poison and disease. */
  severity?: number;
}

/**
 * Add a condition at game minute `now`. A condition already present keeps its start; one given
 * a span takes the later end, a levelled one the higher level. Returns true when new.
 */
export function afflict(
  set: ConditionSet,
  id: Affliction,
  now: number,
  options: AfflictOptions = {},
): boolean {
  const existing = set[id];
  const state: ConditionState = existing ?? { since: now };
  if (options.minutes !== undefined) {
    const until = now + options.minutes;
    if (state.until === undefined || until > state.until) state.until = until;
  }
  if (hasLevels(id)) {
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

/** Drop conditions whose span has run out. */
export function expireConditions(set: ConditionSet, now: number): Affliction[] {
  const ended: Affliction[] = [];
  for (const id of afflictions(set)) {
    const s = set[id]!;
    if (s.until !== undefined && now >= s.until) {
      delete set[id];
      ended.push(id);
    }
  }
  return ended;
}

/** What a fed rest clears: Asleep, Afraid, Drunk and Weak (10.3); the unconscious wake by healing. */
export function restConditions(set: ConditionSet): Affliction[] {
  const cleared: Affliction[] = [];
  for (const id of afflictions(set)) {
    if (CONDITION_DEFS[id].restClears) {
      delete set[id];
      cleared.push(id);
    }
  }
  return cleared;
}

/**
 * How far a rest heals, as a fraction of the maximum: to a half, a third or a quarter at
 * poison or disease level 1, 2 or 3 (10.2), the worse of the two when both are carried.
 */
export function restHealFraction(set: ConditionSet): number {
  let fraction = 1;
  for (const id of ['poisoned', 'diseased'] as const) {
    const level = conditionLevel(set, id);
    if (level > 0) fraction = Math.min(fraction, 1 / (level + 1));
  }
  return fraction;
}

/** An insane member wakes from a rest with no spell points (10.2). */
export function restSpFraction(set: ConditionSet): number {
  return hasCondition(set, 'insane') ? 0 : 1;
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

/**
 * Statistics after the displayed condition's table (10.2; one condition sets them), each at
 * least 1 (CH).
 */
export function effectiveStats(base: Stats, set: ConditionSet): Stats {
  const id = worstCondition(set);
  if (id === 'good') return { ...base };
  const tables = CONDITION_DEFS[id].statFactors;
  const table = tables[Math.min(tables.length, conditionLevel(set, id)) - 1] ?? {};
  const out = { ...base };
  for (const stat of Object.keys(table) as Stat[]) {
    const f = table[stat];
    if (f === undefined) continue;
    out[stat] = Math.max(1, Math.floor(out[stat] * f + 1e-9));
  }
  return out;
}
