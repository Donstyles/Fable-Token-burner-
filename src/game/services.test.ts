import { describe, expect, it } from 'vitest';
import { maxHp } from './character';
import { afflict } from './conditions';
import { freshState } from './fixtures';
import { itemValue } from './enchant';
import { createItem, itemDef } from './items';
import { MINUTES_PER_DAY } from './time';
import {
  buyFood,
  buyItem,
  buyPrice,
  buyPriceOf,
  buySpellbook,
  type GuildDef,
  guildSpells,
  identifyItem,
  identifyPrice,
  isOpen,
  joinGuild,
  merchantPercent,
  onShelf,
  rentRoom,
  repairItem,
  repairPrice,
  sellItem,
  sellPrice,
  type ShopDef,
  type TavernDef,
  type TempleDef,
  templeHeal,
  templeMultiplier,
  templePrice,
  tradesIn,
  train,
  type TrainerDef,
  trainerPrice,
  visitShop,
} from './services';

const TAVERN: TavernDef = {
  id: 'inn',
  name: 'The Inn',
  roomPrice: 10,
  foodPrice: 5,
  foodCapacity: 14,
};
const TEMPLE: TempleDef = { id: 'temple', name: 'Temple', donation: 10 };
const GUILD: GuildDef = {
  id: 'fire-guild',
  name: 'Initiate Guild of Fire',
  school: 'fire',
  maxSpellLevel: 4,
  membershipFee: 50,
  priceMultiplier: 1,
};
const TRAINER: TrainerDef = { id: 'trainer', name: 'Trainer', maxLevel: 5, priceMultiplier: 1 };
/** MM6's Knife Shoppe (items.md 6.5): any weapon of the first level, daggers on the shelf. */
const SHOP: ShopDef = {
  id: 'smith',
  name: 'The Knife Shoppe',
  kind: 'weapon',
  val: 1.5,
  regular: { level: 1, families: ['weapon'], slots: 6 },
  special: { level: 2, families: ['dagger'], slots: 4 },
  restockDays: 2,
  hours: [6, 18],
};
const STORE: ShopDef = {
  id: 'store',
  name: "Traveler's Supply",
  kind: 'general',
  val: 2,
  regular: { level: 1, families: ['potion', 'scroll', 'ring'], slots: 6 },
  restockDays: 1,
  hours: [5, 22],
};

describe('tavern', () => {
  it('rents a room that heals without food and sells food to capacity', () => {
    const state = freshState();
    state.party[0]!.hp = 1;
    const r = rentRoom(state, TAVERN);
    expect(r.ok && r.price).toBe(10);
    expect(state.gold).toBe(190);
    expect(state.food).toBe(7);
    expect(state.party[0]!.hp).toBe(maxHp(state.party[0]!));
    expect(buyFood(state, TAVERN)).toEqual({ ok: true, units: 7, price: 35 });
    expect(state.food).toBe(14);
    expect(state.gold).toBe(155);
    expect(buyFood(state, TAVERN)).toEqual({ ok: false, reason: 'full' });
    state.food = 0;
    state.gold = 3;
    expect(buyFood(state, TAVERN)).toEqual({ ok: false, reason: 'gold' });
    state.gold = 12;
    expect(buyFood(state, TAVERN)).toEqual({ ok: true, units: 2, price: 10 });
    expect(state.gold).toBe(2);
    expect(rentRoom(state, TAVERN)).toEqual({ ok: false, reason: 'gold' });
  });
});

