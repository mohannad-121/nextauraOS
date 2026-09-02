import React, { useState } from 'react';
import { Car, Plus, Wrench } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';

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
    <div className="space-y-8">
      <PageHeader
        title="Fleet Vehicle Management"
        subtitle="Manage company vehicles, odometer logs, fuel efficiency & service maintenance logs."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (vehicles.length > 0) setMaintVehicleId(vehicles[0].id);
                setMaintModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <Wrench className="w-4 h-4 text-blue-400" />
              Add Service Log
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Add Vehicle
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Fleet Vehicles" value={vehicles.length} comparisonText="company assets" accentColor="azure" />
        <StatCard title="Active & Assigned" value={activeCount} change={0} accentColor="emerald" />
        <StatCard title="Monthly Fleet Cost" value={totalFleetCost} isCurrency change={-2.4} accentColor="indigo" />
        <StatCard title="Maintenance Due" value={1} comparisonText="service alert" accentColor="amber" />
      </div>

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {vehicles.map((v) => (
          <div key={v.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Car className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                {v.status}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100 font-heading">{v.name}</h3>
              <div className="text-xs text-slate-400">{v.make} {v.model} ({v.year})</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">License Plate</span>
                <span className="font-mono font-bold text-slate-200">{v.licensePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Driver</span>
                <span className="font-semibold text-blue-400">{v.assignedEmployeeName || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Odometer</span>
                <span className="font-mono font-bold text-slate-100">{v.odometerKm.toLocaleString()} km</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Maintenance Logs & Accounting Connection */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="text-sm font-bold text-slate-100 font-heading">Maintenance & Service Records</h4>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">AUTOMATIC ACCOUNTING EXPENSE LINKED</span>
        </div>

        <div className="space-y-3">
          {vehicleMaintenance.map((m) => (
            <div key={m.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div>
                <div className="font-bold text-slate-100">{m.vehicleName} — {m.type}</div>
                <div className="text-[10px] text-slate-400">{m.vendor} • Date: {m.date}</div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono font-bold text-slate-100 text-sm">${m.cost.toLocaleString()}</span>
                <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
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
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 mb-1">Vehicle Name / Label</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Executive Tesla Model Y" className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Make & Model</label>
                <input type="text" value={`${make} ${model}`} onChange={(e) => setModel(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">License Plate</label>
                <input type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-blue-400 font-bold" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Assigned Driver Name</label>
              <input type="text" value={assignedEmployeeName} onChange={(e) => setAssignedEmployeeName(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200" />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 rounded-xl bg-blue-500 text-slate-950 font-bold shadow-lg shadow-blue-500/20">Register Vehicle</button>
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
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 mb-1">Select Fleet Vehicle</label>
              <select value={maintVehicleId} onChange={(e) => setMaintVehicleId(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-semibold">
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Service Type</label>
                <select value={maintType} onChange={(e) => setMaintType(e.target.value as any)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                  <option value="Oil Change">Oil Change</option>
                  <option value="Tires">Tires</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Repair">Repair</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Service Cost ($)</label>
                <input type="number" value={maintCost} onChange={(e) => setMaintCost(Number(e.target.value))} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Vendor Name</label>
                <input type="text" value={maintVendor} onChange={(e) => setMaintVendor(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Current Odometer (km)</label>
                <input type="number" value={maintOdometer} onChange={(e) => setMaintOdometer(Number(e.target.value))} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setMaintModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200">Cancel</button>
              <button onClick={handleAddMaintenance} className="px-5 py-2 rounded-xl bg-blue-500 text-slate-950 font-bold shadow-lg shadow-blue-500/20">Post Service Log & Expense</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
