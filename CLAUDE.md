# CLAUDE.md

AI assistant guidance for Kopia Desktop - a React + Tauri desktop app for Kopia backup management.

---

## Quick Reference

```bash
pnpm install          # Install deps + auto-download Kopia binary
pnpm tauri:dev        # Start development (frontend + Rust backend)
pnpm tauri:build      # Production build
pnpm validate         # Run all checks before committing
pnpm validate:fix     # Auto-fix lint/format issues
pnpm test:run         # Frontend tests (Vitest)
pnpm test:rust        # Backend tests (Cargo)
```

**Import alias:** `@/*` → `./src/*`

**React Router:** Use `react-router` imports (NOT `react-router-dom`)

---

## File Locations Index

| What                 | Location                                         |
| -------------------- | ------------------------------------------------ |
| **Entry point**      | `src/main.tsx` → `src/App.tsx`                   |
| **Routes**           | `src/App.tsx` (React Router v7)                  |
| **Pages**            | `src/pages/*.tsx` (18 pages)                     |
| **UI components**    | `src/components/ui/*.tsx` (25 shadcn/ui)         |
| **Kopia components** | `src/components/kopia/**/*.tsx`                  |
| **Layout**           | `src/components/layout/*.tsx`                    |
| **Hooks**            | `src/hooks/*.ts` (9 hooks)                       |
| **Stores**           | `src/stores/*.ts` (kopia, preferences, profiles) |
| **API client**       | `src/lib/kopia/client.ts` (42 functions)         |
| **Types**            | `src/lib/kopia/types.ts`                         |
| **Errors**           | `src/lib/kopia/errors.ts`                        |
| **i18n**             | `src/lib/i18n/locales/{en,es}.json`              |
| **Rust commands**    | `src-tauri/src/commands/*.rs` (56 commands)      |
| **Rust types**       | `src-tauri/src/types.rs`                         |
| **Rust errors**      | `src-tauri/src/error.rs`                         |
| **Server lifecycle** | `src-tauri/src/kopia_server.rs`                  |
| **Frontend tests**   | `tests/**/*.test.ts` (10 files)                  |
| **Backend tests**    | `src-tauri/src/tests/*.rs` (13 files)            |

---

## Routes

| Route                           | Page            | Protected | Description                 |
| ------------------------------- | --------------- | --------- | --------------------------- |
| `/`                             | Overview        | Yes       | Dashboard with stats        |
| `/onboarding`                   | Onboarding      | No        | First-run wizard            |
| `/setup`                        | Setup           | No        | Repository setup wizard     |
| `/repository`                   | Repository      | No        | Repository info/settings    |
| `/repositories`                 | Repositories    | No        | Multi-repo management       |
| `/preferences`                  | Preferences     | No        | App settings                |
| `/snapshots`                    | Snapshots       | Yes       | Backup sources list         |
| `/snapshots/create`             | SnapshotCreate  | Yes       | Create new snapshot         |
| `/snapshots/history`            | SnapshotHistory | Yes       | Snapshot history for source |
| `/snapshots/:profileId/history` | ProfileHistory  | Yes       | Profile snapshot history    |
| `/snapshots/browse`             | SnapshotBrowse  | Yes       | Browse snapshot contents    |
| `/snapshots/restore`            | SnapshotRestore | Yes       | Restore files               |
| `/policies`                     | Policies        | Yes       | Policy list                 |
| `/policies/edit`                | PolicyEdit      | Yes       | Edit policy                 |
| `/tasks`                        | Tasks           | Yes       | Task list                   |
| `/tasks/:taskId`                | TaskDetail      | Yes       | Task details                |
| `/mounts`                       | Mounts          | Yes       | Mounted snapshots           |
| `*`                             | NotFound        | No        | 404 page                    |

---

## State Management

**Main store:** `src/stores/kopia.ts` (Zustand)

```typescript
import { useKopiaStore } from '@/stores/kopia';

// Direct store access
const snapshots = useKopiaStore((state) => state.snapshots);
const refresh = useKopiaStore((state) => state.refreshSnapshots);

// Via hooks (preferred)
import { useSnapshots } from '@/hooks';
const { snapshots, isLoading, refresh } = useSnapshots();
```

**Available hooks:**

- `useServerStatus()` - Server running state, start/stop
- `useRepositoryStatus()` - Repo connection state
- `useSnapshots()` - Snapshots + sources
- `usePolicies()` - Backup policies
- `useTasks()` - Background tasks
- `useMounts()` - Mounted snapshots
- `useCurrentRepoId()` - Current repository ID
- `useIsMobile()` - Viewport detection
- `useProviderConfig()` - Storage provider form helper

