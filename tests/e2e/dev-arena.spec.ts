import { expect, test, type CDPSession, type Page } from '@playwright/test';

/**
 * Drives the development build with real touch events through the Chrome DevTools
 * Protocol, since Playwright's touchscreen API only taps. Touch state lives in the CDP
 * session, so one session is shared across each test.
 */
type Point = { x: number; y: number };
type Dev = {
  ready: boolean;
  positionOf(): { x: number; y: number; z: number };
  yawDeg(): number;
  pitchDeg(): number;
  screenPointOf(name: string): Point | null;
  lastTap: string | null;
};
type W = Window & { ftb?: { dev?: Dev; setFilter(n: { mode: string }): void } };

let cdp: CDPSession;

async function touch(type: 'touchStart' | 'touchMove' | 'touchEnd', points: Point[]) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((p, id) => ({ ...p, id })),
  });
}

const position = (page: Page) =>
  page.evaluate(() => (window as unknown as W).ftb!.dev!.positionOf());

/** Poll the party position until `done` holds or the deadline passes (headless pacing varies). */
async function untilPosition(
  page: Page,
  done: (p: { x: number; y: number; z: number }) => boolean,
  maxMs = 15_000,
) {
  const start = Date.now();
  let p = await position(page);
  while (!done(p) && Date.now() - start < maxMs) {
    await page.waitForTimeout(200);
    p = await position(page);
  }
  return p;
}
const yaw = (page: Page) => page.evaluate(() => (window as unknown as W).ftb!.dev!.yawDeg());
const pitch = (page: Page) => page.evaluate(() => (window as unknown as W).ftb!.dev!.pitchDeg());

