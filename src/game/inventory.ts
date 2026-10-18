/**
 * Inventory grid and equipment (Phase 5 step 5). Each member has an MM6 grid of 14 × 9 cells;
 * an item occupies w × h cells and may not overlap another. Equipment has MM6's slots: a main
 * hand, an off hand for a shield, a bow slot, body armour, helmet, boots, belt, cloak,
 * gauntlets, an amulet and six rings. Rules: a two-handed weapon and a shield exclude each
 * other (the one in the way is handed back as displaced); wielding or wearing needs the item's
 * skill learnt (a class that cannot learn Plate therefore cannot wear it); a broken item cannot
 * be equipped. Simplification: no second weapon in the off hand (MM6 has none either).
 */
import {
  armorRecovery,
  itemDef,
  type ItemDef,
  type ItemInstance,
  UNARMED,
  isEquippable,
  weaponRecovery,
} from './items';
import type { Dice } from './rng';
import { hasSkill, RANK_MULTIPLIER, type SkillSet } from './skills';

export const GRID_WIDTH = 14;
export const GRID_HEIGHT = 9;

export interface PlacedItem {
  x: number;
  y: number;
  item: ItemInstance;
}

export interface InventoryGrid {
  width: number;
  height: number;
  items: PlacedItem[];
}

export function createGrid(width = GRID_WIDTH, height = GRID_HEIGHT): InventoryGrid {
  return { width, height, items: [] };
}

function fits(grid: InventoryGrid, def: ItemDef, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x + def.w <= grid.width && y + def.h <= grid.height;
}

function overlaps(a: PlacedItem, def: ItemDef, x: number, y: number): boolean {
  const d = itemDef(a.item);
  return x < a.x + d.w && x + def.w > a.x && y < a.y + d.h && y + def.h > a.y;
}

/** Index of the item covering cell (x, y), or -1. */
export function itemIndexAt(grid: InventoryGrid, x: number, y: number): number {
  return grid.items.findIndex((p) => {
    const d = itemDef(p.item);
    return x >= p.x && x < p.x + d.w && y >= p.y && y < p.y + d.h;
  });
}

/** Can `item` sit with its top-left at (x, y)? `ignore` is an index to treat as absent (a move). */
export function canPlace(
  grid: InventoryGrid,
  item: ItemInstance,
  x: number,
  y: number,
  ignore = -1,
): boolean {
  const def = itemDef(item);
  if (!fits(grid, def, x, y)) return false;
  return grid.items.every((p, i) => i === ignore || !overlaps(p, def, x, y));
}

export function placeItem(grid: InventoryGrid, item: ItemInstance, x: number, y: number): boolean {
  if (!canPlace(grid, item, x, y)) return false;
  grid.items.push({ x, y, item });
  return true;
}

/** The first free top-left position, scanning rows top to bottom, or null when full. */
export function findFreeSlot(
  grid: InventoryGrid,
  item: ItemInstance,
): { x: number; y: number } | null {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (canPlace(grid, item, x, y)) return { x, y };
    }
  }
  return null;
}

/** Place at the first free position; null when there is no room. */
export function addItem(grid: InventoryGrid, item: ItemInstance): { x: number; y: number } | null {
  const at = findFreeSlot(grid, item);
  if (at) grid.items.push({ ...at, item });
  return at;
}

export function removeItem(grid: InventoryGrid, index: number): PlacedItem | undefined {
  if (index < 0 || index >= grid.items.length) return undefined;
  return grid.items.splice(index, 1)[0];
}

export function moveItem(grid: InventoryGrid, index: number, x: number, y: number): boolean {
  const p = grid.items[index];
  if (!p || !canPlace(grid, p.item, x, y, index)) return false;
  p.x = x;
  p.y = y;
  return true;
}

export function gridHas(grid: InventoryGrid, id: ItemInstance['id']): number {
  return grid.items.findIndex((p) => p.item.id === id);
}

export const RING_SLOTS = ['ring1', 'ring2', 'ring3', 'ring4', 'ring5', 'ring6'] as const;
export const EQUIP_SLOTS = [
  'mainHand',
  'offHand',
  'bow',
  'armor',
  'helmet',
  'boots',
  'belt',
  'cloak',
  'gauntlets',
  'amulet',
  ...RING_SLOTS,
] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

/** Worn items by slot; a missing slot is empty. JSON-safe. */
export type Equipment = Partial<Record<EquipSlot, ItemInstance>>;

export function createEquipment(): Equipment {
  return {};
}

export type EquipFailure = 'not-equippable' | 'skill' | 'broken';

export type EquipResult =
  { ok: true; slot: EquipSlot; displaced: ItemInstance[] } | { ok: false; reason: EquipFailure };

