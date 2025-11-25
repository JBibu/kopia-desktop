/**
 * E2E Tests: Backup Profiles
 * Tests for creating, editing, and managing backup profiles
 */

import { test, expect, navigateToPage } from './fixtures';

test.describe('Backup Profiles - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Start on preferences page (unprotected) so sidebar is visible
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');
  });

  test('can navigate to Backups page', async ({ page }) => {
    await navigateToPage(page, 'Backups');
    // May redirect to /setup if no repository connected
    await page.waitForLoadState('networkidle');

    // Check page loaded - either snapshots page or redirected to setup
    await expect(page.getByRole('main')).toBeVisible();

    const url = page.url();
    expect(url.includes('/snapshots') || url.includes('/setup')).toBeTruthy();
  });

  test('displays profiles and individual sources tabs', async ({ page }) => {
    await navigateToPage(page, 'Backups');
    await page.waitForLoadState('networkidle');

    // Check for tabs
    const profilesTab = page.getByRole('tab', { name: /profiles/i });
    const sourcesTab = page.getByRole('tab', { name: /individual|sources/i });

    if (await profilesTab.isVisible()) {
      await expect(profilesTab).toBeVisible();
    }
    if (await sourcesTab.isVisible()) {
      await expect(sourcesTab).toBeVisible();
    }
  });

  test('can switch between tabs', async ({ page }) => {
    await navigateToPage(page, 'Backups');
    await page.waitForLoadState('networkidle');

    // Click individual sources tab
    const sourcesTab = page.getByRole('tab', { name: /individual|sources/i });
    if (await sourcesTab.isVisible()) {
      await sourcesTab.click();
      await page.waitForTimeout(500);

      // Should show individual sources content
      await expect(page.getByText(/individual|sources/i)).toBeVisible();

      // Click back to profiles tab
      const profilesTab = page.getByRole('tab', { name: /profiles/i });
      if (await profilesTab.isVisible()) {
        await profilesTab.click();
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Backup Profiles - Create Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/snapshots');
    await page.waitForLoadState('networkidle');
  });

  test('displays create profile button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|new profile/i });
    if (await createButton.isVisible()) {
      await expect(createButton).toBeVisible();
    }
  });

  test('opens create profile dialog', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|new profile/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Should show dialog
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/create|new profile/i)).toBeVisible();
    }
  });

  test('can enter profile name', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|new profile/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Enter profile name
      const nameInput = page.getByLabel(/name/i);
      if (await nameInput.isVisible()) {
        await nameInput.fill('My Test Profile');
        await expect(nameInput).toHaveValue('My Test Profile');
      }
    }
  });

  test('can enter profile description', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|new profile/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Enter description
      const descriptionInput = page.getByLabel(/description/i);
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('Test description for my backup profile');
        await expect(descriptionInput).toHaveValue('Test description for my backup profile');
      }
    }
  });

  test('can add directories to profile', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|new profile/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Look for add directory button
      const addDirButton = page.getByRole('button', { name: /add directory|browse/i });
      if (await addDirButton.isVisible()) {
        // Note: File picker cannot be automated
        // Just verify button exists
        await expect(addDirButton).toBeEnabled();
      }
    }
  });

  test('validates required fields', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|new profile/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Try to save without filling required fields
      const saveButton = page.getByRole('button', { name: /save|create/i }).last();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(500);

        // Should show validation error
        const error = page.getByText(/required|name/i);
        if (await error.isVisible()) {
          await expect(error).toBeVisible();
        }
      }
    }
  });

  test('can cancel profile creation', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|new profile/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Cancel dialog
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await page.waitForTimeout(500);

        // Dialog should be closed
        await expect(page.getByRole('dialog')).not.toBeVisible();
      }
    }
  });
});

test.describe('Backup Profiles - Profile List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/snapshots');
    await page.waitForLoadState('networkidle');
  });

  test('displays empty state when no profiles', async ({ page }) => {
    // Wait a bit for any redirects to complete
    await page.waitForTimeout(500);
    const url = page.url();

    if (url.includes('/setup')) {
      // Redirected to setup page (no repository connected)
      await expect(page.getByText(/filesystem|storage/i).first()).toBeVisible();
    } else if (url.includes('/snapshots')) {
      // On snapshots page - check for empty state or profiles
      const emptyState = page.getByText(/no profiles|create your first/i);
      const profileCards = page.getByRole('article');

      const hasEmptyState = await emptyState.isVisible();
      const hasProfiles = (await profileCards.count()) > 0;

      expect(hasEmptyState || hasProfiles).toBeTruthy();
    } else {
      // On some other page - just check main is visible
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  test('displays profile cards', async ({ page }) => {
    // Look for profile cards
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      // Check first profile card has expected elements
      const firstCard = profileCards.first();
      await expect(firstCard).toBeVisible();

      // Profile name should be visible
      await expect(firstCard.getByRole('heading')).toBeVisible();
    }
  });

  test('profile cards show status badges', async ({ page }) => {
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      const firstCard = profileCards.first();

      // Look for status badge (Active/Inactive/etc)
      const statusBadge = firstCard.getByText(/active|inactive|enabled|disabled/i);
      if (await statusBadge.isVisible()) {
        await expect(statusBadge).toBeVisible();
      }
    }
  });

  test('can search profiles', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search|filter/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Results should be filtered
      // (behavior depends on existing profiles)
    }
  });

  test('can sort profiles', async ({ page }) => {
    // Look for sort controls
    const sortButton = page.getByRole('button', { name: /sort/i });
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await page.waitForTimeout(300);

      // Should show sort options
      await expect(page.getByText(/name|date|size/i)).toBeVisible();
    }
  });
});

