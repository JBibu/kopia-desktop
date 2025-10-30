import { test, expect } from '@playwright/test';

test('app loads successfully', async ({ page }) => {
  await page.goto('/');

  // Check that the app title is visible
  await expect(page.locator('h1')).toContainText('Kopia Desktop');
});

test('has correct page title', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Kopia Desktop/);
});
