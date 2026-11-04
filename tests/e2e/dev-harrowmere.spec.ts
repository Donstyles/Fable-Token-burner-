import { expect, test } from '@playwright/test';

/**
 * Harrowmere, the second region (DESIGN.md 17.21): a 640 m map of its own with the market town
 * of Harrow, the downs, the cove and its smugglers' cave into the Thieves' Den, joined to
 * Gullhaven by a walked edge on the coast road that takes three days.
 */
type Dev = {
  ready: boolean;
  level: {
    sidecar: { outdoor?: boolean; trees?: unknown[]; props?: unknown[]; propNames?: string[] };
  };
  positionOf(): { x: number; y: number; z: number };
  pointOf(name: string): { x: number; y: number; z: number } | null;
  teleport(x: number, y: number, z: number, yaw: number): void;
  screenDoorOf(model: string): { x: number; y: number } | null;
  screens: { current(): string | null; close(): void };
  simTime(): number;
  monsters: { def: { id: string } }[];
  npcs: { def: { id: string } }[];
  portals: {
    portals: { name: string; days?: number; target: { level: string; entry: string } }[];
    isArmed(name: string): boolean;
  };
  state: { clock: { minutes: number } };
};
type W = Window & { ftb?: { dev?: Dev } };

test('Harrowmere loads with its town, its people, its packs and its two ways out', async ({
  page,
}) => {
  test.setTimeout(420_000);
  await page.goto('dev/?dev&lite&level=harrowmere&seed=5&hour=10');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  const info = await page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev!;
    return {
      outdoor: d.level.sidecar.outdoor,
      trees: d.level.sidecar.trees?.length ?? 0,
      houses: (d.level.sidecar.propNames ?? []).filter((n) => n.startsWith('harrow-')),
      square: d.pointOf('square'),
      grange: d.pointOf('grange'),
      camp: d.pointOf('nomad-camp'),
      barrows: d.pointOf('barrows'),
      cove: d.pointOf('cove'),
      barrow: d.pointOf('barrow'),
      east: d.pointOf('east-road'),
      portals: d.portals.portals.map(
        (p) => `${p.name}>${p.target.level}:${p.target.entry}${p.days ? `:${p.days}d` : ''}`,
      ),
    };
  });
  expect(info.outdoor).toBe(true);
  expect(info.trees).toBeGreaterThan(1000);
  expect(info.houses.sort()).toEqual([
    'harrow-armourer',
    'harrow-guild',
    'harrow-inn',
    'harrow-smithy',
    'harrow-store',
    'harrow-temple',
    'harrow-training',
  ]);
  for (const p of [
    info.square,
    info.grange,
    info.camp,
    info.barrows,
    info.cove,
    info.barrow,
    info.east,
  ]) {
    expect(p).not.toBeNull();
  }
  // The cove's cave leads into the den, the barrow's into the Barrow of Kings; the coast road
  // east is a three-day edge to Gullhaven.
  expect(info.portals.sort()).toEqual([
    'barrow>barrow-kings:barrow-mouth',
    'cove>thieves-den:cove-mouth',
    'east-road>gullhaven:west-road:3d',
  ]);
  // The people and the packs arrive with the models.
  await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.npcs.length >= 5, null, {
    timeout: 240_000,
  });
  const kinds = await page.evaluate(() => ({
    npcs: (window as unknown as W).ftb!.dev!.npcs.map((n) => n.def.id).sort(),
    monsters: (window as unknown as W).ftb!.dev!.monsters.map((m) => m.def.id),
  }));
  expect(kinds.npcs).toEqual(['alderman', 'drover', 'granger', 'herbwife', 'novice']);
  expect(kinds.monsters).toEqual(
    expect.arrayContaining(['nomad-chieftain', 'cutthroat', 'skeleton-knight']),
  );
  expect(kinds.monsters.length).toBeGreaterThanOrEqual(20);
  await page.screenshot({ path: `test-results/harrowmere-${test.info().project.name}.png` });
});

test('the coast road east is a walked edge: three days pass and the party arrives in Gullhaven', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.goto('dev/?dev&lite&level=harrowmere&seed=5&hour=10');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  const minutes = await page.evaluate(() => (window as unknown as W).ftb!.dev!.state.clock.minutes);
  // Stand twelve metres inside the rim on the road, then walk out over the edge.
  await page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev!;
    const p = d.pointOf('east-road')!;
    d.teleport(p.x - 12 * Math.sign(p.x), p.y + 0.3, p.z, 90);
  });
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as W).ftb!.dev!.portals.isArmed('east-road')),
      {
        timeout: 15_000,
      },
    )
    .toBe(true);
  await page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev!;
    const p = d.pointOf('east-road')!;
    d.teleport(p.x, p.y + 0.3, p.z, 90);
  });
  await page.waitForURL(/level=gullhaven.*entry=west-road/, { timeout: 40_000 });
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  const after = await page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev!;
    return { minutes: d.state.clock.minutes, at: d.positionOf(), west: d.pointOf('west-road') };
  });
  // Three days on the road, and the party stands a few strides inside Gullhaven's west edge.
  expect(after.minutes - minutes).toBeGreaterThanOrEqual(3 * 24 * 60);
  expect(Math.hypot(after.at.x - after.west!.x, after.at.z - after.west!.z)).toBeLessThan(12);
});
