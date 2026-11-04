import { expect, test } from '@playwright/test';

/**
 * Save slots (DESIGN 17.14): the game menu's Save Game lists ten slots on the slate and a tap
 * copies the game into one; Load Game lists the autosave and the written slots, and a tap
 * goes on from that copy, in its own level.
 */
type Dev = {
  ready: boolean;
  screens: { open(name: string): void; close(): void; current(): string | null };
  state: { gold: number };
};
type W = Window & { ftb?: { dev?: Dev } };

test('Save Game copies the game into a slot and Load Game goes on from it', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('dev/?dev&lite&level=gullhaven&seed=5');
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  const current = () => page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.current());
  const gold = () => page.evaluate(() => (window as unknown as W).ftb!.dev!.state.gold);
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.open('options'));
  await page.locator('.options-slab', { hasText: 'Save Game' }).click();
  // Software GL on CI draws a frame in seconds; the screens wait on the next one.
  await expect.poll(current, { timeout: 60_000 }).toBe('save');
  await expect(page.locator('.save-slot')).toHaveCount(10);
  await expect(page.locator('.save-slot').nth(1)).toContainText('Empty');
  await page.evaluate(() => {
    (window as unknown as W).ftb!.dev!.state.gold = 4321;
  });
  await page.locator('.save-slot').nth(1).click();
  await expect(page.locator('.save-slot').nth(1)).toContainText('Gullhaven');
  await expect(page.locator('.save-slot').nth(1)).toContainText('Alric');
  await page.screenshot({ path: `test-results/saves-${test.info().project.name}.png` });
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.close());
  // The game moves on; the slot does not.
  await page.evaluate(() => {
    (window as unknown as W).ftb!.dev!.state.gold = 5;
  });
  await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.open('options'));
  await page.locator('.options-slab', { hasText: 'Load Game' }).click();
  await expect.poll(current, { timeout: 60_000 }).toBe('load');
  // The autosave first, then the slots: slot 1 still empty, slot 2 written.
  await expect(page.locator('.save-slot').first()).toContainText('Autosave');
  await expect(page.locator('.save-slot').nth(1)).toContainText('Empty');
  await expect(page.locator('.save-slot').nth(2)).toContainText('Gullhaven');
  await page.locator('.save-slot').nth(2).click();
  await page.waitForURL(/continue/, { timeout: 30_000 });
  await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
    timeout: 150_000,
  });
  expect(await gold()).toBe(4321);
});