export function canEquip(item: ItemInstance, skills: SkillSet): EquipResult {
  const def = itemDef(item);
  if (!isEquippable(def)) return { ok: false, reason: 'not-equippable' };
  if (item.broken) return { ok: false, reason: 'broken' };
  if (def.skill && !hasSkill(skills, def.skill)) return { ok: false, reason: 'skill' };
  return { ok: true, slot: targetSlot(def, {}), displaced: [] };
}

/** The slot an item goes to; rings take the first free one, or the last when all are full. */
function targetSlot(def: ItemDef, eq: Equipment): EquipSlot {
  switch (def.kind) {
    case 'weapon':
      return def.ranged ? 'bow' : 'mainHand';
    case 'shield':
      return 'offHand';
    case 'ring':
      return RING_SLOTS.find((s) => eq[s] === undefined) ?? RING_SLOTS[RING_SLOTS.length - 1]!;
    case 'armor':
    case 'helmet':
    case 'boots':
    case 'belt':
    case 'cloak':
    case 'gauntlets':
    case 'amulet':
      return def.kind;
    default:
      return 'mainHand';
  }
}

/**
 * Equip an item; mutates `eq`. The item in the slot and anything the rules push out (a shield
 * for a two-handed weapon, the weapon for a shield) come back as `displaced` for the grid.
 */
export function equipItem(eq: Equipment, item: ItemInstance, skills: SkillSet): EquipResult {
  const check = canEquip(item, skills);
  if (!check.ok) return check;
  const def = itemDef(item);
  const slot = targetSlot(def, eq);
  const displaced: ItemInstance[] = [];
  const previous = eq[slot];
  if (previous) displaced.push(previous);
  if (slot === 'mainHand' && def.twoHanded && eq.offHand) {
    displaced.push(eq.offHand);
    delete eq.offHand;
  }
  if (slot === 'offHand' && eq.mainHand && itemDef(eq.mainHand).twoHanded) {
    displaced.push(eq.mainHand);
    delete eq.mainHand;
  }
  eq[slot] = item;
  return { ok: true, slot, displaced };
}

export function unequip(eq: Equipment, slot: EquipSlot): ItemInstance | undefined {
  const item = eq[slot];
  delete eq[slot];
  return item;
}

export function equippedItems(eq: Equipment): ItemInstance[] {
  return EQUIP_SLOTS.map((s) => eq[s]).filter((i): i is ItemInstance => i !== undefined);
}

/**
 * Armour class from equipment and armour skills: every piece's armour value, plus the body
 * armour's skill at every rank and the Shield skill × 1 / 2 / 3 by rank (MM6-GAPS.md 4, RPGC,
 * screenshot-23).
 */
export function equipmentArmor(eq: Equipment, skills: SkillSet): number {
  let ac = 0;
  for (const item of equippedItems(eq)) {
    if (item.broken) continue;
    const def = itemDef(item);
    ac += def.armor ?? 0;
    if (!def.skill) continue;
    const s = skills[def.skill];
    if (!s) continue;
    if (def.kind === 'armor') ac += s.level;
    if (def.kind === 'shield') ac += s.level * RANK_MULTIPLIER[s.rank];
  }
  return ac;
}

/**
 * Recovery added by armour and shield in MM6's units: whole at Normal, reduced at Expert, gone at
 * Master in the piece's skill (MM6-GAPS.md 4, RPGC). By how much Expert reduces it no source
 * says; half is ours.
 */
export function equipmentRecoveryPenalty(eq: Equipment, skills: SkillSet): number {
  let penalty = 0;
  for (const item of equippedItems(eq)) {
    const def = itemDef(item);
    const added = armorRecovery(def);
    if (!added) continue;
    const rank = def.skill ? (skills[def.skill]?.rank ?? 'normal') : 'normal';
    penalty += rank === 'master' ? 0 : rank === 'expert' ? Math.floor(added / 2) : added;
  }
  return penalty;
}

export interface WeaponInHand {
  item: ItemInstance | null;
  def: ItemDef | null;
  damage: Dice;
  /** MM6's recovery for the weapon's type, in MM6's units. */
  recovery: number;
  ranged: boolean;
}

/** The melee weapon, or bare hands. */
export function meleeWeapon(eq: Equipment): WeaponInHand {
  const item = eq.mainHand;
  if (!item || item.broken) {
    return {
      item: null,
      def: null,
      damage: UNARMED,
      recovery: weaponRecovery(null),
      ranged: false,
    };
  }
  const def = itemDef(item);
  return {
    item,
    def,
    damage: def.damage ?? UNARMED,
    recovery: weaponRecovery(def),
    ranged: false,
  };
}

/** The bow, or null when none is slung. */
export function rangedWeapon(eq: Equipment): WeaponInHand | null {
  const item = eq.bow;
  if (!item || item.broken) return null;
  const def = itemDef(item);
  return {
    item,
    def,
    damage: def.damage ?? UNARMED,
    recovery: weaponRecovery(def),
    ranged: true,
  };
}
