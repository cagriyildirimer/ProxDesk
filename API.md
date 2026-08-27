# ProxDesk API & Tauri IPC Reference

This document details the mapped Proxmox VE REST API endpoints and corresponding Tauri IPC command handlers implemented in ProxDesk.

---

## Proxmox VE REST API Mapping

| Proxmox REST API Endpoint | HTTP Method | Description | Mapped Rust Function |
| :--- | :---: | :--- | :--- |
| `/api2/json/version` | `GET` | Fetches Proxmox VE version and release | `ProxmoxClient::get_version` |
| `/api2/json/nodes` | `GET` | Fetches list of nodes and CPU/RAM metrics | `ProxmoxClient::get_nodes` |
| `/api2/json/cluster/status` | `GET` | Fetches cluster nodes & quorate status | `ProxmoxClient::get_cluster_status` |
| `/api2/json/nodes/{node}/qemu` | `GET` | Fetches QEMU Virtual Machines on node | `ProxmoxClient::get_qemu_vms` |
| `/api2/json/nodes/{node}/qemu/{vmid}/status/current` | `GET` | Fetches QEMU VM status | `ProxmoxClient::get_qemu_vm_status` |
| `/api2/json/nodes/{node}/qemu/{vmid}/status/{action}` | `POST` | Executes power action (`start`, `shutdown`, `reboot`, `stop`, `reset`, `suspend`, `resume`) | `ProxmoxClient::qemu_power_action` |
| `/api2/json/nodes/{node}/qemu/{vmid}/agent/network-get-interfaces` | `GET` | Fetches guest IP addresses via QEMU Guest Agent | `ProxmoxClient::get_qemu_agent_network` |
| `/api2/json/nodes/{node}/lxc` | `GET` | Fetches LXC Containers on node | `ProxmoxClient::get_lxc_containers` |
| `/api2/json/nodes/{node}/lxc/{vmid}/status/current` | `GET` | Fetches LXC Container status | `ProxmoxClient::get_lxc_status` |
| `/api2/json/nodes/{node}/lxc/{vmid}/status/{action}` | `POST` | Executes LXC power action (`start`, `shutdown`, `reboot`, `stop`) | `ProxmoxClient::lxc_power_action` |
| `/api2/json/nodes/{node}/storage` | `GET` | Fetches storage pools usage | `ProxmoxClient::get_storage_list` |
| `/api2/json/nodes/{node}/storage/{storage}/content` | `GET` | Fetches backup files stored in pool | `ProxmoxClient::get_backup_contents` |
| `/api2/json/nodes/{node}/tasks/{upid}/status` | `GET` | Polls UPID task status | `ProxmoxClient::get_task_status` |
| `/api2/json/nodes/{node}/tasks/{upid}/log` | `GET` | Stream lines from task log | `ProxmoxClient::get_task_log` |
| `/api2/json/nodes/{node}/{type}/{vmid}/snapshot` | `GET` | Fetches snapshot tree | `ProxmoxClient::get_snapshots` |
| `/api2/json/nodes/{node}/{type}/{vmid}/snapshot` | `POST` | Creates a new snapshot | `ProxmoxClient::create_snapshot` |
| `/api2/json/nodes/{node}/{type}/{vmid}/snapshot/{snapname}/rollback` | `POST` | Rollbacks to a snapshot | `ProxmoxClient::rollback_snapshot` |
| `/api2/json/nodes/{node}/{type}/{vmid}/snapshot/{snapname}` | `DELETE` | Deletes a snapshot | `ProxmoxClient::delete_snapshot` |

---

## Tauri IPC Command Signatures

Front-end JavaScript invokes these Tauri IPC commands via `src/lib/tauri.ts`:

### 1. Connection Commands
```typescript
get_connections(): Promise<ConnectionProfile[]>
test_connection(params: { host, port, user, realm, token_id, token_secret }): Promise<ConnectionTestResult>
add_connection(params: { name, host, port, user, realm, token_id, token_secret, trusted_fingerprints }): Promise<ConnectionProfile>
delete_connection(connectionId: string): Promise<boolean>
trust_certificate(connectionId: string, fingerprint: string): Promise<boolean>
```

### 2. Infrastructure Commands
```typescript
get_nodes(connectionId: string): Promise<NodeSummary[]>
get_version(connectionId: string): Promise<ProxmoxVersion>
get_cluster_overview(connectionId: string): Promise<ClusterOverview | null>
```

### 3. Guest Commands
```typescript
get_guests(connectionId: string): Promise<GuestSummary[]>
guest_power_action(params: { connectionId, node, vmid, guestType, action }): Promise<string> // Returns UPID
get_guest_agent_network(params: { connectionId, node, vmid }): Promise<GuestNetworkInterface[] | null>
get_guest_snapshots(params: { connectionId, node, vmid, guestType }): Promise<SnapshotItem[]>
create_guest_snapshot(params: { connectionId, node, vmid, guestType, snapname, description, includeRam }): Promise<string>
rollback_guest_snapshot(params: { connectionId, node, vmid, guestType, snapname }): Promise<string>
delete_guest_snapshot(params: { connectionId, node, vmid, guestType, snapname }): Promise<string>
```

### 4. Storage & Task Commands
```typescript
get_storage_list(connectionId: string): Promise<StorageSummary[]>
get_backup_contents(connectionId: string, node: string, storage: string): Promise<BackupContentItem[]>
get_task_status(connectionId: string, node: string, upid: string): Promise<ProxmoxTask>
get_task_log(connectionId: string, node: string, upid: string): Promise<TaskLogLine[]>
```
