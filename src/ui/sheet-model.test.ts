import { describe, expect, it } from 'vitest';
import { afflict } from '../game/conditions';
import { freshState } from '../game/fixtures';
import {
  damageRange,
  raise,
  raiseMessage,
  sheetView,
  signed,
  skillGroups,
  skillRows,
  statRows,
} from './sheet-model';

describe('sheet view', () => {
  it('shows identity, points, derived numbers and the stats with bonuses', () => {
    const state = freshState();
    const knight = state.party[0]!;
    const v = sheetView(knight);
    expect(v.name).toBe('Alric');
    expect(v.className).toBe('Knight');
    expect(v.level).toBe(1);
    expect(v.xpNext).toBe(1000);
    expect(v.xpToNext).toBe(1000);
    expect(v.canTrain).toBe(false);
    expect(v.hp).toBe(v.maxHp);
    expect(v.hasSp).toBe(false);
    expect(v.condition).toBe('Good');
    expect(v.afflictions).toEqual([]);
    expect(v.damage).toMatch(/^3d3/);
    expect(v.recovery).toMatch(/ s$/);
    expect(v.stats).toHaveLength(7);
    const might = v.stats[0]!;
    expect(might.label).toBe('Might');
    expect(might.base).toBe(32);
    expect(might.current).toBe(32);
    expect(might.bonus).toBe(7);
  });

  it('shows the condition and the stats it lowers', () => {
    const state = freshState();
    const knight = state.party[0]!;
    afflict(knight.conditions, 'weak', 0);
    const rows = statRows(knight);
    expect(rows[0]!.current).toBe(24);
    expect(rows[0]!.base).toBe(32);
    const v = sheetView(knight);
    expect(v.condition).toBe('Weak');
    expect(v.afflictions).toEqual(['Weak']);
  });

  it('lists spell points and the bow for those who have them', () => {
    const state = freshState();
    const archer = state.party[1]!;
    const v = sheetView(archer);
    expect(v.hasSp).toBe(true);
    expect(v.rangedDamage).toBe('3d3');
    expect(v.rangedAttack).not.toBeNull();
    expect(sheetView(state.party[0]!).rangedDamage).toBeNull();
  });

  it('formats signed bonuses', () => {
    expect(signed(3)).toBe('+3');
    expect(signed(0)).toBe('0');
    expect(signed(-2)).toBe('-2');
  });
});

describe('skills on the sheet', () => {
  it('lists learnt skills grouped, with the cost of the next level', () => {
    const state = freshState();
    const knight = state.party[0]!;
    const rows = skillRows(knight);
    expect(rows.map((r) => r.id)).toEqual(['sword', 'axe', 'shield', 'leather']);
    expect(rows[0]!.cost).toBe(2);
    expect(rows[0]!.canRaise).toBe(false);
    const groups = skillGroups(rows);
    expect(groups.map((g) => g.label)).toEqual(['Weapons', 'Armour']);
    expect(groups[0]!.rows).toHaveLength(2);
  });

  it('raises a skill with skill points and reports the result', () => {
    const state = freshState();
    const knight = state.party[0]!;
    expect(raise(knight, 'sword')).toEqual({ ok: false, reason: 'points' });
    expect(raiseMessage(raise(knight, 'sword'), 'sword')).toBe(
      'Not enough skill points for Sword.',
    );
    knight.skillPoints = 5;
    expect(skillRows(knight)[0]!.canRaise).toBe(true);
    const r = raise(knight, 'sword');
    expect(r).toEqual({ ok: true, level: 2, pointsLeft: 3 });
    expect(knight.skillPoints).toBe(3);
    expect(raiseMessage(r, 'sword')).toBe('Sword is now level 2 (3 points left).');
    expect(raiseMessage(raise(knight, 'plate'), 'plate')).toBe('Plate is not learnt.');
  });
});

describe('damage as MM6 gave it', () => {
  it('runs from the least roll to the most, the bonus on both', () => {
    expect(damageRange({ count: 3, sides: 3, bonus: 7 })).toBe('10 - 16');
    expect(damageRange({ count: 1, sides: 6 })).toBe('1 - 6');
  });
});
