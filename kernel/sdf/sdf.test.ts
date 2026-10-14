import { describe, expect, it } from 'vitest';
import { isWatertight, signedVolume } from '../core/validate';
import { marchingCubes } from './marching';
import { sdf } from './sdf';

describe('marching cubes over an SDF', () => {
  it('surfaces a sphere with the right volume, watertight, faces outward', () => {
    const r = 2;
    const m = marchingCubes(sdf.sphere([0, 0, 0], r), {
      min: [-3, -3, -3],
      max: [3, 3, 3],
      cell: 0.25,
    });
    const d = m.toMeshData();
    expect(isWatertight(d)).toBe(true);
    const v = signedVolume(d);
    const exact = (4 / 3) * Math.PI * r ** 3;
    expect(v).toBeGreaterThan(exact * 0.95);
    expect(v).toBeLessThan(exact * 1.02);
  });

  it('carves a cave: rock minus a tunnel is watertight and smaller than the rock', () => {
    const rock = sdf.box([0, 0, 0], [5, 3, 5]);
    const tunnel = sdf.tunnel(
      [
        [-6, 0, 0],
        [0, 0.5, 0],
        [6, 0, 1],
      ],
      1.2,
    );
    const cave = sdf.subtract(rock, tunnel);
    const m = marchingCubes(cave, { min: [-6, -4, -6], max: [6, 4, 6], cell: 0.3, smooth: 2 });
    const d = m.toMeshData();
    expect(isWatertight(d)).toBe(true);
    const v = signedVolume(d);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(10 * 6 * 10);
  });

  it('smooth union blends two spheres into one body', () => {
    const f = sdf.smoothUnion(1, sdf.sphere([-1, 0, 0], 1), sdf.sphere([1, 0, 0], 1));
    expect(f([0, 0, 0])).toBeLessThan(0); // bridged by the blend
    expect(f([0, 3, 0])).toBeGreaterThan(0);
  });
});
