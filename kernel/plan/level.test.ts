import { describe, expect, it } from 'vitest';
import { v3, type Vec3 } from '../core/math';
import type { MeshData } from '../core/mesh';
import { isClosed, signedVolume } from '../core/validate';
import { ROLE } from '../elements/roles';
import { LevelBuilder } from './level';

/** True when the segment a→b crosses any triangle of the mesh (Möller–Trumbore). */
function segmentHits(m: MeshData, a: Vec3, b: Vec3): boolean {
  const d = v3.sub(b, a);
  const at = (i: number): Vec3 => [
    m.positions[i * 3] ?? 0,
    m.positions[i * 3 + 1] ?? 0,
    m.positions[i * 3 + 2] ?? 0,
  ];
  for (let t = 0; t < m.indices.length; t += 3) {
    const p0 = at(m.indices[t] ?? 0);
    const p1 = at(m.indices[t + 1] ?? 0);
    const p2 = at(m.indices[t + 2] ?? 0);
    const e1 = v3.sub(p1, p0);
    const e2 = v3.sub(p2, p0);
    const h = v3.cross(d, e2);
    const det = v3.dot(e1, h);
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det;
    const s = v3.sub(a, p0);
    const u = inv * v3.dot(s, h);
    if (u < 0 || u > 1) continue;
    const q = v3.cross(s, e1);
    const v = inv * v3.dot(d, q);
    if (v < 0 || u + v > 1) continue;
    const tt = inv * v3.dot(e2, q);
    if (tt > 1e-9 && tt < 1 - 1e-9) return true;
  }
  return false;
}

/** Nearest crossing point of the segment a→b with the mesh, or null. */
function firstHit(m: MeshData, a: Vec3, b: Vec3): Vec3 | null {
  const d = v3.sub(b, a);
  const at = (i: number): Vec3 => [
    m.positions[i * 3] ?? 0,
    m.positions[i * 3 + 1] ?? 0,
    m.positions[i * 3 + 2] ?? 0,
  ];
  let best = Infinity;
  for (let t = 0; t < m.indices.length; t += 3) {
    const p0 = at(m.indices[t] ?? 0);
    const e1 = v3.sub(at(m.indices[t + 1] ?? 0), p0);
    const e2 = v3.sub(at(m.indices[t + 2] ?? 0), p0);
    const h = v3.cross(d, e2);
    const det = v3.dot(e1, h);
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det;
    const s = v3.sub(a, p0);
    const u = inv * v3.dot(s, h);
    if (u < 0 || u > 1) continue;
    const q = v3.cross(s, e1);
    const v = inv * v3.dot(d, q);
    if (v < 0 || u + v > 1) continue;
    const tt = inv * v3.dot(e2, q);
    if (tt > 1e-9 && tt < 1 - 1e-9 && tt < best) best = tt;
  }
  return best === Infinity ? null : v3.add(a, v3.scale(d, best));
}

