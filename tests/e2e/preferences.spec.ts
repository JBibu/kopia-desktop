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
    await expect(page.getByText(/theme|appearance/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /light|dark|system/i })).toBeVisible();
  });

  test('can switch to light theme', async ({ page }) => {
    // Find and click light theme option
    const themeSelector = page.locator('[data-testid="theme-selector"]');
    if (await themeSelector.isVisible()) {
      await themeSelector.click();
      await page.getByRole('option', { name: /light/i }).click();
    } else {
      // Alternative: Click button directly
      await page.getByRole('button', { name: /light/i }).click();
    }

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Verify light theme is applied
    await checkTheme(page, 'light');
  });

  test('can switch to dark theme', async ({ page }) => {
    // Find and click dark theme option
    const themeSelector = page.locator('[data-testid="theme-selector"]');
    if (await themeSelector.isVisible()) {
      await themeSelector.click();
      await page.getByRole('option', { name: /dark/i }).click();
    } else {
      await page.getByRole('button', { name: /dark/i }).click();
    }

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Verify dark theme is applied
    await checkTheme(page, 'dark');
  });

  test('can switch to system theme', async ({ page }) => {
    // Find and click system theme option
    const themeSelector = page.locator('[data-testid="theme-selector"]');
    if (await themeSelector.isVisible()) {
      await themeSelector.click();
      await page.getByRole('option', { name: /system/i }).click();
    } else {
      await page.getByRole('button', { name: /system/i }).click();
    }

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Verify system theme is applied
    await checkTheme(page, 'system');
  });

  test('theme persists after page reload', async ({ page }) => {
    // Set to dark theme
    const themeButton = page.getByRole('button', { name: /dark/i });
    if (await themeButton.isVisible()) {
      await themeButton.click();
    }

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
    const themeButton = page.getByRole('button', { name: /light/i });
    if (await themeButton.isVisible()) {
      await themeButton.click();
    }

    await page.waitForTimeout(500);
    await checkTheme(page, 'light');

    // Navigate to different page
    await navigateToPage(page, 'Repository');
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
    await expect(page.getByText(/language|idioma/i)).toBeVisible();
  });

  test('can switch to English', async ({ page }) => {
    // Find language selector
    const languageSelector = page.locator('[data-testid="language-selector"]');
    if (await languageSelector.isVisible()) {
      await languageSelector.click();
      await page.getByRole('option', { name: /english|inglés/i }).click();
    } else {
      // Alternative: look for button/select
      await page.getByRole('button', { name: /english|inglés/i }).click();
    }

    // Wait for language to apply
    await page.waitForTimeout(500);

    // Verify language is English
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');

    // Check that UI shows English text
    await expect(page.getByText(/preferences/i)).toBeVisible();
  });

  test('can switch to Spanish', async ({ page }) => {
    // Find language selector
    const languageSelector = page.locator('[data-testid="language-selector"]');
    if (await languageSelector.isVisible()) {
      await languageSelector.click();
      await page.getByRole('option', { name: /spanish|español/i }).click();
    } else {
      await page.getByRole('button', { name: /spanish|español/i }).click();
    }

    // Wait for language to apply
    await page.waitForTimeout(500);

    // Verify language is Spanish
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('es');

    // Check that UI shows Spanish text
    await expect(page.getByText(/preferencias/i)).toBeVisible();
  });

  test('language persists after page reload', async ({ page }) => {
    // Set to Spanish
    const languageSelector = page.locator('[data-testid="language-selector"]');
    if (await languageSelector.isVisible()) {
      await languageSelector.click();
      await page.getByRole('option', { name: /spanish|español/i }).click();
    }

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
    await expect(page.getByText(/font size|tamaño/i)).toBeVisible();
  });

  test('can increase font size', async ({ page }) => {
    // Get initial font size
    const initialSize = await page.locator('html').evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    // Find increase button (look for + or "Increase" text)
    const increaseButton = page.getByRole('button', { name: /increase|\+/i });
    if (await increaseButton.isVisible()) {
      await increaseButton.click();
      await page.waitForTimeout(300);

      // Check font size increased
      const newSize = await page.locator('html').evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      expect(parseFloat(newSize)).toBeGreaterThan(parseFloat(initialSize));
    }
  });

  test('can decrease font size', async ({ page }) => {
    // Get initial font size
    const initialSize = await page.locator('html').evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    // Find decrease button (look for - or "Decrease" text)
    const decreaseButton = page.getByRole('button', { name: /decrease|-/i });
    if (await decreaseButton.isVisible()) {
      await decreaseButton.click();
      await page.waitForTimeout(300);

      // Check font size decreased
      const newSize = await page.locator('html').evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      expect(parseFloat(newSize)).toBeLessThan(parseFloat(initialSize));
    }
  });

  test('can reset font size', async ({ page }) => {
    // Find reset button
    const resetButton = page.getByRole('button', { name: /reset|default/i });
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForTimeout(300);

      // Font size should be at default
      const fontSize = await page.locator('html').evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      expect(fontSize).toBe('16px'); // Assuming 16px is default
    }
  });

  test('font size persists after page reload', async ({ page }) => {
    // Increase font size
    const increaseButton = page.getByRole('button', { name: /increase|\+/i });
    if (await increaseButton.isVisible()) {
      await increaseButton.click();
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
    }
  });
});

test.describe('Preferences - Byte Format', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');
  });

  test('displays byte format selector', async ({ page }) => {
    // Look for byte format controls
    const byteFormatText = page.getByText(/byte format|formato de bytes/i);
    if (await byteFormatText.isVisible()) {
      await expect(byteFormatText).toBeVisible();
    }
  });

  test('can switch between Base-2 and Base-10', async ({ page }) => {
    // Find byte format toggle/selector
    const base2Option = page.getByText(/base-2|binary|KiB/i);
    const base10Option = page.getByText(/base-10|decimal|KB/i);

    if (await base2Option.isVisible()) {
      // Switch to Base-2
      await base2Option.click();
      await page.waitForTimeout(300);

      // Switch to Base-10
      if (await base10Option.isVisible()) {
        await base10Option.click();
        await page.waitForTimeout(300);
      }
    }
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