test.describe('dev build', () => {
  test.beforeEach(async ({ page, browserName }) => {
    if (browserName === 'chromium') cdp = await page.context().newCDPSession(page);
    await page.goto('dev/?dev');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 90_000,
    });
    // Let physics settle the capsule onto the floor.
    await page.waitForTimeout(500);
  });

  test('walks forward on a left-side drag up and stops on release', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    const before = await position(page);
    await touch('touchStart', [{ x: 200, y: 320 }]);
    await touch('touchMove', [{ x: 200, y: 180 }]);
    await page.waitForTimeout(800);
    await touch('touchEnd', []);
    const after = await position(page);
    expect(after.z - before.z).toBeGreaterThan(1.5);
    expect(Math.abs(after.x - before.x)).toBeLessThan(0.2); // no strafe, no drift
    await page.waitForTimeout(300);
    const later = await position(page);
    expect(Math.abs(later.z - after.z)).toBeLessThan(0.3);
  });

  test('walks backward at a third of the speed', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    const before = await position(page);
    await touch('touchStart', [{ x: 200, y: 200 }]);
    await touch('touchMove', [{ x: 200, y: 340 }]);
    await page.waitForTimeout(800);
    await touch('touchEnd', []);
    const after = await position(page);
    const moved = before.z - after.z;
    expect(moved).toBeGreaterThan(0.4);
    expect(moved).toBeLessThan(1.6);
  });

  test('strafes slowly on a sideways drag without moving forward', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    const before = await position(page);
    await touch('touchStart', [{ x: 200, y: 300 }]);
    await touch('touchMove', [{ x: 340, y: 300 }]);
    await page.waitForTimeout(800);
    await touch('touchEnd', []);
    const after = await position(page);
    const moved = after.x - before.x;
    expect(moved).toBeGreaterThan(1.0);
    expect(moved).toBeLessThan(3.0);
    expect(Math.abs(after.z - before.z)).toBeLessThan(0.2);
  });

  test('snaps back to level after a small look, keeps a large one', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    type Tunable = {
      ftb: {
        dev: { party: { setTuning(t: object): void; tuning: { levelSnapEnabled: boolean } } };
      };
    };
    // The snap is off by default; enable it for this test.
    const enabled = await page.evaluate(() => {
      const party = (window as unknown as Tunable).ftb.dev.party;
      party.setTuning({ levelSnapEnabled: true });
      return party.tuning.levelSnapEnabled;
    });
    expect(enabled).toBe(true);
    // Small: ~5° down at 0.18°/px, then release. Headless frames are slow, so allow time.
    await touch('touchStart', [{ x: 700, y: 200 }]);
    await touch('touchMove', [{ x: 700, y: 228 }]);
    await touch('touchEnd', []);
    await page.waitForTimeout(1500);
    expect(Math.abs(await pitch(page))).toBeLessThan(0.5);
    // Large: ~20° down, stays.
    await touch('touchStart', [{ x: 700, y: 200 }]);
    await touch('touchMove', [{ x: 700, y: 311 }]);
    await touch('touchEnd', []);
    await page.waitForTimeout(1500);
    expect(await pitch(page)).toBeGreaterThan(15);
  });

  test('free-looks while stationary and turns while walking', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    const yaw0 = await yaw(page);
    // 80 px down is ~14°, beyond the magnetic level snap, so the pitch stays.
    await touch('touchStart', [{ x: 700, y: 200 }]);
    await touch('touchMove', [{ x: 760, y: 280 }]);
    await touch('touchEnd', []);
    await page.waitForTimeout(100);
    const yaw1 = await yaw(page);
    const pitch1 = await pitch(page);
    expect(yaw1).toBeGreaterThan(yaw0 + 5);
    expect(pitch1).toBeGreaterThan(10); // dragged down: looks down

    // Walking: a right-side drag turns, and its vertical component is ignored.
    await touch('touchStart', [{ x: 200, y: 320 }]);
    await touch('touchMove', [{ x: 200, y: 180 }]);
    await page.waitForTimeout(100);
    await touch('touchStart', [
      { x: 200, y: 180 },
      { x: 700, y: 200 },
    ]);
    await touch('touchMove', [
      { x: 200, y: 180 },
      { x: 640, y: 300 },
    ]);
    await page.waitForTimeout(100);
    const yaw2 = await yaw(page);
    const pitch2 = await pitch(page);
    await touch('touchEnd', []);
    expect(yaw2).toBeLessThan(yaw1 - 5);
    expect(pitch2).toBeCloseTo(pitch1, 1);
  });

  test('steps up the 0.4 m curb and climbs the staircase', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    type Tele = { ftb: { dev: { teleport(x: number, y: number, z: number, yaw: number): void } } };
    // Curb: 0.4 m tall at z = -4, straight ahead of the spawn.
    await touch('touchStart', [{ x: 200, y: 320 }]);
    await touch('touchMove', [{ x: 200, y: 180 }]);
    let p = await untilPosition(page, (q) => q.z > -3.9 && q.y > 0.35);
    await touch('touchEnd', []);
    expect(p.z).toBeGreaterThan(-3.9);
    expect(p.y).toBeGreaterThan(0.35);

    // Staircase: 12 steps of 0.25 m from z = 4 at x = 8, up to a 3 m ledge.
    await page.evaluate(() => (window as unknown as Tele).ftb.dev.teleport(8, 0, 1, 0));
    await page.waitForTimeout(300);
    await touch('touchStart', [{ x: 200, y: 320 }]);
    await touch('touchMove', [{ x: 200, y: 180 }]);
    p = await untilPosition(page, (q) => q.y > 2.5);
    await touch('touchEnd', []);
    expect(p.y).toBeGreaterThan(2.5);
  });

  test('tap on a target registers through picking', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    const pt = await page.evaluate(() =>
      (window as unknown as W).ftb!.dev!.screenPointOf('dev-target-1'),
    );
    expect(pt).not.toBeNull();
    // Playwright's tap sends touch start and end back-to-back. A timed CDP sequence is
    // unreliable here because headless software rendering stalls event processing.
    await page.touchscreen.tap(pt!.x, pt!.y);
    await page.waitForTimeout(150);
    const tapped = await page.evaluate(() => (window as unknown as W).ftb!.dev!.lastTap);
    expect(tapped).toBe('dev-target-1');
  });

  test('renders the arena (not a black canvas) and captures the filter', async ({
    page,
    browserName,
  }) => {
    const shot = await page.screenshot({ path: `test-results/arena-palette-${browserName}.png` });
    // Mean brightness of the lower 80% of the frame; the empty clear colour scores ~8.
    const { default: sharp } = await import('sharp');
    const meta = await sharp(shot).metadata();
    const stats = await sharp(shot)
      .extract({
        left: 0,
        top: Math.round((meta.height ?? 0) * 0.2),
        width: meta.width ?? 1,
        height: Math.round((meta.height ?? 0) * 0.8),
      })
      .greyscale()
      .stats();
    expect(stats.channels[0]?.mean ?? 0).toBeGreaterThan(20);
    await page.screenshot({ path: 'test-results/arena-palette.png' });
    await page.evaluate(() => (window as unknown as W).ftb!.setFilter({ mode: 'posterize' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: 'test-results/arena-posterize.png' });
    await page.evaluate(() => (window as unknown as W).ftb!.setFilter({ mode: 'off' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: 'test-results/arena-off.png' });
    await page.evaluate(() => (window as unknown as W).ftb!.setFilter({ mode: 'palette' }));
  });
});
