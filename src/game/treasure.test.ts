import { describe, expect, it } from 'vitest';
import { ITEMS, type ItemId } from './items';
import { MONSTERS } from './monsters';
import { mulberry32 } from './rng';
import { chestContents, goldPile, monsterDrop, randomItem, weightAt } from './treasure';

describe('treasure (DESIGN 17.12)', () => {
  it('weighs an item by how far the level is past its lowest, and never a key', () => {
    expect(weightAt('dagger', 1)).toBe(10);
    expect(weightAt('dagger', 2)).toBe(7);
    expect(weightAt('dagger', 3)).toBe(3);
    expect(weightAt('dagger', 4)).toBe(0);
    expect(weightAt('long-sword', 1)).toBe(0);
    expect(weightAt('long-sword', 2)).toBe(10);
    expect(weightAt('potion-healing', 1)).toBe(4);
    expect(weightAt('iron-key', 1)).toBe(0);
  });

  it('draws an item of the level, narrowed to a kind, unidentified arms past level 1', () => {
    const rng = mulberry32(7);
    const seen = new Set<ItemId>();
    for (let i = 0; i < 200; i++) {
      const item = randomItem(1, rng)!;
      expect(weightAt(item.id, 1)).toBeGreaterThan(0);
      expect(item.identified).toBe(true);
      seen.add(item.id);
    }
    expect(seen.size).toBeGreaterThan(5);
    for (let i = 0; i < 50; i++) {
      const weapon = randomItem(2, rng, 'weapon')!;
      expect(ITEMS[weapon.id].kind).toBe('weapon');
      expect(weapon.identified).toBe(false);
    }
    expect(randomItem(1, rng, 'amulet')).toBeNull();
  });

  it('piles gold by level', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const g = goldPile(1, rng);
      expect(g).toBeGreaterThanOrEqual(50);
      expect(g).toBeLessThanOrEqual(100);
      const big = goldPile(6, rng);
      expect(big).toBeGreaterThanOrEqual(2000);
      expect(big).toBeLessThanOrEqual(5000);
    }
  });

  it('fills a chest from its entries, fixed items first, the dearest placed first', () => {
    const rng = mulberry32(11);
    const chest = chestContents([2, 2], ['potion-healing'], rng);
    expect(chest.grid.width).toBe(8);
    expect(chest.grid.height).toBe(4);
    expect(chest.grid.items[0]!.item.id).toBe('potion-healing');
    // Two entries of 1 to 5 draws: at most 10 things in all, and never more than fit.
    expect(chest.grid.items.length).toBeLessThanOrEqual(11);
    const values = chest.grid.items.slice(1).map((p) => ITEMS[p.item.id].value);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
    expect(chest.gold).toBeGreaterThanOrEqual(0);
    const empty = chestContents([], [], rng);
    expect(empty.gold).toBe(0);
    expect(empty.grid.items).toEqual([]);
  });

  it('gives a body its gold and sometimes its item', () => {
    const rng = mulberry32(5);
    let items = 0;
    for (let i = 0; i < 300; i++) {
      const { gold, item } = monsterDrop(MONSTERS['skeleton-warrior']!, rng);
      expect(gold).toBeGreaterThanOrEqual(10);
      expect(gold).toBeLessThanOrEqual(40);
      if (item) items++;
    }
    // A fifth of them, give or take.
    expect(items).toBeGreaterThan(30);
    expect(items).toBeLessThan(100);
    for (let i = 0; i < 100; i++) {
      const { item } = monsterDrop(MONSTERS['bandit']!, rng);
      if (item) expect(ITEMS[item.id].kind).toBe('weapon');
    }
  });
});
