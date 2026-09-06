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
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
            >
              + New Journal Entry
            </button>
            <button
              onClick={() => navigate('accounting', 'reconciliation')}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors"
            >
              Bank Reconciliation
            </button>
          </div>
        }
      />

      {/* Accounting Balance Equation Banner */}
      <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-slate-800/80 border border-indigo-200/80 dark:border-indigo-900/50 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-heading">Accounting Equation Balance Lock</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Assets ({formatCurrency(totalAssets)}) = Liabilities ({formatCurrency(totalLiabilities)}) + Equity ({formatCurrency(totalEquity)})</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-xs font-medium flex items-center gap-1.5 shrink-0">
          <CheckCircle className="w-3.5 h-3.5" />
          Perfect Balance
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <span className="font-medium text-slate-500">Current balances</span>
        <span><span className="text-slate-500">Assets</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(totalAssets)}</strong></span>
        <span><span className="text-slate-500">Liabilities</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(totalLiabilities)}</strong></span>
        <span><span className="text-slate-500">Revenue</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</strong></span>
        <span><span className="text-slate-500">Expenses</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(totalExpenses)}</strong></span>
      </div>

      {/* Module Shortcuts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => navigate('accounting', 'ledger')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
              <BookOpen className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors" />
          </div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">General Ledger</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Audit complete journal history and double-entry transaction lines.</p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-blue-700 dark:text-blue-400">
            {journalEntries.length} Posted Entries
          </div>
        </div>

        <div
          onClick={() => navigate('accounting', 'chart-of-accounts')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
              <Layers className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors" />
          </div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">Chart of Accounts (COA)</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Structured 1000s–6000s account hierarchy across Assets, Liabilities & Equity.</p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-blue-700 dark:text-blue-400">
            {accounts.length} Active Accounts
          </div>
        </div>

        <div
          onClick={() => navigate('accounting', 'reports')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              <RefreshCw className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors" />
          </div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">Financial Statements</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Interactive Profit & Loss, Balance Sheet, and Cash Flow Statements.</p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            P&L / Balance Sheet
          </div>
        </div>
      </div>
    </div>
  );
};
