import { describe, expect, it } from 'vitest';
import { Flash, HitStop, Shake } from './feedback-timing';

describe('hit stop', () => {
  it('returns no simulated time for the frozen span, then real time again', () => {
    const h = new HitStop();
    expect(h.update(1 / 60)).toBeCloseTo(1 / 60);
    h.freeze(0.07);
    expect(h.frozen).toBe(true);
    let frozenFrames = 0;
    for (let i = 0; i < 20; i++) if (h.update(1 / 60) === 0) frozenFrames++;
    expect(frozenFrames).toBe(5);
    expect(h.frozen).toBe(false);
  });

  it('never shortens a freeze already running', () => {
    const h = new HitStop();
    h.freeze(0.09);
    h.freeze(0.02);
    let frozenFrames = 0;
    for (let i = 0; i < 20; i++) if (h.update(1 / 60) === 0) frozenFrames++;
    expect(frozenFrames).toBe(6);
  });
});

describe('flash', () => {
  it('holds full strength for its span and ends', () => {
    const f = new Flash();
    expect(f.level).toBe(0);
    f.trigger(0.08);
    const levels: number[] = [];
    for (let i = 0; i < 8; i++) {
      levels.push(f.level);
      f.update(1 / 60);
    }
    expect(levels).toEqual([1, 1, 1, 1, 1, 0, 0, 0]);
  });
});

describe('shake', () => {
  it('jitters within the amplitude, fades out and settles at zero', () => {
    let n = 0;
    const s = new Shake(() => (n++ % 2 === 0 ? 1 : 0), 60);
    s.trigger(0.1, 0.2);
    expect(s.active).toBe(true);
    const peaks: number[] = [];
    for (let i = 0; i < 15; i++) {
      s.update(1 / 60);
      peaks.push(Math.abs(s.offset.x));
    }
    expect(Math.max(...peaks)).toBeLessThanOrEqual(0.1);
    expect(Math.max(...peaks)).toBeGreaterThan(0.05);
    expect(s.active).toBe(false);
    s.update(1 / 60);
    expect(s.offset).toEqual({ x: 0, y: 0, roll: 0 });
  });

  it('keeps a stronger shake over a weaker one', () => {
    const s = new Shake(() => 1, 60);
    s.trigger(0.2, 0.3);
    s.trigger(0.02, 0.3);
    s.update(1 / 60);
    expect(s.offset.x).toBeGreaterThan(0.15);
  });
});
