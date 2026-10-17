/**
 * Inventory view-model (Phase 5 step 10): the blocks on the 14 × 9 grid, the equipment slot
 * rows and the derived combat numbers for one member, and what a tap does: select an item,
 * move it to a free cell, equip it, take a worn item off, use a potion or scroll, or hand an
 * item to another member. Every rule comes from `src/game/inventory.ts`; a change that fails
 * half way (no room for a displaced item) is undone so the sheet never loses an item.
 */
import {
  armorClass,
  attackBonus,
  type Character,
  damageDice,
  healCharacter,
  isConscious,
  recoverySec,
  restoreSp,
} from '../game/character';
import { cure, worstCondition } from '../game/conditions';
import {
  addItem,
  canEquip,
  canPlace,
  EQUIP_SLOTS,
  type Equipment,
  type EquipSlot,
  equipItem,
  itemIndexAt,
  moveItem,
  type PlacedItem,
  removeItem,
  RING_SLOTS,
  unequip,
} from '../game/inventory';
import { isEquippable, type ItemInstance, type ItemKind, itemDef } from '../game/items';
import { diceText } from '../game/rng';
import { SKILL_NAMES } from '../game/skills';
import { applySpell, type SpellEffect, type SpellId, spellDef } from '../game/spells';
import { formatSeconds } from './sheet-model';

export type InvSelection =
  { kind: 'grid'; index: number } | { kind: 'slot'; slot: EquipSlot } | null;

export const SLOT_LABELS: Record<EquipSlot, string> = {
  mainHand: 'Main hand',
  offHand: 'Off hand',
  bow: 'Bow',
  armor: 'Armour',
  helmet: 'Helmet',
  boots: 'Boots',
  belt: 'Belt',
  cloak: 'Cloak',
  gauntlets: 'Gauntlets',
  amulet: 'Amulet',
  ring1: 'Ring',
  ring2: 'Ring',
  ring3: 'Ring',
  ring4: 'Ring',
  ring5: 'Ring',
  ring6: 'Ring',
};

/** Two-letter kind marks until the icon pipeline delivers. */
export const KIND_GLYPHS: Record<ItemKind, string> = {
  weapon: 'Wp',
  armor: 'Ar',
  shield: 'Sh',
  helmet: 'He',
  boots: 'Bo',
  belt: 'Be',
  cloak: 'Cl',
  gauntlets: 'Ga',
  ring: 'Ri',
  amulet: 'Am',
  potion: 'Po',
  scroll: 'Sc',
  misc: 'Mi',
};

export interface GridBlock {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  glyph: string;
  kind: ItemKind;
  selected: boolean;
  broken: boolean;
}

export interface SlotRow {
  slot: EquipSlot;
  label: string;
  name: string | null;
  glyph: string | null;
  kind: ItemKind | null;
  selected: boolean;
}

export interface Derived {
  armorClass: number;
  attack: number;
  damage: string;
  recovery: string;
}

export interface TapOutcome {
  selection: InvSelection;
  message: string | null;
}

export interface UseOutcome extends TapOutcome {
  /** A scroll's spell, for the runtime to perform. */
  cast?: { spell: SpellId; effects: SpellEffect[] };
}

export function itemName(item: ItemInstance): string {
  const def = itemDef(item);
  return item.identified ? def.name : `Unknown ${def.kind}`;
}

export function gridBlocks(c: Character, sel: InvSelection): GridBlock[] {
  return c.grid.items.map((p, index) => {
    const def = itemDef(p.item);
    return {
      index,
      x: p.x,
      y: p.y,
      w: def.w,
      h: def.h,
      name: itemName(p.item),
      glyph: KIND_GLYPHS[def.kind],
      kind: def.kind,
      selected: sel?.kind === 'grid' && sel.index === index,
      broken: p.item.broken,
    };
  });
}

