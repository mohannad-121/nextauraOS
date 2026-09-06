import React from 'react';
import { Plus, Sliders } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { formatCurrency } from '../../utils/formatters';

export const EquityDashboard: React.FC = () => {
  const { navigate, shareholders, optionGrants } = useApp();

  const totalInvestment = shareholders.reduce((acc, curr) => acc + (curr.totalInvestment || 0), 0);
  const totalShares = shareholders.reduce((acc, curr) => acc + (curr.sharesCount || 0), 0);
  const valuationText = totalInvestment > 0 ? formatCurrency(totalInvestment) : '$0';
  const esopOptionsCount = optionGrants.reduce((acc, curr) => acc + (curr.grantedCount || 0), 0);
  const esopPercentage = totalShares > 0 ? `${((esopOptionsCount / totalShares) * 100).toFixed(1)}%` : '0%';

  return (
    <div className="space-y-6">
      <PageHeader
        category="Finance"
        title="Cap Table & Equity Management"
        subtitle="Manage company ownership, option pools, funding rounds & dilution modeling."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('equity', 'dilution')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Dilution Simulator
            </button>
            <button
              onClick={() => navigate('equity', 'cap-table')}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Issue Shares
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Capital Raised" value={valuationText} accentColor="amber" />
        <StatCard title="Total Shares Issued" value={totalShares.toLocaleString()} comparisonText="fully diluted" accentColor="indigo" />
        <StatCard title="Active Shareholders" value={shareholders.length} accentColor="emerald" />
        <StatCard title="ESOP Option Pool" value={esopPercentage} comparisonText={`${esopOptionsCount.toLocaleString()} options`} accentColor="rose" />
      </div>

      {/* Cap Table Preview */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-heading">Primary Shareholders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="p-3.5 text-start">Shareholder</th>
                <th className="p-3.5 text-start">Security Class</th>
                <th className="p-3.5 text-end">Shares</th>
                <th className="p-3.5 text-end">Ownership %</th>
                <th className="p-3.5 text-end">Total Investment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {shareholders.map((sh) => (
                <tr key={sh.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{sh.name}</div>
                    <div className="text-[11px] text-slate-400">{sh.type}</div>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-400">{sh.shareClass}</td>
                  <td className="p-3.5 text-end font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{sh.sharesCount.toLocaleString()}</td>
                  <td className="p-3.5 text-end font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">{sh.ownershipPercentage}%</td>
                  <td className="p-3.5 text-end font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {sh.totalInvestment > 0 ? formatCurrency(sh.totalInvestment) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

