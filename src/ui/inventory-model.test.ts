import { describe, expect, it } from 'vitest';
import { afflict } from '../game/conditions';
import { freshState } from '../game/fixtures';
import { createGrid, placeItem } from '../game/inventory';
import { createItem } from '../game/items';
import {
  actions,
  derived,
  equipSelected,
  giveSelected,
  gridBlocks,
  slotRows,
  tapCell,
  tapSlot,
  unequipSelected,
  useSelected,
} from './inventory-model';

describe('inventory rows', () => {
  it('draws the pack as blocks and the equipment as slot rows', () => {
    const knight = freshState().party[0]!;
    const blocks = gridBlocks(knight, null);
    expect(blocks).toEqual([
      {
        index: 0,
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        name: 'Potion of Healing',
        glyph: 'Po',
        selected: false,
        broken: false,
      },
    ]);
    expect(gridBlocks(knight, { kind: 'grid', index: 0 })[0]!.selected).toBe(true);
    const rows = slotRows(knight, null);
    expect(rows).toHaveLength(11);
    expect(rows[0]).toEqual({
      slot: 'mainHand',
      label: 'Main hand',
      name: 'Long Sword',
      glyph: 'Wp',
      selected: false,
    });
    expect(rows[3]!.name).toBe('Leather Armor');
    expect(rows[10]!.label).toBe('Ring');
    knight.equipment.ring1 = createItem('copper-ring');
    expect(slotRows(knight, null)).toHaveLength(12);
  });

  it('derives the combat numbers', () => {
    const d = derived(freshState().party[0]!);
    expect(d.armorClass).toBeGreaterThan(0);
    expect(d.damage).toMatch(/^3d3/);
    expect(d.recovery).toMatch(/ s$/);
  });
});

describe('tapping the grid', () => {
  it('selects, deselects and moves', () => {
    const knight = freshState().party[0]!;
    let sel = tapCell(knight, null, 0, 0).selection;
    expect(sel).toEqual({ kind: 'grid', index: 0 });
    expect(tapCell(knight, sel, 0, 0).selection).toBeNull();
    const moved = tapCell(knight, sel, 5, 5);
    expect(moved).toEqual({ selection: null, message: null });
    expect(knight.grid.items[0]).toMatchObject({ x: 5, y: 5 });
    sel = tapCell(knight, null, 5, 5).selection;
    expect(sel).toEqual({ kind: 'grid', index: 0 });
    expect(tapCell(knight, null, 1, 1)).toEqual({ selection: null, message: null });
  });

  it('refuses a move that does not fit', () => {
    const knight = freshState().party[0]!;
    placeItem(knight.grid, createItem('shield'), 0, 1);
    const sel = tapCell(knight, null, 0, 1).selection;
    expect(sel).toEqual({ kind: 'grid', index: 1 });
    expect(tapCell(knight, sel, 13, 8)).toEqual({ selection: sel, message: 'No room there.' });
  });
});

describe('equipping', () => {
  it('equips a selected item and puts the displaced one in the pack', () => {
    const knight = freshState().party[0]!;
    placeItem(knight.grid, createItem('short-sword'), 2, 0);
    const r = equipSelected(knight, { kind: 'grid', index: 1 });
    expect(r).toEqual({ selection: null, message: 'Short Sword equipped.' });
    expect(knight.equipment.mainHand?.id).toBe('short-sword');
    expect(knight.grid.items.map((p) => p.item.id)).toEqual(['potion-healing', 'long-sword']);
  });

  it('explains a missing skill and a broken item', () => {
    const knight = freshState().party[0]!;
    placeItem(knight.grid, createItem('staff'), 2, 0);
    const sel = { kind: 'grid', index: 1 } as const;
    expect(equipSelected(knight, sel).message).toBe('Needs the Staff skill.');
    const a = actions(knight, sel);
    expect(a).toEqual([
      { id: 'equip', label: 'Equip', enabled: false, note: 'Needs the Staff skill.' },
    ]);
    placeItem(knight.grid, { ...createItem('shield'), broken: true }, 4, 0);
    expect(equipSelected(knight, { kind: 'grid', index: 2 }).message).toBe('It is broken.');
  });

  it('undoes an equip when the displaced item has no room', () => {
    const knight = freshState().party[0]!;
    knight.grid = createGrid(1, 3);
    placeItem(knight.grid, createItem('short-sword'), 0, 0);
    const sel = { kind: 'grid', index: 0 } as const;
    const r = equipSelected(knight, sel);
    expect(r).toEqual({ selection: sel, message: 'No room in the pack for Long Sword.' });
    expect(knight.equipment.mainHand?.id).toBe('long-sword');
    expect(knight.grid.items).toHaveLength(1);
    expect(knight.grid.items[0]!.item.id).toBe('short-sword');
  });

  it('tapping a slot equips the selection or selects the worn item', () => {
    const knight = freshState().party[0]!;
    placeItem(knight.grid, createItem('shield'), 2, 0);
    expect(tapSlot(knight, { kind: 'grid', index: 1 }, 'helmet').message).toBe('Shield equipped.');
    expect(knight.equipment.offHand?.id).toBe('shield');
    expect(tapSlot(knight, { kind: 'grid', index: 0 }, 'offHand').selection).toEqual({
      kind: 'slot',
      slot: 'offHand',
    });
    const sel = { kind: 'slot', slot: 'offHand' } as const;
    expect(tapSlot(knight, sel, 'offHand').selection).toBeNull();
    expect(tapSlot(knight, null, 'belt').selection).toBeNull();
    expect(actions(knight, sel)).toEqual([
      { id: 'unequip', label: 'Take off', enabled: true, note: null },
    ]);
  });
});

