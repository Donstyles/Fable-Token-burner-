import { describe, expect, it } from 'vitest';
import { MINUTES_PER_DAY } from '../game/time';
import { moonPhase, VISTA_TIMES, vistaSky } from './vista-model';

const at = (day: number, hour: number, minute = 0): number =>
  (day - 1) * MINUTES_PER_DAY + hour * 60 + minute;

describe('the rest screen vista by the hour (DESIGN 16.34)', () => {
  it("shares the land's four lights out, always summing to one", () => {
    for (let m = 0; m < MINUTES_PER_DAY; m += 17) {
      const w = vistaSky(at(3, 0, m)).weights;
      const sum = VISTA_TIMES.reduce((t, k) => t + w[k], 0);
      expect(sum).toBeCloseTo(1, 6);
    }
  });

  it('shows the day at noon, the sun high in the middle of the box', () => {
    const s = vistaSky(at(3, 13));
    expect(s.weights.day).toBeGreaterThan(0.99);
    expect(s.sun.visible).toBe(true);
    expect(s.sun.x).toBeCloseTo(0.5, 1);
    expect(s.sun.y).toBeGreaterThan(0.7);
    expect(s.stars).toBe(0);
  });

  it('paints sunrise as the sun comes up at the left, sunset as it goes down at the right', () => {
    const dawn = vistaSky(at(3, 5, 15));
    expect(dawn.weights.sunrise).toBeGreaterThan(0.5);
    expect(dawn.weights.sunset).toBe(0);
    expect(dawn.sun.x).toBeLessThan(0.1);
    expect(dawn.glow.strength).toBeGreaterThan(0.5);
    const dusk = vistaSky(at(3, 20, 45));
    expect(dusk.weights.sunset).toBeGreaterThan(0.5);
    expect(dusk.weights.sunrise).toBe(0);
    expect(dusk.sun.x).toBeGreaterThan(0.9);
  });

  it('turns to night and its stars once the sun is down', () => {
    const s = vistaSky(at(3, 1));
    expect(s.weights.night).toBeCloseTo(1, 3);
    expect(s.sun.visible).toBe(false);
    expect(s.stars).toBeGreaterThan(0.9);
  });

  it("keeps the calendar's moon: new on the 1st, full on the 15th, high at midnight", () => {
    expect(moonPhase(at(1, 0))).toBeCloseTo(0, 3);
    expect(moonPhase(at(15, 0))).toBeCloseTo(0.5, 3);
    const full = vistaSky(at(15, 3)).moon;
    expect(full.visible).toBe(true);
    expect(full.y).toBeGreaterThan(0.6);
    expect(full.brightness).toBeGreaterThan(0.9);
    // The new moon is with the sun, and not drawn.
    expect(vistaSky(at(1, 1)).moon.visible).toBe(false);
  });
});
