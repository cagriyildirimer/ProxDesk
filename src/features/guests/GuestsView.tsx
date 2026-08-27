import React, { useMemo } from 'react';
import { Monitor, Box, Search, RefreshCw, Server } from 'lucide-react';
import { GuestSummary, NodeSummary } from '../../types/proxmox';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GuestActionButtons } from './GuestActionButtons';
import { formatBytes, formatUptime } from '../../lib/format';
import { useAppStore } from '../../stores/app-store';

interface GuestsViewProps {
  guests: GuestSummary[];
  nodes: NodeSummary[];
  loading: boolean;
  onRefresh: () => void;
  onSelectGuest: (guest: GuestSummary) => void;
}

export const GuestsView: React.FC<GuestsViewProps> = ({
  guests,
  nodes,
  loading,
  onRefresh,
  onSelectGuest,
}) => {
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    nodeFilter,
    setNodeFilter,
  } = useAppStore();

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      // Status filter
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;

      // Node filter
      if (nodeFilter !== 'all' && g.node !== nodeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = g.name.toLowerCase().includes(q);
        const matchVmid = g.vmid.toString().includes(q);
        const matchNode = g.node.toLowerCase().includes(q);
        const matchTags = g.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchVmid && !matchNode && !matchTags) return false;
      }

      return true;
    });
  }, [guests, statusFilter, nodeFilter, searchQuery]);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Virtual Machines & LXCs</h1>
          <p className="text-xs text-muted-foreground">
            Manage QEMU Virtual Machines and LXC Containers across your cluster ({guests.length} total)
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl border border-border transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          Refresh List
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'running', 'stopped', 'paused'] as const).map((st) => {
            const count =
              st === 'all' ? guests.length : guests.filter((g) => g.status === st).length;
            const isActive = statusFilter === st;

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>

        {/* Node & Search Filter Inputs */}
        <div className="flex items-center gap-3">
          {/* Node Filter */}
          <div className="relative">
            <select
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value)}
              className="appearance-none bg-background border border-input rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Nodes ({nodes.length})</option>
              {nodes.map((n) => (
                <option key={n.node} value={n.node}>
                  {n.node}
                </option>
              ))}
            </select>
            <Server className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search VMID or Name..."
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Guest Table Container */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">VMID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Node</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">CPU %</th>
                <th className="py-3 px-4">Memory</th>
                <th className="py-3 px-4">Disk</th>
                <th className="py-3 px-4">Uptime</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading && guests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    Loading guest inventory from Proxmox...
                  </td>
                </tr>
              ) : filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    No matching virtual machines or containers found.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr
                    key={`${guest.node}-${guest.vmid}`}
                    onClick={() => onSelectGuest(guest)}
                    className="hover:bg-secondary/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-[10px] uppercase text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                        {guest.guest_type === 'qemu' ? (
                          <Monitor className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <Box className="w-3 h-3 text-amber-400" />
                        )}
                        {guest.guest_type}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {guest.vmid}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {guest.name}
                      </div>
                      {guest.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {guest.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[9px] font-semibold bg-primary/10 text-primary px-1.5 py-0.2 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground font-medium">{guest.node}</td>

                    <td className="py-3 px-4">
                      <StatusBadge status={guest.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {(guest.cpu_usage * 100).toFixed(1)}%
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {formatBytes(guest.memory_used)} / {formatBytes(guest.memory_total)}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {formatBytes(guest.disk_used)} / {formatBytes(guest.disk_total)}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {formatUptime(guest.uptime)}
                    </td>

                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()} // Prevent row click when pressing buttons
                    >
                      <GuestActionButtons guest={guest} size="sm" />
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
