# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Project Overview

**Kopia-Desktop** - Modern desktop app for Kopia backup management built with React + Tauri.

Provides a user-friendly interface for managing Kopia backups: repositories, snapshots, policies, tasks, restore operations, and backup profiles.

---

## Quick Start

```bash
pnpm install          # Install dependencies (auto-downloads Kopia binary)
pnpm tauri:dev        # Start development
pnpm tauri:build      # Build production app
pnpm validate         # Run all checks (typecheck, lint:check, format:check, test:run)
pnpm validate:fix     # Auto-fix issues
pnpm test:rust        # Run Rust backend tests
pnpm test:run         # Run frontend tests
pnpm test:e2e         # Run E2E tests with Playwright
```

---

## Tech Stack

**Frontend:**

- React 19.2 + TypeScript 5.9 (strict mode)
- Vite 7.2 (bundling + HMR)
- Tailwind CSS 4.1 + shadcn/ui (23 components)
- React Router v7.9 (use `react-router` imports, not `react-router-dom`)
- Zustand 5.0 (state management: kopia, preferences, profiles stores)
- i18next 25.6 (English + Spanish)
- Recharts 3.4 (charts, animations disabled)
- Sonner 2.0 (toast notifications)
- Lucide React 0.554 (icons)
- next-themes 0.4 (theme management)

**Backend:**

- Tauri 2.9 (Rust) with tray-icon feature
- reqwest 0.11 (HTTP client for Kopia API)
- tokio 1.x (async runtime)
- tokio-tungstenite 0.24 (WebSocket client)
- serde/serde_json (serialization)
- hostname, base64, urlencoding, thiserror, rand
- Tauri plugins: shell, notification, dialog
- Windows-specific: windows-service 0.7, windows-sys 0.59 (service + IPC)

**Testing:**

- Vitest 4.0 (frontend unit tests)
- Playwright 1.56 (E2E tests)
- Rust cargo test (backend tests)
- cargo-llvm-cov (Rust code coverage)

**Import Alias:**

```typescript
@/*  // Maps to ./src/* (e.g., @/components/ui/button)
```

---

## Architecture

**Embedded Server Mode** (matches official KopiaUI):

```
React UI (Frontend)
    ↓ HTTP REST API + WebSocket
Tauri Backend (Rust)
    ↓ spawns
Kopia Server (localhost:random-port)
    ↓
Repositories / Snapshots / Storage
```

**Key Points:**

- Kopia binary bundled with app (platform-specific, auto-downloaded)
- Backend spawns `kopia server start --ui` on launch
- Localhost-only, TLS with self-signed cert, random password per session
- WebSocket for real-time updates + polling for reliability
- Server shuts down gracefully on app exit

**State Management:**

Centralized Zustand store ([src/stores/kopia.ts](src/stores/kopia.ts)):

- **Polling intervals:** Server/Repository (30s), Tasks/Sources (5s)
- **Hybrid approach:** WebSocket (instant updates) + polling (reliable state)
- **Benefits:** Eliminates redundant API calls, single polling loop, consistent state
- **Stores:** kopia.ts (main), preferences.ts (theme, language, fontSize), profiles.ts (backup profiles)
- **Hooks:** Thin wrappers around store selectors (useIsMobile, useProviderConfig)

---

## Project Structure

```
kopia-desktop/
├── src/                           # React frontend
│   ├── components/
│   │   ├── ui/                    # 23 shadcn/ui components
│   │   ├── layout/                # AppLayout, AppSidebar, Titlebar, etc.
│   │   └── kopia/                 # Kopia-specific components
│   │       ├── setup/             # Repository setup wizard
│   │       │   ├── providers/     # 8 storage providers
│   │       │   └── steps/         # Wizard steps
│   │       ├── snapshots/         # PinDialog, RetentionTags
│   │       ├── policy/            # Policy editor
│   │       ├── profiles/          # Profile management
│   │       └── notifications/     # Notification profiles
│   ├── lib/
│   │   ├── kopia/
│   │   │   ├── client.ts          # Tauri command wrappers
│   │   │   ├── types.ts           # TypeScript types
│   │   │   └── errors.ts          # KopiaError class
│   │   └── utils/                 # Utilities (cn, format, etc.)
│   ├── pages/                     # 15 route pages
│   ├── hooks/                     # 2 custom hooks
│   ├── stores/                    # 3 Zustand stores
│   └── locales/                   # i18n (en, es)
│
├── src-tauri/                     # Rust backend
│   ├── src/
│   │   ├── commands/
│   │   │   ├── kopia.rs           # 41 Kopia commands
│   │   │   ├── system.rs          # 4 system commands
│   │   │   ├── websocket.rs       # 2 WebSocket commands
│   │   │   └── windows_service.rs # 5 Windows service commands
│   │   ├── kopia_server.rs        # Server lifecycle & HTTP client
│   │   ├── kopia_websocket.rs     # WebSocket client
│   │   ├── types.rs               # Rust types
│   │   ├── error.rs               # Error handling
│   │   └── lib.rs, main.rs
│   └── Cargo.toml, tauri.conf.json
│
├── tests/                         # Frontend tests (14 test files)
├── bin/                           # Kopia binaries (auto-downloaded)
└── scripts/                       # Utility scripts
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
```

