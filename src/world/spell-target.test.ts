import { describe, expect, it } from 'vitest';
import { pickTarget } from './spell-target';

const eye = { x: 0, y: 1.6, z: 0 };
const ahead = { x: 0, y: 0, z: 1 };

describe('pickTarget', () => {
  it('takes the living monster nearest the middle of the view', () => {
    const picked = pickTarget(
      [
        { x: 3, y: 1, z: 8, alive: true }, // off to the side
        { x: 0.5, y: 1, z: 12, alive: true }, // almost dead ahead
        { x: 0, y: 1, z: 6, alive: false }, // dead, straight ahead
      ],
      eye,
      ahead,
    );
    expect(picked).toBe(1);
  });

  it('ignores what is behind, beyond reach or outside the cone', () => {
    expect(
      pickTarget(
        [
          { x: 0, y: 1, z: -5, alive: true },
          { x: 0, y: 1, z: 60, alive: true },
          { x: 10, y: 1, z: 5, alive: true },
        ],
        eye,
        ahead,
      ),
    ).toBe(-1);
  });

  it('prefers the closer of two at the same angle', () => {
    expect(
      pickTarget(
        [
          { x: 0, y: 1.6, z: 20, alive: true },
          { x: 0, y: 1.6, z: 5, alive: true },
        ],
        eye,
        ahead,
      ),
    ).toBe(1);
  });

  it('follows the look direction', () => {
    const right = { x: 1, y: 0, z: 0 };
    expect(
      pickTarget(
        [
          { x: 0, y: 1, z: 8, alive: true },
          { x: 8, y: 1, z: 0.5, alive: true },
        ],
        eye,
        right,
      ),
    ).toBe(1);
  });
});
