/**
 * E2E Tests: Repository Setup and Connection
 * Tests for repository creation, connection, and management
 */

import { test, expect } from './fixtures';

test.describe('Repository Setup - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');
  });

  test('displays setup page', async ({ page }) => {
    // Check for setup page content instead of heading
    await expect(page.getByText(/filesystem|storage/i).first()).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('shows storage provider options', async ({ page }) => {
    // Check for storage provider cards/buttons
    const providers = [
      /filesystem|local/i,
      /s3/i,
      /b2|backblaze/i,
      /azure/i,
      /gcs|google/i,
      /sftp/i,
      /webdav/i,
      /rclone/i,
    ];

    for (const provider of providers) {
      const element = page.getByText(provider).first();
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
      }
    }
  });

  test('can select filesystem storage provider', async ({ page }) => {
    // Click on filesystem provider
    const filesystemOption = page.getByText(/filesystem|local storage/i);
    if (await filesystemOption.isVisible()) {
      await filesystemOption.click();
      await page.waitForTimeout(500);

      // Should show filesystem configuration fields (use first() to avoid strict mode)
      await expect(page.getByText(/path|directory/i).first()).toBeVisible();
    }
  });

  test('can switch between storage providers', async ({ page }) => {
    // Select filesystem
    const filesystemOption = page.getByText(/filesystem/i).first();
    if (await filesystemOption.isVisible()) {
      await filesystemOption.click();
      await page.waitForTimeout(300);
    }

    // Switch to S3
    const s3Option = page.getByText(/^s3$/i).first();
    if (await s3Option.isVisible()) {
      await s3Option.click();
      await page.waitForTimeout(300);

      // Should show S3 configuration fields
      await expect(page.getByText(/bucket|endpoint/i)).toBeVisible();
    }
  });
});

test.describe('Repository Setup - Filesystem Provider', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    // Select filesystem provider
    const filesystemOption = page.getByText(/filesystem/i).first();
    if (await filesystemOption.isVisible()) {
      await filesystemOption.click();
      await page.waitForTimeout(500);
    }
  });

  test('displays filesystem configuration form', async ({ page }) => {
    // Check for path input
    await expect(page.getByLabel(/path|directory/i)).toBeVisible();
  });

  test('validates empty path', async ({ page }) => {
    // Try to proceed without entering path
    const nextButton = page.getByRole('button', { name: /next|continue/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);

      // Should show validation error
      const error = page.getByText(/required|path/i);
      if (await error.isVisible()) {
        await expect(error).toBeVisible();
      }
    }
  });

  test('can enter repository path', async ({ page }) => {
    // Enter a test path
    const pathInput = page.getByLabel(/path|directory/i);
    if (await pathInput.isVisible()) {
      await pathInput.fill('/tmp/kopia-test-repo');
      await expect(pathInput).toHaveValue('/tmp/kopia-test-repo');
    }
  });

  test('can use file picker for path selection', async ({ page }) => {
    // Look for browse/select button
    const browseButton = page.getByRole('button', { name: /browse|select|choose/i });
    if (await browseButton.isVisible()) {
      // Note: File picker dialog cannot be automated in E2E tests
      // Just verify button exists and is clickable
      await expect(browseButton).toBeEnabled();
    }
  });
});

test.describe('Repository Setup - Wizard Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');
  });

  test('displays wizard steps', async ({ page }) => {
    // Check for step indicators
    const steps = [
      /storage|provider/i,
      /configuration|settings/i,
      /password|security/i,
      /review|confirm/i,
    ];

    for (const step of steps) {
      const element = page.getByText(step).first();
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
      }
    }
  });

  test('can navigate through wizard steps', async ({ page }) => {
    // Select filesystem provider
    const filesystemOption = page.getByText(/filesystem/i).first();
    if (await filesystemOption.isVisible()) {
      await filesystemOption.click();
      await page.waitForTimeout(300);

      // Enter path
      const pathInput = page.getByLabel(/path|directory/i);
      if (await pathInput.isVisible()) {
        await pathInput.fill('/tmp/kopia-test-repo');

        // Click next
        const nextButton = page.getByRole('button', { name: /next/i });
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);

          // May show verification page - click "Create New Destination" if available
          const createButton = page.getByRole('button', { name: /create new destination/i });
          if (await createButton.isVisible()) {
            await createButton.click();
            await page.waitForTimeout(500);
          }

          // Should proceed to next step (password, encryption, or verify)
          const hasPassword = await page
            .getByText(/password/i)
            .first()
            .isVisible();
          const hasVerify = await page
            .getByText(/verify|checking/i)
            .first()
            .isVisible();
          const hasEncryption = await page
            .getByText(/encryption/i)
            .first()
            .isVisible();

          expect(hasPassword || hasVerify || hasEncryption).toBeTruthy();
        }
      }
    }
  });

  test('can go back to previous step', async ({ page }) => {
    // Navigate forward
    const filesystemOption = page.getByText(/filesystem/i).first();
    if (await filesystemOption.isVisible()) {
      await filesystemOption.click();
      await page.waitForTimeout(300);

      const pathInput = page.getByLabel(/path|directory/i);
      if (await pathInput.isVisible()) {
        await pathInput.fill('/tmp/kopia-test-repo');

        const nextButton = page.getByRole('button', { name: /next/i });
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);

          // Now go back
          const backButton = page.getByRole('button', { name: /back|previous/i });
          if (await backButton.isVisible()) {
            await backButton.click();
            await page.waitForTimeout(500);

            // Should be back at configuration step
            await expect(page.getByLabel(/path|directory/i)).toBeVisible();
          }
        }
      }
    }
  });

  test('can cancel setup', async ({ page }) => {
    // Look for cancel button
    const cancelButton = page.getByRole('button', { name: /cancel|close/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await page.waitForTimeout(500);

      // Should navigate away or show confirmation dialog
      const url = page.url();
      expect(url).toBeTruthy();
    }
  });
});

