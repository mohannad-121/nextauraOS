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
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { employeeService } from '../../services/employeeService';
import type { EmploymentType } from '../../types';

export const EmployeesList: React.FC = () => {
  const { navigate, employees, createEmployee, updateEmployeeDetails, departments, createDepartment, currentOrg, user, activeSubView } = useApp();
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
      const newEmp = await createEmployee({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim(),
        department,
        workLocation: workLocation.trim() || 'HQ',
        employmentType,
        baseSalary: baseSalary ? Number(baseSalary) : 5000,
        payFrequency: 'Monthly',
        skills: [],
        avatar: '',
        managerEmployeeId: managerEmployeeId || undefined,
        startDate: new Date().toISOString().substring(0, 10),
        status: 'Active',
      });

      if (selectedImageFile && currentOrg && newEmp?.id) {
        const uploadedAvatarKey = await employeeService.uploadEmployeeAvatar(currentOrg.id, newEmp.id, selectedImageFile);
        if (uploadedAvatarKey) {
          await updateEmployeeDetails(newEmp.id, { avatar: uploadedAvatarKey });
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
    <div className="space-y-6">
      <PageHeader
        category="People OS"
        title="Employee Directory"
        subtitle="Manage workforce personnel profiles, department structures, and reporting hierarchies."
        actions={
          <div className="flex items-center gap-2.5">
            {/* View Mode Segmented Switch */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#101426] rounded-xl border border-slate-200/80 dark:border-[#1F253D]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#161B30] text-slate-900 dark:text-[#F4F6FF] shadow-xs border border-transparent dark:border-[#2A3048]'
                    : 'text-slate-500 dark:text-[#6B7694] hover:text-slate-900 dark:hover:text-[#F4F6FF]'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#161B30] text-slate-900 dark:text-[#F4F6FF] shadow-xs border border-transparent dark:border-[#2A3048]'
                    : 'text-slate-500 dark:text-[#6B7694] hover:text-slate-900 dark:hover:text-[#F4F6FF]'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('orgChart')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'orgChart'
                    ? 'bg-white dark:bg-[#161B30] text-slate-900 dark:text-[#F4F6FF] shadow-xs border border-transparent dark:border-[#2A3048]'
                    : 'text-slate-500 dark:text-[#6B7694] hover:text-slate-900 dark:hover:text-[#F4F6FF]'
                }`}
                title="Organization Chart"
              >
                <Network className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                resetEmployeeForm();
                setCreateModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_14px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>
        }
      />

      {/* Search & Department Filter Toolbar */}
      {viewMode !== 'orgChart' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 dark:text-[#6B7694] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, job title, email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-xs text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#101426] rounded-xl border border-transparent dark:border-[#1F253D] overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setSelectedDept('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedDept === 'all'
                  ? 'bg-white dark:bg-[#161B30] text-slate-900 dark:text-[#F4F6FF] shadow-xs font-semibold border border-transparent dark:border-[#2A3048]'
                  : 'text-slate-500 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF]'
              }`}
            >
              All Depts ({employees.length})
            </button>
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDept(d.name)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedDept === d.name
                    ? 'bg-white dark:bg-[#161B30] text-slate-900 dark:text-[#F4F6FF] shadow-xs font-semibold border border-transparent dark:border-[#2A3048]'
                    : 'text-slate-500 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF]'
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
        <>
          {filteredEmployees.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={search || selectedDept !== 'all' ? 'No personnel match your search' : 'No employees listed'}
              description={
                search || selectedDept !== 'all'
                  ? 'Try clearing your search query or department filter.'
                  : 'Add team members to build your employee directory and organization chart.'
              }
              actionLabel="Add Employee"
              onAction={() => { resetEmployeeForm(); setCreateModalOpen(true); }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => navigate('employees', 'detail', emp.id)}
                  className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-[#7568E8]/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={emp.avatar}
                        name={emp.name}
                        className="w-11 h-11 rounded-xl"
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF] font-heading group-hover:text-[#7568E8] transition-colors">
                          {emp.name}
                        </h3>
                        <div className="text-xs text-slate-600 dark:text-[#A3ABC5] font-medium">{emp.jobTitle}</div>
                        <div className="text-[11px] text-slate-400 dark:text-[#6B7694] flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400 dark:text-[#6B7694]" />
                          {emp.department}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#23C99C] border border-emerald-500/20 text-[10px] font-medium">
                      {emp.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 dark:text-[#A3ABC5] pt-3 border-t border-slate-100 dark:border-[#1F253D]">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-[#6B7694] shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    {emp.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-[#6B7694] shrink-0" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* VIEW 2: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-[#101426] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A3ABC5] border-b border-slate-200/80 dark:border-[#1F253D]">
                <tr>
                  <th className="p-3.5 text-start">Employee</th>
                  <th className="p-3.5 text-start">Job Title & Dept</th>
                  <th className="p-3.5 text-start">Location</th>
                  <th className="p-3.5 text-start">Start Date</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1F253D] font-medium">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-[#101426]/60 transition-colors">
                    <td className="p-3.5 flex items-center gap-3">
                      <Avatar src={emp.avatar} name={emp.name} className="w-8 h-8 rounded-lg" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#6B7694] font-mono">{emp.employeeNumber}</div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-900 dark:text-[#F4F6FF]">{emp.jobTitle}</div>
                      <div className="text-[11px] text-slate-500 dark:text-[#A3ABC5]">{emp.department}</div>
                    </td>
                    <td className="p-3.5 text-slate-500 dark:text-[#A3ABC5]">{emp.workLocation}</td>
                    <td className="p-3.5 text-slate-500 dark:text-[#A3ABC5]">{emp.startDate}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#23C99C] border border-emerald-500/20 text-[10px] font-medium">
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => navigate('employees', 'detail', emp.id)}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#101426] dark:hover:bg-[#1F253D] text-slate-800 dark:text-[#F4F6FF] border border-transparent dark:border-[#2A3048] text-xs font-medium transition-colors"
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

      {/* VIEW 3: ORG CHART VIEW */}
      {viewMode === 'orgChart' && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-[#F4F6FF] font-heading">Tenant Organization Hierarchy</h3>
            <p className="text-xs text-slate-500 dark:text-[#A3ABC5]">Real employee reporting relationships and department groupings.</p>
          </div>

          {employees.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-[#6B7694] text-xs">
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
                      className="p-4 rounded-2xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#1F253D] hover:border-[#7568E8] dark:hover:border-[#7568E8] text-center space-y-2 cursor-pointer shadow-xs transition-all w-56 hover:shadow-[0_0_15px_rgba(117,104,232,0.15)]"
                    >
                      <Avatar src={emp.avatar} name={emp.name} className="w-12 h-12 rounded-xl mx-auto" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-[#F4F6FF] text-xs truncate">{emp.name}</div>
                        <div className="text-[11px] text-[#7568E8] font-medium truncate">{emp.jobTitle}</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#6B7694] mt-0.5">{emp.department}</div>
                      </div>
                    </div>

                    {directReports.length > 0 && (
                      <>
                        <div className="w-0.5 h-6 bg-slate-300 dark:bg-[#2A3048]" />
                        <div className="flex flex-wrap justify-center gap-6 pt-2 border-t border-slate-200 dark:border-[#2A3048]">
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
                <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-[#101426] border border-amber-500/20 dark:border-[#1F253D] text-center space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">
                    Department Grouping Fallback
                  </span>
                  <p className="text-xs text-slate-600 dark:text-[#A3ABC5]">
                    Employees are grouped by department. Assign reporting managers in employee profiles to view tree relationships.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {departments.length > 0
                    ? departments.map((dept) => {
                        const deptEmps = employees.filter((e) => e.department === dept.name);
                        if (deptEmps.length === 0) return null;

                        return (
                          <div key={dept.id} className="p-5 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/80 dark:border-[#1F253D] space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#1F253D] pb-2.5">
                              <h4 className="font-semibold text-slate-900 dark:text-[#F4F6FF] text-xs flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[#7568E8]" />
                                {dept.name} ({deptEmps.length} Employees)
                              </h4>
                              {dept.managerName && (
                                <span className="text-[11px] text-slate-500 dark:text-[#6B7694]">Manager: {dept.managerName}</span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {deptEmps.map((emp) => (
                                <div
                                  key={emp.id}
                                  onClick={() => navigate('employees', 'detail', emp.id)}
                                  className="p-3.5 rounded-xl bg-white dark:bg-[#161B30] border border-slate-200 dark:border-[#2A3048] hover:border-[#7568E8] dark:hover:border-[#7568E8] transition-all cursor-pointer flex items-center gap-3 shadow-xs"
                                >
                                  <Avatar src={emp.avatar} name={emp.name} className="w-9 h-9 rounded-lg shrink-0" />
                                  <div className="truncate">
                                    <div className="font-semibold text-slate-900 dark:text-[#F4F6FF] text-xs truncate">{emp.name}</div>
                                    <div className="text-[11px] text-slate-500 dark:text-[#A3ABC5] truncate">{emp.jobTitle}</div>
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
                            className="p-3.5 rounded-xl bg-white dark:bg-[#161B30] border border-slate-200 dark:border-[#2A3048] hover:border-[#7568E8] dark:hover:border-[#7568E8] transition-all cursor-pointer flex items-center gap-3 shadow-xs"
                          >
                            <Avatar src={emp.avatar} name={emp.name} className="w-9 h-9 rounded-lg shrink-0" />
                            <div className="truncate">
                              <div className="font-semibold text-slate-900 dark:text-[#F4F6FF] text-xs truncate">{emp.name}</div>
                              <div className="text-[11px] text-slate-500 dark:text-[#A3ABC5] truncate">{emp.jobTitle}</div>
                              <div className="text-[10px] text-slate-400 dark:text-[#6B7694]">{emp.department || 'General'}</div>
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
          <div className="space-y-4 text-xs text-slate-700 dark:text-[#A3ABC5]">
            {/* Profile Photo Upload */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/80 dark:border-[#1F253D]">
              <Avatar
                src={avatarPreviewUrl || ''}
                name={name || 'New Employee'}
                className="w-14 h-14 rounded-xl object-cover shrink-0"
              />
              <div className="space-y-1">
                <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">Profile Photo</div>
                <p className="text-[11px] text-slate-400 dark:text-[#6B7694]">JPG, PNG, or WebP up to 5 MB</p>
                <div className="flex items-center gap-2 pt-0.5">
                  <label className="px-3 py-1.5 rounded-lg bg-[#7568E8]/10 text-[#7568E8] hover:bg-[#7568E8]/20 border border-[#7568E8]/30 font-medium text-xs cursor-pointer flex items-center gap-1.5 transition-colors">
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
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#161B30] dark:hover:bg-[#1F253D] text-slate-700 dark:text-[#F4F6FF] border border-transparent dark:border-[#2A3048] font-medium text-xs flex items-center gap-1 transition-colors"
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
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mohannad Abuayyash"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder:text-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Work Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m.abuayyash@nextaura.ai"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder:text-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Job Title *</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder:text-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium">Department *</label>
                  {['Owner', 'Administrator'].includes(user.role) && (
                    <button
                      type="button"
                      onClick={() => setDeptModalOpen(true)}
                      className="text-[11px] font-medium text-[#7568E8] hover:underline"
                    >
                      + Create Department
                    </button>
                  )}
                </div>

                {departments.length === 0 ? (
                  <div className="space-y-1.5">
                    <div className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs flex items-center justify-between">
                      <span>No departments yet</span>
                      <button
                        type="button"
                        onClick={() => setDeptModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-[#7568E8] text-white font-medium text-[10px]"
                      >
                        + Create Department
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
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
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Phone (Optional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 0192"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder:text-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Work Location</label>
                <input
                  type="text"
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  placeholder="Main Office / Remote"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder:text-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Base Monthly Salary ($)</label>
                <input
                  type="number"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  placeholder="5000"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] font-semibold focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Reporting Manager (Optional)</label>
              <select
                value={managerEmployeeId}
                onChange={(e) => setManagerEmployeeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
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
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-[#1F253D]">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#101426] text-slate-700 dark:text-[#A3ABC5] text-xs font-medium hover:bg-slate-200 dark:hover:bg-[#1F253D] border border-transparent dark:border-[#2A3048] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_14px_rgba(117,104,232,0.35)] disabled:opacity-50 transition-colors"
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
          <div className="space-y-4 text-xs text-slate-700 dark:text-[#A3ABC5]">
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Department Name *</label>
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Engineering / Product / Finance"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder:text-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Description (Optional)</label>
              <textarea
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                placeholder="Core responsibilities and scope of this department..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder:text-[#6B7694] focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Department Manager (Optional)</label>
              <select
                value={newDeptManagerId}
                onChange={(e) => setNewDeptManagerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] focus:outline-none"
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
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deptErrorMessage}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-[#1F253D]">
              <button
                type="button"
                onClick={() => setDeptModalOpen(false)}
                disabled={isCreatingDept}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#101426] text-slate-700 dark:text-[#A3ABC5] text-xs font-medium hover:bg-slate-200 dark:hover:bg-[#1F253D] border border-transparent dark:border-[#2A3048] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateDepartmentSubmit}
                disabled={isCreatingDept}
                className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_14px_rgba(117,104,232,0.35)] disabled:opacity-50 transition-colors"
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
