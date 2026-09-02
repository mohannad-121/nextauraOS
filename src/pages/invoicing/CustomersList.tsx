import React from 'react';
import { Mail, Phone, Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';

export const CustomersList: React.FC = () => {
  const { customers } = useApp();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Customer Directory"
        subtitle="Manage customer relationships, lifetime revenue, and outstanding receivables."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((c) => (
          <div
            key={c.id}
            className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 hover:border-slate-700 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-sm">
                {c.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-heading">{c.name}</h3>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  {c.company}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{c.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{c.phone}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Lifetime Revenue</span>
                <span className="font-bold text-slate-100">${c.lifetimeRevenue.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Outstanding</span>
                <span className={`font-bold ${c.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  ${c.outstandingBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
