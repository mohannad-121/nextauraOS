import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';

export const GlobalApprovals: React.FC = () => {
  const {
    globalApprovals,
    updateTimeOffStatus,
    updateExpenseStatus,
    approvePayrollRun,
  } = useApp();

  const [approvedIds, setApprovedIds] = useState<string[]>([]);
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);

  const handleApprove = async (id: string, module: string) => {
    setApprovedIds((prev) => [...prev, id]);

    if (module === 'Time Off') {
      await updateTimeOffStatus(id, 'Approved');
    } else if (module === 'Expenses') {
      await updateExpenseStatus(id, 'Approved');
    } else if (module === 'Payroll') {
      await approvePayrollRun(id);
    }
  };

  const handleReject = (id: string) => {
    setRejectedIds((prev) => [...prev, id]);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Centralized Executive Approvals Inbox"
        subtitle="Review, approve or reject pending items from Expenses, Time Off, Payroll, ATS Job Offers & Sign agreements."
      />

      <div className="space-y-4">
        {globalApprovals.map((item) => {
          const isApproved = approvedIds.includes(item.id);
          const isRejected = rejectedIds.includes(item.id);

          return (
            <div key={item.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.module} variant="info" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">• Requested by {item.requestedBy}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                </div>

                {item.amount && (
                  <div className="sm:text-end shrink-0">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-medium">Value</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">${item.amount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400 dark:text-slate-500 font-mono">Date: {item.date}</span>

                {isApproved ? (
                  <StatusBadge status="Approved & Actioned" variant="success" />
                ) : isRejected ? (
                  <StatusBadge status="Rejected" variant="danger" />
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(item.id)}
                      icon={<X className="w-3.5 h-3.5" />}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(item.id, item.module)}
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Approve Request
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
