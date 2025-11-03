# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Kopia-Desktop** - Modern desktop app for Kopia backup management.

A React + Tauri application providing a user-friendly interface for managing Kopia backups: repositories, snapshots, policies, tasks, and restore operations.

### Current Status

**Implemented:**

- ✅ Complete Kopia server lifecycle management (start/stop/status)
- ✅ 47 Tauri commands covering repository, snapshots, policies, tasks, maintenance
- ✅ 7 functional pages (Overview, Repository, Snapshots, Policies, Tasks, Preferences, Setup)
- ✅ Repository setup wizard with 8 storage providers (Filesystem, S3, B2, Azure, GCS, SFTP, WebDAV, Rclone)
- ✅ Theme system (light/dark/system) with Zustand
- ✅ i18n/translations (English + Spanish) with react-i18next
- ✅ Error handling system with `KopiaError` class
- ✅ Global Kopia state store with Zustand (centralized polling for server, repository, snapshots, policies, tasks)
- ✅ 8 custom hooks (6 Kopia-specific: useKopiaServer, useRepository, useSnapshots, usePolicies, useTasks, useProviderConfig)
- ✅ Native file/folder pickers via Tauri dialog plugin
- ✅ 19 shadcn/ui components (Accordion, Alert, Badge, Button, Card, Collapsible, Dialog, Input, Label, Progress, Select, Separator, Sheet, Sonner, Spinner, Switch, Table, Tabs, Textarea)

**Not Yet Implemented:**

- ❌ Form validation with Zod (package not installed)
- ❌ WebSocket integration (code exists but unused)
- ❌ System tray integration
- ❌ Native notifications UI
- ❌ Comprehensive test coverage

---

## Quick Start

```bash
pnpm install      # Install dependencies (auto-downloads Kopia binary)
pnpm tauri:dev    # Start Tauri app in development mode
pnpm tauri:build  # Build production app
pnpm dev          # Frontend dev server only (without Tauri)
pnpm build        # Build frontend only
pnpm lint         # Lint and auto-fix code
pnpm test         # Run unit tests
pnpm test:e2e     # Run E2E tests with Playwright
pnpm validate     # Run all checks (typecheck, lint, format, test)
```

---

## Tech Stack

**Frontend:**

- React 19.2 + TypeScript 5.9 (strict mode)
- Vite 7.1 (bundling + HMR)
- Tailwind CSS 4.1 + shadcn/ui (Radix UI)
- React Router v7.9
- Zustand 5.0 (theme + language + global Kopia state management)
- i18next 25.6 + react-i18next 16.2 (internationalization)
- Sonner (toast notifications)
- Lucide React (icons)

**Backend:**

- Tauri 2.9 (Rust)
- reqwest (HTTP client for Kopia API)
- tokio (async runtime)
- serde/serde_json (serialization)
- Tauri plugins: dialog, notification, shell

**Testing:**

- Vitest 4.0 + React Testing Library
- Playwright 1.56 (E2E)

**Dev Tools:**

- ESLint 9.38 + Prettier 3.6
- Husky 9.1 (git hooks)
- pnpm 10.9 (package manager)

**Import Aliases:**

```typescript
@/*  // Maps to ./src/* (e.g., @/components/ui/button)
```

**React Router v7:**

- All imports use `react-router` (unified package)
- No more `react-router-dom` (deprecated in v7)
- Future flags no longer needed (v7 behaviors are default)

---

## Kopia Backend Architecture

