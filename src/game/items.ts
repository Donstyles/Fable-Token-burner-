/**
 * Item definitions (Phase 5 step 1; MM6's catalogue since DESIGN.md 17.18). Every item has a
 * kind, a footprint on the MM6 inventory grid, a value in gold, a difficulty to identify and
 * repair it, the picture it is drawn with, what an unidentified one is called and, by kind,
 * weapon dice with the skill that wields them, an armour value with the skill that wears it,
 * or a use for potions and scrolls. The arms, armour and jewellery are MM6's own 132 (the two
 * blasters left out), as catalogue.ts tables them by family (docs/gaps/items.md 2); the
 * potions, scrolls and keys are the slice's. Recovery is MM6's by weapon and armour type, in
 * MM6's units (MM6-GAPS.md 8, GF-M), not per item. A copy may carry one of MM6's standard
 * enchantments (enchant.ts). Simplifications: no stat requirements; the special enchantments,
 * gems, wands, herbs and the spellbooks as items wait (items.md 3.2, 2.4 to 2.7).
 */
import { CATALOGUE, type Family } from './catalogue';
import type { ConditionId } from './conditions';
import type { StandardBonus } from './enchant';
import type { Dice } from './rng';
import type { ArmorSkill, SkillId, WeaponSkill } from './skills';
import type { SpellId } from './spells';

