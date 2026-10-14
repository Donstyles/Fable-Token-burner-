import { expect, test } from '@playwright/test';

test('boots to a rendering canvas with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/?dev');
  const canvas = page.locator('#world');
  await expect(canvas).toBeVisible();

  // The engine must be live and rendering frames.
  await page.waitForFunction(() => {
    const app = (window as unknown as { ftb?: { engine: { getFps(): number } } }).ftb;
    return !!app && app.engine.getFps() > 0;
  });

  // Dev overlay reports the default preset and a 1080-line render size.
  const overlay = page.locator('#dev-overlay');
  await expect(overlay).toContainText('lines-1080');
  await expect(overlay).toContainText('×1080');

  // Landscape: the rotate overlay stays hidden.
  await expect(page.locator('#rotate')).toBeHidden();

  await page.screenshot({ path: 'test-results/boot-landscape.png' });
  expect(errors).toEqual([]);
});

test('asks to rotate in portrait', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/');
  await expect(page.locator('#rotate')).toBeVisible();
});

test('recovers from a portrait launch followed by rotation', async ({ page }) => {
  // Launch in portrait (as an installed app often does), then rotate to landscape.
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/?dev');
  await page.waitForFunction(() => {
    const app = (window as unknown as { ftb?: { engine: { getFps(): number } } }).ftb;
    return !!app && app.engine.getFps() > 0;
  });
  await expect(page.locator('#rotate')).toBeVisible();
  await page.setViewportSize({ width: 932, height: 430 });
  await expect(page.locator('#rotate')).toBeHidden();
  await page.waitForTimeout(300);
  const size = await page.evaluate(() => {
    const app = (
      window as unknown as {
        ftb: { engine: { getRenderWidth(): number; getRenderHeight(): number; getFps(): number } };
      }
    ).ftb;
    return {
      w: app.engine.getRenderWidth(),
      h: app.engine.getRenderHeight(),
      fps: app.engine.getFps(),
    };
  });
  expect(size.h).toBe(1080);
  expect(size.w).toBeGreaterThan(2000);
  expect(size.fps).toBeGreaterThan(0);
  await expect(page.locator('#dev-overlay')).toContainText('×1080');
});

test('serves a web app manifest', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await request.get(new URL(href!, page.url()).toString());
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.orientation).toBe('landscape');
  // Icons come from the owner's image via `npm run icons`; the manifest must carry them.
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  for (const icon of manifest.icons) {
    const iconRes = await request.get(new URL(icon.src, page.url()).toString());
    expect(iconRes.ok(), icon.src).toBe(true);
  }
  // iOS reads the apple-touch-icon link rather than the manifest.
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(apple).toBeTruthy();
});
