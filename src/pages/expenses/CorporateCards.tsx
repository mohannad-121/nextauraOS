import React from 'react';
import { CreditCard } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/formatters';

export const CorporateCards: React.FC = () => {
  const { corporateCards } = useApp();

  return (
    <div className="space-y-6">
      <PageHeader
        category="Finance"
        title="Corporate Cards & Limits"
        subtitle="Manage virtual and physical employee cards, monthly spend caps, and instant freeze controls."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {corporateCards.map((card) => {
          const spendPercent = Math.min(100, Math.round((card.currentSpend / card.monthlyLimit) * 100));
          return (
            <div
              key={card.id}
              className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs space-y-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-[#7568E8]/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-[#7568E8]/10 text-[#7568E8] dark:text-[#A499FA] border border-[#7568E8]/20">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-[#1F253D] text-slate-700 dark:text-[#A3ABC5] text-[10px] font-semibold uppercase tracking-wider">
                    {card.type}
                  </span>
                </div>
                <span className="text-xs font-mono font-medium text-slate-500 dark:text-[#6B7694]">Exp {card.expiry}</span>
              </div>

              <div className="space-y-1">
                <div className="text-base font-mono font-semibold tracking-widest text-slate-900 dark:text-[#F4F6FF]">{card.cardNumber}</div>
                <div className="text-xs font-medium text-slate-600 dark:text-[#A3ABC5]">{card.cardHolder}</div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-[#1F253D]">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500 dark:text-[#A3ABC5]">Monthly Limit</span>
                  <span className="text-slate-900 dark:text-[#F4F6FF] tabular-nums">
                    {formatCurrency(card.currentSpend)} / <span className="text-slate-500 dark:text-[#6B7694]">{formatCurrency(card.monthlyLimit)}</span>
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#101426] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      spendPercent > 90 ? 'bg-rose-500' : spendPercent > 75 ? 'bg-amber-500' : 'bg-[#7568E8]'
                    }`}
                    style={{ width: `${spendPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

