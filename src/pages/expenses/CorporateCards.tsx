import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';

export const CorporateCards: React.FC = () => {
  const { corporateCards } = useApp();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Corporate Cards & Limits"
        subtitle="Manage virtual and physical employee cards, monthly spend caps, and instant freeze controls."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {corporateCards.map((card) => {
          const spendPercent = Math.round((card.currentSpend / card.monthlyLimit) * 100);
          return (
            <div
              key={card.id}
              className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase">
                  {card.type} Card
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">{card.expiry}</span>
              </div>

              <div className="space-y-1">
                <div className="text-lg font-mono font-bold tracking-widest text-slate-100">{card.cardNumber}</div>
                <div className="text-xs font-semibold text-slate-300">{card.cardHolder}</div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Monthly Spend</span>
                  <span className="text-slate-100">${card.currentSpend.toLocaleString()} / ${card.monthlyLimit.toLocaleString()}</span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-300"
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
