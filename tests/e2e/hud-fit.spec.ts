import { expect, test } from '@playwright/test';

/**
 * MM6's frame inside the phone's safe areas (DESIGN.md 16.34; owner's phone, 2026-10-18: with the
 * notch's inset the fourth member's tubes sat under the book shelf). Desktop browsers report no
 * insets, so the iPhone 14 Pro Max's landscape ones, 59 pixels each side and 21 below, are
 * forced. The band lies between the side pillar and the middle one, each member's cell in it;
 * the panel between the middle pillar and the right one, every piece of it inside, the ovals
 * above the bottom inset.
 */
test('the band and the panel stand between their pillars inside the safe areas', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto('dev/?dev&lite&level=gullhaven&seed=11');
  await page.waitForFunction(
    () => (window as unknown as { ftb?: { dev?: { ready?: boolean } } }).ftb?.dev?.ready === true,
    null,
    { timeout: 150_000 },
  );
  await page.addStyleTag({
    content:
      ':root, html.forced-landscape { --sal: 59px !important; --sar: 59px !important; --sab: 21px !important; }',
  });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(500);
  const box = await page.evaluate(() => {
    const r = (el: Element | null): DOMRect => el!.getBoundingClientRect();
    const all = (s: string): DOMRect[] => Array.from(document.querySelectorAll(s), (e) => r(e));
    return {
      cells: all('.hud-cell').map((c) => ({ left: c.left, right: c.right })),
      tubesRight: Math.max(...all('.hud-tubes').map((t) => t.right)),
      band: r(document.querySelector('.hud')),
      left: r(document.querySelector('.view-pillar.left')),
      mid: r(document.querySelector('.view-pillar.mid')),
      right: r(document.querySelector('.view-pillar.right')),
      panel: r(document.querySelector('.panel')),
      pieces: all(
        '.panel-map, .panel-glass, .panel-clock, .panel-books, .panel-purse, .panel-ovals',
      ),
      ovals: all('.panel-oval'),
    };
  });
  expect(box.left.left).toBe(59);
  expect(box.right.right).toBe(932 - 59);
  expect(box.cells).toHaveLength(4);
  expect(box.band.left).toBeGreaterThanOrEqual(box.left.right);
  expect(box.band.right).toBeLessThanOrEqual(box.mid.left);
  expect(box.band.bottom).toBeLessThanOrEqual(430 - 21);
  for (const c of box.cells) {
    expect(c.left).toBeGreaterThanOrEqual(box.band.left);
    expect(c.right).toBeLessThanOrEqual(box.band.right);
  }
  expect(box.tubesRight).toBeLessThanOrEqual(box.band.right);
  expect(box.panel.left).toBeGreaterThanOrEqual(box.mid.right);
  expect(box.panel.right).toBeLessThanOrEqual(box.right.left);
  for (const p of box.pieces) {
    expect(p.left).toBeGreaterThanOrEqual(box.panel.left - 0.5);
    expect(p.right).toBeLessThanOrEqual(box.panel.right + 0.5);
    expect(p.bottom).toBeLessThanOrEqual(430 - 21);
  }
  expect(box.ovals).toHaveLength(4);
});

/**
 * The view inside the frame (owner's phone, 2026-10-18: the world showed outside the pillars,
 * over the safe areas): from each screen edge to its pillar, top to bottom, the marble covers
 * it, so hiding the view changes nothing there.
 */
test('the marble covers the safe areas outside the pillars', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('dev/?dev&lite&level=gullhaven&seed=11');
  await page.waitForFunction(
    () => (window as unknown as { ftb?: { dev?: { ready?: boolean } } }).ftb?.dev?.ready === true,
    null,
    { timeout: 150_000 },
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
      bandTop: innerHeight,
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
