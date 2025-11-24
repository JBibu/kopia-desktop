# Kopia Desktop

> ⚠️ This is a **community-built alternative** to [KopiaUI](https://github.com/kopia/htmlui), not affiliated with the official Kopia project.

A modern, lightweight desktop application for [Kopia](https://kopia.io) backup management. Built with **Tauri + React** as a faster, smaller alternative to the Electron-based official KopiaUI.

<br/>
<div align="center">
  <img width="820" alt="Kopia Desktop Screenshot" src="https://github.com/user-attachments/assets/4f20cb8f-c1ce-4671-ab8c-0981bcd2de52" />
</div>

---

## ✨ Features

### Core Functionality

- ✅ **Repository Management** - Connect to existing repositories or create new ones with 8 storage providers
- ✅ **Snapshots** - Create, browse, restore, mount, pin, and manage snapshots with retention policies
- ✅ **Backup Profiles** - Organize multiple backup sources with custom schedules and policies
- ✅ **Policies** - Global, per-host, per-user, and per-path policies with inheritance
- ✅ **Tasks** - Real-time task monitoring with progress bars and desktop notifications
- ✅ **Maintenance** - Repository maintenance and optimization tools
- ✅ **Workflow Parity** - 100% feature parity with official Kopia HTMLui

### Storage Providers

- 🗂️ **Filesystem** - Local directories or network shares
- ☁️ **S3** - Amazon S3 and compatible services (MinIO, Wasabi, etc.)
- 🔷 **Backblaze B2** - Cost-effective cloud storage
- 🔷 **Azure Blob Storage** - Microsoft Azure cloud storage
- 🔷 **Google Cloud Storage (GCS)** - Google Cloud Platform storage
- 🔐 **SFTP** - Secure file transfer protocol
- 🌐 **WebDAV** - Web-based distributed authoring and versioning
- 🔄 **Rclone** - Support for 40+ cloud providers via Rclone

### User Experience

- 🎨 **Theme System** - Light, dark, and system theme with persistence
- 🌍 **Internationalization** - English and Spanish translations
- 📱 **Responsive Design** - Adapts to different window sizes
- 🔔 **Desktop Notifications** - Task completion alerts
- 🎯 **System Tray** - Minimize to tray, background operation
- ⚡ **Real-time Updates** - WebSocket + polling hybrid for reliable state
- 🪟 **Custom Window** - Native-looking titlebar and controls
- 🖥️ **Windows Service** - Run as system service with auto-start (Windows only)

### Testing & Quality

- ✅ **418 total tests** (136 Rust + 194 frontend + 78 E2E)
- ✅ Comprehensive test coverage across all layers
- ✅ CI/CD pipeline with automated testing
- ✅ Production-ready code quality

---

## 🚀 Quick Start

```bash
pnpm install          # Install dependencies + download Kopia binary
pnpm tauri:dev        # Start development (first build: 5-10 min)
```

**Requirements:**

- Node.js 20.19+
- pnpm 10+
- [Rust toolchain](https://rustup.rs/)
- Linux: `webkit2gtk`, `libappindicator3` (see [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

---

## 📦 Tech Stack

### Frontend

- **React 19.2** - UI library with strict mode
- **TypeScript 5.9** - Type-safe development with strict mode
- **Vite 7.2** - Fast build tool with HMR
- **Tailwind CSS 4.1** - Utility-first CSS framework
- **shadcn/ui** - 23 accessible UI components built on Radix UI
- **React Router 7.9** - Client-side routing
- **Zustand 5.0** - Lightweight state management (3 stores)
- **i18next 25.6** - Internationalization (English, Spanish)
- **Recharts 3.4** - Data visualization and charts
- **Sonner 2.0** - Toast notifications
- **Lucide React** - Icon library
- **next-themes 0.4** - Theme management with system detection

### Backend

- **Tauri 2.9** - Rust-based desktop framework
- **reqwest 0.11** - HTTP client for Kopia API
- **tokio 1.x** - Async runtime
- **tokio-tungstenite 0.24** - WebSocket client
- **serde/serde_json** - Serialization
- **windows-service 0.7** - Windows service support (Windows only)
- **windows-sys 0.59** - Windows IPC via named pipes (Windows only)
- **Tauri plugins** - shell, notification, dialog

### Testing

- **Vitest 4.0** - Frontend unit tests (194 tests)
- **Playwright 1.56** - E2E tests (78 tests)
- **cargo test** - Rust backend tests (136 tests)
- **cargo-llvm-cov** - Rust code coverage

---

## 🏗️ Architecture

### Embedded Server Model

Kopia Desktop uses the same architecture as official KopiaUI:

```
┌─────────────────────────────────┐
│     React UI (Frontend)         │
│  - 15 pages (routes)            │
│  - 3 Zustand stores             │
│  - Real-time state updates      │
└────────────┬────────────────────┘
             │
             │ HTTP REST API (52 commands)
             │ WebSocket (real-time events)
             │
             ↓
┌─────────────────────────────────┐
│    Tauri Backend (Rust)         │
│  - 52 Tauri commands            │
│  - HTTP client (reqwest)        │
│  - WebSocket client             │
│  - Process management           │
└────────────┬────────────────────┘
             │
             │ Process spawn
             │ kopia server start --ui
             │
             ↓
┌─────────────────────────────────┐
│     Kopia Server (Embedded)     │
│  - HTTPS API (localhost)        │
│  - Random port (30000-40000)    │
│  - TLS self-signed cert         │
│  - Random 24-char password      │
└─────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│  Repositories / Storage         │
│  - Filesystem, S3, B2, etc.     │
│  - Snapshots, policies, tasks   │
└─────────────────────────────────┘
```

### Key Architectural Decisions

1. **Embedded Kopia Binary**
   - Platform-specific binary bundled with app
   - Auto-downloaded during `pnpm install`
   - Located in `bin/` directory

2. **Localhost-Only Security**
   - Server only listens on `127.0.0.1`
   - TLS with self-signed certificate
   - Random password per session (24 characters)
   - No remote access possible

3. **Hybrid State Updates**
   - WebSocket for instant updates during active operations
   - Polling for reliable state synchronization
   - Server/Repository: 30s intervals
   - Tasks/Sources: 5s intervals

4. **Centralized State Management**
   - Single Zustand store for all Kopia data
   - Eliminates redundant API calls
   - Components share same state
   - Hooks are thin wrappers around store selectors

### Tauri Commands (52 total)

**Server (3):** `start`, `stop`, `status`
**Repository (9):** `status`, `connect`, `disconnect`, `create`, `exists`, `get_algorithms`, `update_description`
**Snapshots (6):** `sources_list`, `snapshot_create`, `snapshot_cancel`, `snapshots_list`, `snapshot_edit`, `snapshot_delete`
**Browsing (2):** `object_browse`, `object_download`
**Restore (4):** `restore_start`, `mount_snapshot`, `mounts_list`, `mount_unmount`
**Policies (5):** `policies_list`, `policy_get`, `policy_resolve`, `policy_set`, `policy_delete`
**Tasks (5):** `tasks_list`, `task_get`, `task_logs`, `task_cancel`, `tasks_summary`
**Maintenance (2):** `maintenance_info`, `maintenance_run`
**Utilities (2):** `path_resolve`, `estimate_snapshot`
**Notifications (4):** `notification_profiles_list`, `create`, `delete`, `test`
**System (4):** `get_system_info`, `get_current_user`, `select_folder`, `save_file`
**WebSocket (2):** `websocket_connect`, `websocket_disconnect`
**Windows Service (5):** `install`, `uninstall`, `start`, `stop`, `status` (Windows only)

---

## 🪟 Windows Service Support

Run Kopia server as a Windows system service for automatic startup.

### Architecture

```
┌─────────────────────────────────────────┐
│  GUI Application (User Session)         │
│  - Service management UI (Preferences)  │
│  - Real-time status monitoring          │
└────────────┬────────────────────────────┘
             │
             │ Named Pipe IPC
             │ \\.\pipe\kopia-desktop-service
             │
             ↓
┌─────────────────────────────────────────┐
│  Windows Service (LocalSystem)          │
│  - KopiaDesktopService                  │
│  - Auto-starts on boot                  │
│  - Manages Kopia server process         │
└────────────┬────────────────────────────┘
             │
             │ Process spawn
             │
             ↓
┌─────────────────────────────────────────┐
│  Kopia Server (Fixed port: 51515)      │
│  - Config: %ProgramData%\Kopia Desktop  │
└─────────────────────────────────────────┘
```

### Features

- **Auto-start** - Starts automatically with Windows
- **Background operation** - Runs without user login
- **Named pipe IPC** - Secure communication with GUI
- **Service management** - Install/uninstall from Preferences UI
- **Dual-mode binary** - Same executable for GUI and service

### Usage

1. Open Preferences → Windows Service
2. Click "Install Service" (requires administrator)
3. Service starts automatically
4. Manage from Preferences or Windows Services (`services.msc`)

**Command line:**

```powershell
# Install (as Administrator)
.\kopia-desktop.exe --install-service

# Uninstall
.\kopia-desktop.exe --uninstall-service

# Run as service (used by Windows SCM)
.\kopia-desktop.exe --service
```

---

## 🛠️ Development

### Common Commands

```bash
# Development
pnpm tauri:dev          # Development mode with hot reload
pnpm tauri:build        # Production build

# Code Quality
pnpm validate           # Run all checks (typecheck, lint, format, test)
pnpm validate:fix       # Run all checks with auto-fix
pnpm typecheck          # TypeScript type checking
pnpm lint               # Lint with auto-fix
pnpm lint:check         # Lint without auto-fix
pnpm format             # Format with Prettier
pnpm format:check       # Check formatting

# Testing
pnpm test:run           # Frontend unit tests (194 tests)
pnpm test:coverage      # Frontend coverage report
pnpm test:rust          # Rust backend tests (136 tests)
pnpm test:rust:coverage:html  # Rust coverage (opens in browser)
pnpm test:e2e           # E2E tests with Playwright (78 tests)
pnpm test:e2e:ui        # Interactive E2E test runner

# Utilities
pnpm clean              # Clear build caches
pnpm clean:full         # Full clean (removes node_modules, reinstalls)
```

### Project Structure

```
kopia-desktop/
├── src/                           # React frontend
│   ├── components/
│   │   ├── ui/                    # 23 shadcn/ui components
│   │   ├── layout/                # AppLayout, Sidebar, Titlebar
│   │   └── kopia/                 # Domain-specific components
│   │       ├── setup/             # Repository setup wizard
│   │       ├── snapshots/         # Pin dialog, retention tags
│   │       ├── policy/            # Policy editor
│   │       ├── profiles/          # Profile management
│   │       └── notifications/     # Notification profiles
│   ├── pages/                     # 15 route pages
│   ├── stores/                    # 3 Zustand stores
│   ├── hooks/                     # 2 custom hooks
│   ├── lib/
│   │   ├── kopia/                 # Kopia client & types
│   │   ├── utils/                 # Utilities
│   │   └── i18n/                  # Translations
│   └── styles/                    # Global CSS
│
├── src-tauri/                     # Rust backend
│   ├── src/
│   │   ├── commands/              # 52 Tauri commands
│   │   │   ├── kopia.rs           # 41 Kopia API commands
│   │   │   ├── system.rs          # 4 system commands
│   │   │   ├── websocket.rs       # 2 WebSocket commands
│   │   │   └── windows_service.rs # 5 Windows service commands
│   │   ├── kopia_server.rs        # Server lifecycle management
│   │   ├── kopia_websocket.rs     # WebSocket client
│   │   ├── error.rs               # 51 error variants
│   │   └── types.rs               # Rust type definitions
│   └── Cargo.toml
│
├── tests/                         # Test suite
│   ├── unit/                      # 194 unit tests
│   │   ├── hooks/                 # Hook tests
│   │   ├── lib/                   # Utility & client tests
│   │   └── stores/                # Store tests
│   ├── integration/               # 34 integration tests
│   └── e2e/                       # 78 E2E tests (Playwright)
│
├── bin/                           # Kopia binaries (auto-downloaded)
├── scripts/                       # Build & utility scripts
└── README.md                      # This file
```

### Development Best Practices

**Security:**

- Never log sensitive data (passwords, tokens)
- Validate all user inputs
- Sanitize file paths before use
- Use Rust's type system for memory safety

**Performance:**

- Centralized polling (no per-component polling)
- Clean up event listeners on unmount
- Disable chart animations (`isAnimationActive={false}`)
- Use React.memo() for expensive components

**User Experience:**

- Clear empty states with call-to-action buttons
- Show inherited vs overridden policy values
- Provide sensible defaults in forms
- Toast notifications for background operations
- Support keyboard navigation
- Minimize to tray instead of closing

**Code Quality:**

- Run `pnpm validate` before committing
- Write descriptive commit messages
- Keep components small and focused
- Use TypeScript strict mode
- Follow existing code patterns

---

## 🧪 Testing

### Test Coverage

| Type                   | Count   | Coverage          | Status                  |
| ---------------------- | ------- | ----------------- | ----------------------- |
| Rust Unit Tests        | 136     | ~65%              | ✅ 100% passing         |
| Rust Integration Tests | 10      | Full API          | ✅ 100% passing         |
| Frontend Unit Tests    | 194     | 84% statements    | ✅ 100% passing         |
| E2E Tests (Playwright) | 78      | Full workflows    | ✅ 100% passing         |
| **Total**              | **418** | **Comprehensive** | **✅ Production Ready** |

### Test Types

**Unit Tests (194)**

- Utilities: `formatBytes`, `formatDuration`, `cn` (classname helper)
- Hooks: `useIsMobile`, `useProviderConfig`
- Stores: `preferences`, `profiles`
- Error handling: 42 error variant tests

**Integration Tests (34)**

- Formatting integration across components
- Preferences workflow (theme, language, font size)
- Profiles workflow (CRUD operations)

**E2E Tests (78)**

- Navigation across all 15 pages
- Repository setup wizard
- Backup profiles management
- Preferences UI interactions

**Rust Tests (146)**

- Server lifecycle (start/stop/status)
- HTTP client operations
- Error handling (all 51 variants)
- Edge cases and concurrency
- Integration tests with real Kopia binary

### Running Tests

```bash
# Run all tests
pnpm test:run && pnpm test:rust && pnpm test:e2e

# Individual test suites
pnpm test:run           # Frontend unit tests
pnpm test:rust          # Rust backend tests
pnpm test:e2e           # E2E tests with Playwright

# With coverage
pnpm test:coverage                # Frontend coverage
pnpm test:rust:coverage:html      # Rust coverage (opens in browser)

# Interactive E2E
pnpm test:e2e:ui        # Playwright UI for debugging
```

### CI/CD Pipeline

All tests run automatically on push:

1. **Validate Frontend** - typecheck, lint, format, unit tests
2. **Rust Tests** - format, clippy, unit & integration tests
3. **E2E Tests** - Playwright tests with Chromium
4. **Security Audit** - Cargo audit for vulnerabilities
5. **Build** - Production builds for Linux, Windows, macOS (on main branch)

---

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. **All tests pass**: `pnpm validate:fix && pnpm test:rust && pnpm test:e2e`
2. **Follow code patterns**: Use existing component structure and naming conventions
3. **Add tests**: New features should include unit/integration/E2E tests
4. **Update docs**: Keep README.md updated with significant changes
5. **Commit messages**: Use conventional commits (feat, fix, chore, etc.)

### Getting Help

- 📖 Read the code - Well-documented and structured
- 💬 [GitHub Discussions](https://github.com/JBibu/kopia-desktop/discussions) - Ask questions
- 🐛 [GitHub Issues](https://github.com/JBibu/kopia-desktop/issues) - Report bugs

---

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[Kopia](https://kopia.io)** - The amazing backup tool this app manages
- **[Tauri](https://tauri.app)** - For making cross-platform desktop apps with Rust
- **[shadcn/ui](https://ui.shadcn.com)** - For beautiful, accessible UI components
- **[React](https://react.dev)** - For the powerful UI library
- **[Vite](https://vitejs.dev)** - For the blazing fast build tool

---

## 🔗 Links

- **Homepage**: [kopia.io](https://kopia.io)
- **Official KopiaUI**: [github.com/kopia/htmlui](https://github.com/kopia/htmlui)
- **Tauri**: [tauri.app](https://tauri.app)
- **Issues**: [GitHub Issues](https://github.com/JBibu/kopia-desktop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/JBibu/kopia-desktop/discussions)

---

<div align="center">
  <sub>Built with ❤️ by the community</sub>
</div>
