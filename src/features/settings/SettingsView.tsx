import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  Server,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Info,
  Plus,
} from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { proxmoxApi } from '../../lib/tauri';
import { ProxmoxVersion } from '../../types/proxmox';

interface SettingsViewProps {
  onAddServer: () => void;
  version: ProxmoxVersion | null;
  latencyMs?: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onAddServer,
  version,
  latencyMs,
}) => {
  const {
    theme,
    setTheme,
    connections,
    setConnections,
    activeConnectionId,
    setActiveConnectionId,
  } = useAppStore();

  const [copied, setCopied] = useState(false);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  const handleDeleteConnection = async (id: string) => {
    try {
      await proxmoxApi.deleteConnection(id);
      const updated = await proxmoxApi.getConnections();
      setConnections(updated);
      if (activeConnectionId === id) {
        setActiveConnectionId(updated[0]?.id || null);
      }
    } catch (err) {
      console.error('Failed to delete connection:', err);
    }
  };

  const handleCopyDiagnostics = () => {
    const diagData = {
      app: 'ProxDesk Linux Native Client',
      version: '0.1.0',
      os: 'Linux Native (X11 / Wayland)',
      tauri_version: '2.3.0',
      connected_server: activeConnection ? activeConnection.name : 'None',
      host: activeConnection ? activeConnection.host : 'N/A',
      port: activeConnection ? activeConnection.port : 'N/A',
      pve_version: version ? `${version.version}.${version.release}` : 'Unknown',
      api_latency_ms: latencyMs ?? 'N/A',
      tls_verification: 'Active with SHA-256 Fingerprint Pinning',
      timestamp: new Date().toISOString(),
    };

    navigator.clipboard.writeText(JSON.stringify(diagData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Application Settings</h1>
        <p className="text-xs text-muted-foreground">
          Configure preferences, server connections, appearance, and system diagnostics
        </p>
      </div>

      {/* 1. APPEARANCE SETTINGS */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sun className="w-4 h-4 text-primary" />
          Appearance & Theme
        </h2>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
              theme === 'dark'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Moon className="w-5 h-5" />
            Dark Theme
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
              theme === 'light'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sun className="w-5 h-5" />
            Light Theme
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
              theme === 'system'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Laptop className="w-5 h-5" />
            System Default
          </button>
        </div>
      </div>

      {/* 2. SAVED CONNECTIONS MANAGER */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            Saved Proxmox Connections ({connections.length})
          </h2>
          <button
            onClick={onAddServer}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Server
          </button>
        </div>

        <div className="space-y-2">
          {connections.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No saved Proxmox connections.
            </div>
          ) : (
            connections.map((conn) => {
              const isSelected = conn.id === activeConnectionId;
              return (
                <div
                  key={conn.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-secondary/20 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-2">
                        {conn.name}
                        {isSelected && (
                          <span className="text-[10px] bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {conn.host}:{conn.port} · User: {conn.user}@{conn.realm}!{conn.token_id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isSelected && (
                      <button
                        onClick={() => setActiveConnectionId(conn.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 rounded-lg transition-colors"
                      >
                        Connect
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteConnection(conn.id)}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete Connection & Credentials"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. DIAGNOSTICS & TELEMETRY */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Diagnostics & System Status
          </h2>
          <button
            onClick={handleCopyDiagnostics}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl border border-border transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied to Clipboard' : 'Copy Diagnostics'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-secondary/30 p-3 rounded-xl space-y-1">
            <span className="text-muted-foreground font-medium">ProxDesk Platform</span>
            <div className="font-bold text-foreground">Linux Native Client</div>
          </div>
          <div className="bg-secondary/30 p-3 rounded-xl space-y-1">
            <span className="text-muted-foreground font-medium">Desktop Engine</span>
            <div className="font-bold text-foreground">Tauri 2.x (Rust)</div>
          </div>
          <div className="bg-secondary/30 p-3 rounded-xl space-y-1">
            <span className="text-muted-foreground font-medium">Proxmox VE</span>
            <div className="font-bold text-foreground">
              {version ? `${version.version}.${version.release}` : 'N/A'}
            </div>
          </div>
          <div className="bg-secondary/30 p-3 rounded-xl space-y-1">
            <span className="text-muted-foreground font-medium">API Latency</span>
            <div className="font-bold text-foreground">{latencyMs !== undefined ? `${latencyMs} ms` : 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 4. ABOUT & LEGAL DISCLAIMER */}
      <div className="bg-secondary/20 border border-border/60 rounded-2xl p-5 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <Info className="w-4 h-4 text-primary" />
          About ProxDesk (Linux Native)
        </div>
        <p className="leading-relaxed">
          ProxDesk is a lightweight, modern native Linux desktop client designed for system administrators to manage Proxmox VE servers efficiently.
        </p>
        <p className="text-[11px] pt-1 text-muted-foreground/80">
          Disclaimer: ProxDesk is an independent open-source project and is not affiliated with, endorsed by, or sponsored by Proxmox Server Solutions GmbH.
        </p>
      </div>
    </div>
  );
};
