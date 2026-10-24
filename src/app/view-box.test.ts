import { describe, expect, it } from 'vitest';
import { lensShift } from './view-box';

describe('the lens shift to the view box', () => {
  it('is nothing for a box filling the canvas', () => {
    expect(lensShift({ left: 0, top: 0, right: 932, bottom: 430 }, 932, 430)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('moves the centre left and up to a box at the top left', () => {
    // The phone's view: between the side pillar and the middle one, over the band.
    const s = lensShift({ left: 74, top: 7, right: 715, bottom: 295 }, 932, 430);
    expect(s.x).toBeCloseTo((2 * 394.5) / 932 - 1, 9);
    expect(s.x).toBeLessThan(0);
    expect(s.y).toBeCloseTo(1 - (2 * 151) / 430, 9);
    expect(s.y).toBeGreaterThan(0);
  });

  it('is nothing for a canvas without a size', () => {
    expect(lensShift({ left: 0, top: 0, right: 10, bottom: 10 }, 0, 0)).toEqual({ x: 0, y: 0 });
  });
});
