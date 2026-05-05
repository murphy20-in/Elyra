import { test, expect } from '@playwright/test';

const TIMESTAMP = Date.now();
const TEST_EMAIL = `e2e_auth_${TIMESTAMP}@test.elyra.app`;
const TEST_PASS = 'E2eAuth123!';

test.describe('Authentication', () => {

  test('landing page loads with CTA buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Elyra/);
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
  });

  test('register a new user', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/^password$/i).fill(TEST_PASS);
    await page.getByLabel(/confirm password/i).fill(TEST_PASS);
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByLabel(/display name/i).fill('E2E Tester');
    await page.getByLabel(/age/i).fill('25');
    await page.getByLabel(/gender identity/i).selectOption('non-binary');
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByLabel(/city/i).fill('Mumbai');
    await page.getByRole('radio', { name: /exploring/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('checkbox', { name: /terms/i }).check();
    await page.getByRole('button', { name: /create account|finish|register/i }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('e2e_user@test.elyra.app');
    await page.getByLabel(/password/i).fill('E2eTest123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('e2e_user@test.elyra.app');
    await page.getByLabel(/password/i).fill('WrongPass999!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible({ timeout: 5000 });
  });

  test('redirect unauthenticated from /discover to /login', async ({ page }) => {
    await page.goto('/discover');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout redirects to login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('e2e_user@test.elyra.app');
    await page.getByLabel(/password/i).fill('E2eTest123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.goto('/settings');
    await page.getByRole('button', { name: /logout|sign out/i }).click();
    await expect(page).toHaveURL(/\/login|^\//);
  });

});