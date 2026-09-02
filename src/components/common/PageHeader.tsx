import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, badge, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800/80">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-heading">
            {title}
          </h1>
          {badge && (
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-400 max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
