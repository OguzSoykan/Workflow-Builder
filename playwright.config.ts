import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // A dedicated port so tests never collide with a developer's `npm run dev` on 8787.
    baseURL: 'http://127.0.0.1:8797',
    // UI language follows the browser (FR-11); existing scenarios assert Turkish copy.
    locale: 'tr-TR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run e2e:server',
      url: 'http://127.0.0.1:8797/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { WRANGLER_SEND_METRICS: 'false' },
    },
    {
      command: 'npm run dev:contract-test',
      url: 'http://127.0.0.1:8788/',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { WRANGLER_SEND_METRICS: 'false' },
    },
  ],
});