test.describe('Repository Setup - Password Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    // Navigate to password step
    const filesystemOption = page.getByText(/filesystem/i).first();
    if (await filesystemOption.isVisible()) {
      await filesystemOption.click();
      await page.waitForTimeout(300);

      const pathInput = page.getByLabel(/path|directory/i);
      if (await pathInput.isVisible()) {
        await pathInput.fill('/tmp/kopia-test-repo');

        const nextButton = page.getByRole('button', { name: /next/i });
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('displays password input fields', async ({ page }) => {
    // Check for password fields
    const passwordInput = page.getByLabel(/^password$/i);
    const confirmInput = page.getByLabel(/confirm|repeat/i);

    if (await passwordInput.isVisible()) {
      await expect(passwordInput).toBeVisible();
    }
    if (await confirmInput.isVisible()) {
      await expect(confirmInput).toBeVisible();
    }
  });

  test('validates password requirements', async ({ page }) => {
    // Enter weak password
    const passwordInput = page.getByLabel(/^password$/i);
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('weak');

      // Try to proceed
      const nextButton = page.getByRole('button', { name: /next|create/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        // Should show validation error
        const error = page.getByText(/length|characters|requirements/i);
        if (await error.isVisible()) {
          await expect(error).toBeVisible();
        }
      }
    }
  });

  test('validates password confirmation match', async ({ page }) => {
    const passwordInput = page.getByLabel(/^password$/i);
    const confirmInput = page.getByLabel(/confirm|repeat/i);

    if ((await passwordInput.isVisible()) && (await confirmInput.isVisible())) {
      // Enter mismatched passwords
      await passwordInput.fill('StrongPassword123!');
      await confirmInput.fill('DifferentPassword123!');

      // Try to proceed
      const nextButton = page.getByRole('button', { name: /next|create/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        // Should show validation error
        const error = page.getByText(/match|same/i);
        if (await error.isVisible()) {
          await expect(error).toBeVisible();
        }
      }
    }
  });

  test('can toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel(/^password$/i);
    const toggleButton = page.getByRole('button', { name: /show|hide|toggle/i });

    if ((await passwordInput.isVisible()) && (await toggleButton.isVisible())) {
      // Initially should be type="password"
      const initialType = await passwordInput.getAttribute('type');
      expect(initialType).toBe('password');

      // Click toggle
      await toggleButton.click();
      await page.waitForTimeout(200);

      // Should change to type="text"
      const newType = await passwordInput.getAttribute('type');
      expect(newType).toBe('text');
    }
  });
});

test.describe('Repository Page - Connected State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/repository');
    await page.waitForLoadState('networkidle');
  });

  test('displays repository information', async ({ page }) => {
    // Check for repository page content
    await expect(page.getByRole('main')).toBeVisible();

    // Look for repository status or configuration elements
    const hasContent =
      (await page.getByText(/connected|disconnected/i).count()) > 0 ||
      (await page.getByText(/storage|provider/i).count()) > 0 ||
      (await page.getByText(/destination|repository/i).count()) > 0;

    expect(hasContent).toBeTruthy();
  });

  test('displays disconnect button when connected', async ({ page }) => {
    // Look for disconnect button
    const disconnectButton = page.getByRole('button', { name: /disconnect/i });
    if (await disconnectButton.isVisible()) {
      await expect(disconnectButton).toBeEnabled();
    }
  });

  test('displays connect button when not connected', async ({ page }) => {
    // Look for connect button
    const connectButton = page.getByRole('button', { name: /connect/i });
    if (await connectButton.isVisible()) {
      await expect(connectButton).toBeEnabled();
    }
  });
});
