import { describe, expect, it } from 'vitest';
import { afflict } from '../game/conditions';
import { freshState } from '../game/fixtures';
import { createGrid, placeItem } from '../game/inventory';
import { createItem } from '../game/items';
import type { ShopDef } from '../game/services';
import { buy, identify, repair, sell, shopView } from './shop-model';

const SHOP: ShopDef = {
  id: 'shop',
  name: 'Armoury',
  stock: ['dagger', 'shield', 'potion-healing'],
  priceMultiplier: 2,
  identifyPrice: 10,
  repairFraction: 0.5,
};

describe('shop', () => {
  it('prices the stock and the pack for the active member', () => {
    const state = freshState();
    const v = shopView(state, SHOP, 0);
    expect(v.merchant).toBe(0);
    // MM6's values at the house's markup of two: a dagger 8, a wooden shield 100, the potion 10.
    expect(v.buy.map((b) => [b.name, b.price, b.canBuy])).toEqual([
      ['Dagger', 16, true],
      ['Wooden Shield', 200, true],
      ['Cure Wounds', 20, true],
    ]);
    expect(v.sell).toEqual([
      {
        gridIndex: 0,
        name: 'Cure Wounds',
        price: 5,
        broken: false,
        identified: true,
        repairPrice: 5,
        identifyPrice: 10,
      },
    ]);
  });

  it('buys and sells, and says why not', () => {
    const state = freshState();
    expect(buy(state, SHOP, 'dagger', 0)).toEqual({
      ok: true,
      message: 'Bought Dagger for 16 gold.',
    });
    expect(state.gold).toBe(184);
    expect(state.party[0]!.grid.items.map((p) => p.item.id)).toEqual(['potion-healing', 'dagger']);
    expect(sell(state, SHOP, 0, 0)).toEqual({
      ok: true,
      message: 'Sold Cure Wounds for 5 gold.',
    });
    expect(state.gold).toBe(189);
    expect(sell(state, SHOP, 0, 5)).toEqual({ ok: false, message: 'No such item.' });
    expect(buy(state, SHOP, 'long-sword', 0)).toEqual({ ok: false, message: 'Not sold here.' });
    state.gold = 10;
    expect(buy(state, SHOP, 'dagger', 0)).toEqual({ ok: false, message: 'Not enough gold.' });
    state.gold = 100;
    state.party[0]!.grid = createGrid(1, 1);
    placeItem(state.party[0]!.grid, createItem('potion-healing'), 0, 0);
    expect(buy(state, SHOP, 'dagger', 0)).toEqual({ ok: false, message: 'No room in the pack.' });
    afflict(state.party[0]!.conditions, 'dead', 0);
    expect(shopView(state, SHOP, 0).buy[0]).toMatchObject({
      canBuy: false,
      reason: 'No one to trade.',
    });
    expect(shopView(state, SHOP, 0).sell).toEqual([]);
  });

  it('identifies and repairs', () => {
    const state = freshState();
    const knight = state.party[0]!;
    placeItem(knight.grid, { ...createItem('shield', false), broken: true }, 2, 0);
    // Unidentified, it goes by its family's name (DESIGN 17.18); worth 100, 25 when broken.
    expect(shopView(state, SHOP, 0).sell[1]).toMatchObject({
      name: 'Small Shield',
      broken: true,
      identified: false,
      repairPrice: 50,
      price: 25,
    });
    expect(identify(state, SHOP, 0, 1)).toEqual({
      ok: true,
      message: 'Wooden Shield identified for 10 gold.',
    });
    expect(identify(state, SHOP, 0, 1)).toEqual({
      ok: false,
      message: 'It is already identified.',
    });
    expect(repair(state, SHOP, 0, 1)).toEqual({
      ok: true,
      message: 'Wooden Shield repaired for 50 gold.',
    });
    expect(repair(state, SHOP, 0, 1)).toEqual({ ok: false, message: 'It is not broken.' });
    expect(state.gold).toBe(140);
    expect(repair(state, SHOP, 0, 9)).toEqual({ ok: false, message: 'No such item.' });
  });
});
