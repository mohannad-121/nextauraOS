import React, { useState, useMemo } from 'react';
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
  Building2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { PageHeader } from '../components/common/PageHeader';
import { getServiceCustomIcon } from '../utils/serviceIconMapper';

export const HomeDashboard: React.FC = () => {
  const { navigate, user, currentOrg, invoices, expenses, signDocuments, shareholders, esgMetrics } = useApp();
  const [timeRange, setTimeRange] = useState('30d');

  const totalRevenue = invoices.filter((i) => i.status === 'Paid').reduce((acc, i) => acc + i.total, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const cashBalance = totalRevenue;

  const pendingApprovals = expenses.filter((e) => e.status === 'Manager Review');
  const openDocs = signDocuments.filter((d) => d.status === 'Sent' || d.status === 'Partially Signed');
  const esgScore = esgMetrics.length > 0 ? (esgMetrics[0].currentValue || 0) : 0;

  // Custom PNG Service Icons
  const expensesIcon = getServiceCustomIcon('expenses');
  const signIcon = getServiceCustomIcon('sign');
  const equityIcon = getServiceCustomIcon('equity');

  // Dynamic cash flow chart derived strictly from real invoices & expenses
  const cashFlowChartData = useMemo(() => {
    if (invoices.length === 0 && expenses.length === 0) return [];
    
    const monthlyMap: Record<string, { month: string; cashIn: number; cashOut: number }> = {};
    
    invoices.forEach((inv) => {
      if (inv.status === 'Paid' && inv.issueDate) {
        const month = new Date(inv.issueDate).toLocaleString('default', { month: 'short' });
        if (!monthlyMap[month]) monthlyMap[month] = { month, cashIn: 0, cashOut: 0 };
        monthlyMap[month].cashIn += inv.total;
      }
    });

    expenses.forEach((exp) => {
      if (exp.date) {
        const month = new Date(exp.date).toLocaleString('default', { month: 'short' });
        if (!monthlyMap[month]) monthlyMap[month] = { month, cashIn: 0, cashOut: 0 };
        monthlyMap[month].cashOut += exp.amount;
      }
    });

    return Object.values(monthlyMap);
  }, [invoices, expenses]);

  // AI insights derived strictly from real tenant data
  const realInsights = useMemo(() => {
    const insights = [];
    const paidInvoices = invoices.filter((i) => i.status === 'Paid');
    const overdueInvoices = invoices.filter((i) => i.status === 'Overdue');
    
    if (paidInvoices.length > 0) {
      insights.push({
        title: `Collected Revenue: $${totalRevenue.toLocaleString()}`,
        desc: `${paidInvoices.length} paid invoices processed for ${currentOrg.name}.`,
        icon: TrendingUp,
        borderColor: 'border-cyan-500/20',
        bgColor: 'bg-cyan-500/10',
        textColor: 'text-cyan-400',
      });
    }

    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce((sum, i) => sum + i.amountDue, 0);
      insights.push({
        title: `${overdueInvoices.length} Overdue Invoices`,
        desc: `$${totalOverdue.toLocaleString()} pending collection across overdue billing items.`,
        icon: AlertTriangle,
        borderColor: 'border-rose-500/20',
        bgColor: 'bg-rose-500/10',
        textColor: 'text-rose-400',
      });
    }

    if (expenses.length > 0) {
      insights.push({
        title: `Logged Expenses: $${totalExpenses.toLocaleString()}`,
        desc: `${expenses.length} corporate expenses recorded in current cycle.`,
        icon: CheckCircle2,
        borderColor: 'border-emerald-500/20',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-400',
      });
    }

    return insights;
  }, [invoices, expenses, totalRevenue, totalExpenses, currentOrg]);

  return (
    <div className="space-y-8">
      {/* Top Welcome Header */}
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${user.name}`}
        subtitle={`Here is your real-time financial position and executive workspace overview.`}
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
          value={cashBalance}
          isCurrency
          change={0}
          icon={DollarSign}
          accentColor="cyan"
          onClick={() => navigate('accounting', 'reconciliation')}
        />
        <StatCard
          title="Monthly Revenue"
          value={totalRevenue}
          isCurrency
          change={0}
          icon={TrendingUp}
          accentColor="azure"
          onClick={() => navigate('invoicing', 'overview')}
        />
        <StatCard
          title="Monthly Expenses"
          value={totalExpenses}
          isCurrency
          change={0}
          comparisonText="actual expenditure"
          icon={CreditCard}
          accentColor="indigo"
          onClick={() => navigate('expenses', 'overview')}
        />
        <StatCard
          title="Net Operating Profit"
          value={netProfit}
          isCurrency
          change={0}
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
            {cashFlowChartData.length > 0 ? (
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
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Building2 className="w-8 h-8 text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300">No financial activity yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">Create invoices or record expenses to generate cash flow charts.</p>
              </div>
            )}
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
              {realInsights.length > 0 ? (
                realInsights.map((insight, idx) => {
                  const Icon = insight.icon;
                  return (
                    <div key={idx} className={`p-3.5 rounded-2xl bg-slate-950/80 border ${insight.borderColor} flex items-start gap-3`}>
                      <div className={`p-1.5 rounded-lg ${insight.bgColor} ${insight.textColor} shrink-0 mt-0.5`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{insight.title}</div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{insight.desc}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-2 my-auto py-8">
                  <Sparkles className="w-6 h-6 text-slate-600 mx-auto" />
                  <div className="text-xs font-semibold text-slate-300">No insights available yet.</div>
                  <p className="text-[11px] text-slate-500">Add business activity to generate insights.</p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('analytics')}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-2 mt-4"
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
              {expensesIcon ? (
                <img src={expensesIcon} alt="Expenses icon" className="w-5 h-5 object-contain" />
              ) : (
                <CreditCard className="w-4 h-4 text-cyan-400" />
              )}
              <h4 className="text-sm font-bold text-slate-100 font-heading">Expense Approvals</h4>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/10 text-cyan-400">
              {pendingApprovals.length} Pending
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingApprovals.length > 0 ? (
              pendingApprovals.map((exp) => (
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
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/40">
                No pending expense approvals
              </div>
            )}
          </div>
        </div>

        {/* E-Signature Pending Documents */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {signIcon ? (
                <img src={signIcon} alt="Sign icon" className="w-5 h-5 object-contain" />
              ) : (
                <FileSignature className="w-4 h-4 text-teal-400" />
              )}
              <h4 className="text-sm font-bold text-slate-100 font-heading">Pending Signatures</h4>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-500/10 text-teal-400">
              {openDocs.length} Active
            </span>
          </div>

          <div className="space-y-2.5">
            {openDocs.length > 0 ? (
              openDocs.map((doc) => (
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
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/40">
                No active document signatures
              </div>
            )}
          </div>
        </div>

        {/* Equity & ESG Snapshot */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {equityIcon ? (
                <img src={equityIcon} alt="Equity icon" className="w-5 h-5 object-contain" />
              ) : (
                <PieChart className="w-4 h-4 text-amber-400" />
              )}
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
              <div className="text-lg font-black text-slate-100 mt-1">
                {esgScore > 0 ? `${esgScore} / 100` : '0 / 100'}
              </div>
              <div className="text-[10px] text-slate-400">
                {esgMetrics.length > 0 ? 'Scorecard Active' : 'Not available yet'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

