import React from 'react';
import { clsx } from 'clsx';
import { GuestStatus } from '../../types/proxmox';

interface StatusBadgeProps {
  status: GuestStatus | string;
  showText?: boolean;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showText = true,
  size = 'md',
}) => {
  const normalized = status.toLowerCase();

  let colorClasses = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  let dotClasses = 'bg-gray-400';
  let label = 'Unknown';

  if (normalized === 'running' || normalized === 'online' || normalized === 'active') {
    colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    dotClasses = 'bg-emerald-500 animate-pulse';
    label = 'Running';
  } else if (normalized === 'stopped' || normalized === 'offline' || normalized === 'inactive') {
    colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    dotClasses = 'bg-rose-500';
    label = 'Stopped';
  } else if (normalized === 'paused') {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    dotClasses = 'bg-amber-500';
    label = 'Paused';
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border px-2.5 py-0.5',
        colorClasses,
        size === 'sm' ? 'text-xs py-0 px-2' : 'text-xs'
      )}
    >
      <span className={clsx('rounded-full shrink-0', dotClasses, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {showText && <span>{label}</span>}
    </span>
  );
};
