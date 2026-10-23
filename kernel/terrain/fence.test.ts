import { describe, expect, it } from 'vitest';
import type { MeshData } from '../core/mesh';
import { ROLE } from '../elements/roles';
import { FENCE, fenceAlong } from './fence';

const empty = (): MeshData => ({ positions: [], normals: [], uvs: [], indices: [], materials: [] });

describe('fenceAlong', () => {
  it('stands a post every 2.5 m, the corner once, and two rails between each pair', () => {
    const visual = empty();
    const solids = empty();
    // Ten metres east, then five north: four bays and two, seven posts with the corner shared.
    const { posts } = fenceAlong(
      visual,
      solids,
      [
        [0, 0],
        [10, 0],
        [10, 5],
      ],
      () => 2,
    );
    expect(posts).toBe(7);
    // A box or a beam is six quads, twelve triangles: seven posts and twelve rails.
    expect(visual.indices.length / 3).toBe((7 + 6 * FENCE.rails.length) * 12);
    expect(new Set(visual.materials)).toEqual(new Set([ROLE.plank]));
    expect(new Set(solids.materials)).toEqual(new Set([ROLE.collider]));
  });

  it('follows the ground: a post stands from below it to its height above it', () => {
    const visual = empty();
    const solids = empty();
    const ground = (x: number): number => x * 0.2;
    fenceAlong(
      visual,
      solids,
      [
        [0, 0],
        [5, 0],
      ],
      ground,
    );
    // The first post's corners (a box of 24 vertices) span sunk below to the height above x=0.
    const ys = [];
    for (let i = 0; i < 24; i++) ys.push(visual.positions[i * 3 + 1]!);
    expect(Math.min(...ys)).toBeCloseTo(-FENCE.sunk, 5);
    expect(Math.max(...ys)).toBeCloseTo(FENCE.height, 5);
    // The last vertex of the visual is on the far post's rail end, near the ground at x = 5.
    const top = Math.max(...visual.positions.filter((_, i) => i % 3 === 1));
    expect(top).toBeGreaterThan(ground(5) + FENCE.rails[1]);
  });
});
