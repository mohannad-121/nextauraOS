import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  category?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, badge, category, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-5 border-b border-slate-200/80 dark:border-slate-800">
      <div>
        {category && (
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            {category}
          </div>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
            {title}
          </h1>
          {badge && (
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0 sm:pb-0.5">{actions}</div>}
    </div>
  );
};
