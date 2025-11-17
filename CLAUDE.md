# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Kopia-Desktop** - Modern desktop app for Kopia backup management.

A React + Tauri application providing a user-friendly interface for managing Kopia backups: repositories, snapshots, policies, tasks, restore operations, and backup profiles.

### Current Status

**Fully Implemented:**

- ✅ Complete Kopia server lifecycle management (start/stop/status/health checks)
- ✅ 50 Tauri commands (42 Kopia API + 5 system utilities + 3 WebSocket)
- ✅ 15 functional pages (Overview, Repository, Profiles, ProfileHistory, Snapshots, SnapshotCreate, SnapshotHistory, SnapshotBrowse, SnapshotRestore, Policies, PolicyEdit, Tasks, Mounts, Preferences, Setup, NotFound)
- ✅ Repository setup wizard with 8 storage providers (Filesystem, S3, B2, Azure, GCS, SFTP, WebDAV, Rclone)
- ✅ Backup profiles system for managing multiple backup configurations
- ✅ Theme system (light/dark/system) with next-themes + Zustand
- ✅ Font size preferences with Zustand
- ✅ Byte format preference (Base-2 vs Base-10) with Zustand
- ✅ i18n/translations (English + Spanish) with react-i18next
- ✅ Comprehensive error handling with 46 `KopiaError` variants
- ✅ Global Kopia state store with Zustand (centralized polling + WebSocket + mount management)
- ✅ 9 custom hooks (useKopiaServer, useRepository, useSnapshots, usePolicies, useTasks, useMounts, useProviderConfig, useIsMobile, useToast)
- ✅ Native file/folder pickers via Tauri dialog plugin
- ✅ 20 shadcn/ui components (accordion, alert, alert-dialog, badge, breadcrumb, button, card, checkbox, collapsible, dialog, input, label, progress, select, separator, sheet, spinner, switch, tabs, textarea, table, sonner)
- ✅ 53 custom components (layout: 5, Kopia-specific: 23, UI: 20, setup: 13, notifications: 5, policy: 1, profiles: 1, snapshots: 2)
- ✅ WebSocket support with intelligent fallback to polling
- ✅ Recharts integration for data visualization (animations disabled to prevent re-renders)
- ✅ Snapshot cancel functionality
- ✅ Snapshot pin system (add/remove pins to protect snapshots from deletion)
- ✅ Retention tags display (color-coded badges for retention policies)
- ✅ Source deletion when no snapshots remain (delete source + policy)
- ✅ System tray integration (show/hide window, quit menu)
- ✅ Desktop notifications for task completion
- ✅ Snapshot mounting (mount/unmount snapshots as local filesystems)
- ✅ Custom window decorations with titlebar
- ✅ Window close handler with minimize to tray
- ✅ Comprehensive Rust backend testing (146 passing tests: 136 unit + 10 integration, ~65% coverage)
- ✅ Kopia API integration tests (10 tests with real Kopia binary)
- ✅ **Workflow parity with official Kopia HTMLui achieved** (pins, retention tags, source deletion)

**Not Yet Implemented:**

- ❌ Form validation with Zod (package not installed, using manual validation)
- ❌ Frontend test coverage (vitest configured, 74 wrapper tests written but low value)
- ❌ Auto-updates
- ❌ E2E tests with Playwright (configured but tests not written)

---

## Quick Start

```bash
pnpm install          # Install dependencies (auto-downloads Kopia binary)
pnpm tauri:dev        # Start Tauri app in development mode
pnpm tauri:build      # Build production app
pnpm lint             # Lint and auto-fix code
pnpm typecheck        # Type check TypeScript
pnpm validate         # Run all checks (typecheck, lint:check, format:check, test:run)
pnpm validate:fix     # Run all checks with auto-fix (typecheck, lint, format, test:run)
pnpm test:rust        # Run Rust backend tests (146 tests: 136 unit + 10 integration)
```

---

## Tech Stack

**Frontend:**

- React 19.2 + TypeScript 5.9 (strict mode)
- Vite 7.1 (bundling + HMR)
- Tailwind CSS 4.1 + shadcn/ui (Radix UI primitives)
- React Router v7.9
- Zustand 5.0 (6 stores: theme, language, fontSize, preferences, profiles, kopia)
- i18next 25.6 + react-i18next 16.2 (internationalization)
- Recharts 3.3 (data visualization & charts)
- Sonner 2.0 (toast notifications)
- Lucide React 0.548 (icons)
- next-themes 0.4 (advanced theme management with system detection)

**Backend:**

