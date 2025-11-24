# E2E Testing Guide

End-to-end testing for Kopia Desktop using Playwright.

## 📋 Overview

This directory contains E2E tests that verify the complete user workflows in Kopia Desktop:

- **Navigation & Routing** - Page navigation, protected routes, deep linking
- **Preferences** - Theme switching, language selection, font size, byte format
- **Repository Setup** - Storage provider selection, configuration, password setup
- **Backup Profiles** - Profile creation, editing, deletion, and management

## 🎯 Test Coverage

### Test Files

| File                  | Tests     | Description                                            |
| --------------------- | --------- | ------------------------------------------------------ |
| `navigation.spec.ts`  | ~15 tests | Navigation, routing, protected routes, breadcrumbs     |
| `preferences.spec.ts` | ~20 tests | Theme, language, font size, byte format preferences    |
| `repository.spec.ts`  | ~15 tests | Repository setup wizard, storage providers, connection |
| `profiles.spec.ts`    | ~20 tests | Backup profile CRUD operations, tabs, search           |
| `fixtures.ts`         | -         | Shared test helpers and utilities                      |

**Total: ~70 E2E tests**

### What's Tested

✅ **User Interface**

- Page rendering and layout
- Sidebar navigation
- Mobile responsive behavior
- Theme switching (light/dark/system)
- Language switching (English/Spanish)

✅ **User Flows**

- First-time setup wizard
- Repository creation and connection
- Backup profile management
- Preferences configuration

✅ **Validation**

- Form field validation
- Password requirements
- Required field checks
- Error message display

✅ **Navigation**

- Deep linking to pages
- Browser back/forward
- Protected route redirects
- 404 handling

## 🚀 Running Tests

### Prerequisites

```bash
# Install dependencies (if not already done)
pnpm install

# Install Playwright browsers
pnpm exec playwright install chromium
```

### Run All Tests

```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui

# Run in debug mode (step through tests)
pnpm test:e2e:debug
```

### Run Specific Tests

```bash
# Run single test file
pnpm exec playwright test navigation.spec.ts

# Run tests matching a pattern
pnpm exec playwright test --grep "theme"

# Run specific test by line number
pnpm exec playwright test navigation.spec.ts:15
```

### Watch Mode

```bash
# Run tests in watch mode (re-run on file changes)
pnpm exec playwright test --watch
```

### View Test Report

```bash
# Open HTML report after test run
pnpm exec playwright show-report
```

## 📝 Writing New Tests

### Test Structure

```typescript
import { test, expect, navigateToPage } from './fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await navigateToPage(page, 'Preferences');

    // Act
    await page.getByRole('button', { name: /save/i }).click();

    // Assert
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

### Using Fixtures and Helpers

```typescript
import {
  test,
  expect,
  navigateToPage,
  waitForNavigation,
  clickButton,
  fillInput,
  expectVisible,
  expectText,
  waitForToast,
  checkTheme,
} from './fixtures';

test('example using helpers', async ({ page }) => {
  // Navigate using helper
  await navigateToPage(page, 'Preferences');

  // Wait for navigation
  await waitForNavigation(page, '/preferences');

  // Check visibility
  await expectVisible(page, '[data-testid="theme-selector"]');

  // Check theme
  await checkTheme(page, 'dark');

  // Wait for toast notification
  await waitForToast(page, /saved successfully/i);
});
```

### Best Practices

✅ **Do:**

- Use semantic selectors (`getByRole`, `getByLabel`, `getByText`)
- Add `data-testid` attributes for stable selectors
- Use helpers from `fixtures.ts` for common actions
- Wait for network to be idle before assertions
- Use descriptive test names
- Group related tests with `test.describe`
- Check visibility before interacting with elements

❌ **Don't:**

- Use fragile CSS selectors (`.class-name-123`)
- Hard-code timing delays (use `waitFor*` methods)
- Test implementation details
- Make tests depend on each other
- Forget to clean up state between tests

## 🔧 Configuration

### Playwright Config

Key settings in `playwright.config.ts`:

```typescript
{
  testDir: './tests/e2e',
  timeout: 60000,                    // 60 seconds per test
  actionTimeout: 10000,              // 10 seconds per action
  navigationTimeout: 30000,          // 30 seconds for navigation
  webServer: {
    command: 'pnpm tauri:dev',       // Starts Tauri app
    url: 'http://localhost:1420',
    timeout: 120000,                 // 2 minutes to start
  },
}
```

### Browser Configuration

By default, tests run on **Chromium**. To enable other browsers:

```typescript
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } }, // Uncomment
  { name: 'webkit', use: { ...devices['Desktop Safari'] } }, // Uncomment
];
```

## 🐛 Debugging Tests

### Visual Debugging

```bash
# Run with headed browser (see what's happening)
pnpm exec playwright test --headed

