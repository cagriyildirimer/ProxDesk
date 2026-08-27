import React, { useEffect, useState } from 'react';
import { HardDrive, Archive, RefreshCw } from 'lucide-react';
import { StorageSummary, BackupContentItem } from '../../types/proxmox';
import { ResourceBar } from '../../components/common/ResourceBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatBytes, formatDateTime } from '../../lib/format';
import { proxmoxApi } from '../../lib/tauri';
import { useAppStore } from '../../stores/app-store';

interface StorageViewProps {
  storages: StorageSummary[];
  loading: boolean;
  onRefresh: () => void;
  mode?: 'all' | 'backups_only';
}

export const StorageView: React.FC<StorageViewProps> = ({
  storages,
  loading,
  onRefresh,
  mode = 'all',
}) => {
  const { activeConnectionId } = useAppStore();
  const displayStorages = mode === 'backups_only'
    ? storages.filter((s) => s.content.includes('backup'))
    : storages;

  const [selectedStorage, setSelectedStorage] = useState<StorageSummary | null>(null);
  const [backups, setBackups] = useState<BackupContentItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  useEffect(() => {
    if (mode === 'backups_only' && displayStorages.length > 0 && !selectedStorage) {
      setSelectedStorage(displayStorages[0]);
    }
  }, [displayStorages, mode]);

  useEffect(() => {
    if (selectedStorage && activeConnectionId) {
      loadBackups(selectedStorage);
    }
  }, [selectedStorage, activeConnectionId]);

  const loadBackups = async (storageItem: StorageSummary) => {
    if (!activeConnectionId) return;
    setLoadingBackups(true);
    try {
      const items = await proxmoxApi.getBackupContents(
        activeConnectionId,
        storageItem.node,
        storageItem.storage
      );
      setBackups(items || []);
    } catch {
      setBackups([]);
    } finally {
      setLoadingBackups(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {mode === 'backups_only' ? 'System Backups & Archives' : 'Storage Pools & Content'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === 'backups_only'
              ? `Inspect VZDump VM/LXC backup archives across ${displayStorages.length} backup storage pool(s)`
              : `Overview of LVM-Thin, ZFS, Directory, and Network storage volumes (${storages.length} pools)`}
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl border border-border transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          Refresh Storage
        </button>
      </div>

      {/* Storage Pool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storages.map((item) => (
          <div
            key={`${item.node}-${item.storage}`}
            onClick={() => setSelectedStorage(item)}
            className={`bg-card border rounded-2xl p-5 shadow-sm space-y-4 cursor-pointer transition-all ${
              selectedStorage?.storage === item.storage && selectedStorage?.node === item.node
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{item.storage}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Node: {item.node} · Type: <span className="uppercase">{item.storage_type}</span>
                  </p>
                </div>
              </div>
              <StatusBadge status={item.active ? 'active' : 'inactive'} size="sm" />
            </div>

            <ResourceBar
              label="Volume Usage"
              used={item.used}
              total={item.total}
              isBytes
              showPercentage
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
              <span>Available: {formatBytes(item.avail)}</span>
              <span>Content: {item.content}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Backup Content Inspector */}
      {selectedStorage && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Backups stored in <span className="text-primary">{selectedStorage.storage}</span> ({selectedStorage.node})
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Volume ID</th>
                  <th className="py-2.5 px-3">VMID</th>
                  <th className="py-2.5 px-3">Format</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loadingBackups ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Scanning storage for backup archives...
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No backup archive files found in this storage pool.
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.volid} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-foreground max-w-xs truncate">
                        {b.volid}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                        {b.vmid || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-muted-foreground font-semibold">
                        {b.format || 'vma'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground font-medium">
                        {formatBytes(b.size || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {formatDateTime(b.ctime)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
