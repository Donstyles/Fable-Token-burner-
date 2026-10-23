import { describe, expect, it } from 'vitest';
import { QUALITY, findGaps, hullEntry, hullPlanes, type Triangles } from './quality';

type P = [number, number, number];

/** A two-metre box standing on y = 0, its faces wound outward; `skip` and `flip` by name. */
function box(opts: { skip?: string; flip?: string } = {}): Triangles {
  const faces: Record<string, [P, P, P, P]> = {
    front: [
      [-1, 0, 1],
      [1, 0, 1],
      [1, 2, 1],
      [-1, 2, 1],
    ],
    back: [
      [1, 0, -1],
      [-1, 0, -1],
      [-1, 2, -1],
      [1, 2, -1],
    ],
    right: [
      [1, 0, 1],
      [1, 0, -1],
      [1, 2, -1],
      [1, 2, 1],
    ],
    left: [
      [-1, 0, -1],
      [-1, 0, 1],
      [-1, 2, 1],
      [-1, 2, -1],
    ],
    top: [
      [-1, 2, 1],
      [1, 2, 1],
      [1, 2, -1],
      [-1, 2, -1],
    ],
    bottom: [
      [-1, 0, -1],
      [1, 0, -1],
      [1, 0, 1],
      [-1, 0, 1],
    ],
  };
  const out: number[] = [];
  for (const [name, [a, b, c, d]] of Object.entries(faces)) {
    if (name === opts.skip) continue;
    const tris: P[][] = [
      [a, b, c],
      [a, c, d],
    ];
    for (const t of tris) out.push(...(name === opts.flip ? [t[0]!, t[2]!, t[1]!] : t).flat());
  }
  return { data: Float64Array.from(out), count: out.length / 9 };
}

describe('the gap screen', () => {
  it('finds nothing on a sound box', () => {
    expect(findGaps(box()).gaps).toEqual([]);
  });

  it('finds the inside of a box whose back wall is missing, seen from behind', () => {
    const { gaps } = findGaps(box({ skip: 'back' }));
    const worst = gaps[0]!;
    expect(worst.area).toBeGreaterThan(QUALITY.gap);
    // Seen from behind (180° round from the front), level.
    expect(gaps.some((g) => g.round === 180 && g.tilt === 0 && g.area > 3)).toBe(true);
  });

  it('passes a wall turned over in place: it lies on the envelope and draws as a wall', () => {
    expect(findGaps(box({ flip: 'front' })).gaps).toEqual([]);
  });

  it('enters the hull where the ray meets it', () => {
    const planes = hullPlanes(box());
    expect(hullEntry(planes, [0, 1, 10], [0, 0, -1])).toBeCloseTo(9, 6);
    expect(hullEntry(planes, [5, 1, 10], [0, 0, -1])).toBeNull();
  });
});
