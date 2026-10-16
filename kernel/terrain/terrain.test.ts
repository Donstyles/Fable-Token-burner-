import { describe, expect, it } from 'vitest';
import { ROLE } from '../elements/roles';
import { Heightfield } from './heightfield';
import { terrainMesh } from './mesh';
import { fbm, ridged } from './noise';
import { riverSurface } from './river';
import { GroundPath, smoothPath } from './spline';
import { forestMeshes, placeTrees, treeMesh } from './trees';
import { generateValley, WATER_LEVEL } from './valley';

describe('noise', () => {
  it('is deterministic and bounded', () => {
    expect(fbm(12.3, -4.5, 100, 7)).toBe(fbm(12.3, -4.5, 100, 7));
    for (let i = 0; i < 200; i++) {
      const v = fbm(i * 13.7, i * -5.1, 120, 3);
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
      const r = ridged(i * 7.3, i * 2.9, 90, 5);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});

describe('ground paths', () => {
  it('measures distance and arc length along a path', () => {
    const straight = new GroundPath([
      [0, 0],
      [0, 100],
      [100, 100],
    ]);
    expect(straight.length).toBeCloseTo(200);
    const hit = straight.nearest(10, 50);
    expect(hit.distance).toBeCloseTo(10);
    expect(hit.along).toBeCloseTo(50);
    expect(hit.tangent).toEqual([0, 1]);
    expect(straight.at(150)).toEqual([50, 100]);
    const smooth = new GroundPath(
      smoothPath(
        [
          [0, 0],
          [0, 100],
          [100, 100],
        ],
        4,
      ),
    );
    expect(smooth.length).toBeGreaterThan(190);
    expect(smooth.at(0)).toEqual([0, 0]);
    expect(smooth.at(smooth.length)).toEqual([100, 100]);
  });
});

describe('heightfield', () => {
  it('samples bilinearly and gives slopes', () => {
    const hf = new Heightfield(4, 10);
    for (let j = 0; j < hf.n; j++) for (let i = 0; i < hf.n; i++) hf.set(i, j, i * 10);
    expect(hf.sample(-15, 0)).toBeCloseTo(5);
    expect(hf.slopeDeg(2, 2)).toBeCloseTo(45);
    expect(hf.normal(2, 2)[0]).toBeLessThan(0);
  });
});

describe('valley', () => {
  const v = generateValley({ seed: 3, width: 1024, cell: 16 });

  it('has a river bed below the water and ridges above the floor', () => {
    expect(v.height.min).toBeLessThan(WATER_LEVEL);
    expect(v.height.max).toBeGreaterThan(80);
    const ford = v.points.find((p) => p.name === 'ford')!;
    expect(ford.position[1]).toBeLessThan(WATER_LEVEL);
  });

  it('keeps the road flat across and climbing along', () => {
    const r = v.road;
    const mid = r.at(r.length * 0.5);
    const t = r.nearest(mid[0], mid[1]).tangent;
    const left = v.height.sample(mid[0] - t[1] * 2, mid[1] + t[0] * 2);
    const right = v.height.sample(mid[0] + t[1] * 2, mid[1] - t[0] * 2);
    expect(Math.abs(left - right)).toBeLessThan(v.height.cell * 0.2);
    const start = v.height.sample(...r.at(5));
    const end = v.height.sample(...r.at(r.length - 5));
    expect(end).toBeGreaterThan(start + 20);
  });

  it('weights snow high, scree steep, path on the road, grass elsewhere', () => {
    let snow = 0;
    let scree = 0;
    let path = 0;
    for (let k = 0; k < v.splat.length; k += 3) {
      const total = v.splat[k]! + v.splat[k + 1]! + v.splat[k + 2]!;
      expect(total).toBeLessThanOrEqual(1.0001);
      if (v.splat[k]! > 0.5) path++;
      if (v.splat[k + 1]! > 0.5) scree++;
      if (v.splat[k + 2]! > 0.5) snow++;
    }
    expect(path).toBeGreaterThan(20);
    expect(scree).toBeGreaterThan(20);
    const total = v.splat.length / 3;
    expect(path + scree + snow).toBeLessThan(total * 0.7);
  });

  it('grows forests off the road and river, with trunks in the collider', () => {
    const trees = placeTrees(v);
    expect(trees.length).toBeGreaterThan(30);
    for (const t of trees) {
      expect(v.road.nearest(t.x, t.z).distance).toBeGreaterThan(6);
      expect(v.river.nearest(t.x, t.z).distance).toBeGreaterThan(15);
    }
    const pine = treeMesh('pine');
    expect(pine.materials).toContain(ROLE.bark);
    expect(pine.materials).toContain(ROLE.leaves);
    const { visual, collider } = forestMeshes(trees.slice(0, 5));
    expect(visual.indices.length / 3).toBeGreaterThan(collider.indices.length / 3);
    expect(collider.materials.every((m) => m === ROLE.bark)).toBe(true);
  });

  it('meshes the heightfield with splat colours and a river ribbon', () => {
    const m = terrainMesh(v);
    expect(m.positions.length / 3).toBe(v.height.n * v.height.n);
    expect(m.colors.length).toBe(m.positions.length);
    expect(m.indices.length / 3).toBe(2 * v.height.cells * v.height.cells);
    const river = riverSurface(v);
    expect(river.kind).toBe('river');
    expect(river.y).toBe(WATER_LEVEL);
    expect(river.mesh.indices.length).toBeGreaterThan(100);
    expect(Math.hypot(river.flow[0], river.flow[1])).toBeCloseTo(1);
  });

  it('is the same valley for the same seed', () => {
    const again = generateValley({ seed: 3, width: 1024, cell: 16 });
    expect(again.height.heights).toEqual(v.height.heights);
    expect(again.spawn).toEqual(v.spawn);
  });
});
