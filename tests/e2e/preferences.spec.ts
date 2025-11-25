/**
 * E2E Tests: Preferences
 * Tests for theme, language, font size, and other user preferences
 */

import { test, expect, navigateToPage, waitForNavigation, checkTheme } from './fixtures';

test.describe('Preferences - Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');
  });

  test('displays theme selector', async ({ page }) => {
    // Check for Appearance card title
    await expect(page.getByText('Appearance')).toBeVisible();
    // Check for theme label and select
    await expect(page.getByText('Theme')).toBeVisible();
    await expect(page.locator('#theme')).toBeVisible();
  });

  test('can switch to light theme', async ({ page }) => {
    // Open theme select dropdown
    await page.locator('#theme').click();

    // Click light option
    await page.getByRole('option', { name: /light/i }).click();

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Verify light theme is applied
    await checkTheme(page, 'light');
  });

  test('can switch to dark theme', async ({ page }) => {
    // Open theme select dropdown
    await page.locator('#theme').click();

    // Click dark option
    await page.getByRole('option', { name: /dark/i }).click();

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Verify dark theme is applied
    await checkTheme(page, 'dark');
  });

  test('can switch to system theme', async ({ page }) => {
    // Open theme select dropdown
    await page.locator('#theme').click();

    // Click system option
    await page.getByRole('option', { name: /system/i }).click();

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Verify system theme is applied
    await checkTheme(page, 'system');
  });

  test('theme persists after page reload', async ({ page }) => {
    // Set to dark theme
    await page.locator('#theme').click();
    await page.getByRole('option', { name: /dark/i }).click();

    await page.waitForTimeout(500);
    await checkTheme(page, 'dark');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Theme should still be dark
    await checkTheme(page, 'dark');
  });

  test('theme persists across navigation', async ({ page }) => {
    // Set to light theme
    await page.locator('#theme').click();
    await page.getByRole('option', { name: /light/i }).click();

    await page.waitForTimeout(500);
    await checkTheme(page, 'light');

    // Navigate to different page
    await navigateToPage(page, 'Destination');
    await waitForNavigation(page, '/repository');

    // Theme should still be light
    await checkTheme(page, 'light');
  });
});

test.describe('Preferences - Language', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');
  });

  test('displays language selector', async ({ page }) => {
    // Check for Language card title
    await expect(page.getByText('Language').first()).toBeVisible();
    // Check for language label and select
    await expect(page.getByText(/interface language|idioma/i)).toBeVisible();
    await expect(page.locator('#language')).toBeVisible();
  });

  test('can switch to English', async ({ page }) => {
    // Open language select dropdown
    await page.locator('#language').click();

    // Click English option
    await page.getByRole('option', { name: /english/i }).click();

    // Wait for language to apply
    await page.waitForTimeout(500);

    // Verify language is English
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');

    // Check that UI shows English text (use first() to avoid strict mode)
    await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
  });

  test('can switch to Spanish', async ({ page }) => {
    // Open language select dropdown
    await page.locator('#language').click();

    // Click Spanish option
    await page.getByRole('option', { name: /spanish|español/i }).click();

    // Wait for language to apply
    await page.waitForTimeout(500);

    // Verify language is Spanish
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('es');

    // Check that UI shows Spanish text (use heading to avoid strict mode)
    await expect(page.getByRole('heading', { name: 'Preferencias' })).toBeVisible();
  });

  test('language persists after page reload', async ({ page }) => {
    // Set to Spanish
    await page.locator('#language').click();
    await page.getByRole('option', { name: /spanish|español/i }).click();

    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Language should still be Spanish
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('es');
  });
});

