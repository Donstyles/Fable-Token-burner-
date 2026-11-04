import { describe, expect, it } from 'vitest';
import type { MeshData } from '../core/mesh';
import { ROLE } from '../elements/roles';
import { OBELISK, obeliskAt } from './obelisk';

const empty = (): MeshData => ({ positions: [], normals: [], uvs: [], indices: [], materials: [] });

describe('obeliskAt', () => {
  it('stands its plinth, shaft and point on the ground in dressed stone, one box solid', () => {
    const visual = empty();
    const solids = empty();
    const { top } = obeliskAt(visual, solids, [10, -4], () => 3);
    // Two step boxes (six quads each), the shaft's four sides and the point's four.
    expect(visual.indices.length / 3).toBe((12 + 4 + 4) * 2);
    expect(new Set(visual.materials)).toEqual(new Set([ROLE.ashlar]));
    expect(new Set(solids.materials)).toEqual(new Set([ROLE.collider]));
    const ys = visual.positions.filter((_, i) => i % 3 === 1);
    expect(Math.min(...ys)).toBeCloseTo(3 - OBELISK.sunk, 5);
    const steps = OBELISK.steps.reduce((h, s) => h + s.height, 0);
    expect(Math.max(...ys)).toBeCloseTo(
      3 - OBELISK.sunk + steps + OBELISK.height + OBELISK.point,
      5,
    );
    expect(top).toBeCloseTo(Math.max(...ys), 5);
    // The point gathers to the axis.
    const xs = visual.positions.filter((_, i) => i % 3 === 0);
    const zs = visual.positions.filter((_, i) => i % 3 === 2);
    expect(Math.max(...xs)).toBeCloseTo(10 + OBELISK.steps[0].half, 5);
    expect(Math.min(...zs)).toBeCloseTo(-4 - OBELISK.steps[0].half, 5);
    // Every normal points away from the axis or straight up or down.
    for (let i = 0; i < visual.normals.length; i += 3) {
      const nx = visual.normals[i]!;
      const ny = visual.normals[i + 1]!;
      const nz = visual.normals[i + 2]!;
      const px = visual.positions[i]! - 10;
      const pz = visual.positions[i + 2]! + 4;
      expect(nx * px + nz * pz + Math.abs(ny) * 0.01).toBeGreaterThanOrEqual(-1e-6);
    }
  });
});
