/**
 * Treasure (DESIGN.md 17.12; items.md 4): what a chest holds and what a body carries, made
 * at a treasure level from 1 to 6. The rules are MM7's as OpenEnroth reads them, with our
 * own weights where MM6's are not public: an item whose lowest level is L weighs 10 at L, 7
 * at L + 1 and 3 at L + 2; potions and scrolls weigh less than arms and armour.
 */
import { ITEM_IDS, ITEMS, type ItemId, type ItemInstance, type ItemKind } from './items';
import { addItem, createGrid, type InventoryGrid } from './inventory';
import type { MonsterDef } from './monsters';
import type { Rng } from './rng';

/** Gold in a pile by treasure level (items.md 4.5, MM7's rule). */
const GOLD: [number, number][] = [
  [50, 100],
  [100, 200],
  [200, 500],
  [500, 1000],
  [1000, 2000],
  [2000, 5000],
];

const CONSUMABLE: ItemKind[] = ['potion', 'scroll'];

function between(lo: number, hi: number, rng: Rng): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** How much an item kind counts in a draw at a treasure level; 0 when it cannot come. */
export function weightAt(id: ItemId, level: number): number {
  const def = ITEMS[id];
  if (def.level === undefined) return 0;
  const step = level - def.level;
  const base = step === 0 ? 10 : step === 1 ? 7 : step === 2 ? 3 : 0;
  // Items of the deepest levels keep their full weight further down.
  const deep = def.level >= 5 && level > def.level ? 10 : base;
  return CONSUMABLE.includes(def.kind) ? deep * 0.4 : deep;
}

/**
 * One random item of a treasure level, narrowed to a kind when asked; null when no item of
 * that kind comes at the level. Arms and armour of level 2 and up start unidentified.
 */
export function randomItem(level: number, rng: Rng, kind?: ItemKind): ItemInstance | null {
  const lvl = Math.max(1, Math.min(6, Math.round(level)));
  const choices = ITEM_IDS.filter((id) => !kind || ITEMS[id].kind === kind).map((id) => ({
    id,
    weight: weightAt(id, lvl),
  }));
  const total = choices.reduce((sum, c) => sum + c.weight, 0);
  if (total <= 0) return null;
  let pick = rng() * total;
  for (const c of choices) {
    pick -= c.weight;
    if (pick < 0) {
      const def = ITEMS[c.id];
      const plain = CONSUMABLE.includes(def.kind) || def.kind === 'misc' || lvl < 2;
      return { id: c.id, identified: plain, broken: false };
    }
  }
  return null;
}

/** A pile of gold of a treasure level. */
export function goldPile(level: number, rng: Rng): number {
  const [lo, hi] = GOLD[Math.max(1, Math.min(6, Math.round(level))) - 1]!;
  return between(lo, hi, rng);
}

/**
 * A chest's contents on first opening (items.md 4.7, MM7's rule): each random entry becomes
 * 1 to 5 draws, each a fifth nothing, two fifths a pile of gold of the level and two fifths
 * an item of the level; fixed items go in first. Items that find no cell are left out.
 */
export function chestContents(
  levels: number[],
  fixed: ItemId[],
  rng: Rng,
  size: [number, number] = [8, 4],
): { gold: number; grid: InventoryGrid } {
  const grid = createGrid(size[0], size[1]);
  let gold = 0;
  const rolled: ItemInstance[] = [];
  for (const level of levels) {
    const draws = between(1, 5, rng);
    for (let i = 0; i < draws; i++) {
      const roll = rng();
      if (roll < 0.2) continue;
      if (roll < 0.6) gold += goldPile(level, rng);
      else {
        const item = randomItem(level, rng);
        if (item) rolled.push(item);
      }
    }
  }
  // The most valuable first, as GrayFace's patch places them, so a big piece is not crowded
  // out by trinkets.
  const items = [
    ...fixed.map((id): ItemInstance => ({ id, identified: true, broken: false })),
    ...rolled.sort((a, b) => ITEMS[b.id].value - ITEMS[a.id].value),
  ];
  for (const item of items) addItem(grid, item);
  return { gold, grid };
}

/** What a searched body gives (items.md 4.9): its gold and, by its chance, one item. */
export function monsterDrop(
  def: MonsterDef,
  rng: Rng,
): { gold: number; item: ItemInstance | null } {
  const [lo, hi] = def.gold ?? [0, 0];
  const gold = lo + Math.floor(rng() * (hi - lo + 1));
  const drop = def.drop;
  const item = drop && rng() < drop.chance ? randomItem(drop.level, rng, drop.kind) : null;
  return { gold, item };
}
