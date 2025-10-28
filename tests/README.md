# Test Organization

This directory contains all tests for the Kopia-UI project, organized by test type.

## Directory Structure

```
tests/
├── setup.ts                      # Vitest global setup (React Testing Library)
├── unit/                         # Unit tests (fast, isolated)
│   └── lib/
│       └── kopia/
│           └── client.test.ts    # API client tests
│
├── integration/                  # Integration tests (multiple units)
│   └── (to be added in Phase 2)
│
└── e2e/                          # End-to-end tests (Playwright)
    └── example.spec.ts           # Example E2E test
```

## Test Types

### Unit Tests (`tests/unit/`)

- **Purpose**: Test individual functions/components in isolation
- **Naming**: `*.test.ts` or `*.test.tsx`
- **Speed**: Fast (< 1ms per test)
- **Mocking**: Heavy use of mocks (e.g., Tauri API)
- **Run**: `pnpm test` or `pnpm test:run`

**Examples:**

- Validation schema tests
- API client function tests
- Utility function tests
- Individual component tests

### Integration Tests (`tests/integration/`)

- **Purpose**: Test multiple units working together
- **Naming**: `*.test.ts` or `*.test.tsx`
- **Speed**: Medium (10-100ms per test)
- **Mocking**: Minimal mocking, test real interactions
- **Run**: `pnpm test` or `pnpm test:run`

**Examples:**

- Form submission flows
- Repository connection flows
- Multi-component interactions

### E2E Tests (`tests/e2e/`)

- **Purpose**: Test complete user workflows
- **Naming**: `*.spec.ts`
- **Speed**: Slow (seconds per test)
- **Mocking**: No mocking, test real app
- **Run**: `pnpm test:e2e`

**Examples:**

- Connect to repository → Create snapshot → Restore files
- Complete policy configuration workflow
- Multi-window scenarios

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/lib/utils/format.test.ts
import { describe, expect, it } from 'vitest';
import { formatBytes } from '@/lib/utils/format';

describe('formatBytes', () => {
  it('formats bytes to human-readable string', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });
});
```

### Integration Test Example

```typescript
// tests/integration/repository-connection.test.ts
import { render, screen, userEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RepositoryConnectionForm } from '@/components/repository/ConnectionForm';

describe('Repository Connection Flow', () => {
  it('connects to filesystem repository', async () => {
    render(<RepositoryConnectionForm />);

    await userEvent.selectOptions(screen.getByLabelText('Storage Type'), 'filesystem');
    await userEvent.type(screen.getByLabelText('Path'), '/backup/repo');
    await userEvent.type(screen.getByLabelText('Password'), 'SecurePass123');
    await userEvent.click(screen.getByText('Connect'));

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/snapshot-restore.spec.ts
import { test, expect } from '@playwright/test';

test('create snapshot and restore files', async ({ page }) => {
  await page.goto('/');

  // Connect to repository
  await page.click('text=Connect Repository');
  await page.fill('[name="path"]', '/backup/repo');
  await page.fill('[name="password"]', 'SecurePass123');
  await page.click('button:has-text("Connect")');
  await expect(page.locator('text=Connected')).toBeVisible();

  // Create snapshot
  await page.click('text=Snapshots');
  await page.click('text=Snapshot Now');
  await page.fill('[name="path"]', '/home/user/documents');
  await page.click('button:has-text("Create")');
  await expect(page.locator('text=Snapshot complete')).toBeVisible({ timeout: 60000 });

  // Restore files
  await page.click('text=Browse');
  await page.click('.file-item:has-text("document.txt")');
  await page.click('text=Restore');
  await page.fill('[name="targetPath"]', '/tmp/restore');
  await page.click('button:has-text("Restore")');
  await expect(page.locator('text=Restore complete')).toBeVisible({ timeout: 60000 });
});
```

## Running Tests

### All Unit & Integration Tests

```bash
pnpm test              # Watch mode (re-runs on file changes)
pnpm test:run          # Single run
pnpm test:coverage     # With coverage report
pnpm test:ui           # Vitest UI dashboard
```

### E2E Tests Only

```bash
pnpm test:e2e          # Headless mode
pnpm test:e2e:ui       # Headed mode (see browser)
pnpm test:e2e:debug    # Debug mode
```

### Specific Test File

```bash
pnpm test tests/unit/lib/kopia/client.test.ts
```

### Specific Test Pattern

```bash
pnpm test --grep "Repository"
```

## Test Utilities

### Global Test Setup

- **File**: `tests/setup.ts`
- **Purpose**: Configure React Testing Library, global mocks
- **Auto-loaded**: Yes (configured in vitest.config.ts)

### Common Mocks

```typescript
// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));
```

### Testing Library Utilities

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Render component
render(<MyComponent />);

// Query elements
screen.getByText('Click me');
screen.getByLabelText('Username');
screen.getByRole('button', { name: 'Submit' });

// User interactions
await userEvent.click(screen.getByText('Click me'));
await userEvent.type(screen.getByLabelText('Username'), 'javi');

// Async assertions
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

## Coverage Requirements

- **Minimum**: 80% coverage for `lib/`, `hooks/`, `utils/`
- **Components**: 70% coverage
- **Pages**: No strict requirement (covered by E2E tests)

**View Coverage Report:**

```bash
pnpm test:coverage
open coverage/index.html
```

## Best Practices

### ✅ Do

- Test behavior, not implementation
- Use semantic queries (`getByRole`, `getByLabelText`)
- Mock external dependencies (Tauri, HTTP)
- Test error states
- Test loading states
- Use descriptive test names
- Group related tests with `describe`

### ❌ Don't

- Test implementation details (CSS classes, internal state)
- Use snapshot tests for everything
- Write overly complex tests
- Mock everything (integration tests should use real code)
- Skip E2E tests for critical paths

## Debugging Tests

### Watch Mode with Filtering

```bash
pnpm test --grep "Repository connection"
```

### Vitest UI

```bash
pnpm test:ui
# Opens browser at http://localhost:51204
```

### Debug in VS Code

1. Set breakpoint in test file
2. Run "Debug Test" from VS Code test sidebar
3. Or use launch config: "Debug Vitest Tests"

### Playwright Debug

```bash
pnpm test:e2e:debug
# Opens Playwright Inspector
```

## CI/CD

Tests run automatically on:

- **Push to any branch**: Unit + Integration tests
- **Pull Request**: All tests (Unit + Integration + E2E)
- **Main branch**: All tests + Coverage report

**GitHub Actions Config**: `.github/workflows/ci.yml`

## Troubleshooting

### Tests not found

- Check `vitest.config.ts` include patterns
- Ensure test files match `*.test.ts` or `*.test.tsx`
- Run `pnpm test --reporter=verbose` for details

### Import errors

- Tests use `@/` alias (e.g., `@/lib/utils`)
- Ensure `tsconfig.json` has path aliases
- Check `vitest.config.ts` resolve.alias

### Timeout errors

- Increase timeout: `{ timeout: 10000 }` in test/describe
- Or globally in `vitest.config.ts`: `testTimeout: 10000`

### Coverage not matching

- Check `coverage.exclude` in `vitest.config.ts`
- Run `pnpm test:coverage --reporter=verbose`

## Resources

- **Vitest Docs**: https://vitest.dev/
- **Testing Library**: https://testing-library.com/
- **Playwright**: https://playwright.dev/
- **React Testing Best Practices**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library

---

**Questions?** Ask in the project chat or check the main [README.md](../README.md).
