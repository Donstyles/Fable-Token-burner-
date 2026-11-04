/**
 * MM6's standard enchantments (DESIGN.md 17.18; docs/gaps/items.md 3.1, 4.3, 4.4): fourteen
 * bonuses, "of Might" to "of Poison Resistance", each adding its strength to one value, never
 * on a weapon. A piece of armour or jewellery made at a treasure level gets one with the
 * level's chance (40 % at levels 2 to 5, 75 % at 6, none at 1), the bonus chosen by its slot's
 * odds and the strength drawn from the level's range (1–5 at level 2 up to 15–25 at 6). Each
 * point adds 100 gold to the value. The special enchantments ("of Flame", "Vampiric", 59 of
 * them) wait on the systems they touch (items.md 3.2). Everything here is pure.
 */
import type { ItemDef, ItemInstance, ItemKind } from './items';
import type { Rng } from './rng';
import type { Stat } from './stats';

export const STANDARD_BONUSES = [
  'might',
  'intellect',
  'personality',
  'endurance',
  'accuracy',
  'speed',
  'luck',
  'hp',
  'sp',
  'ac',
  'resist-fire',
  'resist-electricity',
  'resist-cold',
  'resist-poison',
] as const;
export type StandardBonus = (typeof STANDARD_BONUSES)[number];

export const BONUS_SUFFIX: Record<StandardBonus, string> = {
  might: 'of Might',
  intellect: 'of Thought',
  personality: 'of Charm',
  endurance: 'of Vigor',
  accuracy: 'of Precision',
  speed: 'of Speed',
  luck: 'of Luck',
  hp: 'of Health',
  sp: 'of Magic',
  ac: 'of Defense',
  'resist-fire': 'of Fire Resistance',
  'resist-electricity': 'of Elec Resistance',
  'resist-cold': 'of Cold Resistance',
  'resist-poison': 'of Poison Resistance',
};

/** The statistic a bonus raises, for the seven that raise one. */
export const BONUS_STAT: Partial<Record<StandardBonus, Stat>> = {
  might: 'might',
  intellect: 'intellect',
  personality: 'personality',
  endurance: 'endurance',
  accuracy: 'accuracy',
  speed: 'speed',
  luck: 'luck',
};

/** The kinds that take a standard bonus, in the odds table's order. */
export const BONUS_KINDS = [
  'armor',
  'shield',
  'helmet',
  'belt',
  'cloak',
  'gauntlets',
  'boots',
  'ring',
  'amulet',
] as const satisfies readonly ItemKind[];
type BonusKind = (typeof BONUS_KINDS)[number];

/** The relative odds of each bonus on each slot (items.md 3.1, TXT-STD); 0 is never. */
const ODDS: Record<StandardBonus, Record<BonusKind, number>> = {
  might: {
    armor: 5,
    shield: 0,
    helmet: 10,
    belt: 10,
    cloak: 10,
    gauntlets: 10,
    boots: 5,
    ring: 10,
    amulet: 10,
  },
  intellect: {
    armor: 5,
    shield: 0,
    helmet: 10,
    belt: 10,
    cloak: 10,
    gauntlets: 10,
    boots: 5,
    ring: 10,
    amulet: 10,
  },
  personality: {
    armor: 5,
    shield: 0,
    helmet: 10,
    belt: 10,
    cloak: 10,
    gauntlets: 10,
    boots: 10,
    ring: 10,
    amulet: 10,
  },
  endurance: {
    armor: 5,
    shield: 0,
    helmet: 10,
    belt: 10,
    cloak: 10,
    gauntlets: 10,
    boots: 5,
    ring: 10,
    amulet: 10,
  },
  accuracy: {
    armor: 5,
    shield: 0,
    helmet: 10,
    belt: 10,
    cloak: 10,
    gauntlets: 10,
    boots: 5,
    ring: 10,
    amulet: 10,
  },
  speed: {
    armor: 5,
    shield: 0,
    helmet: 10,
    belt: 10,
    cloak: 10,
    gauntlets: 10,
    boots: 25,
    ring: 10,
    amulet: 10,
  },
  luck: {
    armor: 5,
    shield: 0,
    helmet: 10,
    belt: 10,
    cloak: 10,
    gauntlets: 10,
    boots: 10,
    ring: 10,
    amulet: 10,
  },
  hp: {
    armor: 10,
    shield: 5,
    helmet: 5,
    belt: 0,
    cloak: 10,
    gauntlets: 5,
    boots: 10,
    ring: 10,
    amulet: 10,
  },
  sp: {
    armor: 10,
    shield: 5,
    helmet: 10,
    belt: 0,
    cloak: 10,
    gauntlets: 10,
    boots: 10,
    ring: 10,
    amulet: 10,
  },
  ac: {
    armor: 20,
    shield: 20,
    helmet: 10,
    belt: 0,
    cloak: 10,
    gauntlets: 10,
    boots: 5,
    ring: 10,
    amulet: 10,
  },
  'resist-fire': {
    armor: 10,
    shield: 10,
    helmet: 5,
    belt: 0,
    cloak: 10,
    gauntlets: 15,
    boots: 5,
    ring: 10,
    amulet: 10,
  },
  'resist-electricity': {
    armor: 10,
    shield: 10,
    helmet: 5,
    belt: 0,
    cloak: 10,
    gauntlets: 15,
    boots: 5,
    ring: 10,
    amulet: 10,
  },
  'resist-cold': {
    armor: 10,
    shield: 10,
    helmet: 5,
    belt: 0,
    cloak: 10,
    gauntlets: 15,
    boots: 5,
    ring: 10,
    amulet: 10,
  },
  'resist-poison': {
    armor: 10,
    shield: 10,
    helmet: 5,
    belt: 0,
    cloak: 10,
    gauntlets: 15,
    boots: 5,
    ring: 10,
    amulet: 10,
  },
};

