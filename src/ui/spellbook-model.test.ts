import { describe, expect, it } from 'vitest';
import { afflict } from '../game/conditions';
import { freshState } from '../game/fixtures';
import { cast, castMessage, schoolTabs, spellRows } from './spellbook-model';

describe('spellbook tabs and rows', () => {
  it('lists the learnt schools with their known spells', () => {
    const state = freshState();
    expect(schoolTabs(state.party[0]!)).toEqual([]);
    const tabs = schoolTabs(state.party[3]!);
    expect(tabs.map((t) => t.label)).toEqual(['Fire', 'Air']);
    expect(tabs[0]).toEqual({ school: 'fire', label: 'Fire', level: 1, rank: 'Normal', count: 1 });
  });

  it('shows level, cost, target and whether the spell can be cast', () => {
    const state = freshState();
    const sera = state.party[3]!;
    const rows = spellRows(sera, 'fire');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'torch-light',
      name: 'Torch Light',
      level: 1,
      cost: 1,
      target: 'world',
      targetLabel: 'the surroundings',
      needsTarget: false,
      canCast: true,
      reason: null,
    });
    sera.sp = 0;
    expect(spellRows(sera, 'fire')[0]).toMatchObject({
      canCast: false,
      reason: 'Not enough spell points.',
    });
    sera.sp = 10;
    afflict(sera.conditions, 'asleep', 0);
    expect(spellRows(sera, 'fire')[0]!.reason).toBe('Sera cannot act now.');
    const cleric = state.party[2]!;
    expect(spellRows(cleric, 'body')[0]).toMatchObject({ id: 'cure-weakness', needsTarget: true });
  });
});

describe('casting', () => {
  it('pays the points and returns the effects as an event', () => {
    const state = freshState();
    const sera = state.party[3]!;
    const before = sera.sp;
    const r = cast(state, 3, 'torch-light', 0, () => 0.5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(sera.sp).toBe(before - 1);
    expect(r.event).toMatchObject({
      caster: 3,
      spell: 'torch-light',
      target: 3,
      cost: 1,
      failed: false,
      source: 'spellbook',
    });
    expect(r.event.effects[0]).toMatchObject({ kind: 'light' });
    expect(castMessage(state, r.event)).toBe('Sera casts Torch Light.');
  });

  it('aims member spells at the chosen member', () => {
    const state = freshState();
    const r = cast(state, 2, 'cure-weakness', 0, () => 0.5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.target).toBe(0);
    expect(r.event.effects).toEqual([{ kind: 'cure', condition: 'weak', member: 0 }]);
    expect(castMessage(state, r.event)).toBe('Tobin casts Cure Weakness on Alric.');
  });

  it('refuses with a reason and reports a Cursed fizzle', () => {
    const state = freshState();
    const sera = state.party[3]!;
    sera.sp = 0;
    expect(cast(state, 3, 'torch-light', 3, () => 0.5)).toEqual({
      ok: false,
      message: 'Not enough spell points.',
    });
    expect(cast(state, 9, 'torch-light', 3, () => 0.5)).toEqual({
      ok: false,
      message: 'No such member.',
    });
    sera.sp = 5;
    afflict(sera.conditions, 'cursed', 0);
    const r = cast(state, 3, 'torch-light', 3, () => 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.failed).toBe(true);
    expect(r.event.effects).toEqual([]);
    expect(sera.sp).toBe(4);
    expect(castMessage(state, r.event)).toBe("Sera's Torch Light fizzles (1 spell points lost).");
  });
});
