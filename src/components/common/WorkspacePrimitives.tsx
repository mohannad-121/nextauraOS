import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Surface: React.FC<SurfaceProps> = ({
  interactive = false,
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  const paddingClass = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' }[padding];

  return (
    <div
      className={`surface-card rounded-2xl ${interactive ? 'surface-card-hover' : ''} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, icon: Icon, action, className = '' }) => (
  <div className={`flex items-end justify-between gap-4 ${className}`}>
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/50 dark:bg-[#7568E8]/15 dark:text-[#A499FA] dark:border-[#7568E8]/30">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FF]">{title}</h2>
      </div>
      {description && <p className={`${Icon ? 'ms-10' : ''} mt-1 text-sm text-slate-500 dark:text-[#A3ABC5]`}>{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: 'sm' | 'md' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({ rounded = 'md', className = '', ...props }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse bg-slate-200/70 dark:bg-[#1E243E] ${
      rounded === 'full' ? 'rounded-full' : rounded === 'sm' ? 'rounded-lg' : 'rounded-xl'
    } ${className}`}
    {...props}
  />
);
