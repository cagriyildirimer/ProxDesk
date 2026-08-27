import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ConnectionProfile, ConnectionTestResult } from '../types/connection';
import {
  BackupContentItem,
  ClusterOverview,
  GuestNetworkInterface,
  GuestSummary,
  NodeSummary,
  ProxmoxTask,
  ProxmoxVersion,
  SnapshotItem,
  StorageSummary,
  TaskLogLine,
} from '../types/proxmox';

const isTauriEnv = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const openExternalUrl = async (url: string) => {
  if (isTauriEnv()) {
    try {
      await openUrl(url);
      return;
    } catch (e) {
      console.error('Tauri plugin-opener failed:', e);
    }
  }
  window.open(url, '_blank');
};

// Development Mock Mode Data (ONLY used when testing in standalone web browser without Tauri)
const mockConnections: ConnectionProfile[] = [
  {
    id: 'mock-homelab-8006',
    name: 'HomeLab Cluster (Mock Mode)',
    host: '192.168.1.10',
    port: 8006,
    user: 'proxdesk',
    realm: 'pve',
    token_id: 'desktop',
    trusted_fingerprints: ['AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00'],
    pve_version: '9.1.2',
    last_connected: new Date().toISOString(),
  },
];

const mockNodes: NodeSummary[] = [
  {
    node: 'pve01',
    status: 'online',
    cpu: 0.18,
    maxcpu: 16,
    mem: 25769803776, // 24 GB
    maxmem: 68719476736, // 64 GB
    uptime: 1052840,
    level: 'community',
  },
  {
    node: 'pve02',
    status: 'online',
    cpu: 0.09,
    maxcpu: 16,
    mem: 17179869184, // 16 GB
    maxmem: 68719476736, // 64 GB
    uptime: 894200,
    level: 'community',
  },
];

const mockGuests: GuestSummary[] = [
  {
    vmid: 105,
    name: 'Windows-Server-2025',
    guest_type: 'qemu',
    node: 'pve01',
    status: 'running',
    cpu_usage: 0.12,
    cpu_count: 4,
    memory_used: 8589934592,
    memory_total: 17179869184,
    disk_used: 48318382080,
    disk_total: 107374182400,
    uptime: 432000,
    is_template: false,
    tags: ['production', 'windows', 'db'],
    primary_ip: '192.168.1.105',
    agent_status: 'active',
  },
  {
    vmid: 110,
    name: 'Ubuntu-24.04-Docker',
    guest_type: 'qemu',
    node: 'pve01',
    status: 'running',
    cpu_usage: 0.05,
    cpu_count: 2,
    memory_used: 4294967296,
    memory_total: 8589934592,
    disk_used: 21474836480,
    disk_total: 53687091200,
    uptime: 864000,
    is_template: false,
    tags: ['docker', 'ubuntu'],
    primary_ip: '192.168.1.110',
    agent_status: 'active',
  },
  {
    vmid: 120,
    name: 'Debian-12-Web',
    guest_type: 'qemu',
    node: 'pve02',
    status: 'stopped',
    cpu_usage: 0,
    cpu_count: 2,
    memory_used: 0,
    memory_total: 4294967296,
    disk_used: 10737418240,
    disk_total: 32212254720,
    uptime: 0,
    is_template: false,
    tags: ['web', 'nginx'],
    primary_ip: undefined,
    agent_status: 'unavailable',
  },
  {
    vmid: 201,
    name: 'Nginx-Reverse-Proxy',
    guest_type: 'lxc',
    node: 'pve01',
    status: 'running',
    cpu_usage: 0.02,
    cpu_count: 1,
    memory_used: 536870912,
    memory_total: 2147483648,
    disk_used: 3221225472,
    disk_total: 10737418240,
    uptime: 1200000,
    is_template: false,
    tags: ['gateway', 'lxc'],
    primary_ip: '192.168.1.201',
    agent_status: 'active',
  },
  {
    vmid: 202,
    name: 'Redis-Cache-CT',
    guest_type: 'lxc',
    node: 'pve02',
    status: 'running',
    cpu_usage: 0.01,
    cpu_count: 1,
    memory_used: 1073741824,
    memory_total: 4294967296,
    disk_used: 2147483648,
    disk_total: 8589934592,
    uptime: 950000,
    is_template: false,
    tags: ['cache', 'lxc'],
    primary_ip: '192.168.1.202',
    agent_status: 'active',
  },
];

const mockStorages: StorageSummary[] = [
  {
    storage: 'local-lvm',
    storage_type: 'lvmthin',
    node: 'pve01',
    status: 'active',
    content: 'rootdir,images',
    used: 375809638400, // 350 GB
    total: 858993459200, // 800 GB
    avail: 483183820800, // 450 GB
    shared: false,
    active: true,
  },
  {
    storage: 'backup-nfs',
    storage_type: 'nfs',
    node: 'pve01',
    status: 'active',
    content: 'backup,iso',
    used: 1288490188800, // 1.2 TB
    total: 3221225472000, // 3.0 TB
    avail: 1932735283200, // 1.8 TB
    shared: true,
    active: true,
  },
];

