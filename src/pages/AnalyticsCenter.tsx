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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Growth Trend */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Quarterly Revenue vs Net Margin</h3>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} />
                <Area type="monotone" dataKey="netMargin" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Operating Expense Trend</h3>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} />
                <Bar dataKey="expense" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
