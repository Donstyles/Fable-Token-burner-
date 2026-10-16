/**
 * Item definitions (Phase 5 step 1). Every item has a kind, a footprint on the MM6 inventory
 * grid, a value in gold and, by kind, weapon dice with the skill that wields them, an armour
 * value with the skill that wears it, or a use for potions and scrolls. The starter set covers
 * the slice: dice and values follow the MM6 item table as community lists give it (dagger 2d2,
 * long sword 3d3, staff 2d4, long bow 3d3, leather +4, chain +8); recovery times in seconds are
 * ours, as DESIGN 14.2 notes for all recovery. Simplifications: no enchantments or stat
 * requirements yet; the paper-doll art ids come with the Phase 4 doll pipeline.
 */
import type { ConditionId } from './conditions';
import type { Dice } from './rng';
import type { SkillId } from './skills';
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
  ranged?: boolean;
  /** Seconds between attacks before Speed and skill bonuses. */
  recoverySec?: number;
  armor?: number;
  /** Seconds added to recovery while worn, lifted by Expert rank in its skill. */
  recoveryPenaltySec?: number;
  use?: ItemUse;
}

export const ITEM_IDS = [
  'dagger',
  'short-sword',
  'long-sword',
  'mace',
  'axe',
  'spear',
  'staff',
  'bow',
  'leather-armor',
  'chain-mail',
  'shield',
  'helmet',
  'boots',
  'copper-ring',
  'potion-healing',
  'scroll-torch-light',
  'scroll-fire-bolt',
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export const ITEMS: Record<ItemId, ItemDef> = {
  dagger: {
    id: 'dagger',
    name: 'Dagger',
    kind: 'weapon',
    w: 1,
    h: 2,
    value: 15,
    skill: 'dagger',
    damage: { count: 2, sides: 2 },
    recoverySec: 0.8,
  },
  'short-sword': {
    id: 'short-sword',
    name: 'Short Sword',
    kind: 'weapon',
    w: 1,
    h: 3,
    value: 30,
    skill: 'sword',
    damage: { count: 2, sides: 3 },
    recoverySec: 1.0,
  },
  'long-sword': {
    id: 'long-sword',
    name: 'Long Sword',
    kind: 'weapon',
    w: 1,
    h: 4,
    value: 50,
    skill: 'sword',
    damage: { count: 3, sides: 3 },
    recoverySec: 1.2,
  },
  mace: {
    id: 'mace',
    name: 'Mace',
    kind: 'weapon',
    w: 1,
    h: 3,
    value: 50,
    skill: 'mace',
    damage: { count: 2, sides: 4 },
    recoverySec: 1.1,
  },
  axe: {
    id: 'axe',
    name: 'Axe',
    kind: 'weapon',
    w: 2,
    h: 3,
    value: 50,
    skill: 'axe',
    damage: { count: 3, sides: 2 },
    recoverySec: 1.3,
  },
  spear: {
    id: 'spear',
    name: 'Spear',
    kind: 'weapon',
    w: 1,
    h: 4,
    value: 50,
    skill: 'spear',
    damage: { count: 1, sides: 9 },
    twoHanded: true,
    recoverySec: 1.1,
  },
  staff: {
    id: 'staff',
    name: 'Staff',
    kind: 'weapon',
    w: 1,
    h: 4,
    value: 20,
    skill: 'staff',
    damage: { count: 2, sides: 4 },
    twoHanded: true,
    recoverySec: 1.3,
  },
  bow: {
    id: 'bow',
    name: 'Long Bow',
    kind: 'weapon',
    w: 2,
    h: 4,
    value: 100,
    skill: 'bow',
    damage: { count: 3, sides: 3 },
    ranged: true,
    recoverySec: 1.3,
  },
  'leather-armor': {
    id: 'leather-armor',
    name: 'Leather Armor',
    kind: 'armor',
    w: 2,
    h: 3,
    value: 30,
    skill: 'leather',
    armor: 4,
    recoveryPenaltySec: 0.1,
  },
  'chain-mail': {
    id: 'chain-mail',
    name: 'Chain Mail',
    kind: 'armor',
    w: 2,
    h: 4,
    value: 150,
    skill: 'chain',
    armor: 8,
    recoveryPenaltySec: 0.3,
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    kind: 'shield',
    w: 2,
    h: 2,
    value: 40,
    skill: 'shield',
    armor: 4,
    recoveryPenaltySec: 0.1,
  },
  helmet: {
    id: 'helmet',
    name: 'Helmet',
    kind: 'helmet',
    w: 2,
    h: 2,
    value: 30,
    armor: 2,
  },
  boots: {
    id: 'boots',
    name: 'Boots',
    kind: 'boots',
    w: 2,
    h: 2,
    value: 20,
    armor: 2,
  },
  'copper-ring': {
    id: 'copper-ring',
    name: 'Copper Ring',
    kind: 'ring',
    w: 1,
    h: 1,
    value: 50,
  },
  'potion-healing': {
    id: 'potion-healing',
    name: 'Potion of Healing',
    kind: 'potion',
    w: 1,
    h: 1,
    value: 50,
    use: { kind: 'heal', amount: 10 },
  },
  'scroll-torch-light': {
    id: 'scroll-torch-light',
    name: 'Scroll of Torch Light',
    kind: 'scroll',
    w: 1,
    h: 1,
    value: 50,
    use: { kind: 'spell', spell: 'torch-light', skill: 1 },
  },
  'scroll-fire-bolt': {
    id: 'scroll-fire-bolt',
    name: 'Scroll of Fire Bolt',
    kind: 'scroll',
    w: 1,
    h: 1,
    value: 200,
    use: { kind: 'spell', spell: 'fire-bolt', skill: 4 },
  },
};

/** One item in the world: its definition plus the state MM6 tracks per copy. */
export interface ItemInstance {
  id: ItemId;
  identified: boolean;
  broken: boolean;
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
export const UNARMED_RECOVERY_SEC = 0.8;

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
