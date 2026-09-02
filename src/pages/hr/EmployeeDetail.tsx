import React, { useState } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EmployeeDetail: React.FC = () => {
  const { navigate, selectedResourceId, employees, user } = useApp();

  const employee = employees.find((e) => e.id === selectedResourceId) || employees[0];
  const [activeTab, setActiveTab] = useState<'overview' | 'private' | 'contract' | 'leave' | 'skills'>('overview');

  const canViewPrivateInfo = ['Owner', 'Administrator', 'HR Manager', 'HR Officer'].includes(user.role);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('employees', 'overview')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('time-off', 'overview')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Request Time Off
          </button>
          <button
            onClick={() => navigate('payroll', 'overview')}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-orange-500/20"
          >
            View Payslip
          </button>
        </div>
      </div>

      {/* Header Profile Banner */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <img
              src={employee.avatar}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover ring-4 ring-orange-500/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 font-heading">{employee.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  {employee.status}
                </span>
              </div>
              <div className="text-sm font-semibold text-orange-400 mt-0.5">{employee.jobTitle}</div>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {employee.department}
                </span>
                <span>•</span>
                <span>{employee.workLocation}</span>
                <span>•</span>
                <span className="font-mono text-slate-500">{employee.employeeNumber}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-end text-xs shrink-0">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Monthly Compensation</span>
            <span className="text-xl font-black text-slate-100 font-mono">${employee.baseSalary.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block font-mono">{employee.payFrequency} Salary</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Work Overview' },
            { id: 'private', label: 'Private Information' },
            { id: 'contract', label: 'Contract & Compensation' },
            { id: 'leave', label: 'Leave Balances' },
            { id: 'skills', label: 'Skills & Goals' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 text-xs text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Contact Details</span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-400" />
                    <span>{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-orange-400" />
                    <span>{employee.phone}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Reporting Manager</span>
                <div className="font-semibold text-slate-100">{employee.managerName || 'Executive Committee'}</div>
                <div className="text-[10px] text-slate-400">Start Date: {employee.startDate}</div>
              </div>
            </div>

            {/* Assigned Equipment */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 uppercase text-[10px]">Assigned Company Assets</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employee.equipment?.map((eq) => (
                  <div key={eq.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-100">{eq.assetName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">SN: {eq.serialNumber}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">
                      {eq.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRIVATE INFORMATION */}
        {activeTab === 'private' && (
          <div className="space-y-4 text-xs text-slate-300">
            {canViewPrivateInfo ? (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="font-bold text-orange-400 uppercase text-[10px]">Confidential Personal Record</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block">Full Legal Name</span>
                    <span className="font-semibold text-slate-100">{employee.privateDetails?.legalName || employee.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Personal Email</span>
                    <span className="font-semibold text-slate-100">{employee.privateDetails?.personalEmail || employee.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date of Birth</span>
                    <span className="font-semibold text-slate-100">{employee.privateDetails?.dob || '1992-04-12'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nationality</span>
                    <span className="font-semibold text-slate-100">{employee.privateDetails?.nationality || 'United States'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 space-y-2">
                <Lock className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="font-bold text-slate-200">Restricted Access Data</div>
                <p className="text-[11px] text-slate-500">Private personal details are restricted to HR Officers & Administrators.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONTRACT */}
        {activeTab === 'contract' && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="font-bold text-slate-100 uppercase text-[10px]">Employment Agreement</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-slate-500 block">Employment Type</span>
                  <span className="font-bold text-orange-400">{employee.employmentType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Base Monthly Salary</span>
                  <span className="font-mono font-bold text-slate-100">${employee.baseSalary.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Pay Schedule</span>
                  <span className="font-bold text-slate-200">{employee.payFrequency}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LEAVE BALANCES */}
        {activeTab === 'leave' && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-purple-400 font-bold uppercase">Annual Leave</span>
                <div className="text-2xl font-black text-slate-100">17 / 21</div>
                <span className="text-[10px] text-slate-500">Days Remaining</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-cyan-400 font-bold uppercase">Sick Leave</span>
                <div className="text-2xl font-black text-slate-100">8 / 10</div>
                <span className="text-[10px] text-slate-500">Days Remaining</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase">Personal Days</span>
                <div className="text-2xl font-black text-slate-100">3 / 3</div>
                <span className="text-[10px] text-slate-500">Days Remaining</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SKILLS */}
        {activeTab === 'skills' && (
          <div className="space-y-4 text-xs text-slate-300">
            <h4 className="font-bold text-slate-200 uppercase text-[10px]">Verified Technical Competencies</h4>
            <div className="grid grid-cols-2 gap-3">
              {employee.skills.map((sk) => (
                <div key={sk.name} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-slate-100">{sk.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono font-bold text-[10px]">
                    {sk.level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