- Tauri 2.9 (Rust) with tray-icon feature
- reqwest 0.11 (HTTP client for Kopia API)
- tokio 1.x (async runtime with full features)
- tokio-tungstenite 0.24 (WebSocket client with native-tls)
- serde/serde_json (serialization)
- hostname 0.3 (system hostname detection)
- base64 0.22 (encoding/decoding)
- urlencoding 2 (URL encoding)
- thiserror 1.0 (error handling)
- rand 0.8 (random generation for passwords)
- Tauri plugins: shell, notification, dialog

**Testing:**

- Vitest 4.0 (74 frontend wrapper tests - low value, only test invoke() calls)
- Playwright 1.56 (E2E tests, configured but not written)
- Rust cargo test (146 passing tests: 136 unit + 10 integration with real Kopia binary)
- cargo-llvm-cov (code coverage for Rust)
- tempfile 3.x (temporary directories for integration tests)

**Import Aliases:**

```typescript
@/*  // Maps to ./src/* (e.g., @/components/ui/button)
```

**React Router v7:**

- All imports use `react-router` (unified package)
- No more `react-router-dom` (deprecated in v7)

---

## Kopia Backend Architecture

**Approach:** Embedded Server Mode (matches official KopiaUI)

### How It Works

1. Tauri **bundles `kopia` binary** (platform-specific, auto-downloaded during `pnpm install`)
2. Backend process **spawns `kopia server start --ui`** on app launch
3. React UI communicates via **REST API** + **WebSocket** (for real-time updates)
4. Server **shuts down gracefully** with app (on window close or quit from tray)

### Communication Flow

```
React UI (Frontend)
    ↓ HTTP/REST API + WebSocket
Tauri Backend (Rust)
    ↓ spawns
Kopia Server (localhost:random-port)
    ↓
Repositories / Snapshots / Storage
```

**Key Points:**

- Localhost-only (no remote access)
- TLS with self-signed cert
- Random password per session (24 chars)
- Hybrid architecture: WebSocket for real-time events + polling for reliability

---

## State Management Architecture

**Centralized Zustand Store** ([src/stores/kopia.ts](src/stores/kopia.ts))

**Polling Configuration:**

- **Server/Repository/Maintenance:** 30 seconds
- **Tasks/Sources:** 5 seconds (real-time updates)

**WebSocket + Polling Hybrid:**

- WebSocket provides instant updates during active operations (progress bars, byte counts)
- Polling ensures reliable state transitions (UPLOADING → IDLE, RUNNING → SUCCESS)
- Both run simultaneously - WebSocket is supplemental, polling is essential

**Key Benefits:**

- ✅ Eliminates redundant API calls (components share same state)
- ✅ Single polling loop instead of per-component polling
- ✅ Consistent state across entire application
- ✅ Simplified hooks (thin wrappers around store selectors)
- ✅ WebSocket fallback to polling if connection fails

**Stores:**

1. **kopia.ts** - Main Kopia state (server, repository, snapshots, sources, policies, tasks, mounts, maintenance)
2. **profiles.ts** - Backup profiles management (CRUD operations, selection)
3. **theme.ts** - Theme state (light/dark/system)
4. **language.ts** - Language state (en/es)
5. **fontSize.ts** - Font size preference
6. **preferences.ts** - User preferences

**Hooks Delegate to Store:**

- `useKopiaServer()` → server state
- `useRepository()` → repository state
- `useSnapshots()` → snapshots/sources state
- `usePolicies()` → policies state
- `useTasks()` → tasks state
- `useMounts()` → mounts state
- `useProviderConfig()` → storage provider configs
- `useIsMobile()` → responsive breakpoints
- `useToast()` → toast notifications

---

## Project Structure