/** The ten named slots, then the rings worn and one empty ring slot. */
export function slotRows(c: Character, sel: InvSelection): SlotRow[] {
  const rows: SlotRow[] = [];
  let emptyRing = false;
  for (const slot of EQUIP_SLOTS) {
    const item = c.equipment[slot];
    const isRing = (RING_SLOTS as readonly string[]).includes(slot);
    if (isRing && !item) {
      if (emptyRing) continue;
      emptyRing = true;
    }
    rows.push({
      slot,
      label: SLOT_LABELS[slot],
      name: item ? itemName(item) : null,
      glyph: item ? KIND_GLYPHS[itemDef(item).kind] : null,
      kind: item ? itemDef(item).kind : null,
      selected: sel?.kind === 'slot' && sel.slot === slot,
    });
  }
  return rows;
}

export function derived(c: Character): Derived {
  return {
    armorClass: armorClass(c),
    attack: attackBonus(c),
    damage: diceText(damageDice(c) ?? { count: 1, sides: 3 }),
    recovery: formatSeconds(recoverySec(c)),
  };
}

function selectedGridItem(c: Character, sel: InvSelection): PlacedItem | null {
  return sel?.kind === 'grid' ? (c.grid.items[sel.index] ?? null) : null;
}

/** A snapshot of grid and equipment, to undo a change that fails half way. */
function snapshot(c: Character): { items: PlacedItem[]; equipment: Equipment } {
  return { items: c.grid.items.map((p) => ({ ...p })), equipment: { ...c.equipment } };
}

function restore(c: Character, snap: { items: PlacedItem[]; equipment: Equipment }): void {
  c.grid.items = snap.items;
  for (const slot of EQUIP_SLOTS) delete c.equipment[slot];
  Object.assign(c.equipment, snap.equipment);
}

/** Tap a grid cell: select the item there, or move the selected item to it. */
export function tapCell(c: Character, sel: InvSelection, x: number, y: number): TapOutcome {
  const hit = itemIndexAt(c.grid, x, y);
  if (hit >= 0) {
    if (sel?.kind === 'grid' && sel.index === hit) return { selection: null, message: null };
    return { selection: { kind: 'grid', index: hit }, message: null };
  }
  if (sel?.kind === 'grid') {
    if (moveItem(c.grid, sel.index, x, y)) return { selection: null, message: null };
    return { selection: sel, message: 'No room there.' };
  }
  if (sel?.kind === 'slot') {
    const item = c.equipment[sel.slot];
    if (item && canPlace(c.grid, item, x, y)) {
      unequip(c.equipment, sel.slot);
      c.grid.items.push({ x, y, item });
      return { selection: null, message: `${itemName(item)} taken off.` };
    }
    return { selection: sel, message: 'No room there.' };
  }
  return { selection: null, message: null };
}

/** Tap a slot: equip the selected grid item, or select the worn item to take it off. */
export function tapSlot(c: Character, sel: InvSelection, slot: EquipSlot): TapOutcome {
  const placed = selectedGridItem(c, sel);
  if (placed && isEquippable(itemDef(placed.item))) return equipSelected(c, sel);
  if (sel?.kind === 'slot' && sel.slot === slot) return { selection: null, message: null };
  if (c.equipment[slot]) return { selection: { kind: 'slot', slot }, message: null };
  return { selection: null, message: null };
}

export function equipReason(c: Character, item: ItemInstance): string | null {
  const r = canEquip(item, c.skills);
  if (r.ok) return null;
  const def = itemDef(item);
  if (r.reason === 'skill' && def.skill) return `Needs the ${SKILL_NAMES[def.skill]} skill.`;
  if (r.reason === 'broken') return 'It is broken.';
  return 'It cannot be worn.';
}

export function equipSelected(c: Character, sel: InvSelection): TapOutcome {
  const placed = selectedGridItem(c, sel);
  if (!placed || sel?.kind !== 'grid') return { selection: sel, message: null };
  const reason = equipReason(c, placed.item);
  if (reason) return { selection: sel, message: reason };
  const snap = snapshot(c);
  removeItem(c.grid, sel.index);
  const r = equipItem(c.equipment, placed.item, c.skills);
  if (!r.ok) {
    restore(c, snap);
    return { selection: sel, message: 'It cannot be worn.' };
  }
  for (const d of r.displaced) {
    if (!addItem(c.grid, d)) {
      restore(c, snap);
      return { selection: sel, message: `No room in the pack for ${itemName(d)}.` };
    }
  }
  return { selection: null, message: `${itemName(placed.item)} equipped.` };
}