/** The chance of a standard bonus by treasure level, per cent (items.md 4.3). */
export const STANDARD_CHANCE = [0, 40, 40, 40, 40, 75] as const;

/** The strength's range by treasure level (items.md 4.4, TXT-STD); none at level 1. */
export const STRENGTH_RANGE: readonly (readonly [number, number] | null)[] = [
  null,
  [1, 5],
  [3, 8],
  [6, 12],
  [10, 17],
  [15, 25],
];

/** Gold a point of strength adds to the value (TXT-STD; MPIKE). */
export const GOLD_PER_POINT = 100;

export function isStandardBonus(value: unknown): value is StandardBonus {
  return typeof value === 'string' && (STANDARD_BONUSES as readonly string[]).includes(value);
}

export function takesStandardBonus(kind: ItemKind): kind is BonusKind {
  return (BONUS_KINDS as readonly string[]).includes(kind);
}

/** The bonus a slot draws, by its odds; null when the kind takes none. */
export function rollBonusKind(kind: ItemKind, rng: Rng): StandardBonus | null {
  if (!takesStandardBonus(kind)) return null;
  const weights = STANDARD_BONUSES.map((b) => ODDS[b][kind]);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return null;
  let pick = rng() * total;
  for (let i = 0; i < STANDARD_BONUSES.length; i++) {
    pick -= weights[i]!;
    if (pick < 0) return STANDARD_BONUSES[i]!;
  }
  return STANDARD_BONUSES[STANDARD_BONUSES.length - 1]!;
}

/** A strength from the level's range, uniform (MM7 rule, OE); 0 at level 1. */
export function rollStrength(level: number, rng: Rng): number {
  const range = STRENGTH_RANGE[Math.max(1, Math.min(6, level)) - 1];
  if (!range) return 0;
  return range[0] + Math.floor(rng() * (range[1] - range[0] + 1));
}

/**
 * The standard bonus a piece made at `level` carries, or null: the level's chance, then the
 * slot's odds and the level's strength (items.md 4.2 step 5).
 */
export function rollStandardBonus(
  kind: ItemKind,
  level: number,
  rng: Rng,
): { kind: StandardBonus; power: number } | null {
  if (!takesStandardBonus(kind)) return null;
  const chance = STANDARD_CHANCE[Math.max(1, Math.min(6, level)) - 1]!;
  if (rng() * 100 >= chance) return null;
  const bonus = rollBonusKind(kind, rng);
  const power = rollStrength(level, rng);
  return bonus && power > 0 ? { kind: bonus, power } : null;
}

/** The copy's worth: its kind's value plus 100 gold a point of its bonus. */
export function itemValue(item: ItemInstance, def: ItemDef): number {
  return def.value + (item.bonus ? item.bonus.power * GOLD_PER_POINT : 0);
}

/** "Fine Ring of Might" once identified; the generic name before. */
export function itemDisplayName(item: ItemInstance, def: ItemDef): string {
  if (!item.identified) return def.generic;
  return item.bonus ? `${def.name} ${BONUS_SUFFIX[item.bonus.kind]}` : def.name;
}

/** What a bonus gives, as a line: "+5 Might", "+3 Armor Class". */
export function bonusLabel(bonus: { kind: StandardBonus; power: number }): string {
  const what: Record<StandardBonus, string> = {
    might: 'Might',
    intellect: 'Intellect',
    personality: 'Personality',
    endurance: 'Endurance',
    accuracy: 'Accuracy',
    speed: 'Speed',
    luck: 'Luck',
    hp: 'Hit Points',
    sp: 'Spell Points',
    ac: 'Armor Class',
    'resist-fire': 'Fire Resistance',
    'resist-electricity': 'Electricity Resistance',
    'resist-cold': 'Cold Resistance',
    'resist-poison': 'Poison Resistance',
  };
  return `+${bonus.power} ${what[bonus.kind]}`;
}
