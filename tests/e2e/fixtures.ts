/**
 * E2E Test Fixtures and Helpers
 * Common utilities for Playwright E2E tests
 */

import { test as base, Page, expect } from '@playwright/test';

/**
 * Custom test fixture with helper methods
 */
export const test = base.extend<{
  mockTauriApi: () => Promise<void>;
  waitForApp: () => Promise<void>;
}>({
  mockTauriApi: async ({ page }, use) => {
    await use(async () => {
      // Mock Tauri API for E2E tests (if running without Tauri backend)
      await page.addInitScript(() => {
        // @ts-expect-error - Tauri API mock
        window.__TAURI_INTERNALS__ = {
          invoke: async (cmd: string, args?: unknown) => {
            console.log(`[Mock] Tauri invoke: ${cmd}`, args);
            // Return mock responses based on command
            switch (cmd) {
              case 'kopia_server_status':
                return { running: false, uptime: null };
              case 'repository_status':
                return { connected: false };
              default:
                return null;
            }
          },
        };
      });
    });
  },

  waitForApp: async ({ page }, use) => {
    await use(async () => {
      // Wait for React app to hydrate
      await page.waitForSelector('[data-testid="app-layout"]', { timeout: 10000 });
      // Wait for initial state to load
      await page.waitForTimeout(1000);
    });
  },
});

export { expect };

/**
 * Helper to wait for navigation
 */
export async function waitForNavigation(page: Page, expectedPath: string) {
  await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 5000 });
}

/**
 * Helper to check if element is visible
 */
export async function expectVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible({ timeout: 5000 });
}

/**
 * Helper to check if text is visible
 */
export async function expectText(page: Page, text: string | RegExp) {
  await expect(page.getByText(text)).toBeVisible({ timeout: 5000 });
}

/**
 * Helper to click button by text
 */
export async function clickButton(page: Page, text: string | RegExp) {
  await page.getByRole('button', { name: text }).click();
}

/**
 * Helper to fill input by label
 */
export async function fillInput(page: Page, label: string | RegExp, value: string) {
  await page.getByLabel(label).fill(value);
}

/**
 * Helper to select option from dropdown
 */
export async function selectOption(page: Page, label: string | RegExp, value: string) {
  await page.getByLabel(label).selectOption(value);
}

/**
 * Helper to wait for toast notification
 */
export async function waitForToast(page: Page, message: string | RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: message })).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Helper to close toast notification
 */
export async function closeToast(page: Page) {
  const closeButton = page.locator('[data-sonner-toast] button[aria-label="Close toast"]');
  if (await closeButton.isVisible()) {
    await closeButton.click();
  }
}

/**
 * Helper to navigate using sidebar
 */
export async function navigateToPage(
  page: Page,
  pageName: 'Overview' | 'Repository' | 'Backups' | 'Policies' | 'Tasks' | 'Mounts' | 'Preferences'
) {
  await page.getByRole('link', { name: pageName, exact: true }).click();
  await page.waitForLoadState('networkidle');
}

/**
 * Helper to check theme (light/dark/system)
 */
export async function checkTheme(page: Page, theme: 'light' | 'dark' | 'system') {
  const html = page.locator('html');

  if (theme === 'system') {
    // Check if system theme is applied
    const systemTheme = await page.evaluate(() =>
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );
    await expect(html).toHaveClass(new RegExp(systemTheme));
  } else {
    await expect(html).toHaveClass(new RegExp(theme));
  }
}

/**
 * Helper to get current language
 */
export async function getCurrentLanguage(page: Page): Promise<string> {
  return page
    .locator('html')
    .getAttribute('lang')
    .then((lang) => lang || 'en');
}

/**
 * Helper to wait for loading state to finish
 */
export async function waitForLoadingToFinish(page: Page) {
  // Wait for any spinners to disappear
  const spinner = page.locator('[data-testid="spinner"]');
  if (await spinner.isVisible()) {
    await spinner.waitFor({ state: 'hidden', timeout: 10000 });
  }
}

/**
 * Helper to check if server is running (via UI status indicator)
 */
export async function isServerRunning(page: Page): Promise<boolean> {
  const statusBadge = page.locator('[data-testid="server-status"]');
  if (!(await statusBadge.isVisible())) return false;

  const text = await statusBadge.textContent();
  return text?.toLowerCase().includes('running') ?? false;
}

/**
 * Helper to check if repository is connected (via UI status indicator)
 */
export async function isRepositoryConnected(page: Page): Promise<boolean> {
  const statusBadge = page.locator('[data-testid="repository-status"]');
  if (!(await statusBadge.isVisible())) return false;

  const text = await statusBadge.textContent();
  return text?.toLowerCase().includes('connected') ?? false;
}
