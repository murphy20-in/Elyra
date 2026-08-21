import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the production preview build, not the dev server —
 * the service worker and the real asset graph only exist after a build,
 * and those are precisely what we need to exercise.
 *
 * Uses the system Chrome (channel) rather than a Playwright-managed
 * download so the suite runs without a separate browser install step.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"]],

  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        channel: "chrome",
        // Pixel 7 preset implies a mobile Chrome UA + touch
      },
    },
  ],

  webServer: {
    command: "npm run build && npm run preview -- --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
