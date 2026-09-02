import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import type { AccountCategory } from '../../types';

export const ChartOfAccounts: React.FC = () => {
  const { accounts } = useApp();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories: AccountCategory[] = ['Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses'];

  const filteredAccounts = accounts.filter(
    (a) => activeCategory === 'all' || a.category === activeCategory
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Chart of Accounts (COA)"
        subtitle="Master ledger hierarchy structure, account coding, balances & classification."
      />

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeCategory === 'all'
              ? 'bg-indigo-500 text-slate-950 shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Accounts ({accounts.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeCategory === cat
                ? 'bg-indigo-500 text-slate-950 shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 text-start">Code</th>
                <th className="p-4 text-start">Account Name</th>
                <th className="p-4 text-start">Category</th>
                <th className="p-4 text-start">Type</th>
                <th className="p-4 text-end">Current Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-800/40">
                  <td className="p-4 font-mono font-bold text-indigo-400">{acc.code}</td>
                  <td className="p-4 font-semibold text-slate-100">{acc.name}</td>
                  <td className="p-4 text-slate-300">{acc.category}</td>
                  <td className="p-4 text-slate-400">{acc.type}</td>
                  <td className="p-4 text-end font-bold text-slate-100 font-mono">
                    ${acc.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
