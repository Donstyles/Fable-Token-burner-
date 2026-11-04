import { expect, test } from '@playwright/test';

/**
 * The Goblin Warren (docs/CAMPAIGN.md step 4, DESIGN.md 17.24): the goblins' holes in
 * Gullhaven's second hill, the den, the deep cave and the Sea Kings' vault Grik squats in.
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

test('the warren loads from the hill with its den, deep cave, locked vault and Grik', async ({
  page,
}) => {
  test.setTimeout(420_000);
  await page.goto('dev/?dev&lite&level=goblin-warren&entry=warren-mouth&seed=5');
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
      vault: d.pointOf('vault'),
      den: d.pointOf('den'),
    };
  });
  expect(Math.hypot(info.spawn.x, info.spawn.z + 2)).toBeLessThan(1);
  expect(info.reach.every((r) => r.reachable)).toBe(true);
  expect(info.reach.map((r) => r.name).sort()).toEqual(
    ['warren-tunnel', 'den', 'shaman-fire', 'deep', 'den-chest', 'vault', 'vault-chest'].sort(),
  );
  expect(info.spaces).toContain('cavern:warren');
  expect(info.spaces).toContain('hall:vault');
  expect(info.portals).toEqual(['warren-mouth>gullhaven:warren']);
  expect(info.spawns).toBe(11);
  expect(info.doors).toEqual(['vault-door']);
  expect(info.items).toEqual(['deep-key']);
  expect(info.chests.sort()).toEqual(['den-chest', 'vault-chest']);
  expect(info.vault!.z - info.den!.z).toBeGreaterThan(40);
  await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.monsters.length >= 11, null, {
    timeout: 120_000,
  });
  const kinds = await page.evaluate(() =>
    (window as unknown as W).ftb!.dev!.monsters.map((m) => m.def.id),
  );
  expect(kinds).toContain('goblin-grik');
  expect(kinds).toContain('goblin-king');
  expect(kinds.filter((k) => k === 'hobgoblin')).toHaveLength(2);
  await page.screenshot({ path: `test-results/goblin-warren-${test.info().project.name}.png` });
});
