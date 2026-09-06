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
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { employeeService } from '../../services/employeeService';
import type { EmploymentType } from '../../types';

export const EmployeesList: React.FC = () => {
  const { navigate, employees, createEmployee, departments, createDepartment, currentOrg, user, activeSubView } = useApp();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'orgChart'>(
    activeSubView === 'org-chart' ? 'orgChart' : 'grid'
  );
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  React.useEffect(() => {
    if (activeSubView === 'org-chart') {
      setViewMode('orgChart');
    } else if (activeSubView === 'overview') {
      setViewMode('grid');
    }
  }, [activeSubView]);

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isDeptModalOpen, setDeptModalOpen] = useState(false);

  // New Department Form State
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptManagerId, setNewDeptManagerId] = useState('');
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [deptErrorMessage, setDeptErrorMessage] = useState<string | null>(null);

  // New Employee Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [workLocation, setWorkLocation] = useState('HQ');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('Full-time');
  const [baseSalary, setBaseSalary] = useState('');
  const [managerEmployeeId, setManagerEmployeeId] = useState('');

  // Profile Photo Upload State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      setErrorMessage('Please upload a JPG, PNG, or WebP image up to 5 MB.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Please upload a JPG, PNG, or WebP image up to 5 MB.');
      return;
    }

    setErrorMessage(null);
    setSelectedImageFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setAvatarPreviewUrl(null);
  };

  const handleCreateDepartmentSubmit = async () => {
    if (!newDeptName.trim()) {
      setDeptErrorMessage('Department name is required.');
      return;
    }

    setDeptErrorMessage(null);
    setIsCreatingDept(true);

    try {
      const selectedManager = employees.find((e) => e.id === newDeptManagerId);
      const createdDept = await createDepartment({
        name: newDeptName.trim(),
        description: newDeptDesc.trim(),
        managerEmployeeId: newDeptManagerId || undefined,
        managerName: selectedManager?.name || undefined,
      });

      setDepartment(createdDept.name);
      setNewDeptName('');
      setNewDeptDesc('');
      setNewDeptManagerId('');
      setDeptModalOpen(false);
    } catch (err: any) {
      setDeptErrorMessage(err.message || 'Failed to create department.');
    } finally {
      setIsCreatingDept(false);
    }
  };

  const resetEmployeeForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setJobTitle('');
    setDepartment('');
    setWorkLocation('HQ');
    setEmploymentType('Full-time');
    setBaseSalary('');
    setSelectedImageFile(null);
    setAvatarPreviewUrl(null);
    setErrorMessage(null);
  };

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !jobTitle.trim()) {
      setErrorMessage('Full name, email, and job title are required.');
      return;
    }

    if (!department) {
      setErrorMessage('Please select or create a department.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const selectedMgr = employees.find((e) => e.id === managerEmployeeId);
      const newEmp = await createEmployee({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar: '',
        jobTitle: jobTitle.trim(),
        department,
        workLocation: workLocation.trim() || 'HQ',
        startDate: new Date().toISOString().substring(0, 10),
        employmentType,
        status: 'Active',
        baseSalary: Number(baseSalary) || 0,
        payFrequency: 'Monthly',
        managerEmployeeId: managerEmployeeId || undefined,
        managerName: selectedMgr?.name || undefined,
        skills: [],
      });

      if (selectedImageFile && currentOrg?.id) {
        try {
          const avatarPath = await employeeService.uploadEmployeeAvatar(
            currentOrg.id,
            newEmp.id,
            selectedImageFile
          );
          await employeeService.updateEmployeeDetails(currentOrg.id, newEmp.id, { avatar: avatarPath });
        } catch (uploadErr: any) {
          console.error('Avatar upload failure:', uploadErr);
          alert('Employee was created, but the profile photo could not be uploaded. You can add it from the employee profile.');
        }
      }

      resetEmployeeForm();
      setCreateModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create employee. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
              onClick={() => {
                resetEmployeeForm();
                setCreateModalOpen(true);
              }}
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
                  <Avatar
                    src={emp.avatar}
                    name={emp.name}
                    className="w-12 h-12 rounded-2xl ring-2 ring-orange-500/30 group-hover:scale-105 transition-transform"
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
                {emp.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{emp.phone}</span>
                  </div>
                )}
              </div>

              {emp.skills && emp.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {emp.skills.map((sk) => (
                    <span key={sk.name} className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-semibold">
                      {sk.name}
                    </span>
                  ))}
                </div>
              )}
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
                      <Avatar src={emp.avatar} name={emp.name} className="w-8 h-8 rounded-xl" />
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

      {/* VIEW 3: REAL INTERACTIVE ORG CHART VIEW */}
      {viewMode === 'orgChart' && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-8 overflow-x-auto">
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-slate-100 font-heading">Tenant Organization Hierarchy</h3>
            <p className="text-xs text-slate-400">Real employee reporting relationships and department groupings.</p>
          </div>

          {employees.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No employees registered yet to render the organization chart.
            </div>
          ) : (() => {
            const hasManagerRelationships = employees.some(
              (e) => e.managerEmployeeId && employees.some((m) => m.id === e.managerEmployeeId)
            );

            if (hasManagerRelationships) {
              const rootEmployees = employees.filter(
                (e) => !e.managerEmployeeId || !employees.some((m) => m.id === e.managerEmployeeId)
              );

              const renderTree = (emp: any) => {
                const directReports = employees.filter((e) => e.managerEmployeeId === emp.id);
                return (
                  <div key={emp.id} className="flex flex-col items-center space-y-3">
                    <div
                      onClick={() => navigate('employees', 'detail', emp.id)}
                      className="p-4 rounded-2xl bg-slate-950 border border-orange-500/30 hover:border-orange-500 text-center space-y-2 cursor-pointer shadow-xl hover:scale-105 transition-all w-56"
                    >
                      <Avatar src={emp.avatar} name={emp.name} className="w-12 h-12 rounded-2xl mx-auto ring-2 ring-orange-500/40" />
                      <div>
                        <div className="font-bold text-slate-100 text-xs truncate">{emp.name}</div>
                        <div className="text-[11px] text-orange-400 font-semibold truncate">{emp.jobTitle}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{emp.department}</div>
                      </div>
                    </div>

                    {directReports.length > 0 && (
                      <>
                        <div className="w-0.5 h-6 bg-slate-700" />
                        <div className="flex flex-wrap justify-center gap-6 pt-2 border-t border-slate-800">
                          {directReports.map((report) => renderTree(report))}
                        </div>
                      </>
                    )}
                  </div>
                );
              };

              return (
                <div className="space-y-8">
                  <div className="flex flex-wrap justify-center gap-8">
                    {rootEmployees.map((root) => renderTree(root))}
                  </div>
                </div>
              );
            }

            // Fallback when no direct reporting hierarchy is configured: Department grouping
            return (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                    No Direct Reporting Hierarchy Configured Yet
                  </span>
                  <p className="text-xs text-slate-400">
                    Employees are grouped by department. Assign reporting managers in employee profiles to view tree relationships.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {departments.length > 0
                    ? departments.map((dept) => {
                        const deptEmps = employees.filter((e) => e.department === dept.name);
                        if (deptEmps.length === 0) return null;

                        return (
                          <div key={dept.id} className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                              <h4 className="font-bold text-orange-400 text-xs uppercase flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-orange-400" />
                                {dept.name} ({deptEmps.length} Employees)
                              </h4>
                              {dept.managerName && (
                                <span className="text-[11px] text-slate-400">Manager: {dept.managerName}</span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {deptEmps.map((emp) => (
                                <div
                                  key={emp.id}
                                  onClick={() => navigate('employees', 'detail', emp.id)}
                                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-orange-500/40 transition-all cursor-pointer flex items-center gap-3"
                                >
                                  <Avatar src={emp.avatar} name={emp.name} className="w-10 h-10 rounded-xl shrink-0" />
                                  <div className="truncate">
                                    <div className="font-bold text-slate-100 text-xs truncate">{emp.name}</div>
                                    <div className="text-[11px] text-slate-400 truncate">{emp.jobTitle}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {employees.map((emp) => (
                          <div
                            key={emp.id}
                            onClick={() => navigate('employees', 'detail', emp.id)}
                            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-orange-500/40 transition-all cursor-pointer flex items-center gap-3"
                          >
                            <Avatar src={emp.avatar} name={emp.name} className="w-10 h-10 rounded-xl shrink-0" />
                            <div className="truncate">
                              <div className="font-bold text-slate-100 text-xs truncate">{emp.name}</div>
                              <div className="text-[11px] text-slate-400 truncate">{emp.jobTitle}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{emp.department || 'General'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            );
          })()}
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
          <div className="space-y-5 text-xs text-slate-300">
            {/* Profile Photo Section */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
              <Avatar
                src={avatarPreviewUrl || ''}
                name={name || 'New Employee'}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-orange-500/30 shrink-0"
              />
              <div className="space-y-1.5">
                <div className="font-bold text-slate-100">Profile Photo</div>
                <p className="text-[10px] text-slate-400">JPG, PNG, or WebP up to 5 MB</p>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 font-bold text-xs cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    {avatarPreviewUrl ? 'Change Photo' : 'Upload Photo'}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                  {avatarPreviewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mohannad Abuayyash"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Work Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m.abuayyash@nextaura.ai"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Job Title *</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-medium">Department *</label>
                  {['Owner', 'Administrator'].includes(user.role) && (
                    <button
                      type="button"
                      onClick={() => setDeptModalOpen(true)}
                      className="text-[10px] font-bold text-orange-400 hover:text-orange-300"
                    >
                      + Create Department
                    </button>
                  )}
                </div>

                {departments.length === 0 ? (
                  <div className="space-y-1.5">
                    <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between">
                      <span>No departments yet</span>
                      <button
                        type="button"
                        onClick={() => setDeptModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-orange-500 text-slate-950 font-bold text-[10px]"
                      >
                        + Create Department
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:border-orange-500 outline-none"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Phone (Optional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 0192"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Work Location</label>
                <input
                  type="text"
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  placeholder="e.g. Main Office / Remote"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Base Monthly Salary ($)</label>
                <input
                  type="number"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-orange-400 font-bold focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Reporting Manager (Optional)</label>
              <select
                value={managerEmployeeId}
                onChange={(e) => setManagerEmployeeId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:border-orange-500 outline-none"
              >
                <option value="">No Direct Manager (Top-level / Executive)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 disabled:opacity-50 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-orange-500/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Employee...' : 'Create Employee Profile'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Department Modal */}
      {isDeptModalOpen && (
        <Modal
          isOpen={isDeptModalOpen}
          onClose={() => setDeptModalOpen(false)}
          title="Create New Department"
          subtitle="Add a tenant-owned department for your organization."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Department Name *</label>
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Engineering / Product / Finance"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Description (Optional)</label>
              <textarea
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                placeholder="Core responsibilities and scope of this department..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-orange-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Department Manager (Optional)</label>
              <select
                value={newDeptManagerId}
                onChange={(e) => setNewDeptManagerId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:border-orange-500 outline-none"
              >
                <option value="">No Manager Assigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            {deptErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deptErrorMessage}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeptModalOpen(false)}
                disabled={isCreatingDept}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 disabled:opacity-50 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateDepartmentSubmit}
                disabled={isCreatingDept}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-orange-500/20 disabled:opacity-50"
              >
                {isCreatingDept ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
