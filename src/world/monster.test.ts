import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, it } from 'vitest';
import { MONSTERS } from '../game/monsters';
import { mulberry32 } from '../game/rng';
import type { Character } from './character';
import { Monster, type PartyTarget } from './monster';

/** The bandit's clip lengths in seconds at their authored rate (assets/characters/bandit/bandit.glb). */
const CLIP_SECONDS: Record<string, number> = {
  idle: 4,
  walk: 4.133,
  run: 0.7,
  attack_1: 3.167,
  attack_2: 3,
  hit: 1.633,
  death: 3.5,
};

/**
 * A stand-in for a loaded bandit: its node, the clips it was told to play, and a clip clock of
 * its own that `tick` advances, as src/render/animation-step.ts advances the real clips on the
 * real frame time rather than on the world's step.
 */
function bandit(): { character: Character; played: string[]; tick(seconds: number): void } {
  const played: string[] = [];
  let clip = 'idle';
  let elapsed = 0;
  let speed = 1;
  let loop = true;
  const character = {
    node: { name: 'bandit-1', position: new Vector3(0, 0, 0) },
    yaw: 0,
    play(name: string, opts: { loop?: boolean; speed?: number } = {}) {
      played.push(name);
      clip = name;
      elapsed = 0;
      speed = opts.speed ?? 1;
      loop = opts.loop ?? name !== 'death';
    },
    get clipDuration() {
      return CLIP_SECONDS[clip] ?? 0;
    },
    get finished() {
      return !loop && elapsed >= (CLIP_SECONDS[clip] ?? 0);
    },
  } as unknown as Character;
  return { character, played, tick: (seconds) => (elapsed += seconds * speed) };
}

/** The party a metre ahead of the monster, so it stands in reach and swings. */
const party: PartyTarget = {
  position: new Vector3(0, 0, 1),
  pickTarget: () => ({ name: 'Zoltan', armorClass: 4, hit: () => undefined }),
};

/** Enough hit points to take a blow every 0.8 s for twenty seconds and still stand. */
const def = { ...MONSTERS['bandit']!, hp: 1000 };

/**
 * Twenty seconds of game time in updates of `step` seconds; the clips' clock advances `frame`
 * seconds an update (the real frame time; the same as the step unless said). With
 * `struckEvery` the party lands a blow every so many seconds of game time. Returns the blows
 * the monster struck, hits and misses.
 */
function fight(opts: { step: number; frame?: number; struckEvery?: number }): number {
  const { character, tick } = bandit();
  const monster = new Monster(def, character, null, mulberry32(7));
  let blows = 0;
  let now = 0;
  let struckAt = opts.struckEvery ?? Infinity;
  for (let i = 0; i < Math.round(20 / opts.step); i++) {
    tick(opts.frame ?? opts.step);
    now += opts.step;
    monster.update(opts.step, party, now);
    if (now >= struckAt) {
      monster.takeDamage(1);
      struckAt += opts.struckEvery!;
    }
    blows += monster.takeEvents().filter((e) => e.kind === 'hit' || e.kind === 'miss').length;
  }
  return blows;
}

describe('a monster in reach', () => {
  it('lands as many blows stepped at 1/15 s as at 1/60 s', () => {
    const fast = fight({ step: 1 / 60 });
    // A swing and the pause after it take about four seconds.
    expect(fast).toBeGreaterThanOrEqual(4);
    expect(Math.abs(fight({ step: 1 / 15 }) - fast)).toBeLessThanOrEqual(1);
  });

  it('lands its blows on game time when the clips run ahead of it', () => {
    // At 5 fps the harness caps the world's step at 50 ms while the clips run on the real 200 ms
    // a frame (src/dev/index.ts): each swing's clip ends long before its blow is due.
    const fast = fight({ step: 1 / 60 });
    expect(Math.abs(fight({ step: 0.05, frame: 0.2 }) - fast)).toBeLessThanOrEqual(1);
  });

  it('keeps its own rate while the party strikes it every 0.8 s', () => {
    for (const step of [1 / 60, 1 / 15]) {
      const free = fight({ step });
      expect(fight({ step, struckEvery: 0.8 })).toBeGreaterThanOrEqual(Math.ceil(free * 0.7));
    }
  });

  it('flinches when struck between swings, never in the middle of one', () => {
    const { character, played } = bandit();
    const monster = new Monster(def, character, null, mulberry32(7));
    let now = 0;
    const step = (seconds: number): void => {
      for (let t = 0; t < seconds - 1e-9; t += 1 / 60) {
        now += 1 / 60;
        monster.update(1 / 60, party, now);
      }
    };
    // In reach after two updates, the first swing 0.3 s later; struck 0.2 s into it.
    step(0.5);
    expect(played.at(-1)).toBe('attack_1');
    monster.takeDamage(1);
    expect(monster.state).toBe('attack');
    expect(played.at(-1)).toBe('attack_1');
    // The blow still lands, 40 % into the swing.
    step(0.8);
    expect(monster.takeEvents().filter((e) => e.kind !== 'death')).toHaveLength(1);
    // After the swing, in the pause, a blow makes it flinch.
    step(1.5);
    expect(played.at(-1)).toBe('idle');
    monster.takeDamage(1);
    expect(monster.state).toBe('hit');
    expect(played.at(-1)).toBe('hit');
  });
});

