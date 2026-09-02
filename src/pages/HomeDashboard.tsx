import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  CreditCard,
  FileSignature,
  PieChart,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { PageHeader } from '../components/common/PageHeader';

const cashFlowChartData = [
  { month: 'Jan', cashIn: 68000, cashOut: 42000, netCash: 26000 },
  { month: 'Feb', cashIn: 72000, cashOut: 39000, netCash: 33000 },
  { month: 'Mar', cashIn: 84000, cashOut: 51000, netCash: 33000 },
  { month: 'Apr', cashIn: 79000, cashOut: 44000, netCash: 35000 },
  { month: 'May', cashIn: 91000, cashOut: 48000, netCash: 43000 },
  { month: 'Jun', cashIn: 88000, cashOut: 46000, netCash: 42000 },
  { month: 'Jul', cashIn: 94000, cashOut: 52000, netCash: 42000 },
  { month: 'Aug', cashIn: 92840, cashOut: 47310, netCash: 45530 },
];

export const HomeDashboard: React.FC = () => {
  const { navigate, user, expenses, signDocuments, shareholders } = useApp();
  const [timeRange, setTimeRange] = useState('30d');

  const pendingApprovals = expenses.filter((e) => e.status === 'Manager Review');
  const openDocs = signDocuments.filter((d) => d.status === 'Sent' || d.status === 'Partially Signed');

  return (
    <div className="space-y-8">
      {/* Top Header & Date Selector */}
      <PageHeader
        title={`Good morning, ${user.name.split(' ')[0]}`}
        subtitle="Here's how your company is performing today."
        actions={
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {['today', '7d', '30d', 'quarter', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  timeRange === range
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        }
      />

      {/* Row 1: Top Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Cash Balance"
          value={184620}
          isCurrency
          change={8.4}
          icon={DollarSign}
          accentColor="cyan"
          onClick={() => navigate('accounting', 'reconciliation')}
        />
        <StatCard
          title="Monthly Revenue"
          value={92840}
          isCurrency
          change={12.4}
          icon={TrendingUp}
          accentColor="azure"
          onClick={() => navigate('invoicing', 'overview')}
        />
        <StatCard
          title="Monthly Expenses"
          value={47310}
          isCurrency
          change={-3.2}
          comparisonText="vs budget limit"
          icon={CreditCard}
          accentColor="indigo"
          onClick={() => navigate('expenses', 'overview')}
        />
        <StatCard
          title="Net Operating Profit"
          value={45530}
          isCurrency
          change={18.2}
          icon={Sparkles}
          accentColor="emerald"
          onClick={() => navigate('accounting', 'reports')}
        />
      </div>

      {/* Row 2: Cash Flow Chart + AI Finance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Cash Flow Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 font-heading">Cash Flow Movement</h3>
              <p className="text-xs text-slate-400">Cash in vs Cash out over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                Cash In
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                Cash Out
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCashIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCashOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="cashIn" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorCashIn)" />
                <Area type="monotone" dataKey="cashOut" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorCashOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Finance Insights Panel */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Finance Intelligence Insights
            </div>
            <h3 className="text-base font-bold text-slate-100 font-heading mt-1">Automated Observations</h3>

            <div className="mt-4 space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/20 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Revenue Up +12.4%</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    SaaS expansion contract from Arzana Arabia boosted recurring revenue.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-rose-500/20 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Overdue Invoice Warning</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Invoice INV-2026-0041 ($8,450) is 12 days past due date.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/20 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Cash Runway: 9.4 Months</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Healthy burn rate ensures sufficient runway into Q3 2027.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('analytics')}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            Open Analytics Center
            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Row 3: Actionable Module Queues */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Expense Approvals Queue */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-slate-100 font-heading">Expense Approvals</h4>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/10 text-cyan-400">
              {pendingApprovals.length} Pending
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingApprovals.map((exp) => (
              <div key={exp.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">{exp.title}</div>
                  <div className="text-[10px] text-slate-400">{exp.employeeName} • ${exp.amount}</div>
                </div>
                <button
                  onClick={() => navigate('expenses', 'approvals')}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-[11px] font-bold"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* E-Signature Pending Documents */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-teal-400" />
              <h4 className="text-sm font-bold text-slate-100 font-heading">Pending Signatures</h4>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-500/10 text-teal-400">
              {openDocs.length} Active
            </span>
          </div>

          <div className="space-y-2.5">
            {openDocs.map((doc) => (
              <div key={doc.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div className="truncate me-2">
                  <div className="text-xs font-semibold text-slate-200 truncate">{doc.title}</div>
                  <div className="text-[10px] text-slate-400">{doc.recipients.length} recipients</div>
                </div>
                <button
                  onClick={() => navigate('sign', 'overview')}
                  className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 text-[11px] font-bold shrink-0"
                >
                  Track
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Equity & ESG Snapshot */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-slate-100 font-heading">Ownership & ESG Score</h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => navigate('equity', 'cap-table')}
              className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-amber-500/40 transition-colors"
            >
              <div className="text-[10px] font-semibold text-amber-400">Cap Table</div>
              <div className="text-lg font-black text-slate-100 mt-1">{shareholders.length}</div>
              <div className="text-[10px] text-slate-400">Shareholders</div>
            </div>

            <div
              onClick={() => navigate('esg', 'overview')}
              className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-emerald-500/40 transition-colors"
            >
              <div className="text-[10px] font-semibold text-emerald-400">ESG Index</div>
              <div className="text-lg font-black text-slate-100 mt-1">74 / 100</div>
              <div className="text-[10px] text-slate-400">On Track</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
