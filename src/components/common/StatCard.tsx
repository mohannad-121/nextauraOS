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
  icon?: LucideIcon;
  accentColor?: 'cyan' | 'azure' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'teal' | 'pink' | 'purple' | 'yellow';
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
  accentColor = 'cyan',
  onClick,
}) => {
  const formattedValue = isCurrency && typeof value === 'number' ? formatCurrency(value, currency) : value;

  const accentStyles = {
    cyan: 'border-cyan-500/20 text-cyan-400 bg-cyan-500/10 hover:border-cyan-500/40',
    azure: 'border-blue-500/20 text-blue-400 bg-blue-500/10 hover:border-blue-500/40',
    indigo: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/10 hover:border-indigo-500/40',
    emerald: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10 hover:border-emerald-500/40',
    amber: 'border-amber-500/20 text-amber-400 bg-amber-500/10 hover:border-amber-500/40',
    rose: 'border-rose-500/20 text-rose-400 bg-rose-500/10 hover:border-rose-500/40',
    teal: 'border-teal-500/20 text-teal-400 bg-teal-500/10 hover:border-teal-500/40',
    pink: 'border-pink-500/20 text-pink-400 bg-pink-500/10 hover:border-pink-500/40',
    purple: 'border-purple-500/20 text-purple-400 bg-purple-500/10 hover:border-purple-500/40',
    yellow: 'border-yellow-500/20 text-yellow-400 bg-yellow-500/10 hover:border-yellow-500/40',
  };

  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 font-sans uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-2xl border ${accentStyles[accentColor]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="text-2xl font-black text-slate-100 tracking-tight font-heading">
          {formattedValue}
        </div>

        {(change !== undefined || comparisonText) && (
          <div className="flex items-center gap-1.5 text-xs">
            {change !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 font-bold ${
                  change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(change)}%
              </span>
            )}
            <span className="text-slate-500 text-[11px]">{comparisonText}</span>
          </div>
        )}
      </div>
    </div>
  );
};