describe('temple (characters.md 10.6)', () => {
  it('asks the donation times the weekday a condition began, five for the dead, and cures everything', () => {
    const state = freshState();
    expect(templeHeal(state, TEMPLE, 0)).toEqual({ ok: false, reason: 'nothing' });
    expect(templeHeal(state, TEMPLE, 9)).toEqual({ ok: false, reason: 'member' });
    const archer = state.party[1]!;
    // Poisoned on a Wednesday (the third day), weak on the Monday: the dearest counts.
    afflict(archer.conditions, 'poisoned', 2 * MINUTES_PER_DAY + 60);
    afflict(archer.conditions, 'weak', 0);
    expect(templeMultiplier('weak', 0)).toBe(1);
    expect(templeMultiplier('poisoned', 2 * MINUTES_PER_DAY + 60)).toBe(3);
    expect(templePrice(TEMPLE, archer)).toBe(30);
    state.gold = 20;
    expect(templeHeal(state, TEMPLE, 1)).toEqual({ ok: false, reason: 'gold' });
    state.gold = 500;
    const r = templeHeal(state, TEMPLE, 1);
    expect(r.ok && r.price).toBe(30);
    expect(r.ok && r.cured.sort()).toEqual(['poisoned', 'weak']);
    expect(state.gold).toBe(470);
    const cleric = state.party[2]!;
    cleric.hp = -30;
    // Dead on a Sunday: seven times five donations.
    afflict(cleric.conditions, 'dead', 6 * MINUTES_PER_DAY);
    expect(templePrice(TEMPLE, cleric)).toBe(350);
    state.gold = 350;
    expect(templeHeal(state, TEMPLE, 2).ok).toBe(true);
    expect(state.gold).toBe(0);
    expect(cleric.hp).toBe(maxHp(cleric));
    expect(cleric.conditions).toEqual({});
    // Wounds alone cost the donation; eradication ten times the weekday.
    state.party[0]!.hp = 5;
    expect(templePrice(TEMPLE, state.party[0]!)).toBe(10);
    expect(templeMultiplier('eradicated', MINUTES_PER_DAY)).toBe(20);
  });
});

describe('guild', () => {
  it('needs membership, sells its school up to its level and teaches at once', () => {
    const state = freshState();
    expect(buySpellbook(state, GUILD, 'fire-bolt', 3)).toEqual({
      ok: false,
      reason: 'membership',
    });
    expect(joinGuild(state, GUILD)).toEqual({ ok: true, price: 50 });
    expect(joinGuild(state, GUILD)).toEqual({ ok: false, reason: 'member' });
    expect(state.memberships).toEqual(['fire-guild']);
    expect(guildSpells(GUILD).map((s) => s.id)).toEqual([
      'torch-light',
      'protection-from-fire',
      'fire-bolt',
    ]);
    expect(buySpellbook(state, GUILD, 'sparks', 3)).toEqual({ ok: false, reason: 'not-sold' });
    expect(buySpellbook(state, GUILD, 'torch-light', 3)).toEqual({ ok: false, reason: 'known' });
    expect(buySpellbook(state, GUILD, 'fire-bolt', 0)).toEqual({ ok: false, reason: 'class' });
    expect(buySpellbook(state, GUILD, 'fire-bolt', 3)).toEqual({ ok: false, reason: 'gold' });
    state.gold = 300;
    expect(buySpellbook(state, GUILD, 'fire-bolt', 3)).toEqual({ ok: true, price: 300 });
    expect(state.gold).toBe(0);
    expect(state.party[3]!.spells).toContain('fire-bolt');
  });
});

describe('trainer', () => {
  it('raises a level for gold when the experience is there, up to its maximum', () => {
    const state = freshState();
    const knight = state.party[0]!;
    expect(train(state, TRAINER, 0)).toEqual({ ok: false, reason: 'xp' });
    knight.xp = 1000;
    expect(trainerPrice(TRAINER, knight)).toBe(50);
    state.gold = 10;
    expect(train(state, TRAINER, 0)).toEqual({ ok: false, reason: 'gold' });
    state.gold = 60;
    const r = train(state, TRAINER, 0);
    expect(r.ok && r.price).toBe(50);
    expect(r.ok && r.result.level).toBe(2);
    expect(knight.level).toBe(2);
    expect(knight.skillPoints).toBe(5);
    expect(state.gold).toBe(10);
    knight.level = 5;
    knight.xp = 99999;
    state.gold = 9999;
    expect(train(state, TRAINER, 0)).toEqual({ ok: false, reason: 'level' });
    afflict(knight.conditions, 'dead', 0);
    knight.level = 2;
    expect(train(state, TRAINER, 0)).toEqual({ ok: false, reason: 'member' });
  });
});

