import { expect, test } from '@playwright/test';

/**
 * The Thieves' Den (DESIGN.md 17.21), the second dungeon: the smugglers' sea cave under
 * Harrowmere's cove, the store with its locked door, the den below and Black Orrin's chamber.
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
  monsters: { def: { id: string }; state: string }[];
  doors: { names(): string[] };
  groundItems: { names(): string[] };
  chests: { names(): string[] };
};
type W = Window & { ftb?: { dev?: Dev } };

test('the den loads from the cove with its rooms reachable, its door, its key and its chests', async ({
  page,
}) => {
  test.setTimeout(420_000);
  await page.goto('dev/?dev&lite&level=thieves-den&entry=cove-mouth&seed=5');
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
      captain: d.pointOf('captain'),
      cave: d.pointOf('sea-cave'),
    };
  });
  expect(Math.hypot(info.spawn.x, info.spawn.z + 2)).toBeLessThan(1);
  expect(info.reach.every((r) => r.reachable)).toBe(true);
  expect(info.reach.map((r) => r.name)).toEqual([
    'sea-cave',
    'nook',
    'store',
    'store-chest',
    'landing',
    'common-room',
    'sleeping-hole',
    'hole-chest',
    'captain',
    'captain-chest',
  ]);
  expect(info.spaces).toContain('cavern:sea-cave');
  expect(info.spaces).toContain('hall:common-room');
  expect(info.spaces).toContain('hall:captain-chamber');
  expect(info.portals).toEqual(['cove-mouth>harrowmere:cove']);
  expect(info.spawns).toBe(10);
  expect(info.doors).toEqual(['store-door']);
  expect(info.items).toEqual(['nook-key']);
  expect(info.chests.sort()).toEqual(['captain-chest', 'hole-chest', 'store-chest']);
  expect(
    Math.hypot(info.captain!.x - info.cave!.x, info.captain!.z - info.cave!.z),
  ).toBeGreaterThan(40);
  await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.monsters.length >= 10, null, {
    timeout: 120_000,
  });
  const kinds = await page.evaluate(() =>
    (window as unknown as W).ftb!.dev!.monsters.map((m) => m.def.id),
  );
  expect(kinds).toContain('bandit-captain');
  expect(kinds.filter((k) => k === 'cutthroat')).toHaveLength(3);
  await page.screenshot({ path: `test-results/thieves-den-${test.info().project.name}.png` });
});
