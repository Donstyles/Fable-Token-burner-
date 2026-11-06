import { describe, expect, it } from 'vitest';
import { frameGate } from './frame-cap';

/** Frames drawn over `n` ticks of a display at `hz`, through a gate on `period` ms. */
function frames(hz: number, n: number, period: number | (() => number)): number[] {
  const gate = frameGate(typeof period === 'number' ? () => period : period);
  const drawn: number[] = [];
  for (let i = 0; i < n; i++) {
    const now = (i * 1000) / hz;
    if (gate(now)) drawn.push(i);
  }
  return drawn;
}

describe('frameGate', () => {
  it('draws every other tick of a 60 Hz display at thirty frames a second', () => {
    const drawn = frames(60, 600, 1000 / 30);
    expect(drawn.length).toBe(300);
    expect(drawn.slice(0, 4)).toEqual([0, 2, 4, 6]);
  });

  it('draws every fourth tick of a 120 Hz display at thirty, every other at sixty', () => {
    expect(frames(120, 1200, 1000 / 30).length).toBe(300);
    expect(frames(120, 1200, 1000 / 60).length).toBe(600);
    expect(frames(120, 8, 1000 / 30)).toEqual([0, 4]);
  });

  it('draws every tick with no cap', () => {
    expect(frames(60, 60, 0).length).toBe(60);
    expect(frames(120, 120, 0).length).toBe(120);
  });

  it('takes a changed period at the next tick', () => {
    let period = 1000 / 30;
    const gate = frameGate(() => period);
    const first = [0, 1, 2, 3].filter((i) => gate((i * 1000) / 60));
    expect(first).toEqual([0, 2]);
    period = 0;
    const then = [4, 5, 6, 7].filter((i) => gate((i * 1000) / 60));
    expect(then).toEqual([4, 5, 6, 7]);
  });
});
