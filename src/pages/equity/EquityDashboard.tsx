import React from 'react';
import { Plus, Sliders } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
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
        title="Equity & cap table"
        subtitle="Manage company ownership, option grants, and dilution planning with a clear record of every holder."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('equity', 'dilution')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#101426] hover:bg-slate-200 dark:hover:bg-[#1F253D] text-slate-700 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF] border border-slate-200 dark:border-[#1F253D] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#7568E8] dark:text-[#A499FA]" />
              Dilution Simulator
            </button>
            <button
              onClick={() => navigate('equity', 'cap-table')}
              className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Issue Shares
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-[#1F253D] dark:bg-[#161B30] sm:px-6">
        <span className="font-medium text-slate-500 dark:text-[#6B7694]">Ownership summary</span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Capital raised</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{valuationText}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Shares</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{totalShares.toLocaleString()}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Shareholders</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{shareholders.length}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Option pool</span> <strong className="ms-1 font-semibold text-[#7568E8] dark:text-[#A499FA]">{esopPercentage} · {esopOptionsCount.toLocaleString()}</strong></span>
      </div>

      {/* Cap Table Preview */}
      <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#1F253D] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF] font-heading">Primary Shareholders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-[#101426] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A3ABC5] border-b border-slate-200/80 dark:border-[#1F253D]">
              <tr>
                <th className="p-3.5 text-start">Shareholder</th>
                <th className="p-3.5 text-start">Security Class</th>
                <th className="p-3.5 text-end">Shares</th>
                <th className="p-3.5 text-end">Ownership %</th>
                <th className="p-3.5 text-end">Total Investment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F253D] font-medium">
              {shareholders.map((sh) => (
                <tr key={sh.id} className="hover:bg-slate-50/80 dark:hover:bg-[#101426]/50 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{sh.name}</div>
                    <div className="text-[11px] text-slate-400 dark:text-[#6B7694]">{sh.type}</div>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-[#A3ABC5]">{sh.shareClass}</td>
                  <td className="p-3.5 text-end font-mono font-semibold text-slate-900 dark:text-[#F4F6FF] tabular-nums">{sh.sharesCount.toLocaleString()}</td>
                  <td className="p-3.5 text-end font-mono font-bold text-[#7568E8] dark:text-[#A499FA] tabular-nums">{sh.ownershipPercentage}%</td>
                  <td className="p-3.5 text-end font-semibold text-slate-900 dark:text-[#F4F6FF] tabular-nums">
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
