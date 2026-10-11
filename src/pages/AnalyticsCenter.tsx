import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PageHeader } from '../components/common/PageHeader';

const analyticsData = [
  { month: 'Q1 25', revenue: 180000, expense: 95000, netMargin: 85000 },
  { month: 'Q2 25', revenue: 210000, expense: 110000, netMargin: 100000 },
  { month: 'Q3 25', revenue: 245000, expense: 125000, netMargin: 120000 },
  { month: 'Q4 25', revenue: 290000, expense: 140000, netMargin: 150000 },
  { month: 'Q1 26', revenue: 310000, expense: 145000, netMargin: 165000 },
  { month: 'Q2 26', revenue: 340000, expense: 150000, netMargin: 190000 },
];

export const AnalyticsCenter: React.FC = () => {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics & Financial Forecasting"
        subtitle="Cross-module financial intelligence, revenue expansion & expense variance metrics."
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-[#A3ABC5] block">Annualized Run-Rate</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-[#F4F6FF] mt-1 block">$1,360,000</span>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-[#23C99C] mt-1 inline-flex items-center">+88.8% YoY</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-[#A3ABC5] block">Q2 Net Margin</span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-[#23C99C] mt-1 block">55.8%</span>
          <span className="text-[10px] font-medium text-slate-400 dark:text-[#A3ABC5] mt-1 block">$190,000 quarterly</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-[#A3ABC5] block">OpEx Ratio</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-[#F4F6FF] mt-1 block">44.1%</span>
          <span className="text-[10px] font-semibold text-[#178CFF] mt-1 inline-flex items-center">Under budget target</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm">
          <span className="text-[11px] font-medium text-slate-500 dark:text-[#A3ABC5] block">Capital Efficiency</span>
          <span className="text-xl font-bold font-mono text-[#7568E8] dark:text-[#867AF0] mt-1 block">2.26x</span>
          <span className="text-[10px] font-medium text-slate-400 dark:text-[#A3ABC5] mt-1 block">Top quartile SaaS</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Growth Trend */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">Quarterly Revenue vs Net Margin</h3>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#7568E8]" /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#23C99C]" /> Net Margin</span>
            </div>
          </div>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F253D" opacity={0.6} />
                <XAxis dataKey="month" stroke="#A3ABC5" fontSize={11} tickLine={false} />
                <YAxis stroke="#A3ABC5" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101426',
                    borderColor: '#1F253D',
                    borderRadius: '12px',
                    color: '#F4F6FF',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#7568E8" strokeWidth={2} fill="#7568E8" fillOpacity={0.2} />
                <Area type="monotone" dataKey="netMargin" stroke="#23C99C" strokeWidth={2} fill="#23C99C" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">Operating Expense Trend</h3>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#178CFF]" /> Total OpEx</span>
            </div>
          </div>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F253D" opacity={0.6} />
                <XAxis dataKey="month" stroke="#A3ABC5" fontSize={11} tickLine={false} />
                <YAxis stroke="#A3ABC5" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101426',
                    borderColor: '#1F253D',
                    borderRadius: '12px',
                    color: '#F4F6FF',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                />
                <Bar dataKey="expense" fill="#178CFF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
