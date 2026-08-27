import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

interface ToastNotificationsProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotifications: React.FC<ToastNotificationsProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-emerald-500/30 bg-emerald-950/80 text-emerald-100';
        let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;

        if (toast.type === 'warning') {
          borderClass = 'border-amber-500/30 bg-amber-950/80 text-amber-100';
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
        } else if (toast.type === 'error') {
          borderClass = 'border-rose-500/30 bg-rose-950/80 text-rose-100';
          icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
        } else if (toast.type === 'info') {
          borderClass = 'border-primary/30 bg-primary/20 text-primary-foreground';
          icon = <Info className="w-5 h-5 text-primary shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={clsx(
              'pointer-events-auto border rounded-xl p-3.5 shadow-xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-bottom duration-200',
              borderClass
            )}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm leading-snug">{toast.title}</div>
              {toast.message && (
                <div className="text-xs opacity-80 mt-0.5 leading-relaxed line-clamp-2">
                  {toast.message}
                </div>
              )}
              {toast.actionText && toast.onAction && (
                <button
                  onClick={toast.onAction}
                  className="mt-2 text-xs font-semibold underline underline-offset-2 hover:opacity-100 opacity-90"
                >
                  {toast.actionText}
                </button>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 hover:opacity-100 opacity-60 rounded-md transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
