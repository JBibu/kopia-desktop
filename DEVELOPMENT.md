# Development Guide

Complete guide for developing Kopia-UI.

---

## Quick Start

### Prerequisites
- **Node.js 20.19+** or **22.12+**
- **pnpm 10+**
- **Rust toolchain** (install: https://rustup.rs/)
- **System dependencies** (Linux only - see below)

### Setup (First Time)

```bash
# 1. Install dependencies
pnpm install

# 2. Load Rust (if just installed)
source $HOME/.cargo/env

# 3. Download Kopia binaries
pnpm kopia:download

# 4. Start development
pnpm tauri:dev
```

**First build takes 5-10 minutes** (compiling Rust). Be patient! ☕

---

## System Dependencies

### Fedora/RHEL
```bash
sudo dnf install -y \
    webkit2gtk4.1-devel \
    openssl-devel \
    curl wget file \
    libappindicator-gtk3-devel \
    librsvg2-devel \
    gtk3-devel \
    libsoup3-devel \
    javascriptcoregtk4.1-devel
```

### Ubuntu/Debian
```bash
sudo apt install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl wget file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libsoup-3.0-dev \
    javascriptcoregtk-4.1-dev
```

### Why So Many?
Tauri uses WebKit on Linux (Windows/macOS use system webviews). These provide the browser engine, networking, and GUI components.

---

## Common Commands

### Development
```bash
pnpm tauri:dev          # Start with hot reload
pnpm dev                # Frontend only (browser)
```

### Quality
```bash
pnpm validate           # Run all checks
pnpm validate:fix       # Auto-fix issues + run checks
pnpm typecheck          # TypeScript
pnpm lint               # ESLint
pnpm format             # Prettier
pnpm test               # Tests
```

### Building
```bash
pnpm tauri:build        # Production build
pnpm tauri:build:debug  # Debug build (faster)
```

### Maintenance
```bash
pnpm clean              # Clear build caches (~2GB freed)
pnpm clean:full         # Delete everything, reinstall
pnpm kopia:download     # Update Kopia binaries
pnpm deps:update        # Update dependencies
```

---

## Development Workflow

### Daily Routine

1. **Start dev server** (leave it running):
   ```bash
   pnpm tauri:dev
   ```

2. **Make changes**:
   - React/TS files (`src/`) → Auto-reload (< 1 sec)
   - Rust files (`src-tauri/src/`) → Restart dev server

3. **Before committing**:
   ```bash
   pnpm validate:fix
   git add .
   git commit -m "feat: your changes"
   ```

### Build Times

| Type | Time | When |
|------|------|------|
| First Rust compile | 5-10 min | First `pnpm tauri:dev` ever |
| Frontend hot reload | < 1 sec | Every React/TS change |
| Incremental Rust | 10-30 sec | Rust code changes |
| Production build | 3-5 min | `pnpm tauri:build` |

**Pro tip**: Keep dev server running! Don't restart unless you changed Rust code.

---

## Project Structure

```
kopia-ui/
├── src/                      # React frontend (your main workspace)
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── kopia/           # Kopia-specific components
│   ├── lib/
│   │   ├── kopia/           # Kopia API client
│   │   ├── utils/           # Utilities (cn, etc.)
│   │   └── validations/     # Zod schemas
│   ├── stores/              # Zustand state management
│   ├── i18n/                # Translations (EN/ES)
│   ├── pages/               # Route components
│   ├── hooks/               # Custom React hooks
│   └── styles/              # Global CSS
│
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── lib.rs           # Main app logic
│   │   └── main.rs          # Entry point
│   └── Cargo.toml           # Rust dependencies
│
├── tests/                   # Tests
│   ├── unit/                # Vitest unit tests
│   └── e2e/                 # Playwright E2E tests
│
├── bin/                     # Kopia binaries (all platforms)
└── scripts/                 # Build scripts
```

---

## VS Code Integration

Press `Ctrl+Shift+P` → "Tasks: Run Task":

- 🚀 Start Dev Server
- 🔍 Run Validation
- 🏗️ Build Production
- 🧹 Clean Build Cache
- 🧪 Run Tests

---

## Troubleshooting

### "cargo: command not found"
**Solution**: Load Rust in your shell:
```bash
source $HOME/.cargo/env
```

### First build takes forever
**This is normal!** Rust compiles 500+ dependencies on first run. Grab a coffee ☕ and wait. Subsequent builds are much faster.

### "webkit2gtk not found" (Linux)
**Solution**: Install system dependencies (see above).

### Hot reload not working
1. Check Vite is running: http://localhost:1420
2. Restart: Ctrl+C, then `pnpm tauri:dev`
3. Clear cache: `pnpm clean`

### Build fails with weird errors
```bash
pnpm clean:full  # Nuclear option: reinstall everything
```

### Out of disk space
The `src-tauri/target/` directory can be huge (~2GB). Clean it:
```bash
pnpm clean
```

---

## Tech Stack

### Core
- **React 19** + TypeScript (strict mode)
- **Tauri 2.9** (Rust backend)
- **Vite 7** (build tool)
- **pnpm** (package manager)

### Frontend
- **Tailwind CSS 4** - Styling
- **Zustand 5** - State management
- **React Router 6** - Routing
- **react-hook-form 7** + **Zod 3** - Forms & validation
- **react-i18next** - i18n (EN/ES)

### Development
- **ESLint 9** + **Prettier 3** - Code quality
- **Vitest 4** - Unit testing
- **Playwright** - E2E testing

---

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Scripts & dependencies |
| `tsconfig.json` | TypeScript strict mode + path aliases |
| `vite.config.ts` | Vite configuration |
| `eslint.config.js` | ESLint flat config |
| `tailwind.config.js` | Tailwind + theme system |
| `src-tauri/tauri.conf.json` | Tauri app configuration |
| `src-tauri/Cargo.toml` | Rust dependencies |

---

## Important Notes

### Dependency Decisions

- **React Router 6** (not 7): v7 is framework-focused, v6 is better for SPAs
- **Zod 3** (not 4): v4 has compatibility issues with react-hook-form as of 2025

### Caching

| Location | What | Safe to Delete? |
|----------|------|-----------------|
| `node_modules/.vite` | Vite cache | ✓ Yes |
| `src-tauri/target/` | Compiled Rust (~2GB) | ✓ Yes (slow rebuild) |
| `dist/` | Built frontend | ✓ Yes |
| `bin/` | Kopia binaries | ⚠️ Re-download needed |

---

## CI/CD Example

```yaml
# .github/workflows/build.yml
name: Build

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      # System deps
      - run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev \
            libsoup-3.0-dev javascriptcoregtk-4.1-dev

      # Rust
      - uses: dtolnay/rust-toolchain@stable

      # Build
      - run: pnpm install
      - run: pnpm validate
      - run: pnpm tauri:build
```

---

## Resources

- [Tauri Docs](https://tauri.app/)
- [React Docs](https://react.dev/)
- [Kopia Docs](https://kopia.io/)
- [Vite Docs](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## Architecture Guidelines

For comprehensive architecture and development guidelines, see [CLAUDE.md](CLAUDE.md).

---

**Questions? Check [CLAUDE.md](CLAUDE.md) for detailed architecture guidelines.**
