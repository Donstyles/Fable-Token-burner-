import { expect, test } from '@playwright/test';

/**
 * Spells you can see (DESIGN.md 16.9): a Fire Bolt flies at the bandit the party faces at the
 * camp on Gullhaven's coast road and wounds it; Torch Light brightens the torch.
 */
type Vec = { x: number; y: number; z: number };
type Dev = {
  ready: boolean;
  cast(spell: string): string | null;
  spells: { flying: number };
  torch: { brightened: boolean };
  monsters: {
    name: string;
    hp: number;
    alive: boolean;
    position: Vec;
    def: { id: string };
    takeDamage(n: number): string;
  }[];
  teleport(x: number, y: number, z: number, yawDeg: number): void;
};
type W = Window & { ftb?: { dev?: Dev } };

test.describe('spells', () => {
  test('a fire bolt flies at the bandit and torch light brightens the torch', async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto('dev/?dev&lite&level=gullhaven&seed=3');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 150_000,
    });
    await page.waitForFunction(
      () => (window as unknown as W).ftb!.dev!.monsters.some((m) => m.name === 'bandit'),
      null,
      { timeout: 150_000 },
    );
    // Six metres from the camp's first bandit, facing him; his fellows are already dead, so
    // the bolt has only him to fly at.
    await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      const b = d.monsters.find((m) => m.name === 'bandit')!;
      for (const m of d.monsters) {
        if (m !== b && Math.hypot(m.position.x - b.position.x, m.position.z - b.position.z) < 40)
          m.takeDamage(1e6);
      }
      d.teleport(b.position.x, b.position.y + 0.5, b.position.z - 6, 0);
    });
    await page.waitForTimeout(1000);
    const hp = () =>
      page.evaluate(
        () => (window as unknown as W).ftb!.dev!.monsters.find((m) => m.name === 'bandit')!.hp,
      );
    const before = await hp();
    const line = await page.evaluate(() => (window as unknown as W).ftb!.dev!.cast('fire-bolt'));
    expect(line).toMatch(/casts Fire Bolt/);
    // The bolt is in the air, then lands on the bandit.
    await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.spells.flying >= 1, null, {
      timeout: 10_000,
    });
    await page.waitForFunction(
      (was) =>
        (window as unknown as W).ftb!.dev!.monsters.find((m) => m.name === 'bandit')!.hp <
        (was as number),
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