describe('taking off', () => {
  it('puts the item in the pack, at a tapped cell or the first free one', () => {
    const knight = freshState().party[0]!;
    const sel = { kind: 'slot', slot: 'armor' } as const;
    expect(tapCell(knight, sel, 2, 2)).toEqual({
      selection: null,
      message: 'Leather Armor taken off.',
    });
    expect(knight.equipment.armor).toBeUndefined();
    expect(knight.grid.items[1]).toMatchObject({ x: 2, y: 2 });
    const r = unequipSelected(knight, { kind: 'slot', slot: 'mainHand' });
    expect(r.message).toBe('Long Sword taken off.');
    expect(knight.equipment.mainHand).toBeUndefined();
    expect(knight.grid.items).toHaveLength(3);
  });

  it('keeps the item on when the pack is full', () => {
    const knight = freshState().party[0]!;
    knight.grid = createGrid(1, 1);
    placeItem(knight.grid, createItem('potion-healing'), 0, 0);
    const sel = { kind: 'slot', slot: 'armor' } as const;
    expect(unequipSelected(knight, sel)).toEqual({
      selection: sel,
      message: 'No room in the pack.',
    });
    expect(knight.equipment.armor?.id).toBe('leather-armor');
    expect(tapCell(knight, sel, 0, 0).selection).toEqual({ kind: 'grid', index: 0 });
  });
});

describe('using items', () => {
  it('drinks a potion and removes it', () => {
    const knight = freshState().party[0]!;
    knight.hp -= 5;
    const r = useSelected(knight, { kind: 'grid', index: 0 }, { member: 0, partySize: 4 });
    expect(r).toEqual({ selection: null, message: 'Alric heals 5 hit points.' });
    expect(knight.grid.items).toHaveLength(0);
  });

  it('reads a scroll into a cast event', () => {
    const sera = freshState().party[3]!;
    placeItem(sera.grid, createItem('scroll-fire-bolt'), 2, 0);
    const sel = { kind: 'grid', index: 1 } as const;
    expect(actions(sera, sel)).toEqual([{ id: 'use', label: 'Read', enabled: true, note: null }]);
    const r = useSelected(sera, sel, { member: 3, partySize: 4 });
    expect(r.message).toBe('Sera reads Fire Bolt.');
    expect(r.cast?.spell).toBe('fire-bolt');
    expect(r.cast?.effects[0]).toMatchObject({ kind: 'projectile', element: 'fire' });
    expect(sera.grid.items).toHaveLength(1);
  });

  it('refuses when the member is down and when the item has no use', () => {
    const knight = freshState().party[0]!;
    afflict(knight.conditions, 'dead', 0);
    const sel = { kind: 'grid', index: 0 } as const;
    expect(useSelected(knight, sel, { member: 0, partySize: 4 }).message).toBe(
      'Alric cannot use it now.',
    );
    expect(actions(knight, sel)[0]).toMatchObject({ enabled: false, note: 'Alric is dead.' });
    placeItem(knight.grid, createItem('copper-ring'), 3, 3);
    expect(
      useSelected(knight, { kind: 'grid', index: 1 }, { member: 0, partySize: 4 }).message,
    ).toBe('It has no use.');
  });
});

describe('giving', () => {
  it('moves the item to the other pack when there is room', () => {
    const state = freshState();
    const knight = state.party[0]!;
    const archer = state.party[1]!;
    const sel = { kind: 'grid', index: 0 } as const;
    expect(giveSelected(knight, archer, sel)).toEqual({
      selection: null,
      message: 'Potion of Healing given to Mira.',
    });
    expect(knight.grid.items).toHaveLength(0);
    expect(archer.grid.items).toHaveLength(2);
    archer.grid = createGrid(1, 1);
    placeItem(archer.grid, createItem('potion-healing'), 0, 0);
    knight.grid = createGrid(1, 1);
    placeItem(knight.grid, createItem('potion-healing'), 0, 0);
    expect(giveSelected(knight, archer, sel)).toEqual({
      selection: sel,
      message: 'Mira has no room for it.',
    });
  });
});
