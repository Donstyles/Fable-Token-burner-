/**
 * The village's houses (DESIGN.md 15.2, 16.6): which building opens which service screen when
 * the party taps its door, by the name its plot gives it (kernel/terrain/plots.ts: the model's
 * without `building-` unless the region names it), so one townhouse trains and its twins along
 * the street are only houses. The inn rents rooms and sells food, the temple heals, the trader
 * stocks the common goods, the smithy the arms and armour, the guild the air school's books.
 * Prices follow MM6's first town in spirit: cheap enough that a few bandits pay for a night.
 */
import type { ServiceDefs, ServiceKind } from '../ui/context';

export type HouseRef = { [K in ServiceKind]: { kind: K; house: ServiceDefs[K] } }[ServiceKind];

export const VILLAGE_HOUSES: Record<string, HouseRef> = {
  inn: {
    kind: 'tavern',
    house: { id: 'inn', name: 'The Inn', roomPrice: 10, foodPrice: 2, foodCapacity: 14 },
  },
  temple: {
    kind: 'temple',
    house: { id: 'temple', name: 'The Temple', donation: 10 },
  },
  // A general store as MM6's first town's (items.md 6.5, Traveler's Supply): first-tier goods
  // renewed daily, open from five to ten, buying anything at half; it names and mends nothing.
  store: {
    kind: 'shop',
    house: {
      id: 'store',
      name: "The Trader's Store",
      kind: 'general',
      val: 2,
      regular: {
        level: 1,
        families: ['potion', 'scroll', 'ring', 'boots', 'belt', 'hat', 'cloak'],
        slots: 8,
      },
      restockDays: 1,
      hours: [5, 22],
    },
  },
  // A townhouse on the square trains (ours until the town has a hall of its own: experience
  // bought nothing in the audit, 2026-10-23); MM6's first town trains to 15.
  training: {
    kind: 'trainer',
    house: { id: 'training', name: 'The Training Hall', maxLevel: 15, priceMultiplier: 1 },
  },
  // The townhouse beside the inn sells spellbooks, as MM6's first town had its initiate guilds
  // (owner, 2026-10-25, with the guild room's picture): the air school, the sorcerer's, to the
  // fourth level.
  guild: {
    kind: 'guild',
    house: {
      id: 'guild',
      name: 'Initiate Guild of Air',
      school: 'air',
      maxSpellLevel: 4,
      membershipFee: 50,
      priceMultiplier: 1,
    },
  },
  // The village's one smith is MM6's Knife Shoppe and Common Defense in one (items.md 6.5,
  // New Sorpigal): any weapon of the first level on the counter, armour on the special
  // shelf, both renewed every two days, open from six to six; it deals in arms and armour.
  smithy: {
    kind: 'shop',
    house: {
      id: 'smithy',
      name: 'The Smithy',
      kind: 'weapon',
      val: 1.5,
      regular: { level: 1, families: ['weapon'], slots: 6 },
      special: {
        level: 1,
        families: ['leather', 'chain', 'small-shield', 'large-shield', 'helm', 'gauntlets'],
        slots: 4,
      },
      restockDays: 2,
      hours: [6, 18],
      trades: ['weapon', 'armor', 'shield', 'helmet', 'gauntlets'],
    },
  },
};

/** How close to a door the party must stand to enter, metres. */
export const DOOR_REACH = 9;
