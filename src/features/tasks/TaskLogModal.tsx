import React, { useEffect, useState } from 'react';
import { FileText, X, RefreshCw, Search } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { proxmoxApi } from '../../lib/tauri';
import { TaskLogLine } from '../../types/proxmox';

export const TaskLogModal: React.FC = () => {
  const { activeConnectionId, activeTaskLogUpid, setActiveTaskLogUpid } = useAppStore();
  const [logs, setLogs] = useState<TaskLogLine[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTaskLogUpid && activeConnectionId) {
      loadTaskLog();
    }
  }, [activeTaskLogUpid, activeConnectionId]);

  const loadTaskLog = async () => {
    if (!activeConnectionId || !activeTaskLogUpid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await proxmoxApi.getTaskLog(
        activeConnectionId,
        activeTaskLogUpid.node,
        activeTaskLogUpid.upid
      );
      setLogs(data || []);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to load task logs');
    } finally {
      setLoading(false);
    }
  };

  if (!activeTaskLogUpid) return null;

  const filteredLogs = logs.filter((line) =>
    line.t.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl h-[650px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground text-sm">Proxmox Task Log</h3>
              <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
                {activeTaskLogUpid.upid}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadTaskLog}
              disabled={loading}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              title="Refresh Log"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setActiveTaskLogUpid(null)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-4 py-2 border-b border-border bg-background flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter log lines..."
            className="w-full bg-transparent border-none text-xs text-foreground focus:outline-none"
          />
        </div>

        {/* Log Viewer Container */}
        <div className="flex-1 p-4 bg-black/90 text-emerald-400 font-mono text-xs overflow-y-auto space-y-1 selection:bg-emerald-500 selection:text-black">
          {loading && logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Loading task output...</div>
          ) : error ? (
            <div className="text-rose-400 p-2">{error}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-muted-foreground p-2">No matching log output lines.</div>
          ) : (
            filteredLogs.map((line, idx) => (
              <div key={idx} className="leading-relaxed hover:bg-white/5 px-1 rounded">
                <span className="text-gray-600 select-none mr-3 w-8 inline-block text-right">
                  {line.n}
                </span>
                <span>{line.t}</span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>Total lines: {logs.length}</span>
          <button
            onClick={() => setActiveTaskLogUpid(null)}
            className="px-3 py-1 bg-secondary text-foreground hover:bg-secondary/80 rounded-md font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
