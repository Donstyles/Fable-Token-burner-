import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../plan/level';
import { buildNavMesh, checkReachability } from './navmesh';

describe('navmesh', () => {
  it('walks through a doorway and up stairs, not through a wall', async () => {
    const plan = new LevelBuilder('nav');
    // Two halls side by side joined by a doorway in the shared wall; a sealed third hall.
    plan.hall({
      name: 'a',
      at: [0, 0, 0],
      size: [8, 8],
      height: 4,
      openings: [{ side: 'east', at: 4, width: 1.6, height: 2.6 }],
    });
    plan.hall({
      name: 'b',
      at: [9.2, 0, 0],
      size: [8, 8],
      height: 4,
      openings: [{ side: 'west', at: 4, width: 1.6, height: 2.6 }],
    });
    plan.hall({ name: 'sealed', at: [0, 0, 12], size: [6, 4], height: 4 });
    // A platform in hall b reached by stairs.
    plan.slab({ at: [11, 2, -2], size: [3, 3] });
    plan.stairs({ from: [11, 0, 2.5], to: [11, 2, -0.5], width: 2 });
    plan.spawn([-2, 0, 0], 0);
    plan.point('door-side', [11, 0, 2], 'poi');
    plan.point('platform', [11, 2, -2], 'loot');
    plan.point('sealed', [0, 0, 12], 'poi');
    const level = await plan.build();
    const nav = await buildNavMesh(level.collider);
    expect(nav.bytes.length).toBeGreaterThan(100);
    expect(nav.debug.indices.length).toBeGreaterThan(0);
    const report = checkReachability(
      nav.navMesh,
      level.spawn.position,
      level.points.filter((p) => p.kind !== 'spawn'),
    );
    const byName = Object.fromEntries(report.results.map((r) => [r.name, r]));
    expect(byName['door-side']?.reachable).toBe(true);
    expect(byName['platform']?.reachable).toBe(true);
    expect(byName['sealed']?.reachable).toBe(false);
    expect(report.ok).toBe(false);
    expect(byName['door-side']?.pathLength).toBeGreaterThan(12);
  }, 60_000);
});
