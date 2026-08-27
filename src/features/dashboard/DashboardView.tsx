import React from 'react';
import {
  Server,
  Monitor,
  Box,
  HardDrive,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { NodeSummary, GuestSummary, StorageSummary, ClusterOverview } from '../../types/proxmox';
import { ResourceBar } from '../../components/common/ResourceBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatBytes, formatUptime } from '../../lib/format';
import { useAppStore } from '../../stores/app-store';

interface DashboardViewProps {
  nodes: NodeSummary[];
  guests: GuestSummary[];
  storages: StorageSummary[];
  clusterOverview: ClusterOverview | null;
  loading: boolean;
  onSelectGuest: (guest: GuestSummary) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  nodes,
  guests,
  storages,
  clusterOverview,
  loading,
  onSelectGuest,
}) => {
  const { setActiveView } = useAppStore();

  const totalNodes = nodes.length;
  const onlineNodes = nodes.filter((n) => n.status === 'online').length;

  const totalVms = guests.filter((g) => g.guest_type === 'qemu').length;
  const runningVms = guests.filter((g) => g.guest_type === 'qemu' && g.status === 'running').length;

  const totalLxcs = guests.filter((g) => g.guest_type === 'lxc').length;
  const runningLxcs = guests.filter((g) => g.guest_type === 'lxc' && g.status === 'running').length;

  const totalStorage = storages.reduce((acc, s) => acc + s.total, 0);
  const usedStorage = storages.reduce((acc, s) => acc + s.used, 0);

  const runningGuests = guests.filter((g) => g.status === 'running');

  // Aggregated Cluster CPU & RAM
  const aggregateCpuUsed = nodes.reduce((acc, n) => acc + (n.cpu || 0), 0);
  const aggregateCpuCount = nodes.reduce((acc, n) => acc + (n.maxcpu || 1), 0);

  const aggregateMemUsed = nodes.reduce((acc, n) => acc + (n.mem || 0), 0);
  const aggregateMemTotal = nodes.reduce((acc, n) => acc + (n.maxmem || 0), 0);

  if (loading && nodes.length === 0) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-card border border-border rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Infrastructure Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            {clusterOverview ? (
              <span>
                Cluster: <strong className="text-foreground">{clusterOverview.name}</strong> ({clusterOverview.online_count}/{clusterOverview.node_count} nodes online)
              </span>
            ) : (
              <span>Standalone Proxmox VE Node</span>
            )}
          </p>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Nodes Card */}
        <div
          onClick={() => setActiveView('nodes')}
          className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Nodes</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-foreground">
              {onlineNodes} <span className="text-sm font-normal text-muted-foreground">/ {totalNodes}</span>
            </div>
            <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {totalNodes > 0 ? `${Math.round((onlineNodes / totalNodes) * 100)}%` : '0%'} Online
            </span>
          </div>
        </div>

        {/* Virtual Machines Card */}
        <div
          onClick={() => setActiveView('guests')}
          className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Virtual Machines</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
              <Monitor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-foreground">
              {runningVms} <span className="text-sm font-normal text-muted-foreground">/ {totalVms}</span>
            </div>
            <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {runningVms} Running
            </span>
          </div>
        </div>

        {/* LXC Containers Card */}
        <div
          onClick={() => setActiveView('guests')}
          className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">LXC Containers</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
              <Box className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-foreground">
              {runningLxcs} <span className="text-sm font-normal text-muted-foreground">/ {totalLxcs}</span>
            </div>
            <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {runningLxcs} Running
            </span>
          </div>
        </div>

        {/* Storage Card */}
        <div
          onClick={() => setActiveView('storage')}
          className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Storage Usage</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-foreground">
              {totalStorage > 0 ? `${Math.round((usedStorage / totalStorage) * 100)}%` : '0%'}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatBytes(usedStorage)} / {formatBytes(totalStorage)}
            </span>
          </div>
        </div>
      </div>

      {/* Cluster Resource Gauges Section */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Cluster Resource Usage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ResourceBar
            label="CPU Usage"
            used={aggregateCpuUsed * 100}
            total={aggregateCpuCount * 100}
            showPercentage
          />
          <ResourceBar
            label="RAM Usage"
            used={aggregateMemUsed}
            total={aggregateMemTotal}
            isBytes
            showPercentage
          />
          <ResourceBar
            label="Storage Pool Usage"
            used={usedStorage}
            total={totalStorage}
            isBytes
            showPercentage
          />
        </div>
      </div>

      {/* Nodes Overview Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            Node Overview ({nodes.length})
          </h2>
          <button
            onClick={() => setActiveView('nodes')}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View All Nodes <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => (
            <div
              key={node.node}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-foreground">{node.node}</span>
                </div>
                <StatusBadge status={node.status} size="sm" />
              </div>

              <div className="space-y-2 pt-1">
                <ResourceBar
                  label="CPU"
                  used={(node.cpu || 0) * 100}
                  total={100}
                  showPercentage
                />
                <ResourceBar
                  label="RAM"
                  used={node.mem || 0}
                  total={node.maxmem || 1}
                  isBytes
                  showPercentage
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                <span>Uptime: {formatUptime(node.uptime || 0)}</span>
                <span>CPU: {node.maxcpu || 0} Cores</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Running Guests Table */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            Active Running Guests ({runningGuests.length})
          </h2>
          <button
            onClick={() => setActiveView('guests')}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Manage All Guests <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-semibold">
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">VMID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Node</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">CPU</th>
                <th className="py-2.5 px-3">RAM</th>
                <th className="py-2.5 px-3">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {runningGuests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No active running guests right now.
                  </td>
                </tr>
              ) : (
                runningGuests.slice(0, 10).map((guest) => (
                  <tr
                    key={`${guest.node}-${guest.vmid}`}
                    onClick={() => onSelectGuest(guest)}
                    className="hover:bg-secondary/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-semibold uppercase text-muted-foreground">
                      {guest.guest_type}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                      {guest.vmid}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      {guest.name}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{guest.node}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={guest.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {(guest.cpu_usage * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {formatBytes(guest.memory_used)} / {formatBytes(guest.memory_total)}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {formatUptime(guest.uptime)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
