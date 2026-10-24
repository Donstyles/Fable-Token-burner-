import { describe, expect, it } from 'vitest';
import { chimneysOf } from './chimney';
import type { Triangles } from './quality';

type V = [number, number, number];

/** Triangles as the quality screen holds them. */
function tris(list: [V, V, V][]): Triangles {
  return { data: Float64Array.from(list.flat(2)), count: list.length };
}

/** A box's six faces as twelve triangles. */
function box(a: V, b: V): [V, V, V][] {
  const [x0, y0, z0] = a;
  const [x1, y1, z1] = b;
  const q = (p: V, r: V, s: V, t: V): [V, V, V][] => [
    [p, r, s],
    [p, s, t],
  ];
  return [
    ...q([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]),
    ...q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]),
    ...q([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]),
    ...q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]),
    ...q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]),
    ...q([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]),
  ];
}

/** A house: walls to 3 m, a gable roof to 5 m along x, its ridge at z = 0. */
function house(): [V, V, V][] {
  return [
    ...box([-4, 0, -3], [4, 3, 3]),
    [
      [-4, 3, -3],
      [4, 3, -3],
      [4, 5, 0],
    ],
    [
      [-4, 3, -3],
      [4, 5, 0],
      [-4, 5, 0],
    ],
    [
      [-4, 5, 0],
      [4, 5, 0],
      [4, 3, 3],
    ],
    [
      [-4, 5, 0],
      [4, 3, 3],
      [-4, 3, 3],
    ],
  ];
}

describe('chimneys from the geometry', () => {
  it('finds none on a bare roof: the ridge is as high along itself', () => {
    expect(chimneysOf(tris(house()))).toEqual([]);
  });

  it('finds a chimney standing over the roof, at the middle of its top', () => {
    const c = chimneysOf(tris([...house(), ...box([2, 3, 0.8], [2.6, 5.6, 1.4])]));
    expect(c).toHaveLength(1);
    const [x, y, z] = c[0]!.at;
    expect(x).toBeCloseTo(2.3, 1);
    expect(y).toBeCloseTo(5.6, 2);
    expect(z).toBeCloseTo(1.1, 1);
    expect(c[0]!.area).toBeGreaterThan(0.2);
    expect(c[0]!.area).toBeLessThan(0.6);
    expect(c[0]!.rise).toBeGreaterThanOrEqual(0.4);
  });

  it('finds both of a house with two', () => {
    const c = chimneysOf(
      tris([
        ...house(),
        ...box([-3.2, 3, -0.3], [-2.6, 6, 0.3]),
        ...box([2.6, 3, -0.3], [3.2, 5.8, 0.3]),
      ]),
    );
    expect(c.map((k) => Math.sign(k.at[0]))).toEqual([-1, 1]);
  });
});
