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
  sparkline?: number[];
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
  sparkline,
  onClick,
}) => {
  const formattedValue = isCurrency && typeof value === 'number' ? formatCurrency(value, currency) : value;

  const colorKey = accentColor === 'blue' ? 'azure' : accentColor === 'slate' ? 'indigo' : accentColor;

  const accentStyles: Record<string, string> = {
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    azure: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-[#178CFF]/15 dark:text-[#60B2FF] dark:border-[#178CFF]/30',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-[#7568E8]/15 dark:text-[#A499FA] dark:border-[#7568E8]/30',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[#08B894]/15 dark:text-[#23C99C] dark:border-[#08B894]/30',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    teal: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-[#08B894]/15 dark:text-[#23C99C] dark:border-[#08B894]/30',
    pink: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-[#7568E8]/15 dark:text-[#A499FA] dark:border-[#7568E8]/30',
    yellow: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
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
      className={`min-h-[118px] p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-200 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-md dark:hover:border-[#2D3555] dark:hover:bg-[#1A2038]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-[#747E9B] uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded-lg border shrink-0 ${styleClass}`}>
            {renderIcon()}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="text-2xl font-bold text-slate-900 dark:text-[#F4F6FF] tracking-tight font-heading tabular-nums">
            {formattedValue}
          </div>

          {(change !== undefined || comparisonText) && (
            <div className="flex items-center gap-1.5 text-xs pt-0.5">
              {change !== undefined && (
                <span
                  className={`inline-flex items-center gap-0.5 font-semibold text-[11px] px-1.5 py-0.5 rounded-md ${
                    change >= 0
                      ? 'text-emerald-700 bg-emerald-50 dark:text-[#23C99C] dark:bg-[#08B894]/15'
                      : 'text-rose-700 bg-rose-50 dark:text-[#F43F5E] dark:bg-[#F43F5E]/15'
                  }`}
                >
                  {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(change)}%
                </span>
              )}
              {comparisonText && <span className="text-slate-400 dark:text-[#6B7694] text-[11px]">{comparisonText}</span>}
            </div>
          )}
        </div>

        {sparkline && sparkline.length > 0 && (
          <div className="flex items-end gap-1 h-9 shrink-0 pb-0.5">
            {sparkline.map((val, idx) => {
              const maxVal = Math.max(...sparkline, 1);
              const heightPct = Math.max(15, Math.min(100, Math.round((val / maxVal) * 100)));
              const isHighlight = idx === sparkline.length - 2 || idx === sparkline.length - 1;
              return (
                <div
                  key={idx}
                  className="w-1.5 rounded-full transition-all duration-300"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: isHighlight ? '#7568E8' : '#2A3150',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
};