export const ITEM_KINDS = [
  'weapon',
  'armor',
  'shield',
  'helmet',
  'boots',
  'belt',
  'cloak',
  'gauntlets',
  'ring',
  'amulet',
  'potion',
  'scroll',
  'misc',
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export type ItemUse =
  | { kind: 'heal'; amount: number }
  | { kind: 'restore-sp'; amount: number }
  | { kind: 'cure'; condition: ConditionId }
  | { kind: 'spell'; spell: SpellId; skill: number };

export interface ItemDef {
  id: ItemId;
  name: string;
  kind: ItemKind;
  /** Grid cells wide and tall. */
  w: number;
  h: number;
  value: number;
  /** The skill that wields or wears it; equipping needs it learnt. */
  skill?: SkillId;
  damage?: Dice;
  twoHanded?: boolean;
  /** A spear's kind: one hand, or two for one more die of its size (items.md 2.1). */
  extraDieTwoHanded?: boolean;
  ranged?: boolean;
  armor?: number;
  use?: ItemUse;
  /**
   * The lowest treasure level the item turns up at (items.md 2.1, "Lvl"); none for a thing
   * that is never random (a key). The treasure generator weighs it 10 at this level, 7 at the
   * next and 3 at the one after (DESIGN.md 17.12).
   */
  level?: number;
  /** To identify and to repair it: Identify Item or Repair Item × rank must reach it (items.md 5). */
  difficulty: number;
  /** The asset id of its picture (assets/items/<picture>.png), shared across a family. */
  picture: ItemId;
  /** What an unidentified one is called. */
  generic: string;
  /** The catalogue family it belongs to (catalogue.ts), for the shops' shelves. */
  family?: string;
}

export const ITEM_IDS = [
  'long-sword',
  'warrior-sword',
  'crusader-sword',
  'champion-sword',
  'lionheart-sword',
  'two-handed-sword',
  'great-sword',
  'heroic-sword',
  'broadsword',
  'steel-broadsword',
  'mighty-broadsword',
  'short-sword',
  'pirate-cutlass',
  'master-cutlass',
  'dagger',
  'blood-dagger',
  'shadow-dagger',
  'mage-dagger',
  'jeweled-dagger',
  'long-dagger',
  'piercing-dagger',
  'divine-dagger',
  'axe',
  'battle-axe',
  'war-axe',
  'dwarven-axe',
  'supreme-axe',
  'poleax',
  'heavy-poleax',
  'grand-poleax',
  'spear',
  'stout-spear',
  'serpent-spear',
  'savage-spear',
  'sacred-spear',
  'halberd',
  'massive-halberd',
  'elite-halberd',
  'trident',
  'ornate-trident',
  'titanic-trident',
  'bow',
  'elven-bow',
  'precision-bow',
  'magic-bow',
  'stellar-bow',
  'crossbow',
  'accurate-crossbow',
  'true-crossbow',
  'mace',
  'wicked-mace',
  'thunder-mace',
  'wonder-mace',
  'death-mace',
  'hammer',
  'dark-hammer',
  'holy-hammer',
  'club',
  'spiked-club',
  'killer-club',
  'staff',
  'emerald-staff',
  'power-staff',
  'leather-armor',
  'studded-leather',
  'enchanted-leather',
  'dragon-leather',
  'imperial-leather',
  'chain-mail',
  'steel-chain-mail',
  'noble-chain-mail',
  'royal-chain-mail',
  'majestic-chain-mail',
  'plate-armor',
  'steel-plate-armor',
  'golden-plate-armor',
  'kite-shield',
  'tower-shield',
  'castle-shield',
  'celestial-shield',
  'olympian-shield',
  'shield',
  'bronze-shield',
  'steel-shield',
  'spirit-shield',
  'astral-shield',
  'helmet',
  'steel-helm',
  'guardian-helm',
  'defender-helm',
  'angelic-helm',
  'cloth-hat',
  'fancy-hat',
  'wizard-cap',
  'crown',
  'regal-crown',
  'almighty-crown',
  'leather-belt',
  'mercenary-belt',
  'vanguard-belt',
  'warlord-belt',
  'sovereign-belt',
  'leather-cloak',
  'phantom-cloak',
  'elven-cloak',
  'cardinal-cloak',
  'dooms-day-cloak',
  'gauntlets',
  'knight-gauntlets',
  'paladin-gauntlets',
  'cavalier-gauntlets',
  'ultimate-gauntlets',
  'boots',
  'steel-boots',
  'armored-boots',
  'sterling-boots',
  'ultimate-boots',
  'copper-ring',
  'sparkling-ring',
  'lunar-ring',
  'witch-ring',
  'blessed-ring',
  'valuable-ring',
  'precious-ring',
  'ethereal-ring',
  'exquisite-ring',
  'scarab-ring',
  'turquoise-amulet',
  'gothic-amulet',
  'claw-amulet',
  'ancient-amulet',
  'ruby-star-amulet',
  'potion-healing',
  'scroll-torch-light',
  'scroll-fire-bolt',
  'iron-key',
  'letter',
  'parcel',
  'seal-of-the-halls',
  'seal-of-the-barrow',
  'seal-of-the-deep',
  'sea-kings-chart',
  'abbots-confession',
  'remedy',
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

function fromCatalogue(e: (typeof CATALOGUE)[number]): ItemDef {
  const f: Family = e.family;
  const def: ItemDef = {
    id: e.id,
    name: e.name,
    kind: f.kind,
    w: f.w,
    h: f.h,
    value: e.value,
    level: e.level,
    difficulty: e.difficulty,
    picture: f.picture,
    generic: f.generic,
    family: f.id,
  };
  if (f.skill) def.skill = f.skill;
  if (f.twoHanded) def.twoHanded = true;
  if (f.extraDieTwoHanded) def.extraDieTwoHanded = true;
  if (f.ranged) def.ranged = true;
  if (e.damage) def.damage = e.damage;
  if (e.armor !== undefined) def.armor = e.armor;
  return def;
}

/** The slice's potions, scrolls and keys (items.md 2.6, 2.7, 2.10; values MM6's). */
const OTHERS: ItemDef[] = [
  {
    id: 'potion-healing',
    name: 'Cure Wounds',
    kind: 'potion',
    w: 1,
    h: 1,
    value: 10,
    use: { kind: 'heal', amount: 10 },
    level: 1,
    difficulty: 0,
    picture: 'potion-healing',
    generic: 'Potion',
  },
  {
    id: 'scroll-torch-light',
    name: 'Scroll of Torch Light',
    kind: 'scroll',
    w: 1,
    h: 1,
    value: 10,
    use: { kind: 'spell', spell: 'torch-light', skill: 1 },
    level: 1,
    difficulty: 0,
    picture: 'scroll-torch-light',
    generic: 'Scroll',
  },
  {
    id: 'scroll-fire-bolt',
    name: 'Scroll of Fire Bolt',
    kind: 'scroll',
    w: 1,
    h: 1,
    value: 40,
    use: { kind: 'spell', spell: 'fire-bolt', skill: 4 },
    level: 2,
    difficulty: 0,
    picture: 'scroll-fire-bolt',
    generic: 'Scroll',
  },
  {
    id: 'iron-key',
    name: 'Iron Key',
    kind: 'misc',
    w: 1,
    h: 2,
    value: 0,
    difficulty: 0,
    picture: 'iron-key',
    generic: 'Key',
  },
  // A thing carried for someone (DESIGN.md 17.20): worth nothing to a shop, drawn by its kind's glyph.
  {
    id: 'letter',
    name: 'A Sealed Letter',
    kind: 'misc',
    w: 1,
    h: 1,
    value: 0,
    difficulty: 0,
    picture: 'letter',
    generic: 'Letter',
  },
  {
    id: 'parcel',
    name: 'A Wrapped Parcel',
    kind: 'misc',
    w: 2,
    h: 1,
    value: 0,
    difficulty: 0,
    picture: 'parcel',
    generic: 'Parcel',
  },
  // The campaign's things (docs/CAMPAIGN.md): the wardens' seals, the chart, the confession.
  ...(
    [
      [
        'seal-of-the-halls',
        'The Seal of the Halls',
        'A bronze disc the Warden wore, a door cut in it',
      ],
      [
        'seal-of-the-barrow',
        'The Seal of the Barrow',
        'An iron disc the Barrow King wore, two doors cut in it',
      ],
      [
        'seal-of-the-deep',
        'The Seal of the Deep',
        'A disc of green stone the Drowned Lord wore, three doors cut in it',
      ],
      [
        'sea-kings-chart',
        'The Sea Kings’ Chart',
        'A chart on sealskin: the coast, and seven marks counted from the sea',
      ],
      [
        'abbots-confession',
        'The Abbot’s Confession',
        'Pages in a cramped hand: what waits behind the First Door',
      ],
      [
        'remedy',
        'Gefa’s Remedy',
        'A stoppered horn of something green and bitter, for the fen ague',
      ],
    ] as const
  ).map(([id, name, generic]): ItemDef => ({
    id,
    name,
    kind: 'misc',
    w: 1,
    h: 1,
    value: 0,
    difficulty: 0,
    picture: id,
    generic,
  })),
];

export const ITEMS: Record<ItemId, ItemDef> = Object.fromEntries(
  [...CATALOGUE.map(fromCatalogue), ...OTHERS].map((d) => [d.id, d]),
) as Record<ItemId, ItemDef>;

/** One item in the world: its definition plus the state MM6 tracks per copy. */
export interface ItemInstance {
  id: ItemId;
  identified: boolean;
  broken: boolean;
  /** A standard enchantment, "of Might" and its kin (enchant.ts). */
  bonus?: { kind: StandardBonus; power: number };
}

export function isItemId(value: unknown): value is ItemId {
  return typeof value === 'string' && (ITEM_IDS as readonly string[]).includes(value);
}

export function itemDef(item: ItemInstance | ItemId): ItemDef {
  return ITEMS[typeof item === 'string' ? item : item.id];
}

/** A fresh copy; plain items the party knows are identified from the start. */
export function createItem(id: ItemId, identified = true): ItemInstance {
  return { id, identified, broken: false };
}

/** Bare hands, MM6's 1d3. */
export const UNARMED: Dice = { count: 1, sides: 3 };

/** MM6's recovery by weapon type, in MM6's recovery units (MM6-GAPS.md 8, GF-M). */
export const WEAPON_RECOVERY: Readonly<Record<WeaponSkill, number>> = {
  staff: 100,
  sword: 90,
  dagger: 60,
  axe: 100,
  spear: 80,
  bow: 100,
  mace: 80,
};

/** Bare hands recover as slowly as a staff: MM6 has no Unarmed skill (GF-M); a club the same. */
export const UNARMED_RECOVERY = 100;

/** Recovery added while armour or a shield is worn, before skill (MM6-GAPS.md 8, GF-M). */
export const ARMOR_RECOVERY: Readonly<Record<ArmorSkill, number>> = {
  shield: 10,
  leather: 10,
  chain: 20,
  plate: 30,
};

/** A weapon's recovery by its type; bare hands for no weapon. */
export function weaponRecovery(def: ItemDef | null): number {
  const skill = def?.skill;
  if (skill && skill in WEAPON_RECOVERY) return WEAPON_RECOVERY[skill as WeaponSkill];
  return UNARMED_RECOVERY;
}

/** The recovery a worn piece adds by its type before its skill acts; 0 for most pieces. */
export function armorRecovery(def: ItemDef): number {
  const skill = def.skill;
  if (skill && skill in ARMOR_RECOVERY) return ARMOR_RECOVERY[skill as ArmorSkill];
  return 0;
}

export const EQUIPPABLE_KINDS: readonly ItemKind[] = [
  'weapon',
  'armor',
  'shield',
  'helmet',
  'boots',
  'belt',
  'cloak',
  'gauntlets',
  'ring',
  'amulet',
];

export function isEquippable(def: ItemDef): boolean {
  return EQUIPPABLE_KINDS.includes(def.kind);
}
