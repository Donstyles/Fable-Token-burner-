import { expect, test } from '@playwright/test';

/**
 * The band inside the phone's safe areas (owner's phone, 2026-10-18: with the notch's inset
 * the fourth member's tubes sat under the book shelf). Desktop browsers report no insets, so
 * the iPhone 14 Pro Max's landscape ones, 59 pixels each side and 21 below, are forced.
 */
test('every member cell clears the shelf and the clock inside the safe areas', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('dev/?dev&lite&level=showcase&seed=11');
  await page.waitForFunction(
    () => (window as unknown as { ftb?: { dev?: { ready?: boolean } } }).ftb?.dev?.ready === true,
    null,
    { timeout: 90_000 },
  );
  await page.addStyleTag({
    content:
      ':root, html.forced-landscape { --sal: 59px !important; --sar: 59px !important; --sab: 21px !important; }',
  });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(500);
  const box = await page.evaluate(() => {
    const r = (el: Element | null): DOMRect => el!.getBoundingClientRect();
    const cells = Array.from(document.querySelectorAll('.hud-cell'), (c) => r(c));
    const tubes = Array.from(document.querySelectorAll('.hud-tubes'), (c) => r(c));
    return {
      cells: cells.map((c) => ({ left: c.left, right: c.right })),
      tubesRight: Math.max(...tubes.map((t) => t.right)),
      shelfLeft: r(document.querySelector('.ui-shelf')).left,
      clockRight: r(document.querySelector('.hud-clock')).right,
    };
  });
  expect(box.cells).toHaveLength(4);
  expect(box.cells[0]!.left).toBeGreaterThanOrEqual(box.clockRight);
  expect(box.cells.at(-1)!.right).toBeLessThanOrEqual(box.shelfLeft);
  expect(box.tubesRight).toBeLessThanOrEqual(box.shelfLeft);
});

/**
 * The view inside the frame (owner's phone, 2026-10-18: the world showed outside the pillars,
 * over the safe areas): from each screen edge to its pillar, top to band, the marble covers
 * it, so hiding the view changes nothing there.
 */
test('the marble covers the safe areas outside the pillars', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('dev/?dev&lite&level=showcase&seed=11');
  await page.waitForFunction(
    () => (window as unknown as { ftb?: { dev?: { ready?: boolean } } }).ftb?.dev?.ready === true,
    null,
    { timeout: 90_000 },
  );
  await page.addStyleTag({
    content:
      ':root, html.forced-landscape { --sal: 59px !important; --sar: 59px !important; --sab: 21px !important; }',
  });
  await page.waitForTimeout(500);
  const frame = await page.evaluate(() => {
    const r = (s: string): DOMRect => document.querySelector(s)!.getBoundingClientRect();
    return {
      left: r('.view-pillar.left').left,
      right: r('.view-pillar.right').right,
      bandTop: r('.hud').top,
      width: innerWidth,
    };
  });
  expect([frame.left, frame.width - frame.right]).toEqual([59, 59]);
  const strips = [
    { x: 0, y: 0, width: frame.left, height: frame.bandTop },
    { x: frame.right, y: 0, width: frame.width - frame.right, height: frame.bandTop },
  ];
  const shoot = (): Promise<Buffer[]> =>
    Promise.all(strips.map((clip) => page.screenshot({ clip, animations: 'disabled' })));
  const shown = await shoot();
  await page.addStyleTag({ content: 'canvas { visibility: hidden !important; }' });
  await page.waitForTimeout(200);
  const hidden = await shoot();
  for (let i = 0; i < strips.length; i++) expect(hidden[i]!.equals(shown[i]!)).toBe(true);
});
