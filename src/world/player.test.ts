import { describe, expect, it } from 'vitest';
import { easeToward } from './player';

describe('easeToward', () => {
  it('moves most of the way within a few time constants', () => {
    let v = 0;
    for (let i = 0; i < 12; i++) v = easeToward(v, 1, 14, 1 / 60); // 200 ms at 60 fps
    expect(v).toBeGreaterThan(0.9);
    expect(v).toBeLessThan(1);
  });
  it('is immediate when disabled', () => {
    expect(easeToward(0, 1, 0, 1 / 60)).toBe(1);
  });
  it('never overshoots', () => {
    expect(easeToward(0, 1, 100, 1)).toBeLessThanOrEqual(1);
    expect(easeToward(1, 0, 100, 1)).toBeGreaterThanOrEqual(0);
  });
});
