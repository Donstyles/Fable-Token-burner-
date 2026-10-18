import { describe, expect, it } from 'vitest';
import {
  addItem,
  canEquip,
  canPlace,
  createEquipment,
  createGrid,
  equipItem,
  equipmentArmor,
  equipmentRecoveryPenalty,
  equippedItems,
  findFreeSlot,
  GRID_HEIGHT,
  GRID_WIDTH,
  itemIndexAt,
  meleeWeapon,
  moveItem,
  placeItem,
  rangedWeapon,
  removeItem,
  RING_SLOTS,
  unequip,
} from './inventory';
import {
  ARMOR_RECOVERY,
  createItem,
  ITEM_IDS,
  ITEMS,
  UNARMED_RECOVERY,
  WEAPON_RECOVERY,
  weaponRecovery,
} from './items';
import type { SkillSet } from './skills';

describe('item table', () => {
  it('gives every item a footprint, a value and the data its kind needs', () => {
    for (const id of ITEM_IDS) {
      const def = ITEMS[id];
      expect(def.id).toBe(id);
      expect(def.w).toBeGreaterThan(0);
      expect(def.h).toBeGreaterThan(0);
      expect(def.value).toBeGreaterThan(0);
      if (def.kind === 'weapon') {
        expect(def.damage).toBeDefined();
        expect(def.skill).toBeDefined();
        expect(Object.keys(WEAPON_RECOVERY)).toContain(def.skill);
      }
      if (def.kind === 'armor' || def.kind === 'shield') {
        expect(def.armor).toBeGreaterThan(0);
        expect(def.skill).toBeDefined();
      }
      if (def.kind === 'potion' || def.kind === 'scroll') expect(def.use).toBeDefined();
    }
  });
});

describe('recovery by type (MM6-GAPS.md 8, GF-M)', () => {
  it('gives each weapon type and armour type MM6’s recovery', () => {
    expect(WEAPON_RECOVERY).toEqual({
      staff: 100,
      sword: 90,
      dagger: 60,
      axe: 100,
      spear: 80,
      bow: 100,
      mace: 80,
    });
    expect(ARMOR_RECOVERY).toEqual({ shield: 10, leather: 10, chain: 20, plate: 30 });
    expect(UNARMED_RECOVERY).toBe(100);
    expect(weaponRecovery(ITEMS['short-sword'])).toBe(90);
    expect(weaponRecovery(ITEMS['long-sword'])).toBe(90);
    expect(weaponRecovery(null)).toBe(100);
    const eq = createEquipment();
    equipItem(eq, createItem('chain-mail'), { chain: { level: 1, rank: 'normal' } });
    expect(equipmentRecoveryPenalty(eq, { chain: { level: 1, rank: 'normal' } })).toBe(20);
  });
});

describe('armour skills (MM6-GAPS.md 4, RPGC)', () => {
  it('add the body armour’s skill to armour class at every rank', () => {
    const eq = createEquipment();
    const chain: SkillSet = { chain: { level: 3, rank: 'normal' } };
    equipItem(eq, createItem('chain-mail'), chain);
    expect(equipmentArmor(eq, chain)).toBe(8 + 3);
    chain.chain!.rank = 'expert';
    expect(equipmentArmor(eq, chain)).toBe(8 + 3);
    chain.chain!.rank = 'master';
    expect(equipmentArmor(eq, chain)).toBe(8 + 3);
  });

  it('match screenshot-21: chain mail, a shield, Chain 1 and Shield 1 give 14', () => {
    // The chain mail's 8 and the shield's 4 are assumed (MM6-GAPS.md 4); Speed 13 adds 0.
    const eq = createEquipment();
    const s: SkillSet = {
      chain: { level: 1, rank: 'normal' },
      shield: { level: 1, rank: 'normal' },
    };
    equipItem(eq, createItem('chain-mail'), s);
    equipItem(eq, createItem('shield'), s);
    expect(equipmentArmor(eq, s)).toBe(14);
  });

  it('keep the recovery penalty at Normal, reduce it at Expert and remove it at Master', () => {
    const eq = createEquipment();
    const s: SkillSet = {
      chain: { level: 1, rank: 'normal' },
      shield: { level: 1, rank: 'normal' },
    };
    equipItem(eq, createItem('chain-mail'), s);
    equipItem(eq, createItem('shield'), s);
    expect(equipmentRecoveryPenalty(eq, s)).toBe(20 + 10);
    s.chain!.rank = 'expert';
    s.shield!.rank = 'expert';
    expect(equipmentRecoveryPenalty(eq, s)).toBe(10 + 5);
    s.chain!.rank = 'master';
    s.shield!.rank = 'master';
    expect(equipmentRecoveryPenalty(eq, s)).toBe(0);
  });
});

