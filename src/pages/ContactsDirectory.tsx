import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';

export const ContactsDirectory: React.FC = () => {
  const { contacts } = useApp();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Unified Contacts & Counterparties"
        subtitle="Central CRM directory across customers, vendors, signatories, and shareholders."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.map((cnt) => (
          <div key={cnt.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
                {cnt.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-heading">{cnt.name}</h3>
                <div className="text-[11px] text-slate-400">{cnt.companyName || cnt.company || 'Enterprise Counterparty'}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(cnt.roles || [cnt.type || 'Contact']).map((r) => (
                <span key={r} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                  {r}
                </span>
              ))}
            </div>

            <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{cnt.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{cnt.phone}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
