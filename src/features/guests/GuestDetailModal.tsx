import React, { useEffect, useState, useCallback } from 'react';
import {
  Monitor,
  Box,
  X,
  Wifi,
  Camera,
  Layers,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { GuestSummary, GuestNetworkInterface, SnapshotItem } from '../../types/proxmox';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ResourceBar } from '../../components/common/ResourceBar';
import { formatBytes, formatUptime, formatDateTime } from '../../lib/format';
import { proxmoxApi } from '../../lib/tauri';
import { useAppStore } from '../../stores/app-store';
import { GuestActionButtons } from './GuestActionButtons';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface GuestDetailModalProps {
  guest: GuestSummary | null;
  onClose: () => void;
}

export const GuestDetailModal: React.FC<GuestDetailModalProps> = ({
  guest,
  onClose,
}) => {
  const { activeConnectionId, addActiveTask } = useAppStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'hardware' | 'network' | 'snapshots'>('overview');

  const [netInterfaces, setNetInterfaces] = useState<GuestNetworkInterface[] | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);

  // Create Snapshot modal state
  const [createSnapModal, setCreateSnapModal] = useState(false);
  const [snapName, setSnapName] = useState('');
  const [snapDesc, setSnapDesc] = useState('');
  const [includeRam, setIncludeRam] = useState(true);

  // Destructive action state
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'rollback' | 'delete';
    snapname: string;
  } | null>(null);



  const loadAgentNetwork = useCallback(async () => {
    if (!guest || !activeConnectionId) return;
    try {
      const res = await proxmoxApi.getGuestAgentNetwork({
        connectionId: activeConnectionId,
        node: guest.node,
        vmid: guest.vmid,
      });
      setNetInterfaces(res || null);
    } catch {
      setNetInterfaces(null);
    }
  }, [guest, activeConnectionId]);

  const loadSnapshots = useCallback(async () => {
    if (!guest || !activeConnectionId) return;
    setLoadingSnapshots(true);
    try {
      const list = await proxmoxApi.getGuestSnapshots({
        connectionId: activeConnectionId,
        node: guest.node,
        vmid: guest.vmid,
        guestType: guest.guest_type,
      });
      setSnapshots(list || []);
    } catch {
      setSnapshots([]);
    } finally {
      setLoadingSnapshots(false);
    }
  }, [guest, activeConnectionId]);

  useEffect(() => {
    if (guest && activeConnectionId) {
      if (guest.guest_type === 'qemu') {
        loadAgentNetwork();
      }
      loadSnapshots();
    }
  }, [guest, activeConnectionId, loadAgentNetwork, loadSnapshots]);

  if (!guest) return null;

  const primaryIps: string[] = [];
  if (netInterfaces) {
    netInterfaces.forEach((iface) => {
      if (iface.name !== 'lo' && iface['ip-addresses']) {
        iface['ip-addresses'].forEach((ip) => {
          if (ip['ip-address-type'] === 'ipv4' && !ip['ip-address'].startsWith('127.')) {
            primaryIps.push(ip['ip-address']);
          }
        });
      }
    });
  }

  const handleCreateSnapshot = async () => {
    if (!activeConnectionId || !snapName) return;
    try {
      const upid = await proxmoxApi.createGuestSnapshot({
        connectionId: activeConnectionId,
        node: guest.node,
        vmid: guest.vmid,
        guestType: guest.guest_type,
        snapname: snapName,
        description: snapDesc,
        includeRam,
      });
      addActiveTask({
        upid,
        node: guest.node,
        vmid: guest.vmid,
        guestName: guest.name,
        action: `Snapshot ${snapName}`,
        status: 'running',
        startTime: Date.now(),
      });
      setCreateSnapModal(false);
      setSnapName('');
      setSnapDesc('');
      loadSnapshots();
    } catch (err) {
      console.error('Failed to create snapshot:', err);
    }
  };

  const handleRollbackSnapshot = async (snapname: string) => {
    if (!activeConnectionId) return;
    try {
      const upid = await proxmoxApi.rollbackGuestSnapshot({
        connectionId: activeConnectionId,
        node: guest.node,
        vmid: guest.vmid,
        guestType: guest.guest_type,
        snapname,
      });
      addActiveTask({
        upid,
        node: guest.node,
        vmid: guest.vmid,
        guestName: guest.name,
        action: `Rollback ${snapname}`,
        status: 'running',
        startTime: Date.now(),
      });
      loadSnapshots();
    } catch (err) {
      console.error('Failed to rollback snapshot:', err);
    }
  };

  const handleDeleteSnapshot = async (snapname: string) => {
    if (!activeConnectionId) return;
    try {
      const upid = await proxmoxApi.deleteGuestSnapshot({
        connectionId: activeConnectionId,
        node: guest.node,
        vmid: guest.vmid,
        guestType: guest.guest_type,
        snapname,
      });
      addActiveTask({
        upid,
        node: guest.node,
        vmid: guest.vmid,
        guestName: guest.name,
        action: `Delete Snapshot ${snapname}`,
        status: 'running',
        startTime: Date.now(),
      });
      loadSnapshots();
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl h-[700px] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-5 border-b border-border bg-secondary/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              {guest.guest_type === 'qemu' ? <Monitor className="w-6 h-6" /> : <Box className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{guest.name}</h2>
                <span className="font-mono text-xs font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                  VM {guest.vmid}
                </span>
                <StatusBadge status={guest.status} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                Node: <strong className="text-foreground">{guest.node}</strong> · Type:{' '}
                <span className="uppercase font-semibold text-primary">{guest.guest_type}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GuestActionButtons guest={guest} size="sm" />
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-border bg-background">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'hardware'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Hardware Specs
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'network'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Network ({primaryIps.length})
          </button>
          <button
            onClick={() => setActiveTab('snapshots')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'snapshots'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Snapshots ({snapshots.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Gauges Card */}
              <div className="bg-secondary/20 border border-border/60 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Live Resource Gauges
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ResourceBar
                    label="CPU Load"
                    used={guest.cpu_usage * 100}
                    total={100}
                    showPercentage
                  />
                  <ResourceBar
                    label="Memory"
                    used={guest.memory_used}
                    total={guest.memory_total}
                    isBytes
                    showPercentage
                  />
                  <ResourceBar
                    label="Disk Volume"
                    used={guest.disk_used}
                    total={guest.disk_total}
                    isBytes
                    showPercentage
                  />
                </div>
              </div>

              {/* Guest Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary/30 border border-border/50 rounded-xl p-3.5 space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">Uptime</div>
                  <div className="text-sm font-bold text-foreground">{formatUptime(guest.uptime)}</div>
                </div>
                <div className="bg-secondary/30 border border-border/50 rounded-xl p-3.5 space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">vCPUs</div>
                  <div className="text-sm font-bold text-foreground">{guest.cpu_count} Cores</div>
                </div>
                <div className="bg-secondary/30 border border-border/50 rounded-xl p-3.5 space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">Allocated RAM</div>
                  <div className="text-sm font-bold text-foreground">{formatBytes(guest.memory_total)}</div>
                </div>
                <div className="bg-secondary/30 border border-border/50 rounded-xl p-3.5 space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">QEMU Guest Agent</div>
                  <div className="text-sm font-bold text-foreground">
                    {guest.guest_type === 'lxc' ? (
                      <span className="text-muted-foreground font-normal text-xs">N/A (Container)</span>
                    ) : primaryIps.length > 0 ? (
                      <span className="text-emerald-400 font-semibold text-xs">Active</span>
                    ) : (
                      <span className="text-muted-foreground font-normal text-xs">Guest Agent unavailable</span>
                    )}
                  </div>
                </div>
              </div>

              {/* IP Addresses */}
              {primaryIps.length > 0 && (
                <div className="bg-secondary/20 border border-border/60 rounded-2xl p-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    Guest IPv4 Addresses
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {primaryIps.map((ip) => (
                      <span
                        key={ip}
                        className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold text-xs rounded-lg"
                      >
                        {ip}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HARDWARE */}
          {activeTab === 'hardware' && (
            <div className="bg-secondary/20 border border-border/60 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Hardware Configuration Summary
              </h3>
              <div className="divide-y divide-border/50 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Processor Cores</span>
                  <span className="font-semibold text-foreground">{guest.cpu_count} vCPU(s)</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Memory Size</span>
                  <span className="font-semibold text-foreground">{formatBytes(guest.memory_total)}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Disk Volume Capacity</span>
                  <span className="font-semibold text-foreground">{formatBytes(guest.disk_total)}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Host Node</span>
                  <span className="font-semibold text-foreground">{guest.node}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NETWORK */}
          {activeTab === 'network' && (
            <div className="space-y-4">
              {!netInterfaces || netInterfaces.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <Wifi className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-sm">Guest Agent network details unavailable for this guest.</p>
                </div>
              ) : (
                netInterfaces.map((iface) => (
                  <div
                    key={iface.name}
                    className="bg-secondary/20 border border-border/60 rounded-2xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <div className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-primary" />
                        {iface.name}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        MAC: {iface['hardware-address'] || 'N/A'}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      {iface['ip-addresses']?.map((ip, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-xs">
                          <span className="uppercase text-[10px] font-bold text-muted-foreground w-10">
                            {ip['ip-address-type']}
                          </span>
                          <span className="font-mono font-semibold text-foreground">{ip['ip-address']}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: SNAPSHOTS */}
          {activeTab === 'snapshots' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Snapshots Tree ({snapshots.length})
                </h3>
                <button
                  onClick={() => setCreateSnapModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Snapshot
                </button>
              </div>

              {loadingSnapshots ? (
                <div className="text-center py-12 text-muted-foreground">Loading snapshots...</div>
              ) : snapshots.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <Camera className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-sm">No snapshots exist for this guest.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.name}
                      className="bg-secondary/20 border border-border/60 rounded-xl p-3.5 flex items-center justify-between hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" />
                          {snap.name}
                          {snap.name === 'current' && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                              CURRENT STATE
                            </span>
                          )}
                        </div>
                        {snap.description && (
                          <p className="text-xs text-muted-foreground">{snap.description}</p>
                        )}
                        {snap.snaptime && (
                          <div className="text-[11px] text-muted-foreground">
                            Created: {formatDateTime(snap.snaptime)}
                          </div>
                        )}
                      </div>

                      {snap.name !== 'current' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setConfirmDialog({ type: 'rollback', snapname: snap.name })
                            }
                            className="px-2.5 py-1 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Rollback
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDialog({ type: 'delete', snapname: snap.name })
                            }
                            className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Snapshot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Snapshot Modal */}
      {createSnapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Take Snapshot of {guest.name}
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Snapshot Name</label>
                <input
                  type="text"
                  value={snapName}
                  onChange={(e) => setSnapName(e.target.value)}
                  placeholder="before-update"
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
                <textarea
                  value={snapDesc}
                  onChange={(e) => setSnapDesc(e.target.value)}
                  placeholder="System snapshot before OS update"
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary h-20"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRam}
                  onChange={(e) => setIncludeRam(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                Include RAM state (VM state)
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCreateSnapModal(false)}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSnapshot}
                disabled={!snapName}
                className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Rollback / Delete Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmDialog(null)}
          onConfirm={() => {
            if (confirmDialog.type === 'rollback') {
              handleRollbackSnapshot(confirmDialog.snapname);
            } else {
              handleDeleteSnapshot(confirmDialog.snapname);
            }
          }}
          title={
            confirmDialog.type === 'rollback'
              ? `Rollback to "${confirmDialog.snapname}"?`
              : `Delete Snapshot "${confirmDialog.snapname}"?`
          }
          description={
            confirmDialog.type === 'rollback'
              ? `Rollback will restore guest state to snapshot "${confirmDialog.snapname}". Unsaved changes will be permanently lost.`
              : `Deleting snapshot "${confirmDialog.snapname}" is irreversible.`
          }
          confirmText={confirmDialog.type === 'rollback' ? 'Rollback' : 'Delete'}
          destructive={true}
        />
      )}
    </div>
  );
};
