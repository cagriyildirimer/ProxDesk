import React, { useState } from 'react';
import { Server, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { proxmoxApi } from '../../lib/tauri';
import { ConnectionTestResult } from '../../types/connection';
import { useAppStore } from '../../stores/app-store';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (connectionId: string) => void;
}

export const AddServerModal: React.FC<AddServerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { setConnections } = useAppStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [name, setName] = useState('HomeLab');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(8006);
  const [user, setUser] = useState('proxdesk');
  const [realm, setRealm] = useState('pve');
  const [tokenId, setTokenId] = useState('desktop');
  const [tokenSecret, setTokenSecret] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setError(null);
    setTesting(true);
    setTestResult(null);

    // Sanitize Token ID if user accidentally pasted full `user@realm!tokenid` string
    let cleanTokenId = tokenId.trim();
    if (cleanTokenId.includes('!')) {
      cleanTokenId = cleanTokenId.split('!').pop() || cleanTokenId;
    }

    try {
      const res = await proxmoxApi.testConnection({
        host,
        port,
        user,
        realm,
        tokenId: cleanTokenId,
        tokenSecret,
      });
      setTestResult(res);
      setStep(3);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to connect to Proxmox server');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setError(null);

    let cleanTokenId = tokenId.trim();
    if (cleanTokenId.includes('!')) {
      cleanTokenId = cleanTokenId.split('!').pop() || cleanTokenId;
    }

    try {
      const profile = await proxmoxApi.addConnection({
        name,
        host,
        port,
        user,
        realm,
        tokenId: cleanTokenId,
        tokenSecret,
        trustedFingerprints: [],
      });
      const all = await proxmoxApi.getConnections();
      setConnections(all);
      onSuccess(profile.id);
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save connection profile');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Add Proxmox VE Server</h3>
              <p className="text-xs text-muted-foreground">Configure API Token connection details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Wizard Progress */}
        <div className="grid grid-cols-3 gap-2 px-6 pt-4 pb-2 border-b border-border/50 bg-background/50">
          <div
            className={`h-1.5 rounded-full transition-all ${
              step >= 1 ? 'bg-primary' : 'bg-secondary'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all ${
              step >= 2 ? 'bg-primary' : 'bg-secondary'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all ${
              step >= 3 ? 'bg-primary' : 'bg-secondary'
            }`}
          />
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="HomeLab Cluster"
                  className="w-full px-3.5 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Host / IP Address</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="192.168.1.10 or pve.local"
                    className="w-full px-3.5 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value) || 8006)}
                    className="w-full px-3.5 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Username</label>
                  <input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="proxdesk"
                    className="w-full px-3.5 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Realm</label>
                  <input
                    type="text"
                    value={realm}
                    onChange={(e) => setRealm(e.target.value)}
                    placeholder="pve or pam"
                    className="w-full px-3.5 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Token ID</label>
                <input
                  type="text"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  placeholder="desktop"
                  className="w-full px-3.5 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter just the Token ID name (e.g. <span className="font-mono text-primary">desktop</span>, not the full <span className="font-mono">user@realm!tokenid</span> format).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Token Secret</label>
                <input
                  type="password"
                  value={tokenSecret}
                  onChange={(e) => setTokenSecret(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-3.5 py-2 bg-background border border-input rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Secret is stored securely in native operating system keyring (Secret Service / Credential Manager).
                </p>
              </div>
            </div>
          )}

          {step === 3 && testResult && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-emerald-400">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Connection Successful!
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-foreground">
                  <div>Proxmox VE: <span className="font-semibold">{testResult.pve_version}</span></div>
                  <div>Nodes: <span className="font-semibold">{testResult.node_count}</span></div>
                  <div>Primary Node: <span className="font-semibold">{testResult.first_node}</span></div>
                  <div>API Latency: <span className="font-semibold">{testResult.latency_ms} ms</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/20">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as any)}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={!name || !host}
              className="px-5 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl disabled:opacity-50 transition-colors shadow-sm"
            >
              Next: Authentication
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleTestConnection}
              disabled={testing || !user || !realm || !tokenId || !tokenSecret}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl disabled:opacity-50 transition-colors shadow-sm"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleSave}
              className="px-6 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
            >
              Save Server Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
