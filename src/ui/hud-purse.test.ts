import { describe, expect, it } from 'vitest';
import { purseFigure } from './hud';

describe('the purse on the band', () => {
  it('shows whole counts, never below nothing, at most six figures', () => {
    expect(purseFigure(200)).toBe('200');
    expect(purseFigure(7.9)).toBe('7');
    expect(purseFigure(0)).toBe('0');
    expect(purseFigure(-5)).toBe('0');
    expect(purseFigure(Number.NaN)).toBe('0');
    expect(purseFigure(123_456)).toBe('123456');
    expect(purseFigure(5_000_000)).toBe('999999');
  });
});
