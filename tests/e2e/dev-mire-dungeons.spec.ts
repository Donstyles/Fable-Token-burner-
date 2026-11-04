import { expect, test } from '@playwright/test';

/**
 * The Mire's three dungeons (docs/CAMPAIGN.md steps 8 to 10, DESIGN.md 17.25): the Reavers'
 * Holt, the Drowned Abbey and the Sunken Hall each load from their cave with every point
 * reachable, their door, their key, their chests and their master.
 */
type Dev = {
  ready: boolean;
  level: {
    sidecar: { reachability: { name: string; reachable: boolean }[]; spawns: unknown[] };
    water: unknown[];
  };
  positionOf(): { x: number; y: number; z: number };
  portals: { portals: { name: string; target: { level: string; entry: string } }[] };
  monsters: { def: { id: string } }[];
  doors: { names(): string[] };
  groundItems: { names(): string[] };
  chests: { names(): string[] };
};
type W = Window & { ftb?: { dev?: Dev } };

const DUNGEONS = [
  {
    level: 'reed-holt',
    entry: 'holt-mouth',
    back: 'mire:holt',
    spawns: 10,
    door: 'post-door',
    key: 'store-key',
    chests: ['post-chest', 'store-chest'],
    master: 'reed-queen',
    water: 0,
  },
  {
    level: 'drowned-abbey',
    entry: 'abbey-mouth',
    back: 'mire:abbey',
    spawns: 11,
    door: 'stair-door',
    key: 'chapter-key',
    chests: ['abbot-chest', 'chapter-chest'],
    master: 'the-abbot',
    water: 0,
  },
  {
    level: 'sunken-hall',
    entry: 'sunken-mouth',
    back: 'mire:sunken',
    spawns: 10,
    door: 'warden-door',
    key: 'lord-key',
    chests: ['lord-chest', 'warden-chest'],
    master: 'the-drowned-warden',
    water: 1,
  },
];

for (const d of DUNGEONS) {
  test(`${d.level} loads from the Mire with its points reachable, its door, key, chests and master`, async ({
    page,
  }) => {
    test.setTimeout(420_000);
    await page.goto(`dev/?dev&lite&level=${d.level}&entry=${d.entry}&seed=5`);
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 150_000,
    });
    const info = await page.evaluate(() => {
      const w = (window as unknown as W).ftb!.dev!;
      return {
        spawn: w.positionOf(),
        reach: w.level.sidecar.reachability,
        spawns: w.level.sidecar.spawns.length,
        water: w.level.water.length,
        portals: w.portals.portals.map((p) => `${p.name}>${p.target.level}:${p.target.entry}`),
        doors: w.doors.names(),
        items: w.groundItems.names(),
        chests: w.chests.names(),
      };
    });
    expect(Math.hypot(info.spawn.x, info.spawn.z + 2)).toBeLessThan(1);
    expect(info.reach.length).toBeGreaterThanOrEqual(6);
    expect(info.reach.every((r) => r.reachable)).toBe(true);
    expect(info.spawns).toBe(d.spawns);
    expect(info.water).toBeGreaterThanOrEqual(d.water);
    expect(info.portals).toEqual([`${d.entry}>${d.back}`]);
    expect(info.doors).toEqual([d.door]);
    expect(info.items).toEqual([d.key]);
    expect(info.chests.sort()).toEqual(d.chests);
    await page.waitForFunction(
      (n) => (window as unknown as W).ftb!.dev!.monsters.length >= (n as number),
      d.spawns,
      { timeout: 120_000 },
    );
    const kinds = await page.evaluate(() =>
      (window as unknown as W).ftb!.dev!.monsters.map((m) => m.def.id),
    );
    expect(kinds).toContain(d.master);
    await page.screenshot({ path: `test-results/${d.level}-${test.info().project.name}.png` });
  });
}
