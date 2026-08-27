import React from 'react';
import {
  LayoutDashboard,
  Server,
  Monitor,
  Box,
  HardDrive,
  Archive,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAppStore, AppView } from '../../stores/app-store';
import { clsx } from 'clsx';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, sidebarCollapsed, setSidebarCollapsed } = useAppStore();

  const navItems: { label: string; view: AppView; icon: React.ReactNode; group: string }[] = [
    { label: 'Dashboard', view: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" />, group: 'OVERVIEW' },
    { label: 'Nodes', view: 'nodes', icon: <Server className="w-4 h-4" />, group: 'INFRASTRUCTURE' },
    { label: 'Virtual Machines', view: 'guests', icon: <Monitor className="w-4 h-4" />, group: 'INFRASTRUCTURE' },
    { label: 'LXC Containers', view: 'guests', icon: <Box className="w-4 h-4" />, group: 'INFRASTRUCTURE' },
    { label: 'Storage', view: 'storage', icon: <HardDrive className="w-4 h-4" />, group: 'DATA' },
    { label: 'Backups', view: 'backups', icon: <Archive className="w-4 h-4" />, group: 'DATA' },
    { label: 'Settings', view: 'settings', icon: <Settings className="w-4 h-4" />, group: 'SYSTEM' },
  ];

  const grouped = navItems.reduce((acc, item) => {
    acc[item.group] = acc[item.group] || [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <aside
      className={clsx(
        'border-r border-border bg-card/40 backdrop-blur-md flex flex-col justify-between transition-all duration-300 select-none z-20',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Top Branding Header */}
      <div>
        <div className="h-14 px-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 bg-primary text-primary-foreground rounded-xl font-bold shrink-0 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="font-bold text-base tracking-tight text-foreground">
                ProxDesk <span className="text-xs font-normal text-primary font-mono ml-1">v0.1</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <div className="p-2 space-y-4">
          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName} className="space-y-1">
              {!sidebarCollapsed && (
                <div className="text-[10px] font-semibold text-muted-foreground tracking-wider px-3 py-1">
                  {groupName}
                </div>
              )}
              {items.map((item) => {
                const isActive = activeView === item.view;
                return (
                  <button
                    key={item.label}
                    onClick={() => setActiveView(item.view)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      {!sidebarCollapsed && (
        <div className="p-3 border-t border-border bg-secondary/10 text-[11px] text-muted-foreground space-y-0.5">
          <div className="font-medium text-foreground">Proxmox VE Desktop</div>
          <div>Cross-Platform Native Client</div>
        </div>
      )}
    </aside>
  );
};