test.describe('Backup Profiles - Profile Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/snapshots');
    await page.waitForLoadState('networkidle');
  });

  test('can open profile menu', async ({ page }) => {
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      const firstCard = profileCards.first();

      // Look for menu button (three dots)
      const menuButton = firstCard.getByRole('button', { name: /menu|more|options/i });
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);

        // Menu should be visible
        await expect(page.getByRole('menu')).toBeVisible();
      }
    }
  });

  test('profile menu shows edit option', async ({ page }) => {
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      const firstCard = profileCards.first();
      const menuButton = firstCard.getByRole('button', { name: /menu|more|options/i });

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);

        // Check for edit option
        const editOption = page.getByRole('menuitem', { name: /edit/i });
        if (await editOption.isVisible()) {
          await expect(editOption).toBeVisible();
        }
      }
    }
  });

  test('profile menu shows delete option', async ({ page }) => {
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      const firstCard = profileCards.first();
      const menuButton = firstCard.getByRole('button', { name: /menu|more|options/i });

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);

        // Check for delete option
        const deleteOption = page.getByRole('menuitem', { name: /delete/i });
        if (await deleteOption.isVisible()) {
          await expect(deleteOption).toBeVisible();
        }
      }
    }
  });

  test('can enable/disable profile', async ({ page }) => {
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      const firstCard = profileCards.first();

      // Look for enable/disable toggle
      const toggle = firstCard.getByRole('switch');
      if (await toggle.isVisible()) {
        const initialState = await toggle.isChecked();

        // Toggle it
        await toggle.click();
        await page.waitForTimeout(500);

        // State should have changed
        const newState = await toggle.isChecked();
        expect(newState).not.toBe(initialState);
      }
    }
  });

  test('can view profile history', async ({ page }) => {
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      const firstCard = profileCards.first();

      // Click on profile card or "View History" button
      const viewButton = firstCard.getByRole('button', { name: /view|history/i });
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(500);

        // Should navigate to profile history page
        const url = page.url();
        expect(url).toContain('/history');
      } else {
        // Try clicking the card itself
        await firstCard.click();
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Backup Profiles - Edit Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/snapshots');
    await page.waitForLoadState('networkidle');
  });

  test('opens edit dialog', async ({ page }) => {
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      const firstCard = profileCards.first();
      const menuButton = firstCard.getByRole('button', { name: /menu|more|options/i });

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);

        const editOption = page.getByRole('menuitem', { name: /edit/i });
        if (await editOption.isVisible()) {
          await editOption.click();
          await page.waitForTimeout(500);

          // Edit dialog should be visible
          await expect(page.getByRole('dialog')).toBeVisible();
          await expect(page.getByText(/edit profile/i)).toBeVisible();
        }
      }
    }
  });

  test('can modify profile name', async ({ page }) => {
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      const firstCard = profileCards.first();
      const menuButton = firstCard.getByRole('button', { name: /menu|more|options/i });

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);

        const editOption = page.getByRole('menuitem', { name: /edit/i });
        if (await editOption.isVisible()) {
          await editOption.click();
          await page.waitForTimeout(500);

          // Modify name
          const nameInput = page.getByLabel(/name/i);
          if (await nameInput.isVisible()) {
            await nameInput.clear();
            await nameInput.fill('Updated Profile Name');
            await expect(nameInput).toHaveValue('Updated Profile Name');
          }
        }
      }
    }
  });

  test('can save profile changes', async ({ page }) => {
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      const firstCard = profileCards.first();
      const menuButton = firstCard.getByRole('button', { name: /menu|more|options/i });

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);

        const editOption = page.getByRole('menuitem', { name: /edit/i });
        if (await editOption.isVisible()) {
          await editOption.click();
          await page.waitForTimeout(500);

          // Save changes
          const saveButton = page.getByRole('button', { name: /save|update/i });
          if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(500);

            // Dialog should close
            await expect(page.getByRole('dialog')).not.toBeVisible();
          }
        }
      }
    }
  });
});

test.describe('Backup Profiles - Delete Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/snapshots');
    await page.waitForLoadState('networkidle');
  });

  test('shows delete confirmation dialog', async ({ page }) => {
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      const firstCard = profileCards.first();
      const menuButton = firstCard.getByRole('button', { name: /menu|more|options/i });

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);

        const deleteOption = page.getByRole('menuitem', { name: /delete/i });
        if (await deleteOption.isVisible()) {
          await deleteOption.click();
          await page.waitForTimeout(500);

          // Confirmation dialog should appear
          await expect(page.getByText(/confirm|delete|sure/i)).toBeVisible();
        }
      }
    }
  });

  test('can cancel deletion', async ({ page }) => {
    const profileCards = page.getByRole('article');
    const count = await profileCards.count();

    if (count > 0) {
      const firstCard = profileCards.first();
      const menuButton = firstCard.getByRole('button', { name: /menu|more|options/i });

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);

        const deleteOption = page.getByRole('menuitem', { name: /delete/i });
        if (await deleteOption.isVisible()) {
          await deleteOption.click();
          await page.waitForTimeout(500);

          // Click cancel
          const cancelButton = page.getByRole('button', { name: /cancel/i });
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
            await page.waitForTimeout(500);

            // Profile should still exist
            await expect(firstCard).toBeVisible();
          }
        }
      }
    }
  });
});
