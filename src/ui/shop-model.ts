/**
 * Shop view-model (Phase 5 step 10; the shops of DESIGN.md 17.19): the counter and the special
 * shelf with the active member's buying prices, the member's pack with selling, identify and
 * repair prices and the reason a shop will not deal in a thing, and the actions as message
 * lines, all over `src/game/services.ts`. The member's Merchant percentage betters every price.
 */
import { isLiving } from '../game/character';
import { itemDisplayName } from '../game/enchant';
import { findFreeSlot } from '../game/inventory';
import { itemDef } from '../game/items';
import {
  buyItem,
  buyPriceOf,
  identifyItem,
  identifyPrice,
  isOpen,
  merchantPercent,
  repairItem,
  repairPrice,
  sellItem,
  sellPrice,
  type ShopDef,
  tradesIn,
  visitShop,
} from '../game/services';
import { itemValue } from '../game/enchant';
import type { GameState } from '../game/state';
import { itemName } from './inventory-model';
import { type ActionOutcome, NOT_ENOUGH_GOLD } from './services-model';

export const NOT_MY_TRADE = 'Not my trade.';

export interface BuyRow {
  list: 'stock' | 'special';
  slot: number;
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
  /** The shop deals in this kind: it buys, names and mends it. A general store buys anything. */
  trade: boolean;
  repairPrice: number;
  identifyPrice: number;
}

export interface ShopView {
  /** The active member's Merchant percentage. */
  merchant: number;
  open: boolean;
  hours: readonly [number, number];
  buy: BuyRow[];
  special: BuyRow[];
  sell: SellRow[];
}

export function shopView(state: GameState, shop: ShopDef, index: number): ShopView {
  const shelves = visitShop(state, shop);
  const c = state.party[index];
  const open = isOpen(shop, state.clock.minutes);
  const rows = (list: 'stock' | 'special'): BuyRow[] =>
    shelves[list].map((item, slot): BuyRow => {
      const def = itemDef(item);
      const name = itemDisplayName(item, def);
      if (!c || !isLiving(c)) {
        return {
          list,
          slot,
          name,
          price: Math.round(itemValue(item, def) * shop.val),
          canBuy: false,
          reason: 'No one to trade.',
        };
      }
      const price = buyPriceOf(shop, itemValue(item, def), c);
      let reason: string | null = null;
      if (state.gold < price) reason = NOT_ENOUGH_GOLD;
      else if (!findFreeSlot(c.grid, item)) reason = 'No room in the pack.';
      return { list, slot, name, price, canBuy: reason === null, reason };
    });
  if (!c || !isLiving(c)) {
    return {
      merchant: 0,
      open,
      hours: shop.hours,
      buy: rows('stock'),
      special: rows('special'),
      sell: [],
    };
  }
  const sell = c.grid.items.map((p, gridIndex): SellRow => {
    const def = itemDef(p.item);
    const trade = tradesIn(shop, def);
    return {
      gridIndex,
      name: itemName(p.item),
      price: sellPrice(shop, p.item, c),
      broken: p.item.broken,
      identified: p.item.identified,
      trade: trade || shop.kind === 'general',
      repairPrice: repairPrice(shop, p.item, c),
      identifyPrice: identifyPrice(shop, c),
    };
  });
  return {
    merchant: merchantPercent(c),
    open,
    hours: shop.hours,
    buy: rows('stock'),
    special: rows('special'),
    sell,
  };
}

export function buy(
  state: GameState,
  shop: ShopDef,
  list: 'stock' | 'special',
  slot: number,
  index: number,
): ActionOutcome {
  const view = shopView(state, shop, index);
  const row = (list === 'stock' ? view.buy : view.special)[slot];
  if (!row) return { ok: false, message: 'Not sold here.' };
  if (!row.canBuy) return { ok: false, message: row.reason ?? 'Cannot buy.' };
  const r = buyItem(state, shop, list, slot, index);
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
  if (!r.ok) {
    const message =
      r.reason === 'item'
        ? 'No such item.'
        : r.reason === 'trade'
          ? NOT_MY_TRADE
          : 'No one to trade.';
    return { ok: false, message };
  }
  return { ok: true, message: `Sold ${itemName(r.item)} for ${r.price} gold.` };
}

function serviceOutcome(
  r: ReturnType<typeof identifyItem>,
  done: string,
  needless: string,
): ActionOutcome {
  if (r.ok) return { ok: true, message: `${done} for ${r.price} gold.` };
  const message =
    r.reason === 'gold'
      ? NOT_ENOUGH_GOLD
      : r.reason === 'needless'
        ? needless
        : r.reason === 'trade'
          ? NOT_MY_TRADE
          : 'No such item.';
  return { ok: false, message };
}

export function identify(
  state: GameState,
  shop: ShopDef,
  index: number,
  gridIndex: number,
): ActionOutcome {
  const item = state.party[index]?.grid.items[gridIndex]?.item;
  const r = identifyItem(state, shop, index, gridIndex);
  // Named in full once known: the line says what it turned out to be.
  const label = item ? itemName(item) : 'The item';
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