describe('shop (DESIGN 17.19, items.md 6)', () => {
  it('prices by MM7’s formulas from the house’s factor and the Merchant percentage', () => {
    const state = freshState();
    const knight = state.party[0]!;
    // The document's example: a Longsword, value 50, at Val 1.5.
    const sword = createItem('long-sword');
    expect(merchantPercent(knight)).toBe(0);
    expect(buyPrice(SHOP, itemDef('long-sword'), knight)).toBe(75);
    expect(sellPrice(SHOP, sword, knight)).toBe(14);
    expect(identifyPrice(SHOP, knight)).toBe(75);
    expect(repairPrice(SHOP, sword, knight)).toBe(11);
    knight.skills.merchant = { level: 4, rank: 'expert' };
    expect(merchantPercent(knight)).toBe(15);
    expect(buyPrice(SHOP, itemDef('long-sword'), knight)).toBe(63);
    expect(sellPrice(SHOP, sword, knight)).toBe(21);
    expect(identifyPrice(SHOP, knight)).toBe(63);
    expect(repairPrice(SHOP, sword, knight)).toBe(9);
    knight.skills.merchant = { level: 10, rank: 'master' };
    expect(merchantPercent(knight)).toBe(37);
    expect(buyPrice(SHOP, itemDef('long-sword'), knight)).toBe(50);
    expect(sellPrice(SHOP, sword, knight)).toBe(32);
    expect(identifyPrice(SHOP, knight)).toBe(47);
    expect(repairPrice(SHOP, sword, knight)).toBe(6);
    // Never below the value, and a broken thing fetches 1; a general store pays half.
    knight.skills.merchant = { level: 30, rank: 'master' };
    expect(buyPrice(SHOP, itemDef('long-sword'), knight)).toBe(50);
    expect(sellPrice(SHOP, sword, knight)).toBe(50);
    expect(sellPrice(SHOP, { ...sword, broken: true }, knight)).toBe(1);
    expect(sellPrice(STORE, sword, knight)).toBe(25);
    // An enchanted copy is priced by its worth.
    const ring = { ...createItem('copper-ring'), bonus: { kind: 'ac' as const, power: 3 } };
    expect(sellPrice(STORE, ring, knight)).toBe(200);
  });

  it('fills its shelves on a visit from its families at its level, and again after its period', () => {
    const state = freshState();
    const first = visitShop(state, SHOP);
    expect(first.stock).toHaveLength(6);
    expect(first.special).toHaveLength(4);
    for (const item of first.stock) {
      expect(itemDef(item).kind).toBe('weapon');
      expect(itemDef(item).level).toBe(1);
      expect(item.identified).toBe(true);
    }
    for (const item of first.special) {
      expect(itemDef(item).family).toBe('dagger');
      expect(itemDef(item).level).toBeLessThanOrEqual(2);
    }
    expect(first.restockAt).toBe(state.clock.minutes + 2 * MINUTES_PER_DAY);
    // Back the next day: the same shelves; after two days, new ones.
    state.clock.minutes += MINUTES_PER_DAY;
    expect(visitShop(state, SHOP)).toBe(first);
    state.clock.minutes += MINUTES_PER_DAY;
    const again = visitShop(state, SHOP);
    expect(again).not.toBe(first);
    expect(again.restockAt).toBe(state.clock.minutes + 2 * MINUTES_PER_DAY);
    // A general store's goods are its families' first tier; it never has a special shelf.
    const store = visitShop(state, STORE);
    expect(store.special).toEqual([]);
    for (const item of store.stock)
      expect(['potion', 'scroll', 'ring']).toContain(itemDef(item).kind);
  });

  it('keeps hours and deals only in its own kind', () => {
    expect(isOpen(SHOP, 6 * 60)).toBe(true);
    expect(isOpen(SHOP, 17 * 60 + 59)).toBe(true);
    expect(isOpen(SHOP, 18 * 60)).toBe(false);
    expect(isOpen(SHOP, 5 * 60 + 30)).toBe(false);
    expect(isOpen(STORE, 21 * 60)).toBe(true);
    expect(tradesIn(SHOP, itemDef('dagger'))).toBe(true);
    expect(tradesIn(SHOP, itemDef('leather-armor'))).toBe(false);
    expect(tradesIn(STORE, itemDef('potion-healing'))).toBe(false);
    const armoury: ShopDef = { ...SHOP, kind: 'armor' };
    expect(tradesIn(armoury, itemDef('helmet'))).toBe(true);
    expect(tradesIn(armoury, itemDef('boots'))).toBe(false);
    const magic: ShopDef = { ...SHOP, kind: 'magic' };
    expect(tradesIn(magic, itemDef('boots'))).toBe(true);
    expect(tradesIn(magic, itemDef('copper-ring'))).toBe(true);
    expect(tradesIn(magic, itemDef('dagger'))).toBe(false);
    expect(onShelf({ level: 1, families: ['misc'], slots: 1 }, itemDef('scarab-ring'))).toBe(true);
    expect(onShelf({ level: 1, families: ['misc'], slots: 1 }, itemDef('helmet'))).toBe(false);
  });

  it('buys off a shelf into the grid, sells its own kind, names and mends', () => {
    const state = freshState();
    state.gold = 1000;
    const shelves = visitShop(state, SHOP);
    const first = shelves.stock[0]!;
    const knight = state.party[0]!;
    const price = buyPriceOf(SHOP, itemValue(first, itemDef(first)), knight);
    expect(buyItem(state, SHOP, 'stock', 99, 0)).toEqual({ ok: false, reason: 'not-sold' });
    const bought = buyItem(state, SHOP, 'stock', 0, 0);
    expect(bought.ok && bought.price).toBe(price);
    expect(bought.ok && bought.item).toBe(first);
    expect(state.gold).toBe(1000 - price);
    expect(shelves.stock).toHaveLength(5);
    const index = knight.grid.items.findIndex((p) => p.item === first);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(identifyItem(state, SHOP, 0, index)).toEqual({ ok: false, reason: 'needless' });
    knight.grid.items[index]!.item.identified = false;
    const named = identifyItem(state, SHOP, 0, index);
    expect(named).toEqual({ ok: true, price: 75 });
    expect(knight.grid.items[index]!.item.identified).toBe(true);
    expect(repairItem(state, SHOP, 0, index)).toEqual({ ok: false, reason: 'needless' });
    knight.grid.items[index]!.item.broken = true;
    const mended = repairItem(state, SHOP, 0, index);
    expect(mended.ok).toBe(true);
    expect(knight.grid.items[index]!.item.broken).toBe(false);
    const sold = sellItem(state, SHOP, 0, index);
    expect(sold.ok && sold.item).toBe(first);
    expect(knight.grid.items.some((p) => p.item === first)).toBe(false);
    // The potion is not a smith's trade, but the store takes it at half.
    const potion = knight.grid.items.findIndex((p) => p.item.id === 'potion-healing');
    expect(sellItem(state, SHOP, 0, potion)).toEqual({ ok: false, reason: 'trade' });
    expect(identifyItem(state, STORE, 0, potion)).toEqual({ ok: false, reason: 'trade' });
    expect(sellItem(state, STORE, 0, potion)).toMatchObject({ ok: true, price: 5 });
    expect(sellItem(state, SHOP, 0, 99)).toEqual({ ok: false, reason: 'item' });
    state.gold = 1;
    expect(buyItem(state, SHOP, 'stock', 0, 0)).toEqual({ ok: false, reason: 'gold' });
  });
});
