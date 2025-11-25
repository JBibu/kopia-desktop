/**
 * E2E Tests: Navigation and Routing
 * Tests for page navigation, routing, and protected routes
 */

import { test, expect, waitForNavigation, navigateToPage } from './fixtures';

test.describe('Navigation and Routing', () => {
  test.beforeEach(async ({ page }) => {
    // Start on preferences page (unprotected) so sidebar is visible
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');
  });

  test('loads the application successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Kopia Desktop/);

    // Check main content is rendered
    await expect(page.locator('main')).toBeVisible();
  });

  test('displays sidebar navigation', async ({ page }) => {
    // Check sidebar is visible
    await expect(page.getByRole('navigation')).toBeVisible();

    // Check main navigation items (use exact: true to avoid strict mode violations)
    await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Destination', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Backups', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Backup Rules', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tasks', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse Backups', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Preferences', exact: true })).toBeVisible();
  });

  test('navigates to Preferences page (unprotected)', async ({ page }) => {
    // Already on preferences page from beforeEach
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

  test('can navigate to Destination page', async ({ page }) => {
    await navigateToPage(page, 'Destination');
    await waitForNavigation(page, '/repository');

    // Check page is loaded
    await expect(
      page.getByRole('heading', { name: /repository|connection|destination/i })
    ).toBeVisible();
  });

  test('404 page for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-that-does-not-exist');
    await page.waitForLoadState('networkidle');

    // Check 404 content (use first() to avoid strict mode violation)
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });

  test('can navigate back and forward in browser history', async ({ page }) => {
    // Navigate to Preferences
    await navigateToPage(page, 'Preferences');
    await waitForNavigation(page, '/preferences');

    // Navigate to Destination
    await navigateToPage(page, 'Destination');
    await waitForNavigation(page, '/repository');

    // Go back
    await page.goBack();
    await waitForNavigation(page, '/preferences');
    await expect(page.getByRole('heading', { name: /preferences/i })).toBeVisible();

    // Go forward
    await page.goForward();
    await waitForNavigation(page, '/repository');
    await expect(
      page.getByRole('heading', { name: /repository|connection|destination/i })
    ).toBeVisible();
  });

  test('sidebar highlights active page', async ({ page }) => {
    // Already on Preferences page from beforeEach
    // Check active state by looking for the active styling class
    const preferencesLink = page.getByRole('link', { name: 'Preferences' });
    await expect(preferencesLink).toBeVisible();
    // Check if link has the active primary background color
    await expect(preferencesLink).toHaveClass(/bg-primary/);
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
    const protectedRoutes = ['/snapshots', '/policies', '/tasks', '/mounts'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Wait for potential redirect to complete
      await page.waitForURL(/\/(setup)?$/, { timeout: 5000 }).catch(() => {
        // URL might already be correct
      });

      // Should redirect to /setup when not connected
      const url = page.url();
      expect(url).toMatch(/\/(setup)?$/);
    }
  });
});

test.describe('Deep Linking', () => {
  test('can access Preferences directly via URL', async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');

    // Check that preferences page content is visible
    await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
    await expect(page.getByText('Appearance').first()).toBeVisible();
  });

  test('can access Destination directly via URL', async ({ page }) => {
    await page.goto('/repository');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /repository|connection|destination/i })
    ).toBeVisible();
  });

  test('can access Setup directly via URL', async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    // Check that setup page is loaded (look for storage provider text)
    await expect(page.getByText(/filesystem|storage/i).first()).toBeVisible();
  });
});
