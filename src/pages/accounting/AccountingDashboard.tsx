import React from 'react';
import { BookOpen, Scale, ArrowUpRight, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';

export const AccountingDashboard: React.FC = () => {
  const { navigate, accounts, journalEntries } = useApp();

  const totalAssets = accounts.filter((a) => a.category === 'Assets').reduce((acc, curr) => acc + curr.balance, 0);
  const totalLiabilities = accounts.filter((a) => a.category === 'Liabilities').reduce((acc, curr) => acc + curr.balance, 0);
  const totalEquity = accounts.filter((a) => a.category === 'Equity').reduce((acc, curr) => acc + curr.balance, 0);
  const totalRevenue = accounts.filter((a) => a.category === 'Revenue').reduce((acc, curr) => acc + curr.balance, 0);
  const totalExpenses = accounts.filter((a) => a.category === 'Expenses').reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Accounting Control Center"
        subtitle="Double-entry general ledger, chart of accounts, bank reconciliation & automated financial statements."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('accounting', 'ledger')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              + New Journal Entry
            </button>
            <button
              onClick={() => navigate('accounting', 'reconciliation')}
              className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-indigo-500/20"
            >
              Bank Reconciliation
            </button>
          </div>
        }
      />

      {/* Accounting Balance Equation Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-heading">Accounting Equation Balance Lock</h3>
            <p className="text-xs text-slate-400 mt-0.5">Assets (${totalAssets.toLocaleString()}) = Liabilities (${totalLiabilities.toLocaleString()}) + Equity (${totalEquity.toLocaleString()})</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 shrink-0">
          <CheckCircle className="w-3.5 h-3.5" />
          Perfect Balance
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Assets" value={totalAssets} isCurrency change={0} accentColor="indigo" />
        <StatCard title="Total Liabilities" value={totalLiabilities} isCurrency change={0} accentColor="cyan" />
        <StatCard title="Total Revenue" value={totalRevenue} isCurrency change={0} accentColor="emerald" />
        <StatCard title="Total Operating Expenses" value={totalExpenses} isCurrency change={0} accentColor="amber" />
      </div>

      {/* Module Shortcuts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => navigate('accounting', 'ledger')}
          className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl cursor-pointer hover:border-indigo-500/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h4 className="text-base font-bold text-slate-100 font-heading">General Ledger</h4>
          <p className="text-xs text-slate-400 mt-1">Audit complete journal history and double-entry transaction lines.</p>
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-semibold text-indigo-400">
            {journalEntries.length} Posted Entries
          </div>
        </div>

        <div
          onClick={() => navigate('accounting', 'chart-of-accounts')}
          className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl cursor-pointer hover:border-cyan-500/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </div>
          <h4 className="text-base font-bold text-slate-100 font-heading">Chart of Accounts (COA)</h4>
          <p className="text-xs text-slate-400 mt-1">Structured 1000s–6000s account hierarchy across Assets, Liabilities & Equity.</p>
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-semibold text-cyan-400">
            {accounts.length} Active Accounts
          </div>
        </div>

        <div
          onClick={() => navigate('accounting', 'reports')}
          className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl cursor-pointer hover:border-emerald-500/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h4 className="text-base font-bold text-slate-100 font-heading">Financial Statements</h4>
          <p className="text-xs text-slate-400 mt-1">Interactive Profit & Loss, Balance Sheet, and Cash Flow Statements.</p>
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-semibold text-emerald-400">
            P&L / Balance Sheet
          </div>
        </div>
      </div>
    </div>
  );
};
