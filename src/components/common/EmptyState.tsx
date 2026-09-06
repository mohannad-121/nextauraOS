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
    <div className="p-10 sm:p-14 text-center rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 my-4">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600 flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6 stroke-[1.75]" />
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
