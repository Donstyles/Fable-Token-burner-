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
    expect(weightAt('long-sword', 1)).toBe(10);
    expect(weightAt('warrior-sword', 1)).toBe(0);
    expect(weightAt('warrior-sword', 2)).toBe(10);
    expect(weightAt('potion-healing', 1)).toBe(4);
    expect(weightAt('iron-key', 1)).toBe(0);
  });

  it('draws an item of the level, narrowed to a kind, unidentified unless its difficulty is 0', () => {
    const rng = mulberry32(7);
    const seen = new Set<ItemId>();
    for (let i = 0; i < 200; i++) {
      const item = randomItem(1, rng)!;
      expect(weightAt(item.id, 1)).toBeGreaterThan(0);
      expect(item.identified).toBe(ITEMS[item.id].difficulty === 0);
      // Level 1 gives no enchantment (items.md 4.3).
      expect(item.bonus).toBeUndefined();
      seen.add(item.id);
    }
    expect(seen.size).toBeGreaterThan(5);
    for (let i = 0; i < 50; i++) {
      const weapon = randomItem(2, rng, 'weapon')!;
      expect(ITEMS[weapon.id].kind).toBe('weapon');
      expect(weapon.identified).toBe(ITEMS[weapon.id].difficulty === 0);
      expect(weapon.bonus).toBeUndefined();
    }
    // Rings come at level 1; amulets of level 1 exist too now (items.md 2.3, our bands).
    expect(randomItem(1, rng, 'amulet')).not.toBeNull();
    // Armour and jewellery of level 3: two in five carry a standard bonus of strength 3 to 8.
    let enchanted = 0;
    for (let i = 0; i < 300; i++) {
      const ring = randomItem(3, rng, 'ring')!;
      if (ring.bonus) {
        enchanted++;
        expect(ring.bonus.power).toBeGreaterThanOrEqual(3);
        expect(ring.bonus.power).toBeLessThanOrEqual(8);
      }
    }
    expect(enchanted).toBeGreaterThan(80);
    expect(enchanted).toBeLessThan(160);
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

  it('gives a body its gold dice and sometimes its item', () => {
    const rng = mulberry32(5);
    let items = 0;
    for (let i = 0; i < 300; i++) {
      // A brigand: 5d6 gold and a weapon on one in five.
      const { gold, item } = monsterDrop(MONSTERS['brigand']!, rng);
      expect(gold).toBeGreaterThanOrEqual(5);
      expect(gold).toBeLessThanOrEqual(30);
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

describe('what the campaign hangs on a body', () => {
  it('is always found: the Warden carries the Seal of the Halls, a brigand carries nothing', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 5; i++) {
      expect(monsterDrop(MONSTERS['skeleton-warden']!, rng).carried?.id).toBe('seal-of-the-halls');
    }
    expect(monsterDrop(MONSTERS['brigand']!, rng).carried).toBeNull();
    expect(monsterDrop(MONSTERS['the-abbot']!, rng).carried?.id).toBe('abbots-confession');
  });
});
