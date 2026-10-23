import { describe, expect, it } from 'vitest';
import { isGlow } from './glow';

describe('painted light', () => {
  it('takes warm bright paint for light: lantern gold, forge orange', () => {
    expect(isGlow(255, 200, 90)).toBe(true);
    expect(isGlow(250, 130, 40)).toBe(true);
  });

  it('leaves cream plaster, pale glass, leaded windows and wood alone', () => {
    expect(isGlow(235, 220, 190)).toBe(false);
    expect(isGlow(220, 225, 230)).toBe(false);
    expect(isGlow(60, 70, 95)).toBe(false);
    expect(isGlow(120, 80, 50)).toBe(false);
  });
});
