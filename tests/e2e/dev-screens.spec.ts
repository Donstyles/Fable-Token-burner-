import { expect, test } from '@playwright/test';

/** The Phase 5 screens (DESIGN 14.5, 16.34) in the dev build: the panel, the screens, creation. */
type Dev = {
  ready: boolean;
  simTime(): number;
  screens: { open(name: string): void; close(): void; current(): string | null };
  state: {
    party: { name: string; hp: number }[];
    gold: number;
    food: number;
    clock: { minutes: number };
  };
};
type W = Window & { ftb?: { dev?: Dev } };

const SCREENS = [
  'sheet',
  'skills',
  'items',
  'awards',
  'spells',
  'rest',
  'reference',
  'options',
  'quests',
  'notes',
  'map',
  'calendar',
];

test.describe('screens', () => {
  test('the panel opens every screen and an open screen pauses the world', async ({ page }) => {
    // Twelve screens over Gullhaven on software GL, each step waiting out a frame of seconds.
    test.setTimeout(600_000);
    await page.goto('dev/?dev&lite&level=gullhaven&seed=3');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 120_000,
    });
    const party = await page.evaluate(() => (window as unknown as W).ftb!.dev!.state);
    expect(party.party.map((m) => m.name)).toEqual(['Alric', 'Mira', 'Tobin', 'Sera']);
    expect(party.gold).toBe(200);
    expect(party.food).toBe(7);
    // MM6's panel (DESIGN.md 16.34): four books on the shelf and four ovals under the purse.
    await expect(page.locator('.panel-book')).toHaveCount(4);
    await expect(page.locator('.panel-oval')).toHaveCount(4);
    for (const name of SCREENS) {
      await page.evaluate((n) => (window as unknown as W).ftb!.dev!.screens.open(n), name);
      expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.current())).toBe(
        name,
      );
      await expect(page.locator('.ui-modal')).toBeVisible();
      if (name === 'sheet' || name === 'items' || name === 'spells') {
        await page.waitForTimeout(400);
        await page.screenshot({
          path: `test-results/screen-${name}-${test.info().project.name}.png`,
        });
      }
    }
    // Paused: simulated time stands still while a screen is open, and runs again after.
    const t0 = await page.evaluate(() => (window as unknown as W).ftb!.dev!.simTime());
    await page.waitForTimeout(600);
    const t1 = await page.evaluate(() => (window as unknown as W).ftb!.dev!.simTime());
    expect(t1).toBe(t0);
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.close());
    expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.current())).toBe(
      null,
    );
    // The world runs again: software WebKit repaints the band once before the next frame,
    // so the clock is polled rather than read after a fixed wait.
    await page.waitForFunction(
      (t) => (window as unknown as W).ftb!.dev!.simTime() > (t as number),
      t1,
      { timeout: 15_000 },
    );
    const t2 = await page.evaluate(() => (window as unknown as W).ftb!.dev!.simTime());
    expect(t2).toBeGreaterThan(t1);
  });

  test('the rest screen shows its vista at the hour, and a wait plays out', async ({ page }) => {
    // DESIGN.md 16.34: the owner's mountains under a live sky; a wait runs on the clock.
    test.setTimeout(300_000);
    await page.goto('dev/?dev&lite&level=gullhaven&seed=3');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 120_000,
    });
    const noon = 2 * 24 * 60 + 13 * 60;
    await page.evaluate((m) => {
      const dev = (window as unknown as W).ftb!.dev!;
      dev.state.clock.minutes = m;
      dev.screens.open('rest');
    }, noon);
    await expect(page.locator('.rest-time')).toHaveText('1:00 pm');
    // The vista drawn: the noon sky blue above the range, the land under it.
    await page.waitForFunction(
      () => {
        const c = document.querySelector<HTMLCanvasElement>('canvas.rest-vista');
        if (!c?.width) return false;
        const g = c.getContext('2d')!;
        const sky = g.getImageData(Math.floor(c.width / 4), 3, 1, 1).data;
        const land = g.getImageData(Math.floor(c.width / 2), c.height - 2, 1, 1).data;
        return sky[2]! > sky[0]! + 60 && land[0]! + land[1]! + land[2]! > 120;
      },
      null,
      { timeout: 60_000 },
    );
    await page.getByText('Wait 1 Hour', { exact: true }).click();
    // The hour plays on the box's clock, and has passed when it is done.
    await expect(page.locator('.rest-time')).toHaveText('2:00 pm', { timeout: 30_000 });
    expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.state.clock.minutes)).toBe(
      noon + 60,
    );
    await page.screenshot({
      path: `test-results/screen-rest-vista-${test.info().project.name}.png`,
    });
  });

  test('?create shows the creation screen before the world starts', async ({ page }) => {
    await page.goto('dev/?dev&lite&level=gullhaven&create');
    await expect(page.locator('.ui-title')).toHaveText('New Party', { timeout: 120_000 });
    await expect(page.locator('.cre-chip').first()).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/screen-creation-${test.info().project.name}.png` });
    expect(await page.evaluate(() => (window as unknown as W).ftb?.dev?.ready ?? false)).toBe(
      false,
    );
  });
});
