# Changelog

All notable changes to **ProxDesk** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-08-26

### Added
- **Authentication & Secure Keyring**: API Token authentication with token secrets saved in platform native keyrings (`keyring` crate) with zero plaintext secret logging.
- **Custom TLS & Fingerprint Verification**: SHA-256 TLS certificate fingerprint inspection and pinning.
- **Multi-Server Connection Manager**: Profile creation, connection testing, editing, deleting, and quick server switching.
- **First-Run Onboarding Wizard**: Step-by-step onboarding for newly configured Proxmox VE servers.
- **Infrastructure Dashboard**: Live aggregate cluster gauges (CPU, RAM, Storage), online node counters, active guest overview table, and node hardware cards.
- **QEMU VM & LXC Container Controls**: Filterable/searchable inventory view with status indicators (Running, Stopped, Paused) and power actions (Start, Shutdown, Reboot, Force Stop).
- **UPID Task Progress Engine**: Real-time async task tracking with header task counter, slide-over task drawer, and monospace task log viewer (`/nodes/{node}/tasks/{upid}/log`).
- **Snapshot Management**: View snapshot trees, create snapshots with RAM state options, rollback with confirmation, and delete snapshots.
- **Storage & Backup Inspector**: Storage pool usage bars and backup archive explorer.
- **System Settings & Diagnostics**: Dark/Light mode theme engine, responsive layout, keyboard shortcuts (`Ctrl+R`, `Ctrl+K`), system diagnostics telemetry exporter, and trademark legal disclaimer.
