import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';

export const FinancialReports: React.FC = () => {
  const { currentOrg } = useApp();
  const [reportType, setReportType] = useState<'pnl' | 'balance-sheet' | 'cash-flow'>('pnl');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Financial Statements & Reports"
        subtitle="Generate Profit & Loss (P&L), Balance Sheet, and Cash Flow Statements."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
          >
            Export Statement PDF
          </Button>
        }
      />

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        {[
          { id: 'pnl', label: 'Profit & Loss (P&L)' },
          { id: 'balance-sheet', label: 'Balance Sheet' },
          { id: 'cash-flow', label: 'Cash Flow Statement' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              reportType === tab.id
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Document Box */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 text-xs text-slate-600 dark:text-slate-300 font-sans">
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {reportType === 'pnl'
                ? 'Profit & Loss Statement (Income Statement)'
                : reportType === 'balance-sheet'
                ? 'Balance Sheet'
                : 'Statement of Cash Flows'}
            </h2>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">{currentOrg.legalName}</div>
            <div className="text-[11px] text-slate-500 font-mono">Period: January 1, 2026 – August 31, 2026</div>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
            GAAP & IFRS COMPLIANT
          </span>
        </div>

        {reportType === 'pnl' && (
          <div className="space-y-6">
            {/* Revenue */}
            <div className="space-y-2">
              <h4 className="font-semibold uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1 text-[11px]">Operating Revenue</h4>
              <div className="flex justify-between py-1">
                <span>SaaS Subscription Revenue</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">$74,500</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Professional Services Revenue</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">$18,340</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-slate-100 border-t border-slate-100 dark:border-slate-800 text-sm">
                <span>Total Operating Revenue</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">$92,840</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-2">
              <h4 className="font-semibold uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1 text-[11px]">Operating Expenses</h4>
              <div className="flex justify-between py-1">
                <span>Cloud Infrastructure (AWS/Vercel)</span>
                <span className="font-mono">$12,400</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Engineering & Staff Salaries</span>
                <span className="font-mono">$24,800</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Software Subscriptions & Tools</span>
                <span className="font-mono">$4,110</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Marketing & Ad Spend</span>
                <span className="font-mono">$6,000</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-slate-100 border-t border-slate-100 dark:border-slate-800 text-sm">
                <span>Total Operating Expenses</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono">$47,310</span>
              </div>
            </div>

            {/* Net Income */}
            <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex justify-between items-center text-sm font-bold">
              <span className="text-slate-900 dark:text-slate-100">Net Operating Income (EBITDA)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">$45,530</span>
            </div>
          </div>
        )}

        {reportType === 'balance-sheet' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-semibold uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1 text-[11px]">Assets</h4>
              <div className="flex justify-between py-1">
                <span>Cash & Bank Balances</span>
                <span className="font-mono font-semibold">$184,620</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Accounts Receivable (AR)</span>
                <span className="font-mono">$31,420</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-slate-100 border-t border-slate-100 dark:border-slate-800 text-sm">
                <span>Total Assets</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">$216,040</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1 text-[11px]">Liabilities & Equity</h4>
              <div className="flex justify-between py-1">
                <span>Accounts Payable (AP)</span>
                <span className="font-mono">$14,280</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Common Stock Equity</span>
                <span className="font-mono">$100,000</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Retained Earnings</span>
                <span className="font-mono">$101,760</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-slate-900 dark:text-slate-100 border-t border-slate-100 dark:border-slate-800 text-sm">
                <span>Total Liabilities & Equity</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono">$216,040</span>
              </div>
            </div>
          </div>
        )}

        {reportType === 'cash-flow' && (
          <div className="space-y-4">
            <div className="flex justify-between py-1">
              <span>Cash Flow from Operating Activities</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">+$45,530</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Cash Flow from Investing Activities</span>
              <span className="font-mono text-slate-500">-$5,000</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Cash Flow from Financing Activities</span>
              <span className="font-mono text-slate-500">$0</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex justify-between text-sm font-bold">
              <span className="text-slate-900 dark:text-slate-100">Net Increase in Cash</span>
              <span className="text-blue-600 dark:text-blue-400 font-mono">+$40,530</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