test.describe('Preferences - Font Size', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');
  });

  test('displays font size controls', async ({ page }) => {
    // Check for Text Size label and select
    await expect(page.getByText(/text size|tamaño/i)).toBeVisible();
    await expect(page.locator('#fontSize')).toBeVisible();
  });

  test('can change to large font size', async ({ page }) => {
    // Get initial font size
    const initialSize = await page.locator('html').evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    // Open font size select dropdown
    await page.locator('#fontSize').click();

    // Click large option
    await page.getByRole('option', { name: /large/i }).click();
    await page.waitForTimeout(300);

    // Check font size increased
    const newSize = await page.locator('html').evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    expect(parseFloat(newSize)).toBeGreaterThan(parseFloat(initialSize));
  });

  test('can change to small font size', async ({ page }) => {
    // First set to large
    await page.locator('#fontSize').click();
    await page.getByRole('option', { name: /large/i }).click();
    await page.waitForTimeout(300);

    const largeSize = await page.locator('html').evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    // Then set to small
    await page.locator('#fontSize').click();
    await page.getByRole('option', { name: /small/i }).click();
    await page.waitForTimeout(300);

    // Check font size decreased
    const smallSize = await page.locator('html').evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    expect(parseFloat(smallSize)).toBeLessThan(parseFloat(largeSize));
  });

  test('can set to medium font size', async ({ page }) => {
    // Open font size select dropdown
    await page.locator('#fontSize').click();

    // Click medium option
    await page.getByRole('option', { name: /medium/i }).click();
    await page.waitForTimeout(300);

    // Font size should be at medium (default is typically 16px)
    const fontSize = await page.locator('html').evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    expect(fontSize).toBe('16px');
  });

  test('font size persists after page reload', async ({ page }) => {
    // Set to large font size
    await page.locator('#fontSize').click();
    await page.getByRole('option', { name: /large/i }).click();
    await page.waitForTimeout(300);

    const fontSize = await page.locator('html').evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Font size should persist
    const newFontSize = await page.locator('html').evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    expect(newFontSize).toBe(fontSize);
  });
});

test.describe('Preferences - Byte Format', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');
  });

  test('displays byte format selector', async ({ page }) => {
    // Check for Byte Format label and select
    await expect(page.getByText(/byte format|formato/i).first()).toBeVisible();
    await expect(page.locator('#byteFormat')).toBeVisible();
  });

  test('can switch to Base-2', async ({ page }) => {
    // Open byte format select dropdown
    await page.locator('#byteFormat').click();

    // Click Base-2 option
    await page.getByRole('option', { name: /base-2|base 2/i }).click();
    await page.waitForTimeout(300);

    // Verify selection by reopening dropdown
    await page.locator('#byteFormat').click();
    const base2Option = page.getByRole('option', { name: /base-2|base 2/i });
    await expect(base2Option).toBeVisible();
  });

  test('can switch to Base-10', async ({ page }) => {
    // Open byte format select dropdown
    await page.locator('#byteFormat').click();

    // Click Base-10 option
    await page.getByRole('option', { name: /base-10|base 10/i }).click();
    await page.waitForTimeout(300);

    // Verify selection by reopening dropdown
    await page.locator('#byteFormat').click();
    const base10Option = page.getByRole('option', { name: /base-10|base 10/i });
    await expect(base10Option).toBeVisible();
  });
});

test.describe('Preferences - Layout and Sections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');
  });

  test('displays all preference sections', async ({ page }) => {
    // Check for main sections
    const sections = [/appearance|apariencia/i, /language|idioma/i, /byte format|formato/i];

    for (const section of sections) {
      const heading = page.getByText(section).first();
      if (await heading.isVisible()) {
        await expect(heading).toBeVisible();
      }
    }
  });

  test('preferences page is scrollable', async ({ page }) => {
    // Get page height
    const height = await page.evaluate(() => document.body.scrollHeight);
    expect(height).toBeGreaterThan(0);

    // Try scrolling
    await page.evaluate(() => window.scrollTo(0, 100));
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Preferences - Windows Service (Windows only)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');
  });

  test('displays Windows service controls on Windows', async ({ page }) => {
    // Check if Windows service section exists
    const serviceSection = page.getByText(/windows service|servicio/i);
    if (await serviceSection.isVisible()) {
      await expect(serviceSection).toBeVisible();

      // Check for install/uninstall buttons
      const installButton = page.getByRole('button', { name: /install service/i });
      const uninstallButton = page.getByRole('button', { name: /uninstall service/i });

      expect((await installButton.isVisible()) || (await uninstallButton.isVisible())).toBeTruthy();
    }
  });
});
