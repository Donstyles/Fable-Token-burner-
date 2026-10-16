import { describe, expect, it } from 'vitest';
import { ROLE } from '../elements/roles';
import { Heightfield } from './heightfield';
import { terrainMesh } from './mesh';
import { fbm, ridged } from './noise';
import { riverSurface } from './river';
import { GroundPath, smoothPath } from './spline';
import { CAVE, caveLocalOf, caveMouth } from './cave';
import { streamFalls, streamSurfaces } from './stream';
import { buildTown } from './town';
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

describe('village', () => {
  it('rings the well with houses, leaving the road slot open, doors to the square', () => {
    const town = buildTown({ centre: [100, -50], y: 12, radius: 40, seed: 3, roadDirection: 0 });
    expect(town.houses).toHaveLength(7);
    expect(town.well).toEqual([100, -50]);
    expect(town.visual.indices.length / 3).toBeGreaterThan(500);
    expect(town.collider.indices.length / 3).toBeGreaterThan(50);
    for (const h of town.houses) {
      const angle = Math.atan2(h.z + 50, h.x - 100);
      // Nothing within the road's slot (±22.5° of +X).
      expect(Math.abs(angle)).toBeGreaterThan(Math.PI / 8 - 1e-6);
      // The door (local +Z) points at the well.
      const door = [-Math.sin(h.yaw), Math.cos(h.yaw)];
      const toWell = [100 - h.x, -50 - h.z];
      const len = Math.hypot(toWell[0]!, toWell[1]!);
      const dot = (door[0]! * toWell[0]! + door[1]! * toWell[1]!) / len;
      expect(dot).toBeGreaterThan(0.95);
      expect(h.y).toBe(12);
    }
  });

  it('sits on a level square at the start of the road, clear of trees', () => {
    const v = generateValley({ seed: 7, width: 1024, cell: 16 });
    const { centre, y, radius } = v.town;
    expect(v.road.at(0)).toEqual(centre);
    for (let a = 0; a < Math.PI * 2; a += 0.7) {
      for (const r of [0, radius * 0.35, radius * 0.7]) {
        const h = v.height.sample(centre[0] + Math.cos(a) * r, centre[1] + Math.sin(a) * r);
        expect(Math.abs(h - y)).toBeLessThan(0.5);
      }
    }
    expect(y).toBeGreaterThan(WATER_LEVEL + 2);
    const town = v.points.find((p) => p.name === 'town')!;
    expect(Math.hypot(town.position[0] - centre[0], town.position[2] - centre[1])).toBeCloseTo(
      8,
      0,
    );
    for (const t of placeTrees(v)) {
      expect(Math.hypot(t.x - centre[0], t.z - centre[1])).toBeGreaterThan(radius + 10);
    }
  });
});

