import { describe, expect, it } from 'vitest';
import { freshState } from './fixtures';
import { noteOrder } from './notes';
import { SITE_REACH, SITES, siteAt, useSite } from './sites';
import { MINUTES_PER_DAY, DAYS_PER_MONTH, DAYS_PER_YEAR } from './time';

const well = siteAt('gullhaven', 'well')!;
const shrine = siteAt('gullhaven', 'shrine')!;
const obelisk = siteAt('gullhaven', 'obelisk')!;

describe('sites', () => {
  it('stand at named points of their level', () => {
    expect(well.effect.kind).toBe('well');
    expect(shrine.effect.kind).toBe('altar');
    expect(obelisk.effect.kind).toBe('obelisk');
    expect(siteAt('gullhaven', 'square')).toBeUndefined();
    expect(siteAt('old-halls', 'well')).toBeUndefined();
    expect(SITE_REACH).toBeGreaterThan(0);
    // Every site has a note to keep, since MM6 noted its fountains and obelisks.
    expect(SITES.every((s) => s.note)).toBe(true);
  });

  it('the well raises the drinker’s Luck once, to the cap, and notes itself', () => {
    const state = freshState();
    const alric = state.party[0]!;
    const luck = alric.stats.luck;
    const first = useSite(state, well, 0);
    expect(first.text).toMatch(/cold and sweet/);
    expect(first.notices).toEqual(['Note added', 'Alric: Luck +2']);
    expect(alric.stats.luck).toBe(luck + 2);
    expect(noteOrder(state, 'site', well.id)).toBe(1);
    // A second drink is only refreshing.
    const again = useSite(state, well, 0);
    expect(again.text).toMatch(/Refreshing/);
    expect(again.notices).toEqual([]);
    expect(alric.stats.luck).toBe(luck + 2);
    // Another member drinks for themself; at the cap the water gives nothing more.
    state.party[1]!.stats.luck = 14;
    expect(useSite(state, well, 1).notices).toEqual(['Mira: Luck +1']);
    expect(state.party[1]!.stats.luck).toBe(15);
    state.party[2]!.stats.luck = 15;
    expect(useSite(state, well, 2).text).toMatch(/Refreshing/);
  });

  it('the shrine answers in its month, +10 the first year and +3 after, once a year', () => {
    const state = freshState();
    const before = state.party.map((c) => c.stats.endurance);
    // The game starts in January, the shrine's month.
    const first = useSite(state, shrine, 0);
    expect(first.notices).toEqual(['Note added', 'The party: Endurance +10']);
    expect(state.party.map((c) => c.stats.endurance)).toEqual(before.map((e) => e + 10));
    expect(useSite(state, shrine, 0).text).toMatch(/this year/);
    // February: quiet.
    state.clock.minutes += DAYS_PER_MONTH * MINUTES_PER_DAY;
    expect(useSite(state, shrine, 0).text).toMatch(/comes in January/);
    // Next January: a little.
    state.clock.minutes += (DAYS_PER_YEAR - DAYS_PER_MONTH) * MINUTES_PER_DAY;
    const later = useSite(state, shrine, 0);
    expect(later.notices).toEqual(['The party: Endurance +3']);
    expect(state.party.map((c) => c.stats.endurance)).toEqual(before.map((e) => e + 13));
  });

  it('the obelisk shows its fragment and the note keeps it', () => {
    const state = freshState();
    const read = useSite(state, obelisk, 0);
    expect(read.text).toMatch(/SEVEN STAND IN LINE/);
    expect(read.notices).toEqual(['Note added']);
    expect(useSite(state, obelisk, 0).notices).toEqual([]);
  });
});
