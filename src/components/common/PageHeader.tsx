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
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8 pb-6 border-b border-slate-200/70 dark:border-[#1F253D]">
      <div>
        {category && (
          <div className="text-xs font-semibold text-[#7568E8] dark:text-[#A499FA] uppercase tracking-wider mb-1.5">
            {category}
          </div>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900 dark:text-[#F4F6FF] font-heading">
            {title}
          </h1>
          {badge && (
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#7568E8]/10 text-[#7568E8] border border-[#7568E8]/25 dark:bg-[#7568E8]/15 dark:text-[#A499FA] dark:border-[#7568E8]/35">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-2 text-sm text-slate-600 dark:text-[#A3ABC5] max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0 sm:pb-0.5">{actions}</div>}
    </header>
  );
};
