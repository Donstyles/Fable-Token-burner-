import { expect, test } from '@playwright/test';

/**
 * People and sites (DESIGN.md 17.20): the townsfolk talk and their quests run through the
 * world: a drink at the well, a walk to the stones, a letter carried to the glade, the words
 * on the obelisk read from a page.
 */
type Dev = {
  ready: boolean;
  npcs: { def: { id: string } }[];
  teleport(x: number, y: number, z: number, yaw: number): void;
  pointOf(name: string): { x: number; y: number; z: number } | null;
  talkTo(id: string): boolean;
  useSite(point: string): string | null;
  dialogue: {
    isOpen(): boolean;
    current(): string | null;
    choose(id: string): boolean;
    text(): string;
    close(): void;
  };
  screens: { current(): string | null; close(): void };
  state: {
    gold: number;
    party: { stats: { luck: number }; grid: { items: { item: { id: string } }[] } }[];
    quests: { entries: { id: string; state: string; step: number; progress: number }[] };
  };
};
type W = Window & { ftb?: { dev?: Dev } };

test('the townsfolk, their errands and the sites run through the world', async ({ page }) => {
  // Software GL in CI renders at a frame a second; the townsfolk arrive with the monsters.
  test.setTimeout(480_000);
  await page.goto('dev/?dev&lite&level=gullhaven&seed=5&hour=10');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.npcs.length >= 7, null, {
    timeout: 300_000,
  });
  const ids = await page.evaluate(() =>
    (window as unknown as W).ftb!.dev!.npcs.map((n) => n.def.id),
  );
  expect(ids).toEqual(
    expect.arrayContaining(['reeve', 'ida', 'fisher', 'anselm', 'woodcutter', 'villager-man']),
  );

  // Beside the well: the first drink raises the drinker's Luck, the second only refreshes.
  const standBy = async (point: string, dx = 0, dz = 3): Promise<void> => {
    await page.evaluate(
      ([name, ox, oz]) => {
        const d = (window as unknown as W).ftb!.dev!;
        const p = d.pointOf(name as string)!;
        d.teleport(p.x + (ox as number), p.y + 0.3, p.z + (oz as number), 0);
      },
      [point, dx, dz] as const,
    );
  };
  await standBy('well');
  const luck = await page.evaluate(
    () => (window as unknown as W).ftb!.dev!.state.party[0]!.stats.luck,
  );
  const drank = await page.evaluate(() => (window as unknown as W).ftb!.dev!.useSite('well'));
  expect(drank).toMatch(/cold and sweet/);
  expect(drank).toMatch(/Luck \+2/);
  expect(
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.state.party[0]!.stats.luck),
  ).toBe(luck + 2);
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.useSite('well'))).toMatch(
    /Refreshing/,
  );

  // Wen's quest is a walk: taken at the quay, done at the stones.
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.talkTo('fisher'))).toBe(true);
  await expect(page.locator('.dlg-name')).toHaveText('Wen');
  await expect(page.locator('.dlg-topic', { hasText: 'The fire at the stones' })).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.choose('stones')),
  ).toBe(true);
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.text())).toMatch(
    /forty gold/,
  );
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.close());
  const entry = (id: string) =>
    page.evaluate(
      (q) =>
        (window as unknown as W).ftb!.dev!.state.quests.entries.find((e) => e.id === q) ?? null,
      id,
    );
  expect(await entry('the-fire-at-the-stones')).toEqual({
    id: 'the-fire-at-the-stones',
    state: 'active',
    step: 0,
    progress: 0,
  });
  await standBy('stones', 0, 0);
  await expect
    .poll(async () => (await entry('the-fire-at-the-stones'))?.step, { timeout: 60_000 })
    .toBe(1);

  // The obelisk stands in the same glade: its words come up on a page, and a note is kept.
  await standBy('obelisk', 0, 2.5);
  const read = await page.evaluate(() => (window as unknown as W).ftb!.dev!.useSite('obelisk'));
  expect(read).toBe('Note added');
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.current())).toBe(
    'reading',
  );
  await expect(page.locator('.book-line')).toContainText('SEVEN STAND IN LINE');
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.close());

  // Ida's letter: taken with the quest, offered to Garrick alone, gone from the pack when given.
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.talkTo('ida'))).toBe(true);
  expect(
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.choose('letter')),
  ).toBe(true);
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.close());
  const carrying = () =>
    page.evaluate(() =>
      (window as unknown as W).ftb!.dev!.state.party.some((c) =>
        c.grid.items.some((p) => p.item.id === 'letter'),
      ),
    );
  expect(await carrying()).toBe(true);
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.talkTo('woodcutter'))).toBe(
    true,
  );
  await expect(page.locator('.dlg-topic').first()).toHaveText('A letter from Ida');
  await page.locator('.dlg-topic').first().click();
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.text())).toMatch(
    /come down to the square myself/,
  );
  // The letter's topic is gone with the letter; his own talk stays.
  await expect(page.locator('.dlg-topic').first()).toHaveText('The wood');
  expect(await carrying()).toBe(false);
  expect((await entry('a-letter-for-garrick'))?.step).toBe(1);
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.close());

  // The reeve has no brigands for a party that has not yet cleared the road.
  expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.talkTo('reeve'))).toBe(true);
  await expect(page.locator('.dlg-topic')).toHaveText(['The coast road', 'The town', 'Rumours']);
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.close());
});
