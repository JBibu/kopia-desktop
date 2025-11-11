# Kopia Desktop

> ⚠️ This is a **community-built alternative** to [KopiaUI](https://github.com/kopia/htmlui), not affiliated with the official Kopia project. Built for fun/learning purposes.

A modern, lightweight desktop application for [Kopia](https://kopia.io) backup management. Built with **Tauri + React** as a faster, smaller alternative to the Electron-based official KopiaUI.

<br/>
<div align="center">
  <img width="820" alt="Kopia Desktop Screenshot" src="https://github.com/user-attachments/assets/4f20cb8f-c1ce-4671-ab8c-0981bcd2de52" />
</div>

---

## ✨ Status

**Working:**

- ✅ Repository setup with 8 storage providers (Filesystem, S3, B2, Azure, GCS, SFTP, WebDAV, Rclone)
- ✅ Snapshots management (create, browse, restore, mount)
- ✅ Backup profiles system for managing multiple configurations
- ✅ Policies and task management
- ✅ System tray integration (show/hide window, quit)
- ✅ Desktop notifications for task completion
- ✅ WebSocket + polling for real-time updates
- ✅ Internationalization (EN/ES)
- ✅ Theme system (light/dark/system)
- ✅ Custom window decorations with titlebar
- ✅ Comprehensive Rust backend testing (136 unit tests, 65% coverage)

**Not Yet Implemented:**

- ❌ Form validation with Zod
- ❌ Frontend test coverage
- ❌ E2E tests
- ❌ Auto-updates

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

---

## 📦 Tech Stack

| Layer        | Technologies                                                |
| ------------ | ----------------------------------------------------------- |
| **Frontend** | React 19 • TypeScript 5.9 • Vite 7 • Tailwind 4 • shadcn/ui |
| **Backend**  | Tauri 2.9 (Rust) • Embedded Kopia server                    |
| **State**    | Zustand 5 (6 stores) • react-i18next • React Router 7       |
| **Testing**  | Vitest 4 • Playwright 1.56 • Rust cargo test (136 tests)    |

---

## 🛠️ Common Commands

```bash
# Development
pnpm tauri:dev          # Development mode with hot reload
pnpm tauri:build        # Production build

# Code Quality
pnpm validate           # Run all checks (typecheck, lint, format, test)
pnpm validate:fix       # Run all checks with auto-fix
pnpm typecheck          # TypeScript type checking
pnpm lint               # Lint and auto-fix code
pnpm format             # Format code with Prettier

# Testing
pnpm test:rust          # Run Rust backend tests (136 unit tests)
pnpm test:rust:coverage:html  # Open coverage report in browser

# Utilities
pnpm clean              # Clear build caches
pnpm clean:full         # Full clean (removes node_modules, reinstalls)
```

---

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Comprehensive project overview and development guide for AI assistants
- **[src-tauri/TESTING.md](src-tauri/TESTING.md)** - Rust backend testing guide (136 tests, 65% coverage)

---

## 🏗️ Architecture

Uses the same approach as the official KopiaUI:

1. **Bundle** – Includes platform-specific Kopia binary (auto-downloaded)
2. **Launch** – Spawns `kopia server start --ui` on startup
3. **Communication** – React UI interacts via REST API (50 Tauri commands) + WebSocket
4. **Lifecycle** – Server shuts down gracefully with the app

**Key Features:**

- 15 functional pages (Overview, Repository, Profiles, Snapshots, Policies, Tasks, Mounts, Preferences, Setup, etc.)
- 50 Tauri commands (42 Kopia API + 5 system utilities + 3 WebSocket)
- 6 Zustand stores for centralized state management
- Hybrid WebSocket + polling for reliable real-time updates
- Strict TypeScript with 46 comprehensive error variants
- 51 custom components + 20 shadcn/ui components
- Custom window decorations with system tray support
- i18n support (English, Spanish)

---

## 🎯 Features

### Repository Management

- Connect to existing repositories or create new ones
- Support for 8 storage providers
- Repository maintenance and configuration
- Password-protected encryption

### Snapshots

- Create manual snapshots or use backup profiles
- Browse snapshot contents
- Mount snapshots as local filesystems
- Restore files and directories
- View snapshot history and statistics

### Backup Profiles

- Create named backup configurations
- Store path, description, schedule, and policy settings
- View profile-specific snapshot history
- Quick snapshot creation from profiles

### Policies

- Global, per-host, per-user, and per-path policies
- Retention, scheduling, compression, and error handling
- Visual policy editor with inheritance indicators

### Tasks & Monitoring

- Real-time task status with progress bars
- WebSocket updates for active operations
- Task history and logs
- Desktop notifications for completions

### User Experience

- Light/dark/system theme with persistence
- Adjustable font size
- Minimize to system tray
- Custom titlebar with window controls
- Responsive design
- Keyboard navigation support

---

## 🧪 Testing

### Backend (Rust)

- **136 passing unit tests** (100% success rate)
- **8 integration tests** (require Kopia binary, ignored by default)
- **~65% code coverage**
- All 46 error variants tested
- Edge cases, concurrency, and integration scenarios

**Run tests:**

```bash
pnpm test:rust                    # Run all unit tests
pnpm test:rust:coverage:html      # View coverage report
```

See [src-tauri/TESTING.md](src-tauri/TESTING.md) for detailed testing guide.

### Frontend (Not Implemented)

- Vitest and Playwright configured
- Testing infrastructure ready but tests not written yet

---

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. Code passes all checks: `pnpm validate:fix`
2. Rust tests pass: `pnpm test:rust`
3. Follow existing code patterns and conventions
4. Update CLAUDE.md if architecture changes

---

## 📝 License

MIT - See LICENSE file for details.

---

## 🙏 Acknowledgments

- [Kopia](https://kopia.io) - The amazing backup tool this app manages
- [Tauri](https://tauri.app) - For making cross-platform desktop apps easy
- [shadcn/ui](https://ui.shadcn.com) - For beautiful, accessible UI components

---

## 📧 Contact

Issues and questions: [GitHub Issues](https://github.com/JBibu/kopia-desktop/issues)
