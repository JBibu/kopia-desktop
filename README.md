# Kopia UI

Modern Desktop UI for Kopia Backup - A React + Tauri desktop application for managing Kopia backups with an intuitive interface.

---

## 🚀 Quick Start

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

**First build takes 5-10 minutes** (compiling Rust). Be patient!

---

## Common Commands

```bash
# Development
pnpm tauri:dev          # Start with hot reload
pnpm dev                # Frontend only (browser)

# Quality
pnpm validate:fix       # Auto-fix all issues + run tests
pnpm validate           # Run checks only (for CI)

# Building
pnpm tauri:build        # Production build
pnpm tauri:build:debug  # Debug build (faster)

# Maintenance
pnpm clean              # Clear build caches
pnpm kopia:download     # Update Kopia binaries
```

---

## Project Structure

```
kopia-ui/
├── src/                      # React frontend
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── kopia/           # Kopia-specific components
│   ├── lib/
│   │   ├── kopia/           # Kopia API client
│   │   ├── utils/           # Utilities
│   │   └── validations/     # Zod schemas
│   ├── stores/              # Zustand state
│   ├── i18n/                # Translations (EN/ES)
│   └── pages/               # Route components
│
├── src-tauri/               # Rust backend
│   └── src/
│       ├── lib.rs           # Main app logic
│       └── main.rs          # Entry point
│
└── tests/                   # Tests
```

---

## Tech Stack

**Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS 4
**Backend**: Tauri 2.9 (Rust)
**State**: Zustand 5
**Forms**: react-hook-form + Zod 3
**i18n**: react-i18next (EN/ES)
**Testing**: Vitest 4, Playwright

---

## Features (Planned)

- 🔐 Repository management (connect, create, manage)
- 📸 Snapshot operations (list, create, restore, compare)
- 📋 Policy management (retention, scheduling, compression)
- 📊 Task monitoring with real-time progress
- 🌐 Multi-language support (EN/ES)
- 🎨 Dark/light theme
- 🔔 Native desktop notifications

---

## Documentation

📚 **[Complete documentation available in `/docs`](docs/)**

Quick links:

- **[docs/DOCS_INDEX.md](docs/DOCS_INDEX.md)** - Documentation index and navigation guide
- **[docs/CLAUDE.md](docs/CLAUDE.md)** - Architecture and development guidelines
- **[docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)** - What's been implemented (37 API commands)
- **[docs/RESEARCH.md](docs/RESEARCH.md)** - Official Kopia HTMLui analysis and patterns
- **[docs/KOPIA_API_SPEC.md](docs/KOPIA_API_SPEC.md)** - Complete API specification

---

## Prerequisites

- **Node.js 20.19+** or **22.12+**
- **pnpm 10+**
- **Rust toolchain** ([install here](https://rustup.rs/))
- **System dependencies** (Linux only - see [docs/CLAUDE.md](docs/CLAUDE.md) for details)

---

## Contributing

1. Run `pnpm validate:fix` before committing
2. Follow architecture guidelines in [docs/CLAUDE.md](docs/CLAUDE.md)
3. Write tests for new features
4. Use conventional commit messages

---

## License

MIT

---

## Resources

- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [Kopia Documentation](https://kopia.io/)
