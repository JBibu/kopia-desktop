# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working with this repository.

## Project Status: NOT YET INITIALIZED ⚠️

**Phase:** Pre-development - Project not started yet  
**Philosophy:** Perfect the foundation before features. Modern stack, clean code, type safety first.

## Project Overview

**Kopia-UI** - Modern Desktop UI for Kopia Backup

React + Tauri desktop app providing an intuitive interface for Kopia backup management: repositories, snapshots, policies, and restore operations. Fully internationalized (EN/ES).

---

## Quick Start

```bash
pnpm install      # Install dependencies
pnpm dev          # Start Tauri app in development mode
pnpm build        # Build for production
pnpm package      # Package app for distribution
pnpm lint         # Lint code (must pass before commit)
pnpm test         # Run tests
pnpm test:e2e     # Run end-to-end tests
```

---

## Tech Stack

### Core

- **React 19** + TypeScript (strict mode)
- **Tauri** (backend + frontend)
- **Vite** (bundling + HMR)
- **pnpm** (required package manager)

### UI

- **Tailwind CSS 4** + shadcn/ui
- **React Router v6**

### Data & Forms

- **Zustand** or React Context
- **react-hook-form** + Zod validation

### i18n

- **react-i18next** (EN/ES)

### Testing

- **Vitest** (unit + integration)
- **React Testing Library**
- **Playwright** (E2E)

### Import Aliases

```typescript
@/*                  // Simplified: maps to ./src/* (covers all subdirectories)
```

**Note:** All imports use the single `@/*` alias. Example: `import { cn } from '@/lib/utils'`

---

## Kopia Backend Architecture

**Approach:** Embedded Server Mode (matches official KopiaUI)

### How It Works

1. Tauri **bundles `kopia` binary** (platform-specific)
2. Backend process **spawns `kopia server`** on app launch
3. React UI communicates via **REST API + WebSocket**
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
- macOS: `KopiaUI.app/Contents/Resources/bin/kopia`
- Linux: `resources/bin/kopia`

### Communication Flow

```
React UI (Frontend)
    ↓ HTTP/REST + WebSocket
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
- WebSocket for real-time progress

---

## Architecture

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

## Important Implementation Notes

### Policy Inheritance System

Policies use a 4-level hierarchy with inheritance:

```
Global (*/*/*)
  ↓ inherits
Per-Host (@host/*/*)
  ↓ inherits
