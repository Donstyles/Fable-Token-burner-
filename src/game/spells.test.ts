import { describe, expect, it } from 'vitest';
import { afflict } from './conditions';
import { testCharacters } from './fixtures';
import { MAGIC_SKILLS } from './skills';
import { canCast, canLearnSpell, castSpell, knownSpellsOfSchool, learnSpell } from './spellbook';
import {
  applySpell,
  firstSpellOf,
  rankForSpellLevel,
  SPELL_IDS,
  SPELLS,
  spellCost,
  spellDef,
  spellsOfSchool,
} from './spells';

const ctx = (skill: number, rank: 'normal' | 'expert' | 'master', partySize = 4) => ({
  skill,
  rank,
  member: 1,
  partySize,
});

describe('spell table', () => {
  it('has a first spell for every school and levels within 1 to 11', () => {
    for (const id of SPELL_IDS) {
      const s = SPELLS[id];
      expect(s.id).toBe(id);
      expect(s.level).toBeGreaterThanOrEqual(1);
      expect(s.level).toBeLessThanOrEqual(11);
      expect(spellCost(s, 'normal')).toBeGreaterThan(0);
    }
    for (const school of MAGIC_SKILLS) {
      expect(firstSpellOf(school)?.level).toBe(1);
      const levels = spellsOfSchool(school).map((s) => s.level);
      expect(levels).toEqual([...levels].sort((a, b) => a - b));
    }
    expect(rankForSpellLevel(4)).toBe('normal');
    expect(rankForSpellLevel(5)).toBe('expert');
    expect(rankForSpellLevel(9)).toBe('master');
  });

  it('scales effects with skill and rank', () => {
    expect(applySpell(spellDef('heal'), ctx(3, 'expert'))).toEqual([
      { kind: 'heal', amount: 11, member: 1 },
    ]);
    expect(applySpell(spellDef('cure-wounds'), ctx(2, 'master'))).toEqual([
      { kind: 'heal', amount: 22, member: 1 },
    ]);
    expect(applySpell(spellDef('fire-bolt'), ctx(4, 'normal'))).toEqual([
      { kind: 'projectile', damage: { count: 4, sides: 3, bonus: 4 }, count: 1, element: 'fire' },
    ]);
    const sparks = applySpell(spellDef('sparks'), ctx(1, 'master'))[0]!;
    expect(sparks.kind === 'projectile' && sparks.count).toBe(7);
    expect(applySpell(spellDef('torch-light'), ctx(2, 'expert'))).toEqual([
      { kind: 'light', power: 2, minutes: 120 },
    ]);
    expect(applySpell(spellDef('bless'), ctx(1, 'expert'))).toHaveLength(1);
    expect(applySpell(spellDef('bless'), ctx(1, 'master'))).toHaveLength(4);
    expect(applySpell(spellDef('bless'), ctx(1, 'master'))[0]).toEqual({
      kind: 'buff',
      stat: 'attack',
      amount: 6,
      minutes: 65,
      member: 0,
    });
    expect(applySpell(spellDef('awaken'), ctx(1, 'normal'))).toEqual([
      { kind: 'cure', condition: 'asleep', member: 1 },
    ]);
    expect(applySpell(spellDef('awaken'), ctx(1, 'expert'))).toHaveLength(4);
    expect(applySpell(spellDef('raise-dead'), ctx(1, 'normal'))).toEqual([
      { kind: 'cure', condition: 'dead', member: 1 },
      { kind: 'afflict', condition: 'weak', member: 1 },
    ]);
    expect(applySpell(spellDef('stun'), ctx(1, 'normal'))).toEqual([
      { kind: 'stun', seconds: 1, knockbackMetres: 1 },
    ]);
    expect(applySpell(spellDef('jump'), ctx(1, 'normal'))[0]?.kind).toBe('jump');
    expect(applySpell(spellDef('water-walk'), ctx(3, 'normal'))).toEqual([
      { kind: 'party-buff', buff: 'water-walk', power: 1, minutes: 30 },
    ]);
    expect(applySpell(spellDef('protection-from-fire'), ctx(2, 'expert'))).toHaveLength(4);
  });
});

describe('spellbook', () => {
  it('learns within class, skill and rank', () => {
    const [, , , sera] = testCharacters();
    const c = sera!;
    expect(canLearnSpell(c, 'torch-light')).toEqual({ ok: false, reason: 'known' });
    expect(learnSpell(c, 'fire-bolt')).toEqual({ ok: true });
    expect(c.spells).toContain('fire-bolt');
    expect(canLearnSpell(c, 'heal')).toEqual({ ok: false, reason: 'class' });
    expect(canLearnSpell(c, 'water-walk')).toEqual({ ok: false, reason: 'skill' });
    c.skills.water = { level: 4, rank: 'normal' };
    expect(canLearnSpell(c, 'water-walk')).toEqual({ ok: false, reason: 'rank' });
    c.skills.water.rank = 'expert';
    expect(learnSpell(c, 'water-walk')).toEqual({ ok: true });
    expect(knownSpellsOfSchool(c, 'fire').map((s) => s.id)).toEqual(['torch-light', 'fire-bolt']);
  });

  it('casts for spell points, fails when cursed and refuses when unable', () => {
    const [, , , sera] = testCharacters();
    const c = sera!;
    const sp = c.sp;
    expect(canCast(c, 'fire-bolt')).toEqual({ ok: false, reason: 'unknown' });
    const r = castSpell(c, 'torch-light', { member: 3, partySize: 4 }, () => 0.9);
    expect(r).toEqual({
      ok: true,
      cost: 1,
      failed: false,
      effects: [{ kind: 'light', power: 1, minutes: 60 }],
    });
    expect(c.sp).toBe(sp - 1);
    afflict(c.conditions, 'cursed', 0);
    const failed = castSpell(c, 'torch-light', { member: 3, partySize: 4 }, () => 0.1);
    expect(failed.ok && failed.failed).toBe(true);
    expect(c.sp).toBe(sp - 2);
    c.sp = 0;
    expect(canCast(c, 'torch-light')).toEqual({ ok: false, reason: 'sp' });
    c.sp = 10;
    afflict(c.conditions, 'asleep', 0, { minutes: 10 });
    expect(canCast(c, 'torch-light')).toEqual({ ok: false, reason: 'condition' });
    delete c.conditions.asleep;
    delete c.skills.fire;
    expect(canCast(c, 'torch-light')).toEqual({ ok: false, reason: 'skill' });
  });
});
