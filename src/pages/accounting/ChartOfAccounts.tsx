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
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Chart of Accounts (COA)"
        subtitle="Master ledger hierarchy structure, account coding, balances & classification."
      />

      {/* Segmented Category Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 dark:border-[#1F253D] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-[#7568E8] text-white shadow-[0_0_12px_rgba(117,104,232,0.35)]'
              : 'text-slate-600 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF] hover:bg-slate-100 dark:hover:bg-[#161B30]'
          }`}
        >
          All Accounts ({accounts.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-[#7568E8] text-white shadow-[0_0_12px_rgba(117,104,232,0.35)]'
                : 'text-slate-600 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF] hover:bg-slate-100 dark:hover:bg-[#161B30]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50/70 dark:bg-[#101426] text-[11px] font-semibold text-slate-500 dark:text-[#A3ABC5] border-b border-slate-200/80 dark:border-[#1F253D]">
              <tr>
                <th className="p-3.5 text-start">Code</th>
                <th className="p-3.5 text-start">Account Name</th>
                <th className="p-3.5 text-start">Category</th>
                <th className="p-3.5 text-start">Type</th>
                <th className="p-3.5 text-end">Current Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F253D] font-medium">
              {filteredAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/50 dark:hover:bg-[#101426]/50 transition-colors">
                  <td className="p-3.5 font-mono font-semibold text-[#7568E8] dark:text-[#A499FA]">{acc.code}</td>
                  <td className="p-3.5 font-semibold text-slate-900 dark:text-[#F4F6FF]">{acc.name}</td>
                  <td className="p-3.5 text-slate-600 dark:text-[#A3ABC5]">{acc.category}</td>
                  <td className="p-3.5 text-slate-500 dark:text-[#6B7694]">{acc.type}</td>
                  <td className="p-3.5 text-end font-bold text-slate-900 dark:text-[#F4F6FF] font-mono">
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
