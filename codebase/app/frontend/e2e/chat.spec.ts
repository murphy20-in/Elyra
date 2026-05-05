import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('e2e_user@test.elyra.app');
  await page.getByLabel(/password/i).fill('E2eTest123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/discover/);
}

test.describe('Chat', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('chat thread list renders', async ({ page }) => {
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/chat/);
    const hasThreads = await page.locator('[data-testid="thread-item"]').count() > 0;
    const hasEmpty = await page.getByText(/no conversations/i).isVisible();
    expect(hasThreads || hasEmpty).toBe(true);
  });

  test('send message in existing thread', async ({ page }) => {
    await page.goto('/chat');
    const threads = page.locator('[data-testid="thread-item"]');
    if (await threads.count() > 0) {
      await threads.first().click();
      const input = page.getByPlaceholder(/type a message/i);
      await input.fill(`E2E test ${Date.now()}`);
      await page.getByRole('button', { name: /send/i }).click();
    }
  });

});