import { expect, test } from '@playwright/test';

/**
 * The Headland Undercroft (docs/CAMPAIGN.md step 11, DESIGN.md 17.26): the First Door under
 * Gullhaven's ruin, three doors keyed to the three seals, Gorrak at the gate and the Sea King
 * on his seat at the end.
 */
type Dev = {
  ready: boolean;
  level: {
    sidecar: { reachability: { name: string; reachable: boolean }[]; spawns: unknown[] };
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

test('the Undercroft loads from the headland with its three sealed doors, its gate and its king', async ({
  page,
}) => {
  test.setTimeout(420_000);
  await page.goto('dev/?dev&lite&level=headland-undercroft&entry=undercroft-mouth&seed=5');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  const info = await page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev!;
    return {
      spawn: d.positionOf(),
      reach: d.level.sidecar.reachability,
      spawns: d.level.sidecar.spawns.length,
      portals: d.portals.portals.map((p) => `${p.name}>${p.target.level}:${p.target.entry}`),
      doors: d.doors.names(),
      items: d.groundItems.names(),
      chests: d.chests.names(),
      gate: d.pointOf('gate-cave'),
      throne: d.pointOf('throne'),
    };
  });
  expect(Math.hypot(info.spawn.x, info.spawn.z + 2)).toBeLessThan(1);
  expect(info.reach.every((r) => r.reachable)).toBe(true);
  expect(info.reach.map((r) => r.name).sort()).toEqual(
    ['gate-cave', 'first-hall', 'second-hall', 'landing', 'throne', 'throne-chest'].sort(),
  );
  expect(info.portals).toEqual(['undercroft-mouth>gullhaven:undercroft']);
  expect(info.spawns).toBe(15);
  // Three doors, one a seal: no key lies on any floor here.
  expect(info.doors).toEqual(['door-of-the-halls', 'door-of-the-barrow', 'door-of-the-deep']);
  expect(info.items).toEqual([]);
  expect(info.chests).toEqual(['throne-chest']);
  expect(info.throne!.z - info.gate!.z).toBeGreaterThan(70);
  await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.monsters.length >= 15, null, {
    timeout: 120_000,
  });
  const kinds = await page.evaluate(() =>
    (window as unknown as W).ftb!.dev!.monsters.map((m) => m.def.id),
  );
  expect(kinds).toContain('the-sea-king');
  expect(kinds).toContain('hobgoblin-gorrak');
  expect(kinds.filter((k) => k === 'hobgoblin')).toHaveLength(3);
  await page.screenshot({ path: `test-results/undercroft-${test.info().project.name}.png` });
});
