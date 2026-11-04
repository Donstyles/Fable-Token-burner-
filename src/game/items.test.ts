import { describe, expect, it } from 'vitest';
import { ARMOUR, CATALOGUE, JEWELLERY, WEAPONS } from './catalogue';
import { ITEM_IDS, ITEMS, itemDef, weaponRecovery } from './items';

describe('the catalogue (DESIGN 17.18, items.md 2)', () => {
  it('holds MM6’s 63 weapons, 54 pieces of armour and 15 rings and amulets, each once', () => {
    expect(WEAPONS).toHaveLength(63);
    expect(ARMOUR).toHaveLength(54);
    expect(JEWELLERY).toHaveLength(15);
    const ids = CATALOGUE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Every id in the list has a record, and every record is in the list.
    for (const id of ITEM_IDS) expect(ITEMS[id]?.id).toBe(id);
    expect(Object.keys(ITEMS).sort()).toEqual([...ITEM_IDS].sort());
    // Every picture names an item that exists, so the family's photograph is found.
    for (const id of ITEM_IDS) expect(ITEMS[ITEMS[id].picture]).toBeDefined();
  });

  it('carries MM6’s numbers: dice, armour class, value, difficulty and level', () => {
    expect(itemDef('long-sword')).toMatchObject({
      name: 'Longsword',
      value: 50,
      difficulty: 1,
      level: 1,
    });
    expect(itemDef('lionheart-sword')).toMatchObject({
      damage: { count: 3, sides: 3, bonus: 12 },
      value: 650,
      difficulty: 9,
      level: 5,
    });
    expect(itemDef('two-handed-sword')).toMatchObject({
      twoHanded: true,
      damage: { count: 4, sides: 5 },
      value: 400,
    });
    expect(itemDef('axe')).toMatchObject({
      name: 'Hand Axe',
      damage: { count: 4, sides: 2 },
      value: 30,
    });
    expect(itemDef('spear')).toMatchObject({ extraDieTwoHanded: true, value: 15 });
    expect(itemDef('spear').twoHanded).toBeUndefined();
    expect(itemDef('bow')).toMatchObject({
      name: 'Longbow',
      ranged: true,
      damage: { count: 5, sides: 2 },
    });
    expect(itemDef('club')).toMatchObject({ difficulty: 0, value: 1 });
    expect(itemDef('club').skill).toBeUndefined();
    expect(itemDef('golden-plate-armor')).toMatchObject({
      armor: 54,
      value: 2700,
      difficulty: 12,
      skill: 'plate',
    });
    expect(itemDef('shield')).toMatchObject({ name: 'Wooden Shield', armor: 4, value: 100 });
    expect(itemDef('cloth-hat')).toMatchObject({ kind: 'helmet', armor: 0, value: 20 });
    expect(itemDef('scarab-ring')).toMatchObject({
      kind: 'ring',
      value: 2000,
      difficulty: 20,
      level: 5,
    });
    expect(itemDef('gothic-amulet')).toMatchObject({ kind: 'amulet', value: 750 });
    expect(itemDef('potion-healing')).toMatchObject({ name: 'Cure Wounds', value: 10 });
  });

  it('shares a family’s picture, footprint, skill and recovery across its tiers', () => {
    for (const tier of ['dagger', 'blood-dagger', 'jeweled-dagger'] as const) {
      expect(itemDef(tier)).toMatchObject({
        picture: 'dagger',
        w: 1,
        h: 2,
        skill: 'dagger',
        generic: 'Dagger',
      });
      expect(weaponRecovery(itemDef(tier))).toBe(60);
    }
    expect(itemDef('majestic-chain-mail')).toMatchObject({
      picture: 'chain-mail',
      skill: 'chain',
      w: 2,
      h: 4,
    });
    expect(itemDef('olympian-shield').picture).toBe('kite-shield');
    expect(itemDef('scarab-ring').picture).toBe('copper-ring');
  });
});
