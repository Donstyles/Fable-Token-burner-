import { describe, expect, it } from 'vitest';
import { afflict } from './conditions';
import { testCharacters } from './fixtures';
import { Party, PartyMember } from './party';
import { newGame } from './state';

function outfittedParty() {
  const r = newGame(testCharacters(), {
    seed: 1,
    level: { id: 'showcase', x: 0, y: 0, z: 0, yawDeg: 0 },
  });
  if (!r.ok) throw new Error('fixture');
  return r.state.party;
}

describe('character-backed members', () => {
  it('derives the combat numbers from the sheet and its equipment', () => {
    const [knight] = outfittedParty();
    const m = new PartyMember(knight!);
    expect(m.character).toBe(knight);
    expect(m.def.name).toBe('Alric');
    expect(m.def.maxHp).toBe(70);
    expect(m.hp).toBe(70);
    expect(m.attackBonus).toBe(6);
    expect(m.damage).toEqual({ count: 3, sides: 3, bonus: 7 });
    expect(m.armorClass).toBe(9);
    expect(m.recoverySec).toBeCloseTo(1.05);
    expect(m.def.meleeSkill).toBe(1);
    expect(m.def.armor).toBe(4);
    expect(m.isReady(0)).toBe(true);
  });

  it('keeps hit points on the sheet and follows its conditions', () => {
    const chars = outfittedParty();
    const party = new Party(chars);
    party.takeDamage(0, 70, 5);
    expect(chars[0]!.hp).toBe(0);
    expect(chars[0]!.conditions.unconscious?.since).toBe(5);
    expect(party.members[0]!.alive).toBe(false);
    expect(party.selected).toBe(1);
    party.takeDamage(0, 40, 6);
    expect(chars[0]!.conditions.dead).toBeDefined();
    party.members[1]!.hp = 3;
    expect(chars[1]!.hp).toBe(3);
    afflict(chars[1]!.conditions, 'asleep', 0, { minutes: 60 });
    expect(party.members[1]!.isReady(0)).toBe(false);
    expect(party.readyIndex(0)).toBe(2);
  });

  it('fails half of a cursed member’s attacks and still spends the recovery', () => {
    const chars = outfittedParty();
    afflict(chars[0]!.conditions, 'cursed', 0);
    const party = new Party(chars);
    const dummy = { armorClass: 0, taken: 0, takeDamage: (n: number) => void (dummy.taken += n) };
    const failed = party.attack(dummy, 0, () => 0.1);
    expect(failed?.result).toEqual({ hit: false, damage: 0, chance: 0 });
    expect(party.members[0]!.readyAt).toBeCloseTo(1.05);
    expect(dummy.taken).toBe(0);
    party.members[0]!.readyAt = 0;
    party.selected = 0;
    // No curse failure (0.9 ≥ 0.5), then a hit (0.1 under the 27/42 chance), then damage rolls.
    const rolls = [0.9, 0.1];
    const landed = party.attack(dummy, 0, () => rolls.shift() ?? 0.5);
    expect(landed?.member.def.name).toBe('Alric');
    expect(landed?.result.hit).toBe(true);
    expect(dummy.taken).toBeGreaterThan(0);
  });
});