**Approach:** Embedded Server Mode (matches official KopiaUI - Kopia's official UI)

### How It Works

1. Tauri **bundles `kopia` binary** (platform-specific)
2. Backend process **spawns `kopia server`** on app launch
3. React UI communicates via **REST API** (WebSocket code exists but not yet integrated)
4. Server **shuts down gracefully** with app

### Server Launch

```typescript
// src-tauri/src/kopia_server.rs
let kopia_process = Command::new(kopia_binary_path)
  .args(&[
    "server", "start",
    "--ui",                                  // Enable REST API endpoints
    "--address=localhost:0",                 // Random port (security)
    "--tls-generate-cert",                   // Self-signed HTTPS cert
    "--tls-generate-cert-name=localhost",
    "--random-password",                     // Secure local-only access
    "--shutdown-on-stdin",                   // Exit when Tauri quits
    "--config-file", &config_path
  ])
  .spawn()?;
```

### Binary Locations

**Development:**

- `./bin/kopia` (platform-specific, downloaded on setup)
- Or use `KOPIA_PATH` env var for custom install

**Production (bundled):**

- Windows: `resources/bin/kopia.exe`
- macOS: `KopiaDesktop.app/Contents/Resources/bin/kopia`
- Linux: `resources/bin/kopia`

### Communication Flow

```
React UI (Frontend)
    ↓ HTTP/REST API
Tauri Backend (Rust)
    ↓ spawns
Kopia Server (localhost:random-port)
    ↓
Repositories / Snapshots / Storage
```

**Key Points:**

- Localhost-only (no remote access)
- TLS with self-signed cert
- Random password per session
- Centralized polling via Zustand store (30s server/repository, 5s tasks)

---

## Architecture

### State Management Architecture (Recent Refactor)

**Centralized Zustand Store** - All Kopia data is managed in a single global store:

**Key Benefits:**

- ✅ Eliminates redundant API calls (components share same state)
- ✅ Single polling loop instead of per-component polling
- ✅ Consistent state across entire application
- ✅ Simplified hooks (thin wrappers around store selectors)

**Implementation:**

```typescript
// src/stores/kopia.ts (548 lines)
export const useKopiaStore = create<KopiaStore>((set, get) => ({
  // State
  serverStatus, serverInfo, repositoryStatus, snapshots, policies, tasks, etc.

  // Polling configuration
  startPolling() {
    // Server & repository: every 30 seconds
    // Tasks: every 5 seconds (only when tasks active)
  },

  // Actions
  refreshServer, refreshRepository, refreshSnapshots, refreshPolicies, refreshTasks
}));
```

**Hooks Delegate to Store:**

- `useKopiaServer()` → selects server state from store
- `useRepository()` → selects repository state from store
- `useSnapshots()` → selects snapshots state from store
- `usePolicies()` → selects policies state from store
- `useTasks()` → selects tasks state from store

**Before Refactor (Old Pattern):**

- Each hook maintained its own state
- Each hook had its own polling interval
- Multiple simultaneous API calls for same data
- State inconsistencies between components

**After Refactor (Current):**

- Single source of truth
- Coordinated polling
- Minimal API calls
- Always consistent state

---

### Tauri Process Model

**Backend (Core)** (`/src-tauri/src`)

- Rust environment, full OS access
- Manages Kopia server lifecycle
- Command handlers for frontend communication
- App lifecycle management

**Frontend (Webview)** (`/src`)

- WebView (platform-native), sandboxed
- React application
- UI and user interactions

**Tauri Commands** (Rust backend)

- Bridge between frontend and backend
- Exposes safe APIs via Tauri's invoke system
- Type-safe command channels

### Command Pattern

**Backend Command Handler:**

```rust
// src-tauri/src/commands/kopia.rs
#[tauri::command]
async fn list_snapshots(options: SnapshotOptions) -> Result<Vec<Snapshot>, String> {
  let response = reqwest::get(&format!("{}/api/v1/snapshots", server_url))
    .json::<Vec<Snapshot>>()
    .await
    .map_err(|e| e.to_string())?;
  Ok(response)
}
```

**Frontend Client:**

```typescript
// src/lib/kopia/client.ts
import { invoke } from '@tauri-apps/api/tauri';

export const kopiaClient = {
  snapshots: {
    list: (opts) => invoke('list_snapshots', { options: opts }),
  },
};
```

**Command Registration:**

```rust
// src-tauri/src/main.rs
fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      list_snapshots,
      create_snapshot,
      // ... other commands
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

---

## Key Kopia Concepts

### Policy Inheritance

Policies follow a 4-level hierarchy where more specific settings override less specific:

```
Global (*/*/*) → Per-Host (@host/*/*) → Per-User (user@host/*) → Per-Path (user@host/path)
```

### Snapshot Sources

Format: `user@host:/path` (e.g., `javi@laptop:/home/javi/documents`)

### Repository Config

- Location: `~/.config/kopia/` (Linux/macOS) or `%APPDATA%\kopia` (Windows)
- Files: `*.config` (one per repository)
- Authentication: Password required, random password generated per session
- HTTPS: Self-signed cert for localhost

### Critical Warnings for UI

1. **Password Loss** - No recovery possible, must warn prominently
2. **Repository Maintenance** - Can take hours for large repos
3. **Incomplete Snapshots** - Checkpoint behavior must be clear
4. **Deletion** - Snapshots and repositories are unrecoverable

---

## Testing

**Infrastructure:**

- Vitest 4.0 + React Testing Library (unit/integration)
- Playwright 1.56 (E2E)
- Minimal coverage currently (infrastructure in place)

**Commands:**

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage
pnpm test:e2e          # E2E tests
pnpm test:e2e:ui       # Playwright UI
```

---

## Error Handling

Use the centralized `KopiaError` class from `@/lib/kopia/errors`:

```typescript
import { getErrorMessage, parseKopiaError, KopiaError } from '@/lib/utils';

try {
  await someKopiaOperation();
} catch (err) {
  // Simple: just get the message
  const message = getErrorMessage(err);
  toast.error(message);

  // Advanced: check error type
  const kopiaError = parseKopiaError(err);
  if (kopiaError.isConnectionError()) {
    navigate('/setup');
  }
}
```

**Backend (Rust):**

```rust
#[tauri::command]
fn risky_operation() -> Result<String, String> {
  perform_operation()
    .map_err(|e| format!("Operation failed: {}", e))
}
```

---

## Development Workflow

### Initial Setup (First Time Only)

```bash
# Clone repository
git clone https://github.com/JBibu/kopia-desktop.git
cd kopia-desktop

# Install dependencies
pnpm install

# Setup pre-commit hooks
pnpm prepare

# Download Kopia binary (platform-specific)
pnpm setup:kopia
```

### Daily Development

```bash
# Start dev server with hot reload
pnpm dev

# Run linter (autofix enabled)
pnpm lint

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck
```

### Pre-Commit Checks

```bash
# Run all quality checks
pnpm validate

# This runs:
# - ESLint (code quality)
# - Prettier (formatting)
# - TypeScript (type safety)
# - Vitest (unit tests)
```

### Building for Production

```bash
# Build optimized production app
pnpm build

# Package for current platform
pnpm package

# Package for all platforms (requires setup)
pnpm package:all
```

---

## Project Structure

```
kopia-desktop/
├── src/                                  # React frontend
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components (19 total)
│   │   ├── layout/                       # AppLayout, AppSidebar, Titlebar
│   │   └── kopia/
│   │       ├── RepositoryCreateForm.tsx
│   │       ├── RepositoryConnectForm.tsx
│   │       └── setup/                    # Repository setup wizard
│   │           ├── SetupRepository.tsx   # Main wizard component
│   │           ├── ProviderSelection.tsx
│   │           ├── ProviderConfig.tsx    # 8 storage providers
│   │           └── [storage-specific components]
│   ├── lib/
│   │   ├── kopia/
│   │   │   ├── client.ts                 # Tauri command wrappers
│   │   │   ├── types.ts                  # TypeScript types
│   │   │   └── errors.ts                 # KopiaError class
│   │   └── utils/                        # Utilities (cn, error handling)
│   ├── pages/                            # 7 route pages
│   │   ├── Overview.tsx, Repository.tsx, Snapshots.tsx
│   │   ├── Policies.tsx, Tasks.tsx, Preferences.tsx, Setup.tsx
│   ├── hooks/                            # 8 hooks (6 Kopia-specific)
│   │   ├── useKopiaServer.ts, useRepository.ts, useSnapshots.ts
│   │   ├── usePolicies.ts, useTasks.ts, useProviderConfig.ts
│   │   ├── useIsMobile.ts, use-toast.ts (utilities)
│   ├── stores/
│   │   ├── kopia.ts                      # Global Kopia state (548 lines)
│   │   ├── theme.ts                      # Theme store (light/dark/system)
│   │   └── language.ts                   # Language/i18n store
│   └── App.tsx                           # Root component
│
├── src-tauri/                            # Rust backend
│   ├── src/
│   │   ├── commands/
│   │   │   ├── kopia.rs                  # 43 Kopia API commands
│   │   │   └── system.rs                 # 4 system utilities
│   │   ├── kopia_server.rs               # Server lifecycle & HTTP client
│   │   ├── types.rs                      # Rust types
│   │   └── lib.rs, main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── tests/                                # Minimal tests (infrastructure ready)
├── bin/                                  # Kopia binaries (dev mode)
└── [config files]                        # package.json, vite.config.ts, etc.
```

---

## Code Conventions

**Imports:**

```typescript
// Always use path aliases
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/utils';
import type { Snapshot } from '@/lib/kopia/types';

// React Router v7 imports (use 'react-router', not 'react-router-dom')
import { BrowserRouter, useNavigate, Link } from 'react-router';
```

**Component Structure:**

```typescript
// 1. Imports (React, UI, lib, types)
// 2. Types/Interfaces
// 3. Component (hooks → effects → handlers → render)
```

**State Management Pattern:**
All Kopia data is managed through a centralized Zustand store with automatic polling:

```typescript
// Global store handles all data fetching and polling
// src/stores/kopia.ts
export const useKopiaStore = create<KopiaStore>((set, get) => ({
  // Server state (polls every 30s)
  serverStatus: 'unknown',
  serverInfo: null,

  // Repository state (polls every 30s)
  repositoryStatus: null,
  isConnected: false,

  // Snapshots, policies, tasks state
  snapshots: [],
  policies: [],
  tasks: [],

  // Actions to fetch and update state
  refreshAll: async () => {
    /* ... */
  },
}));

