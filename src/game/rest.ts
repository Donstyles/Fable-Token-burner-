/**
 * Resting and waiting (Phase 5 step 3; MM6's rules since DESIGN.md 17.16). The MM6 rest: eight
 * hours pass and one unit of the party's food is eaten; every living member is healed to full
 * hit and spell points, except that a poisoned or diseased member heals only to a half, a third
 * or a quarter by the condition's level and an insane one wakes with no spell points; Asleep,
 * Afraid, Drunk and Weak pass and the unconscious wake (docs/gaps/characters.md 10.2, 10.3,
 * 14.1). No condition worsens with rest. Without food the party rests hungry: time passes,
 * nothing heals and the members become Weak (MM7's rule; the MM6 manual is silent). A room at a
 * tavern is a rest that costs no food. "Wait until dawn" and "wait" only pass time and let
 * conditions with a span run out. Food is the party's, held by the state; this module takes the
 * supplies record and the clock so it stays free of the state root.
 */
import { type Character, healCharacter, isLiving, maxHp, maxSp, restoreSp } from './character';
import {
  afflict,
  type Affliction,
  expireConditions,
  restConditions,
  restHealFraction,
  restSpFraction,
} from './conditions';
import { advanceClock, type GameClock, minutesUntilDawn } from './time';

export const REST_HOURS = 8;
export const REST_MINUTES = REST_HOURS * 60;
export const FOOD_PER_REST = 1;

export interface Supplies {
  food: number;
}

export interface MemberRest {
  index: number;
  healed: number;
  spRestored: number;
  cleared: Affliction[];
  /** Went hungry: no healing, Weak added. */
  starved: boolean;
}

export interface RestResult {
  minutes: number;
  foodUsed: number;
  hungry: boolean;
  members: MemberRest[];
}

export interface RestOptions {
  /** A rented room: no food is eaten and hunger cannot occur. */
  room?: boolean;
}

/** Eight hours of rest for the party; mutates the characters, the supplies and the clock. */
export function rest(
  party: readonly Character[],
  supplies: Supplies,
  clock: GameClock,
  options: RestOptions = {},
): RestResult {
  advanceClock(clock, REST_MINUTES);
  const now = clock.minutes;
  let foodUsed = 0;
  let fed = true;
  if (!options.room) {
    if (supplies.food >= FOOD_PER_REST) {
      supplies.food -= FOOD_PER_REST;
      foodUsed = FOOD_PER_REST;
    } else fed = false;
  }
  const members: MemberRest[] = party.map((c, index) => {
    const entry: MemberRest = {
      index,
      healed: 0,
      spRestored: 0,
      cleared: [],
      starved: false,
    };
    if (!isLiving(c)) return entry;
    entry.cleared = [...expireConditions(c.conditions, now), ...restConditions(c.conditions)];
    if (!fed) {
      entry.starved = true;
      afflict(c.conditions, 'weak', now);
      return entry;
    }
    // To the maximum, or to the share poison or disease leaves (never down from where it is).
    const target = Math.floor(maxHp(c) * restHealFraction(c.conditions));
    entry.healed = healCharacter(c, Math.max(0, target - c.hp));
    const spTarget = Math.floor(maxSp(c) * restSpFraction(c.conditions));
    entry.spRestored = restoreSp(c, Math.max(0, spTarget - c.sp));
    return entry;
  });
  return { minutes: REST_MINUTES, foodUsed, hungry: !fed, members };
}

/** Let time pass without rest; conditions with a span may run out. Returns the minutes passed. */
export function passTime(party: readonly Character[], clock: GameClock, minutes: number): number {
  const m = Math.max(0, Math.floor(minutes));
  advanceClock(clock, m);
  for (const c of party) expireConditions(c.conditions, clock.minutes);
  return m;
}

/** Wait until five in the morning. */
export function waitUntilDawn(party: readonly Character[], clock: GameClock): number {
  return passTime(party, clock, minutesUntilDawn(clock.minutes));
}

/** Without food the party does not heal while resting. */
export function isHungry(supplies: Supplies): boolean {
  return supplies.food < FOOD_PER_REST;
}
