import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Avatar } from '../../components/common/Avatar';
import { formatCurrency } from '../../utils/formatters';

export const ApprovalQueue: React.FC = () => {
  const { expenses, updateExpenseStatus, user } = useApp();

  const pendingList = expenses.filter((e) => e.status === 'Manager Review' || e.status === 'Submitted');

  return (
    <div className="space-y-6">
      <PageHeader
        category="Finance"
        title="Expense Approval Queue"
        subtitle="Review employee expense claims, inspect receipts, and verify spend policy compliance."
      />

      {pendingList.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Approval Queue Empty"
          description="All submitted employee expenses have been reviewed and processed."
        />
      ) : (
        <div className="space-y-4">
          {pendingList.map((exp) => (
            <div key={exp.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center gap-3">
                  <Avatar src={exp.employeeAvatar} name={exp.employeeName} className="w-10 h-10 rounded-xl" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">{exp.title}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{exp.employeeName} • {exp.category} • {exp.date}</div>
                  </div>
                </div>
                <div className="text-end flex sm:flex-col items-center sm:items-end justify-between gap-2">
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(exp.amount, exp.currency)}</div>
                  <StatusBadge status={exp.status} />
                </div>
              </div>

              {exp.policyViolations && exp.policyViolations.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span><strong>Policy Warning:</strong> {exp.policyViolations[0]}</span>
                </div>
              )}

              {exp.notes && (
                <div className="text-xs text-slate-600 dark:text-slate-300 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">Notes</span>
                  {exp.notes}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  onClick={() => updateExpenseStatus(exp.id, 'Rejected')}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 font-medium text-xs border border-rose-200/80 dark:border-rose-800/80 flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Claim
                </button>
                <button
                  onClick={() => updateExpenseStatus(exp.id, 'Approved', user.name)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
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

