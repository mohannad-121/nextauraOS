import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
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
    <div className="space-y-6">
      <PageHeader
        category="Finance"
        title="Carbon activity"
        subtitle="Record Scope 1, 2, and 3 activity and keep a clear emissions register."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record Carbon Activity
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <span className="font-medium text-slate-500">Emissions summary</span>
        <span><span className="text-slate-500">Total</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{grandTotalCO2e.toFixed(1)} tons</strong></span>
        <span><span className="text-slate-500">Scope 1</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{scope1Total.toFixed(1)}</strong></span>
        <span><span className="text-slate-500">Scope 2</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{scope2Total.toFixed(1)}</strong></span>
        <span><span className="text-slate-500">Scope 3</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{scope3Total.toFixed(1)}</strong></span>
      </div>

      {/* Activity Log Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-heading">Activity Emissions Log</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="p-3.5 text-start">Activity Type</th>
                <th className="p-3.5 text-center">GHG Scope</th>
                <th className="p-3.5 text-end">Quantity / Unit</th>
                <th className="p-3.5 text-end">Calculated CO2e</th>
                <th className="p-3.5 text-start">Date Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {carbonActivities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100">{act.activityType}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold">
                      {act.scope}
                    </span>
                  </td>
                  <td className="p-3.5 text-end text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                    {act.quantity.toLocaleString()} {act.unit}
                  </td>
                  <td className="p-3.5 text-end font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {act.co2eTons} Tons CO2e
                  </td>
                  <td className="p-3.5 text-slate-500 dark:text-slate-400">{act.date}</td>
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
          <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Activity Name</label>
              <input
                type="text"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">GHG Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value="Scope 1">Scope 1 (Direct)</option>
                  <option value="Scope 2">Scope 2 (Electricity)</option>
                  <option value="Scope 3">Scope 3 (Value Chain)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs transition-colors"
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
