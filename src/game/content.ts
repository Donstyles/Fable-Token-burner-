/**
 * The village's houses (DESIGN.md 15.2, 16.6): which building model opens which service
 * screen when the party taps its door. The inn rents rooms and sells food, the temple heals,
 * the trader stocks the common goods, the smithy the arms and armour. Prices follow MM6's
 * first town in spirit: cheap enough that a few bandits pay for a night.
 */
import type { ServiceDefs, ServiceKind } from '../ui/context';

export type HouseRef = { [K in ServiceKind]: { kind: K; house: ServiceDefs[K] } }[ServiceKind];

export const VILLAGE_HOUSES: Record<string, HouseRef> = {
  'building-inn': {
    kind: 'tavern',
    house: { id: 'inn', name: 'The Inn', roomPrice: 10, foodPrice: 2, foodCapacity: 14 },
  },
  'building-temple': {
    kind: 'temple',
    house: { id: 'temple', name: 'The Temple', priceMultiplier: 1 },
  },
  'building-store': {
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
  // The townhouse by the waterfront trains (ours until the town has a hall of its own:
  // experience bought nothing in the audit, 2026-10-23); MM6's first town trains to 15.
  'building-cottage-03': {
    kind: 'trainer',
    house: { id: 'training', name: 'The Training Hall', maxLevel: 15, priceMultiplier: 1 },
  },
  'building-smithy': {
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
