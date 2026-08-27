import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import RFB from '@novnc/novnc';
import { proxmoxApi } from '../../lib/tauri';
import { Loader2, RefreshCw, Maximize2, Minimize2, Terminal, ShieldAlert } from 'lucide-react';

interface NoVncViewerProps {
  connectionId: string;
  host: string;
  port: number;
  node: string;
  vmid: number;
  guestType: string;
  guestName: string;
  onClose?: () => void;
}

export const NoVncViewer: React.FC<NoVncViewerProps> = ({
  connectionId,
  node,
  vmid,
  guestType,
  guestName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    connectVnc();
    return () => {
      disconnectVnc();
    };
  }, [connectionId, node, vmid, guestType]);

  const disconnectVnc = () => {
    if (rfbRef.current) {
      try {
        rfbRef.current.disconnect();
      } catch (e) {
        console.warn('VNC disconnect error:', e);
      }
      rfbRef.current = null;
    }
  };

  const connectVnc = async () => {
    disconnectVnc();
    setStatus('connecting');
    setErrorMsg('');

    try {
      // 1. Get VNC ticket & port from Proxmox backend
      const ticketRes = await proxmoxApi.createVncTicket({
        connectionId,
        node,
        vmid,
        guestType,
      });

      const vncPort = ticketRes?.port ? Number(ticketRes.port) : 5900;
      const vncTicket = ticketRes?.ticket || '';

      const consoleType = guestType === 'lxc' ? 'lxc' : 'qemu';
      const wsUrl = `ws://127.0.0.1:14222/proxy/${connectionId}/api2/json/nodes/${node}/${consoleType}/${vmid}/vncwebsocket?port=${vncPort}&vncticket=${encodeURIComponent(vncTicket)}`;

      if (!containerRef.current) return;

      // Clean container DOM
      containerRef.current.innerHTML = '';

      // Initialize noVNC RFB client with Proxmox VNC Ticket as password
      const rfb = new RFB(containerRef.current, wsUrl, {
        credentials: { password: vncTicket },
      });

      rfb.scaleViewport = true;
      rfb.resizeSession = true;

      rfb.addEventListener('connect', () => {
        setStatus('connected');
      });

      rfb.addEventListener('disconnect', (e: any) => {
        setStatus('disconnected');
        if (e?.detail?.clean === false) {
          setErrorMsg('VNC connection dropped or host stopped.');
        }
      });

      rfb.addEventListener('securityfailure', (e: any) => {
        setStatus('error');
        setErrorMsg(e?.detail?.reason || 'Security authentication failure');
      });

      rfbRef.current = rfb;
    } catch (err) {
      console.error('Failed to initialize VNC:', err);
      setStatus('error');
      setErrorMsg((err as Error)?.message || 'Failed to initialize Proxmox VNC session');
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const sendCtrlAltDel = () => {
    if (rfbRef.current) {
      rfbRef.current.sendCtrlAltDel();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-sm">
            {guestName} (VM {vmid}) – {node}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
            status === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            status === 'connecting' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
            'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            {status.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={sendCtrlAltDel}
            disabled={status !== 'connected'}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded border border-slate-700 transition"
            title="Send Ctrl+Alt+Del"
          >
            Ctrl+Alt+Del
          </button>
          <button
            onClick={connectVnc}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
            title="Reconnect"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 bg-slate-950 flex items-center justify-center min-h-[480px]">
        {status === 'connecting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-300">Connecting to Proxmox VNC Display...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10 p-6 text-center">
            <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
            <h3 className="text-base font-semibold text-rose-400 mb-1">VNC Connection Failed</h3>
            <p className="text-xs text-slate-400 max-w-md mb-4">{errorMsg || 'Could not establish VNC WebSocket stream.'}</p>
            <button
              onClick={connectVnc}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold transition"
            >
              Try Reconnecting
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center overflow-auto"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};
