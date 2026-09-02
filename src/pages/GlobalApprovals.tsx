import React, { useState } from 'react';
import { CheckCircle2, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';

export const GlobalApprovals: React.FC = () => {
  const {
    globalApprovals,
    updateTimeOffStatus,
    updateExpenseStatus,
    approvePayrollRun,
  } = useApp();

  const [approvedIds, setApprovedIds] = useState<string[]>([]);
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);

  const handleApprove = (id: string, module: string) => {
    setApprovedIds((prev) => [...prev, id]);

    if (module === 'Time Off') {
      updateTimeOffStatus('tor-1', 'Approved');
    } else if (module === 'Expenses') {
      updateExpenseStatus('exp-2', 'Approved');
    } else if (module === 'Payroll') {
      approvePayrollRun('payrun-1');
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
            <div key={item.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase">
                      {item.module}
                    </span>
                    <span className="text-xs text-slate-500">• Requested by {item.requestedBy}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100 font-heading mt-1">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                </div>

                {item.amount && (
                  <div className="text-end shrink-0">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Value</span>
                    <span className="text-xl font-black text-slate-100 font-mono">${item.amount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-500 font-mono">Date: {item.date}</span>

                {isApproved ? (
                  <span className="px-4 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    Approved & Actioned
                  </span>
                ) : isRejected ? (
                  <span className="px-4 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                    Rejected
                  </span>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleReject(item.id)}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(item.id, item.module)}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-transform hover:scale-105"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                      Approve Request
                    </button>
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
