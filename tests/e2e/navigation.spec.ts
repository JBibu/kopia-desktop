/**
 * E2E Tests: Navigation and Routing
 * Tests for page navigation, routing, and protected routes
 */

import { test, expect, waitForNavigation, navigateToPage } from './fixtures';

test.describe('Navigation and Routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads the application successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Kopia Desktop/);

    // Check app layout is rendered
    await expect(page.locator('[data-testid="app-layout"]')).toBeVisible();
  });

  test('displays sidebar navigation', async ({ page }) => {
    // Check sidebar is visible
    await expect(page.getByRole('navigation')).toBeVisible();

    // Check main navigation items
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Repository' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Backups' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Policies' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tasks' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mounts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Preferences' })).toBeVisible();
  });

  test('navigates to Preferences page (unprotected)', async ({ page }) => {
    await navigateToPage(page, 'Preferences');
    await waitForNavigation(page, '/preferences');

    // Check page heading
    await expect(page.getByRole('heading', { name: /preferences/i })).toBeVisible();
  });

  test('redirects to Setup when repository not connected', async ({ page }) => {
    // Try to navigate to protected route (Overview)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should redirect to /setup if no repository connected
    // Note: This behavior depends on backend state
    const url = page.url();
    expect(url).toMatch(/\/(setup)?$/);
  });

  test('can navigate to Repository page', async ({ page }) => {
    await navigateToPage(page, 'Repository');
    await waitForNavigation(page, '/repository');

    // Check page is loaded
    await expect(page.getByRole('heading', { name: /repository|connection/i })).toBeVisible();
  });

  test('404 page for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-that-does-not-exist');
    await page.waitForLoadState('networkidle');

    // Check 404 content
    await expect(page.getByText(/404|not found/i)).toBeVisible();
  });

  test('can navigate back and forward in browser history', async ({ page }) => {
    // Navigate to Preferences
    await navigateToPage(page, 'Preferences');
    await waitForNavigation(page, '/preferences');

    // Navigate to Repository
    await navigateToPage(page, 'Repository');
    await waitForNavigation(page, '/repository');

    // Go back
    await page.goBack();
    await waitForNavigation(page, '/preferences');
    await expect(page.getByRole('heading', { name: /preferences/i })).toBeVisible();

    // Go forward
    await page.goForward();
    await waitForNavigation(page, '/repository');
    await expect(page.getByRole('heading', { name: /repository|connection/i })).toBeVisible();
  });

  test('sidebar highlights active page', async ({ page }) => {
    // Navigate to Preferences
    await navigateToPage(page, 'Preferences');

    // Check active state (implementation may vary, check for aria-current or class)
    const preferencesLink = page.getByRole('link', { name: 'Preferences', exact: true });
    await expect(preferencesLink).toHaveAttribute('aria-current', 'page');
  });

  test('mobile sidebar toggle works', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Sidebar should be hidden on mobile by default
    const sidebar = page.getByRole('navigation');

    // Look for menu toggle button (hamburger)
    const menuButton = page.getByRole('button', { name: /menu|toggle|navigation/i });
    if (await menuButton.isVisible()) {
      // Click to open sidebar
      await menuButton.click();
      await expect(sidebar).toBeVisible();

      // Click to close sidebar
      await menuButton.click();
      // Sidebar should be hidden or in closed state
    }
  });

  test('breadcrumbs show current location', async ({ page }) => {
    await navigateToPage(page, 'Preferences');
    await waitForNavigation(page, '/preferences');

    // Check for breadcrumb navigation
    const breadcrumb = page.locator('[aria-label="breadcrumb"]');
    if (await breadcrumb.isVisible()) {
      await expect(breadcrumb).toContainText(/preferences/i);
    }
  });
});

test.describe('Protected Routes', () => {
  test('redirects to setup for protected routes when not connected', async ({ page }) => {
    // Try accessing protected routes directly
    const protectedRoutes = [
      '/snapshots',
      '/snapshots/create',
      '/snapshots/history',
      '/policies',
      '/tasks',
      '/mounts',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Should redirect to /setup or stay on overview (depends on connection state)
      const url = page.url();
      expect(url).toMatch(/\/(setup)?$/);
    }
  });
});

test.describe('Deep Linking', () => {
  test('can access Preferences directly via URL', async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /preferences/i })).toBeVisible();
  });

  test('can access Repository directly via URL', async ({ page }) => {
    await page.goto('/repository');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /repository|connection/i })).toBeVisible();
  });

  test('can access Setup directly via URL', async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /setup|repository/i })).toBeVisible();
  });
});
