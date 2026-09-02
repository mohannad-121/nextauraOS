import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';

export const ApprovalQueue: React.FC = () => {
  const { expenses, updateExpenseStatus, user } = useApp();

  const pendingList = expenses.filter((e) => e.status === 'Manager Review' || e.status === 'Submitted');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Expense Approval Queue"
        subtitle="Review employee expense claims, inspect receipts, and verify spend policy compliance."
      />

      {pendingList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">Approval Queue Empty</h3>
          <p className="text-xs text-slate-400 mt-1">All employee expenses have been reviewed and processed.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingList.map((exp) => (
            <div key={exp.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <img src={exp.employeeAvatar} alt="" className="w-10 h-10 rounded-2xl object-cover" />
                  <div>
                    <h3 className="text-base font-bold text-slate-100 font-heading">{exp.title}</h3>
                    <div className="text-xs text-slate-400">{exp.employeeName} • {exp.category} • {exp.date}</div>
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-xl font-black text-slate-100 font-mono">${exp.amount.toLocaleString()}</div>
                  <StatusBadge status={exp.status} />
                </div>
              </div>

              {exp.policyViolations && exp.policyViolations.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span><strong>Policy Warning:</strong> {exp.policyViolations[0]}</span>
                </div>
              )}

              {exp.notes && (
                <div className="text-xs text-slate-300 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Notes</span>
                  {exp.notes}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => updateExpenseStatus(exp.id, 'Rejected')}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-xs border border-rose-500/20 flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Claim
                </button>
                <button
                  onClick={() => updateExpenseStatus(exp.id, 'Approved', user.name)}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Expense
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
