# ProxDesk Memory & Context

This file serves as a working memory and context store for future development.

## 🏗️ Architecture
- **Type**: Desktop Native Application for Linux (X11 & Wayland)
- **Framework**: Tauri 2.x
- **Backend**: Rust (using `reqwest`, `tokio`, `keyring`, `serde`)
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide Icons
- **State Management**: Zustand, TanStack Query

## 🔄 Core Mechanics
- **Proxmox API Proxy**: Due to CORS and SSL validation issues, the Rust backend acts as a proxy for Proxmox VE API requests (`src-tauri/src/proxy.rs`). It forwards HTTP and WebSocket traffic (for noVNC).
- **Authentication**: API Tokens are stored securely using Linux Native keyrings (`org.freedesktop.secrets`). No plaintext storage.
- **Console**: Uses noVNC embedded within a Tauri window. SPICE has been permanently removed due to issues with the native `virt-viewer`.

## 📜 Recent Changes & Technical Debt Cleared
- **SPICE Removed**: All SPICE tunnel/protocol logic, commands, and UI elements have been fully eradicated.
- **Static Analysis Cleanup**:
  - Rust backend is 100% Clippy compliant (0 errors, 0 warnings). Redundant closures (`map_err`), manual string slicing, and lazy evaluation warnings were fixed.
  - Tauri command arguments exceeding limits were silenced intentionally via `#[allow(clippy::too_many_arguments)]`.
  - Frontend TypeScript `catch (err: any)` blocks were refactored to strict types (`unknown` / `Error`).

## 📋 Helpful Environment Commands
- **Run dev environment**:
  ```bash
  cd /opt/ProxDesk
  export RUSTUP_HOME=/home/username/.rustup CARGO_HOME=/home/username/.cargo PATH="/usr/share/nodejs/corepack/shims:/home/username/.cargo/bin:$PATH"
  npx tauri dev
  ```
- **Lint/Check**:
  - Rust: `cargo clippy -- -D warnings`
  - TS/React: `npm run build` (runs `tsc` check)
