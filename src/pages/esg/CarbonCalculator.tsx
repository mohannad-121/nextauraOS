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
            className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Record Carbon Activity
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-[#1F253D] dark:bg-[#161B30] sm:px-6">
        <span className="font-medium text-slate-500 dark:text-[#6B7694]">Emissions summary</span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Total</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{grandTotalCO2e.toFixed(1)} tons</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Scope 1</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{scope1Total.toFixed(1)}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Scope 2</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{scope2Total.toFixed(1)}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Scope 3</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{scope3Total.toFixed(1)}</strong></span>
      </div>

      {/* Activity Log Table */}
      <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#1F253D] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF] font-heading">Activity Emissions Log</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-[#101426] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A3ABC5] border-b border-slate-200/80 dark:border-[#1F253D]">
              <tr>
                <th className="p-3.5 text-start">Activity Type</th>
                <th className="p-3.5 text-center">GHG Scope</th>
                <th className="p-3.5 text-end">Quantity / Unit</th>
                <th className="p-3.5 text-end">Calculated CO2e</th>
                <th className="p-3.5 text-start">Date Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F253D] font-medium">
              {carbonActivities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50/80 dark:hover:bg-[#101426]/50 transition-colors">
                  <td className="p-3.5 font-semibold text-slate-900 dark:text-[#F4F6FF]">{act.activityType}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-[#08B894]/10 text-emerald-700 dark:text-[#23C99C] border border-emerald-200 dark:border-[#08B894]/20 text-[10px] font-semibold">
                      {act.scope}
                    </span>
                  </td>
                  <td className="p-3.5 text-end text-slate-600 dark:text-[#A3ABC5] font-mono tabular-nums">
                    {act.quantity.toLocaleString()} {act.unit}
                  </td>
                  <td className="p-3.5 text-end font-semibold text-[#08B894] dark:text-[#23C99C] font-mono tabular-nums">
                    {act.co2eTons} Tons CO2e
                  </td>
                  <td className="p-3.5 text-slate-500 dark:text-[#A3ABC5]">{act.date}</td>
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
          <div className="space-y-3.5 text-xs text-slate-700 dark:text-[#A3ABC5]">
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Activity Name</label>
              <input
                type="text"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">GHG Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                >
                  <option value="Scope 1">Scope 1 (Direct)</option>
                  <option value="Scope 2">Scope 2 (Electricity)</option>
                  <option value="Scope 3">Scope 3 (Value Chain)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] font-semibold focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-[#1F253D]">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#101426] hover:bg-slate-200 dark:hover:bg-[#1F253D] text-slate-700 dark:text-[#A3ABC5] text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] transition-all cursor-pointer"
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
