import { expect, test } from '@playwright/test';

/**
 * The Mire, the third region (docs/CAMPAIGN.md step 8, DESIGN.md 17.25): Fenwick on its rise
 * by the mere, the causeways, the three caves and the pass south to Harrowmere.
 */
type Dev = {
  ready: boolean;
  level: {
    sidecar: { outdoor?: boolean; trees?: unknown[]; propNames?: string[] };
    water: unknown[];
  };
  pointOf(name: string): { x: number; y: number; z: number } | null;
  monsters: { def: { id: string } }[];
  npcs: { def: { id: string } }[];
  portals: {
    portals: { name: string; days?: number; target: { level: string; entry: string } }[];
  };
};
type W = Window & { ftb?: { dev?: Dev } };

test('the Mire loads with Fenwick, its people, its packs, its three caves and the pass', async ({
  page,
}) => {
  test.setTimeout(420_000);
  await page.goto('dev/?dev&lite&level=mire&seed=5&hour=10');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  const info = await page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev!;
    return {
      outdoor: d.level.sidecar.outdoor,
      trees: d.level.sidecar.trees?.length ?? 0,
      water: d.level.water.length,
      houses: (d.level.sidecar.propNames ?? []).filter((n) => n.startsWith('fen-')),
      points: [
        'square',
        'quay',
        'abbey-gate',
        'holt-foot',
        'mere-shore',
        'far-light',
        'pass-foot',
        'well',
        'shrine',
        'obelisk',
        'abbey',
        'holt',
        'sunken',
        'south-pass',
      ].map((n) => [n, d.pointOf(n) !== null]),
      portals: d.portals.portals.map(
        (p) => `${p.name}>${p.target.level}:${p.target.entry}${p.days ? `:${p.days}d` : ''}`,
      ),
    };
  });
  expect(info.outdoor).toBe(true);
  expect(info.trees).toBeGreaterThan(1000);
  expect(info.water).toBeGreaterThanOrEqual(1);
  expect(info.houses.sort()).toEqual([
    'fen-chandler',
    'fen-guild',
    'fen-hall',
    'fen-inn',
    'fen-smith',
    'fen-temple',
  ]);
  for (const [name, has] of info.points) expect(has, String(name)).toBe(true);
  expect(info.portals.sort()).toEqual([
    'abbey>drowned-abbey:abbey-mouth',
    'holt>reed-holt:holt-mouth',
    'south-pass>harrowmere:north-pass:2d',
    'sunken>sunken-hall:sunken-mouth',
  ]);
  await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.npcs.length >= 5, null, {
    timeout: 240_000,
  });
  const kinds = await page.evaluate(() => ({
    npcs: (window as unknown as W).ftb!.dev!.npcs.map((n) => n.def.id).sort(),
    monsters: (window as unknown as W).ftb!.dev!.monsters.map((m) => m.def.id),
  }));
  expect(kinds.npcs).toEqual(['brother', 'chandler', 'fen-reeve', 'ferryman', 'wisewoman']);
  expect(kinds.monsters).toEqual(
    expect.arrayContaining([
      'thug',
      'reaver',
      'reaver-archer',
      'hedge-witch',
      'drowned',
      'acolyte',
      'cultist',
      'bruiser',
    ]),
  );
  expect(kinds.monsters.length).toBeGreaterThanOrEqual(24);
  await page.screenshot({ path: `test-results/mire-${test.info().project.name}.png` });
});
