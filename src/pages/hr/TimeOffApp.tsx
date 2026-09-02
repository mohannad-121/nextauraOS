import React, { useState } from 'react';
import {
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';

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
    <div className="space-y-8">
      <PageHeader
        title="Time Off & Leave Management"
        subtitle="Request vacation, track leave balances, review manager approvals & inspect team conflict alerts."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Request Time Off
          </button>
        }
      />

      {/* Employee Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-purple-400 uppercase">
            <span>Annual Paid Leave</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">21 Allocated</span>
          </div>
          <div className="text-3xl font-black text-slate-100 font-heading">17 Days</div>
          <p className="text-[11px] text-slate-400">4 days used • 17 days remaining</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-cyan-400 uppercase">
            <span>Sick Leave</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">10 Allocated</span>
          </div>
          <div className="text-3xl font-black text-slate-100 font-heading">8 Days</div>
          <p className="text-[11px] text-slate-400">2 days used • 8 days remaining</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-amber-400 uppercase">
            <span>Personal & Emergency</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">3 Allocated</span>
          </div>
          <div className="text-3xl font-black text-slate-100 font-heading">3 Days</div>
          <p className="text-[11px] text-slate-400">0 days used • 3 days remaining</p>
        </div>
      </div>

      {/* Manager Approval Queue with Conflict Warnings */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-100 font-heading">Pending Manager Leave Requests ({pendingRequests.length})</h3>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            No pending time-off requests needing review.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div key={req.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <img src={req.employeeAvatar} alt="" className="w-10 h-10 rounded-2xl object-cover" />
                    <div>
                      <h4 className="text-base font-bold text-slate-100 font-heading">{req.employeeName}</h4>
                      <div className="text-xs text-slate-400">{req.department} • {req.leaveType}</div>
                    </div>
                  </div>

                  <div className="text-end">
                    <div className="text-lg font-black text-purple-400 font-mono">{req.totalDays} Days</div>
                    <div className="text-xs text-slate-400">{req.startDate} to {req.endDate}</div>
                  </div>
                </div>

                {/* Team Conflict Warning */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span><strong>Team Conflict Notice:</strong> 1 other member of Finance department is already scheduled on leave during this period.</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-slate-400 italic">" Reason: {req.reason} "</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateTimeOffStatus(req.id, 'Rejected')}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => updateTimeOffStatus(req.id, 'Approved')}
                      className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold shadow-lg shadow-purple-500/20"
                    >
                      Approve Leave
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Requests Log */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden space-y-3 p-6">
        <h3 className="text-base font-bold text-slate-100 font-heading">Approved & Completed Leave History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 text-start">Employee</th>
                <th className="p-3 text-start">Leave Type</th>
                <th className="p-3 text-start">Dates</th>
                <th className="p-3 text-center">Days</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {pastRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-800/40">
                  <td className="p-3 flex items-center gap-2">
                    <img src={req.employeeAvatar} alt="" className="w-6 h-6 rounded-lg object-cover" />
                    <span className="font-bold text-slate-100">{req.employeeName}</span>
                  </td>
                  <td className="p-3 text-purple-400">{req.leaveType}</td>
                  <td className="p-3 text-slate-400">{req.startDate} - {req.endDate}</td>
                  <td className="p-3 text-center font-mono font-bold">{req.totalDays}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      req.status === 'Approved'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {req.status}
                    </span>
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
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 mb-1">Leave Type</label>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                <option value="Annual Leave">Annual Paid Leave (17 days remaining)</option>
                <option value="Sick Leave">Sick Leave (8 days remaining)</option>
                <option value="Personal Leave">Personal Leave (3 days remaining)</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Reason / Notes</label>
              <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200" />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 rounded-xl bg-purple-500 text-slate-950 font-bold shadow-lg shadow-purple-500/20">Submit Request</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
