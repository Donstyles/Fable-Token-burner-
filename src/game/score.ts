/**
 * The score (DESIGN.md 17.13; MM6-GAPS 36): MM6's congratulations screen listed the party,
 * their levels, the game time and a final score. MM6's formula is not published; ours
 * rewards experience and punishes dawdling: the party's experience together, scaled by a
 * hundred over a hundred plus the days played, rounded.
 */
import type { ClassId } from './classes';
import type { GameState } from './state';
import { START_MINUTES } from './time';

const MINUTES_A_DAY = 24 * 60;

export interface Scoreboard {
  /** Each member's name, class and level. */
  members: { name: string; classId: ClassId; level: number }[];
  /** Whole days since the game began. */
  days: number;
  gold: number;
  experience: number;
  score: number;
}

export function scoreboard(state: GameState): Scoreboard {
  const experience = state.party.reduce((sum, c) => sum + c.xp, 0);
  const days = Math.max(0, Math.floor((state.clock.minutes - START_MINUTES) / MINUTES_A_DAY));
  return {
    members: state.party.map((c) => ({ name: c.name, classId: c.classId, level: c.level })),
    days,
    gold: state.gold,
    experience,
    score: Math.round((experience * 100) / (100 + days)),
  };
}