```
kopia-desktop/
├── src/                                  # React frontend
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components (20)
│   │   ├── layout/                       # Layout components (5)
│   │   │   ├── AppLayout.tsx, AppSidebar.tsx, ErrorBoundary.tsx
│   │   │   ├── StatusIndicator.tsx, Titlebar.tsx, WindowCloseHandler.tsx
│   │   └── kopia/                        # Kopia-specific components
│   │       ├── setup/                    # Repository setup wizard
│   │       │   ├── fields/               # Form fields (4)
│   │       │   ├── providers/            # Storage providers (8)
│   │       │   ├── steps/                # Wizard steps (4)
│   │       │   └── SetupRepository.tsx
│   │       ├── snapshots/                # Snapshot components (2)
│   │       │   ├── PinDialog.tsx         # Pin management dialog
│   │       │   └── RetentionTags.tsx     # Retention badge display
│   │       ├── policy/                   # Policy editor (1)
│   │       ├── profiles/                 # Profile management (1)
│   │       └── notifications/            # Notification profiles (5)
│   ├── lib/
│   │   ├── kopia/
│   │   │   ├── client.ts                 # Tauri command wrappers
│   │   │   ├── types.ts                  # TypeScript types
│   │   │   └── errors.ts                 # KopiaError class
│   │   └── utils/                        # Utilities (cn, format, etc.)
│   ├── pages/                            # Route pages (15)
│   │   ├── Overview.tsx, Repository.tsx, Profiles.tsx, ProfileHistory.tsx
│   │   ├── Snapshots.tsx, SnapshotCreate.tsx, SnapshotHistory.tsx
│   │   ├── SnapshotBrowse.tsx, SnapshotRestore.tsx
│   │   ├── Policies.tsx, PolicyEdit.tsx, Tasks.tsx, Mounts.tsx
│   │   ├── Preferences.tsx, Setup.tsx, NotFound.tsx
│   ├── hooks/                            # Custom hooks (9)
│   ├── stores/                           # Zustand stores (6)
│   ├── locales/                          # i18n translations (en, es)
│   ├── App.tsx, main.tsx, routes.tsx
│   └── index.css                         # Tailwind directives
│
├── src-tauri/                            # Rust backend
│   ├── src/
│   │   ├── commands/
│   │   │   ├── kopia.rs                  # 42 Kopia commands
│   │   │   ├── system.rs                 # 5 system commands
│   │   │   └── websocket.rs              # 3 WebSocket commands
│   │   ├── kopia_server.rs               # Server lifecycle & HTTP client
│   │   ├── kopia_websocket.rs            # WebSocket client
│   │   ├── types.rs                      # Rust types
│   │   ├── error.rs                      # Error types & handling (46 variants)
│   │   ├── lib.rs                        # Main entry point
│   │   ├── main.rs                       # Tauri app setup
│   │   └── *_tests.rs                    # Test files (13 files, 136 tests)
│   ├── Cargo.toml, tauri.conf.json
│   ├── build.rs
│   └── TESTING.md                        # Comprehensive testing guide
│
├── bin/                                  # Kopia binaries (dev mode, auto-downloaded)
├── scripts/                              # Utility scripts
│   └── download-kopia.sh                 # Kopia binary download script
└── tests/                                # Frontend tests (empty)
```

---

## Code Conventions

**Imports:**

```typescript
// Always use path aliases
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/utils';
import type { Snapshot } from '@/lib/kopia/types';

// React Router v7 (use 'react-router', not 'react-router-dom')
import { useNavigate } from 'react-router';

// Tauri API
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
```

**State Management Pattern:**

```typescript
// All Kopia data managed through centralized store
// src/stores/kopia.ts
export const useKopiaStore = create<KopiaStore>((set, get) => ({
  // State
  serverStatus, repositoryStatus, snapshots, sources, policies, tasks, mounts,

  // Polling (30s server, 5s tasks/sources)
  startPolling() { /* ... */ },

  // WebSocket (supplemental to polling)
  startWebSocket() { /* ... */ },

  // Actions
  refreshServer, refreshSnapshots, refreshTasks, etc.
}));

// Hooks are thin wrappers
export function useSnapshots() {
  const snapshots = useKopiaStore((state) => state.snapshots);
  const isLoading = useKopiaStore((state) => state.isSnapshotsLoading);
  const refresh = useKopiaStore((state) => state.refreshSnapshots);
  return { snapshots, isLoading, refresh };
}
```

**File Naming:**

- Components/Pages: PascalCase (`SnapshotList.tsx`)
- Hooks: camelCase with `use` prefix (`useSnapshots.ts`)
- Utils/Types: camelCase (`errors.ts`, `types.ts`)
- Stores: camelCase (`kopia.ts`)

---

## Tauri Commands (Backend API)

**50 commands total:**

**Server (3):**

- `kopia_server_start`, `kopia_server_stop`, `kopia_server_status`

**Repository (9):**

- `repository_status`, `repository_connect`, `repository_disconnect`
- `repository_create`, `repository_exists`, `repository_get_algorithms`
- `repository_update_description`

**Snapshots (6):**

- `sources_list`, `snapshot_create`, `snapshot_cancel`
- `snapshots_list`, `snapshot_edit`, `snapshot_delete`

**Browsing (2):**

- `object_browse`, `object_download`

**Restore (4):**

