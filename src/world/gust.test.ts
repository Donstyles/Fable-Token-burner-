import { describe, expect, it } from 'vitest';
import { gustAt } from './soundscape';

describe('gustAt', () => {
  it('runs from the lull to the two peaks of the wind loop and round again', () => {
    expect(gustAt(0)).toBeCloseTo(0, 5);
    // The gain curve's third and seventh of ten points are its peaks: 2/9 and 6/9 of 16 s.
    expect(gustAt((16 * 2) / 9)).toBeCloseTo(1, 5);
    expect(gustAt((16 * 6) / 9)).toBeCloseTo(1, 5);
    expect(gustAt(16 + (16 * 2) / 9)).toBeCloseTo(1, 5);
    expect(gustAt(-16)).toBeCloseTo(0, 5);
  });

  it('never leaves 0 to 1', () => {
    for (let t = 0; t < 32; t += 0.1) {
      expect(gustAt(t)).toBeGreaterThanOrEqual(0);
      expect(gustAt(t)).toBeLessThanOrEqual(1);
    }
  });
});
