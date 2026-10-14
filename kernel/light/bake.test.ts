import { describe, expect, it } from 'vitest';
import { box } from '../core/ops';
import { isClosed, signedVolume } from '../core/validate';
import { MeshBuilder } from '../core/mesh';
import { TriangleBVH, bakeVertexLight, subdivide } from './bake';

describe('light bake', () => {
  it('subdivides along the world grid without changing the surface', () => {
    const slab = box(6, 0.5, 4).translate(0.3, 0, 0.2).toMeshData();
    const fine = subdivide(slab, 1);
    expect(fine.indices.length).toBeGreaterThan(slab.indices.length * 10);
    expect(isClosed(fine)).toBe(true);
    expect(signedVolume(fine)).toBeCloseTo(signedVolume(slab), 6);
    // Every vertex lies on a grid plane or an original edge: x in [-2.7, 3.3].
    for (let i = 0; i < fine.positions.length; i += 3) {
      expect(fine.positions[i]!).toBeGreaterThanOrEqual(-2.7 - 1e-9);
      expect(fine.positions[i]!).toBeLessThanOrEqual(3.3 + 1e-9);
    }
    // Planar UVs are preserved through interpolation: top face uv = (x, z) / 1.
    for (let v = 0; v < fine.positions.length / 3; v++) {
      if (Math.abs((fine.positions[v * 3 + 1] ?? 0) - 0.25) > 1e-9) continue;
      if ((fine.normals[v * 3 + 1] ?? 0) < 0.9) continue;
      expect(fine.uvs[v * 2]).toBeCloseTo(fine.positions[v * 3] ?? 0, 6);
      expect(fine.uvs[v * 2 + 1]).toBeCloseTo(fine.positions[v * 3 + 2] ?? 0, 6);
    }
  });

  it('bvh reports occlusion only when a triangle lies between the points', () => {
    const wall = box(0.2, 4, 4).toMeshData();
    const bvh = new TriangleBVH(wall);
    expect(bvh.occluded([-2, 0, 0], [2, 0, 0])).toBe(true);
    expect(bvh.occluded([-2, 5, 0], [2, 5, 0])).toBe(false);
    expect(bvh.occluded([-2, 0, 0], [-0.5, 0, 0])).toBe(false);
  });

  it('bakes a light pool with a shadow behind a wall', () => {
    const scene = new MeshBuilder();
    scene.append(box(20, 0.5, 20).translate(0, -0.25, 0)); // floor, top at y = 0
    scene.append(box(0.3, 3, 6).translate(3, 1.5, 0)); // wall at x = 3
    const mesh = scene.toMeshData();
    const lit = bakeVertexLight(
      mesh,
      [{ position: [0, 2, 0], color: [1, 0.8, 0.6], range: 12, intensity: 2 }],
      { ambient: [0.1, 0.1, 0.1], cell: 1 },
    );
    expect(lit.colors.length).toBe(lit.positions.length);
    const at = (x: number, z: number): [number, number, number] | null => {
      for (let v = 0; v < lit.positions.length / 3; v++) {
        if (
          Math.abs((lit.positions[v * 3] ?? 0) - x) < 1e-6 &&
          Math.abs(lit.positions[v * 3 + 1] ?? 0) < 1e-6 &&
          Math.abs((lit.positions[v * 3 + 2] ?? 0) - z) < 1e-6 &&
          (lit.normals[v * 3 + 1] ?? 0) > 0.9
        ) {
          return [lit.colors[v * 3] ?? 0, lit.colors[v * 3 + 1] ?? 0, lit.colors[v * 3 + 2] ?? 0];
        }
      }
      return null;
    };
    const under = at(0, 0)!;
    const near = at(1, 0)!;
    const shadow = at(5, 0)!;
    const lit2 = at(-5, 0)!;
    expect(under[0]).toBeGreaterThan(near[0]);
    expect(near[0]).toBeGreaterThan(lit2[0]);
    expect(lit2[0]).toBeGreaterThan(0.1);
    // Behind the wall only ambient survives.
    expect(shadow[0]).toBeCloseTo(0.1, 6);
    // Warm light: red above blue.
    expect(under[0]).toBeGreaterThan(under[2]);
  });
});
