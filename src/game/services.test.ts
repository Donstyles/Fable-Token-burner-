import { describe, expect, it } from 'vitest';
import { maxHp } from './character';
import { afflict } from './conditions';
import { freshState } from './fixtures';
import { itemDef } from './items';
import {
  buyFood,
  buyItem,
  buyPrice,
  buySpellbook,
  type GuildDef,
  guildSpells,
  identifyItem,
  joinGuild,
  rentRoom,
  repairItem,
  sellItem,
  sellPrice,
  type ShopDef,
  type TavernDef,
  type TempleDef,
  templeHeal,
  templePrice,
  train,
  type TrainerDef,
  trainerPrice,
} from './services';

const TAVERN: TavernDef = {
  id: 'inn',
  name: 'The Inn',
  roomPrice: 10,
  foodPrice: 5,
  foodCapacity: 14,
};
const TEMPLE: TempleDef = { id: 'temple', name: 'Temple', priceMultiplier: 1 };
const GUILD: GuildDef = {
  id: 'fire-guild',
  name: 'Initiate Guild of Fire',
  school: 'fire',
  maxSpellLevel: 4,
  membershipFee: 50,
  priceMultiplier: 1,
};
const TRAINER: TrainerDef = { id: 'trainer', name: 'Trainer', maxLevel: 5, priceMultiplier: 1 };
const SHOP: ShopDef = {
  id: 'smith',
  name: 'Smith',
  stock: ['dagger', 'potion-healing'],
  priceMultiplier: 1.5,
  identifyPrice: 20,
  repairFraction: 0.3,
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

describe('temple', () => {
  it('prices by the worst condition and cures everything, death included', () => {
    const state = freshState();
    expect(templeHeal(state, TEMPLE, 0)).toEqual({ ok: false, reason: 'nothing' });
    expect(templeHeal(state, TEMPLE, 9)).toEqual({ ok: false, reason: 'member' });
    const archer = state.party[1]!;
    afflict(archer.conditions, 'poisoned', 0);
    afflict(archer.conditions, 'weak', 0);
    expect(templePrice(TEMPLE, archer)).toBe(100);
    state.gold = 50;
    expect(templeHeal(state, TEMPLE, 1)).toEqual({ ok: false, reason: 'gold' });
    state.gold = 500;
    const r = templeHeal(state, TEMPLE, 1);
    expect(r.ok && r.price).toBe(100);
    expect(r.ok && r.cured.sort()).toEqual(['poisoned', 'weak']);
    expect(state.gold).toBe(400);
    const cleric = state.party[2]!;
    cleric.hp = -30;
    afflict(cleric.conditions, 'dead', 0);
    expect(templePrice(TEMPLE, cleric)).toBe(500);
    state.gold = 500;
    expect(templeHeal(state, TEMPLE, 2).ok).toBe(true);
    expect(cleric.hp).toBe(maxHp(cleric));
    expect(cleric.conditions).toEqual({});
    state.party[0]!.hp = 5;
    expect(templePrice(TEMPLE, state.party[0]!)).toBe(10);
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

describe('shop', () => {
  it('prices with the house markup and the Merchant skill', () => {
    const state = freshState();
    const knight = state.party[0]!;
    const dagger = itemDef('dagger');
    expect(buyPrice(SHOP, dagger, knight)).toBe(23);
    expect(sellPrice(SHOP, dagger, knight)).toBe(8);
    expect(sellPrice(SHOP, dagger, knight, true)).toBe(4);
    knight.skills.merchant = { level: 5, rank: 'expert' };
    expect(buyPrice(SHOP, dagger, knight)).toBe(18);
    expect(sellPrice(SHOP, dagger, knight)).toBe(9);
    knight.skills.merchant = { level: 20, rank: 'master' };
    expect(buyPrice(SHOP, dagger, knight)).toBe(11);
    expect(sellPrice(SHOP, dagger, knight)).toBe(11);
  });

  it('buys into the grid, sells from it, identifies and repairs', () => {
    const state = freshState();
    expect(buyItem(state, SHOP, 'bow', 0)).toEqual({ ok: false, reason: 'not-sold' });
    const bought = buyItem(state, SHOP, 'dagger', 0);
    expect(bought.ok && bought.price).toBe(23);
    expect(state.gold).toBe(177);
    const knight = state.party[0]!;
    const index = knight.grid.items.findIndex((p) => p.item.id === 'dagger');
    expect(index).toBeGreaterThanOrEqual(0);
    expect(identifyItem(state, SHOP, 0, index)).toEqual({ ok: false, reason: 'needless' });
    knight.grid.items[index]!.item.identified = false;
    expect(identifyItem(state, SHOP, 0, index)).toEqual({ ok: true, price: 20 });
    expect(knight.grid.items[index]!.item.identified).toBe(true);
    expect(repairItem(state, SHOP, 0, index)).toEqual({ ok: false, reason: 'needless' });
    knight.grid.items[index]!.item.broken = true;
    expect(repairItem(state, SHOP, 0, index)).toEqual({ ok: true, price: 5 });
    expect(knight.grid.items[index]!.item.broken).toBe(false);
    expect(state.gold).toBe(152);
    expect(sellItem(state, SHOP, 0, index)).toEqual({ ok: true, price: 8, item: 'dagger' });
    expect(state.gold).toBe(160);
    expect(knight.grid.items.some((p) => p.item.id === 'dagger')).toBe(false);
    expect(sellItem(state, SHOP, 0, 99)).toEqual({ ok: false, reason: 'item' });
    state.gold = 1;
    expect(buyItem(state, SHOP, 'dagger', 0)).toEqual({ ok: false, reason: 'gold' });
  });
});
