import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  destructive?: boolean;
  requiresNameMatch?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  destructive = true,
  requiresNameMatch,
}) => {
  const [typedName, setTypedName] = useState('');

  if (!isOpen) return null;

  const isMatchValid = !requiresNameMatch || typedName.trim() === requiresNameMatch.trim();

  const handleConfirm = () => {
    if (isMatchValid) {
      onConfirm();
      setTypedName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className={clsx('p-2 rounded-lg', destructive ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400')}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

          {requiresNameMatch && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-foreground">
                To confirm, type <span className="font-bold text-rose-400">{requiresNameMatch}</span> below:
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={requiresNameMatch}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-secondary/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isMatchValid}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all',
              destructive
                ? 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-600/40 disabled:cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