// Hooks are thin wrappers around the store
export function useSnapshots() {
  const snapshots = useKopiaStore((state) => state.snapshots);
  const isLoading = useKopiaStore((state) => state.snapshotsLoading);
  const error = useKopiaStore((state) => state.snapshotsError);

  return { snapshots, isLoading, error };
}
```

**File Naming:**

- Components/Pages: PascalCase (`SnapshotList.tsx`)
- Hooks: camelCase with `use` prefix (`useSnapshots.ts`)
- Utils/Types: camelCase (`errors.ts`)

---

## Tauri Commands (Backend API)

**47 commands total** (43 in [kopia.rs](src-tauri/src/commands/kopia.rs) + 4 in [system.rs](src-tauri/src/commands/system.rs)):

**Server:** `kopia_server_start`, `kopia_server_stop`, `kopia_server_status`

**Repository:** `repository_status`, `repository_connect`, `repository_disconnect`, `repository_create`, `repository_exists`, `repository_get_algorithms`, `repository_update_description`

**Snapshots:** `sources_list`, `snapshot_create`, `snapshot_cancel`, `snapshots_list`, `snapshot_edit`, `snapshot_delete`

**Browsing:** `object_browse`, `object_download`

**Restore:** `restore_start`, `mount_snapshot`, `mounts_list`, `mount_unmount`

**Policies:** `policies_list`, `policy_get`, `policy_resolve`, `policy_set`, `policy_delete`

**Tasks:** `tasks_list`, `task_get`, `task_logs`, `task_cancel`, `tasks_summary`

**Maintenance:** `maintenance_info`, `maintenance_run`

**Utilities:** `current_user_get`, `path_resolve`, `estimate_snapshot`, `ui_preferences_get`, `ui_preferences_set`

**Notifications:** `notification_profiles_list`, `notification_profile_create`, `notification_profile_delete`, `notification_profile_test`

**System (in [system.rs](src-tauri/src/commands/system.rs)):** `get_system_info`, `get_current_user`, `select_folder`, `select_file`

---

## Kopia REST API Reference

Kopia server exposes REST API endpoints (accessed via Tauri commands above):

**Core Endpoints:**

- Repository: `/api/v1/repo/{status,connect,disconnect,create,algorithms}`
- Snapshots: `/api/v1/snapshots`, `/api/v1/sources`, `/api/v1/sources/{source}/snapshot`
- Policies: `/api/v1/policies`, `/api/v1/policy/{target}`
- Tasks: `/api/v1/tasks`, `/api/v1/tasks/{id}/{details,logs,cancel}`, `/api/v1/tasks/summary`
- Restore: `/api/v1/restore`, `/api/v1/mounts`
- Maintenance: `/api/v1/repo/maintenance/{info,run}`
- Preferences: `/api/v1/ui-preferences`
- Notifications: `/api/v1/notification-profiles`

**WebSocket (not yet integrated):**

- `ws://localhost:{port}/api/v1/ws` for real-time task/snapshot progress

---

## UI/UX Guidelines

**Critical Warnings (must be prominent):**

1. Password loss = unrecoverable (no password reset)
2. Repository maintenance can take hours
3. Deletions are permanent

**Status Colors:**

- Repository: Connected (green), Disconnected (gray), Error (red)
- Tasks: Running (blue), Success (green), Failed (red), Incomplete (yellow)
- Server: Running (green), Stopped (red), Starting (yellow)

**User Feedback:**

- Show progress for long operations (file count, bytes, time remaining)
- Toast notifications for background task completions
- Inline error messages with actionable suggestions

---

## Development Best Practices

**Security:**

- Never log sensitive data (passwords, tokens)
- Validate all user inputs
- Sanitize file paths
- Use Rust's type system for safety

**Performance:**

- Lazy load large data sets
- Centralized polling via Zustand store (30s server/repository, 5s tasks)
- Clean up listeners/timers on unmount
- Consider virtual scrolling for large lists

**User Experience:**

- Clear empty states with CTAs
- Show inherited vs overridden policy values
- Provide sensible defaults in forms
- Support keyboard navigation
