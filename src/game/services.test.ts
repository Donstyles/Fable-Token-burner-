import { describe, expect, it } from 'vitest';
import { maxHp } from './character';
import { afflict } from './conditions';
import { freshState } from './fixtures';
import { createItem, itemDef } from './items';
import { MINUTES_PER_DAY } from './time';
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
  templeMultiplier,
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

describe('shop', () => {
  it('prices with the house markup and the Merchant skill', () => {
    const state = freshState();
    const knight = state.party[0]!;
    // A mace is worth 50 (MM6's value).
    const mace = itemDef('mace');
    const copy = createItem('mace');
    expect(buyPrice(SHOP, mace, knight)).toBe(75);
    expect(sellPrice(SHOP, copy, knight)).toBe(25);
    expect(sellPrice(SHOP, { ...copy, broken: true }, knight)).toBe(13);
    // An enchanted copy is worth 100 gold a point more (DESIGN 17.18).
    expect(sellPrice(SHOP, { ...copy, bonus: { kind: 'ac', power: 3 } }, knight)).toBe(175);
    knight.skills.merchant = { level: 5, rank: 'expert' };
    expect(buyPrice(SHOP, mace, knight)).toBe(60);
    expect(sellPrice(SHOP, copy, knight)).toBe(30);
    knight.skills.merchant = { level: 20, rank: 'master' };
    expect(buyPrice(SHOP, mace, knight)).toBe(38);
    expect(sellPrice(SHOP, copy, knight)).toBe(38);
  });

  it('buys into the grid, sells from it, identifies and repairs', () => {
    const state = freshState();
    expect(buyItem(state, SHOP, 'bow', 0)).toEqual({ ok: false, reason: 'not-sold' });
    // A dagger is worth 8 (MM6): 12 at the house's markup.
    const bought = buyItem(state, SHOP, 'dagger', 0);
    expect(bought.ok && bought.price).toBe(12);
    expect(state.gold).toBe(188);
    const knight = state.party[0]!;
    const index = knight.grid.items.findIndex((p) => p.item.id === 'dagger');
    expect(index).toBeGreaterThanOrEqual(0);
    expect(identifyItem(state, SHOP, 0, index)).toEqual({ ok: false, reason: 'needless' });
    knight.grid.items[index]!.item.identified = false;
    expect(identifyItem(state, SHOP, 0, index)).toEqual({ ok: true, price: 20 });
    expect(knight.grid.items[index]!.item.identified).toBe(true);
    expect(repairItem(state, SHOP, 0, index)).toEqual({ ok: false, reason: 'needless' });
    knight.grid.items[index]!.item.broken = true;
    expect(repairItem(state, SHOP, 0, index)).toEqual({ ok: true, price: 2 });
    expect(knight.grid.items[index]!.item.broken).toBe(false);
    expect(state.gold).toBe(166);
    expect(sellItem(state, SHOP, 0, index)).toEqual({ ok: true, price: 4, item: 'dagger' });
    expect(state.gold).toBe(170);
    expect(knight.grid.items.some((p) => p.item.id === 'dagger')).toBe(false);
    expect(sellItem(state, SHOP, 0, 99)).toEqual({ ok: false, reason: 'item' });
    state.gold = 1;
    expect(buyItem(state, SHOP, 'dagger', 0)).toEqual({ ok: false, reason: 'gold' });
  });
});