Per-User (user@host/*)
  ↓ inherits
Per-Path (user@host/path)
```

More specific settings override less specific ones. This is complex but powerful!

### Snapshot Sources Format

Sources are identified as: `user@host:/path`

- Local snapshots: current `user@host`
- All snapshots: any `user@host`

### Task Management

- Scheduled snapshots run in background (only when server mode is running)
- Multiple snapshots can run in parallel (configurable)
- Tasks can be long-running (hours for large datasets)
- Must handle task cancellation gracefully

### Repository Config

- Stored in `~/.config/kopia/` (Linux/macOS) or `%APPDATA%\kopia` (Windows)
- Files ending in `*.config` are auto-detected by KopiaUI
- Password is required for connection
- Multiple repos = multiple config files

### .kopiaignore Files

- Per-directory ignore rules (like .gitignore)
- Must be handled correctly during snapshot tree traversal
- Can be overridden by policy ignore rules

### Performance Considerations

- Parallel snapshots setting affects CPU/memory
- Parallel file reads affects upload speed
- Compression trades CPU for storage
- Large repositories (>10TB) need special handling

### Authentication

- Local server: `--random-password` generates per-session password
- Server stores password for API access
- HTTPS with self-signed cert for localhost
- CSRF token checks (can disable with `--disable-csrf-token-checks` for dev)

### Common Gotchas

1. **Actions disabled by default** - Must enable in config
2. **WebSocket reconnection** - Handle server restarts
3. **Incomplete snapshots** - Show clearly in UI (checkpoint behavior)
4. **Repository maintenance** - Can take a long time, warn users
5. **Password recovery** - Impossible! Must warn prominently
6. **Multi-repo UX** - Right-click tray menu for "Connect To Another Repository"

---

## Testing Strategy

### Unit Tests (Vitest)

- Component logic and utilities
- Validation schemas (Zod)
- API client functions
- Store/state management

### Integration Tests (Vitest + RTL)

- Component interactions
- Form submissions
- Command mocks
- API flows

### E2E Tests (Playwright)

- Critical user journeys
- Repository setup flow
- Snapshot create/restore
- Multi-window scenarios

### Requirements

- ✅ All features require tests
- ✅ 80%+ coverage for utils/API
- ✅ E2E for critical workflows
- ✅ Tests pass before merge

### Commands

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage
pnpm test:e2e          # E2E tests
pnpm test:e2e:ui       # Playwright UI
```

---

## Validation System

### Define Once, Use Everywhere

**Schema Definition:**

```typescript
// lib/validations/backup-policy.ts
export const BackupPolicySchema = z.object({
  retentionPolicy: z.object({
    keepLatest: z.number().int().positive(),
    keepDaily: z.number().int().nonnegative(),
  }),
  schedulingPolicy: z.object({
    interval: z.string().regex(/^\d+[hdm]$/),
  }),
});
```

**Form Usage:**

```typescript
const form = useForm({
  resolver: zodResolver(BackupPolicySchema),
});
```

**API Validation:**

```typescript
const result = BackupPolicySchema.safeParse(data);
if (!result.success) throw new ValidationError(result.error);
```

---

## Error Handling

### Principle: Fail Fast, Report Clearly

**API Errors:**

```typescript
try {
  const result = await invoke('kopia_command', { args });
} catch (error) {
  if (error.includes('connection refused')) {
    toast.error('Cannot connect to Kopia server');
  } else if (error.includes('invalid password')) {
    toast.error('Invalid repository password');
  } else {
    toast.error(`Error: ${error}`);
  }
}
```

**Validation Errors:**

```typescript
const result = BackupPolicySchema.safeParse(formData);
if (!result.success) {
  const errors = result.error.flatten();
  // Show inline field errors
  setFieldErrors(errors.fieldErrors);
}
```

**Backend Errors:**

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
git clone <repo-url>
cd kopia-ui

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
kopia-ui/
├── src/                          # React frontend
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   └── kopia/                # Kopia-specific components
│   ├── lib/
│   │   ├── kopia/                # Kopia API client
│   │   ├── utils/                # Utilities
│   │   └── validations/          # Zod schemas
│   ├── pages/                    # Route pages
│   ├── hooks/                    # Custom React hooks
│   ├── stores/                   # Zustand stores
│   ├── i18n/                     # Translations (EN/ES)
│   └── App.tsx                   # Root component
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── commands/             # Tauri command handlers
│   │   │   ├── kopia.rs          # Kopia operations
│   │   │   └── system.rs         # System operations
│   │   ├── kopia_server.rs       # Kopia server management
│   │   └── main.rs               # Tauri app entry
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
│
├── tests/
│   ├── unit/                     # Vitest unit tests
│   ├── integration/              # Vitest integration tests
│   └── e2e/                      # Playwright E2E tests
│
├── bin/                          # Kopia binaries (dev)
│   ├── kopia-linux
│   ├── kopia-macos
│   └── kopia-windows.exe
│
├── public/                       # Static assets
├── package.json                  # Frontend dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite config
├── tailwind.config.js            # Tailwind config
└── README.md                     # User-facing docs
```

---

## Key Dependencies

### Frontend

```json
{
  "react": "^19.0.0",
  "react-router-dom": "^6.22.0",
  "@tauri-apps/api": "^1.5.0",
  "zustand": "^4.5.0",
  "react-hook-form": "^7.50.0",
  "zod": "^3.22.0",
  "react-i18next": "^14.0.0",
  "tailwindcss": "^4.0.0",
  "lucide-react": "^0.344.0"
}
```

### Backend (Cargo.toml)

```toml
[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1", features = ["full"] }
```

### Development

```json
{
  "@tauri-apps/cli": "^1.5.0",
  "vite": "^5.1.0",
  "vitest": "^1.3.0",
  "@playwright/test": "^1.42.0",
  "eslint": "^8.56.0",
  "prettier": "^3.2.0",
  "typescript": "^5.3.0"
}
```

---

## Development Roadmap

### 🏗️ Phase 1: Foundation (Start Here)

**Project Setup**

- [x] Initialize Tauri + React + Vite
- [ ] Configure TypeScript strict mode
- [ ] Setup Tailwind CSS + shadcn/ui
- [ ] Configure ESLint + Prettier
- [ ] Setup testing frameworks
- [ ] Configure i18n (EN/ES)
- [ ] Setup Zustand stores

**Kopia Server Integration**

- [ ] Implement Kopia binary management
- [ ] Server spawn/shutdown lifecycle
- [ ] Port/password detection
- [ ] Health check endpoint
- [ ] Graceful error handling

**Basic UI Shell**

- [ ] App layout (sidebar + content)
- [ ] Navigation routing
- [ ] Theme system (light/dark)
- [ ] Language switcher
- [ ] Loading states

### 🔧 Phase 2: Core Features

**Repository Management**

- [ ] Connect to existing repository
- [ ] Create new repository
- [ ] Repository status display
- [ ] Disconnect/reconnect
- [ ] Multi-repository support

**Snapshot Operations**

- [ ] List snapshots (with filters)
- [ ] View snapshot details
- [ ] Create manual snapshots
- [ ] Delete/verify snapshots
- [ ] Compare snapshots (diff)

**Policy Management**

- [ ] View/edit backup policies
- [ ] Retention configuration
- [ ] Scheduling configuration
- [ ] Compression settings
- [ ] Exclusion rules

**Restore Operations**

- [ ] Browse snapshot contents
- [ ] Select files/folders
- [ ] Restore to location
- [ ] Mount snapshots
- [ ] Progress monitoring

**Monitoring**

- [ ] Backup success/failure rates
- [ ] Storage usage trends
- [ ] Snapshot size trends
- [ ] Deduplication stats

### 🎯 Phase 3: Polish

- [ ] System tray integration
- [ ] Native notifications
- [ ] Application menu
- [ ] Keyboard shortcuts
- [ ] Auto-updates
- [ ] Error logging/monitoring
- [ ] Performance optimization
- [ ] Security hardening

---

## Kopia REST API

The Kopia server exposes REST API endpoints that your UI will consume.

### Key API Endpoints

**Repository**

- `GET /api/v1/repo/status` - Repository status and stats
- `POST /api/v1/repo/connect` - Connect to repository
- `POST /api/v1/repo/disconnect` - Disconnect
- `POST /api/v1/repo/create` - Create new repository
- `GET /api/v1/repo/algorithms` - Available algorithms

**Snapshots**

- `POST /api/v1/snapshots` - List snapshots (with filters)
- `POST /api/v1/sources` - List snapshot sources
- `POST /api/v1/snapshots/{id}` - Get snapshot details
- `DELETE /api/v1/snapshots/{id}` - Delete snapshot
- `POST /api/v1/sources/{source}/snapshot` - Create snapshot
- `POST /api/v1/snapshots/compare` - Compare snapshots

**Policies**

- `GET /api/v1/policies` - List all policies
- `GET /api/v1/policy/{target}` - Get specific policy
- `PUT /api/v1/policy/{target}` - Set/update policy
- `DELETE /api/v1/policy/{target}` - Delete policy

**Tasks**

- `GET /api/v1/tasks` - List active tasks
- `GET /api/v1/tasks/{id}` - Get task details
- `POST /api/v1/tasks/{id}/cancel` - Cancel task
- `GET /api/v1/tasks/summary` - Task summary

**Restore**

- `POST /api/v1/restore` - Start restore operation
- `GET /api/v1/restore/{id}` - Get restore progress

**Mount**

- `POST /api/v1/mounts` - Mount snapshot
- `GET /api/v1/mounts` - List active mounts
- `DELETE /api/v1/mounts/{id}` - Unmount

**Maintenance**

- `POST /api/v1/repo/maintenance/run` - Run maintenance
- `GET /api/v1/repo/maintenance/info` - Maintenance info

**Notifications**

- `GET /api/v1/notification-profiles` - List profiles
- `POST /api/v1/notification-profiles` - Create profile
- `PUT /api/v1/notification-profiles/{id}` - Update profile

**Preferences**

- `GET /api/v1/ui-preferences` - Get UI preferences
- `PUT /api/v1/ui-preferences` - Save UI preferences

### WebSocket Updates

Connect to WebSocket for real-time updates:

- `ws://localhost:{port}/api/v1/ws`

Events:

- `task-progress` - Task progress updates
- `snapshot-progress` - Snapshot creation progress
- `error` - Error notifications
- `notification` - General notifications

---

## Security Considerations

**Credentials**

- Use Tauri's secure storage for Kopia passwords
- Never log sensitive data
- Clear credentials on disconnect

**Command Security**

- Validate all frontend data
- Use Rust's type system for safety
- Sanitize file paths
- Explicit consent for self-signed certs

**Content Security**

- Implement strict CSP
- Sanitize all user inputs
- Validate file paths
- Explicit consent for self-signed certs

---

## UI/UX Design Guidelines

### Critical User Warnings

⚠️ These messages MUST be prominent:

1. **Password Loss** - "There is NO way to recover your repository password. Store it securely!"
2. **Maintenance Duration** - "Repository maintenance may take several hours for large repos"
3. **Repository Deletion** - "Deleting a repository is permanent and unrecoverable"
4. **Snapshot Deletion** - "Deleted snapshots cannot be recovered"

### Status Indicators

- **Repository**: Connected (green), Disconnected (gray), Error (red)
- **Tasks**: Running (blue spinner), Success (green check), Failed (red X), Incomplete (yellow)
- **Snapshots**: Complete, Incomplete, Failed, Verifying
- **Server**: Running (green), Stopped (red), Starting (yellow)

### User Feedback

- Show progress for long operations (snapshots, restore, maintenance)
- Display file count, byte count, and estimated time remaining
- Show errors inline with actionable messages
- Toast notifications for background completions

### Navigation Structure

```
Main Window
├── Repository Tab
│   ├── Status & Info
│   ├── Maintenance Actions
│   └── Config File Location
├── Snapshots Tab
│   ├── Snapshot List (filterable)
│   ├── Snapshot Details
│   └── Restore/Mount/Compare Actions
├── Policies Tab
│   ├── Policy List (all levels)
│   ├── Policy Editor
│   └── "Snapshot Now" Quick Action
├── Tasks Tab
│   ├── Active Tasks
│   ├── Task History
│   └── Task Logs
└── Preferences Tab
    ├── Notification Profiles
    ├── UI Settings (theme, language)
    └── Advanced Settings

System Tray
├── Show Window
├── Snapshot Now (default policy)
├── Connect to Another Repository
├── Recent Snapshots
└── Quit
```

### Form Design

- Policy forms are COMPLEX - use clear sections
- Show inherited values vs overridden values
- Provide sensible defaults
- Use tooltips for advanced options
- Validate inputs before submission

### Empty States

- No repositories: Prompt to create or connect
- No snapshots: Show "Create your first backup" CTA
- No policies: Explain policy hierarchy
- No tasks: "No background tasks running"

### Error Handling

- Network errors: "Cannot connect to Kopia server"
- Auth errors: "Invalid repository password"
- Server errors: Show detailed error message + action button
- Validation errors: Inline with specific field

### Accessibility

- Keyboard navigation for all actions
- Screen reader support
- High contrast mode
- Focus indicators
- ARIA labels

---

## Performance Best Practices

**Data Loading**

- Lazy load snapshot data
- Paginate large lists
- Virtual scrolling (`react-window`)

**Command Optimization**

- Batch multiple calls
- Stream large data transfers
- Implement request cancellation

**Memory Management**

- Monitor Tauri memory
- Clean up listeners on unmount
- Use async Rust for heavy ops

---

## Common Kopia Operations

### Connect Repository

```typescript
import { invoke } from '@tauri-apps/api/tauri';

await invoke('connect_repository', {
  type: 'filesystem',
  path: '/backup/repository',
  password: 'secure-password',
});
```

### Create Snapshot

```typescript
await invoke('create_snapshot', {
  source: '/data/to/backup',
  policy: 'default',
});

// Progress updates via Tauri events
import { listen } from '@tauri-apps/api/event';

listen('snapshot-progress', (event) => {
  console.log(`Progress: ${event.payload.percentage}%`);
});
```

### List Snapshots

```typescript
const snapshots = await invoke('list_snapshots', {
  source: 'host@path',
  limit: 100,
  sortBy: 'time',
});
```

### Restore Files

```typescript
await invoke('restore_files', {
  snapshotId: 'k123abc',
  targetPath: '/restore/destination',
  overwrite: false,
});
```

---

## Tauri-Specific Features

### System Tray

```rust
use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayMenuItem};

let show = CustomMenuItem::new("show".to_string(), "Show");
let snapshot = CustomMenuItem::new("snapshot".to_string(), "Create Snapshot");
let quit = CustomMenuItem::new("quit".to_string(), "Quit");

let tray_menu = SystemTrayMenu::new()
  .add_item(show)
  .add_item(snapshot)
  .add_native_item(SystemTrayMenuItem::Separator)
  .add_item(quit);

let system_tray = SystemTray::new().with_menu(tray_menu);
```

### Native Notifications

```rust
use tauri::api::notification::Notification;

Notification::new(&app.handle())
  .title("Snapshot Complete")
  .body("1,234 files backed up successfully")
  .show()?;
```

### Auto-Updates

```rust
use tauri::updater::UpdateResponse;

let update_response = app.updater().check().await?;
if update_response.is_update_available() {
  update_response.download_and_install().await?;
}
```

---

## Remember

This is a **backup management interface**. Prioritize:

- ✅ **Reliability** - Data integrity is paramount
- ✅ **Clarity** - Clear feedback and error messages
- ✅ **Recovery** - Handle errors gracefully
- ✅ **Trust** - Users may be recovering from data loss

Build with confidence and empathy for users in stressful situations.
