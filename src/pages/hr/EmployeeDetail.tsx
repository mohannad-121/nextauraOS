import React, { useState } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Lock,
  ArrowLeft,
  Upload,
  X,
  Camera,
  AlertCircle,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { employeeService } from '../../services/employeeService';

export const EmployeeDetail: React.FC = () => {
  const { navigate, selectedResourceId, employees, user, currentOrg, updateEmployeeDetails } = useApp();

  const employee = employees.find((e) => e.id === selectedResourceId);
  const [activeTab, setActiveTab] = useState<'overview' | 'private' | 'contract' | 'leave' | 'skills'>('overview');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Contract & Compensation editing state
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [editBaseSalary, setEditBaseSalary] = useState(0);
  const [editPayFrequency, setEditPayFrequency] = useState<'Weekly' | 'Monthly' | 'Bi-Weekly'>('Monthly');
  const [editEmploymentType, setEditEmploymentType] = useState<any>('Full-time');
  const [editManagerId, setEditManagerId] = useState('');
  const [isSavingContract, setIsSavingContract] = useState(false);

  // Guard against missing or deleted employee record - prevents blank screen rendering crash!
  if (!employee) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
          <Building2 className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Employee Record Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The requested employee record is unavailable or may have been deleted.
          </p>
        </div>
        <Button
          onClick={() => navigate('employees', 'overview')}
          variant="primary"
          size="sm"
        >
          Back to Employee Directory
        </Button>
      </div>
    );
  }

  const canViewPrivateInfo = ['Owner', 'Administrator', 'HR Manager', 'HR Officer'].includes(user.role);
  const canEditPhoto = ['Owner', 'Administrator', 'HR Manager'].includes(user.role);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg?.id) return;

    setPhotoError(null);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      setPhotoError('Please upload a JPG, PNG, or WebP image up to 5 MB.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Please upload a JPG, PNG, or WebP image up to 5 MB.');
      return;
    }

    setIsUploadingPhoto(true);
    const oldAvatarPath = employee.avatar;

    try {
      const avatarPath = await employeeService.uploadEmployeeAvatar(
        currentOrg.id,
        employee.id,
        file
      );

      await employeeService.updateEmployeeDetails(currentOrg.id, employee.id, {
        avatar: avatarPath,
      });

      updateEmployeeDetails(employee.id, { avatar: avatarPath });

      // Clean up previous avatar if it was stored in bucket
      if (oldAvatarPath && oldAvatarPath !== avatarPath) {
        employeeService.deleteEmployeeAvatar(oldAvatarPath).catch(() => {});
      }
    } catch (err: any) {
      console.error('Failed uploading profile image:', err);
      setPhotoError(err.message || 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentOrg?.id) return;
    setPhotoError(null);
    setIsUploadingPhoto(true);

    const oldAvatarPath = employee.avatar;

    try {
      await employeeService.updateEmployeeDetails(currentOrg.id, employee.id, {
        avatar: '',
      });

      updateEmployeeDetails(employee.id, { avatar: '' });

      if (oldAvatarPath) {
        employeeService.deleteEmployeeAvatar(oldAvatarPath).catch(() => {});
      }
    } catch (err: any) {
      console.error('Failed removing profile image:', err);
      setPhotoError(err.message || 'Failed to remove photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation & Context Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('employees', 'overview')}
          className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => navigate('time-off', 'overview')}
            variant="secondary"
            size="sm"
            icon={<Calendar className="w-4 h-4" />}
          >
            Request Time Off
          </Button>
          <Button
            onClick={() => navigate('payroll', 'overview')}
            variant="primary"
            size="sm"
            icon={<CreditCard className="w-4 h-4" />}
          >
            View Payslip
          </Button>
        </div>
      </div>

      {photoError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{photoError}</span>
          </div>
          <button onClick={() => setPhotoError(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Profile Banner Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <Avatar
                src={employee.avatar}
                name={employee.name}
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-sm"
              />
              {canEditPhoto && (
                <label className="absolute inset-0 bg-slate-900/70 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-semibold">
                  <Camera className="w-5 h-5 mb-0.5" />
                  {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    disabled={isUploadingPhoto}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{employee.name}</h1>
                <StatusBadge status={employee.status} />
              </div>
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-0.5">{employee.jobTitle}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2.5 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {employee.department}
                </span>
                <span>•</span>
                <span>{employee.workLocation || 'HQ'}</span>
                <span>•</span>
                <span className="font-mono text-slate-400">{employee.employeeNumber}</span>
              </div>

              {canEditPhoto && (
                <div className="flex items-center gap-3 mt-3">
                  <label className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    {employee.avatar ? 'Replace Photo' : 'Upload Photo'}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      disabled={isUploadingPhoto}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {employee.avatar && (
                    <button
                      onClick={handleRemovePhoto}
                      disabled={isUploadingPhoto}
                      className="text-[11px] font-medium text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Remove Photo
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-right shrink-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Monthly Compensation</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              ${(employee.baseSalary || 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {employee.payFrequency || 'Monthly'} Salary
            </span>
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3 overflow-x-auto">
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 text-xs text-slate-600 dark:text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Contact Details</span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate font-medium">{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-medium">{employee.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Reporting Manager</span>
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{employee.managerName || 'Executive Leadership'}</div>
                <div className="text-[11px] text-slate-500">Start Date: {employee.startDate}</div>
              </div>
            </div>

            {/* Assigned Equipment */}
            {employee.equipment && employee.equipment.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Assigned Company Assets</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {employee.equipment.map((eq) => (
                    <div key={eq.id} className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{eq.assetName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SN: {eq.serialNumber}</div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-semibold">
                        {eq.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRIVATE INFORMATION */}
        {activeTab === 'private' && (
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            {canViewPrivateInfo ? (
              <div className="p-6 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-4">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Confidential Personal Record</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Full Legal Name</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{employee.privateDetails?.legalName || employee.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Personal Email</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{employee.privateDetails?.personalEmail || employee.email}</span>
                  </div>
                  {employee.privateDetails?.dob && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Date of Birth</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{employee.privateDetails.dob}</span>
                    </div>
                  )}
                  {employee.privateDetails?.nationality && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Nationality</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{employee.privateDetails.nationality}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-slate-500 space-y-2">
                <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                <div className="font-semibold text-slate-900 dark:text-slate-100">Restricted Access Data</div>
                <p className="text-xs text-slate-500">Private personal details are restricted to HR Officers & Administrators.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONTRACT */}
        {activeTab === 'contract' && (
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-6 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Employment & Compensation Details</h4>
                {['Owner', 'Administrator', 'HR Manager'].includes(user.role) && !isEditingContract && (
                  <Button
                    onClick={() => {
                      setEditBaseSalary(employee.baseSalary || 0);
                      setEditPayFrequency(employee.payFrequency || 'Monthly');
                      setEditEmploymentType(employee.employmentType || 'Full-time');
                      setEditManagerId(employee.managerEmployeeId || '');
                      setIsEditingContract(true);
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    Edit Compensation & Manager
                  </Button>
                )}
              </div>

              {!isEditingContract ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Employment Type</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{employee.employmentType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Base Monthly Salary</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">${(employee.baseSalary || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Pay Schedule</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{employee.payFrequency || 'Monthly'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Direct Manager</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{employee.managerName || 'No Direct Manager (Top-level)'}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Base Monthly Salary ($)</label>
                      <input
                        type="number"
                        value={editBaseSalary}
                        onChange={(e) => setEditBaseSalary(Number(e.target.value))}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Pay Schedule</label>
                      <select
                        value={editPayFrequency}
                        onChange={(e) => setEditPayFrequency(e.target.value as 'Weekly' | 'Monthly' | 'Bi-Weekly')}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Bi-Weekly">Bi-Weekly</option>
                        <option value="Weekly">Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Employment Type</label>
                      <select
                        value={editEmploymentType}
                        onChange={(e) => setEditEmploymentType(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contractor">Contractor</option>
                        <option value="Intern">Intern</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Reporting Manager</label>
                      <select
                        value={editManagerId}
                        onChange={(e) => setEditManagerId(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                      >
                        <option value="">No Direct Manager (Top-level)</option>
                        {employees
                          .filter((e) => e.id !== employee.id)
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} ({e.jobTitle})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                    <Button
                      onClick={() => setIsEditingContract(false)}
                      disabled={isSavingContract}
                      variant="ghost"
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!currentOrg?.id) return;
                        setIsSavingContract(true);
                        try {
                          const selectedMgr = employees.find((e) => e.id === editManagerId);
                          const updates = {
                            baseSalary: Number(editBaseSalary),
                            payFrequency: editPayFrequency,
                            employmentType: editEmploymentType,
                            managerEmployeeId: editManagerId || undefined,
                            managerName: selectedMgr?.name || undefined,
                          };
                          await employeeService.updateEmployeeDetails(currentOrg.id, employee.id, updates);
                          updateEmployeeDetails(employee.id, updates);
                          setIsEditingContract(false);
                        } catch (err: any) {
                          console.error('Failed updating compensation:', err);
                        } finally {
                          setIsSavingContract(false);
                        }
                      }}
                      disabled={isSavingContract}
                      variant="primary"
                      size="sm"
                    >
                      {isSavingContract ? 'Saving...' : 'Save Compensation & Manager'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LEAVE BALANCES */}
        {activeTab === 'leave' && (
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">Annual Leave</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">21</div>
                <span className="text-[11px] text-slate-500">Days Annual Allocation</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Sick Leave</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">10</div>
                <span className="text-[11px] text-slate-500">Days Sick Allocation</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Personal Days</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">3</div>
                <span className="text-[11px] text-slate-500">Days Personal Allocation</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SKILLS */}
        {activeTab === 'skills' && (
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Verified Technical Competencies</h4>
            {employee.skills && employee.skills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employee.skills.map((sk) => (
                  <div key={sk.name} className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex justify-between items-center">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{sk.name}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-semibold">
                      {sk.level}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-slate-500">
                No specific skills logged for this employee record yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