describe('level planner', () => {
  it('hall doorways open where edge() says, on every side', async () => {
    const plan = new LevelBuilder('t');
    const hall = plan.hall({
      name: 'hall',
      at: [0, 0, 0],
      size: [10, 8],
      height: 5,
      openings: [
        { side: 'south', at: 2, width: 1.6, height: 2.6 },
        { side: 'north', at: 3, width: 1.6, height: 2.6, kind: 'square' },
        { side: 'west', at: 1.5, width: 1.6, height: 2.6, kind: 'pointed' },
        { side: 'east', at: 6, width: 1.6, height: 2.6 },
      ],
    });
    const out = await plan.build();
    expect(isClosed(out.visual)).toBe(true);
    expect(signedVolume(out.visual)).toBeGreaterThan(0);
    const probe = (side: 'south' | 'north' | 'west' | 'east', along: number): boolean => {
      const e = hall.edge(side, along);
      const n = hall.outward(side);
      const a = v3.add(v3.add(e, v3.scale(n, -0.5)), [0, 1.2, 0]);
      const b = v3.add(v3.add(e, v3.scale(n, 1.5)), [0, 1.2, 0]);
      return segmentHits(out.visual, a, b);
    };
    // Through the doorways: clear. Beside them: wall.
    expect(probe('south', 2)).toBe(false);
    expect(probe('north', 3)).toBe(false);
    expect(probe('west', 1.5)).toBe(false);
    expect(probe('east', 6)).toBe(false);
    expect(probe('south', 7)).toBe(true);
    expect(probe('north', 7)).toBe(true);
    expect(probe('west', 6)).toBe(true);
    expect(probe('east', 1.5)).toBe(true);
    // edge() lands on the inner wall face.
    expect(hall.edge('north', 3)).toEqual([2, 0, 4]);
    expect(hall.edge('east', 6)).toEqual([5, 0, 2]);
    expect(hall.outward('west')).toEqual([-1, 0, 0]);
  });

  it('barrel vaulted hall is closed above the end walls', async () => {
    const plan = new LevelBuilder('t');
    plan.hall({ name: 'nave', at: [0, 0, 0], size: [8, 14], height: 6, vault: 'barrel' });
    const out = await plan.build();
    expect(isClosed(out.visual)).toBe(true);
    // A ray leaving through the gable above the south wall hits the fill.
    expect(segmentHits(out.visual, [0, 7, -5], [0, 7, -9])).toBe(true);
    // A ray through the middle of the vault at the springing line's height is clear.
    expect(segmentHits(out.visual, [-3, 5.5, -2], [3, 5.5, 2])).toBe(false);
    expect(out.bounds.max[1]).toBeGreaterThan(6 + 2);
  });

  it('keeps stair treads out of the collider and ramps out of the visual', async () => {
    const plan = new LevelBuilder('t');
    plan.stairs({ from: [0, 0, 0], to: [4, 2.2, 0], width: 3 });
    const out = await plan.build();
    expect(new Set(out.collider.materials)).toEqual(new Set([ROLE.collider]));
    expect(new Set(out.visual.materials)).toEqual(new Set([ROLE.flagstone]));
    expect(out.collider.indices.length).toBe(8 * 3);
    // Descending flights are built from the low end too.
    const down = new LevelBuilder('t');
    down.stairs({ from: [0, 3, 0], to: [0, 0, -5] });
    const d = await down.build();
    expect(d.bounds.min[1]).toBeCloseTo(0, 6);
    expect(d.bounds.max[1]).toBeCloseTo(3, 6);
    expect(d.bounds.min[2]).toBeCloseTo(-5, 6);
  });

  it('shaft portals meet treads and the shell is cut there', async () => {
    const plan = new LevelBuilder('t');
    const shaft = plan.shaft({
      name: 'shaft',
      at: [20, 0, 0],
      radius: 3,
      from: -6,
      to: 6,
      align: { y: 0, angleDeg: 180 },
      openings: [{ y: 0 }, { y: 6 }, { y: -6 }],
    });
    const mid = shaft.portal(0);
    expect(mid.angleDeg).toBeCloseTo(180, 6);
    expect(mid.outward[0]).toBeCloseTo(-1, 6);
    expect(mid.position[0]).toBeCloseTo(17, 6);
    expect(Math.abs(mid.y)).toBeLessThan(0.25);
    const top = shaft.portal(6);
    expect(top.y).toBeCloseTo(6, 6);
    const bottom = shaft.portal(-6);
    expect(bottom.y).toBeCloseTo(-6, 6);
    const out = await plan.build();
    for (const p of [mid, top, bottom]) {
      // Through the doorway at chest height: clear.
      const a = v3.add(v3.add(p.position, v3.scale(p.outward, -0.6)), [0, 1.2, 0]);
      const b = v3.add(v3.add(p.position, v3.scale(p.outward, 1.2)), [0, 1.2, 0]);
      expect(segmentHits(out.visual, a, b)).toBe(false);
      // Straight down just inside the doorway: a tread (or the floor) exactly at portal height.
      const inside = v3.add(p.position, v3.scale(p.outward, -0.5));
      const hit = firstHit(out.visual, v3.add(inside, [0, 0.4, 0]), v3.add(inside, [0, -0.4, 0]));
      expect(hit).not.toBeNull();
      expect(hit![1]).toBeCloseTo(p.y, 3);
    }
    // Opposite the middle portal the wall is intact.
    const across = v3.add(v3.add(mid.position, v3.scale(mid.outward, -2 * 3 + 0.6)), [0, 1.2, 0]);
    const acrossOut = v3.add(across, v3.scale(mid.outward, -1.8));
    expect(segmentHits(out.visual, across, acrossOut)).toBe(true);
    // The ramp collider climbs the whole shaft.
    const ramp = out.collider.materials.filter((m) => m === ROLE.collider).length;
    expect(ramp).toBeGreaterThan(100);
  });

  it('corridor runs from one point to the other with open ends', async () => {
    const plan = new LevelBuilder('t');
    const c = plan.corridor({
      name: 'c',
      from: [0, 0, 0],
      to: [0, 0, 12],
      width: 2.4,
      height: 3.2,
      vault: 'barrel',
    });
    expect(c.size).toEqual([12, 2.4]);
    expect(c.at).toEqual([0, 0, 6]);
    const out = await plan.build();
    // Straight down the middle: clear. Across: wall.
    expect(segmentHits(out.visual, [0, 1.5, -1], [0, 1.5, 13])).toBe(false);
    expect(segmentHits(out.visual, [-3, 1.5, 6], [3, 1.5, 6])).toBe(true);
    // Vault over the middle, floor under it.
    expect(segmentHits(out.visual, [0, 2, 6], [0, 6, 6])).toBe(true);
    expect(segmentHits(out.visual, [0, 1, 6], [0, -2, 6])).toBe(true);
  });

  it('switchback descends the full drop beside itself', async () => {
    const plan = new LevelBuilder('t');
    const sb = plan.switchback({ from: [0, 0, 0], drop: 6, direction: [0, 0, -1], width: 2.4 });
    expect(sb.bottom[1]).toBeCloseTo(-6, 6);
    expect(sb.landing[1]).toBeCloseTo(-3, 6);
    expect(Math.abs(sb.bottom[0])).toBeCloseTo(2.4, 6);
    expect(sb.direction[0]).toBeCloseTo(0, 9);
    expect(sb.direction[2]).toBeCloseTo(1, 9);
    const out = await plan.build();
    expect(out.bounds.min[1]).toBeCloseTo(-6, 6);
    expect(out.collider.materials).toContain(ROLE.collider);
  });

  it('cavern carves a chamber out of rock', async () => {
    const plan = new LevelBuilder('t');
    plan.cavern({
      name: 'cave',
      bounds: { min: [-8, -8, -8], max: [8, 8, 8] },
      carve: (s) => s.union(s.sphere([0, 0, 0], 4), s.capsule([0, 0, 0], [0, 0, 9], 1.5)),
      cell: 0.5,
    });
    const out = await plan.build();
    expect(new Set(out.visual.materials)).toEqual(new Set([ROLE.rock]));
    // Only the carved surfaces are meshed; the rock mass has no outer skin.
    const b = out.bounds;
    expect(b.max[0]).toBeLessThan(6);
    expect(b.min[1]).toBeGreaterThan(-6);
    expect(b.max[2]).toBeGreaterThanOrEqual(7.5);
    expect(out.visual.indices.length / 3).toBeLessThan(6000);
    // Inside the chamber is void: a ray across the centre hits nothing.
    expect(segmentHits(out.visual, [-2, 0, 0], [2, 0, 0])).toBe(false);
    // The tunnel breaks the rock's face.
    expect(segmentHits(out.visual, [0, 0, 5], [0, 0, 9])).toBe(false);
  });

  it('records spawn, points, lights and water', async () => {
    const plan = new LevelBuilder('meta');
    plan.spawn([1, 0, 2], 90);
    plan.point('chest', [3, 0, 3], 'loot');
    plan.light([0, 3, 0], [1, 0.8, 0.5], 8, 2);
    plan.waterPlane({ at: [0, -1, 0], size: [6, 6] });
    const out = await plan.build();
    expect(out.name).toBe('meta');
    expect(out.spawn).toEqual({ position: [1, 0, 2], yawDeg: 90 });
    expect(out.points.map((p) => p.name)).toEqual(['spawn', 'chest']);
    expect(out.lights).toHaveLength(1);
    expect(new Set(out.water.materials)).toEqual(new Set([ROLE.water]));
    expect(out.water.positions.length / 3).toBeGreaterThan(0);
  });
});
