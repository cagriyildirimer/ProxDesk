import React, { useState } from 'react';
import {
  Server,
  ChevronDown,
  Plus,
  RefreshCw,
  Activity,
  Sun,
  Moon,
  Search,
  Check,
  Settings,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../../stores/app-store';

interface HeaderProps {
  onAddServer: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  latencyMs?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onAddServer,
  onRefresh,
  isRefreshing = false,
  latencyMs,
}) => {
  const {
    activeConnectionId,
    setActiveConnectionId,
    connections,
    theme,
    setTheme,
    searchQuery,
    setSearchQuery,
    activeTasks,
    setTaskCenterOpen,
    setActiveView,
  } = useAppStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isBrowserMock = typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window);
  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const runningTasksCount = activeTasks.filter((t) => t.status === 'running').length;

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('dark');
  };

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-4 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Left: Server Switcher Dropdown */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/80 transition-all text-sm font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Server className="w-4 h-4 text-primary" />
            <span className="text-foreground max-w-[160px] truncate">
              {activeConnection ? activeConnection.name : 'Select Proxmox Server'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase px-2.5 py-1">
                Proxmox Servers ({connections.length})
              </div>
              <div className="space-y-0.5 max-h-60 overflow-y-auto">
                {connections.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    No Proxmox servers added yet.
                  </div>
                ) : (
                  connections.map((conn) => {
                    const isSelected = conn.id === activeConnectionId;
                    return (
                      <button
                        key={conn.id}
                        onClick={() => {
                          setActiveConnectionId(conn.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors text-left ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'hover:bg-secondary text-foreground'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-medium truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            {conn.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate font-mono">
                            {conn.host}:{conn.port}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border mt-1 pt-1 space-y-0.5">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onAddServer();
                  }}
                  className="w-full flex items-center gap-2 p-2 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Proxmox Server
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setActiveView('settings');
                  }}
                  className="w-full flex items-center gap-2 p-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Manage Connections
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Development Mock Mode Indicator */}
        {isBrowserMock && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Development Mock Mode (Browser)</span>
          </div>
        )}

        {/* Latency Indicator */}
        {!isBrowserMock && latencyMs !== undefined && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/30 px-2.5 py-1 rounded-lg border border-border/50">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>API Latency:</span>
            <span className="font-semibold text-foreground">{latencyMs} ms</span>
          </div>
        )}
      </div>

      {/* Center: Search input */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search VMs, LXCs, VMIDs or tags... (Ctrl+K)"
            className="w-full pl-9 pr-4 py-1.5 bg-secondary/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-2">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl border border-border/50 transition-all"
          title="Refresh Data (Ctrl+R)"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>

        {/* Task Center Indicator */}
        <button
          onClick={() => setTaskCenterOpen(true)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50 rounded-xl transition-all"
          title="Task Center"
        >
          <Activity className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">Tasks</span>
          {runningTasksCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-black rounded-full animate-bounce">
              {runningTasksCount}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl border border-border/50 transition-all"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>
    </header>
  );
};
