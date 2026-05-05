import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES_TO_CHECK = [
  { name: 'Landing',  path: '/',               requiresAuth: false },
  { name: 'Login',    path: '/login',           requiresAuth: false },
  { name: 'Register', path: '/register',        requiresAuth: false },
  { name: 'Discover', path: '/discover',        requiresAuth: true  },
  { name: 'Chat',     path: '/chat',            requiresAuth: true  },
  { name: 'Safety',   path: '/safety',          requiresAuth: true  },
];

async function loginAndGetCookies(page: any) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('e2e_user@test.elyra.app');
  await page.getByLabel(/password/i).fill('E2eTest123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/discover/);
  return await page.context().cookies();
}

test.describe('Accessibility (axe-core)', () => {

  let authCookies: any[] = [];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authCookies = await loginAndGetCookies(page);
    await page.close();
  });

  for (const { name, path, requiresAuth } of PAGES_TO_CHECK) {
    test(`${name} page — no critical axe violations`, async ({ page }) => {
      if (requiresAuth) {
        await page.context().addCookies(authCookies);
      }
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations
        .filter(v => v.impact === 'critical' || v.impact === 'serious');

      if (criticalViolations.length > 0) {
        const report = criticalViolations.map(v =>
          `[${v.impact}] ${v.id}: ${v.description}`
        ).join('\n');
        expect.soft(criticalViolations.length, `Violations on ${name}:\n${report}`).toBe(0);
      }
    });
  }

  test('all interactive elements have accessible names', async ({ page }) => {
    await page.goto('/login');
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const name = await btn.getAttribute('aria-label') || await btn.textContent();
      expect(name?.trim().length).toBeGreaterThan(0);
    }
  });

});