import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:      './e2e',
  fullyParallel: true,
  forbidOnly:    !!process.env.CI,
  retries:       process.env.CI ? 2 : 0,
  workers:       process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
  ],
  use: {
    baseURL:           process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace:             'retain-on-failure',
    screenshot:        'only-on-failure',
    video:             'retain-on-failure',
    actionTimeout:     10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command:              'npm run dev',
    url:                  'http://localhost:3000',
    reuseExistingServer:  !process.env.CI,
    timeout:              120_000,
    stdout:               'pipe',
    stderr:               'pipe',
  },
  globalSetup: './e2e/global-setup.ts',
});