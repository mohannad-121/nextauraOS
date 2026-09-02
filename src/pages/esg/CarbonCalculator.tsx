import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';

export const CarbonCalculator: React.FC = () => {
  const { carbonActivities, createCarbonActivity } = useApp();
  const [isModalOpen, setModalOpen] = useState(false);

  const [activityType, setActivityType] = useState('AWS & Cloud Data Center Electricity');
  const [scope, setScope] = useState<'Scope 1' | 'Scope 2' | 'Scope 3'>('Scope 2');
  const [quantity, setQuantity] = useState('12400');
  const [unit, setUnit] = useState('kWh');

  const scope1Total = carbonActivities.filter((a) => a.scope === 'Scope 1').reduce((acc, curr) => acc + curr.co2eTons, 0);
  const scope2Total = carbonActivities.filter((a) => a.scope === 'Scope 2').reduce((acc, curr) => acc + curr.co2eTons, 0);
  const scope3Total = carbonActivities.filter((a) => a.scope === 'Scope 3').reduce((acc, curr) => acc + curr.co2eTons, 0);
  const grandTotalCO2e = scope1Total + scope2Total + scope3Total;

  const handleCreate = () => {
    const qtyNum = Number(quantity || 0);
    const factor = scope === 'Scope 2' ? 0.00038 : scope === 'Scope 1' ? 0.0052 : 0.00027;
    const computedTons = Number((qtyNum * factor).toFixed(1));

    createCarbonActivity({
      activityType,
      scope,
      quantity: qtyNum,
      unit,
      co2eTons: computedTons,
      date: new Date().toISOString().substring(0, 10),
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Carbon Footprint Calculator (GHG Protocol)"
        subtitle="Track Scope 1 (Direct), Scope 2 (Energy), and Scope 3 (Value Chain) greenhouse gas emissions."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Record Carbon Activity
          </button>
        }
      />

      {/* Scope Breakdown KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Emissions" value={`${grandTotalCO2e.toFixed(1)} Tons`} change={-8.4} comparisonText="CO2e YTD" accentColor="emerald" />
        <StatCard title="Scope 1 (Direct)" value={`${scope1Total.toFixed(1)} Tons`} comparisonText="natural gas, fleet" accentColor="cyan" />
        <StatCard title="Scope 2 (Electricity)" value={`${scope2Total.toFixed(1)} Tons`} comparisonText="purchased energy" accentColor="indigo" />
        <StatCard title="Scope 3 (Travel & Ops)" value={`${scope3Total.toFixed(1)} Tons`} comparisonText="flights, suppliers" accentColor="amber" />
      </div>

      {/* Activity Log Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 font-heading">Activity Emissions Log</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 text-start">Activity Type</th>
                <th className="p-4 text-center">GHG Scope</th>
                <th className="p-4 text-end">Quantity / Unit</th>
                <th className="p-4 text-end">Calculated CO2e</th>
                <th className="p-4 text-start">Date Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {carbonActivities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-800/40">
                  <td className="p-4 font-semibold text-slate-100">{act.activityType}</td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                      {act.scope}
                    </span>
                  </td>
                  <td className="p-4 text-end text-slate-300 font-mono">
                    {act.quantity.toLocaleString()} {act.unit}
                  </td>
                  <td className="p-4 text-end font-bold text-emerald-400 font-mono">
                    {act.co2eTons} Tons CO2e
                  </td>
                  <td className="p-4 text-slate-400">{act.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Activity Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          title="Record Carbon Emission Activity"
          subtitle="Select activity type and quantity to calculate CO2e."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Activity Name</label>
              <input
                type="text"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">GHG Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                >
                  <option value="Scope 1">Scope 1 (Direct)</option>
                  <option value="Scope 2">Scope 2 (Electricity)</option>
                  <option value="Scope 3">Scope 3 (Value Chain)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold text-emerald-400"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
              >
                Calculate & Save Entry
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