- `restore_start`, `mount_snapshot`, `mounts_list`, `mount_unmount`

**Policies (5):**

- `policies_list`, `policy_get`, `policy_resolve`, `policy_set`, `policy_delete`

**Tasks (4):**

- `tasks_list`, `task_get`, `task_logs`, `task_cancel`, `tasks_summary`

**Maintenance (2):**

- `maintenance_info`, `maintenance_run`

**Utilities (4):**

- `path_resolve`, `estimate_snapshot`, `ui_preferences_get`, `ui_preferences_set`

**Notifications (4):**

- `notification_profiles_list`, `notification_profile_create`
- `notification_profile_delete`, `notification_profile_test`

**System (5):**

- `get_system_info`, `get_current_user`, `select_folder`, `select_file`, `save_file`

**WebSocket (3):**

- `websocket_connect`, `websocket_disconnect`, `websocket_status`

---

## Key Kopia Concepts

### Policy Inheritance

```
Global (*/*/*) → Per-Host (@host/*/*) → Per-User (user@host/*) → Per-Path (user@host/path)
```

### Snapshot Sources

Format: `user@host:/path` (e.g., `javi@laptop:/home/javi/documents`)

### Backup Profiles

- User-defined backup configurations stored in Zustand
- Each profile contains: name, path, description, schedule, policy settings
- Profiles can be created, edited, deleted, and selected for snapshots
- Profile history shows snapshot timeline for each profile

### Repository Config

- Location: `~/.config/kopia/` (Linux/macOS) or `%APPDATA%\kopia` (Windows)
- Files: `*.config` (one per repository)
- Authentication: Password required, random password per session
- HTTPS: Self-signed cert for localhost

### Critical Warnings for UI

1. **Password Loss** - No recovery possible, must warn prominently
2. **Repository Maintenance** - Can take hours for large repos
3. **Incomplete Snapshots** - Checkpoint behavior must be clear
4. **Deletion** - Snapshots and repositories are unrecoverable

---

## Error Handling

Use the centralized `KopiaError` class with 46 variants:

```typescript
import { getErrorMessage } from '@/lib/utils';
import { isNotConnectedError } from '@/lib/kopia/errors';

try {
  await someKopiaOperation();
} catch (err) {
  const message = getErrorMessage(err);
  toast.error(message);

  if (isNotConnectedError(err)) {
    navigate('/setup');
  }
}
```

**Rust Error Handling:**

All 46 error variants are tested with:

- Basic tests (7): display, serialization, conversions, equality
- Advanced tests (12): all variants, optional fields, error chains
- Edge cases (17): empty strings, unicode, boundaries, large collections

---

## Development Best Practices

**Security:**

- Never log sensitive data (passwords, tokens)
- Validate all user inputs
- Sanitize file paths
- Use Rust's type system for safety

**Performance:**

- Lazy load large data sets
- Centralized polling (30s server, 5s tasks/sources)
- Clean up listeners/timers on unmount
- Disable chart animations to prevent re-render issues (`isAnimationActive={false}`)

**User Experience:**