export const proxmoxApi = {
  getConnections: async () => {
    if (!isTauriEnv()) return mockConnections;
    return invoke<ConnectionProfile[]>('get_connections');
  },

  testConnection: async (params: {
    host: string;
    port: number;
    user: string;
    realm: string;
    tokenId: string;
    tokenSecret: string;
  }) => {
    if (!isTauriEnv()) {
      return {
        success: true,
        latency_ms: 18,
        pve_version: '9.1-2 (Development Mock Mode)',
        node_count: 2,
        first_node: 'pve01',
      } as ConnectionTestResult;
    }
    return invoke<ConnectionTestResult>('test_connection', {
      host: params.host,
      port: params.port,
      user: params.user,
      realm: params.realm,
      tokenId: params.tokenId,
      tokenSecret: params.tokenSecret,
    });
  },

  addConnection: async (params: {
    name: string;
    host: string;
    port: number;
    user: string;
    realm: string;
    tokenId: string;
    tokenSecret: string;
    trustedFingerprints: string[];
  }) => {
    if (!isTauriEnv()) {
      const id = `mock-${params.host.replace(/\./g, '-')}-${params.port}`;
      const newConn: ConnectionProfile = {
        id,
        name: params.name,
        host: params.host,
        port: params.port,
        user: params.user,
        realm: params.realm,
        token_id: params.tokenId,
        trusted_fingerprints: params.trustedFingerprints,
        pve_version: '9.1.2',
        last_connected: new Date().toISOString(),
      };
      mockConnections.push(newConn);
      return newConn;
    }
    return invoke<ConnectionProfile>('add_connection', {
      name: params.name,
      host: params.host,
      port: params.port,
      user: params.user,
      realm: params.realm,
      tokenId: params.tokenId,
      tokenSecret: params.tokenSecret,
      trustedFingerprints: params.trustedFingerprints,
    });
  },

  deleteConnection: async (connectionId: string) => {
    if (!isTauriEnv()) return true;
    return invoke<boolean>('delete_connection', { connectionId });
  },

  trustCertificate: async (connectionId: string, fingerprint: string) => {
    if (!isTauriEnv()) return true;
    return invoke<boolean>('trust_certificate', { connectionId, fingerprint });
  },

  getNodes: async (connectionId: string) => {
    if (!isTauriEnv()) return mockNodes;
    return invoke<NodeSummary[]>('get_nodes', { connectionId });
  },

  getVersion: async (connectionId: string) => {
    if (!isTauriEnv())
      return { version: '9.1', release: '2', repoid: 'mock' } as ProxmoxVersion;
    return invoke<ProxmoxVersion>('get_version', { connectionId });
  },

  getClusterOverview: async (connectionId: string) => {
    if (!isTauriEnv()) {
      return {
        name: 'HomeLab-Cluster',
        quorate: true,
        node_count: 2,
        online_count: 2,
      } as ClusterOverview;
    }
    return invoke<ClusterOverview | null>('get_cluster_overview', {
      connectionId,
    });
  },

  getGuests: async (connectionId: string) => {
    if (!isTauriEnv()) return mockGuests;
    return invoke<GuestSummary[]>('get_guests', { connectionId });
  },

  guestPowerAction: async (params: {
    connectionId: string;
    node: string;
    vmid: number;
    guestType: string;
    action: string;
  }) => {
    if (!isTauriEnv()) {
      const upid = `UPID:${params.node}:00012345:00ABCD12:${Date.now()}:${params.action}:${params.vmid}:root@pam:`;
      const target = mockGuests.find((g) => g.vmid === params.vmid);
      if (target) {
        if (params.action === 'start') target.status = 'running';
        if (params.action === 'shutdown' || params.action === 'stop') target.status = 'stopped';
        if (params.action === 'reboot') target.status = 'running';
      }
      return upid;
    }
    return invoke<string>('guest_power_action', params);
  },

  openConsoleWindow: async (params: {
    connectionId: string;
    connectionHost: string;
    connectionPort: number;
    node: string;
    vmid: number;
    guestType: string;
    ticket?: string;
    port?: number;
  }) => {
    if (!isTauriEnv()) {
      const consoleType = params.guestType === 'lxc' ? 'lxc' : 'kvm';
      window.open(
        `https://${params.connectionHost}:${params.connectionPort}/?console=${consoleType}&novnc=1&node=${params.node}&vmid=${params.vmid}`,
        '_blank'
      );
      return 'Mock Console Window';
    }
    return invoke<string>('open_console_window', params);
  },

  createVncTicket: async (params: {
    connectionId: string;
    node: string;
    vmid: number;
    guestType: string;
  }) => {
    if (!isTauriEnv()) return { ticket: 'MOCK_TICKET', port: '5900' };
    return invoke<any>('create_vnc_ticket', params);
  },

  getGuestAgentNetwork: async (params: {
    connectionId: string;
    node: string;
    vmid: number;
  }) => {
    if (!isTauriEnv()) {
      return [
        {
          name: 'ens18',
          'hardware-address': 'BC:24:11:AB:CD:EF',
          'ip-addresses': [
            {
              'ip-address': `192.168.1.${params.vmid}`,
              'ip-address-type': 'ipv4',
              prefix: 24,
            },
          ],
        },
      ] as GuestNetworkInterface[];
    }
    return invoke<GuestNetworkInterface[] | null>(
      'get_guest_agent_network',
      params
    );
  },

  getGuestSnapshots: async (params: {
    connectionId: string;
    node: string;
    vmid: number;
    guestType: string;
  }) => {
    if (!isTauriEnv()) {
      return [
        { name: 'current', description: 'Current State', snaptime: Math.floor(Date.now() / 1000) },
        { name: 'before-update', description: 'Snapshot before PVE 9.1 upgrade', snaptime: 1700000000, parent: 'initial' },
        { name: 'initial-setup', description: 'Clean OS installation', snaptime: 1695000000 },
      ] as SnapshotItem[];
    }
    return invoke<SnapshotItem[]>('get_guest_snapshots', params);
  },

  createGuestSnapshot: async (params: {
    connectionId: string;
    node: string;
    vmid: number;
    guestType: string;
    snapname: string;
    description?: string;
    includeRam: boolean;
  }) => {
    if (!isTauriEnv()) {
      return `UPID:${params.node}:00012346:00ABCD13:${Date.now()}:snapshot:${params.vmid}:root@pam:`;
    }
    return invoke<string>('create_guest_snapshot', params);
  },

  rollbackGuestSnapshot: async (params: {
    connectionId: string;
    node: string;
    vmid: number;
    guestType: string;
    snapname: string;
  }) => {
    if (!isTauriEnv()) {
      return `UPID:${params.node}:00012347:00ABCD14:${Date.now()}:rollback:${params.vmid}:root@pam:`;
    }
    return invoke<string>('rollback_guest_snapshot', params);
  },

  deleteGuestSnapshot: async (params: {
    connectionId: string;
    node: string;
    vmid: number;
    guestType: string;
    snapname: string;
  }) => {
    if (!isTauriEnv()) {
      return `UPID:${params.node}:00012348:00ABCD15:${Date.now()}:delsnapshot:${params.vmid}:root@pam:`;
    }
    return invoke<string>('delete_guest_snapshot', params);
  },

  getStorageList: async (connectionId: string) => {
    if (!isTauriEnv()) return mockStorages;
    return invoke<StorageSummary[]>('get_storage_list', { connectionId });
  },

  getBackupContents: async (connectionId: string, node: string, storage: string) => {
    if (!isTauriEnv()) {
      return [
        {
          volid: `${storage}:backup/vzdump-qemu-105-2026_08_25-12_00_00.vma.zst`,
          vmid: 105,
          size: 15032385536,
          ctime: 1700000000,
          format: 'vma.zst',
          notes: 'Daily Automated Backup',
        },
        {
          volid: `${storage}:backup/vzdump-lxc-201-2026_08_25-02_00_00.tar.zst`,
          vmid: 201,
          size: 1073741824,
          ctime: 1699900000,
          format: 'tar.zst',
          notes: 'Nightly Container Backup',
        },
      ] as BackupContentItem[];
    }
    return invoke<BackupContentItem[]>('get_backup_contents', {
      connectionId,
      node,
      storage,
    });
  },

  getTaskStatus: async (connectionId: string, node: string, upid: string) => {
    if (!isTauriEnv()) {
      return {
        upid,
        node,
        status: 'stopped',
        exitstatus: 'OK',
        starttime: Math.floor(Date.now() / 1000) - 5,
        endtime: Math.floor(Date.now() / 1000),
        user: 'proxdesk@pve',
        type: 'vmatack',
      } as ProxmoxTask;
    }
    return invoke<ProxmoxTask>('get_task_status', { connectionId, node, upid });
  },

  getTaskLog: async (connectionId: string, node: string, upid: string) => {
    if (!isTauriEnv()) {
      return [
        { n: 1, t: `INFO: Starting operation for task ${upid}` },
        { n: 2, t: 'INFO: Connecting to QEMU guest agent...' },
        { n: 3, t: 'INFO: Executing power action via Proxmox REST API' },
        { n: 4, t: 'INFO: Operation completed successfully' },
        { n: 5, t: 'TASK OK' },
      ] as TaskLogLine[];
    }
    return invoke<TaskLogLine[]>('get_task_log', { connectionId, node, upid });
  },
};
