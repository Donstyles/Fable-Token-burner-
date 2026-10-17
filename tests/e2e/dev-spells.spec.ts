import { expect, test } from '@playwright/test';

/**
 * Spells you can see (DESIGN.md 16.9): a Fire Bolt flies at the bandit ahead of the spawn and
 * wounds it; Torch Light brightens the torch.
 */
type Dev = {
  ready: boolean;
  cast(spell: string): string | null;
  spells: { flying: number };
  torch: { brightened: boolean };
  monsters: { hp: number; alive: boolean; def: { hp: number; id: string } }[];
  simTime(): number;
};
type W = Window & { ftb?: { dev?: Dev } };

test.describe('spells', () => {
  test('a fire bolt flies at the bandit and torch light brightens the torch', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('dev/?dev&lite&level=showcase&seed=3');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 120_000,
    });
    await page.waitForFunction(
      () => (window as unknown as W).ftb!.dev!.monsters.length >= 1,
      null,
      {
        timeout: 120_000,
      },
    );
    await page.waitForTimeout(1000);
    const before = await page.evaluate(() => (window as unknown as W).ftb!.dev!.monsters[0]!.hp);
    const line = await page.evaluate(() => (window as unknown as W).ftb!.dev!.cast('fire-bolt'));
    expect(line).toMatch(/casts Fire Bolt/);
    // The bolt is in the air, then lands on the bandit.
    await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.spells.flying >= 1, null, {
      timeout: 10_000,
    });
    await page.waitForFunction(
      (hp) => (window as unknown as W).ftb!.dev!.monsters[0]!.hp < (hp as number),
      before,
      { timeout: 60_000 },
    );
    expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.spells.flying)).toBe(0);

    expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.torch.brightened)).toBe(
      false,
    );
    const light = await page.evaluate(() => (window as unknown as W).ftb!.dev!.cast('torch-light'));
    expect(light).toMatch(/casts Torch Light/);
    expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.torch.brightened)).toBe(
      true,
    );
  });
});
