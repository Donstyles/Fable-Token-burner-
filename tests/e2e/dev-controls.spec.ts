import { expect, test, type CDPSession, type Page } from '@playwright/test';

/**
 * Drives the development build in Gullhaven with real touch events through the Chrome
 * DevTools Protocol, since Playwright's touchscreen API only taps. Touch state lives in the
 * CDP session, so one session is shared across each test.
 *
 * The party stands where it wakes, on the flat lane at the foot of the square, turned to face
 * due north (+Z) up the lane, fifteen metres clear every way.
 */
type Point = { x: number; y: number };
type Dev = {
  ready: boolean;
  simTime(): number;
  feedback: { frozen: boolean; flash: number };
  debug(): { move: number; velocity: [number, number, number] };
  positionOf(): { x: number; y: number; z: number };
  teleport(x: number, y: number, z: number, yaw: number): void;
  yawDeg(): number;
  pitchDeg(): number;
  screenPointOf(name: string): Point | null;
  lastTap: string | null;
  monsters: {
    name: string;
    state: string;
    hp: number;
    position: { x: number; y: number; z: number };
    character: { clip: string | null; clips: string[] };
    takeDamage(n: number): string;
  }[];
  roster: { members: { hp: number }[]; selected: number };
  attack(name: string): string | null;
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

const yaw = (page: Page) => page.evaluate(() => (window as unknown as W).ftb!.dev!.yawDeg());
const pitch = (page: Page) => page.evaluate(() => (window as unknown as W).ftb!.dev!.pitchDeg());

test.describe('dev build', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // A region's load on software GL takes most of a minute.
    test.setTimeout(240_000);
    if (browserName === 'chromium') cdp = await page.context().newCDPSession(page);
    await page.goto('dev/?dev&lite&level=gullhaven');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 150_000,
    });
    // Due north where the party wakes; let physics settle the capsule onto the lane.
    await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      const p = d.positionOf();
      d.teleport(p.x, p.y + 0.2, p.z, 0);
    });
    await page.waitForTimeout(800);
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

  test('a bandit at the camp closes in, swings at the party, and falls to taps', async ({
    page,
  }) => {
    test.setTimeout(360_000);
    await page.goto('dev/?dev&lite&level=gullhaven&seed=11');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 150_000,
    });
    await page.waitForFunction(
      () => (window as unknown as W).ftb!.dev!.monsters.some((m) => m.name === 'bandit'),
      null,
      { timeout: 150_000 },
    );
    const bandit = () =>
      page.evaluate(() => {
        const m = (window as unknown as W).ftb!.dev!.monsters.find((b) => b.name === 'bandit')!;
        return { state: m.state, hp: m.hp, clip: m.character.clip, position: m.position };
      });
    const clips = await page.evaluate(
      () =>
        (window as unknown as W).ftb!.dev!.monsters.find((m) => m.name === 'bandit')!.character
          .clips,
    );
    expect(clips).toEqual([
      'idle',
      'walk',
      'run',
      'attack_1',
      'attack_2',
      'hit',
      'death',
      'cast',
      'talk',
      'block',
    ]);
    // Six metres south of the camp's first bandit, inside his aggro range; his fellows are
    // struck dead first, so he comes alone. He comes at the party and stops in reach.
    await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      const b = d.monsters.find((m) => m.name === 'bandit')!;
      for (const m of d.monsters) {
        if (m !== b && Math.hypot(m.position.x - b.position.x, m.position.z - b.position.z) < 40)
          m.takeDamage(1e6);
      }
      d.teleport(b.position.x, b.position.y + 0.5, b.position.z - 6, 0);
    });
    await page.waitForFunction(
      () =>
        (window as unknown as W).ftb!.dev!.monsters.find((m) => m.name === 'bandit')!.state ===
        'attack',
      null,
      { timeout: 90_000 },
    );
    const dist = await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      const m = d.monsters.find((b) => b.name === 'bandit')!;
      const p = d.positionOf();
      return Math.hypot(m.position.x - p.x, m.position.z - p.z);
    });
    expect(dist).toBeLessThan(2.6);
    // He swings: an attack clip plays.
    await page.waitForFunction(
      () =>
        /^attack_/.test(
          (window as unknown as W).ftb!.dev!.monsters.find((m) => m.name === 'bandit')!.character
            .clip ?? '',
        ),
      null,
      { timeout: 60_000 },
    );
    // Taps attack with the ready member; the others wait out their recovery. He falls.
    const log: string[] = [];
    let punchy = 0;
    for (let i = 0; i < 400; i++) {
      // A landed blow freezes the game and flashes the bandit in the same frame (14.4).
      const r = await page.evaluate(() => {
        const d = (window as unknown as W).ftb!.dev!;
        const line = d.attack('bandit');
        return { line, frozen: d.feedback.frozen, flash: d.feedback.flash };
      });
      const line = r.line;
      if (line && /hits Bandit/.test(line) && r.frozen && r.flash === 1) punchy++;
      if (line && line !== 'nobody is ready') log.push(line);
      if ((await bandit()).state === 'dead') break;
      await page.waitForTimeout(200);
    }
    expect(log.some((l) => /hits Bandit for \d+/.test(l))).toBe(true);
    expect(punchy).toBe(log.filter((l) => /hits Bandit/.test(l)).length);
    expect(log.at(-1)).toMatch(/Bandit falls/);
    const fallen = await bandit();
    expect(fallen.hp).toBe(0);
    expect(fallen.clip).toBe('death');
    await page.screenshot({ path: `test-results/bandit-${test.info().project.name}.png` });
  });

  test('tap on the level registers through picking', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch injection needs CDP');
    // Playwright's tap sends touch start and end back-to-back. A timed CDP sequence is
    // unreliable here because headless software rendering stalls event processing.
    // Low in the view's box: the lane a few metres ahead, a terrain chunk.
    await page.touchscreen.tap(395, 260);
    await page.waitForTimeout(150);
    const tapped = await page.evaluate(() => (window as unknown as W).ftb!.dev!.lastTap);
    expect(tapped).not.toBeNull();
    expect(tapped!.startsWith('t:')).toBe(true);
  });

  test('renders Gullhaven (not a black canvas) and captures the filter', async ({
    page,
    browserName,
  }) => {
    // Full look for the capture (the shared setup loads the lite variant).
    await page.goto('dev/?dev&level=gullhaven');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 150_000,
    });
    await page.waitForTimeout(500);
    const shot = await page.screenshot({
      path: `test-results/filter-palette-${browserName}.png`,
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
    await page.screenshot({ path: 'test-results/filter-palette.png' });
    await page.evaluate(() => (window as unknown as W).ftb!.setFilter({ mode: 'posterize' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: 'test-results/filter-posterize.png' });
    await page.evaluate(() => (window as unknown as W).ftb!.setFilter({ mode: 'off' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: 'test-results/filter-off.png' });
    await page.evaluate(() => (window as unknown as W).ftb!.setFilter({ mode: 'palette' }));
  });
});
