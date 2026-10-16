import { describe, expect, it } from 'vitest';
import { afflict } from './conditions';
import { freshState, TEST_LEVEL as LEVEL, testCharacters } from './fixtures';
import { addItem } from './inventory';
import { createItem } from './items';
import {
  addGold,
  grantReward,
  livingMembers,
  newGame,
  spendGold,
  starterKit,
  STARTING_FOOD,
  STARTING_GOLD,
  travelTo,
} from './state';

describe('newGame', () => {
  it('needs four distinctly named characters', () => {
    const chars = testCharacters();
    expect(newGame(chars.slice(0, 3), { seed: 1, level: LEVEL })).toEqual({
      ok: false,
      reason: 'party-size',
    });
    chars[1]!.name = chars[0]!.name;
    expect(newGame(chars, { seed: 1, level: LEVEL })).toEqual({
      ok: false,
      reason: 'duplicate-name',
    });
  });

  it('starts with the MM6 purse, the clock at nine and each class outfitted', () => {
    const state = freshState();
    expect(state.gold).toBe(STARTING_GOLD);
    expect(state.food).toBe(STARTING_FOOD);
    expect(state.clock.minutes).toBe(540);
    expect(state.level).toEqual(LEVEL);
    expect(state.level).not.toBe(LEVEL);
    expect(state.selected).toBe(0);
    expect(state.memberships).toEqual([]);
    const [knight, archer, cleric, sorcerer] = state.party;
    expect(knight!.equipment.mainHand?.id).toBe('long-sword');
    expect(knight!.equipment.armor?.id).toBe('leather-armor');
    expect(knight!.grid.items.map((p) => p.item.id)).toEqual(['potion-healing']);
    expect(archer!.equipment.bow?.id).toBe('bow');
    expect(archer!.equipment.mainHand).toBeUndefined();
    expect(cleric!.equipment.mainHand?.id).toBe('mace');
    expect(cleric!.equipment.armor).toBeUndefined();
    expect(sorcerer!.equipment.mainHand?.id).toBe('dagger');
    expect(starterKit('paladin')).toEqual(['mace', 'potion-healing']);
    expect(starterKit('druid')).toEqual(['staff', 'potion-healing']);
  });
});

describe('purse and rewards', () => {
  it('spends only what it has', () => {
    const state = freshState();
    expect(spendGold(state, 50)).toBe(true);
    expect(state.gold).toBe(150);
    expect(spendGold(state, 151)).toBe(false);
    expect(spendGold(state, -1)).toBe(false);
    expect(state.gold).toBe(150);
    addGold(state, 10.7);
    expect(state.gold).toBe(160);
  });

  it('grants gold, shared experience and items', () => {
    const state = freshState();
    afflict(state.party[3]!.conditions, 'dead', 0);
    expect(livingMembers(state)).toHaveLength(3);
    state.selected = 1;
    const outcome = grantReward(state, { gold: 100, xp: 300, items: ['copper-ring'] });
    expect(outcome).toEqual({ gold: 100, xp: [100, 100, 100, 0], dropped: [] });
    expect(state.gold).toBe(300);
    expect(state.party[1]!.grid.items.some((p) => p.item.id === 'copper-ring')).toBe(true);
    expect(state.party[0]!.xp).toBe(100);
    travelTo(state, { ...LEVEL, id: 'town' });
    expect(state.level.id).toBe('town');
  });

  it('reports items nobody has room for', () => {
    const state = freshState();
    for (const c of state.party) while (addItem(c.grid, createItem('potion-healing'))) continue;
    const outcome = grantReward(state, { items: ['dagger'] });
    expect(outcome.dropped).toEqual(['dagger']);
  });
});
