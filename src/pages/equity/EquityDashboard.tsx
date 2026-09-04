import React from 'react';
import { Plus, Sliders } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';

export const EquityDashboard: React.FC = () => {
  const { navigate, shareholders, optionGrants } = useApp();

  const totalInvestment = shareholders.reduce((acc, curr) => acc + (curr.totalInvestment || 0), 0);
  const totalShares = shareholders.reduce((acc, curr) => acc + (curr.sharesCount || 0), 0);
  const valuationText = totalInvestment > 0 ? `$${(totalInvestment / 1000000).toFixed(1)}M` : '$0';
  const esopOptionsCount = optionGrants.reduce((acc, curr) => acc + (curr.grantedCount || 0), 0);
  const esopPercentage = totalShares > 0 ? `${((esopOptionsCount / totalShares) * 100).toFixed(1)}%` : '0%';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cap Table & Equity Management"
        subtitle="Manage company ownership, option pools, funding rounds & dilution modeling."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('equity', 'dilution')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Dilution Simulator
            </button>
            <button
              onClick={() => navigate('equity', 'cap-table')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Issue Shares
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Investment" value={valuationText} change={0} accentColor="amber" />
        <StatCard title="Total Shares Issued" value={totalShares.toLocaleString()} comparisonText="fully diluted" accentColor="cyan" />
        <StatCard title="Active Shareholders" value={shareholders.length} change={0} accentColor="indigo" />
        <StatCard title="ESOP Option Pool" value={esopPercentage} comparisonText={`${esopOptionsCount.toLocaleString()} options`} accentColor="emerald" />
      </div>

      {/* Cap Table Preview */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 font-heading">Primary Shareholders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 text-start">Shareholder</th>
                <th className="p-4 text-start">Security Class</th>
                <th className="p-4 text-end">Shares</th>
                <th className="p-4 text-end">Ownership %</th>
                <th className="p-4 text-end">Total Investment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {shareholders.map((sh) => (
                <tr key={sh.id} className="hover:bg-slate-800/40">
                  <td className="p-4">
                    <div className="font-semibold text-slate-100">{sh.name}</div>
                    <div className="text-[10px] text-slate-400">{sh.type}</div>
                  </td>
                  <td className="p-4 text-slate-300">{sh.shareClass}</td>
                  <td className="p-4 text-end font-mono font-bold text-slate-100">{sh.sharesCount.toLocaleString()}</td>
                  <td className="p-4 text-end font-mono font-bold text-amber-400">{sh.ownershipPercentage}%</td>
                  <td className="p-4 text-end font-bold text-slate-200">
                    {sh.totalInvestment > 0 ? `$${sh.totalInvestment.toLocaleString()}` : '-'}
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
