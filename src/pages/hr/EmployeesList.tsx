import React, { useState } from 'react';
import {
  Search,
  Plus,
  Grid,
  List,
  Network,
  Building2,
  Mail,
  Phone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import type { EmploymentType } from '../../types';

export const EmployeesList: React.FC = () => {
  const { navigate, employees, createEmployee, departments } = useApp();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'orgChart'>('grid');
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  // New Employee Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone] = useState('+1 415 000 0000');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [workLocation, setWorkLocation] = useState('San Francisco HQ');
  const [employmentType] = useState<EmploymentType>('Full-time');
  const [baseSalary, setBaseSalary] = useState('9500');

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleCreate = () => {
    if (!name || !email || !jobTitle) return;
    createEmployee({
      name,
      email,
      phone: phone || '+1 415 000 0000',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      jobTitle,
      department,
      workLocation,
      startDate: new Date().toISOString().substring(0, 10),
      employmentType,
      status: 'Active',
      baseSalary: Number(baseSalary),
      payFrequency: 'Monthly',
      skills: [{ name: 'Enterprise SaaS', level: 'Advanced' }],
    });
    setCreateModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Employee Directory & Org Chart"
        subtitle="Central organization directory, employee work information, department records & structure."
        actions={
          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'grid' ? 'bg-orange-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'list' ? 'bg-orange-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('orgChart')}
                className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'orgChart' ? 'bg-orange-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Org Chart View"
              >
                <Network className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-orange-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Add Employee
            </button>
          </div>
        }
      />

      {/* Filter & Search Bar */}
      {viewMode !== 'orgChart' && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, job title, email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setSelectedDept('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedDept === 'all'
                  ? 'bg-slate-800 text-orange-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Depts ({employees.length})
            </button>
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDept(d.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedDept === d.name
                    ? 'bg-slate-800 text-orange-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 1: GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => navigate('employees', 'detail', emp.id)}
              className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 hover:border-orange-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={emp.avatar}
                    alt=""
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-orange-500/30 group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-100 font-heading group-hover:text-orange-400 transition-colors">
                      {emp.name}
                    </h3>
                    <div className="text-xs font-semibold text-slate-300">{emp.jobTitle}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      {emp.department}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  {emp.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 pt-3 border-t border-slate-800/80 font-sans">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{emp.phone}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {emp.skills.map((sk) => (
                  <span key={sk.name} className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-semibold">
                    {sk.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4 text-start">Employee</th>
                  <th className="p-4 text-start">Job Title & Dept</th>
                  <th className="p-4 text-start">Location</th>
                  <th className="p-4 text-start">Start Date</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/40">
                    <td className="p-4 flex items-center gap-3">
                      <img src={emp.avatar} alt="" className="w-8 h-8 rounded-xl object-cover" />
                      <div>
                        <div className="font-bold text-slate-100">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{emp.employeeNumber}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{emp.jobTitle}</div>
                      <div className="text-[10px] text-slate-400">{emp.department}</div>
                    </td>
                    <td className="p-4 text-slate-300">{emp.workLocation}</td>
                    <td className="p-4 text-slate-400">{emp.startDate}</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => navigate('employees', 'detail', emp.id)}
                        className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 font-bold text-xs"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: INTERACTIVE ORG CHART VIEW */}
      {viewMode === 'orgChart' && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-8 overflow-x-auto">
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-slate-100 font-heading">Interactive Company Hierarchy</h3>
            <p className="text-xs text-slate-400">Click any profile card to inspect employee record.</p>
          </div>

          {/* Level 1: CEO */}
          <div className="flex justify-center">
            <div
              onClick={() => navigate('employees', 'detail', employees[0].id)}
              className="p-4 rounded-2xl bg-gradient-to-b from-orange-950/80 to-slate-950 border border-orange-500/40 text-center space-y-2 cursor-pointer shadow-xl hover:scale-105 transition-transform w-64"
            >
              <img src={employees[0].avatar} alt="" className="w-12 h-12 rounded-2xl object-cover mx-auto ring-2 ring-orange-400" />
              <div>
                <div className="font-bold text-slate-100 text-xs">{employees[0].name}</div>
                <div className="text-[11px] text-orange-400 font-semibold">{employees[0].jobTitle}</div>
              </div>
            </div>
          </div>

          {/* Line Down */}
          <div className="w-0.5 h-6 bg-slate-700 mx-auto" />

          {/* Level 2: Tech Lead & VP Finance & Legal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {employees.slice(1, 4).map((emp) => (
              <div
                key={emp.id}
                onClick={() => navigate('employees', 'detail', emp.id)}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2 cursor-pointer hover:border-orange-500/40 transition-colors"
              >
                <img src={emp.avatar} alt="" className="w-10 h-10 rounded-xl object-cover mx-auto" />
                <div>
                  <div className="font-bold text-slate-100 text-xs">{emp.name}</div>
                  <div className="text-[11px] text-cyan-400 font-semibold">{emp.jobTitle}</div>
                  <div className="text-[10px] text-slate-500">{emp.department}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Add New Employee"
          subtitle="Create employee profile and initiate onboarding workflow."
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tariq Al-Mansoor" className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Work Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tariq@nextaura.ai" className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Job Title</label>
                <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Full Stack Engineer" className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Department</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Work Location</label>
                <input type="text" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200" />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Base Monthly Salary ($)</label>
                <input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-orange-400 font-bold" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 rounded-xl bg-orange-500 text-slate-950 font-bold shadow-lg shadow-orange-500/20">Create Employee Profile</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