**Stores:**

- `kopia.ts` - All Kopia data (server, repo, snapshots, tasks, policies, mounts)
- `preferences.ts` - User settings (theme, language, fontSize, byteFormat, notifications)
- `profiles.ts` - Backup profiles (directory groups with policy presets)

**Polling intervals:**

- Server/Repository: 30s
- Tasks: 5s
- Sources: 3s

---

## Tauri Commands (56 total)

### Server (3)

- `kopia_server_start(repo_id)` → `KopiaServerInfo`
- `kopia_server_stop(repo_id)`
- `kopia_server_status(repo_id)` → `KopiaServerStatus`

### Multi-Repository (3)

- `list_repositories()` → `Vec<RepositoryEntry>`
- `add_repository(repo_id?)` → `String`
- `remove_repository(repo_id)`

### Repository (10)

- `repository_status(repo_id)` → `RepositoryStatus`
- `repository_connect(repo_id, config)`
- `repository_disconnect(repo_id)`
- `repository_create(repo_id, config)`
- `repository_exists(repo_id, storage)` → `bool`
- `repository_sync(repo_id)`
- `repository_get_algorithms(repo_id)` → `AlgorithmsResponse`
- `repository_update_description(repo_id, description)`
- `repository_get_throttle(repo_id)` → `ThrottleLimits`
- `repository_set_throttle(repo_id, limits)`

### Snapshots (10)

- `sources_list(repo_id)` → `SourcesResponse`
- `snapshot_create(repo_id, path, userName?, host?, createSnapshot?, policy?)`
- `snapshot_upload(repo_id, userName, host, path)`
- `snapshot_cancel(repo_id, userName, host, path)`
- `snapshot_pause(repo_id, userName, host, path)`
- `snapshot_resume(repo_id, userName, host, path)`
- `snapshots_list(repo_id, userName, host, path, all?)` → `SnapshotsResponse`
- `snapshot_edit(repo_id, request)`
- `snapshot_delete(repo_id, userName, host, path, manifestIDs)`
- `estimate_snapshot(repo_id, path, maxExamples?)` → task ID

### Browse & Restore (5)

- `object_browse(repo_id, objectId)` → `DirectoryObject`
- `object_download(repo_id, objectId, filename, targetPath)`
- `restore_start(repo_id, request)`
- `mount_snapshot(repo_id, root)`
- `mount_unmount(repo_id, objectId)`

### Mounts (1)

- `mounts_list(repo_id)` → `MountsResponse`

### Policies (5)

- `policies_list(repo_id)` → `PoliciesResponse`
- `policy_get(repo_id, userName?, host?, path?)` → `PolicyDefinition`
- `policy_resolve(repo_id, userName?, host?, path?, updates?)` → `ResolvedPolicyResponse`
- `policy_set(repo_id, policy, userName?, host?, path?)`
- `policy_delete(repo_id, userName?, host?, path?)`

### Tasks (5)

- `tasks_list(repo_id)` → `TasksResponse`
- `task_get(repo_id, taskId)` → `TaskDetail`
- `task_logs(repo_id, taskId)` → logs
- `task_cancel(repo_id, taskId)`
- `tasks_summary(repo_id)` → `TasksSummary`

### Maintenance (2)

- `maintenance_info(repo_id)` → maintenance status
- `maintenance_run(repo_id, full?)`

### Notifications (4)

- `notification_profiles_list(repo_id)` → `Vec<NotificationProfile>`
- `notification_profile_create(repo_id, profile)`
- `notification_profile_delete(repo_id, name)`
- `notification_profile_test(repo_id, profile)`

### System (4)

- `get_system_info()` → OS, arch, version
- `get_current_user()` → username, hostname
- `select_folder(defaultPath?)` → path
- `save_file(defaultFilename?)` → path

### Windows Service (5) - Windows only

- `service_install()`
- `service_uninstall()`
- `service_start()`
- `service_stop()`
- `service_status()` → `ServiceState`

---

## Code Patterns

### API Call (from component)

```typescript
import { useSnapshots } from '@/hooks';
import { getErrorMessage } from '@/lib/kopia/errors';
import { toast } from 'sonner';

function MyComponent() {
  const { snapshots, isLoading, refresh, createSnapshot } = useSnapshots();

  const handleCreate = async () => {
    try {
      await createSnapshot('/path/to/backup');
      toast.success(t('snapshots.created'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };
}
```

### Direct Tauri Command