**State Management:**

```typescript
// All Kopia data managed through centralized store
import { useKopiaStore } from '@/stores/kopia';

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

## Tauri Commands (52 total)

**Server (3):** start, stop, status
**Repository (9):** status, connect, disconnect, create, exists, get_algorithms, update_description
**Snapshots (6):** sources_list, snapshot_create, snapshot_cancel, snapshots_list, snapshot_edit, snapshot_delete
**Browsing (2):** object_browse, object_download
**Restore (4):** restore_start, mount_snapshot, mounts_list, mount_unmount
**Policies (5):** policies_list, policy_get, policy_resolve, policy_set, policy_delete
**Tasks (5):** tasks_list, task_get, task_logs, task_cancel, tasks_summary
**Maintenance (2):** maintenance_info, maintenance_run
**Utilities (2):** path_resolve, estimate_snapshot
**Notifications (4):** profiles list/create/delete/test
**System (4):** get_system_info, get_current_user, select_folder, save_file
**WebSocket (2):** websocket_connect, websocket_disconnect
**Windows Service (5):** install, uninstall, start, stop, status

---

## Key Features

**Repository Setup:**

- 8 storage providers: Filesystem, S3, B2, Azure, GCS, SFTP, WebDAV, Rclone
- Setup wizard with validation
- TLS with self-signed cert

**Backup Management:**

- Backup profiles (user-defined groups of folders)
- Snapshot create/cancel/edit/delete
- Pin system (protect snapshots from deletion)
- Retention tags (color-coded badges)
- Source deletion when no snapshots remain

**Policies:**

- Full policy editor with inheritance display
- Advanced scheduling (cron, timeOfDay)
- Compression filters (onlyCompress, neverCompress)
- .kopiaignore support

**UI/UX:**

- Theme system (light/dark/system)
- i18n (English + Spanish)
- Font size preference
- Byte format preference (Base-2 vs Base-10)
- System tray integration
- Desktop notifications
- Custom window decorations

**Windows Service:**

- Run Kopia server as Windows system service
- Auto-start on boot
- Named pipe IPC for GUI ↔ service communication
- Install/uninstall from Preferences UI
- Dual-mode binary (`kopia-desktop.exe` vs `kopia-desktop.exe --service`)

---

## Error Handling

Use centralized `KopiaError` class:

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

All error variants are tested in both Rust and TypeScript.

---

## Development Best Practices

**Security:**

- Never log sensitive data (passwords, tokens)
- Validate all user inputs
- Sanitize file paths

**Performance:**

- Centralized polling (30s server, 5s tasks/sources)
- Clean up listeners/timers on unmount
- Disable chart animations (`isAnimationActive={false}`)

**User Experience:**

- Clear empty states with CTAs
- Sensible defaults in forms
- Toast notifications for background operations
- Keyboard navigation support
- Minimize to tray on window close

**Code Quality:**

- Run `pnpm validate` before committing
- Use `pnpm validate:fix` for auto-fixes
- Test Rust code with `pnpm test:rust`
- Use `pnpm test:rust:coverage:html` for coverage reports

---

## Testing

**Frontend:**

```bash
pnpm test:run         # Unit tests (Vitest)
pnpm test:coverage    # Coverage report
pnpm test:e2e         # E2E tests (Playwright)
pnpm test:e2e:ui      # E2E interactive UI
```

**Backend:**

```bash
pnpm test:rust                    # All Rust tests
pnpm test:rust:coverage:html      # Coverage report (open in browser)

# Integration tests (require Kopia binary)
KOPIA_PATH=/path/to/kopia cargo test --lib kopia_api_integration -- --ignored --test-threads=1
```

See [src-tauri/TESTING.md](src-tauri/TESTING.md) for comprehensive guide.

---

## i18n (Internationalization)

**Supported Languages:** English (en), Spanish (es)

**Usage:**

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('overview.title')}</h1>;
}
```

**Translation Files:**

- [src/locales/en/translation.json](src/locales/en/translation.json)
- [src/locales/es/translation.json](src/locales/es/translation.json)

---

## Known Limitations

- No Zod validation (manual validation used)
- Auto-updates not implemented
- Primary development on Linux (Windows/macOS testing limited)

---

## Resources

- **Kopia Docs:** https://kopia.io/docs/
- **Tauri Docs:** https://tauri.app/
- **React Router v7:** https://reactrouter.com/
- **shadcn/ui:** https://ui.shadcn.com/
- **Zustand:** https://docs.pmnd.rs/zustand/

---

## Notes for AI Assistants

- Check git status before making changes
- Use `pnpm validate:fix` before committing
- Test Rust changes with `pnpm test:rust`
- Update CLAUDE.md if architecture changes
- Follow existing code patterns
- Use TodoWrite tool for complex multi-step tasks
- Ask for clarification if requirements are ambiguous
