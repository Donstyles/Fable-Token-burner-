import { describe, expect, it } from 'vitest';
import { freshState } from './fixtures';
import { scoreboard } from './score';
import { advanceClock } from './time';

describe('the score (DESIGN 17.13)', () => {
  it('names the party, counts the days, and scores experience against time', () => {
    const state = freshState();
    for (const c of state.party) c.xp = 500;
    state.gold = 321;
    const fresh = scoreboard(state);
    expect(fresh.members).toHaveLength(state.party.length);
    expect(fresh.members[0]!.name).toBe(state.party[0]!.name);
    expect(fresh.days).toBe(0);
    expect(fresh.gold).toBe(321);
    expect(fresh.experience).toBe(500 * state.party.length);
    expect(fresh.score).toBe(500 * state.party.length);
    // Ten days later the same experience scores a tenth less.
    advanceClock(state.clock, 10 * 24 * 60);
    const later = scoreboard(state);
    expect(later.days).toBe(10);
    expect(later.score).toBe(Math.round((500 * state.party.length * 100) / 110));
  });
});
