import { defineConfig } from '@playwright/test';

const port = 4173;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000, // software GL with the grade pipeline is slow
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${port}/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // iPhone 14 Pro Max, landscape, as a home-screen web app.
      name: 'iphone-14-pro-max-landscape',
      use: {
        browserName: 'chromium',
        // Cloud sessions point this at the pre-installed Chromium; CI installs its own.
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
        viewport: { width: 932, height: 430 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
    },
    {
      // Same device profile on WebKit: covers Safari's shader translator and layout.
      // Touch-driven tests need CDP and skip themselves here.
      name: 'webkit-iphone-landscape',
      use: {
        browserName: 'webkit',
        viewport: { width: 932, height: 430 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run build:dev && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
