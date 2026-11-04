/**
 * Sites (DESIGN.md 17.20; MM6-GAPS.md 23 and 24): the wells, shrines and obelisks a party
 * uses with a tap from beside them, as MM6's fountains, altars and obelisks were used. A well
 * gives each member who drinks a point or two of a statistic, once, to a cap; a shrine is
 * prayed at in its month, +10 to a statistic for the whole party the first year and +3 each
 * year after; an obelisk shows its fragment of a message, kept in the notes. Each site stands
 * at a named point of its level (the region script's `points`); the runtime finds the site
 * under a tap by that point. Pure functions over the state.
 */
import { takeNote } from './notes';
import type { GameState } from './state';
import type { Stat } from './stats';
import { gameDate, MONTH_NAMES } from './time';

export type SiteEffect =
  | { kind: 'well'; stat: Stat; amount: number; cap: number }
  | { kind: 'altar'; stat: Stat; month: number; first: number; later: number }
  | { kind: 'obelisk'; text: string };

export interface SiteDef {
  id: string;
  /** The level it stands in and the named point it stands at. */
  level: string;
  point: string;
  /** What the status line calls it. */
  name: string;
  effect: SiteEffect;
  /** The note the party makes on first using it. */
  note?: string;
}

/** How near a party must stand to use a site, metres; and how near a tap must land to it. */
export const SITE_REACH = 6;
export const SITE_TAP = 3.5;

const STAT_NAMES: Record<Stat, string> = {
  might: 'Might',
  intellect: 'Intellect',
  personality: 'Personality',
  endurance: 'Endurance',
  accuracy: 'Accuracy',
  speed: 'Speed',
  luck: 'Luck',
};

export const SITES: SiteDef[] = [
  {
    id: 'gullhaven-well',
    level: 'gullhaven',
    point: 'well',
    name: 'The Village Well',
    effect: { kind: 'well', stat: 'luck', amount: 2, cap: 15 },
    note: 'The well in Gullhaven’s square is sweet. Whoever drinks from it feels luckier, once.',
  },
  {
    id: 'gullhaven-shrine',
    level: 'gullhaven',
    point: 'shrine',
    name: 'The Shrine of the Road',
    effect: { kind: 'altar', stat: 'endurance', month: 0, first: 10, later: 3 },
    note:
      'The wayside shrine under the old oak at the crossroads hears a prayer in January, and ' +
      'hardens those who pray: the first year most of all.',
  },
  {
    id: 'gullhaven-obelisk',
    level: 'gullhaven',
    point: 'obelisk',
    name: 'An Obelisk',
    effect: {
      kind: 'obelisk',
      text:
        'Letters cut deep into the stone, older than any hand in Gullhaven, read: ' +
        '"WHEN THE SEVEN STAND IN LINE, THE FIRST DOOR IS UNDER THE LAST STAR."',
    },
    note:
      'The obelisk by the standing stones: "WHEN THE SEVEN STAND IN LINE, THE FIRST DOOR IS ' +
      'UNDER THE LAST STAR." One fragment of something longer.',
  },
  // Harrowmere's (DESIGN.md 17.21, 17.22).
  {
    id: 'harrowmere-well',
    level: 'harrowmere',
    point: 'well',
    name: 'The Market Well',
    effect: { kind: 'well', stat: 'might', amount: 2, cap: 15 },
    note: 'The well in Harrow’s square is hard water off the chalk. Whoever drinks from it feels stronger, once.',
  },
  {
    id: 'harrowmere-shrine',
    level: 'harrowmere',
    point: 'shrine',
    name: 'The Shrine of the Barrows',
    effect: { kind: 'altar', stat: 'speed', month: 5, first: 10, later: 3 },
    note:
      'The shrine before the barrows on Harrowmere’s downs hears a prayer in June, and quickens ' +
      'those who pray: the first year most of all.',
  },
  {
    id: 'harrowmere-obelisk',
    level: 'harrowmere',
    point: 'obelisk',
    name: 'An Obelisk',
    effect: {
      kind: 'obelisk',
      text:
        'Letters cut deep into the stone, worn by the down winds, read: ' +
        '"THE LAST STAR IS THE ONE THAT DOES NOT TURN. COUNT THE DOORS FROM THE SEA."',
    },
    note:
      'The obelisk on Harrowmere’s downs: "THE LAST STAR IS THE ONE THAT DOES NOT TURN. COUNT ' +
      'THE DOORS FROM THE SEA." A second fragment.',
  },
];

/** The site at a level's named point, if one stands there. */
export function siteAt(level: string, point: string): SiteDef | undefined {
  return SITES.find((s) => s.level === level && s.point === point);
}

export interface SiteOutcome {
  /** What the status line says. */
  text: string;
  /** Lines after it: a note made, a statistic raised. */
  notices: string[];
}

const flagOf = (site: SiteDef, what: string): string => `site:${site.id}/${what}`;

/**
 * Use a site: the selected member drinks from a well; the whole party prays at a shrine;
 * anyone reads an obelisk. Mutates the state and reports what to say.
 */
export function useSite(state: GameState, site: SiteDef, member: number): SiteOutcome {
  const notices: string[] = [];
  if (site.note && takeNote(state, 'site', site.id)) notices.push('Note added');
  const effect = site.effect;
  switch (effect.kind) {
    case 'well': {
      const c = state.party[member];
      if (!c) return { text: `${site.name}.`, notices };
      const key = flagOf(site, `drank/${member}`);
      if (state.flags[key] || c.stats[effect.stat] >= effect.cap) {
        return { text: `${c.name} drinks. Refreshing!`, notices };
      }
      const gain = Math.min(effect.amount, effect.cap - c.stats[effect.stat]);
      c.stats[effect.stat] += gain;
      state.flags[key] = 1;
      notices.push(`${c.name}: ${STAT_NAMES[effect.stat]} +${gain}`);
      return {
        text: `${c.name} drinks. The water is cold and sweet, and the day looks kinder.`,
        notices,
      };
    }
    case 'altar': {
      const date = gameDate(state.clock.minutes);
      if (date.month !== effect.month) {
        return {
          text: `The shrine is quiet. Its day comes in ${MONTH_NAMES[effect.month]}.`,
          notices,
        };
      }
      const key = flagOf(site, 'year');
      if (state.flags[key] === date.year) {
        return {
          text: 'You have prayed here this year; the shrine has given what it gives.',
          notices,
        };
      }
      const first = !state.flags[key];
      const gain = first ? effect.first : effect.later;
      for (const c of state.party) c.stats[effect.stat] += gain;
      state.flags[key] = date.year;
      notices.push(`The party: ${STAT_NAMES[effect.stat]} +${gain}`);
      return {
        text: first
          ? 'You kneel at the shrine. Something old and patient takes notice, and your limbs feel like oak.'
          : 'You kneel at the shrine again. It remembers you, and gives a little.',
        notices,
      };
    }
    case 'obelisk':
      return { text: effect.text, notices };
  }
}
