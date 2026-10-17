import { describe, expect, it } from 'vitest';
import { arc, fill, line, polyline } from './pen';

describe('the one-pixel pen', () => {
  it('draws Bresenham lines with both ends', () => {
    expect(line([0, 0], [3, 1])).toEqual([
      [0, 0],
      [1, 0],
      [2, 1],
      [3, 1],
    ]);
    expect(line([2, 2], [2, 2])).toEqual([[2, 2]]);
  });
  it('joins a polyline without doubling its joints', () => {
    const px = polyline([
      [0, 0],
      [2, 0],
      [2, 2],
    ]);
    expect(px).toHaveLength(5);
  });
  it('closes a circle as a ring of single pixels', () => {
    const ring = polyline(arc(10, 10, 6, 6, 0, Math.PI * 2, 48));
    for (const [x, y] of ring) expect(Math.abs(Math.hypot(x - 10, y - 10) - 6)).toBeLessThan(1.2);
  });
  it('fills a square by pixel centres', () => {
    expect(
      fill([
        [0, 0],
        [3, 0],
        [3, 3],
        [0, 3],
      ]),
    ).toHaveLength(9);
  });
});
