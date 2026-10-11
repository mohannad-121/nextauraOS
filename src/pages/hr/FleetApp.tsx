import React, { useState } from 'react';
import { Car, Plus, Wrench } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';

export const FleetApp: React.FC = () => {
  const { vehicles, vehicleMaintenance, createVehicle, addVehicleMaintenance } = useApp();
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [isMaintModalOpen, setMaintModalOpen] = useState(false);

  // New Vehicle
  const [name, setName] = useState('');
  const [make] = useState('Tesla');
  const [model, setModel] = useState('Model Y');
  const [year] = useState(2025);
  const [licensePlate, setLicensePlate] = useState('SF-440-EV');
  const [assignedEmployeeName, setAssignedEmployeeName] = useState('Mohannad Abuayyash');

  // Maintenance Log Form
  const [maintVehicleId, setMaintVehicleId] = useState('');
  const [maintType, setMaintType] = useState<'Oil Change' | 'Tires' | 'Inspection' | 'Repair'>('Oil Change');
  const [maintCost, setMaintCost] = useState(450);
  const [maintVendor, setMaintVendor] = useState('Tesla Official Service Center');
  const [maintOdometer, setMaintOdometer] = useState(28500);

  const activeCount = vehicles.filter((v) => v.status === 'Assigned' || v.status === 'Available').length;
  const totalFleetCost = vehicles.reduce((acc, curr) => acc + curr.monthlyCost, 0);

  const handleCreate = () => {
    if (!name || !licensePlate) return;
    createVehicle({
      name,
      make,
      model,
      year: Number(year),
      licensePlate,
      vin: `VIN-${Date.now().toString().slice(-8)}`,
      assignedEmployeeName,
      odometerKm: 12000,
      monthlyCost: 950,
      status: 'Assigned',
    });
    setModalOpen(false);
  };

  const handleAddMaintenance = () => {
    const targetVeh = vehicles.find((v) => v.id === maintVehicleId) || vehicles[0];
    if (!targetVeh) return;

    addVehicleMaintenance({
      vehicleId: targetVeh.id,
      vehicleName: targetVeh.name,
      type: maintType,
      date: new Date().toISOString().substring(0, 10),
      vendor: maintVendor,
      cost: maintCost,
      odometerKm: maintOdometer,
      nextServiceDate: '2027-03-15',
    });

    setMaintModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Fleet"
        subtitle="Keep company vehicles, assignments, odometer records, and maintenance together."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => {
                if (vehicles.length > 0) setMaintVehicleId(vehicles[0].id);
                setMaintModalOpen(true);
              }}
              variant="secondary"
              size="sm"
              icon={<Wrench className="w-4 h-4" />}
            >
              Add Service Log
            </Button>
            <Button
              onClick={() => setModalOpen(true)}
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
            >
              Add Vehicle
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-[#1F253D] dark:bg-[#161B30] sm:px-6">
        <span className="font-medium text-slate-500 dark:text-[#A3ABC5]">Fleet register</span>
        <span><span className="text-slate-500 dark:text-[#6B7694]">Vehicles</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{vehicles.length}</strong></span>
        <span><span className="text-slate-500 dark:text-[#6B7694]">Active or assigned</span> <strong className="ms-1 font-semibold text-emerald-600 dark:text-[#23C99C]">{activeCount}</strong></span>
        <span><span className="text-slate-500 dark:text-[#6B7694]">Monthly cost</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">${totalFleetCost.toLocaleString()}</strong></span>
      </div>

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div key={v.id} className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-3 rounded-xl bg-[#7568E8]/10 text-[#7568E8] dark:bg-[#7568E8]/15 dark:text-[#7568E8] border border-[#7568E8]/20">
                <Car className="w-5 h-5" />
              </div>
              <StatusBadge status={v.status} />
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FF]">{v.name}</h3>
              <div className="text-xs text-slate-500 dark:text-[#A3ABC5]">{v.make} {v.model} ({v.year})</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-[#101426] border border-slate-200/60 dark:border-[#1F253D] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-[#6B7694]">License Plate</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-[#F4F6FF]">{v.licensePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-[#6B7694]">Assigned Driver</span>
                <span className="font-semibold text-[#7568E8]">{v.assignedEmployeeName || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-[#6B7694]">Odometer</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-[#F4F6FF]">{v.odometerKm.toLocaleString()} km</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Maintenance Logs & Accounting Connection */}
      <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1F253D] pb-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">Maintenance & Service Records</h4>
          <span className="text-[10px] text-emerald-600 dark:text-[#23C99C] font-mono font-semibold">AUTOMATIC ACCOUNTING EXPENSE LINKED</span>
        </div>

        <div className="space-y-3">
          {vehicleMaintenance.map((m) => (
            <div key={m.id} className="p-4 rounded-xl bg-slate-50/50 dark:bg-[#101426] border border-slate-200/60 dark:border-[#1F253D] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div>
                <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{m.vehicleName} — {m.type}</div>
                <div className="text-[11px] text-slate-500 dark:text-[#A3ABC5]">{m.vendor} • Date: {m.date}</div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono font-bold text-slate-900 dark:text-[#F4F6FF] text-sm">${m.cost.toLocaleString()}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#23C99C] border border-emerald-500/20 font-medium text-[11px]">
                  Posted to Expenses
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          title="Add Vehicle to Fleet"
          subtitle="Register company vehicle asset and assign primary driver."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-[#A3ABC5]">
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1 text-[11px]">Vehicle Name / Label</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Executive Tesla Model Y" className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] text-xs focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1 text-[11px]">Make & Model</label>
                <input type="text" value={`${make} ${model}`} onChange={(e) => setModel(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] text-xs focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] outline-none" />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1 text-[11px]">License Plate</label>
                <input type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-[#7568E8] font-bold text-xs focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1 text-[11px]">Assigned Driver Name</label>
              <input type="text" value={assignedEmployeeName} onChange={(e) => setAssignedEmployeeName(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] text-xs focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] outline-none" />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200/80 dark:border-[#1F253D]">
              <Button onClick={() => setModalOpen(false)} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleCreate} variant="primary" size="sm">Register Vehicle</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Maintenance Modal */}
      {isMaintModalOpen && (
        <Modal
          isOpen={isMaintModalOpen}
          onClose={() => setMaintModalOpen(false)}
          title="Add Vehicle Service Log"
          subtitle="Records maintenance & automatically posts expense to Accounting."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-[#A3ABC5]">
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1 text-[11px]">Select Fleet Vehicle</label>
              <select value={maintVehicleId} onChange={(e) => setMaintVehicleId(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] font-medium text-xs focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] outline-none">
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1 text-[11px]">Service Type</label>
                <select value={maintType} onChange={(e) => setMaintType(e.target.value as any)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] text-xs focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] outline-none">
                  <option value="Oil Change">Oil Change</option>
                  <option value="Tires">Tires</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Repair">Repair</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1 text-[11px]">Service Cost ($)</label>
                <input type="number" value={maintCost} onChange={(e) => setMaintCost(Number(e.target.value))} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-emerald-600 dark:text-[#23C99C] font-mono font-bold text-xs focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1 text-[11px]">Vendor Name</label>
                <input type="text" value={maintVendor} onChange={(e) => setMaintVendor(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] text-xs focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] outline-none" />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1 text-[11px]">Current Odometer (km)</label>
                <input type="number" value={maintOdometer} onChange={(e) => setMaintOdometer(Number(e.target.value))} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] font-mono text-xs focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] outline-none" />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200/80 dark:border-[#1F253D]">
              <Button onClick={() => setMaintModalOpen(false)} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleAddMaintenance} variant="primary" size="sm">Post Service Log & Expense</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