export function unequipSelected(c: Character, sel: InvSelection): TapOutcome {
  if (sel?.kind !== 'slot') return { selection: sel, message: null };
  const item = c.equipment[sel.slot];
  if (!item) return { selection: null, message: null };
  unequip(c.equipment, sel.slot);
  if (!addItem(c.grid, item)) {
    c.equipment[sel.slot] = item;
    return { selection: sel, message: 'No room in the pack.' };
  }
  return { selection: null, message: `${itemName(item)} taken off.` };
}

export interface UseContext {
  /** The member's index and the party size, for a scroll's member spells. */
  member: number;
  partySize: number;
}

/** Drink a potion or read a scroll from the pack; the member must be up. */
export function useSelected(c: Character, sel: InvSelection, ctx: UseContext): UseOutcome {
  const placed = selectedGridItem(c, sel);
  if (!placed || sel?.kind !== 'grid') return { selection: sel, message: null };
  const def = itemDef(placed.item);
  if (!def.use) return { selection: sel, message: 'It has no use.' };
  if (!isConscious(c)) return { selection: sel, message: `${c.name} cannot use it now.` };
  const use = def.use;
  let message: string;
  let cast: UseOutcome['cast'] | undefined;
  switch (use.kind) {
    case 'heal':
      message = `${c.name} heals ${healCharacter(c, use.amount)} hit points.`;
      break;
    case 'restore-sp':
      message = `${c.name} regains ${restoreSp(c, use.amount)} spell points.`;
      break;
    case 'cure':
      if (use.condition === 'good' || !cure(c.conditions, use.condition)) {
        return { selection: sel, message: `${c.name} is not ${use.condition}.` };
      }
      message = `${c.name} is no longer ${use.condition}.`;
      break;
    case 'spell': {
      const spell = spellDef(use.spell);
      cast = {
        spell: use.spell,
        effects: applySpell(spell, {
          skill: use.skill,
          rank: 'normal',
          member: ctx.member,
          partySize: ctx.partySize,
        }),
      };
      message = `${c.name} reads ${spell.name}.`;
      break;
    }
  }
  removeItem(c.grid, sel.index);
  const out: UseOutcome = { selection: null, message };
  if (cast) out.cast = cast;
  return out;
}

/** Hand the selected grid item to another member's pack. */
export function giveSelected(from: Character, to: Character, sel: InvSelection): TapOutcome {
  const placed = selectedGridItem(from, sel);
  if (!placed || sel?.kind !== 'grid') return { selection: sel, message: null };
  if (!addItem(to.grid, placed.item)) {
    return { selection: sel, message: `${to.name} has no room for it.` };
  }
  removeItem(from.grid, sel.index);
  return { selection: null, message: `${itemName(placed.item)} given to ${to.name}.` };
}

export interface InvAction {
  id: 'equip' | 'unequip' | 'use';
  label: string;
  enabled: boolean;
  note: string | null;
}

/** The buttons for the selection, with the reason when one cannot be used. */
export function actions(c: Character, sel: InvSelection): InvAction[] {
  if (sel?.kind === 'slot') {
    return [{ id: 'unequip', label: 'Take off', enabled: !!c.equipment[sel.slot], note: null }];
  }
  const placed = selectedGridItem(c, sel);
  if (!placed) return [];
  const def = itemDef(placed.item);
  const out: InvAction[] = [];
  if (isEquippable(def)) {
    const reason = equipReason(c, placed.item);
    out.push({ id: 'equip', label: 'Equip', enabled: reason === null, note: reason });
  }
  if (def.use) {
    const up = isConscious(c);
    out.push({
      id: 'use',
      label: def.kind === 'scroll' ? 'Read' : 'Use',
      enabled: up,
      note: up ? null : `${c.name} is ${worstCondition(c.conditions)}.`,
    });
  }
  return out;
}
