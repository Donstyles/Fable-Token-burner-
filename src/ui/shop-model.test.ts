import { describe, expect, it } from 'vitest';
import { afflict } from '../game/conditions';
import { freshState } from '../game/fixtures';
import { createGrid, placeItem } from '../game/inventory';
import { createItem, itemDef } from '../game/items';
import { type ShopDef, visitShop } from '../game/services';
import { buy, identify, NOT_MY_TRADE, repair, sell, shopView } from './shop-model';

const SHOP: ShopDef = {
  id: 'shop',
  name: 'Armoury',
  kind: 'armor',
  val: 2,
  regular: { level: 1, families: ['small-shield', 'helm'], slots: 4 },
  special: { level: 2, families: ['leather'], slots: 2 },
  restockDays: 5,
  hours: [6, 18],
};

describe('shop', () => {
  it('lays out the counter, the shelf and the pack with the active member’s prices', () => {
    const state = freshState();
    const v = shopView(state, SHOP, 0);
    expect(v.merchant).toBe(0);
    expect(v.open).toBe(true);
    expect(v.buy).toHaveLength(4);
    expect(v.special).toHaveLength(2);
    for (const row of v.buy) {
      const item = visitShop(state, SHOP).stock[row.slot]!;
      // Value × Val with no Merchant.
      expect(row.price).toBe(itemDef(item).value * 2);
      expect(['small-shield', 'helm']).toContain(itemDef(item).family);
      expect(row.name).toBe(itemDef(item).name);
      expect(row.canBuy).toBe(row.price <= 200);
    }
    // The potion in the pack: not an armourer's trade; it would fetch value ÷ (Val + 2).
    expect(v.sell).toEqual([
      {
        gridIndex: 0,
        name: 'Cure Wounds',
        price: 2,
        broken: false,
        identified: true,
        trade: false,
        repairPrice: 2,
        identifyPrice: 100,
      },
    ]);
  });

  it('buys and sells, and says why not', () => {
    const state = freshState();
    state.gold = 1000;
    const first = visitShop(state, SHOP).stock[0]!;
    const price = itemDef(first).value * 2;
    expect(buy(state, SHOP, 'stock', 0, 0)).toEqual({
      ok: true,
      message: `Bought ${itemDef(first).name} for ${price} gold.`,
    });
    expect(state.gold).toBe(1000 - price);
    expect(state.party[0]!.grid.items.map((p) => p.item.id)).toEqual(['potion-healing', first.id]);
    expect(sell(state, SHOP, 0, 0)).toEqual({ ok: false, message: NOT_MY_TRADE });
    expect(sell(state, SHOP, 0, 1)).toEqual({
      ok: true,
      message: `Sold ${itemDef(first).name} for ${Math.max(1, Math.floor(itemDef(first).value / 4))} gold.`,
    });
    expect(sell(state, SHOP, 0, 5)).toEqual({ ok: false, message: 'No such item.' });
    expect(buy(state, SHOP, 'special', 9, 0)).toEqual({ ok: false, message: 'Not sold here.' });
    state.gold = 1;
    expect(buy(state, SHOP, 'stock', 0, 0)).toEqual({ ok: false, message: 'Not enough gold.' });
    state.gold = 1000;
    state.party[0]!.grid = createGrid(1, 1);
    placeItem(state.party[0]!.grid, createItem('potion-healing'), 0, 0);
    expect(buy(state, SHOP, 'stock', 0, 0)).toEqual({ ok: false, message: 'No room in the pack.' });
    afflict(state.party[0]!.conditions, 'dead', 0);
    expect(shopView(state, SHOP, 0).buy[0]).toMatchObject({
      canBuy: false,
      reason: 'No one to trade.',
    });
    expect(shopView(state, SHOP, 0).sell).toEqual([]);
  });

  it('identifies and repairs its own kind at MM7’s prices', () => {
    const state = freshState();
    const knight = state.party[0]!;
    placeItem(knight.grid, { ...createItem('shield', false), broken: true }, 2, 0);
    // Unknown, it goes by its family's name; identify is 50 × Val, repair value ÷ (6 − Val).
    expect(shopView(state, SHOP, 0).sell[1]).toMatchObject({
      name: 'Small Shield',
      broken: true,
      identified: false,
      trade: true,
      repairPrice: 25,
      identifyPrice: 100,
      price: 1,
    });
    expect(identify(state, SHOP, 0, 1)).toEqual({
      ok: true,
      message: 'Wooden Shield identified for 100 gold.',
    });
    expect(identify(state, SHOP, 0, 1)).toEqual({
      ok: false,
      message: 'It is already identified.',
    });
    expect(repair(state, SHOP, 0, 1)).toEqual({
      ok: true,
      message: 'Wooden Shield repaired for 25 gold.',
    });
    expect(repair(state, SHOP, 0, 1)).toEqual({ ok: false, message: 'It is not broken.' });
    expect(state.gold).toBe(75);
    expect(repair(state, SHOP, 0, 9)).toEqual({ ok: false, message: 'No such item.' });
    expect(identify(state, SHOP, 0, 0)).toEqual({ ok: false, message: NOT_MY_TRADE });
  });
});
