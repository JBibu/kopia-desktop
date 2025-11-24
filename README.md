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

- ✅ Repository setup with 8 storage providers (Filesystem, S3, B2, Azure, GCS, SFTP, WebDAV, Rclone)
- ✅ Snapshots management (create, browse, restore, mount, pin)
- ✅ Backup profiles system for managing multiple configurations
- ✅ Policies and task management with real-time updates
- ✅ Workflow parity with official Kopia HTMLui

### User Experience

- ✅ System tray integration (show/hide window, quit)
- ✅ Desktop notifications for task completion
- ✅ WebSocket + polling for real-time updates
- ✅ Internationalization (English/Spanish)
- ✅ Theme system (light/dark/system)
- ✅ Custom window decorations with titlebar
- ✅ Windows Service support (auto-start on boot)

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

---

## 📦 Tech Stack

| Layer        | Technologies                                                |
| ------------ | ----------------------------------------------------------- |
| **Frontend** | React 19 • TypeScript 5.9 • Vite 7 • Tailwind 4 • shadcn/ui |
| **Backend**  | Tauri 2.9 (Rust) • Embedded Kopia server                    |
| **State**    | Zustand 5 (6 stores) • react-i18next • React Router 7       |
| **Testing**  | Vitest 4 • Playwright 1.56 • Rust cargo test                |

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

# Testing
pnpm test:run           # Frontend unit tests (194 tests)
pnpm test:rust          # Rust backend tests (136 tests)
pnpm test:e2e           # E2E tests with Playwright (78 tests)
pnpm test:e2e:ui        # Interactive E2E test runner

# Utilities
pnpm clean              # Clear build caches
pnpm clean:full         # Full clean (removes node_modules, reinstalls)
```

### Project Structure

```
kopia-desktop/
├── src/                    # React frontend
│   ├── components/         # UI components (51 custom + 22 shadcn)
│   ├── pages/              # 15 route pages
│   ├── stores/             # 6 Zustand stores
│   ├── hooks/              # 9 custom hooks
│   └── lib/                # Utilities and Kopia client
├── src-tauri/              # Rust backend
│   └── src/                # 51 Tauri commands, server lifecycle
├── tests/
│   ├── unit/               # 160 unit tests
│   ├── integration/        # 34 integration tests
│   └── e2e/                # 78 E2E tests
└── docs/                   # Documentation
```

---

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Comprehensive project overview and development guide
- **[docs/TESTING_SUMMARY.md](docs/TESTING_SUMMARY.md)** - Complete testing documentation (418 tests)
- **[docs/WINDOWS_SERVICE.md](docs/WINDOWS_SERVICE.md)** - Windows service implementation guide
- **[docs/CI_IMPROVEMENTS.md](docs/CI_IMPROVEMENTS.md)** - CI/CD pipeline documentation
- **[src-tauri/TESTING.md](src-tauri/TESTING.md)** - Rust backend testing guide
- **[tests/e2e/README.md](tests/e2e/README.md)** - E2E testing guide

---

## 🏗️ Architecture

Uses the same approach as the official KopiaUI:

1. **Bundle** – Includes platform-specific Kopia binary (auto-downloaded)
2. **Launch** – Spawns `kopia server start --ui` on startup
3. **Communication** – React UI interacts via REST API (51 Tauri commands) + WebSocket
4. **Lifecycle** – Server shuts down gracefully with the app

**Key Components:**

- 15 functional pages (Overview, Repository, Profiles, Snapshots, Policies, Tasks, Mounts, Preferences, Setup, etc.)
- 51 Tauri commands (40 Kopia API + 4 system utilities + 2 WebSocket + 5 Windows service)
- 6 Zustand stores for centralized state management
- Hybrid WebSocket + polling for reliable real-time updates
- Strict TypeScript with 51 comprehensive error variants

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
```

See [docs/TESTING_SUMMARY.md](docs/TESTING_SUMMARY.md) for detailed testing documentation.

---

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. All tests pass: `pnpm validate:fix && pnpm test:rust`
2. Follow existing code patterns and conventions
3. Update documentation if architecture changes

---

## 📝 License

MIT - See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Kopia](https://kopia.io) - The amazing backup tool this app manages
- [Tauri](https://tauri.app) - For making cross-platform desktop apps easy
- [shadcn/ui](https://ui.shadcn.com) - For beautiful, accessible UI components

---

## 📧 Contact

Issues and questions: [GitHub Issues](https://github.com/JBibu/kopia-desktop/issues)
