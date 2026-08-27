import React from 'react';
import { Activity, CheckCircle2, X, XCircle, FileText, Loader2 } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { formatDateTime } from '../../lib/format';

export const TaskCenter: React.FC = () => {
  const {
    taskCenterOpen,
    setTaskCenterOpen,
    activeTasks,
    setActiveTaskLogUpid,
  } = useAppStore();

  if (!taskCenterOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Task Center</h3>
          <span className="px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary rounded-full">
            {activeTasks.length}
          </span>
        </div>
        <button
          onClick={() => setTaskCenterOpen(false)}
          className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <Activity className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-sm">No recent background tasks.</p>
          </div>
        ) : (
          activeTasks.map((task) => (
            <div
              key={task.upid}
              className="bg-background border border-border rounded-xl p-3 space-y-2 hover:border-primary/50 transition-colors shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm text-foreground flex items-center gap-1.5">
                    <span>{task.action}</span>
                    {task.guestName && (
                      <span className="text-xs text-muted-foreground">({task.guestName})</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Node: {task.node} · {formatDateTime(Math.floor(task.startTime / 1000))}
                  </div>
                </div>

                {/* Status Indicator */}
                {task.status === 'running' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Running
                  </span>
                ) : task.status === 'completed' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Success
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                    <XCircle className="w-3 h-3" />
                    Failed
                  </span>
                )}
              </div>

              {task.message && (
                <p className="text-xs text-rose-400 bg-rose-500/5 p-2 rounded border border-rose-500/10">
                  {task.message}
                </p>
              )}

              <button
                onClick={() => setActiveTaskLogUpid({ upid: task.upid, node: task.node })}
                className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                View Task Log
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