/** A clip clock for the goblin's body, which the shaman and the king share. */
const GOBLIN_CLIPS: Record<string, number> = { ...CLIP_SECONDS, cast: 2.5 };

function body(name: string, clips: Record<string, number> = GOBLIN_CLIPS) {
  const played: string[] = [];
  let clip = 'idle';
  const character = {
    node: { name, position: new Vector3(0, 0, 0) },
    yaw: 0,
    play(n: string) {
      played.push(n);
      clip = n;
    },
    get clipDuration() {
      return clips[clip] ?? 0;
    },
    get finished() {
      return false;
    },
  } as unknown as Character;
  return { character, played };
}

/** Run `seconds` of game time at sixty updates a second. */
function run(monster: Monster, party: PartyTarget, seconds: number, from = 0): number {
  let now = from;
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) {
    now += 1 / 60;
    monster.update(1 / 60, party, now);
  }
  return now;
}

describe('fleeing (monsters.md 2.7)', () => {
  it('runs from the party under its AI type’s share of hit points and stands off out of reach', () => {
    const { character, played } = body('goblin-scout');
    const def = MONSTERS['goblin-scout']!;
    const monster = new Monster(def, character, null, mulberry32(3));
    const near: PartyTarget = { position: new Vector3(0, 0, 1), pickTarget: () => null };
    run(monster, near, 0.5);
    expect(monster.state).toBe('attack');
    // A wimp runs at 30 %: 13 hit points, so at 3 it goes.
    monster.takeDamage(def.hp - 4);
    run(monster, near, 0.1);
    expect(monster.state).toBe('attack');
    monster.takeDamage(1);
    const events = monster.takeEvents();
    // Never mid-swing: the swing in progress ends first (2.1 s), then it runs.
    run(monster, near, 2.5);
    expect(monster.state).toBe('flee');
    expect([...events, ...monster.takeEvents()].some((e) => e.kind === 'flee')).toBe(true);
    expect(played.at(-1)).toBe('run');
    // Away from the party, straight on: after three seconds it is over ten metres off.
    run(monster, near, 3);
    expect(monster.position.z).toBeLessThan(-8);
    expect(monster.fleeing).toBe(true);
    // Beyond two and a half aggro ranges, and past the detector's yellow (36 m at least, so a
    // fled goblin cannot keep the party from resting), it stops and stands; nearer again, it
    // runs again.
    run(monster, near, 9);
    expect(monster.state).toBe('idle');
    expect(monster.distanceTo(near.position)).toBeGreaterThan(36);
    const closer: PartyTarget = { ...near, position: monster.position.add(new Vector3(0, 0, 5)) };
    run(monster, closer, 0.2);
    expect(monster.state).toBe('flee');
  });

  it('never flees when suicidal, and turns to fight when cornered', () => {
    const lord = new Monster(
      MONSTERS['skeleton-lord']!,
      body('skeleton-lord').character,
      null,
      mulberry32(3),
    );
    const near: PartyTarget = { position: new Vector3(0, 0, 1), pickTarget: () => null };
    run(lord, near, 0.5);
    lord.takeDamage(MONSTERS['skeleton-lord']!.hp - 1);
    run(lord, near, 1);
    expect(lord.state).toBe('attack');
    // A goblin pinned against a wall: its position is held, so it gets nowhere and turns.
    const { character } = body('goblin-scout');
    const goblin = new Monster(MONSTERS['goblin-scout']!, character, null, mulberry32(3));
    run(goblin, near, 0.5);
    goblin.takeDamage(MONSTERS['goblin-scout']!.hp - 1);
    run(goblin, near, 2.5);
    expect(goblin.state).toBe('flee');
    for (let i = 0; i < 120; i++) {
      character.node.position.set(0, 0, 0);
      goblin.update(1 / 60, near, 10 + i / 60);
    }
    expect(goblin.state).not.toBe('flee');
    run(goblin, near, 1);
    expect(goblin.state).toBe('attack');
  });
});

