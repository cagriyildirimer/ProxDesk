# ProxDesk Architecture Documentation (Linux Native)

## Overview

ProxDesk is built specifically as a **Linux Native Desktop Application** using **Tauri 2.x (GTK3 + WebKitGTK)** with a strict security boundary between the **React UI Frontend** and the **Rust Native Layer**. The frontend JavaScript code never communicates directly with Proxmox VE servers; all HTTPS requests, TLS validations, authentication header generation, and secret handling take place within the Rust backend.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       React UI Frontend (Linux GTK Window)                  │
│  • React 19 + TypeScript + Vite + Tailwind CSS                              │
│  • Embedded Console Modal (VMware / Proxmox Style noVNC Window)             │
│  • TanStack Query (Server State caching per Connection ID)                  │
│  • Zustand (UI State: theme, sidebar, filters, console drawer)              │
└──────────────────────┬──────────────────────────────────────────────────────┘
                       │ Tauri IPC Invocation (Type-safe Wrapper: src/lib/tauri.ts)
┌──────────────────────▼──────────────────────────────────────────────────────┐
│                        Tauri 2.x Command Handlers                           │
│  • src-tauri/src/commands/ (connections, nodes, guests, storage, tasks)     │
└──────────────────────┬──────────────────────────────────────────────────────┘
                       │ Thread-safe State Access (AppState)
┌──────────────────────▼──────────────────────────────────────────────────────┐
│                   Linux Native Rust Proxmox API Client                      │
│  • reqwest Client with custom TLS Certificate SHA-256 Fingerprint Inspection│
│  • PVEAPIToken Header Generator (`PVEAPIToken=USER@REALM!TOKENID=SECRET`)   │
│  • Linux Secret Service Integration (org.freedesktop.secrets / GNOME Keyring│
│  • Automatic Protected Vault Fallback (`0600` Linux chmod permissions)       │
│  • SPICE Session Launcher (`remote-viewer` / `virt-viewer` process spawn)    │
└──────────────────────┬──────────────────────────────────────────────────────┘
                       │ HTTPS REST API (Port 8006 default)
┌──────────────────────▼──────────────────────────────────────────────────────┐
│                         Proxmox VE REST API                                 │
│      (/api2/json/: version, nodes, cluster, qemu, lxc, storage, tasks)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Stack & Responsibilities

### 1. Frontend (React 19 + TypeScript)
- **Feature-Based Structure**: Modular code layout in `src/features/` (onboarding, dashboard, nodes, guests, storage, tasks, settings).
- **Embedded Console Window**: VMware-style embedded console modal window (`ConsoleModal.tsx`) with full keyboard focus, mouse tracking, and single-click SSL trust helper.
- **Server State (TanStack Query)**:
  - Query keys tagged with connection ID: `['nodes', connId]`, `['guests', connId]`, `['storage', connId]`, `['tasks', connId]`.
  - Automatic query cache invalidation on action completion.
- **API Isolation (`src/lib/tauri.ts`)**:
  - Encapsulates all Tauri `invoke` IPC calls into a type-safe object `proxmoxApi`.

### 2. Desktop Layer & Tauri IPC Handlers (`src-tauri/src/commands/`)
- `connection`: Add, test, list, and delete connection profiles; trust certificate fingerprints.
- `nodes`: Retrieve node inventory, Proxmox VE API version, and cluster quorate status.
- `guests`: Unified QEMU & LXC guest inventory, power actions (start, shutdown, reboot, stop, reset, suspend, resume), QEMU Guest Agent networking info, snapshot operations, and SPICE session launcher (`launch_spice_session`).
- `storage`: Fetch storage pool usage and backup contents.
- `tasks`: Poll UPID task status and fetch monospace task log streams.

### 3. Rust Native Linux Backend (`src-tauri/src/proxmox/` & `security/`)
- **`ProxmoxAuth`**: Manages API Token credentials with custom `Debug` trait redacting token secrets.
- **`ProxmoxClient`**: Wrapper around `reqwest::Client` handling URL normalization, `Authorization: PVEAPIToken=...` header injection, and HTTP status code error mapping (401 Auth Failed, 403 Permission Denied, 404 Not Found, 500 Server Error).
- **`CredentialStore`**: Wraps `keyring` with `sync-secret-service` for Linux native DBus credential storage with protected `chmod 0600` local vault fallback.
- **`CertificateVerifier`**: SHA-256 fingerprint extraction and validation logic.
