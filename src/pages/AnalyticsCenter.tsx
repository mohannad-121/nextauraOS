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
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 font-heading">Quarterly Revenue vs Net Margin</h3>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} />
                <Area type="monotone" dataKey="netMargin" stroke="#34d399" fill="#34d399" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Distribution */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 font-heading">Operating Expense Trend</h3>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Bar dataKey="expense" fill="#818cf8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
