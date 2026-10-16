/**
 * Shop view-model (Phase 5 step 10): the stock with the active member's buying prices, the
 * member's pack with selling, identify and repair prices, and the actions as message lines,
 * all over `src/game/services.ts`. The member's Merchant skill betters every price.
 */
import { isLiving } from '../game/character';
import { findFreeSlot } from '../game/inventory';
import { createItem, type ItemId, itemDef } from '../game/items';
import {
  buyItem,
  buyPrice,
  identifyItem,
  merchantFactor,
  repairItem,
  repairPrice,
  sellItem,
  sellPrice,
  type ShopDef,
} from '../game/services';
import type { GameState } from '../game/state';
import { itemName } from './inventory-model';
import { type ActionOutcome, NOT_ENOUGH_GOLD } from './services-model';

export interface BuyRow {
  id: ItemId;
  name: string;
  price: number;
  canBuy: boolean;
  reason: string | null;
}

export interface SellRow {
  gridIndex: number;
  name: string;
  price: number;
  broken: boolean;
  identified: boolean;
  repairPrice: number;
  identifyPrice: number;
}

export interface ShopView {
  /** The active member's Merchant advantage in per cent. */
  merchant: number;
  buy: BuyRow[];
  sell: SellRow[];
}

export function shopView(state: GameState, shop: ShopDef, index: number): ShopView {
  const c = state.party[index];
  if (!c || !isLiving(c)) {
    return {
      merchant: 0,
      buy: shop.stock.map((id) => ({
        id,
        name: itemDef(id).name,
        price: itemDef(id).value * shop.priceMultiplier,
        canBuy: false,
        reason: 'No one to trade.',
      })),
      sell: [],
    };
  }
  const buy = shop.stock.map((id): BuyRow => {
    const def = itemDef(id);
    const price = buyPrice(shop, def, c);
    let reason: string | null = null;
    if (state.gold < price) reason = NOT_ENOUGH_GOLD;
    else if (!findFreeSlot(c.grid, createItem(id))) reason = 'No room in the pack.';
    return { id, name: def.name, price, canBuy: reason === null, reason };
  });
  const sell = c.grid.items.map((p, gridIndex): SellRow => {
    const def = itemDef(p.item);
    return {
      gridIndex,
      name: itemName(p.item),
      price: sellPrice(shop, def, c, p.item.broken),
      broken: p.item.broken,
      identified: p.item.identified,
      repairPrice: repairPrice(shop, def),
      identifyPrice: shop.identifyPrice,
    };
  });
  return { merchant: Math.round(merchantFactor(c) * 100), buy, sell };
}

export function buy(state: GameState, shop: ShopDef, id: ItemId, index: number): ActionOutcome {
  const row = shopView(state, shop, index).buy.find((b) => b.id === id);
  if (!row) return { ok: false, message: 'Not sold here.' };
  if (!row.canBuy) return { ok: false, message: row.reason ?? 'Cannot buy.' };
  const r = buyItem(state, shop, id, index);
  if (!r.ok) return { ok: false, message: 'Cannot buy.' };
  return { ok: true, message: `Bought ${row.name} for ${r.price} gold.` };
}

export function sell(
  state: GameState,
  shop: ShopDef,
  index: number,
  gridIndex: number,
): ActionOutcome {
  const r = sellItem(state, shop, index, gridIndex);
  if (!r.ok)
    return { ok: false, message: r.reason === 'item' ? 'No such item.' : 'No one to trade.' };
  return { ok: true, message: `Sold ${itemDef(r.item).name} for ${r.price} gold.` };
}

function serviceOutcome(
  r: ReturnType<typeof identifyItem>,
  done: string,
  needless: string,
): ActionOutcome {
  if (r.ok) return { ok: true, message: `${done} for ${r.price} gold.` };
  const message =
    r.reason === 'gold' ? NOT_ENOUGH_GOLD : r.reason === 'needless' ? needless : 'No such item.';
  return { ok: false, message };
}

export function identify(
  state: GameState,
  shop: ShopDef,
  index: number,
  gridIndex: number,
): ActionOutcome {
  const name = state.party[index]?.grid.items[gridIndex]?.item;
  const r = identifyItem(state, shop, index, gridIndex);
  const label = name ? itemDef(name).name : 'The item';
  return serviceOutcome(r, `${label} identified`, 'It is already identified.');
}

export function repair(
  state: GameState,
  shop: ShopDef,
  index: number,
  gridIndex: number,
): ActionOutcome {
  const item = state.party[index]?.grid.items[gridIndex]?.item;
  const r = repairItem(state, shop, index, gridIndex);
  const label = item ? itemName(item) : 'The item';
  return serviceOutcome(r, `${label} repaired`, 'It is not broken.');
}
