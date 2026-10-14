import { describe, expect, it } from 'vitest';
import { isWatertight, signedVolume } from '../core/validate';
import {
  balustrade,
  barrelVault,
  bridge,
  column,
  floorSlab,
  spiralStair,
  stairs,
  wall,
} from './elements';
import { ROLE } from './roles';

describe('elements', () => {
  it('wall with plinth and cornice is solid and spans its length', () => {
    const w = wall({
      length: 6,
      height: 4,
      plinth: { height: 0.4, depth: 0.1 },
      cornice: { height: 0.3, depth: 0.15 },
    });
    const b = w.visual.bounds();
    expect(b.min[0]).toBeCloseTo(0, 6);
    expect(b.max[0]).toBeCloseTo(6, 6);
    expect(b.max[1]).toBeCloseTo(4, 6);
    expect(new Set(w.visual.toMeshData().materials)).toEqual(new Set([ROLE.ashlar, ROLE.trim]));
  });

  it('floor slab top sits at y = 0', () => {
    const s = floorSlab({ width: 10, depth: 8 });
    expect(s.visual.bounds().max[1]).toBeCloseTo(0, 6);
    expect(isWatertight(s.visual.toMeshData())).toBe(true);
  });

  it('column is watertight with base and capital wider than the shaft', () => {
    const c = column({ height: 5, radius: 0.35 });
    expect(isWatertight(c.visual.toMeshData())).toBe(true);
    const b = c.visual.bounds();
    expect(b.max[0]).toBeGreaterThan(0.35);
    expect(b.max[1]).toBeCloseTo(5, 6);
  });

  it('stairs climb and carry a wedge collider of matching extent', () => {
    const s = stairs({ width: 3, rise: 0.25, run: 0.35, steps: 12 });
    const b = s.visual.bounds();
    expect(b.max[1]).toBeCloseTo(3, 6);
    expect(b.max[0]).toBeCloseTo(4.2, 6);
    expect(s.collider).toBeDefined();
    const cb = s.collider!.bounds();
    expect(cb.max[1]).toBeCloseTo(3, 6);
    expect(cb.max[0]).toBeCloseTo(4.2, 6);
    expect(isWatertight(s.collider!.toMeshData())).toBe(true);
    expect(signedVolume(s.collider!.toMeshData())).toBeCloseTo(0.5 * 4.2 * 3 * 3, 4);
  });

  it('spiral stair rises over its turns with a continuous ramp collider', () => {
    const s = spiralStair({ radius: 2.5, innerRadius: 0.4, rise: 0.22, steps: 24, turns: 1.5 });
    const b = s.visual.bounds();
    expect(b.max[1]).toBeCloseTo(24 * 0.22 + 0.22, 1); // newel post is one step taller
    expect(Math.abs(b.max[0] - 2.5)).toBeLessThan(0.3);
    expect(s.collider).toBeDefined();
    expect(s.collider!.triangleCount).toBeGreaterThan(24 * 6 * 2);
  });

  it('balustrade and bridge have rails above the deck', () => {
    const r = balustrade({ length: 4 });
    expect(r.visual.bounds().max[1]).toBeCloseTo(1.0, 6);
    const br = bridge({ length: 10, width: 2.5 });
    expect(br.visual.bounds().max[1]).toBeCloseTo(1.0, 6);
    expect(br.visual.bounds().min[1]).toBeCloseTo(-0.4, 6);
  });

  it('barrel vault is a closed shell above the springing line', () => {
    const v = barrelVault({ width: 6, length: 10 });
    const d = v.visual.toMeshData();
    expect(isWatertight(d)).toBe(true);
    expect(signedVolume(d)).toBeGreaterThan(0);
    expect(v.visual.bounds().min[1]).toBeCloseTo(0, 6);
    expect(v.visual.bounds().max[1]).toBeCloseTo(3.4, 6);
  });
});
