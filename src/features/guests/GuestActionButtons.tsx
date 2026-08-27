import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Power, Loader2, Tv, Sparkles } from 'lucide-react';
import { proxmoxApi } from '../../lib/tauri';
import { GuestSummary } from '../../types/proxmox';
import { useAppStore } from '../../stores/app-store';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface GuestActionButtonsProps {
  guest: GuestSummary;
  onActionStarted?: (upid: string, actionName: string) => void;
  size?: 'sm' | 'md';
}

export const GuestActionButtons: React.FC<GuestActionButtonsProps> = ({
  guest,
  onActionStarted,
  size = 'md',
}) => {
  const { activeConnectionId, connections, addActiveTask, setActiveConsoleGuest } = useAppStore();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [consoleDropdown, setConsoleDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [confirmModal, setConfirmModal] = useState<{
    action: string;
    title: string;
    description: string;
    destructive: boolean;
    requiresNameMatch?: string;
  } | null>(null);

  const isRunning = guest.status === 'running';
  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  // Close dropdown on outside click
  useEffect(() => {
    if (!consoleDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setConsoleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [consoleDropdown]);

  const executeAction = async (action: string) => {
    if (!activeConnectionId) return;
    setLoadingAction(action);

    try {
      const upid = await proxmoxApi.guestPowerAction({
        connectionId: activeConnectionId,
        node: guest.node,
        vmid: guest.vmid,
        guestType: guest.guest_type,
        action,
      });

      const actionName = `${action.toUpperCase()} ${guest.name}`;
      addActiveTask({
        upid,
        node: guest.node,
        vmid: guest.vmid,
        guestName: guest.name,
        action: `${action.toUpperCase()} ${guest.guest_type.toUpperCase()}`,
        status: 'running',
        startTime: Date.now(),
      });

      if (onActionStarted) {
        onActionStarted(upid, actionName);
      }
    } catch (err) {
      console.error('Power action failed:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOpenNativeWindow = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setConsoleDropdown(false);

    if (!activeConnectionId || !activeConnection) return;

    try {
      await proxmoxApi.openConsoleWindow({
        connectionId: activeConnectionId,
        connectionHost: activeConnection.host,
        connectionPort: activeConnection.port,
        node: guest.node,
        vmid: guest.vmid,
        guestType: guest.guest_type,
      });
    } catch (err) {
      console.warn('Native window launch fallback to modal:', err);
      setActiveConsoleGuest(guest);
    }
  };

  const handleOpenModalConsole = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setConsoleDropdown(false);
    setActiveConsoleGuest(guest);
  };

  const btnClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs';

  return (
    <div
      className="flex items-center gap-1.5 relative"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Primary Console Action Button */}
      {isRunning && (
        <div className="flex items-center gap-0.5 relative" ref={dropdownRef}>
          <button
            onClick={(e) => handleOpenNativeWindow(e)}
            className={`${btnClass} font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-l-lg flex items-center gap-1.5 shadow-sm transition-colors`}
            title="Open Native Desktop Console Window"
          >
            <Tv className="w-3.5 h-3.5 text-emerald-100" />
            <span>Console</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setConsoleDropdown(!consoleDropdown);
            }}
            className={`${btnClass} px-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-r-lg shadow-sm transition-colors border-l border-emerald-500/30`}
            title="Console Display Options"
          >
            ▾
          </button>

          {consoleDropdown && (
            <div
              className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-[60] p-1.5 animate-in fade-in zoom-in-95 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] font-semibold text-slate-400 uppercase px-2 py-1 tracking-wider">
                Console Mode Options
              </div>

              {/* Option 1: Native Desktop Window */}
              <button
                onClick={handleOpenNativeWindow}
                className="w-full flex items-center gap-2.5 p-2 text-xs font-medium text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-lg transition-colors text-left"
              >
                <Tv className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold">Native Desktop Window</div>
                  <div className="text-[10px] text-slate-400">Opens standalone window</div>
                </div>
              </button>

              {/* Option 2: In-App Modal View */}
              <button
                onClick={handleOpenModalConsole}
                className="w-full flex items-center gap-2.5 p-2 text-xs font-medium text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-lg transition-colors text-left"
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold">In-App Modal View</div>
                  <div className="text-[10px] text-slate-400">Embeds console in current tab</div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Power Action Buttons */}
      {!isRunning ? (
        <button
          onClick={() => executeAction('start')}
          disabled={loadingAction !== null}
          className={`${btnClass} font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50`}
        >
          {loadingAction === 'start' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Start</span>
        </button>
      ) : (
        <>
          <button
            onClick={() =>
              setConfirmModal({
                action: 'shutdown',
                title: `Shutdown ${guest.name}?`,
                description: `Send graceful ACPI shutdown signal to VM ${guest.vmid}.`,
                destructive: false,
              })
            }
            disabled={loadingAction !== null}
            className={`${btnClass} font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50`}
            title="Graceful Shutdown"
          >
            {loadingAction === 'shutdown' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Power className="w-3.5 h-3.5" />
            )}
            <span>Shutdown</span>
          </button>

          <button
            onClick={() =>
              setConfirmModal({
                action: 'stop',
                title: `Force Stop ${guest.name}?`,
                description: `Forcefully stop VM ${guest.vmid}. Unsaved data may be lost.`,
                destructive: true,
                requiresNameMatch: guest.name,
              })
            }
            disabled={loadingAction !== null}
            className={`${btnClass} font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50`}
            title="Force Stop"
          >
            {loadingAction === 'stop' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Square className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Stop</span>
          </button>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmDialog
          isOpen={true}
          title={confirmModal.title}
          description={confirmModal.description}
          destructive={confirmModal.destructive}
          requiresNameMatch={confirmModal.requiresNameMatch}
          onConfirm={() => {
            const act = confirmModal.action;
            setConfirmModal(null);
            executeAction(act);
          }}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};
