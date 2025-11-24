# Kopia Desktop

> ⚠️ **Community-built alternative** to [KopiaUI](https://github.com/kopia/htmlui), not affiliated with the official Kopia project. THIS IS NOT SERIOUS, USE IT AT YOUR OWN RISK

Modern desktop app for [Kopia](https://kopia.io) backup management. Built with **Tauri + React** for speed and efficiency.

<br/>
<div align="center">
  <img width="820" alt="Kopia Desktop Screenshot" src="https://github.com/user-attachments/assets/4f20cb8f-c1ce-4671-ab8c-0981bcd2de52" />
</div>

---

## Features

- 🗂️ **8 Storage Providers** - Filesystem, S3, B2, Azure, GCS, SFTP, WebDAV, Rclone
- 📸 **Snapshots** - Create, browse, restore, mount, and pin snapshots
- 📋 **Backup Profiles** - Organize multiple backup sources
- 🎨 **Modern UI** - Light/dark themes, system tray, notifications
- 🪟 **Windows Service** - Run as background service (Windows only)
- 🌍 **i18n** - English and Spanish
- ✅ **418 Tests** - Production-ready code quality

---

## Quick Start

```bash
pnpm install       # Install deps + download Kopia binary
pnpm tauri:dev     # Start development
```

**Requirements:** Node.js 20+, pnpm, Rust toolchain

---

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind, shadcn/ui, Zustand
**Backend:** Tauri 2.9 (Rust), embedded Kopia server
**Testing:** Vitest, Playwright, cargo test

---

## Development

```bash
# Development
pnpm tauri:dev          # Dev mode with hot reload
pnpm tauri:build        # Production build

# Quality
pnpm validate           # Run all checks
pnpm validate:fix       # Auto-fix issues

# Testing
pnpm test:run           # Frontend (194 tests)
pnpm test:rust          # Backend (136 tests)
pnpm test:e2e           # E2E (78 tests)
```

---

## Architecture

```
React UI → Tauri (Rust) → Kopia Server → Storage
```

- Kopia binary bundled with app (auto-downloaded)
- HTTPS localhost-only, random password per session
- WebSocket + polling for real-time updates

---

## License

MIT - See [LICENSE](LICENSE)