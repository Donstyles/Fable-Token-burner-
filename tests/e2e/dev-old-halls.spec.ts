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
  doors: {
    names(): string[];
    isOpen(name: string): boolean;
    tap(name: string, d: number): { kind: string; message: string };
  };
  groundItems: {
    names(): string[];
    take(name: string, d: number): { kind: string; message: string };
  };
  state: {
    gold: number;
    maps: Record<
      string,
      {
        doors: string[];
        taken: string[];
        chests: Record<string, { gold: number; grid: { items: { item: { id: string } }[] } }>;
      }
    >;
    party: { grid: { items: { item: { id: string } }[] } }[];
  };
  save(): boolean;
  chests: { names(): string[]; isOpen(name: string): boolean };
  openChest(name: string): string | null;
  screens: { current(): string | null; close(): void };
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
    'gate-chest',
    'landing',
    'crypt',
    'ossuary',
    'warden',
    'warden-chest',
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

test("the warden's door is locked until the iron key is taken off the ossuary floor, and stays open", async ({
  page,
}) => {
  // DESIGN 17.11: doors and things on the floor, kept per map in the save.
  test.setTimeout(240_000);
  await page.goto('dev/?dev&lite&level=old-halls&entry=cave-mouth&seed=5');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.doors.names())).toEqual([
    'warden-door',
  ]);
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.groundItems.names())).toEqual(
    ['ossuary-key'],
  );
  // Too far, then locked.
  expect(
    (await page.evaluate(() => (window as unknown as W).ftb!.dev!.doors.tap('warden-door', 9)))
      .kind,
  ).toBe('far');
  expect(
    (await page.evaluate(() => (window as unknown as W).ftb!.dev!.doors.tap('warden-door', 3)))
      .kind,
  ).toBe('locked');
  expect(
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.doors.isOpen('warden-door')),
  ).toBe(false);
  // The key into a pack, then the door opens and the map remembers both.
  const took = await page.evaluate(() =>
    (window as unknown as W).ftb!.dev!.groundItems.take('ossuary-key', 2),
  );
  expect(took.kind).toBe('taken');
  expect(
    await page.evaluate(() =>
      (window as unknown as W).ftb!.dev!.state.party.some((c) =>
        c.grid.items.some((p) => p.item.id === 'iron-key'),
      ),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.groundItems.names())).toEqual(
    [],
  );
  expect(
    (await page.evaluate(() => (window as unknown as W).ftb!.dev!.doors.tap('warden-door', 3)))
      .kind,
  ).toBe('opened');
  await expect
    .poll(() => page.evaluate(() => (window as unknown as W).ftb!.dev!.doors.isOpen('warden-door')))
    .toBe(true);
  expect(
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.state.maps['old-halls']),
  ).toEqual({
    doors: ['warden-door'],
    taken: ['ossuary-key'],
    chests: {},
  });
  // Saved and continued: the door stands open and the key is gone from the floor.
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.save())).toBe(true);
  await page.goto('dev/?dev&lite&level=old-halls&seed=5&continue');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  expect(
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.doors.isOpen('warden-door')),
  ).toBe(true);
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.groundItems.names())).toEqual(
    [],
  );
  // An open door closes again at a tap, from outside the doorway.
  expect(
    (await page.evaluate(() => (window as unknown as W).ftb!.dev!.doors.tap('warden-door', 3)))
      .kind,
  ).toBe('closed');
});

