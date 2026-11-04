/**
 * The buff store (DESIGN.md 17.17; docs/gaps/magic.md 5.5). MM6 keeps three kinds of timed
 * spell on the game clock: the party's (Torch Light, the five Protections, Wizard Eye, Water
 * Walk, Feather Fall, Fly, Guardian Angel), each member's (Bless, Heroism, Haste, Shield, Stone
 * Skin and the temporary statistics) and the monsters' (not here: monsters live only while a
 * level is loaded). A buff holds its end on the clock, a power and the caster's skill (MMX
 * `SpellBuff`). Casting a buff that is already on follows the patch (GF-P): the stronger one
 * replaces the old, and at the same power the one that lasts longer. Everything is plain data
 * on the sheet and the state, saved with them; the runtime runs `expireBuffs` as the clock
 * goes. The names are the spells' own.
 */
import type { Stat } from './stats';

export const MEMBER_BUFFS = [
  'bless',
  'heroism',
  'haste',
  'shield',
  'stone-skin',
  'temp-might',
  'temp-intellect',
  'temp-personality',
  'temp-endurance',
  'temp-accuracy',
  'temp-speed',
  'temp-luck',
] as const;
export type MemberBuffId = (typeof MEMBER_BUFFS)[number];

export const PARTY_BUFFS = [
  'torch-light',
  'protection-fire',
  'protection-electricity',
  'protection-cold',
  'protection-poison',
  'protection-magic',
  'wizard-eye',
  'water-walk',
  'feather-fall',
  'fly',
  'guardian-angel',
] as const;
export type PartyBuffId = (typeof PARTY_BUFFS)[number];

export type BuffId = MemberBuffId | PartyBuffId;

export interface Buff {
  /** The game minute it ends. */
  until: number;
  /** What it gives: the bonus, the resistance, the light's steps. */
  power: number;
  /** The caster's skill when it was cast. */
  skill: number;
}

/** A set of buffs by id; absent means not on. JSON-safe. */
export type BuffSet<K extends string> = Partial<Record<K, Buff>>;
export type MemberBuffs = BuffSet<MemberBuffId>;
export type PartyBuffs = BuffSet<PartyBuffId>;

export const BUFF_NAMES: Record<BuffId, string> = {
  bless: 'Bless',
  heroism: 'Heroism',
  haste: 'Haste',
  shield: 'Shield',
  'stone-skin': 'Stone Skin',
  'temp-might': 'Might',
  'temp-intellect': 'Intellect',
  'temp-personality': 'Personality',
  'temp-endurance': 'Endurance',
  'temp-accuracy': 'Accuracy',
  'temp-speed': 'Speed',
  'temp-luck': 'Luck',
  'torch-light': 'Torch Light',
  'protection-fire': 'Protection from Fire',
  'protection-electricity': 'Protection from Electricity',
  'protection-cold': 'Protection from Cold',
  'protection-poison': 'Protection from Poison',
  'protection-magic': 'Protection from Magic',
  'wizard-eye': 'Wizard Eye',
  'water-walk': 'Water Walk',
  'feather-fall': 'Feather Fall',
  fly: 'Fly',
  'guardian-angel': 'Guardian Angel',
};

/** The temporary statistic a member buff raises, if it is one. */
export const TEMP_STAT: Partial<Record<MemberBuffId, Stat>> = {
  'temp-might': 'might',
  'temp-intellect': 'intellect',
  'temp-personality': 'personality',
  'temp-endurance': 'endurance',
  'temp-accuracy': 'accuracy',
  'temp-speed': 'speed',
  'temp-luck': 'luck',
};

/** The buff a temporary statistic goes by. */
export function tempStatBuff(stat: Stat): MemberBuffId {
  return `temp-${stat}`;
}

/** Haste takes this many of MM6's recovery units off every attack (GF-M). */
export const HASTE_RECOVERY = 25;

export function isMemberBuffId(value: unknown): value is MemberBuffId {
  return typeof value === 'string' && (MEMBER_BUFFS as readonly string[]).includes(value);
}

export function isPartyBuffId(value: unknown): value is PartyBuffId {
  return typeof value === 'string' && (PARTY_BUFFS as readonly string[]).includes(value);
}

export interface BuffCast {
  /** Game minutes it lasts from `now`. */
  minutes: number;
  power: number;
  skill: number;
}

/**
 * Put a buff on at game minute `now`. One already on is replaced by a stronger one, or at the
 * same power by one that ends later (the patch's rule, GF-P); else it is kept as it was.
 */
export function applyBuff<K extends string>(
  set: BuffSet<K>,
  id: K,
  now: number,
  cast: BuffCast,
): 'new' | 'replaced' | 'kept' {
  const until = now + Math.max(0, cast.minutes);
  const next: Buff = { until, power: cast.power, skill: cast.skill };
  const old = set[id];
  if (!old) {
    set[id] = next;
    return 'new';
  }
  if (cast.power > old.power || (cast.power === old.power && until > old.until)) {
    set[id] = next;
    return 'replaced';
  }
  return 'kept';
}

/** Drop the buffs whose end has come; their ids, for the log. */
export function expireBuffs<K extends string>(set: BuffSet<K>, now: number): K[] {
  const ended: K[] = [];
  for (const id of Object.keys(set) as K[]) {
    const b = set[id];
    if (b && now >= b.until) {
      delete set[id];
      ended.push(id);
    }
  }
  return ended;
}

/** The power of a buff that is on, else 0. */
export function buffPower<K extends string>(set: BuffSet<K>, id: K): number {
  return set[id]?.power ?? 0;
}

export function hasBuff<K extends string>(set: BuffSet<K>, id: K): boolean {
  return set[id] !== undefined;
}

export interface ActiveBuff<K extends string> {
  id: K;
  power: number;
  /** Game minutes left, at least 0. */
  minutesLeft: number;
}

/** The buffs on, longest-lasting first, with their time left at game minute `now`. */
export function activeBuffs<K extends string>(set: BuffSet<K>, now: number): ActiveBuff<K>[] {
  const out: ActiveBuff<K>[] = [];
  for (const id of Object.keys(set) as K[]) {
    const b = set[id];
    if (b) out.push({ id, power: b.power, minutesLeft: Math.max(0, b.until - now) });
  }
  return out.sort(
    (a, b) => b.minutesLeft - a.minutesLeft || String(a.id).localeCompare(String(b.id)),
  );
}

/** "1 h 5 min", "20 min", "1 d 2 h" for the time a buff has left. */
export function formatLeft(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const d = Math.floor(m / (24 * 60));
  const h = Math.floor((m % (24 * 60)) / 60);
  const min = m % 60;
  if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
  if (h > 0) return min > 0 ? `${h} h ${min} min` : `${h} h`;
  return `${min} min`;
}

/** A buff's name with its time left: "Bless (1 h 5 min)". */
export function buffLabel(id: BuffId, minutesLeft: number): string {
  return `${BUFF_NAMES[id]} (${formatLeft(minutesLeft)})`;
}