# Run with UI mode (interactive test explorer)
pnpm test:e2e:ui

# Debug specific test
pnpm exec playwright test navigation.spec.ts --debug
```

### Using Playwright Inspector

```bash
# Pause on failure
pnpm exec playwright test --debug

# Pause at specific line
# Add: await page.pause(); in your test
```

### Screenshots and Videos

Tests automatically capture:

- **Screenshots** on failure (`test-results/`)
- **Videos** on failure (if configured)
- **Traces** on retry (`trace: 'on-first-retry'`)

View traces:

```bash
pnpm exec playwright show-trace test-results/.../trace.zip
```

## 📊 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## 🔍 Test Selectors Priority

1. **User-visible text** - `getByRole`, `getByLabel`, `getByText`
2. **Test IDs** - `data-testid="component-name"`
3. **CSS selectors** - Last resort, avoid if possible

### Examples

```typescript
// ✅ Good - semantic selectors
await page.getByRole('button', { name: /save/i });
await page.getByLabel('Email');
await page.getByText('Welcome');

// ✅ Good - test IDs for stability
await page.locator('[data-testid="profile-card"]');

// ⚠️ Avoid - fragile CSS selectors
await page.locator('.btn-primary-123');
await page.locator('div > span:nth-child(2)');
```

## 📈 Test Coverage Goals

Current coverage:

- ✅ Navigation & routing (100%)
- ✅ Preferences management (90%)
- ✅ Repository setup (80%)
- ✅ Backup profiles (85%)
- ❌ Snapshot management (0% - TODO)
- ❌ Policy editing (0% - TODO)
- ❌ Task monitoring (0% - TODO)

## 🎓 Learning Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library Queries](https://testing-library.com/docs/queries/about/)
- [Tauri Testing Guide](https://tauri.app/v1/guides/testing/)

## 🔜 Roadmap

### High Priority

1. Add snapshot management tests
2. Add policy editing tests
3. Add task monitoring tests
4. Improve test stability and reliability

### Medium Priority

5. Add visual regression tests
6. Add accessibility (a11y) tests
7. Add performance tests
8. Test error scenarios comprehensively

### Low Priority

9. Multi-browser testing (Firefox, Safari)
10. Mobile viewport testing
11. Test different OS platforms

## 💡 Tips & Tricks

### Speed Up Tests

```bash
# Run tests in parallel (default)
pnpm test:e2e

# Run tests in serial (slower but more stable)
pnpm exec playwright test --workers=1

# Run only changed tests
pnpm exec playwright test --only-changed
```

### Selective Testing

```bash
# Run tests with specific tag
pnpm exec playwright test --grep @smoke

# Skip flaky tests
pnpm exec playwright test --grep-invert @flaky
```

### Generate Tests

```bash
# Record tests using Codegen
pnpm exec playwright codegen http://localhost:1420
```

## 📞 Support

For issues or questions:

1. Check Playwright docs: https://playwright.dev/
2. Open an issue on GitHub
3. Review test examples in this directory

---

**Last Updated:** 2025-11-24
**Total E2E Tests:** ~70
**Coverage:** Core user workflows
