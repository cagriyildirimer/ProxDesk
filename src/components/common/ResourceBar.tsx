import React from 'react';
import { clsx } from 'clsx';
import { formatBytes } from '../../lib/format';

interface ResourceBarProps {
  label: string;
  used: number;
  total: number;
  isBytes?: boolean;
  unit?: string;
  showPercentage?: boolean;
}

export const ResourceBar: React.FC<ResourceBarProps> = ({
  label,
  used,
  total,
  isBytes = false,
  unit = '',
  showPercentage = true,
}) => {
  const percentage = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;

  let barColor = 'bg-emerald-500';
  if (percentage >= 85) {
    barColor = 'bg-rose-500';
  } else if (percentage >= 70) {
    barColor = 'bg-amber-500';
  }

  const formattedUsed = isBytes ? formatBytes(used) : `${used} ${unit}`.trim();
  const formattedTotal = isBytes ? formatBytes(total) : `${total} ${unit}`.trim();

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <span>
          {formattedUsed} / {formattedTotal}{' '}
          {showPercentage && <span className="text-foreground font-semibold">({percentage.toFixed(1)}%)</span>}
        </span>
      </div>
      <div className="h-2 w-full bg-secondary/80 rounded-full overflow-hidden">
        <div
          className={clsx('h-full transition-all duration-500 rounded-full', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
