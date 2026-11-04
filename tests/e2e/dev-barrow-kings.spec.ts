import { expect, test } from '@playwright/test';

/**
 * The Barrow of Kings (DESIGN.md 17.23), the third dungeon: the mound-tomb under Harrowmere's
 * downs, its kings' hall, its two tombs, the locked stair and the Barrow King's chamber.
 */
type Dev = {
  ready: boolean;
  level: {
    sidecar: {
      reachability: { name: string; reachable: boolean }[];
      spaces: { kind: string; name: string }[];
      spawns: unknown[];
    };
  };
  positionOf(): { x: number; y: number; z: number };
  pointOf(name: string): { x: number; y: number; z: number } | null;
  portals: { portals: { name: string; target: { level: string; entry: string } }[] };
  monsters: { def: { id: string } }[];
  doors: { names(): string[] };
  groundItems: { names(): string[] };
  chests: { names(): string[] };
};
type W = Window & { ftb?: { dev?: Dev } };

test('the barrow loads from the mound with its hall, tombs, locked stair and king', async ({
  page,
}) => {
  test.setTimeout(420_000);
  await page.goto('dev/?dev&lite&level=barrow-kings&entry=barrow-mouth&seed=5');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  const info = await page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev!;
    return {
      spawn: d.positionOf(),
      reach: d.level.sidecar.reachability,
      spaces: d.level.sidecar.spaces.map((s) => `${s.kind}:${s.name}`),
      spawns: d.level.sidecar.spawns.length,
      portals: d.portals.portals.map((p) => `${p.name}>${p.target.level}:${p.target.entry}`),
      doors: d.doors.names(),
      items: d.groundItems.names(),
      chests: d.chests.names(),
      king: d.pointOf('king'),
      passage: d.pointOf('passage'),
    };
  });
  expect(Math.hypot(info.spawn.x, info.spawn.z + 2)).toBeLessThan(1);
  expect(info.reach.every((r) => r.reachable)).toBe(true);
  expect(info.reach.map((r) => r.name).sort()).toEqual(
    [
      'passage',
      'ante-cave',
      'kings-hall',
      'west-tomb',
      'west-tomb-chest',
      'east-tomb',
      'east-tomb-chest',
      'landing',
      'king',
      'king-chest',
    ].sort(),
  );
  expect(info.spaces).toContain('cavern:passage');
  expect(info.spaces).toContain('hall:kings-hall');
  expect(info.spaces).toContain('hall:king-chamber');
  expect(info.portals).toEqual(['barrow-mouth>harrowmere:barrow']);
  expect(info.spawns).toBe(11);
  expect(info.doors).toEqual(['stair-door']);
  expect(info.items).toEqual(['west-king-key']);
  expect(info.chests.sort()).toEqual(['east-tomb-chest', 'king-chest', 'west-tomb-chest']);
  expect(info.king!.z - info.passage!.z).toBeGreaterThan(60);
  await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.monsters.length >= 11, null, {
    timeout: 120_000,
  });
  const kinds = await page.evaluate(() =>
    (window as unknown as W).ftb!.dev!.monsters.map((m) => m.def.id),
  );
  expect(kinds).toContain('barrow-king');
  expect(kinds).toContain('skeleton-lord');
  expect(kinds.filter((k) => k === 'skeleton-knight')).toHaveLength(3);
  await page.screenshot({ path: `test-results/barrow-kings-${test.info().project.name}.png` });
});
