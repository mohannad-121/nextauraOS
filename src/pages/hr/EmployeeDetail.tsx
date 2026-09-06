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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../../components/common/Avatar';
import { employeeService } from '../../services/employeeService';

export const EmployeeDetail: React.FC = () => {
  const { navigate, selectedResourceId, employees, user, currentOrg, updateEmployeeDetails } = useApp();

  const employee = employees.find((e) => e.id === selectedResourceId);
  const [activeTab, setActiveTab] = useState<'overview' | 'private' | 'contract' | 'leave' | 'skills'>('overview');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Guard against missing or deleted employee record - prevents blank screen rendering crash!
  if (!employee) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-100 font-heading">Employee Record Not Found</h2>
          <p className="text-xs text-slate-400">
            The requested employee record is unavailable or may have been deleted.
          </p>
        </div>
        <button
          onClick={() => navigate('employees', 'overview')}
          className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-orange-500/20"
        >
          Back to Employee Directory
        </button>
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
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('employees', 'overview')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('time-off', 'overview')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Request Time Off
          </button>
          <button
            onClick={() => navigate('payroll', 'overview')}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-orange-500/20 transition-colors"
          >
            View Payslip
          </button>
        </div>
      </div>

      {photoError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{photoError}</span>
          </div>
          <button onClick={() => setPhotoError(null)} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Profile Banner */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <Avatar
                src={employee.avatar}
                name={employee.name}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-orange-500/30"
              />
              {canEditPhoto && (
                <label className="absolute inset-0 bg-slate-950/75 rounded-2xl flex flex-col items-center justify-center text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold">
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
                <span>{employee.workLocation || 'HQ'}</span>
                <span>•</span>
                <span className="font-mono text-slate-500">{employee.employeeNumber}</span>
              </div>

              {canEditPhoto && (
                <div className="flex items-center gap-3 mt-3">
                  <label className="text-[11px] font-bold text-orange-400 hover:text-orange-300 cursor-pointer flex items-center gap-1">
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
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Remove Photo
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-end text-xs shrink-0">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Monthly Compensation</span>
            <span className="text-xl font-black text-slate-100 font-mono">
              ${(employee.baseSalary || 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              {employee.payFrequency || 'Monthly'} Salary
            </span>
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
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Reporting Manager</span>
                <div className="font-semibold text-slate-100">{employee.managerName || 'Executive Leadership'}</div>
                <div className="text-[10px] text-slate-400">Start Date: {employee.startDate}</div>
              </div>
            </div>

            {/* Assigned Equipment */}
            {employee.equipment && employee.equipment.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 uppercase text-[10px]">Assigned Company Assets</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {employee.equipment.map((eq) => (
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
            )}
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
                  {employee.privateDetails?.dob && (
                    <div>
                      <span className="text-slate-500 block">Date of Birth</span>
                      <span className="font-semibold text-slate-100">{employee.privateDetails.dob}</span>
                    </div>
                  )}
                  {employee.privateDetails?.nationality && (
                    <div>
                      <span className="text-slate-500 block">Nationality</span>
                      <span className="font-semibold text-slate-100">{employee.privateDetails.nationality}</span>
                    </div>
                  )}
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
                  <span className="font-mono font-bold text-slate-100">${(employee.baseSalary || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Pay Schedule</span>
                  <span className="font-bold text-slate-200">{employee.payFrequency || 'Monthly'}</span>
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
                <div className="text-2xl font-black text-slate-100">21</div>
                <span className="text-[10px] text-slate-500">Days Annual Allocation</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-cyan-400 font-bold uppercase">Sick Leave</span>
                <div className="text-2xl font-black text-slate-100">10</div>
                <span className="text-[10px] text-slate-500">Days Sick Allocation</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase">Personal Days</span>
                <div className="text-2xl font-black text-slate-100">3</div>
                <span className="text-[10px] text-slate-500">Days Personal Allocation</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SKILLS */}
        {activeTab === 'skills' && (
          <div className="space-y-4 text-xs text-slate-300">
            <h4 className="font-bold text-slate-200 uppercase text-[10px]">Verified Technical Competencies</h4>
            {employee.skills && employee.skills.length > 0 ? (
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
            ) : (
              <div className="p-6 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-500">
                No specific skills logged for this employee record yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
