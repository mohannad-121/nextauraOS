import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Currency } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface StatCardProps {
  title: string;
  value: string | number;
  isCurrency?: boolean;
  currency?: Currency;
  change?: number; // e.g. +12.5 or -3.2
  comparisonText?: string;
  icon?: LucideIcon | React.ReactNode | any;
  accentColor?: 'cyan' | 'azure' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'teal' | 'pink' | 'purple' | 'yellow' | 'blue' | 'slate' | string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  isCurrency = false,
  currency = 'USD',
  change,
  comparisonText = 'vs last month',
  icon: Icon,
  accentColor = 'indigo',
  onClick,
}) => {
  const formattedValue = isCurrency && typeof value === 'number' ? formatCurrency(value, currency) : value;

  const colorKey = accentColor === 'blue' ? 'azure' : accentColor === 'slate' ? 'indigo' : accentColor;

  const accentStyles: Record<string, string> = {
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    azure: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    teal: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
    pink: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    yellow: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  };

  const styleClass = accentStyles[colorKey] || accentStyles.indigo;

  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) return Icon;
    if (typeof Icon === 'function' || typeof Icon === 'object') {
      const Component = Icon as LucideIcon;
      return <Component className="w-4 h-4" />;
    }
    return null;
  };

  return (
    <article
      onClick={onClick}
      className={`min-h-[108px] p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm dark:hover:border-slate-700' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 font-sans">{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded-lg border shrink-0 ${styleClass}`}>
            {renderIcon()}
          </div>
        )}
      </div>

      <div className="mt-2 space-y-0.5">
        <div className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight font-heading tabular-nums">
          {formattedValue}
        </div>

        {(change !== undefined || comparisonText) && (
          <div className="flex items-center gap-1.5 text-xs pt-0.5">
            {change !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  change >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(change)}%
              </span>
            )}
            {comparisonText && <span className="text-slate-400 dark:text-slate-500 text-[11px]">{comparisonText}</span>}
          </div>
        )}
      </div>
    </article>
  );
};
