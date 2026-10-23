import { describe, expect, it } from 'vitest';
import { afflict } from '../game/conditions';
import { freshState } from '../game/fixtures';
import type { GuildDef, TavernDef, TempleDef, TrainerDef } from '../game/services';
import {
  buyBook,
  buyFoodAction,
  guildView,
  heal,
  join,
  rent,
  tavernView,
  templeRows,
  trainMember,
  trainerRows,
} from './services-model';

const TAVERN: TavernDef = {
  id: 'inn',
  name: 'The Inn',
  roomPrice: 20,
  foodPrice: 5,
  foodCapacity: 10,
};
const TEMPLE: TempleDef = { id: 'temple', name: 'Temple', priceMultiplier: 1 };
const GUILD: GuildDef = {
  id: 'fire-guild',
  name: 'Guild of Fire',
  school: 'fire',
  maxSpellLevel: 4,
  membershipFee: 50,
  priceMultiplier: 1,
};
const TRAINER: TrainerDef = { id: 'trainer', name: 'Trainer', maxLevel: 10, priceMultiplier: 1 };

describe('tavern', () => {
  it('prices the room and the food and says why not', () => {
    const state = freshState();
    const v = tavernView(state, TAVERN);
    expect(v).toMatchObject({
      gold: 200,
      food: 7,
      roomPrice: 20,
      canRent: true,
      foodUnits: 3,
      foodCost: 15,
      canBuyFood: true,
      foodReason: null,
    });
    state.food = 10;
    expect(tavernView(state, TAVERN)).toMatchObject({
      canBuyFood: false,
      foodReason: 'The larder is full.',
    });
    state.food = 7;
    state.gold = 3;
    expect(tavernView(state, TAVERN)).toMatchObject({
      canRent: false,
      foodReason: 'Not enough gold.',
    });
  });

  it('rents a room without eating and buys food', () => {
    const state = freshState();
    state.party[0]!.hp -= 4;
    const r = rent(state, TAVERN);
    expect(r.ok).toBe(true);
    expect(r.message).toBe('A room for 20 gold.');
    expect(r.lines?.[0]).toBe('The party sleeps the night in a rented room.');
    expect(r.lines?.[1]).toBe('Alric heals 4 hit points.');
    expect(state.gold).toBe(180);
    expect(state.food).toBe(7);
    expect(buyFoodAction(state, TAVERN)).toEqual({
      ok: true,
      message: 'Bought 3 food for 15 gold.',
    });
    expect(state.food).toBe(10);
    expect(buyFoodAction(state, TAVERN)).toEqual({ ok: false, message: 'The larder is full.' });
    state.gold = 0;
    expect(rent(state, TAVERN)).toEqual({ ok: false, message: 'Not enough gold for a room.' });
  });
});

describe('temple', () => {
  it('lists each member with the price of their condition', () => {
    const state = freshState();
    expect(templeRows(state, TEMPLE)[0]).toMatchObject({
      name: 'Alric',
      condition: 'Good',
      price: 10,
      canHeal: false,
      reason: 'Nothing to heal.',
    });
    const knight = state.party[0]!;
    knight.hp -= 5;
    expect(templeRows(state, TEMPLE)[0]).toMatchObject({ price: 10, canHeal: true });
    afflict(knight.conditions, 'poisoned', 0);
    expect(templeRows(state, TEMPLE)[0]).toMatchObject({ condition: 'Poisoned', price: 100 });
    expect(heal(state, TEMPLE, 0)).toEqual({
      ok: true,
      message: 'Alric is healed for 100 gold (Poisoned cured).',
    });
    expect(state.gold).toBe(100);
    expect(heal(state, TEMPLE, 0)).toEqual({ ok: false, message: 'Nothing to heal.' });
    afflict(knight.conditions, 'dead', 0);
    expect(heal(state, TEMPLE, 0)).toEqual({ ok: false, message: 'Not enough gold.' });
  });
});

describe('guild', () => {
  it('sells membership, then books the member can learn', () => {
    const state = freshState();
    let v = guildView(state, GUILD, 3);
    expect(v).toMatchObject({ member: false, fee: 50, canJoin: true });
    expect(v.spells.map((s) => [s.id, s.price])).toEqual([
      ['torch-light', 50],
      ['protection-from-fire', 200],
      ['fire-bolt', 300],
    ]);
    expect(v.spells[0]).toMatchObject({ known: true, canBuy: false, reason: 'Already known.' });
    expect(v.spells[1]).toMatchObject({ canBuy: false, reason: 'Join the guild first.' });
    expect(buyBook(state, GUILD, 'fire-bolt', 3)).toEqual({
      ok: false,
      message: 'Join the guild first.',
    });
    expect(join(state, GUILD)).toEqual({
      ok: true,
      message: 'Joined the Guild of Fire for 50 gold.',
    });
    expect(join(state, GUILD)).toEqual({ ok: false, message: 'Already a member.' });
    v = guildView(state, GUILD, 3);
    expect(v.spells[1]).toMatchObject({ canBuy: false, reason: 'Not enough gold.' });
    state.gold = 1000;
    expect(guildView(state, GUILD, 3).spells[2]!.canBuy).toBe(true);
    expect(buyBook(state, GUILD, 'protection-from-fire', 3)).toEqual({
      ok: true,
      message: 'Sera learns Protection from Fire for 200 gold.',
    });
    expect(state.party[3]!.spells).toContain('protection-from-fire');
    expect(guildView(state, GUILD, 0).spells[1]).toMatchObject({ reason: 'Not for a Knight.' });
  });
});

describe('trainer', () => {
  it('raises a level when the experience is there', () => {
    const state = freshState();
    expect(trainerRows(state, TRAINER)[0]).toMatchObject({
      name: 'Alric',
      level: 1,
      needed: 1000,
      price: 50,
      hpGain: 5,
      spGain: 0,
      canTrain: false,
      reason: '1000 more experience.',
    });
    expect(trainMember(state, TRAINER, 0)).toEqual({ ok: false, message: '1000 more experience.' });
    state.party[0]!.xp = 1000;
    expect(trainerRows(state, TRAINER)[0]).toMatchObject({ canTrain: true, reason: null });
    expect(trainMember(state, TRAINER, 0)).toEqual({
      ok: true,
      message: 'Alric reaches level 2 for 50 gold: +5 HP, 5 skill points.',
    });
    expect(state.gold).toBe(150);
    expect(state.party[0]!.level).toBe(2);
    expect(trainerRows(state, { ...TRAINER, maxLevel: 2 })[0]!.reason).toBe(
      'Trains up to level 2.',
    );
    afflict(state.party[1]!.conditions, 'dead', 0);
    expect(trainerRows(state, TRAINER)[1]!.reason).toBe('Mira is dead.');
  });
});
