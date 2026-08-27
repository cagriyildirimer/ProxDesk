import React from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { NoVncViewer } from '../../components/console/NoVncViewer';

export const ConsoleModal: React.FC = () => {
  const { activeConsoleGuest, setActiveConsoleGuest, activeConnectionId, connections } = useAppStore();

  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const guest = activeConsoleGuest;

  if (!activeConsoleGuest || !guest || !activeConnectionId || !activeConnection) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[85vh] flex flex-col bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header bar with close button */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="text-xs font-semibold text-slate-300">
            ProxDesk Native Console – {guest.name}
          </div>
          <button
            onClick={() => setActiveConsoleGuest(null)}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Embedded Native NoVNC Viewer */}
        <div className="flex-1 p-2 bg-slate-950">
          <NoVncViewer
            connectionId={activeConnectionId}
            host={activeConnection.host}
            port={activeConnection.port}
            node={guest.node}
            vmid={guest.vmid}
            guestType={guest.guest_type}
            guestName={guest.name}
            onClose={() => setActiveConsoleGuest(null)}
          />
        </div>
      </div>
    </div>
  );
};
