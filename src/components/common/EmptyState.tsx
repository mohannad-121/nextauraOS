import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
        <Icon className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-100 font-heading">{title}</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
