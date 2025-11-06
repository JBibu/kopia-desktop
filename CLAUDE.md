# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Kopia-Desktop** - Modern desktop app for Kopia backup management.

A React + Tauri application providing a user-friendly interface for managing Kopia backups: repositories, snapshots, policies, tasks, and restore operations.

### Current Status

**Implemented:**

- ✅ Complete Kopia server lifecycle management (start/stop/status)
- ✅ 50 Tauri commands total (43 Kopia API + 4 system utilities + 3 WebSocket)
- ✅ 9 functional pages (Overview, Repository, Snapshots, SnapshotHistory, SnapshotBrowse, Policies, Tasks, Preferences, Setup)
- ✅ Repository setup wizard with 8 storage providers (Filesystem, S3, B2, Azure, GCS, SFTP, WebDAV, Rclone)
- ✅ Theme system (light/dark/system) with Zustand
- ✅ Font size preferences with Zustand
- ✅ i18n/translations (English + Spanish) with react-i18next
- ✅ Error handling system with comprehensive `KopiaError` class
- ✅ Global Kopia state store with Zustand (907 lines - centralized polling + WebSocket)
- ✅ 8 custom hooks (6 Kopia-specific: useKopiaServer, useRepository, useSnapshots, usePolicies, useTasks, useProviderConfig)
- ✅ Native file/folder pickers via Tauri dialog plugin
- ✅ 20 shadcn/ui components
- ✅ 21 Kopia-specific components
- ✅ WebSocket support with intelligent fallback to polling
- ✅ Recharts integration for data visualization (with disabled animations to prevent re-render issues)
- ✅ Snapshot cancel functionality
- ✅ Next-themes for advanced theme management

**Not Yet Implemented:**

- ❌ Form validation with Zod (package not installed)
- ❌ System tray integration (tray-icon feature enabled in Cargo.toml but not implemented)
- ❌ Comprehensive test coverage (infrastructure in place)

---

## Quick Start

```bash
pnpm install      # Install dependencies (auto-downloads Kopia binary)
pnpm tauri:dev    # Start Tauri app in development mode
pnpm tauri:build  # Build production app
pnpm lint         # Lint and auto-fix code
pnpm typecheck    # Type check TypeScript
pnpm validate     # Run all checks (typecheck, lint, format, test)
```

---

## Tech Stack

**Frontend:**

- React 19.2 + TypeScript 5.9 (strict mode)
- Vite 7.1 (bundling + HMR)
- Tailwind CSS 4.1 + shadcn/ui (Radix UI)
- React Router v7.9
- Zustand 5.0 (5 stores: theme, language, fontSize, preferences, kopia)
- i18next 25.6 + react-i18next 16.2 (internationalization)
- Recharts 3.3 (data visualization & charts)
- Sonner 2.0 (toast notifications)
- Lucide React 0.548 (icons)
- next-themes 0.4 (advanced theme management)

**Backend:**

- Tauri 2.9 (Rust)
- reqwest 0.11 (HTTP client for Kopia API)
- tokio 1.x (async runtime with full features)
- tokio-tungstenite 0.24 (WebSocket client with native-tls)
- serde/serde_json (serialization)
- hostname 0.3 (system hostname detection)
- base64 0.22 (encoding/decoding)
- Tauri plugins: cli, dialog, notification, shell

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

1. Tauri **bundles `kopia` binary** (platform-specific)
2. Backend process **spawns `kopia server`** on app launch
3. React UI communicates via **REST API** + **WebSocket** (for real-time updates)
4. Server **shuts down gracefully** with app

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
- Random password per session
- Hybrid architecture: WebSocket for real-time events + polling for reliability

---

## State Management Architecture

**Centralized Zustand Store** ([src/stores/kopia.ts](src/stores/kopia.ts) - 907 lines)

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

**Hooks Delegate to Store:**

- `useKopiaServer()` → server state
- `useRepository()` → repository state
- `useSnapshots()` → snapshots/sources state
- `usePolicies()` → policies state
- `useTasks()` → tasks state

---

## Project Structure