- Clear empty states with CTAs
- Show inherited vs overridden policy values
- Provide sensible defaults in forms
- Toast notifications for background operations
- Support keyboard navigation
- Minimize to tray on window close (don't quit)

**Code Quality:**

- Run `pnpm validate` before committing (typecheck, lint:check, format:check, test:run)
- Use `pnpm validate:fix` for auto-fixes
- Write descriptive commit messages
- Test Rust code with `pnpm test:rust`
- Use `pnpm test:rust:coverage:html` for coverage reports

---

## Testing

### Frontend (Minimal Coverage)

- **74 wrapper tests** - Test TypeScript invoke() calls only (low value)
- Vitest configured
- Playwright configured but no E2E tests written
- Testing Library installed for future React component tests

### Backend (Fully Implemented)

- **146 passing tests** (100% success rate)
  - **136 unit tests** - Core functionality, error handling, edge cases
  - **10 integration tests** - Real Kopia binary API interactions
- **~65% code coverage** (realistic maximum without full integration)
- **All critical paths tested**

**Run Tests:**

```bash
pnpm test:rust                    # Run all unit tests (136 tests)
pnpm test:rust:coverage           # Generate coverage report
pnpm test:rust:coverage:html      # Open coverage in browser

# Integration tests (require Kopia binary)
KOPIA_PATH=/path/to/bin/kopia-linux-x64 cargo test --lib kopia_api_integration -- --ignored --test-threads=1
```

**Integration Test Coverage:**

- Server Lifecycle (7 tests): start/stop, status, HTTP client, URL retrieval, uptime
- Repository API (2 tests): algorithms endpoint, status endpoint
- Error Handling (3 tests): stop when not running, double start, operation validation

**See [src-tauri/TESTING.md](src-tauri/TESTING.md) for comprehensive testing guide.**

---

## Recent Improvements

✅ **Workflow Parity with Official Kopia (November 2025):**

- **Snapshot Pin System** - Add/remove pins to protect snapshots from automatic deletion by retention policies
- **Retention Tags Display** - Color-coded badges showing retention policies (latest-N, hourly-N, daily-N, etc.)
- **Source Deletion** - Delete backup source + policy when no snapshots remain
- **Byte Format Preference** - User choice between Base-2 (KiB, MiB, GiB) and Base-10 (KB, MB, GB)
- **Files created**: `PinDialog.tsx`, `RetentionTags.tsx`
- **100% core workflow parity achieved** with official Kopia HTMLui

✅ **Backup Profiles System:**

- Create, edit, delete backup profiles
- Profile history with snapshot timeline
- Profile selection for snapshot creation

✅ **System Tray Integration:**

- Native system tray with show/hide window functionality
- Quit menu option
- Left-click to restore/show window
- Window close minimizes to tray (doesn't quit)

✅ **Desktop Notifications:**

- Native OS notifications for task completion
- Success/failure status indication
- Task description in notification body

✅ **Custom Window Decorations:**

- Custom titlebar with window controls
- Minimize, maximize, close buttons
- Window close handler with tray integration

✅ **Comprehensive Testing:**

- 146 passing Rust tests (136 unit + 10 integration)
- 10 integration tests with real Kopia binary (server lifecycle, API calls, error handling)
- All 46 error variants tested
- Edge cases, concurrency, integration scenarios
- 74 frontend wrapper tests (low value - only test TypeScript invoke() calls)

✅ **Critical API Field Fixes:**

- Algorithm field names corrected (`defaultHash`, `defaultEncryption`, etc.)
- Algorithm values changed from strings to objects `{id, deprecated?}`
- Snapshot `rootEntry` changed from string to `RootEntry` object
- Policy scheduling fields fixed (camelCase issues)
- Repository creation handles empty `{}` response

✅ **Architecture Improvements:**

- WebSocket + polling hybrid for reliability
- Sources added to 5s polling loop for real-time updates
- Chart animations disabled to prevent re-renders
- Repository page shows actual repository name/description
- Comprehensive error handling with 46 error variants

---

## i18n (Internationalization)

**Supported Languages:**

- English (en) - Default
- Spanish (es)

**Translation Files:**

- [src/locales/en/translation.json](src/locales/en/translation.json)
- [src/locales/es/translation.json](src/locales/es/translation.json)

**Usage:**

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('overview.title')}</h1>;
}
```

**Adding Translations:**

1. Add key to both `en/translation.json` and `es/translation.json`
2. Use namespaced keys (e.g., `overview.title`, `policies.retention.days`)
3. Use `t()` function with interpolation for dynamic values

---

## Known Issues & Limitations

1. **Form Validation** - Manual validation, Zod not installed
2. **Frontend Tests** - Infrastructure ready but tests not written
3. **E2E Tests** - Playwright configured but tests not written
4. **Auto-Updates** - Not implemented
5. **Windows/macOS Testing** - Primary development on Linux

---

## Future Roadmap

### High Priority

1. Add Zod for form validation
2. Write frontend unit tests with Vitest
3. Write E2E tests with Playwright
4. Auto-updates implementation

### Medium Priority

5. More storage providers (if needed)
6. Advanced policy scheduling UI
7. Backup verification tools
8. Repository statistics dashboard

### Low Priority

9. Multiple repository support
10. Cloud sync for preferences
11. Backup encryption key management UI

---

## Resources

- **Kopia Docs:** https://kopia.io/docs/
- **Tauri Docs:** https://tauri.app/
- **React Router v7:** https://reactrouter.com/
- **shadcn/ui:** https://ui.shadcn.com/
- **Zustand:** https://docs.pmnd.rs/zustand/

---

## Notes for AI Assistants

- Always check git status before making changes (use existing context provided at start)
- Use `pnpm validate:fix` before committing
- Test Rust changes with `pnpm test:rust`
- Update CLAUDE.md if architecture/patterns change
- Follow existing code patterns and conventions
- Ask for clarification if requirements are ambiguous
- Use TodoWrite tool for complex multi-step tasks
- Consolidate documentation when possible
- Remove outdated files proactively
