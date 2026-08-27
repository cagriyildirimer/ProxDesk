import React from 'react';
import { Server } from 'lucide-react';
import { NodeSummary, ProxmoxVersion } from '../../types/proxmox';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ResourceBar } from '../../components/common/ResourceBar';
import { formatBytes, formatUptime } from '../../lib/format';

interface NodesViewProps {
  nodes: NodeSummary[];
  version: ProxmoxVersion | null;
}

export const NodesView: React.FC<NodesViewProps> = ({
  nodes,
  version,
}) => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Proxmox Nodes</h1>
          <p className="text-xs text-muted-foreground">
            {version ? `Proxmox VE ${version.version}.${version.release}` : 'Node Management'}
          </p>
        </div>
      </div>

      {/* Node List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {nodes.map((node) => (
          <div
            key={node.node}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{node.node}</h3>
                  <p className="text-xs text-muted-foreground">
                    Level: {node.level || 'community'} · Cores: {node.maxcpu || 'N/A'}
                  </p>
                </div>
              </div>
              <StatusBadge status={node.status} />
            </div>

            <div className="space-y-3 pt-2">
              <ResourceBar
                label="CPU Utilization"
                used={(node.cpu || 0) * 100}
                total={100}
                showPercentage
              />
              <ResourceBar
                label="RAM Allocation"
                used={node.mem || 0}
                total={node.maxmem || 1}
                isBytes
                showPercentage
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50 text-xs">
              <div className="bg-secondary/30 p-3 rounded-xl space-y-1">
                <span className="text-muted-foreground font-medium">Uptime</span>
                <div className="font-bold text-foreground">{formatUptime(node.uptime || 0)}</div>
              </div>
              <div className="bg-secondary/30 p-3 rounded-xl space-y-1">
                <span className="text-muted-foreground font-medium">Total Memory</span>
                <div className="font-bold text-foreground">{formatBytes(node.maxmem || 0)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
