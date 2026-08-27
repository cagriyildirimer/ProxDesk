import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { NoVncViewer } from './components/console/NoVncViewer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 4000,
      refetchOnWindowFocus: true,
    },
  },
});

export const App: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isConsoleWindow = urlParams.get('window') === 'console';

  if (isConsoleWindow) {
    const connectionId = urlParams.get('connection_id') || '';
    const host = urlParams.get('host') || '';
    const port = Number(urlParams.get('port') || 8006);
    const node = urlParams.get('node') || '';
    const vmid = Number(urlParams.get('vmid') || 0);
    const guestType = urlParams.get('guest_type') || 'qemu';
    const guestName = urlParams.get('guest_name') || `VM ${vmid}`;

    return (
      <div className="w-screen h-screen bg-slate-950 p-2 overflow-hidden">
        <NoVncViewer
          connectionId={connectionId}
          host={host}
          port={port}
          node={node}
          vmid={vmid}
          guestType={guestType}
          guestName={guestName}
        />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  );
};

export default App;
