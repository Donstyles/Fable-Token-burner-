/**
 * Creation inputs for the unit tests: four characters with the whole pool spent. Imported by
 * tests only; the runtime never loads this module.
 */
import type { Character } from './character';
import { createCharacter, type CreationInput, defaultCreation } from './creation';
import { type GameState, type LevelPosition, newGame } from './state';
import { stats } from './stats';

export function knightInput(): CreationInput {
  return {
    ...defaultCreation('knight'),
    name: 'Alric',
    portrait: 'm01',
    stats: stats({
      might: 32,
      intellect: 7,
      personality: 9,
      endurance: 30,
      accuracy: 23,
      speed: 21,
      luck: 7,
    }),
    skillPicks: ['axe', 'shield'],
  };
}

export function archerInput(): CreationInput {
  return {
    ...defaultCreation('archer'),
    name: 'Mira',
    sex: 'female',
    portrait: 'f02',
    stats: stats({
      might: 23,
      intellect: 13,
      personality: 7,
      endurance: 21,
      accuracy: 30,
      speed: 28,
      luck: 7,
    }),
    skillPicks: ['sword', 'perception'],
  };
}

export function clericInput(): CreationInput {
  return {
    ...defaultCreation('cleric'),
    name: 'Tobin',
    portrait: 'm04',
    stats: stats({
      might: 21,
      intellect: 9,
      personality: 32,
      endurance: 28,
      accuracy: 9,
      speed: 21,
      luck: 9,
    }),
    skillPicks: ['spirit', 'shield'],
  };
}

export function sorcererInput(): CreationInput {
  return {
    ...defaultCreation('sorcerer'),
    name: 'Sera',
    sex: 'female',
    portrait: 'f03',
    stats: stats({
      might: 7,
      intellect: 32,
      personality: 9,
      endurance: 24,
      accuracy: 23,
      speed: 23,
      luck: 11,
    }),
    skillPicks: ['air', 'meditation'],
  };
}

function must(input: CreationInput): Character {
  const r = createCharacter(input);
  if (!r.ok) throw new Error(`fixture invalid: ${JSON.stringify(r.errors)}`);
  return r.character;
}

/** A knight, an archer, a cleric and a sorcerer, fresh from creation. */
export function testCharacters(): Character[] {
  return [must(knightInput()), must(archerInput()), must(clericInput()), must(sorcererInput())];
}

export const TEST_LEVEL: LevelPosition = { id: 'showcase', x: 1, y: 2, z: 3, yawDeg: 90 };

/** A new game with the four test characters, outfitted and at the showcase spawn. */
export function freshState(): GameState {
  const r = newGame(testCharacters(), { seed: 7, level: TEST_LEVEL });
  if (!r.ok) throw new Error(`fixture: ${r.reason}`);
  return r.state;
}
