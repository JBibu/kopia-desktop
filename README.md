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

- Repository setup with 8 storage providers
- Snapshots, policies, and task management
- Preferences and settings
- Internationalization (EN/ES)
- Theme system

**In Progress:**

- System tray integration
- WebSocket live updates
- Auto-updates
- Comprehensive test coverage

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

| Layer        | Technologies                                            |
| ------------ | ------------------------------------------------------- |
| **Frontend** | React 19 • TypeScript • Vite 7 • Tailwind 4 • shadcn/ui |
| **Backend**  | Tauri 2.9 (Rust) • Embedded Kopia server                |
| **State**    | Zustand 5 • react-i18next • React Router 7              |

---

## 🛠️ Common Commands

```bash
pnpm tauri:dev          # Development mode with hot reload
pnpm tauri:build        # Production build
pnpm validate:fix       # Run linting, formatting, typechecking, and tests
pnpm clean              # Clear build caches
```

---

## 🏗️ Architecture

Uses the same approach as the official KopiaUI:

1. **Bundle** – Includes platform-specific Kopia binary
2. **Launch** – Spawns `kopia server start --ui` on startup
3. **Communication** – React UI interacts via REST API
4. **Lifecycle** – Server shuts down gracefully with the app
