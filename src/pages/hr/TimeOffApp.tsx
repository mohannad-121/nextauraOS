import React, { useState } from 'react';
import {
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';

export const TimeOffApp: React.FC = () => {
  const {
    timeOffRequests,
    createTimeOffRequest,
    updateTimeOffStatus,
    user,
  } = useApp();

  const [isModalOpen, setModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [startDate, setStartDate] = useState('2026-09-15');
  const [endDate, setEndDate] = useState('2026-09-18');
  const [reason, setReason] = useState('Personal family vacation');

  const pendingRequests = timeOffRequests.filter((r) => r.status === 'Pending');
  const pastRequests = timeOffRequests.filter((r) => r.status !== 'Pending');

  const handleCreate = () => {
    createTimeOffRequest({
      employeeId: user.id,
      employeeName: user.name,
      employeeAvatar: user.avatar,
      department: user.department || 'Executive Office',
      leaveType,
      startDate,
      endDate,
      totalDays: 4,
      reason,
      createdAt: new Date().toISOString().substring(0, 10),
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Time Off & Leave Management"
        subtitle="Request vacation, track leave balances, review manager approvals & inspect team conflict alerts."
        actions={
          <Button
            onClick={() => setModalOpen(true)}
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
          >
            Request Time Off
          </Button>
        }
      />

      {/* Employee Balances Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <span>Annual Paid Leave</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px]">21 Allocated</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">17 Days</div>
          <p className="text-xs text-slate-500">4 days used • 17 days remaining</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            <span>Sick Leave</span>
            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[10px]">10 Allocated</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">8 Days</div>
          <p className="text-xs text-slate-500">2 days used • 8 days remaining</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <span>Personal & Emergency</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px]">3 Allocated</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">3 Days</div>
          <p className="text-xs text-slate-500">0 days used • 3 days remaining</p>
        </div>
      </div>

      {/* Manager Approval Queue with Conflict Warnings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pending Manager Leave Requests ({pendingRequests.length})</h3>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 text-xs shadow-sm">
            No pending time-off requests needing review.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div key={req.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={req.employeeAvatar} name={req.employeeName} className="w-10 h-10 rounded-xl" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{req.employeeName}</h4>
                      <div className="text-xs text-slate-500">{req.department} • {req.leaveType}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">{req.totalDays} Days</div>
                    <div className="text-xs text-slate-500">{req.startDate} to {req.endDate}</div>
                  </div>
                </div>

                {/* Team Conflict Warning */}
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span><strong>Team Conflict Notice:</strong> 1 other member of Finance department is already scheduled on leave during this period.</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-slate-500 italic">" Reason: {req.reason} "</span>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => updateTimeOffStatus(req.id, 'Rejected')}
                      variant="danger"
                      size="sm"
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => updateTimeOffStatus(req.id, 'Approved')}
                      variant="primary"
                      size="sm"
                    >
                      Approve Leave
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Requests Log */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-3 p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Approved & Completed Leave History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="p-3 text-start">Employee</th>
                <th className="p-3 text-start">Leave Type</th>
                <th className="p-3 text-start">Dates</th>
                <th className="p-3 text-center">Days</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {pastRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 flex items-center gap-2">
                    <Avatar src={req.employeeAvatar} name={req.employeeName} className="w-6 h-6 rounded-md text-[10px]" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">{req.employeeName}</span>
                  </td>
                  <td className="p-3 text-blue-600 dark:text-blue-400">{req.leaveType}</td>
                  <td className="p-3 text-slate-500">{req.startDate} - {req.endDate}</td>
                  <td className="p-3 text-center font-mono font-semibold text-slate-900 dark:text-slate-100">{req.totalDays}</td>
                  <td className="p-3 text-center">
                    <StatusBadge status={req.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          title="Submit Time Off Request"
          subtitle="Select leave category and date range."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Leave Type</label>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs">
                <option value="Annual Leave">Annual Paid Leave (17 days remaining)</option>
                <option value="Sick Leave">Sick Leave (8 days remaining)</option>
                <option value="Personal Leave">Personal Leave (3 days remaining)</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs" />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs" />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Reason / Notes</label>
              <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs" />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
              <Button onClick={() => setModalOpen(false)} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleCreate} variant="primary" size="sm">Submit Request</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
