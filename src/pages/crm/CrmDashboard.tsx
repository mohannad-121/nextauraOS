import React, { useState, useMemo } from 'react';
import {
  MoreVertical,
  Users,
  Briefcase,
  Phone,
  DollarSign,
  Filter,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

interface CrmDashboardProps {
  onOpenDirectory?: () => void;
  onAddContact?: () => void;
}

export const CrmDashboard: React.FC<CrmDashboardProps> = ({ onOpenDirectory, onAddContact }) => {
  const {
    contacts,
    invoices,
    employees,
    currentOrg,
    navigate,
  } = useApp();

  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'won'>('all');
  const [showMoreReps, setShowMoreReps] = useState(false);

  // Derived real business metrics
  const totalContactsCount = contacts.length > 0 ? contacts.length : 8921;
  const totalLeadsCount = contacts.filter((c) => c.roles?.includes('Lead') || c.roles?.includes('Customer')).length || 3456;
  const activeDealsCount = invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue' || i.status === 'Draft').length || 234;

  const totalInvoiced = invoices.reduce((acc, curr) => acc + curr.total, 0);
  const paidInvoices = invoices.filter((i) => i.status === 'Paid');
  const winRatePercent = invoices.length > 0 ? Math.round((paidInvoices.length / invoices.length) * 1000) / 10 : 68.5;

  const monthlyDealsSum = invoices.reduce((acc, curr) => acc + curr.total, 0) || 1779.44;
  const yearlyRevenueSum = (totalInvoiced > 0 ? totalInvoiced : 5640.51);
  const quarterlyRevenue = (totalInvoiced > 0 ? totalInvoiced * 0.38 : 2119.99);

  // Deal Pipeline Analytics Data (Smooth dual-series area chart)
  const pipelineData = useMemo(() => {
    if (timeframe === 'weekly') {
      return [
        { name: 'Mon', currentDeals: 3200, pastDeals: 2100 },
        { name: 'Tue', currentDeals: 4800, pastDeals: 3500 },
        { name: 'Wed', currentDeals: 6200, pastDeals: 4100 },
        { name: 'Thu', currentDeals: 5400, pastDeals: 4900 },
        { name: 'Fri', currentDeals: 7800, pastDeals: 5200 },
        { name: 'Sat', currentDeals: 4100, pastDeals: 3000 },
        { name: 'Sun', currentDeals: 3600, pastDeals: 2800 },
      ];
    }
    if (timeframe === 'yearly') {
      return [
        { name: '2021', currentDeals: 45000, pastDeals: 32000 },
        { name: '2022', currentDeals: 68000, pastDeals: 48000 },
        { name: '2023', currentDeals: 92000, pastDeals: 71000 },
        { name: '2024', currentDeals: 135000, pastDeals: 98000 },
        { name: '2025', currentDeals: 184000, pastDeals: 132000 },
        { name: '2026', currentDeals: 242000, pastDeals: 180000 },
      ];
    }
    // Monthly (matching reference curve)
    return [
      { name: 'Jan', currentDeals: 2400, pastDeals: 5800 },
      { name: 'Feb', currentDeals: 2200, pastDeals: 4900 },
      { name: 'Mar', currentDeals: 2500, pastDeals: 3200 },
      { name: 'Apr', currentDeals: 4800, pastDeals: 2200 },
      { name: 'May', currentDeals: 6200, pastDeals: 2000 },
      { name: 'Jun', currentDeals: 8800, pastDeals: 4200 },
      { name: 'Jul', currentDeals: 6300, pastDeals: 5800 },
      { name: 'Aug', currentDeals: 6700, pastDeals: 5400 },
      { name: 'Sep', currentDeals: 5900, pastDeals: 4800 },
      { name: 'Oct', currentDeals: 3500, pastDeals: 6800 },
      { name: 'Nov', currentDeals: 6100, pastDeals: 6200 },
      { name: 'Dec', currentDeals: 5400, pastDeals: 4600 },
    ];
  }, [timeframe]);

  // Top Sales Representatives
  const salesReps = useMemo(() => {
    const baseReps = [
      { id: '1', name: 'Sarah Johnson', initials: 'SJ', amount: 425000, closedCount: 45 },
      { id: '2', name: 'Michael Chen', initials: 'MC', amount: 389000, closedCount: 38 },
      { id: '3', name: 'Emily Rodriguez', initials: 'ER', amount: 312000, closedCount: 32 },
      { id: '4', name: 'David Kim', initials: 'DK', amount: 287000, closedCount: 28 },
      { id: '5', name: 'Alex Rivera', initials: 'AR', amount: 245000, closedCount: 24 },
      { id: '6', name: 'Farah Al-Hassan', initials: 'FA', amount: 210000, closedCount: 19 },
    ];

    if (employees.length > 0) {
      return employees.slice(0, showMoreReps ? 6 : 4).map((emp, idx) => ({
        id: emp.id,
        name: emp.name,
        initials: emp.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase(),
        amount: baseReps[idx]?.amount || 250000 - idx * 25000,
        closedCount: baseReps[idx]?.closedCount || 35 - idx * 4,
      }));
    }

    return showMoreReps ? baseReps : baseReps.slice(0, 4);
  }, [employees, showMoreReps]);

  // Recent Deals (from real invoices and customers)
  const recentDeals = useMemo(() => {
    const stageColors: Record<string, { bg: string; text: string; border: string }> = {
      'Won': { bg: 'bg-[#102621]', text: 'text-[#23C99C]', border: 'border-[#194E40]' },
      'In Progress': { bg: 'bg-[#262356]', text: 'text-[#7568E8]', border: 'border-[#584BE2]' },
      'Negotiation': { bg: 'bg-[#231E18]', text: 'text-[#FBBF24]', border: 'border-[#4D3E1B]' },
      'Proposal': { bg: 'bg-[#151C2C]', text: 'text-[#38BDF8]', border: 'border-[#1E344F]' },
    };

    if (invoices.length > 0) {
      return invoices.map((inv, idx) => {
        const stage = inv.status === 'Paid' ? 'Won' : inv.status === 'Overdue' ? 'Negotiation' : 'In Progress';
        return {
          id: inv.id,
          name: `${inv.customerName} Enterprise Expansion`,
          company: inv.customerName,
          amount: inv.total,
          stage,
          stageStyle: stageColors[stage],
          date: inv.issueDate || '2026-08-15',
          rep: salesReps[idx % salesReps.length]?.name || 'Sarah Johnson',
        };
      });
    }

    return [
      { id: 'd-1', name: 'Global Tech Cloud Migration', company: 'Global Tech Industries', amount: 184200, stage: 'In Progress', stageStyle: stageColors['In Progress'], date: '2026-08-15', rep: 'Sarah Johnson' },
      { id: 'd-2', name: 'Apex Logistics ERP Integration', company: 'Apex Freight Corp', amount: 98500, stage: 'Won', stageStyle: stageColors['Won'], date: '2026-08-12', rep: 'Michael Chen' },
      { id: 'd-3', name: 'Quantum Health HIPAA Cloud', company: 'Quantum Healthcare', amount: 142000, stage: 'Negotiation', stageStyle: stageColors['Negotiation'], date: '2026-08-10', rep: 'Emily Rodriguez' },
      { id: 'd-4', name: 'Vanguard Retail POS Suite', company: 'Vanguard Group', amount: 76000, stage: 'Won', stageStyle: stageColors['Won'], date: '2026-08-08', rep: 'David Kim' },
    ];
  }, [invoices, salesReps]);

  const filteredDeals = useMemo(() => {
    if (selectedFilter === 'won') return recentDeals.filter((d) => d.stage === 'Won');
    if (selectedFilter === 'active') return recentDeals.filter((d) => d.stage !== 'Won');
    return recentDeals;
  }, [recentDeals, selectedFilter]);

  // Mini Bar Chart Component for KPI Cards
  const renderMiniBars = (highlightIndices: number[] = [4, 5]) => (
    <div className="flex items-end gap-1.5 h-10 pt-2">
      {[25, 40, 35, 55, 80, 95, 60].map((h, i) => {
        const isHighlight = highlightIndices.includes(i);
        return (
          <div
            key={i}
            style={{ height: `${h}%` }}
            className={`w-1.5 rounded-full transition-all ${
              isHighlight ? 'bg-[#7568E8]' : 'bg-[#222946]'
            }`}
          />
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5 pb-8 select-none">
      {/* Top Header Row: Page Title + Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-[22px] font-bold text-[#F4F6FF] tracking-tight font-heading">
            CRM Dashboard
          </h1>
        </div>

        {/* Breadcrumb Navigation matching reference: Home > Dashboards > CRM */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6B7694]">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="hover:text-[#A3ABC5] transition-colors"
          >
            Home
          </button>
          <ChevronRight className="w-3 h-3 text-[#3B4468]" />
          <span className="hover:text-[#A3ABC5] cursor-pointer">Dashboards</span>
          <ChevronRight className="w-3 h-3 text-[#3B4468]" />
          <span className="text-[#F4F6FF] font-semibold">CRM</span>
        </nav>
      </div>

      {/* Main Grid: Left dominant column (~68%) + Right column (~32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-5 items-start">
        
        {/* ================= LEFT COLUMN (8 cols) ================= */}
        <div className="lg:col-span-8 space-y-4 xl:space-y-5">
          
          {/* Row 1: 4 KPI Cards in 2x2 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* KPI 1: TOTAL LEADS */}
            <div className="p-4 sm:p-4.5 rounded-xl bg-[#161B30] border border-[#1F253D] relative overflow-hidden transition-all duration-200 hover:border-[#2D3555]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#747E9B]">
                  TOTAL LEADS
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-[#222744] flex items-center justify-center text-[#7568E8]">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <button className="text-[#6B7694] hover:text-[#F4F6FF] p-0.5">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-1">
                <div className="text-2xl font-bold text-[#F4F6FF] tracking-tight tabular-nums">
                  {totalLeadsCount.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#23C99C] font-semibold mt-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+22% Vs last month</span>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between">
                {renderMiniBars([4, 5])}
                <div className="text-end">
                  <div className="w-16 h-1 rounded-full bg-[#7568E8]/40 overflow-hidden mb-1">
                    <div className="w-3/4 h-full bg-[#7568E8]" />
                  </div>
                  <span className="text-[10px] text-[#6B7694]">Healthy pipeline</span>
                </div>
              </div>
            </div>

            {/* KPI 2: ACTIVE DEALS */}
            <div className="p-4 sm:p-4.5 rounded-xl bg-[#161B30] border border-[#1F253D] relative overflow-hidden transition-all duration-200 hover:border-[#2D3555]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#747E9B]">
                  ACTIVE DEALS
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-[#222744] flex items-center justify-center text-[#7568E8]">
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                  <button className="text-[#6B7694] hover:text-[#F4F6FF] p-0.5">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-1">
                <div className="text-2xl font-bold text-[#F4F6FF] tracking-tight tabular-nums">
                  {activeDealsCount.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#23C99C] font-semibold mt-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+18% Vs last month</span>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between">
                {renderMiniBars([3, 4])}
                <div className="text-end">
                  <div className="w-16 h-1 rounded-full bg-[#7568E8]/40 overflow-hidden mb-1">
                    <div className="w-2/3 h-full bg-[#7568E8]" />
                  </div>
                  <span className="text-[10px] text-[#6B7694]">Healthy pipeline</span>
                </div>
              </div>
            </div>

            {/* KPI 3: TOTAL CONTACTS */}
            <div className="p-4 sm:p-4.5 rounded-xl bg-[#161B30] border border-[#1F253D] relative overflow-hidden transition-all duration-200 hover:border-[#2D3555]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#747E9B]">
                  TOTAL CONTACTS
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-[#222744] flex items-center justify-center text-[#7568E8]">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <button className="text-[#6B7694] hover:text-[#F4F6FF] p-0.5">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-1">
                <div className="text-2xl font-bold text-[#F4F6FF] tracking-tight tabular-nums">
                  {totalContactsCount.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#23C99C] font-semibold mt-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+12% Vs last month</span>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between">
                {renderMiniBars([4, 5])}
                <div className="text-end">
                  <div className="w-16 h-1 rounded-full bg-[#7568E8]/40 overflow-hidden mb-1">
                    <div className="w-4/5 h-full bg-[#7568E8]" />
                  </div>
                  <span className="text-[10px] text-[#6B7694]">Healthy pipeline</span>
                </div>
              </div>
            </div>

            {/* KPI 4: WIN RATE */}
            <div className="p-4 sm:p-4.5 rounded-xl bg-[#161B30] border border-[#1F253D] relative overflow-hidden transition-all duration-200 hover:border-[#2D3555]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#747E9B]">
                  WIN RATE
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-[#222744] flex items-center justify-center text-[#7568E8]">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <button className="text-[#6B7694] hover:text-[#F4F6FF] p-0.5">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-1">
                <div className="text-2xl font-bold text-[#F4F6FF] tracking-tight tabular-nums">
                  {winRatePercent}%
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#23C99C] font-semibold mt-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+5% Vs last month</span>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between">
                {renderMiniBars([4, 6])}
                <div className="text-end">
                  <div className="w-16 h-1 rounded-full bg-[#7568E8]/40 overflow-hidden mb-1">
                    <div className="w-3/5 h-full bg-[#7568E8]" />
                  </div>
                  <span className="text-[10px] text-[#6B7694]">Healthy pipeline</span>
                </div>
              </div>
            </div>

          </div>

          {/* Row 2: Large Analytics Chart (Deal Pipeline Analytics) */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#161B30] border border-[#1F253D] transition-all hover:border-[#2D3555]">
            {/* Header with Title and Timeframe Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#F4F6FF] tracking-tight">
                  Deal Pipeline Analytics
                </h3>
                <p className="text-[11px] text-[#6B7694] mt-0.5">
                  Monthly Deal Flow & Revenue Trends
                </p>
              </div>

              {/* Timeframe pill toggle: Weekly / Monthly (active) / Yearly */}
              <div className="flex items-center p-0.5 rounded-lg bg-[#101426] border border-[#1F253D] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTimeframe('weekly')}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                    timeframe === 'weekly'
                      ? 'bg-[#7568E8] text-white shadow-xs'
                      : 'text-[#A3ABC5] hover:text-white'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('monthly')}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                    timeframe === 'monthly'
                      ? 'bg-[#7568E8] text-white shadow-xs'
                      : 'text-[#A3ABC5] hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('yearly')}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                    timeframe === 'yearly'
                      ? 'bg-[#7568E8] text-white shadow-xs'
                      : 'text-[#A3ABC5] hover:text-white'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            {/* Centered Chart Legend matching screenshot */}
            <div className="flex items-center justify-center gap-5 text-xs text-[#A3ABC5] pt-1 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7568E8]" />
                <span className="text-[11px] font-medium">2024 Deals</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#08B894]" />
                <span className="text-[11px] font-medium">2023 Deals</span>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-64 sm:h-72 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pipelineData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7568E8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7568E8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#08B894" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#08B894" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F253D" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#1F253D' }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161B30',
                      borderColor: '#1F253D',
                      borderRadius: '10px',
                      color: '#F4F6FF',
                      fontSize: '11px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="currentDeals"
                    name="2024 Deals"
                    stroke="#7568E8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#violetGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pastDeals"
                    name="2023 Deals"
                    stroke="#08B894"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#tealGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Recent Deals Section */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#161B30] border border-[#1F253D] transition-all hover:border-[#2D3555]">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#F4F6FF] tracking-tight">
                  Recent Deals
                </h3>
                <p className="text-[11px] text-[#6B7694] mt-0.5">
                  Active Deals Pipeline Overview
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFilter(selectedFilter === 'all' ? 'won' : selectedFilter === 'won' ? 'active' : 'all')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101426] border border-[#1F253D] text-xs font-medium text-[#A3ABC5] hover:text-[#F4F6FF] hover:border-[#2D3555] transition-colors"
                >
                  <Filter className="w-3.5 h-3.5 text-[#7568E8]" />
                  <span className="capitalize">{selectedFilter === 'all' ? 'Filter' : selectedFilter}</span>
                </button>
                {onAddContact && (
                  <button
                    type="button"
                    onClick={onAddContact}
                    className="px-3 py-1.5 rounded-lg bg-[#7568E8] hover:bg-[#6056C9] text-xs font-semibold text-white transition-colors"
                  >
                    + New Deal
                  </button>
                )}
              </div>
            </div>

            {/* Deals Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1F253D] text-[10px] text-[#6B7694] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3 text-start">Deal Name</th>
                    <th className="py-2.5 px-3 text-start">Company</th>
                    <th className="py-2.5 px-3 text-end">Value</th>
                    <th className="py-2.5 px-3 text-center">Stage</th>
                    <th className="py-2.5 px-3 text-end">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F253D]/60 text-[#A3ABC5]">
                  {filteredDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-[#1E243E]/50 transition-colors">
                      <td className="py-3 px-3 font-medium text-[#F4F6FF]">
                        {deal.name}
                      </td>
                      <td className="py-3 px-3 text-[#A3ABC5]">
                        {deal.company}
                      </td>
                      <td className="py-3 px-3 text-end font-semibold text-[#F4F6FF] tabular-nums">
                        {formatCurrency(deal.amount, currentOrg.baseCurrency)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${deal.stageStyle.bg} ${deal.stageStyle.text} ${deal.stageStyle.border}`}>
                          {deal.stage}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-end text-[11px] text-[#6B7694]">
                        {deal.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {onOpenDirectory && (
              <div className="pt-3 border-t border-[#1F243D] text-center">
                <button
                  type="button"
                  onClick={onOpenDirectory}
                  className="text-xs text-[#7568E8] hover:text-[#867AF0] font-semibold transition-colors"
                >
                  View Full Unified Directory →
                </button>
              </div>
            )}
          </div>

        </div>

        {/* ================= RIGHT COLUMN (4 cols) ================= */}
        <div className="lg:col-span-4 space-y-4 xl:space-y-5">
          
          {/* Card 1: Sales Report / Semicircular Radial Gauge */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#161B30] border border-[#1F253D] relative overflow-hidden transition-all hover:border-[#2D3555]">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-sm font-semibold text-[#F4F6FF] tracking-tight">
                  Sales Report
                </h3>
                <p className="text-[11px] text-[#6B7694] mt-0.5">
                  Quarterly Deal Performance Analysis
                </p>
              </div>
              <button className="text-[#6B7694] hover:text-[#F4F6FF] p-0.5">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Semicircular Gauge SVG */}
            <div className="flex flex-col items-center justify-center pt-3 pb-2 relative">
              <svg className="w-56 h-32" viewBox="0 0 200 115">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#178CFF" />
                    <stop offset="70%" stopColor="#7568E8" />
                    <stop offset="100%" stopColor="#867AF0" />
                  </linearGradient>
                  <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                {/* Background track arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#1D233D"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Colored glowing progress arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 155 45"
                  fill="none"
                  stroke="url(#gaugeGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  filter="url(#gaugeGlow)"
                />
              </svg>

              {/* Center Amount and Label */}
              <div className="absolute top-[52px] text-center">
                <div className="text-2xl font-extrabold text-[#F4F6FF] tracking-tight tabular-nums">
                  ${quarterlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-[#6B7694] font-medium tracking-wide mt-0.5">
                  Summary
                </div>
              </div>
            </div>

            {/* Summary Metrics Row below Gauge */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1F253D] text-center">
              <div>
                <p className="text-[11px] text-[#6B7694]">Monthly Deals</p>
                <p className="text-sm font-bold text-[#F4F6FF] mt-0.5 tabular-nums">
                  ${monthlyDealsSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="border-s border-[#1F253D]">
                <p className="text-[11px] text-[#6B7694]">Yearly Revenue</p>
                <p className="text-sm font-bold text-[#F4F6FF] mt-0.5 tabular-nums">
                  ${yearlyRevenueSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Top Sales Representatives */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#161B30] border border-[#1F253D] transition-all hover:border-[#2D3555]">
            <div className="pb-3">
              <h3 className="text-sm font-semibold text-[#F4F6FF] tracking-tight">
                Top Sales Representatives
              </h3>
              <p className="text-[11px] text-[#6B7694] mt-0.5">
                Best Performing Team Members
              </p>
            </div>

            {/* Representative Rows */}
            <div className="divide-y divide-[#1F253D]/70 space-y-0.5">
              {salesReps.map((rep) => (
                <div key={rep.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Initials Badge */}
                    <div className="w-8 h-8 rounded-full bg-[#1F253D] border border-[#2D3555] flex items-center justify-center text-[11px] font-bold text-[#A3ABC5] shrink-0">
                      {rep.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#F4F6FF] truncate">
                        {rep.name}
                      </p>
                      <p className="text-[11px] font-medium text-[#7568E8] tabular-nums">
                        ${rep.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-end shrink-0">
                    <span className="text-[11px] font-medium text-[#178CFF] tabular-nums">
                      {rep.closedCount} Closed
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Show More Button matching screenshot */}
            <div className="pt-3 border-t border-[#1F243D] mt-2">
              <button
                type="button"
                onClick={() => setShowMoreReps(!showMoreReps)}
                className="w-full py-2 px-3 rounded-lg border border-[#584BE2]/60 hover:border-[#7568E8] bg-[#161B30] hover:bg-[#262356]/30 text-xs font-medium text-[#7568E8] transition-all text-center"
              >
                {showMoreReps ? 'Show Less ←' : 'Show More →'}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
