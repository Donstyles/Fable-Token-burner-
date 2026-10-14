import { describe, expect, it } from 'vitest';
import { box, cylinder } from '../core/ops';
import { isWatertight, signedVolume } from '../core/validate';
import { csg, unionAll } from './manifold';

describe('manifold booleans', () => {
  it('subtracts a cylinder from a box and keeps materials', async () => {
    const slab = box(4, 1, 4, { material: 1 });
    const hole = cylinder(0.5, 3, 24, { material: 2 }).translate(0, -1.5, 0);
    const out = await csg('subtract', slab.toMeshData(), hole.toMeshData());
    const d = out.toMeshData();
    expect(isWatertight(d)).toBe(true);
    const v = signedVolume(d);
    expect(v).toBeLessThan(16);
    expect(v).toBeGreaterThan(16 - Math.PI * 0.25 - 0.05);
    // The hole's inner wall carries the cutter's material, the slab keeps its own.
    expect(new Set(d.materials)).toEqual(new Set([1, 2]));
  });

  it('unions overlapping boxes into one watertight solid', async () => {
    const a = box(2, 2, 2);
    const b = box(2, 2, 2).translate(1, 0, 0);
    const out = await csg('union', a.toMeshData(), b.toMeshData());
    expect(isWatertight(out.toMeshData())).toBe(true);
    expect(signedVolume(out.toMeshData())).toBeCloseTo(12, 4);
  });

  it('unions many pieces', async () => {
    const pieces = [0, 1, 2, 3].map((i) =>
      box(1, 1, 1)
        .translate(i * 0.8, 0, 0)
        .toMeshData(),
    );
    const out = await unionAll(pieces);
    expect(isWatertight(out.toMeshData())).toBe(true);
    expect(signedVolume(out.toMeshData())).toBeCloseTo(1 + 3 * 0.8, 4);
  });
});
