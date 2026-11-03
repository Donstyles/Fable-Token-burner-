import { expect, test } from '@playwright/test';

/**
 * The Old Halls (levels/old-halls, DESIGN 17.10): the first dungeon, under the goblin hills,
 * entered from Gullhaven's cave. The party arrives in the rock tunnel from the mouth, the
 * goblins and the dead stand where the script put them, every room is on the validator's
 * walk, and the tunnel back is a portal to the cave.
 */
type Dev = {
  ready: boolean;
  level: {
    sidecar: {
      reachability: { name: string; reachable: boolean }[];
      spawns: unknown[];
      spaces: { name: string; kind: string }[];
    };
  };
  positionOf(): { x: number; y: number; z: number };
  pointOf(name: string): { x: number; y: number; z: number } | null;
  teleport(x: number, y: number, z: number, yaw: number): void;
  monsters: { state: string }[];
  portals: {
    portals: { name: string; target: { level: string; entry: string } }[];
    isArmed(name: string): boolean;
  };
};
type W = Window & { ftb?: { dev?: Dev } };

test('the halls load from the cave mouth, every room reachable, the dead in their places', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto('dev/?dev&lite&level=old-halls&entry=cave-mouth&seed=5');
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
      lair: d.pointOf('lair'),
      warden: d.pointOf('warden'),
    };
  });
  // Arrived through the portal: just inside the tunnel from the mouth, facing in.
  expect(Math.hypot(info.spawn.x, info.spawn.z + 2)).toBeLessThan(1);
  expect(info.reach.every((r) => r.reachable)).toBe(true);
  expect(info.reach.map((r) => r.name)).toEqual([
    'lair',
    'gate-hall',
    'landing',
    'crypt',
    'ossuary',
    'warden',
  ]);
  expect(info.spaces).toContain('cavern:lair');
  expect(info.spaces).toContain('hall:crypt');
  expect(info.spaces).toContain('hall:warden-hall');
  expect(info.portals).toEqual(['cave-mouth>gullhaven:cave']);
  expect(info.spawns).toBe(11);
  // Four goblins at the mouth and seven of the dead below, idle until the party comes.
  await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.monsters.length >= 11, null, {
    timeout: 120_000,
  });
  const states = await page.evaluate(() =>
    (window as unknown as W).ftb!.dev!.monsters.map((m) => m.state),
  );
  expect(states.filter((s) => s === 'idle').length).toBeGreaterThanOrEqual(10);
  // The warden's hall is the far end: a long walk from the mouth.
  expect(Math.hypot(info.warden!.x - info.lair!.x, info.warden!.z - info.lair!.z)).toBeGreaterThan(
    40,
  );
  await page.screenshot({ path: `test-results/old-halls-${test.info().project.name}.png` });
});

test('the tunnel back to the mouth is a portal that arms once the party has stepped clear', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto('dev/?dev&lite&level=old-halls&entry=cave-mouth&seed=5');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  const armed = () =>
    page.evaluate(() => (window as unknown as W).ftb!.dev!.portals.isArmed('cave-mouth'));
  // Arriving beside it does not fire it.
  await page.waitForTimeout(1500);
  expect(await armed()).toBe(false);
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.teleport(0, 0.2, 4, 0));
  await expect.poll(armed, { timeout: 10_000 }).toBe(true);
  // Walking back into the tunnel's end leaves for Gullhaven, arriving at the cave.
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.teleport(0, 0.2, -4.5, 180));
  await page.waitForURL(/level=gullhaven&entry=cave/, { timeout: 30_000 });
});