```typescript
import { invoke } from '@tauri-apps/api/core';
import type { RepositoryStatus } from '@/lib/kopia/types';

const status = await invoke<RepositoryStatus>('repository_status', { repoId });
```

### i18n

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('overview.title')}</h1>;
}
```

### Form with shadcn/ui

```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="name">{t('common.name')}</Label>
    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
  </div>
  <Button onClick={handleSubmit}>{t('common.save')}</Button>
</div>
```

### Error Handling

```typescript
import { parseKopiaError, getErrorMessage, KopiaErrorCode } from '@/lib/kopia/errors';

try {
  await someOperation();
} catch (err) {
  const kopiaError = parseKopiaError(err);

  // Check specific error type
  if (kopiaError.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED)) {
    navigate('/setup');
    return;
  }

  // Get translated message for display
  toast.error(getErrorMessage(err));
}
```

---

## Tech Stack

| Category     | Technology   | Version       |
| ------------ | ------------ | ------------- |
| **Frontend** | React        | 19.2          |
|              | TypeScript   | 5.9 (strict)  |
|              | Vite         | 7.2           |
|              | Tailwind CSS | 4.1           |
|              | shadcn/ui    | 25 components |
|              | React Router | 7.12          |
|              | Zustand      | 5.0           |
|              | i18next      | 25.6          |
|              | Recharts     | 3.4           |
|              | Sonner       | 2.0           |
|              | Lucide React | 0.554         |
| **Backend**  | Tauri        | 2.9           |
|              | reqwest      | 0.11          |
|              | tokio        | 1.x           |
|              | serde        | 1.x           |
| **Testing**  | Vitest       | 4.0           |
|              | Cargo test   | -             |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React UI                         │
│  (Pages → Hooks → Stores → client.ts)              │
└────────────────────────┬────────────────────────────┘
                         │ invoke()
┌────────────────────────▼────────────────────────────┐
│              Tauri Backend (Rust)                   │
│  (commands/*.rs → kopia_server.rs)                 │
└────────────────────────┬────────────────────────────┘
                         │ HTTP (localhost)
┌────────────────────────▼────────────────────────────┐
│           Kopia Server Process                      │
│  (spawned with --ui --shutdown-on-stdin)           │
└────────────────────────┬────────────────────────────┘
                         │
              Storage Backend (S3, filesystem, etc.)
```

**Key Points:**

- Kopia binary bundled per platform (`bin/kopia-*`)
- Localhost-only, TLS with self-signed cert, random session password
- Polling-based updates (no websockets)
- Multi-repository support via ServerManager

---

## Project Structure

```
kopia-desktop/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui (25)
│   │   ├── layout/                # AppLayout, Sidebar, Titlebar
│   │   ├── kopia/
│   │   │   ├── setup/             # Repository wizard
│   │   │   │   ├── providers/     # 8 storage providers
│   │   │   │   └── steps/         # Wizard steps
│   │   │   ├── snapshots/         # PinDialog, RetentionTags
│   │   │   ├── policy/            # PolicyEditor, PolicyFields
│   │   │   ├── profiles/          # ProfileFormDialog, ProfilesTable
│   │   │   └── notifications/     # NotificationProfiles
│   │   └── onboarding/            # OnboardingWizard
│   ├── pages/                     # 18 route pages
│   ├── hooks/                     # 9 custom hooks
│   ├── stores/                    # 3 Zustand stores
│   ├── lib/
│   │   ├── kopia/                 # client.ts, types.ts, errors.ts
│   │   ├── utils/                 # cn.ts, format functions
│   │   └── i18n/locales/          # en.json, es.json
│   └── styles/globals.css
├── src-tauri/
│   ├── src/
│   │   ├── commands/              # kopia.rs, system.rs, windows_service.rs
│   │   ├── tests/                 # 13 test files
│   │   ├── kopia_server.rs        # Server lifecycle
│   │   ├── server_manager.rs      # Multi-repo management
│   │   ├── types.rs               # Rust types (66)
│   │   ├── error.rs               # Error handling
│   │   ├── windows_service.rs     # Windows service impl
│   │   └── windows_ipc.rs         # Named pipe IPC
│   ├── Cargo.toml
│   └── tauri.conf.json
├── tests/                         # Frontend tests (10)
├── bin/                           # Kopia binaries (auto-downloaded)
└── scripts/                       # download-kopia.sh, bump-version.sh
```

---

## Storage Providers

Provider components in `src/components/kopia/setup/providers/`:

| Provider   | File                   | Config Type                                                          |
| ---------- | ---------------------- | -------------------------------------------------------------------- |
| Filesystem | FilesystemProvider.tsx | `{ path }`                                                           |
| S3         | S3Provider.tsx         | `{ bucket, endpoint, accessKeyID, secretAccessKey, region, prefix }` |
| B2         | B2Provider.tsx         | `{ bucket, keyID, key, prefix }`                                     |
| Azure      | AzureProvider.tsx      | `{ container, storageAccount, storageKey, prefix }`                  |
| GCS        | GCSProvider.tsx        | `{ bucket, credentialsFile, prefix }`                                |
| SFTP       | SFTPProvider.tsx       | `{ path, host, port, username, password/keyfile }`                   |
| WebDAV     | WebDAVProvider.tsx     | `{ url, username, password }`                                        |
| Rclone     | RcloneProvider.tsx     | `{ remotePath, rcloneExe }`                                          |

---

## Error Codes

**Kopia API errors** (12):
`INTERNAL`, `ALREADY_CONNECTED`, `ALREADY_INITIALIZED`, `INVALID_PASSWORD`, `INVALID_TOKEN`, `MALFORMED_REQUEST`, `NOT_CONNECTED`, `NOT_FOUND`, `NOT_INITIALIZED`, `PATH_NOT_FOUND`, `STORAGE_CONNECTION`, `ACCESS_DENIED`

**Desktop error codes** (9):
`SERVER_NOT_RUNNING`, `SERVER_ALREADY_RUNNING`, `REPOSITORY_NOT_CONNECTED`, `REPOSITORY_ALREADY_EXISTS`, `POLICY_NOT_FOUND`, `HTTP_REQUEST_FAILED`, `RESPONSE_PARSE_ERROR`, `NOT_FOUND`, `OPERATION_FAILED`

---

## Common Tasks

### Add a new page

1. Create `src/pages/MyPage.tsx`
2. Add route in `src/App.tsx`
3. Add translations in `src/lib/i18n/locales/{en,es}.json`
4. Add to sidebar in `src/components/layout/AppSidebar.tsx` if needed

### Add a new Tauri command

1. Add function in `src-tauri/src/commands/kopia.rs`
2. Register in `src-tauri/src/lib.rs` invoke_handler
3. Add wrapper in `src/lib/kopia/client.ts`
4. Add types if needed in both `src-tauri/src/types.rs` and `src/lib/kopia/types.ts`

### Add a new hook

1. Create `src/hooks/useMyHook.ts`
2. Export from `src/hooks/index.ts`
3. Pattern: thin wrapper around store selectors

### Add a storage provider

1. Create `src/components/kopia/setup/providers/MyProvider.tsx`
2. Export from `src/components/kopia/setup/providers/index.ts`
3. Add to provider list in `src/components/kopia/setup/steps/ProviderSelection.tsx`
4. Add storage config type in `src/lib/kopia/types.ts`

### Add i18n keys

1. Add to `src/lib/i18n/locales/en.json`
2. Add to `src/lib/i18n/locales/es.json`
3. Use: `const { t } = useTranslation(); t('key.path')`

---

## Testing

```bash
# Frontend
pnpm test:run              # Single run
pnpm test                  # Watch mode
pnpm test:coverage         # Coverage report

# Backend
pnpm test:rust             # All tests
pnpm test:rust:coverage:html  # Coverage (opens browser)

# Integration tests (need Kopia binary)
KOPIA_PATH=/path/to/kopia cargo test --lib kopia_api_integration -- --ignored --test-threads=1
```

---

## Development Guidelines

**Before committing:**

```bash
pnpm validate:fix   # Auto-fix + test
```

**Code style:**

- Use path alias `@/` for all imports
- Prefer hooks over direct store access in components
- Use `getErrorMessage()` for user-facing error messages
- Use `toast.success/error()` from sonner for notifications
- Disable chart animations: `isAnimationActive={false}`

**Security:**

- Never log passwords, tokens, or sensitive data
- Validate user inputs
- Sanitize file paths

**Performance:**

- Clean up listeners/timers on unmount
- Use deduplication in store for API calls
- Polling only (no websockets needed)

---

## Windows Service

Windows-only feature for running Kopia as a system service:

- Service name: `KopiaDesktopService`
- IPC: Named pipe `\\.\pipe\kopia-desktop-service`
- Management: `src/pages/Preferences.tsx` → Windows Service section
- Backend: `src-tauri/src/windows_service.rs`, `windows_ipc.rs`

---

## Resources

- Kopia: https://kopia.io/docs/
- Tauri: https://tauri.app/
- shadcn/ui: https://ui.shadcn.com/
- Zustand: https://docs.pmnd.rs/zustand/
- React Router v7: https://reactrouter.com/