describe('inventory grid', () => {
  it('is 14 by 9 and refuses overlaps and the edge', () => {
    const grid = createGrid();
    expect(grid.width).toBe(GRID_WIDTH);
    expect(grid.height).toBe(GRID_HEIGHT);
    const sword = createItem('long-sword');
    expect(placeItem(grid, sword, 0, 0)).toBe(true);
    expect(canPlace(grid, createItem('dagger'), 0, 3)).toBe(false);
    expect(canPlace(grid, createItem('dagger'), 1, 0)).toBe(true);
    expect(canPlace(grid, createItem('bow'), 13, 0)).toBe(false);
    expect(canPlace(grid, createItem('bow'), 12, 6)).toBe(false);
    expect(canPlace(grid, createItem('bow'), 12, 5)).toBe(true);
    expect(itemIndexAt(grid, 0, 3)).toBe(0);
    expect(itemIndexAt(grid, 1, 3)).toBe(-1);
  });

  it('finds free slots row by row, moves and removes', () => {
    const grid = createGrid();
    expect(addItem(grid, createItem('chain-mail'))).toEqual({ x: 0, y: 0 });
    expect(addItem(grid, createItem('potion-healing'))).toEqual({ x: 2, y: 0 });
    expect(moveItem(grid, 1, 1, 0)).toBe(false);
    expect(moveItem(grid, 1, 5, 5)).toBe(true);
    expect(moveItem(grid, 0, 0, 1)).toBe(true);
    expect(removeItem(grid, 0)!.item.id).toBe('chain-mail');
    expect(grid.items).toHaveLength(1);
    expect(removeItem(grid, 7)).toBeUndefined();
  });

  it('reports a full grid', () => {
    const grid = createGrid();
    let placed = 0;
    while (addItem(grid, createItem('potion-healing'))) placed++;
    expect(placed).toBe(GRID_WIDTH * GRID_HEIGHT);
    expect(findFreeSlot(grid, createItem('dagger'))).toBeNull();
  });
});

describe('equipment', () => {
  const skills: SkillSet = {
    sword: { level: 1, rank: 'normal' },
    staff: { level: 1, rank: 'normal' },
    shield: { level: 2, rank: 'normal' },
    leather: { level: 3, rank: 'expert' },
    bow: { level: 1, rank: 'normal' },
  };

  it('needs the skill, refuses broken and unequippable items', () => {
    expect(canEquip(createItem('chain-mail'), skills)).toEqual({ ok: false, reason: 'skill' });
    expect(canEquip(createItem('potion-healing'), skills)).toEqual({
      ok: false,
      reason: 'not-equippable',
    });
    const broken = createItem('long-sword');
    broken.broken = true;
    expect(canEquip(broken, skills)).toEqual({ ok: false, reason: 'broken' });
    expect(canEquip(createItem('helmet'), {}).ok).toBe(true);
  });

  it('keeps shields and two-handed weapons apart, handing back the displaced item', () => {
    const eq = createEquipment();
    expect(equipItem(eq, createItem('long-sword'), skills)).toEqual({
      ok: true,
      slot: 'mainHand',
      displaced: [],
    });
    expect(equipItem(eq, createItem('shield'), skills).ok).toBe(true);
    const staff = equipItem(eq, createItem('staff'), skills);
    expect(staff.ok && staff.displaced.map((i) => i.id).sort()).toEqual(['long-sword', 'shield']);
    expect(eq.offHand).toBeUndefined();
    const shield = equipItem(eq, createItem('shield'), skills);
    expect(shield.ok && shield.displaced.map((i) => i.id)).toEqual(['staff']);
    expect(eq.mainHand).toBeUndefined();
    expect(meleeWeapon(eq).def).toBeNull();
    expect(meleeWeapon(eq).damage).toEqual({ count: 1, sides: 3 });
    expect(equipItem(eq, createItem('bow'), skills).ok).toBe(true);
    expect(rangedWeapon(eq)!.def!.id).toBe('bow');
    expect(unequip(eq, 'bow')!.id).toBe('bow');
    expect(rangedWeapon(eq)).toBeNull();
  });

  it('fills six ring slots, then swaps the last', () => {
    const eq = createEquipment();
    for (const slot of RING_SLOTS) {
      const r = equipItem(eq, createItem('copper-ring'), skills);
      expect(r.ok && r.slot).toBe(slot);
    }
    const seventh = equipItem(eq, createItem('copper-ring'), skills);
    expect(seventh.ok && seventh.slot).toBe('ring6');
    expect(seventh.ok && seventh.displaced).toHaveLength(1);
    expect(equippedItems(eq)).toHaveLength(6);
  });

  it('sums armour with skill bonuses and halves the penalty at Expert', () => {
    const eq = createEquipment();
    equipItem(eq, createItem('leather-armor'), skills);
    equipItem(eq, createItem('shield'), skills);
    equipItem(eq, createItem('helmet'), skills);
    // Leather 4 + expert 3, shield 4 + 2×1, helmet 2.
    expect(equipmentArmor(eq, skills)).toBe(4 + 3 + 4 + 2 + 2);
    // Expert leather's 10 halved, Normal shield's 10 whole.
    expect(equipmentRecoveryPenalty(eq, skills)).toBe(5 + ARMOR_RECOVERY.shield);
    const broken = createItem('helmet');
    broken.broken = true;
    eq.helmet = broken;
    expect(equipmentArmor(eq, skills)).toBe(4 + 3 + 4 + 2);
  });
});
