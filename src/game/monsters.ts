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
};
