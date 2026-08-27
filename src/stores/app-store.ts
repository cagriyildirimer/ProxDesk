import { create } from 'zustand';
import { ConnectionProfile } from '../types/connection';
import { GuestSummary } from '../types/proxmox';

export type AppView = 'dashboard' | 'nodes' | 'guests' | 'storage' | 'backups' | 'settings';
export type ThemeMode = 'system' | 'dark' | 'light';

export interface ActiveTaskItem {
  upid: string;
  node: string;
  vmid?: number;
  guestName?: string;
  action: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  message?: string;
}

interface AppStoreState {
  activeConnectionId: string | null;
  connections: ConnectionProfile[];
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  activeView: AppView;
  searchQuery: string;
  statusFilter: 'all' | 'running' | 'stopped' | 'paused';
  nodeFilter: string;
  selectedGuest: GuestSummary | null;
  activeConsoleGuest: GuestSummary | null;
  
  // Task tracking state
  activeTasks: ActiveTaskItem[];
  taskCenterOpen: boolean;
  activeTaskLogUpid: { upid: string; node: string } | null;

  // Actions
  setActiveConnectionId: (id: string | null) => void;
  setConnections: (connections: ConnectionProfile[]) => void;
  setTheme: (theme: ThemeMode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveView: (view: AppView) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: 'all' | 'running' | 'stopped' | 'paused') => void;
  setNodeFilter: (node: string) => void;
  setSelectedGuest: (guest: GuestSummary | null) => void;
  setActiveConsoleGuest: (guest: GuestSummary | null) => void;
  
  // Task Actions
  addActiveTask: (task: ActiveTaskItem) => void;
  updateActiveTask: (upid: string, updates: Partial<ActiveTaskItem>) => void;
  setTaskCenterOpen: (open: boolean) => void;
  setActiveTaskLogUpid: (task: { upid: string; node: string } | null) => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  activeConnectionId: null,
  connections: [],
  theme: (localStorage.getItem('proxdesk_theme') as ThemeMode) || 'system',
  sidebarCollapsed: false,
  activeView: 'dashboard',
  searchQuery: '',
  statusFilter: 'all',
  nodeFilter: 'all',
  selectedGuest: null,
  activeConsoleGuest: null,

  activeTasks: [],
  taskCenterOpen: false,
  activeTaskLogUpid: null,

  setActiveConnectionId: (id) => set({ activeConnectionId: id }),
  setConnections: (connections) => set({ connections }),
  setTheme: (theme) => {
    localStorage.setItem('proxdesk_theme', theme);
    set({ theme });
  },
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setActiveView: (activeView) => set({ activeView }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setNodeFilter: (nodeFilter) => set({ nodeFilter }),
  setSelectedGuest: (selectedGuest) => set({ selectedGuest }),
  setActiveConsoleGuest: (activeConsoleGuest) => set({ activeConsoleGuest }),

  addActiveTask: (task) =>
    set((state) => ({
      activeTasks: [task, ...state.activeTasks.filter((t) => t.upid !== task.upid)],
    })),
  updateActiveTask: (upid, updates) =>
    set((state) => ({
      activeTasks: state.activeTasks.map((t) =>
        t.upid === upid ? { ...t, ...updates } : t
      ),
    })),
  setTaskCenterOpen: (taskCenterOpen) => set({ taskCenterOpen }),
  setActiveTaskLogUpid: (activeTaskLogUpid) => set({ activeTaskLogUpid }),
}));
