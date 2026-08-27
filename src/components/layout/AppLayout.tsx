import React, { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TaskCenter } from '../common/TaskCenter';
import { ToastNotifications, ToastMessage } from '../common/ToastNotifications';
import { AddServerModal } from '../../features/onboarding/AddServerModal';
import { DashboardView } from '../../features/dashboard/DashboardView';
import { NodesView } from '../../features/nodes/NodesView';
import { GuestsView } from '../../features/guests/GuestsView';
import { GuestDetailModal } from '../../features/guests/GuestDetailModal';
import { ConsoleModal } from '../../features/guests/ConsoleModal';
import { StorageView } from '../../features/storage/StorageView';
import { SettingsView } from '../../features/settings/SettingsView';
import { TaskLogModal } from '../../features/tasks/TaskLogModal';
import { useAppStore } from '../../stores/app-store';
import { proxmoxApi } from '../../lib/tauri';
import { Server, Plus, AlertTriangle, RefreshCw } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const queryClient = useQueryClient();
  const {
    activeConnectionId,
    setActiveConnectionId,
    connections,
    setConnections,
    theme,
    activeView,
    activeTasks,
    updateActiveTask,
    selectedGuest,
    setSelectedGuest,
  } = useAppStore();

  const [addServerOpen, setAddServerOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);

  // Apply dark mode class to HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  // Initial load connections
  useEffect(() => {
    proxmoxApi
      .getConnections()
      .then((data) => {
        setConnections(data || []);
        if (data && data.length > 0 && !activeConnectionId) {
          setActiveConnectionId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // TanStack Queries scoped by activeConnectionId
  const {
    data: nodes = [],
    isLoading: loadingNodes,
    refetch: refetchNodes,
    error: nodesError,
  } = useQuery({
    queryKey: ['nodes', activeConnectionId],
    queryFn: async () => {
      if (!activeConnectionId) return [];
      const start = Date.now();
      const res = await proxmoxApi.getNodes(activeConnectionId);
      setLatencyMs(Date.now() - start);
      return res;
    },
    enabled: !!activeConnectionId,
    refetchInterval: 5000,
  });

  const { data: version = null, error: versionError } = useQuery({
    queryKey: ['version', activeConnectionId],
    queryFn: () => (activeConnectionId ? proxmoxApi.getVersion(activeConnectionId) : null),
    enabled: !!activeConnectionId,
  });

  const { data: clusterOverview = null } = useQuery({
    queryKey: ['cluster', activeConnectionId],
    queryFn: () => (activeConnectionId ? proxmoxApi.getClusterOverview(activeConnectionId) : null),
    enabled: !!activeConnectionId,
  });

  const {
    data: guests = [],
    isLoading: loadingGuests,
    refetch: refetchGuests,
    error: guestsError,
  } = useQuery({
    queryKey: ['guests', activeConnectionId],
    queryFn: () => (activeConnectionId ? proxmoxApi.getGuests(activeConnectionId) : []),
    enabled: !!activeConnectionId,
    refetchInterval: 5000,
  });

  const {
    data: storages = [],
    isLoading: loadingStorages,
    refetch: refetchStorages,
    error: storagesError,
  } = useQuery({
    queryKey: ['storage', activeConnectionId],
    queryFn: () => (activeConnectionId ? proxmoxApi.getStorageList(activeConnectionId) : []),
    enabled: !!activeConnectionId,
    refetchInterval: 15000,
  });

  const apiError = nodesError || guestsError || storagesError || versionError;
  const errorMessage = apiError
    ? typeof apiError === 'string'
      ? apiError
      : (apiError as any).message || JSON.stringify(apiError)
    : null;

  // Task Polling Loop for active running tasks
  useEffect(() => {
    const runningTasks = activeTasks.filter((t) => t.status === 'running');
    if (runningTasks.length === 0 || !activeConnectionId) return;

    const interval = setInterval(async () => {
      for (const task of runningTasks) {
        try {
          const res = await proxmoxApi.getTaskStatus(activeConnectionId, task.node, task.upid);
          if (res.status === 'stopped') {
            const isSuccess = res.exitstatus === 'OK';
            updateActiveTask(task.upid, {
              status: isSuccess ? 'completed' : 'failed',
              message: res.exitstatus,
            });

            // Trigger notification
            addToast({
              id: task.upid,
              type: isSuccess ? 'success' : 'error',
              title: `${task.action} ${isSuccess ? 'Completed Successfully' : 'Failed'}`,
              message: res.exitstatus !== 'OK' ? res.exitstatus : undefined,
            });

            // Invalidate queries to refresh UI data
            queryClient.invalidateQueries({ queryKey: ['guests', activeConnectionId] });
            queryClient.invalidateQueries({ queryKey: ['nodes', activeConnectionId] });
            queryClient.invalidateQueries({ queryKey: ['storage', activeConnectionId] });
          }
        } catch {
          // ignore transient poll error
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeTasks, activeConnectionId]);

  const handleRefreshAll = useCallback(() => {
    refetchNodes();
    refetchGuests();
    refetchStorages();
  }, [refetchNodes, refetchGuests, refetchStorages]);

  const addToast = (toast: ToastMessage) => {
    setToasts((prev) => [toast, ...prev]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Keyboard shortcut listener (Ctrl+R for refresh)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRefreshAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefreshAll]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <Header
          onAddServer={() => setAddServerOpen(true)}
          onRefresh={handleRefreshAll}
          isRefreshing={loadingGuests || loadingNodes || loadingStorages}
          latencyMs={latencyMs}
        />

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
              <div>
                <div className="font-bold text-xs uppercase tracking-wider text-rose-300">
                  Proxmox API Error
                </div>
                <div className="text-xs font-mono mt-0.5">{errorMessage}</div>
              </div>
            </div>
            <button
              onClick={handleRefreshAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold rounded-xl border border-rose-500/30 transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry API Call
            </button>
          </div>
        )}

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto bg-background">
          {connections.length === 0 ? (
            /* First-Run Onboarding Display */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
              <div className="p-4 bg-primary/10 text-primary rounded-3xl shadow-lg">
                <Server className="w-12 h-12" />
              </div>
              <div className="space-y-2 max-w-md">
                <h2 className="text-2xl font-bold text-foreground">Welcome to ProxDesk</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Manage your Proxmox VE infrastructure from a fast, native desktop client with real-time monitoring and secure API Token authentication.
                </p>
              </div>
              <button
                onClick={() => setAddServerOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold rounded-2xl shadow-lg transition-all transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Add Proxmox Server
              </button>
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && (
                <DashboardView
                  nodes={nodes}
                  guests={guests}
                  storages={storages}
                  clusterOverview={clusterOverview}
                  loading={loadingNodes || loadingGuests}
                  onSelectGuest={(g) => setSelectedGuest(g)}
                />
              )}

              {activeView === 'nodes' && (
                <NodesView
                  nodes={nodes}
                  version={version}
                />
              )}

              {activeView === 'guests' && (
                <GuestsView
                  guests={guests}
                  nodes={nodes}
                  loading={loadingGuests}
                  onRefresh={handleRefreshAll}
                  onSelectGuest={(g) => setSelectedGuest(g)}
                />
              )}

              {activeView === 'storage' && (
                <StorageView
                  storages={storages}
                  loading={loadingStorages}
                  onRefresh={handleRefreshAll}
                  mode="all"
                />
              )}

              {activeView === 'backups' && (
                <StorageView
                  storages={storages}
                  loading={loadingStorages}
                  onRefresh={handleRefreshAll}
                  mode="backups_only"
                />
              )}

              {activeView === 'settings' && (
                <SettingsView
                  onAddServer={() => setAddServerOpen(true)}
                  version={version}
                  latencyMs={latencyMs}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Slide-over Task Center */}
      <TaskCenter />

      {/* Task Log Monospace Viewer Modal */}
      <TaskLogModal />

      {/* Guest Detail Drawer/Modal */}
      <GuestDetailModal
        guest={selectedGuest}
        onClose={() => setSelectedGuest(null)}
      />

      {/* Embedded Console Modal (VMware / Proxmox Style) */}
      <ConsoleModal />

      {/* Add Server Onboarding Wizard */}
      <AddServerModal
        isOpen={addServerOpen}
        onClose={() => setAddServerOpen(false)}
        onSuccess={(id) => {
          setActiveConnectionId(id);
          handleRefreshAll();
        }}
      />

      {/* Floating Toast Notifications */}
      <ToastNotifications toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
