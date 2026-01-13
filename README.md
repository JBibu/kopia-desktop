# Kopia Desktop

> ⚠️ **Community-built alternative** to [KopiaUI](https://github.com/kopia/htmlui), not affiliated with the official Kopia project. THIS IS NOT SERIOUS, USE IT AT YOUR OWN RISK

Modern desktop app for [Kopia](https://kopia.io) backup management. Built with **Tauri + React** for speed and efficiency.

<br/>
<div align="center">
  <img width="1389" height="801" alt="image" src="https://github.com/user-attachments/assets/d8b776b4-aaf9-45ee-9452-04c8d6a065fa" />
</div>

---

## Features

- 🗂️ **8 Storage Providers** - Filesystem, S3, B2, Azure, GCS, SFTP, WebDAV, Rclone
- 📸 **Snapshots** - Create, browse, restore, mount, and pin snapshots
- 📋 **Backup Profiles** - Organize multiple backup sources
- 🎨 **Modern UI** - Light/dark themes, system tray, notifications
- 🪟 **Windows Service** - Run as background service (Windows only)
- 🌍 **i18n** - English and Spanish
- ✅ **302 Tests** - Production-ready code quality

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
**Testing:** Vitest, cargo test

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
pnpm test:run           # Frontend (183 tests)
pnpm test:rust          # Backend (119 tests)
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
