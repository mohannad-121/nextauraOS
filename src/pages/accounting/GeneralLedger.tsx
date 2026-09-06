import React, { useState } from 'react';
import { Plus, Search, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';

export const GeneralLedger: React.FC = () => {
  const { navigate, journalEntries } = useApp();
  const [search, setSearch] = useState('');

  const filteredEntries = journalEntries.filter(
    (je) =>
      je.entryNumber.toLowerCase().includes(search.toLowerCase()) ||
      je.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="General Ledger & Double-Entry Records"
        subtitle="Immutable audit record of all financial debit/credit postings."
        actions={
          <Button
            onClick={() => navigate('accounting', 'journal-new')}
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
          >
            New Journal Entry
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search JE number, description..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Journal Entries Found"
            description="No matching journal entries recorded in General Ledger."
            actionLabel="New Journal Entry"
            onAction={() => navigate('accounting', 'journal-new')}
          />
        ) : (
          filteredEntries.map((je) => (
            <div key={je.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                <div>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-xs">{je.entryNumber}</span>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{je.description}</h4>
                  <div className="text-[11px] text-slate-500">Ref: {je.reference} • Posted by {je.postedBy} on {je.date}</div>
                </div>
                <StatusBadge status={je.status} />
              </div>

              {/* Lines Table */}
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="p-3 text-start">Account Code & Name</th>
                      <th className="p-3 text-start">Line Details</th>
                      <th className="p-3 text-end">Debit ($)</th>
                      <th className="p-3 text-end">Credit ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {je.lines.map((ln) => (
                      <tr key={ln.id}>
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100 font-sans">
                          <span className="text-blue-600 dark:text-blue-400 font-mono">{ln.accountCode}</span> — {ln.accountName}
                        </td>
                        <td className="p-3 text-slate-500 font-sans text-[11px]">{ln.description}</td>
                        <td className="p-3 text-end font-semibold text-slate-900 dark:text-slate-100">
                          {ln.debit > 0 ? `$${ln.debit.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-3 text-end font-semibold text-slate-900 dark:text-slate-100">
                          {ln.credit > 0 ? `$${ln.credit.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
