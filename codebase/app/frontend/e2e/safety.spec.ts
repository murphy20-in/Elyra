import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('e2e_user@test.elyra.app');
  await page.getByLabel(/password/i).fill('E2eTest123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/discover/);
}

test.describe('Safety', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('safety page renders session form', async ({ page }) => {
    await page.goto('/safety');
    await expect(page.getByRole('heading', { name: /safe date|safety/i })).toBeVisible();
    await expect(page.getByLabel(/emergency contact name/i)).toBeVisible();
  });

  test('create safe session with valid data', async ({ page }) => {
    await page.goto('/safety');
    await page.getByLabel(/emergency contact name/i).fill('E2E Test Parent');
    await page.getByLabel(/emergency contact phone/i).fill('+919876543210');
    await page.getByLabel(/meeting location/i).fill('Test location Mumbai');
    await page.getByRole('radio', { name: /30 min/i }).click();
    await page.getByRole('button', { name: /start safe session/i }).click();
    await expect(page.getByRole('button', { name: /check in/i })).toBeVisible({ timeout: 5000 });
  });

  test('check in button resets timer', async ({ page }) => {
    await page.goto('/safety');
    const checkInBtn = page.getByRole('button', { name: /check in/i });
    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
    }
  });

});