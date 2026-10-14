import { describe, expect, it } from 'vitest';
import { quantizeFrame } from './animation-step';

describe('quantizeFrame', () => {
  // A 60-frame clip authored at 30 fps (2 s), stepped at 10 steps per second: 3 frames per step.
  it('holds a frame for the whole step', () => {
    expect(quantizeFrame(0, 0, 60, 30, 10)).toBe(0);
    expect(quantizeFrame(0.099, 0, 60, 30, 10)).toBe(0);
    expect(quantizeFrame(0.1, 0, 60, 30, 10)).toBe(3);
    expect(quantizeFrame(0.25, 0, 60, 30, 10)).toBe(6);
  });

  it('loops', () => {
    expect(quantizeFrame(2.0, 0, 60, 30, 10)).toBe(0);
    expect(quantizeFrame(2.1, 0, 60, 30, 10)).toBe(3);
  });

  it('clamps when not looping', () => {
    expect(quantizeFrame(5, 0, 60, 30, 10, false)).toBe(60);
  });

  it('respects the clip start frame', () => {
    expect(quantizeFrame(0.1, 100, 160, 30, 10)).toBe(103);
  });

  it('is safe on degenerate input', () => {
    expect(quantizeFrame(1, 10, 10, 30, 10)).toBe(10);
    expect(quantizeFrame(1, 0, 60, 0, 10)).toBe(0);
  });
});
