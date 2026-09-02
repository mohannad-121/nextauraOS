import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';

export const GeneralLedger: React.FC = () => {
  const { navigate, journalEntries } = useApp();
  const [search, setSearch] = useState('');

  const filteredEntries = journalEntries.filter(
    (je) =>
      je.entryNumber.toLowerCase().includes(search.toLowerCase()) ||
      je.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="General Ledger & Double-Entry Records"
        subtitle="Immutable audit record of all financial debit/credit postings."
        actions={
          <button
            onClick={() => navigate('accounting', 'journal-new')}
            className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Journal Entry
          </button>
        }
      />

      {/* Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search JE number, description..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-6">
        {filteredEntries.map((je) => (
          <div key={je.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div>
                <span className="font-mono font-bold text-indigo-400 text-sm">{je.entryNumber}</span>
                <h4 className="text-sm font-bold text-slate-100 font-heading">{je.description}</h4>
                <div className="text-[10px] text-slate-400">Ref: {je.reference} • Posted by {je.postedBy} on {je.date}</div>
              </div>
              <StatusBadge status={je.status} />
            </div>

            {/* Lines Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400">
                  <tr>
                    <th className="p-3 text-start">Account Code & Name</th>
                    <th className="p-3 text-start">Line Details</th>
                    <th className="p-3 text-end">Debit ($)</th>
                    <th className="p-3 text-end">Credit ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {je.lines.map((ln) => (
                    <tr key={ln.id}>
                      <td className="p-3 font-semibold text-slate-200 font-sans">
                        <span className="text-indigo-400 font-mono">{ln.accountCode}</span> — {ln.accountName}
                      </td>
                      <td className="p-3 text-slate-400 font-sans text-[11px]">{ln.description}</td>
                      <td className="p-3 text-end font-bold text-slate-100">
                        {ln.debit > 0 ? `$${ln.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-end font-bold text-slate-100">
                        {ln.credit > 0 ? `$${ln.credit.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
