import { expect, test } from '@playwright/test';

/**
 * Talk (DESIGN.md 16.7): a tapped villager opens the wooden panel with their living face in
 * its window, the world waits, a topic takes a quest into the log, Farewell closes it.
 */
type Dev = {
  ready: boolean;
  npcs: {
    def: { id: string };
    position: { x: number; y: number; z: number };
    character: { node: { rotation: { y: number } } };
  }[];
  teleport(x: number, y: number, z: number, yaw: number): void;
  talkTo(id: string): boolean;
  dialogue: {
    isOpen(): boolean;
    current(): string | null;
    choose(id: string): boolean;
    text(): string;
  };
  bust: { showing: unknown; layer: { isEnabled: boolean } };
  screens: { open(name: string): void; close(): void };
  state: { quests: { entries: { id: string; state: string; step: number }[] } };
  simTime(): number;
};
type W = Window & { ftb?: { dev?: Dev } };

test.describe('talk', () => {
  test('a villager talks, gives a quest and the world waits', async ({ page }, info) => {
    // Software GL in CI renders at a frame a second; the villagers arrive with the monsters.
    test.setTimeout(420_000);
    await page.goto('dev/?dev&lite&level=valley&seed=5&hour=10');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 120_000,
    });
    await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.npcs.length >= 2, null, {
      timeout: 300_000,
    });
    // Stand before Old Henrik, facing him.
    await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      const npc = d.npcs.find((n) => n.def.id === 'villager-man')!;
      const p = npc.position;
      const yaw = npc.character.node.rotation.y;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      d.teleport(p.x + fx * 2.6, p.y + 0.2, p.z + fz * 2.6, (Math.atan2(-fx, -fz) * 180) / Math.PI);
    });
    await page.waitForTimeout(1500);
    if (info.project.name.startsWith('iphone')) {
      // The tap path: he stands at the centre of the view.
      await page.mouse.click(466, 215);
      await page.waitForFunction(() => (window as unknown as W).ftb!.dev!.dialogue.isOpen(), null, {
        timeout: 10_000,
      });
    } else {
      expect(
        await page.evaluate(() => (window as unknown as W).ftb!.dev!.talkTo('villager-man')),
      ).toBe(true);
    }
    expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.current())).toBe(
      'villager-man',
    );
    await expect(page.locator('.dlg')).toBeVisible();
    await expect(page.locator('.dlg-name')).toHaveText('Old Henrik');
    await expect(page.locator('.dlg-topic')).toHaveCount(4);
    expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.text())).toMatch(
      /farm gate/,
    );
    // The living face is on, and the world waits while he talks.
    expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.bust.layer.isEnabled)).toBe(
      true,
    );
    expect(
      await page.evaluate(() => (window as unknown as W).ftb!.dev!.bust.showing !== null),
    ).toBe(true);
    const t1 = await page.evaluate(() => (window as unknown as W).ftb!.dev!.simTime());
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.simTime())).toBe(t1);

    // The sheep: the quest is taken and logged with its first objective.
    await page.locator('.dlg-topic', { hasText: 'The sheep' }).click();
    expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.text())).toMatch(
      /hundred and fifty gold/,
    );
    const quests = await page.evaluate(
      () => (window as unknown as W).ftb!.dev!.state.quests.entries,
    );
    expect(quests).toEqual([{ id: 'henriks-sheep', state: 'active', step: 0, progress: 0 }]);

    await page.locator('.dlg-foot .ui-btn').click();
    await expect(page.locator('.dlg')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as W).ftb!.dev!.dialogue.isOpen())).toBe(
      false,
    );
    expect(
      await page.evaluate(() => (window as unknown as W).ftb!.dev!.bust.showing === null),
    ).toBe(true);
    await expect(page.locator('.ui-shelf')).toBeVisible();

    // The quest log shows it.
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.open('quests'));
    await expect(page.locator('.quest-objective')).toContainText('Drive three bandits');
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.close());
  });
});
