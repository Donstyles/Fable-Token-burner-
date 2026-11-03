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
    house: { id: 'temple', name: 'The Temple', priceMultiplier: 1 },
  },
  store: {
    kind: 'shop',
    house: {
      id: 'store',
      name: "The Trader's Store",
      stock: ['potion-healing', 'scroll-torch-light', 'scroll-fire-bolt', 'copper-ring', 'boots'],
      priceMultiplier: 1.3,
      identifyPrice: 20,
      repairFraction: 0.2,
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
  smithy: {
    kind: 'shop',
    house: {
      id: 'smithy',
      name: 'The Smithy',
      stock: [
        'dagger',
        'short-sword',
        'long-sword',
        'axe',
        'spear',
        'shield',
        'helmet',
        'chain-mail',
      ],
      priceMultiplier: 1.4,
      identifyPrice: 30,
      repairFraction: 0.15,
    },
  },
};

/** How close to a door the party must stand to enter, metres. */
export const DOOR_REACH = 9;
