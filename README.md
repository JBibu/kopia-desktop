# Kopia Desktop

> ⚠️ **Unofficial Project**: This is a community-built alternative to [KopiaUI](https://github.com/kopia/kopia), not affiliated with the official Kopia project.

A modern, lightweight desktop application for [Kopia](https://kopia.io) backup management. Built with **Tauri + React** as a faster, smaller alternative to the Electron-based official KopiaUI.

---

## ✨ Status

**Working**: Repository setup (8 storage providers), snapshots, policies, tasks, preferences, i18n (EN/ES), theme system
**Missing**: System tray, WebSocket updates, auto-updates, comprehensive tests...

---

## 🚀 Quick Start

```bash
pnpm install          # Install deps + download Kopia binary
pnpm tauri:dev        # Start app (first build: 5-10min)
```

**Requirements**: Node.js 20.19+, pnpm 10+, [Rust toolchain](https://rustup.rs/)

---

## 📦 Tech Stack

**Frontend**: React 19 • TypeScript • Vite 7 • Tailwind 4 • shadcn/ui
**Backend**: Tauri 2.9 (Rust) • Spawns embedded Kopia server
**State**: Zustand 5 • react-i18next • React Router 7

---

## 🛠️ Common Commands

```bash
pnpm tauri:dev          # Dev mode with hot reload
pnpm tauri:build        # Production build
pnpm validate:fix       # Lint, format, typecheck, test
pnpm clean              # Clear caches
```

---

## 🏗️ Architecture

Same approach as official KopiaUI:

1. Bundles Kopia binary (platform-specific)
2. Spawns `kopia server start --ui` on launch
3. React UI communicates via REST API
4. Server shuts down with app
