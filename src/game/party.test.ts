import { describe, expect, it } from 'vitest';
import { attackBonus, recoverySec } from './character';
import { hitChance } from './combat';
import { afflict } from './conditions';
import { testCharacters } from './fixtures';
import { Party, PartyMember, TEST_PARTY } from './party';
import { newGame } from './state';
import { statBonus } from './stats';

function outfittedParty() {
  const r = newGame(testCharacters(), {
    seed: 1,
    level: { id: 'gullhaven', x: 0, y: 0, z: 0, yawDeg: 0 },
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
    expect(m.armorClass).toBe(10);
    // A long sword's 90 and leather's 10, less the Speed effect, at 60 units a second.
    expect(m.recoverySec).toBeCloseTo((90 + 10 - statBonus(21)) / 60);
    expect(m.def.meleeSkill).toBe(1);
    expect(m.def.armor).toBe(5);
    expect(m.isReady(0)).toBe(true);
    expect(m.canShoot).toBe(false);
  });

  it('shoots a bow with the bow’s Shoot bonus, dice and recovery (MM6-GAPS.md 8)', () => {
    const chars = outfittedParty();
    const mira = chars[1]!;
    const party = new Party(chars);
    const archer = party.members[1]!;
    expect(archer.canShoot).toBe(true);
    // Accuracy 30 plus Bow 1; the long bow's 3d3; a bow's 100 and leather's 10 less Speed 28.
    const shot = archer.attackNumbers(true);
    expect(shot.attackBonus).toBe(statBonus(30) + 1);
    expect(shot.attackBonus).toBe(attackBonus(mira, true));
    expect(shot.damage).toEqual({ count: 3, sides: 3 });
    expect(shot.recoverySec).toBeCloseTo((100 + 10 - statBonus(28)) / 60);
    expect(shot.recoverySec).toBeCloseTo(recoverySec(mira, true));
    // Her bare hands in melee: no weapon skill, 1d3 plus Might.
    const blow = archer.attackNumbers(false);
    expect(blow.attackBonus).toBe(statBonus(30));
    expect(blow.damage).toEqual({ count: 1, sides: 3, bonus: statBonus(23) });
    const dummy = { armorClass: 0, taken: 0, takeDamage: (n: number) => void (dummy.taken += n) };
    party.selected = 1;
    const a = party.attack(dummy, 0, () => 0);
    expect(a?.member).toBe(archer);
    expect(a?.ranged).toBe(true);
    expect(a?.result.chance).toBeCloseTo(hitChance(shot.attackBonus, 0));
    expect(dummy.taken).toBe(3);
    expect(archer.readyAt).toBeCloseTo(shot.recoverySec);
    party.selected = 1;
    const b = party.attack(dummy, 10, () => 0, false);
    expect(b?.ranged).toBe(false);
    expect(b?.result.chance).toBeCloseTo(hitChance(blow.attackBonus, 0));
    expect(archer.readyAt).toBeCloseTo(10 + blow.recoverySec);
    // The knight has no bow: asked to shoot, he strikes.
    party.selected = 0;
    expect(party.attack(dummy, 20, () => 0, true)?.ranged).toBe(false);
  });

  it('keeps hit points on the sheet and follows its conditions', () => {
    const chars = outfittedParty();
    const party = new Party(chars);
    // MM6: at 1 a member stands; at 0 it falls (docs/gaps/characters.md 12.1).
    party.takeDamage(0, party.members[0]!.maxHp - 1, 4);
    expect(chars[0]!.hp).toBe(1);
    expect(party.members[0]!.alive).toBe(true);
    party.takeDamage(0, 1, 5);
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

  it('costs a struck member its hit recovery and hands the selection on (GF-M, GF-P)', () => {
    const chars = outfittedParty();
    const party = new Party(chars);
    const knight = party.members[0]!;
    expect(knight.hitRecoverySec).toBeCloseTo((20 - statBonus(chars[0]!.stats.endurance)) / 60);
    party.takeDamage(0, 1, 0, 10);
    expect(knight.readyAt).toBeCloseTo(10 + knight.hitRecoverySec);
    expect(knight.isReady(10)).toBe(false);
    expect(party.selected).toBe(1);
    // A longer recovery already running is kept.
    party.members[1]!.readyAt = 20;
    party.takeDamage(1, 1, 0, 10);
    expect(party.members[1]!.readyAt).toBe(20);
    expect(party.selected).toBe(2);
    // Without the time, as the runtime calls it today, a blow costs no recovery.
    party.takeDamage(3, 1);
    expect(party.members[3]!.readyAt).toBe(0);
    const legacy = new PartyMember(TEST_PARTY[0]!);
    expect(legacy.hitRecoverySec).toBeCloseTo((20 - statBonus(15)) / 60);
  });

  it('fails half of a cursed member’s attacks and still spends the recovery', () => {
    const chars = outfittedParty();
    afflict(chars[0]!.conditions, 'cursed', 0);
    const party = new Party(chars);
    const dummy = { armorClass: 0, taken: 0, takeDamage: (n: number) => void (dummy.taken += n) };
    const failed = party.attack(dummy, 0, () => 0.1);
    expect(failed?.result).toEqual({ hit: false, damage: 0, chance: 0 });
    expect(party.members[0]!.readyAt).toBeCloseTo((90 + 10 - statBonus(21)) / 60);
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

describe('a target out of reach', () => {
  it('goes to the ready member who can shoot it, and the sword stays ready', () => {
    const party = new Party(outfittedParty());
    const shooter = party.members.findIndex((m) => m.canShoot);
    expect(shooter).toBeGreaterThan(0);
    const target = { armorClass: 0, takeDamage: () => {} };
    let rolls = 0;
    const a = party.attack(
      target,
      0,
      () => (rolls++ % 2 ? 0.99 : 0.01),
      true,
      (m) => m.canShoot,
    );
    expect(a?.member).toBe(party.members[shooter]);
    expect(a?.ranged).toBe(true);
    expect(party.members[0]!.isReady(0)).toBe(true);
  });

  it('is nobody’s when no ready member can reach it', () => {
    const party = new Party(outfittedParty());
    expect(party.readyIndex(0, () => false)).toBe(-1);
    expect(
      party.attack(
        { armorClass: 0, takeDamage: () => {} },
        0,
        () => 0.5,
        true,
        () => false,
      ),
    ).toBeNull();
  });
});

describe('danger (DESIGN 17.16)', () => {
  it('halves a weak member’s damage', () => {
    const chars = outfittedParty();
    const party = new Party(chars);
    const dummy = { armorClass: 0, taken: 0, takeDamage: (n: number) => void (dummy.taken += n) };
    party.selected = 0;
    const whole = party.attack(dummy, 0, () => 0)!;
    expect(whole.result.hit).toBe(true);
    afflict(chars[0]!.conditions, 'weak', 0);
    party.selected = 0;
    const weak = party.attack(dummy, 100, () => 0)!;
    expect(weak.result.damage).toBe(Math.max(1, Math.floor(whole.result.damage / 2)));
    expect(dummy.taken).toBe(whole.result.damage + weak.result.damage);
  });

  it('suffers a special attack: the save, the condition, and MM6’s two rules about sleep', () => {
    const chars = outfittedParty();
    const party = new Party(chars);
    // The roll under the chance lands; Alric's Luck 7 (−1) and Personality 9 (−1) give the
    // curse 30 / 28, so it always takes.
    expect(party.suffer(0, { kind: 'curse', multiplier: 2 }, 5, () => 0.99)).toEqual({
      condition: 'cursed',
      landed: true,
    });
    expect(chars[0]!.conditions.cursed).toEqual({ since: 5 });
    // Mira's Endurance 21 (+4) and Luck 7 (−1): afraid takes 30 in 33 times.
    expect(party.suffer(1, { kind: 'afraid', multiplier: 1 }, 5, () => 0.95)).toEqual({
      condition: 'afraid',
      landed: false,
    });
    expect(chars[1]!.conditions.afraid).toBeUndefined();
    // Poison at its level.
    expect(party.suffer(2, { kind: 'poison', multiplier: 5, level: 2 }, 7, () => 0)?.landed).toBe(
      true,
    );
    expect(chars[2]!.conditions.poisoned).toEqual({ since: 7, severity: 2 });
    // Three asleep: the last member able to act cannot be put to sleep.
    for (const i of [0, 1, 2]) party.suffer(i, { kind: 'asleep', multiplier: 1 }, 8, () => 0);
    expect(party.anyCanAct).toBe(true);
    expect(party.suffer(3, { kind: 'asleep', multiplier: 1 }, 8, () => 0)).toBeNull();
    expect(chars[3]!.conditions.asleep).toBeUndefined();
    // When the last one falls, the sleepers wake.
    party.takeDamage(3, 1000, 9);
    expect(chars[3]!.hp).toBeLessThanOrEqual(0);
    expect(chars.slice(0, 3).every((c) => c.conditions.asleep === undefined)).toBe(true);
    expect(party.anyCanAct).toBe(true);
    // Laid dead by a special, the member goes down with the body's hit points at most 0.
    expect(party.suffer(0, { kind: 'dead', multiplier: 1 }, 10, () => 0)?.landed).toBe(true);
    expect(chars[0]!.hp).toBeLessThanOrEqual(0);
    expect(party.members[0]!.alive).toBe(false);
    // Nobody left who can act: the party is beaten (characters.md 12.2).
    party.suffer(1, { kind: 'paralyze', multiplier: 1 }, 11, () => 0);
    party.suffer(2, { kind: 'paralyze', multiplier: 1 }, 11, () => 0);
    expect(party.alive).toBe(true);
    expect(party.anyCanAct).toBe(false);
  });
});
