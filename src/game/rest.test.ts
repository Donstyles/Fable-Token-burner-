import { describe, expect, it } from 'vitest';
import { maxHp, maxSp } from './character';
import { afflict } from './conditions';
import { testCharacters } from './fixtures';
import { FOOD_PER_REST, isHungry, passTime, rest, REST_MINUTES, waitUntilDawn } from './rest';
import { createClock, formatTime, MINUTES_PER_DAY } from './time';

describe('rest', () => {
  it('passes eight hours, eats one food and heals the fed party', () => {
    const party = testCharacters();
    const [knight, archer, cleric, sorcerer] = party;
    const clock = createClock();
    const supplies = { food: 2 };
    knight!.hp = 10;
    archer!.hp = 5;
    afflict(archer!.conditions, 'poisoned', 0);
    afflict(cleric!.conditions, 'asleep', 0, { minutes: 10 });
    sorcerer!.sp = 0;
    const r = rest(party, supplies, clock);
    expect(clock.minutes).toBe(540 + REST_MINUTES);
    expect(r).toMatchObject({ minutes: REST_MINUTES, foodUsed: FOOD_PER_REST, hungry: false });
    expect(supplies.food).toBe(1);
    expect(r.members[0]!.healed).toBe(maxHp(knight!) - 10);
    expect(knight!.hp).toBe(maxHp(knight!));
    // The poisoned archer worsens and does not heal.
    expect(r.members[1]).toMatchObject({ healed: 0, worsened: ['poisoned'] });
    expect(archer!.hp).toBe(5);
    expect(archer!.conditions.poisoned?.severity).toBe(2);
    expect(r.members[2]!.cleared).toEqual(['asleep']);
    expect(r.members[3]!.spRestored).toBe(maxSp(sorcerer!));
  });

  it('starves without food: time passes, nobody heals, everyone is weak', () => {
    const party = testCharacters();
    const knight = party[0]!;
    const clock = createClock();
    const supplies = { food: 0 };
    expect(isHungry(supplies)).toBe(true);
    knight.hp = 10;
    const r = rest(party, supplies, clock);
    expect(r.hungry).toBe(true);
    expect(r.foodUsed).toBe(0);
    expect(knight.hp).toBe(10);
    expect(r.members.every((m) => m.starved)).toBe(true);
    expect(party.every((c) => c.conditions.weak !== undefined)).toBe(true);
  });

  it('rents a room without food and leaves the dead alone', () => {
    const party = testCharacters();
    const [knight, archer] = party;
    const supplies = { food: 0 };
    knight!.hp = 1;
    archer!.hp = -40;
    afflict(archer!.conditions, 'dead', 0);
    const r = rest(party, supplies, createClock(), { room: true });
    expect(r.hungry).toBe(false);
    expect(knight!.hp).toBe(maxHp(knight!));
    expect(knight!.conditions.weak).toBeUndefined();
    expect(archer!.hp).toBe(-40);
    expect(r.members[1]).toMatchObject({ healed: 0, cleared: [], starved: false });
  });

  it('waits until dawn and lets timed conditions pass', () => {
    const party = testCharacters();
    const knight = party[0]!;
    const clock = createClock();
    afflict(knight.conditions, 'afraid', clock.minutes, { minutes: 60 });
    expect(waitUntilDawn(party, clock)).toBe(MINUTES_PER_DAY - 540 + 300);
    expect(formatTime(clock.minutes)).toBe('05:00');
    expect(knight.conditions.afraid).toBeUndefined();
    expect(passTime(party, clock, -5)).toBe(0);
    expect(passTime(party, clock, 90)).toBe(90);
    expect(formatTime(clock.minutes)).toBe('06:30');
  });
});
