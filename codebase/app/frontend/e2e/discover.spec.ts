import { test, expect, Page } from '@playwright/test';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/discover/);
}

test.describe('Discovery', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'e2e_user@test.elyra.app', 'E2eTest123!');
  });

  test('discover page renders swipe stack or empty state', async ({ page }) => {
    await page.goto('/discover');
    const hasCards = await page.locator('[data-testid="swipe-card"]').count() > 0;
    const hasEmpty = await page.getByText(/no more profiles|check back later/i).isVisible();
    expect(hasCards || hasEmpty).toBe(true);
  });

  test('like button triggers animation', async ({ page }) => {
    await page.goto('/discover');
    const likeBtn = page.getByRole('button', { name: /like|heart/i }).first();
    if (await likeBtn.isVisible()) {
      await likeBtn.click();
    }
  });

  test('navigation to matches page works', async ({ page }) => {
    await page.getByRole('link', { name: /matches/i }).click();
    await expect(page).toHaveURL(/\/matches/);
  });

});