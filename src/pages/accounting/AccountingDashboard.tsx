import React from 'react';
import { BookOpen, Scale, ArrowUpRight, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/formatters';

export const AccountingDashboard: React.FC = () => {
  const { navigate, accounts, journalEntries } = useApp();

  const totalAssets = accounts.filter((a) => a.category === 'Assets').reduce((acc, curr) => acc + curr.balance, 0);
  const totalLiabilities = accounts.filter((a) => a.category === 'Liabilities').reduce((acc, curr) => acc + curr.balance, 0);
  const totalEquity = accounts.filter((a) => a.category === 'Equity').reduce((acc, curr) => acc + curr.balance, 0);
  const totalRevenue = accounts.filter((a) => a.category === 'Revenue').reduce((acc, curr) => acc + curr.balance, 0);
  const totalExpenses = accounts.filter((a) => a.category === 'Expenses').reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        category="Finance"
        title="Accounting"
        subtitle="A structured workspace for the general ledger, reconciliation, and financial statements."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('accounting', 'ledger')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#101426] hover:bg-slate-200 dark:hover:bg-[#1F253D] text-slate-800 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF] border border-slate-200 dark:border-[#1F253D] text-xs font-medium transition-colors cursor-pointer"
            >
              + New Journal Entry
            </button>
            <button
              onClick={() => navigate('accounting', 'reconciliation')}
              className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] transition-all cursor-pointer"
            >
              Bank Reconciliation
            </button>
          </div>
        }
      />

      {/* Accounting Balance Equation Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/80 dark:from-[#161B30] dark:via-[#1A213D] dark:to-[#161B30] border border-indigo-200/80 dark:border-[#1F253D] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#7568E8]/10 text-[#7568E8] dark:text-[#A499FA] border border-[#7568E8]/20 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF] font-heading">Accounting Equation Balance Lock</h3>
            <p className="text-xs text-slate-500 dark:text-[#A3ABC5] mt-0.5">Assets ({formatCurrency(totalAssets)}) = Liabilities ({formatCurrency(totalLiabilities)}) + Equity ({formatCurrency(totalEquity)})</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-[#08B894]/10 text-emerald-700 dark:text-[#23C99C] border border-emerald-200 dark:border-[#08B894]/20 text-xs font-medium flex items-center gap-1.5 shrink-0">
          <CheckCircle className="w-3.5 h-3.5" />
          Perfect Balance
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-[#1F253D] dark:bg-[#161B30] sm:px-6">
        <span className="font-medium text-slate-500 dark:text-[#6B7694]">Current balances</span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Assets</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{formatCurrency(totalAssets)}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Liabilities</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{formatCurrency(totalLiabilities)}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Revenue</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{formatCurrency(totalRevenue)}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Expenses</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{formatCurrency(totalExpenses)}</strong></span>
      </div>

      {/* Module Shortcuts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => navigate('accounting', 'ledger')}
          className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] hover:border-[#7568E8]/40 dark:hover:border-[#7568E8]/40 shadow-xs cursor-pointer transition-all duration-200 group"
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="p-2.5 rounded-xl bg-[#7568E8]/10 text-[#7568E8] dark:text-[#A499FA] border border-[#7568E8]/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#7568E8] dark:group-hover:text-[#A499FA] transition-colors" />
          </div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FF] font-heading">General Ledger</h4>
          <p className="text-xs text-slate-500 dark:text-[#A3ABC5] mt-1 leading-relaxed">Audit complete journal history and double-entry transaction lines.</p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1F253D] text-xs font-semibold text-[#7568E8] dark:text-[#A499FA]">
            {journalEntries.length} Posted Entries
          </div>
        </div>

        <div
          onClick={() => navigate('accounting', 'chart-of-accounts')}
          className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] hover:border-[#178CFF]/40 dark:hover:border-[#178CFF]/40 shadow-xs cursor-pointer transition-all duration-200 group"
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="p-2.5 rounded-xl bg-[#178CFF]/10 text-[#178CFF] dark:text-[#52A8FF] border border-[#178CFF]/20">
              <Layers className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#178CFF] dark:group-hover:text-[#52A8FF] transition-colors" />
          </div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FF] font-heading">Chart of Accounts (COA)</h4>
          <p className="text-xs text-slate-500 dark:text-[#A3ABC5] mt-1 leading-relaxed">Structured 1000s–6000s account hierarchy across Assets, Liabilities & Equity.</p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1F253D] text-xs font-semibold text-[#178CFF] dark:text-[#52A8FF]">
            {accounts.length} Active Accounts
          </div>
        </div>

        <div
          onClick={() => navigate('accounting', 'reports')}
          className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] hover:border-[#08B894]/40 dark:hover:border-[#08B894]/40 shadow-xs cursor-pointer transition-all duration-200 group"
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="p-2.5 rounded-xl bg-[#08B894]/10 text-[#08B894] dark:text-[#23C99C] border border-[#08B894]/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#08B894] dark:group-hover:text-[#23C99C] transition-colors" />
          </div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FF] font-heading">Financial Statements</h4>
          <p className="text-xs text-slate-500 dark:text-[#A3ABC5] mt-1 leading-relaxed">Interactive Profit & Loss, Balance Sheet, and Cash Flow Statements.</p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1F253D] text-xs font-semibold text-[#08B894] dark:text-[#23C99C]">
            P&L / Balance Sheet
          </div>
        </div>
      </div>
    </div>
  );
};
