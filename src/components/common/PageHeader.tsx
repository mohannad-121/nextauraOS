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
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8 pb-6 border-b border-slate-200/70 dark:border-slate-800">
      <div>
        {category && (
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1.5">
            {category}
          </div>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-[1.75rem] leading-tight font-semibold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
            {title}
          </h1>
          {badge && (
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0 sm:pb-0.5">{actions}</div>}
    </header>
  );
};
