import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="p-10 sm:p-14 text-center rounded-2xl bg-white dark:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700 space-y-4 my-4">
      <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 flex items-center justify-center mx-auto">
        <Icon className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
      </div>
      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
      {action ? (
        <div className="pt-2 flex items-center justify-center gap-3">{action}</div>
      ) : (actionLabel || secondaryActionLabel) && (
        <div className="pt-2 flex items-center justify-center gap-3">
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors"
            >
              {secondaryActionLabel}
            </button>
          )}
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