describe('missiles (monsters.md 2.4, 2.12)', () => {
  function shaman(canSee = true) {
    const { character, played } = body('goblin-shaman');
    const def = MONSTERS['goblin-shaman']!;
    const monster = new Monster(def, character, null, mulberry32(11));
    const hits: number[] = [];
    const party: PartyTarget = {
      position: new Vector3(0, 0, 9),
      pickTarget: () => ({ name: 'Zoltan', armorClass: 0, hit: (d) => hits.push(d) }),
      canSee: () => canSee,
    };
    return { monster, played, party, hits, def };
  }

  it('stops in range with a clear line, casts, and the bolt lands where the party stood', () => {
    const { monster, played, party, hits } = shaman();
    run(monster, party, 1);
    expect(monster.state).toBe('attack');
    expect(monster.distanceTo(party.position)).toBeGreaterThan(7);
    const shoot = monster.takeEvents().find((e) => e.kind === 'shoot');
    expect(shoot?.shot).toBeDefined();
    expect(played).toContain('cast');
    expect(shoot!.text).toBe('Goblin Shaman casts at Zoltan');
    const shot = shoot!.shot!;
    expect(shot.kind).toBe('fire');
    expect(shot.from.y).toBeCloseTo(1.3 * 0.65);
    expect(shot.at.z).toBe(9);
    // Brought down where the party stands: the roll decides.
    shot.land(shot.at, party.position);
    const landed = monster.takeEvents();
    expect(landed).toHaveLength(1);
    expect(['hit', 'miss']).toContain(landed[0]!.kind);
    if (landed[0]!.kind === 'hit') expect(hits).toHaveLength(1);
    else expect(hits).toHaveLength(0);
  });

  it('is dodged by a party that has stepped aside, and closes in without a line of sight', () => {
    const { monster, party, hits } = shaman();
    run(monster, party, 1);
    const shot = monster.takeEvents().find((e) => e.kind === 'shoot')!.shot!;
    shot.land(shot.at, new Vector3(3, 0, 9));
    expect(monster.takeEvents()[0]).toMatchObject({
      kind: 'miss',
      text: "Goblin Shaman's bolt flies past",
    });
    expect(hits).toHaveLength(0);
    const blind = shaman(false);
    run(blind.monster, blind.party, 1);
    expect(blind.monster.state).toBe('chase');
    expect(blind.monster.takeEvents().some((e) => e.kind === 'shoot')).toBe(false);
  });

  it('strikes in melee once the party is in reach', () => {
    const { monster, party } = shaman();
    party.position.set(0, 0, 1);
    run(monster, party, 1.5);
    const events = monster.takeEvents();
    expect(events.some((e) => e.kind === 'shoot')).toBe(false);
    expect(events.some((e) => e.kind === 'hit' || e.kind === 'miss')).toBe(true);
  });
});

describe('special attacks (monsters.md 2.6)', () => {
  it('tries the special after a hit and tells what the member suffered', () => {
    const { character } = body('skeleton-knight');
    const def = { ...MONSTERS['skeleton-knight']!, level: 100 };
    const suffered: string[] = [];
    const party: PartyTarget = {
      position: new Vector3(0, 0, 1),
      pickTarget: () => ({
        name: 'Zoltan',
        armorClass: 0,
        hit: () => undefined,
        suffer: (special) => {
          suffered.push(special.kind);
          return { condition: 'afraid', landed: suffered.length === 1 };
        },
      }),
    };
    // Level 100: every hit tries the special; the first lands, the second is shrugged off.
    const monster = new Monster(def, character, null, mulberry32(2));
    run(monster, party, 8);
    const hits = monster.takeEvents().filter((e) => e.kind === 'hit');
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits[0]!.text).toMatch(/^Skeleton Knight hits Zoltan for \d+; Zoltan is afraid$/);
    expect(hits[1]!.text).toMatch(/; Zoltan resists$/);
    expect(suffered.every((k) => k === 'afraid')).toBe(true);
  });
});