test("the gate hall's chest opens to its window, its things go into a pack, and it is kept as left", async ({
  page,
}) => {
  // DESIGN 17.12: a chest rolled on first opening, its window on the leather, its state per map.
  test.setTimeout(240_000);
  await page.goto('dev/?dev&lite&level=old-halls&entry=cave-mouth&seed=5');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.chests.names())).toEqual([
    'gate-chest',
    'warden-chest',
  ]);
  expect(
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.openChest('gate-chest')),
  ).toBeNull();
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.current())).toBe(
    'chest',
  );
  await expect(page.locator('.house-pack .inv-grid')).toBeVisible();
  const before = await page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev!;
    const chest = d.state.maps['old-halls']!.chests['gate-chest']!;
    return {
      gold: chest.gold,
      items: chest.grid.items.length,
      partyItems: d.state.party.reduce((n, c) => n + c.grid.items.length, 0),
      partyGold: d.state.gold,
    };
  });
  // Seed 5 rolls this chest the same way every time: gold and two weapons.
  expect(before.items).toBeGreaterThan(0);
  expect(before.gold).toBeGreaterThan(0);
  await page.locator('.house-pack .inv-item').first().click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as W).ftb!.dev!.state.party.reduce((n, c) => n + c.grid.items.length, 0),
      ),
    )
    .toBe(before.partyItems + 1);
  await page.locator('.house-choice', { hasText: 'gold' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as W).ftb!.dev!.state.gold))
    .toBe(before.partyGold + before.gold);
  const left = await page.evaluate(() => {
    const chest = (window as unknown as W).ftb!.dev!.state.maps['old-halls']!.chests['gate-chest']!;
    return { gold: chest.gold, items: chest.grid.items.length };
  });
  expect(left).toEqual({ gold: 0, items: before.items - 1 });
  // The window closes, the lid comes down, and a Continue finds the chest as it was left.
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.close());
  await expect
    .poll(() => page.evaluate(() => (window as unknown as W).ftb!.dev!.chests.isOpen('gate-chest')))
    .toBe(false);
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.save())).toBe(true);
  await page.goto('dev/?dev&lite&level=old-halls&seed=5&continue');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  const after = await page.evaluate(() => {
    const chest = (window as unknown as W).ftb!.dev!.state.maps['old-halls']!.chests['gate-chest']!;
    return { gold: chest.gold, items: chest.grid.items.length };
  });
  expect(after).toEqual(left);
});

test('the shaman casts across the lair, a scout runs when hurt, and the gems warn of both', async ({
  page,
}) => {
  // DESIGN 17.16: missiles, fleeing and the enemy detector.
  test.setTimeout(300_000);
  await page.goto('dev/?dev&lite&level=old-halls&entry=cave-mouth&seed=5');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.monsters.length >= 11, null, {
    timeout: 120_000,
  });
  type D = Dev & {
    shots: number;
    monsters: {
      name: string;
      state: string;
      hp: number;
      takeDamage(n: number): void;
      position: { x: number; z: number };
    }[];
  };
  const kinds = await page.evaluate(() =>
    (window as unknown as W).ftb!.dev!.level.sidecar.spawns.map(
      (s) => (s as { kind: string }).kind,
    ),
  );
  expect(kinds).toContain('goblin-shaman');
  expect(kinds).toContain('skeleton-knight');
  expect(kinds.filter((k) => k === 'skeleton-warrior')).toHaveLength(5);
  // The goblins' lair is fifteen metres on: the gems are already yellow at the tunnel's end.
  await expect(page.locator('.hud-gem.weak').first()).toBeVisible();
  await expect(page.locator('.hud-gem.good')).toHaveCount(0);
  // Nine metres west of the shaman, in his sight and out of his reach: he stops and casts.
  await page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev! as D;
    const s = d.monsters.find((m) => m.name === 'goblin-shaman')!;
    for (const m of d.monsters) if (m !== s && m.name.startsWith('goblin')) m.takeDamage(1e6);
    d.teleport(s.position.x - 9, 0.2, s.position.z, 90);
  });
  await page.waitForFunction(() => ((window as unknown as W).ftb!.dev! as D).shots > 0, null, {
    timeout: 120_000,
    polling: 250,
  });
  const shaman = await page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev! as D;
    const s = d.monsters.find((m) => m.name === 'goblin-shaman')!;
    const p = d.positionOf();
    return { state: s.state, distance: Math.hypot(s.position.x - p.x, s.position.z - p.z) };
  });
  expect(shaman.state).toBe('attack');
  expect(shaman.distance).toBeGreaterThan(3);
  // With a monster this near the gems are red, or dark while a member recovers, never green.
  await expect(page.locator('.hud-gem.good')).toHaveCount(0);
  await expect(page.locator('.hud-gem.weak')).toHaveCount(0);
  // Hurt to two hit points the wimp runs, and keeps running while the party is near.
  await page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev! as D;
    const s = d.monsters.find((m) => m.name === 'goblin-shaman')!;
    s.takeDamage(s.hp - 2);
  });
  await page.waitForFunction(
    () =>
      ((window as unknown as W).ftb!.dev! as D).monsters.find((m) => m.name === 'goblin-shaman')!
        .state === 'flee',
    null,
    { timeout: 60_000, polling: 250 },
  );
});
