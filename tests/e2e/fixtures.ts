/**
 * E2E Test Fixtures and Helpers
 * Common utilities for Playwright E2E tests
 */

import { test as base, Page, expect } from '@playwright/test';

/**
 * Custom test fixture with Tauri API mock
 */
export const test = base.extend({
  // Auto-inject Tauri API mock for all tests
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      // @ts-expect-error - Tauri API mock
      window.__TAURI_INTERNALS__ = {
        invoke: async (cmd: string, args?: unknown) => {
          console.log(`[Mock] Tauri invoke: ${cmd}`, args);
          switch (cmd) {
            case 'kopia_server_status':
              return { running: false, uptime: null };
            case 'repository_status':
              return { connected: false };
            case 'sources_list':
              return { sources: [] };
            case 'snapshots_list':
              return [];
            case 'policies_list':
              return [];
            case 'tasks_list':
              return [];
            case 'tasks_summary':
              return { counters: {} };
            case 'maintenance_info':
              return { params: {}, schedule: {} };
            case 'mounts_list':
              return [];
            case 'notification_profiles_list':
              return [];
            default:
              console.warn(`[Mock] Unhandled Tauri command: ${cmd}`);
              return null;
          }
        },
      };
    });
    await use(page);
  },
});

export { expect };

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, expectedPath: string) {
  await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 5000 });
}

/**
 * Navigate to a page using direct URL
 */
export async function navigateToPage(
  page: Page,
  pageName:
    | 'Overview'
    | 'Destination'
    | 'Backups'
    | 'Backup Rules'
    | 'Tasks'
    | 'Browse Backups'
    | 'Preferences'
) {
  const routes: Record<string, string> = {
    Overview: '/',
    Destination: '/repository',
    Backups: '/snapshots',
    'Backup Rules': '/policies',
    Tasks: '/tasks',
    'Browse Backups': '/mounts',
    Preferences: '/preferences',
  };

  await page.goto(routes[pageName]);
  await page.waitForLoadState('networkidle');
}

/**
 * Verify theme is applied correctly
 */
export async function checkTheme(page: Page, theme: 'light' | 'dark' | 'system') {
  const html = page.locator('html');

  if (theme === 'system') {
    const systemTheme = await page.evaluate(() =>
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );
    await expect(html).toHaveClass(new RegExp(systemTheme));
  } else {
    await expect(html).toHaveClass(new RegExp(theme));
  }
}
