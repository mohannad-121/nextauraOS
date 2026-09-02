import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';

export const FinancialReports: React.FC = () => {
  const { currentOrg } = useApp();
  const [reportType, setReportType] = useState<'pnl' | 'balance-sheet' | 'cash-flow'>('pnl');

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Financial Statements & Reports"
        subtitle="Generate Profit & Loss (P&L), Balance Sheet, and Cash Flow Statements."
        actions={
          <button className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export Statement PDF
          </button>
        }
      />

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'pnl', label: 'Profit & Loss (P&L)' },
          { id: 'balance-sheet', label: 'Balance Sheet' },
          { id: 'cash-flow', label: 'Cash Flow Statement' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === tab.id
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Document Box */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 text-xs text-slate-300 font-sans">
        <div className="flex justify-between items-start border-b border-slate-800 pb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100 font-heading">
              {reportType === 'pnl'
                ? 'Profit & Loss Statement (Income Statement)'
                : reportType === 'balance-sheet'
                ? 'Balance Sheet'
                : 'Statement of Cash Flows'}
            </h2>
            <div className="text-xs text-cyan-400 font-semibold mt-1">{currentOrg.legalName}</div>
            <div className="text-[10px] text-slate-500 font-mono">Period: January 1, 2026 – August 31, 2026</div>
          </div>
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold">
            GAAP & IFRS COMPLIANT
          </span>
        </div>

        {reportType === 'pnl' && (
          <div className="space-y-6">
            {/* Revenue */}
            <div className="space-y-2">
              <h4 className="font-bold uppercase text-slate-400 border-b border-slate-800 pb-1">Operating Revenue</h4>
              <div className="flex justify-between py-1">
                <span>SaaS Subscription Revenue</span>
                <span className="font-bold text-slate-100 font-mono">$74,500</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Professional Services Revenue</span>
                <span className="font-bold text-slate-100 font-mono">$18,340</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-slate-100 border-t border-slate-800 text-sm">
                <span>Total Operating Revenue</span>
                <span className="text-cyan-400 font-mono">$92,840</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-2">
              <h4 className="font-bold uppercase text-slate-400 border-b border-slate-800 pb-1">Operating Expenses</h4>
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
              <div className="flex justify-between py-2 font-bold text-slate-100 border-t border-slate-800 text-sm">
                <span>Total Operating Expenses</span>
                <span className="text-indigo-400 font-mono">$47,310</span>
              </div>
            </div>

            {/* Net Income */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center text-base font-black">
              <span className="text-slate-100 font-heading">Net Operating Income (EBITDA)</span>
              <span className="text-emerald-400 font-mono">$45,530</span>
            </div>
          </div>
        )}

        {reportType === 'balance-sheet' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-bold uppercase text-slate-400 border-b border-slate-800 pb-1">Assets</h4>
              <div className="flex justify-between py-1">
                <span>Cash & Bank Balances</span>
                <span className="font-mono font-bold">$184,620</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Accounts Receivable (AR)</span>
                <span className="font-mono">$31,420</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-slate-100 border-t border-slate-800 text-sm">
                <span>Total Assets</span>
                <span className="text-cyan-400 font-mono">$216,040</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold uppercase text-slate-400 border-b border-slate-800 pb-1">Liabilities & Equity</h4>
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
              <div className="flex justify-between py-2 font-bold text-slate-100 border-t border-slate-800 text-sm">
                <span>Total Liabilities & Equity</span>
                <span className="text-indigo-400 font-mono">$216,040</span>
              </div>
            </div>
          </div>
        )}

        {reportType === 'cash-flow' && (
          <div className="space-y-4">
            <div className="flex justify-between py-1">
              <span>Cash Flow from Operating Activities</span>
              <span className="font-mono text-emerald-400 font-bold">+$45,530</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Cash Flow from Investing Activities</span>
              <span className="font-mono text-slate-400">-$5,000</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Cash Flow from Financing Activities</span>
              <span className="font-mono text-slate-400">$0</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between text-sm font-black">
              <span>Net Increase in Cash</span>
              <span className="text-cyan-400 font-mono">+$40,530</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
