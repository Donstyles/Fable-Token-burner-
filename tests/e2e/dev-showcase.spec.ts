import { expect, test, type CDPSession, type Page } from '@playwright/test';

/**
 * Drives the development build (the compiled showcase level) with real touch events
 * through the Chrome DevTools Protocol, since Playwright's touchscreen API only taps.
 * Touch state lives in the CDP session, so one session is shared across each test.
 *
 * Showcase geometry (scene space, X mirrored from the level script): the party spawns
 * at (3, 0, -3) in the great hall facing +Z with 8 m of clear floor ahead and 3 m behind.
 */
type Point = { x: number; y: number };
type Dev = {
  ready: boolean;
  simTime(): number;
  debug(): { move: number; velocity: [number, number, number]; waterDepth: number };
  water: { currentQuality: string; clock: number; setQuality(q: string): void };
  level: {
    water: {
      y: number;
      mesh: {
        material: { getClassName(): string; bumpTexture?: { isReady(): boolean } | null } | null;
        position: { y: number };
        subMeshes: { materialDefines: Record<string, unknown> | null }[];
      };
    }[];
    waterfalls: unknown[];
  };
  positionOf(): { x: number; y: number; z: number };
  pointOf(name: string): { x: number; y: number; z: number } | null;
  teleport(x: number, y: number, z: number, yaw: number): void;
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

const simTime = (page: Page) => page.evaluate(() => (window as unknown as W).ftb!.dev!.simTime());

type Sample = { x: number; y: number; z: number; t: number };
/** Position and simulated time read in one call, so speeds can be computed exactly. */
const sample = (page: Page) =>
  page.evaluate(() => {
    const d = (window as unknown as W).ftb!.dev!;
    return { ...d.positionOf(), t: d.simTime() } as Sample;
  });

/**
 * Measure speed along `axis` over at least `seconds` of simulated time, starting from the
 * first sample that shows movement (touch delivery lags by a frame or two).
 */
async function measureSpeed(page: Page, axis: (s: Sample) => number, seconds: number) {
  const start = Date.now();
  const base = await sample(page);
  let s0 = base;
  while (Math.abs(axis(s0) - axis(base)) < 0.02 && Date.now() - start < 40_000) {
    await page.waitForTimeout(100);
    s0 = await sample(page);
  }
  let s1 = s0;
  while (s1.t - s0.t < seconds && Date.now() - start < 40_000) {
    await page.waitForTimeout(100);
    s1 = await sample(page);
  }
  return { speed: (axis(s1) - axis(s0)) / Math.max(1e-6, s1.t - s0.t), s0, s1 };
}

/** Wait until the movement request is gone and the party has come to rest. */
async function untilStopped(page: Page, maxMs = 20_000) {
  const start = Date.now();
  for (;;) {
    const d = await page.evaluate(() => (window as unknown as W).ftb!.dev!.debug());
    const h = Math.hypot(d.velocity[0], d.velocity[2]);
    if ((d.move === 0 && h < 0.05) || Date.now() - start > maxMs) return;
    await page.waitForTimeout(100);
  }
}

/** Wait until at least `seconds` of simulated time have passed (frame pacing varies). */
async function simWait(page: Page, seconds: number, maxMs = 40_000) {
  const t0 = await simTime(page);
  const start = Date.now();
  while ((await simTime(page)) - t0 < seconds && Date.now() - start < maxMs) {
    await page.waitForTimeout(100);
  }
  return (await simTime(page)) - t0;
}

/** Poll the party position until `done` holds or the deadline passes (headless pacing varies). */
async function untilPosition(
  page: Page,
  done: (p: { x: number; y: number; z: number }) => boolean,
  maxMs = 45_000,
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
    await page.goto('dev/?dev&lite');
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
    const p0 = await position(page);
    await touch('touchStart', [{ x: 200, y: 320 }]);
    await touch('touchMove', [{ x: 200, y: 180 }]);
    const { speed } = await measureSpeed(page, (s) => s.z, 1);
    await touch('touchEnd', []);
    expect(speed).toBeGreaterThan(4.0);
    expect(speed).toBeLessThan(5.0);
    await untilStopped(page);
    const p1 = await position(page);
    await simWait(page, 0.5);
    const p2 = await position(page);
    expect(p1.z).toBeGreaterThan(p0.z + 3);
    expect(Math.abs(p2.z - p1.z)).toBeLessThan(0.1);
  });

  test('walks backward at a third of the speed', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    await touch('touchStart', [{ x: 200, y: 200 }]);
    await touch('touchMove', [{ x: 200, y: 340 }]);
    const { speed } = await measureSpeed(page, (s) => s.z, 0.8);
    await touch('touchEnd', []);
    expect(speed).toBeLessThan(-1.2);
    expect(speed).toBeGreaterThan(-1.8);
  });

  test('strafes slowly on a sideways drag without moving forward', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    await touch('touchStart', [{ x: 200, y: 260 }]);
    await touch('touchMove', [{ x: 330, y: 260 }]);
    const { speed, s0, s1 } = await measureSpeed(page, (s) => s.x, 0.8);
    await touch('touchEnd', []);
    expect(speed).toBeGreaterThan(2.5);
    expect(speed).toBeLessThan(3.5);
    expect(Math.abs(s1.z - s0.z)).toBeLessThan(0.3);
  });

  test('snaps back to level after a small look, keeps a large one', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    type Tune = { ftb: { dev: { party: { setTuning(t: object): void } } } };
    await page.evaluate(() =>
      (window as unknown as Tune).ftb.dev.party.setTuning({ levelSnapEnabled: true }),
    );
    // Small look down (about 4°), then release: snaps back to 0.
    await touch('touchStart', [{ x: 700, y: 200 }]);
    await touch('touchMove', [{ x: 700, y: 222 }]);
    await page.waitForTimeout(100);
    const mid = await pitch(page);
    expect(Math.abs(mid)).toBeGreaterThan(2);
    await touch('touchEnd', []);
    await simWait(page, 1.5);
    expect(Math.abs(await pitch(page))).toBeLessThan(0.5);
    // Large look up (about 25°): stays.
    await touch('touchStart', [{ x: 700, y: 300 }]);
    await touch('touchMove', [{ x: 700, y: 160 }]);
    await page.waitForTimeout(100);
    await touch('touchEnd', []);
    await simWait(page, 1.5);
    expect(await pitch(page)).toBeLessThan(-15);
  });

  test('free-looks while stationary and turns while walking', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    const yaw0 = await yaw(page);
    // Stationary drag right on the right half: yaw increases.
    await touch('touchStart', [{ x: 700, y: 250 }]);
    await touch('touchMove', [{ x: 800, y: 250 }]);
    await page.waitForTimeout(100);
    const yaw1 = await yaw(page);
    await touch('touchEnd', []);
    expect(yaw1).toBeGreaterThan(yaw0 + 5);
    const pitch1 = await pitch(page);
    // Walking with the left thumb, drag left with the right: yaw decreases, pitch untouched.
    await touch('touchStart', [{ x: 200, y: 300 }]);
    await touch('touchMove', [{ x: 200, y: 200 }]);
    await page.waitForTimeout(200);
    await touch('touchStart', [
      { x: 200, y: 200 },
      { x: 760, y: 300 },
    ]);
    await touch('touchMove', [
      { x: 200, y: 200 },
      { x: 640, y: 300 },
    ]);
    await page.waitForTimeout(100);
    const yaw2 = await yaw(page);
    const pitch2 = await pitch(page);
    await touch('touchEnd', []);
    expect(yaw2).toBeLessThan(yaw1 - 5);
    expect(pitch2).toBeCloseTo(pitch1, 1);
  });

  test('climbs the switchback stair from the undercroft to the landing', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    // The second flight rises from the undercroft's south door (x = -5.4, z = -7.2) toward
    // -Z up to the landing at y = -4.5. Start just inside the undercroft facing south.
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.teleport(-5.4, -9, -5.0, 180));
    await page.waitForTimeout(400);
    await touch('touchStart', [{ x: 200, y: 320 }]);
    await touch('touchMove', [{ x: 200, y: 180 }]);
    const p = await untilPosition(page, (q) => q.y > -4.8);
    await touch('touchEnd', []);
    expect(p.y).toBeGreaterThan(-4.8);
    expect(p.z).toBeLessThan(-12);
  });

  test('wades at half speed through the undercroft pool', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    // The undercroft floor is at y = -9 under 0.4 m of water: shallow wading. Start on the
    // centre line, between the two rows of columns, with 10 m of clear water ahead.
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.teleport(0, -9, -4.5, 0));
    await page.waitForTimeout(400);
    const depth = await page.evaluate(() => (window as unknown as W).ftb!.dev!.debug().waterDepth);
    expect(depth).toBeGreaterThan(0.3);
    expect(depth).toBeLessThan(0.5);
    await touch('touchStart', [{ x: 200, y: 320 }]);
    await touch('touchMove', [{ x: 200, y: 180 }]);
    const { speed } = await measureSpeed(page, (s) => s.z, 1);
    await touch('touchEnd', []);
    expect(speed).toBeGreaterThan(1.8);
    expect(speed).toBeLessThan(2.7);
  });

  test('water bodies and the waterfall are live', async ({ page }) => {
    const info = await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      return {
        quality: d.water.currentQuality,
        bodies: d.level.water.map((w) => w.mesh.material?.getClassName() ?? null),
        // Babylon mirrors and clips at the mesh's own height, so it must sit at the water level.
        levelOffsets: d.level.water.map((w) => Math.abs(w.mesh.position.y - w.y)),
        falls: d.level.waterfalls.length,
      };
    });
    expect(info.quality).toBe('quarter');
    expect(info.bodies.length).toBe(3);
    for (const cls of info.bodies) expect(cls).toBe('WaterMaterial');
    for (const off of info.levelOffsets) expect(off).toBeLessThan(1e-6);
    expect(info.falls).toBe(1);
    // The surfaces animate on our simulated clock (not Babylon's delta-equality guard),
    // which lags wall time on slow renderers because each frame is capped at 50 ms.
    const clocks = (): Promise<{ water: number; sim: number }> =>
      page.evaluate(() => {
        const d = (window as unknown as W).ftb!.dev!;
        return { water: d.water.clock, sim: d.simTime() };
      });
    const before = await clocks();
    await page.waitForTimeout(500);
    const after = await clocks();
    expect(after.water - before.water).toBeGreaterThan(0.04);
    expect(after.water - before.water).toBeCloseTo(after.sim - before.sim, 3);
    // Changing the passes rebuilds the materials; the shared ripple map must survive that
    // (Babylon's water material disposes its bump texture with itself).
    const rippleAlive = await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      d.water.setQuality('half');
      d.water.setQuality('quarter');
      return d.level.water.map((w) => w.mesh.material?.bumpTexture?.isReady() ?? false);
    });
    for (const alive of rippleAlive) expect(alive).toBe(true);
    // The shader perturbs the reflection per pixel only with NORMAL on (needs a light).
    // Defines exist only for a body that has been drawn, so look at the pool first.
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.teleport(0, -9, -4.5, 0));
    await page.waitForFunction(
      () =>
        (window as unknown as W).ftb!.dev!.level.water.some(
          (w) => w.mesh.subMeshes[0]?.materialDefines != null,
        ),
      null,
      { timeout: 30_000 },
    );
    const normals = await page.evaluate(() =>
      (window as unknown as W)
        .ftb!.dev!.level.water.map((w) => w.mesh.subMeshes[0]?.materialDefines?.['NORMAL'])
        .filter((n) => n !== undefined),
    );
    expect(normals.length).toBeGreaterThan(0);
    for (const n of normals) expect(n).toBe(true);
  });

  test('tap on the level registers through picking', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    // Playwright's tap sends touch start and end back-to-back. A timed CDP sequence is
    // unreliable here because headless software rendering stalls event processing.
    await page.touchscreen.tap(466, 215);
    await page.waitForTimeout(150);
    const tapped = await page.evaluate(() => (window as unknown as W).ftb!.dev!.lastTap);
    expect(tapped).not.toBeNull();
    expect(tapped!.startsWith('chunk:')).toBe(true);
  });

  test('renders the showcase (not a black canvas) and captures the filter', async ({
    page,
    browserName,
  }) => {
    // Full look for the capture (the shared setup loads the lite variant).
    await page.goto('dev/?dev');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 90_000,
    });
    await page.waitForTimeout(500);
    const shot = await page.screenshot({
      path: `test-results/showcase-palette-${browserName}.png`,
    });
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
    expect(stats.channels[0]?.mean ?? 0).toBeGreaterThan(14);
    await page.screenshot({ path: 'test-results/showcase-palette.png' });
    await page.evaluate(() => (window as unknown as W).ftb!.setFilter({ mode: 'posterize' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: 'test-results/showcase-posterize.png' });
    await page.evaluate(() => (window as unknown as W).ftb!.setFilter({ mode: 'off' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: 'test-results/showcase-off.png' });
    await page.evaluate(() => (window as unknown as W).ftb!.setFilter({ mode: 'palette' }));
  });
});