describe('cave mouth', () => {
  it('is a solid tunnel into the hill with the portal at its back', () => {
    const yaw = Math.PI / 3;
    const cave = caveMouth({ x: 50, y: 20, z: -10, yaw });
    expect(cave.visual.indices.length / 3).toBeGreaterThan(60);
    expect(cave.collider.indices.length).toBe(cave.visual.indices.length);
    // The portal lies CAVE.length - 4.5 m into the hill along local +Z, at floor height.
    const portal = caveLocalOf({ x: 50, y: 20, z: -10, yaw }, cave.portal[0], cave.portal[2]);
    expect(portal.x).toBeCloseTo(0);
    expect(portal.z).toBeCloseTo(CAVE.length - 4.5);
    expect(cave.portal[1]).toBe(20);
    // The arrival point is outside the mouth, on the threshold.
    const arrive = caveLocalOf({ x: 50, y: 20, z: -10, yaw }, cave.arrive[0], cave.arrive[2]);
    expect(arrive.z).toBeLessThan(0);
    expect(arrive.z).toBeGreaterThan(-CAVE.threshold);
    // Every visual vertex is within the knoll's reach of the mouth.
    for (let i = 0; i < cave.visual.positions.length; i += 3) {
      const l = caveLocalOf(
        { x: 50, y: 20, z: -10, yaw },
        cave.visual.positions[i]!,
        cave.visual.positions[i + 2]!,
      );
      expect(Math.abs(l.x)).toBeLessThanOrEqual(CAVE.width / 2 + CAVE.skirt + 0.01);
      expect(l.z).toBeGreaterThanOrEqual(-CAVE.threshold - 0.01);
      expect(l.z).toBeLessThanOrEqual(CAVE.length + CAVE.skirt + 0.01);
    }
  });

  it('sits at the ravine head with the ground cut under the tunnel and level in front', () => {
    const v = generateValley({ seed: 7, width: 1024, cell: 16 });
    const c = v.cave;
    const hit = v.ravine.nearest(c.x, c.z);
    expect(hit.distance).toBeLessThan(1);
    expect(hit.along).toBeCloseTo(v.ravine.length - 25, 0);
    // Under the tunnel the terrain is below the floor; in front it is near floor height.
    const cos = Math.cos(c.yaw);
    const sin = Math.sin(c.yaw);
    const at = (lx: number, lz: number): number =>
      v.height.sample(c.x + lx * cos - lz * sin, c.z + lx * sin + lz * cos);
    expect(at(0, CAVE.length / 2)).toBeLessThan(c.y - 1);
    // Coarse 16 m test cells blur the cut into the apron; the real level uses 5 m cells.
    expect(Math.abs(at(0, -CAVE.threshold - 2) - c.y)).toBeLessThan(6);
    // The ravine is a walkable gorge: its floor climbs gently toward the head.
    const a = v.height.sample(...v.ravine.at(v.ravine.length * 0.3));
    const b = v.height.sample(...v.ravine.at(v.ravine.length * 0.6));
    const rise = (b - a) / (v.ravine.length * 0.3);
    expect(rise).toBeGreaterThan(0);
    expect(rise).toBeLessThan(Math.tan((20 * Math.PI) / 180));
  });
});

describe('ravine stream', () => {
  it('steps down the gorge in terraces, a waterfall at each, into the plunge pool', () => {
    // 8 m cells: the 7 m trough needs a vertex on the centreline, as the 5 m level has.
    const v = generateValley({ seed: 7, width: 1024, cell: 8 });
    const { terraces, pool } = v.stream;
    expect(terraces.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < terraces.length; i++) {
      expect(terraces[i]!.from).toBe(terraces[i - 1]!.to);
      expect(terraces[i]!.y).toBeGreaterThan(terraces[i - 1]!.y + 3);
    }
    expect(terraces[0]!.y).toBeGreaterThan(pool.y + 3);
    // The trough under each pool is below its water; the banks beside it are above.
    for (const t of terraces) {
      const mid = (t.from + t.to) / 2;
      const p = v.ravine.at(mid);
      const tan = v.ravine.nearest(p[0], p[1]).tangent;
      expect(v.height.sample(p[0], p[1])).toBeLessThan(t.y);
      const bank = v.height.sample(p[0] - tan[1] * 11, p[1] + tan[0] * 11);
      expect(bank).toBeGreaterThan(v.height.sample(p[0], p[1]));
      // No floating water: at the foot of the terrace the bank is at (or just above) the pool.
      const foot = v.ravine.at(t.from + 4);
      const ft = v.ravine.nearest(foot[0], foot[1]).tangent;
      const footBank = v.height.sample(foot[0] - ft[1] * 11, foot[1] + ft[0] * 11);
      expect(footBank).toBeGreaterThan(t.y - 0.6);
      expect(footBank).toBeLessThan(t.y + 5); // coarse 16 m test cells
    }
    const falls = streamFalls(v.ravine, v.stream);
    expect(falls).toHaveLength(terraces.length);
    for (const f of falls) {
      expect(f.lip[1] - f.plunge[1]).toBeGreaterThan(3);
      expect(f.mesh.indices.length).toBeGreaterThan(0);
    }
    const water = streamSurfaces(v.ravine, v.stream);
    expect(water).toHaveLength(terraces.length + 1);
    expect(water.at(-1)!.kind).toBe('pool');
  });
});
