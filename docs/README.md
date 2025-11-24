# Documentation

Comprehensive documentation for Kopia Desktop.

## 📚 Documentation Index

### Main Documentation

- **[../README.md](../README.md)** - Project overview, quick start, and user guide
- **[../CLAUDE.md](../CLAUDE.md)** - Comprehensive development guide for AI assistants and developers

### Testing Documentation

- **[TESTING_SUMMARY.md](TESTING_SUMMARY.md)** - Complete testing overview (418 tests across all layers)
- **[../src-tauri/TESTING.md](../src-tauri/TESTING.md)** - Rust backend testing guide (136 unit + 10 integration tests)
- **[../tests/e2e/README.md](../tests/e2e/README.md)** - E2E testing guide with Playwright (78 tests)

### Feature Documentation

- **[WINDOWS_SERVICE.md](WINDOWS_SERVICE.md)** - Windows service implementation guide (auto-start on boot)
- **[CI_IMPROVEMENTS.md](CI_IMPROVEMENTS.md)** - CI/CD pipeline optimization and testing automation

## 🧪 Testing Overview

Kopia Desktop has **418 total tests** with comprehensive coverage:

| Test Type                  | Count | Location                                             | Documentation                                      |
| -------------------------- | ----- | ---------------------------------------------------- | -------------------------------------------------- |
| **Rust Unit Tests**        | 136   | `src-tauri/src/*_tests.rs`                           | [../src-tauri/TESTING.md](../src-tauri/TESTING.md) |
| **Rust Integration Tests** | 10    | `src-tauri/src/tests/kopia_api_integration_tests.rs` | [../src-tauri/TESTING.md](../src-tauri/TESTING.md) |
| **Frontend Unit Tests**    | 194   | `tests/unit/` and `tests/integration/`               | [TESTING_SUMMARY.md](TESTING_SUMMARY.md)           |
| **E2E Tests**              | 78    | `tests/e2e/*.spec.ts`                                | [../tests/e2e/README.md](../tests/e2e/README.md)   |

### Running Tests

```bash
# Run all tests
pnpm test:run           # Frontend unit tests (194 tests)
pnpm test:rust          # Rust backend tests (136 tests)
pnpm test:e2e           # E2E tests (78 tests)

# With coverage
pnpm test:coverage                # Frontend coverage report
pnpm test:rust:coverage:html      # Rust coverage (opens in browser)

# Interactive modes
pnpm test               # Frontend tests in watch mode
pnpm test:e2e:ui        # E2E tests in interactive UI mode
```

See [TESTING_SUMMARY.md](TESTING_SUMMARY.md) for detailed test coverage breakdown.

## 🏗️ Architecture Documentation

### Frontend Architecture

- **React 19** with TypeScript 5.9 (strict mode)
- **Zustand 5** for state management (6 stores)
- **React Router v7** for routing
- **Tailwind 4** + shadcn/ui for styling
- **i18next** for internationalization

### Backend Architecture

- **Tauri 2.9** (Rust) for native desktop
- **Embedded Kopia server** (spawned process)
- **REST API** + **WebSocket** communication
- **51 Tauri commands** (40 Kopia API + 11 system/utilities)

### Key Components

- 15 functional pages
- 51 custom components + 22 shadcn/ui components
- 9 custom React hooks
- 6 Zustand stores
- Hybrid WebSocket + polling for real-time updates

## 🔧 Development Workflow

### Quick Start

```bash
pnpm install          # Install dependencies + download Kopia binary
pnpm tauri:dev        # Start development mode
```

### Code Quality

```bash
pnpm validate         # Run all checks (typecheck, lint, format, test)
pnpm validate:fix     # Run all checks with auto-fix
```

### Building

```bash
pnpm tauri:build        # Production build
pnpm tauri:build:debug  # Debug build with symbols
```

## 📖 Feature-Specific Documentation

### Windows Service

See [WINDOWS_SERVICE.md](WINDOWS_SERVICE.md) for:

- Architecture and IPC communication
- Installation and management
- Configuration and troubleshooting
- Named pipe protocol details

### CI/CD Pipeline

See [CI_IMPROVEMENTS.md](CI_IMPROVEMENTS.md) for:

- Pipeline architecture and flow
- Job dependencies and parallelization
- Artifact generation and retention
- Performance optimizations
- Troubleshooting guide

## 🤝 Contributing

When contributing, please:

1. **Read the main docs:**
   - [../README.md](../README.md) - Project overview
   - [../CLAUDE.md](../CLAUDE.md) - Development guide

2. **Run tests:**

   ```bash
   pnpm validate:fix    # Format, lint, typecheck, test
   pnpm test:rust       # Rust tests
   pnpm test:e2e        # E2E tests
   ```

3. **Update documentation:**
   - Update relevant docs if you change architecture
   - Add tests for new features
   - Follow existing code patterns

## 📧 Support

- **Issues:** [GitHub Issues](https://github.com/JBibu/kopia-desktop/issues)
- **Development Guide:** [../CLAUDE.md](../CLAUDE.md)
- **Testing Help:** [TESTING_SUMMARY.md](TESTING_SUMMARY.md)

---

**Last Updated:** 2025-11-24
