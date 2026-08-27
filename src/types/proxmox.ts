export type GuestType = 'qemu' | 'lxc';
export type GuestStatus = 'running' | 'stopped' | 'paused' | 'unknown';

export interface ProxmoxVersion {
  version: string;
  release: string;
  repoid?: string;
}

export interface NodeSummary {
  node: string;
  status: string;
  cpu?: number;
  maxcpu?: number;
  mem?: number;
  maxmem?: number;
  uptime?: number;
  level?: string;
}

export interface ClusterOverview {
  name: string;
  quorate: boolean;
  node_count: number;
  online_count: number;
}

export interface GuestSummary {
  vmid: number;
  name: string;
  guest_type: GuestType;
  node: string;
  status: GuestStatus;
  cpu_usage: number;
  cpu_count: number;
  memory_used: number;
  memory_total: number;
  disk_used: number;
  disk_total: number;
  uptime: number;
  is_template: boolean;
  tags: string[];
  primary_ip?: string;
  agent_status?: string;
}

export interface GuestIpAddress {
  'ip-address': string;
  'ip-address-type': string;
  prefix?: number;
}

export interface GuestNetworkInterface {
  name: string;
  'hardware-address'?: string;
  'ip-addresses'?: GuestIpAddress[];
}

export interface StorageSummary {
  storage: string;
  storage_type: string;
  node: string;
  status: string;
  content: string;
  used: number;
  total: number;
  avail: number;
  shared: boolean;
  active: boolean;
}

export interface ProxmoxTask {
  upid: string;
  node: string;
  status: string;
  exitstatus?: string;
  starttime?: number;
  endtime?: number;
  user?: string;
  type?: string;
  id?: string;
}

export interface TaskLogLine {
  n: number;
  t: string;
}

export interface SnapshotItem {
  name: string;
  description?: string;
  snaptime?: number;
  parent?: string;
  vmstate?: number;
}

export interface BackupContentItem {
  volid: string;
  vmid?: number;
  size?: number;
  ctime?: number;
  format?: string;
  notes?: string;
}

export interface AppErrorResponse {
  code: string;
  message: string;
  details?: string;
}
