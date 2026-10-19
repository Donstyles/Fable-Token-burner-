/**
 * Monster records (DESIGN.md 14.3). Numbers are test data for Phase 5; the slice's roster
 * comes with Phase 6 content. Distances in metres, times in seconds.
 */
import type { Dice } from './rng';

export interface MonsterDef {
  id: string;
  name: string;
  level: number;
  hp: number;
  armorClass: number;
  /**
   * Not MM6's: a monster hits by its level (`resolveMonsterAttack`, MM6-GAPS.md 8), as the
   * world's monsters now do. Kept only until the roster's records are revised.
   */
  attackBonus: number;
  damage: Dice;
  /** Metres per second when closing in from afar / when near. */
  runSpeed: number;
  walkSpeed: number;
  /** Notices the party within this distance. */
  aggroRange: number;
  /** Stops and swings within this distance. */
  attackRange: number;
  /** Pause between swings. */
  attackEverySec: number;
  xp: number;
  /** Character asset id under assets/characters/. */
  character: string;
  heightMetres: number;
}

export const MONSTERS: Record<string, MonsterDef> = {
  bandit: {
    id: 'bandit',
    name: 'Bandit',
    level: 2,
    hp: 25,
    armorClass: 8,
    attackBonus: 3,
    damage: { count: 1, sides: 6, bonus: 1 },
    runSpeed: 3.2,
    walkSpeed: 1.4,
    aggroRange: 9,
    attackRange: 1.6,
    attackEverySec: 2,
    xp: 20,
    character: 'bandit',
    heightMetres: 1.78,
  },
  'goblin-scout': {
    id: 'goblin-scout',
    name: 'Goblin Scout',
    level: 1,
    hp: 14,
    armorClass: 6,
    attackBonus: 2,
    damage: { count: 1, sides: 4, bonus: 1 },
    runSpeed: 3.6,
    walkSpeed: 1.6,
    aggroRange: 11,
    attackRange: 1.4,
    attackEverySec: 1.6,
    xp: 10,
    character: 'goblin-scout',
    heightMetres: 1.3,
  },
  'skeleton-warrior': {
    id: 'skeleton-warrior',
    name: 'Skeleton Warrior',
    level: 3,
    hp: 32,
    armorClass: 10,
    attackBonus: 4,
    damage: { count: 1, sides: 8 },
    runSpeed: 2.6,
    walkSpeed: 1.2,
    aggroRange: 8,
    attackRange: 1.7,
    attackEverySec: 2.4,
    xp: 35,
    character: 'skeleton-warrior',
    heightMetres: 1.75,
  },
  'nomad-raider': {
    id: 'nomad-raider',
    name: 'Nomad Raider',
    level: 3,
    hp: 30,
    armorClass: 9,
    attackBonus: 4,
    damage: { count: 1, sides: 6, bonus: 2 },
    runSpeed: 3.4,
    walkSpeed: 1.5,
    aggroRange: 12,
    attackRange: 1.6,
    attackEverySec: 2,
    xp: 30,
    character: 'nomad-raider',
    heightMetres: 1.75,
  },
};

/** Townsfolk who stand about, turn to the party and answer a tap; not monsters. */
export interface NpcDef {
  id: string;
  name: string;
  character: string;
  /** What they say when tapped, in turn. */
  lines: string[];
}

export const NPCS: Record<string, NpcDef> = {
  'villager-woman': {
    id: 'villager-woman',
    name: 'Maren',
    character: 'villager-woman',
    lines: [
      'Good day to you, travellers. The well is sweet; drink your fill.',
      'Mind the north road. Goblins have been seen below the hills.',
      'The temple keeps a candle lit for those who go to sea.',
    ],
  },
  'villager-man': {
    id: 'villager-man',
    name: 'Old Tobin',
    character: 'villager-man',
    lines: [
      'Bandits took two of my sheep on the coast road. If you are the fighting kind, I would pay.',
      'The coast road runs west to the city, but the bandits hold it now.',
      'My barn has stood through forty winters. Forty-one, if the goblins keep away.',
    ],
  },
};
