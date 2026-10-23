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