```
kopia-desktop/
├── src/                                  # React frontend
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components (20)
│   │   ├── layout/                       # Layout components (4)
│   │   └── kopia/                        # Kopia-specific components (21)
│   │       ├── setup/                    # Repository setup wizard
│   │       │   ├── fields/               # Form fields (3)
│   │       │   ├── providers/            # Storage providers (8)
│   │       │   └── steps/                # Wizard steps (4)
│   │       └── notifications/            # Notification profiles (5)
│   ├── lib/
│   │   ├── kopia/
│   │   │   ├── client.ts                 # Tauri command wrappers
│   │   │   ├── types.ts                  # TypeScript types
│   │   │   └── errors.ts                 # KopiaError class
│   │   └── utils/                        # Utilities
│   ├── pages/                            # Route pages (9)
│   │   ├── Overview.tsx, Repository.tsx, Snapshots.tsx
│   │   ├── SnapshotHistory.tsx, SnapshotBrowse.tsx
│   │   ├── Policies.tsx, Tasks.tsx, Preferences.tsx, Setup.tsx
│   ├── hooks/                            # Custom hooks (8)
│   ├── stores/                           # Zustand stores (5)
│   │   └── kopia.ts                      # 907 lines - centralized state
│   └── App.tsx
│
├── src-tauri/                            # Rust backend
│   ├── src/
│   │   ├── commands/
│   │   │   ├── kopia.rs                  # 43 Kopia commands (1,462 lines)
│   │   │   ├── system.rs                 # 4 system commands (69 lines)
│   │   │   └── websocket.rs              # 3 WebSocket commands (49 lines)
│   │   ├── kopia_server.rs               # Server lifecycle & HTTP client
│   │   ├── kopia_websocket.rs            # WebSocket client
│   │   └── types.rs                      # Rust types
│   └── Cargo.toml, tauri.conf.json
│
└── bin/                                  # Kopia binaries (dev mode)
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
  serverStatus, repositoryStatus, snapshots, sources, policies, tasks,

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
  return { snapshots, isLoading };
}
```

**File Naming:**

- Components/Pages: PascalCase (`SnapshotList.tsx`)
- Hooks: camelCase with `use` prefix (`useSnapshots.ts`)
- Utils/Types: camelCase (`errors.ts`)

---

## Tauri Commands (Backend API)

**50 commands total:**

**Server:** `kopia_server_start`, `kopia_server_stop`, `kopia_server_status`

**Repository:** `repository_status`, `repository_connect`, `repository_disconnect`, `repository_create`, `repository_exists`, `repository_get_algorithms`, `repository_update_description`

**Snapshots:** `sources_list`, `snapshot_create`, `snapshot_cancel`, `snapshots_list`, `snapshot_edit`, `snapshot_delete`

**Browsing:** `object_browse`, `object_download`

**Restore:** `restore_start`, `mount_snapshot`, `mounts_list`, `mount_unmount`

**Policies:** `policies_list`, `policy_get`, `policy_resolve`, `policy_set`, `policy_delete`

**Tasks:** `tasks_list`, `task_get`, `task_logs`, `task_cancel`, `tasks_summary`

**Maintenance:** `maintenance_info`, `maintenance_run`

**Utilities:** `path_resolve`, `estimate_snapshot`, `ui_preferences_get`, `ui_preferences_set`

**Notifications:** `notification_profiles_list`, `notification_profile_create`, `notification_profile_delete`, `notification_profile_test`

**System:** `get_system_info`, `get_current_user`, `select_folder`, `select_file`

**WebSocket:** `websocket_connect`, `websocket_disconnect`, `websocket_status`

---

## Key Kopia Concepts

### Policy Inheritance

```
Global (*/*/*) → Per-Host (@host/*/*) → Per-User (user@host/*) → Per-Path (user@host/path)
```

### Snapshot Sources

Format: `user@host:/path` (e.g., `javi@laptop:/home/javi/documents`)

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

Use the centralized `KopiaError` class:

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

---

## Recent Improvements

**Latest commit: "refactor: comprehensive cleanup and API field corrections" (3e63eec)**

✅ **Critical API Field Fixes:**

- Algorithm field names corrected (`defaultHash`, `defaultEncryption`, etc.)
- Algorithm values changed from strings to objects `{id, deprecated?}`
- Snapshot `rootEntry` changed from string to `RootEntry` object
- Policy scheduling fields fixed (camelCase issues)
- Repository creation handles empty `{}` response

✅ **Code Cleanup (~170 lines removed):**

- Removed duplicate functions
- Removed unused notification functions
- Removed unused npm/Rust dependencies
- Conditionalized debug console.log statements

✅ **Architecture Improvements:**

- WebSocket + polling hybrid for reliability
- Sources added to 5s polling loop for real-time updates
- Chart animations disabled to prevent re-renders
- Repository page shows actual repository name/description
