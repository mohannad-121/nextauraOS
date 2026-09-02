import React, { useState } from 'react';
import { CheckCircle2, Download, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import type { Payslip } from '../../types';

export const PayrollApp: React.FC = () => {
  const { payrollRuns, payslips, approvePayrollRun } = useApp();
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const activeRun = payrollRuns[1] || payrollRuns[0];

  const handleApprove = () => {
    approvePayrollRun(activeRun.id);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payroll Processing & Disbursements"
        subtitle="Monthly payroll runs, automated payslip calculation, tax deductions & General Ledger GL postings."
        actions={
          <div className="flex items-center gap-3">
            {activeRun.status !== 'Paid' && (
              <button
                onClick={handleApprove}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                Approve & Post to Accounting
              </button>
            )}
          </div>
        }
      />

      {/* Main Active Payroll Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              ACTIVE PAYROLL CYCLE
            </span>
            <h2 className="text-2xl font-black text-slate-100 font-heading mt-1">{activeRun.periodName}</h2>
            <div className="text-xs text-slate-400 mt-0.5">Pay Date: {activeRun.payDate} • 84 Employees</div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              activeRun.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {activeRun.status === 'Paid' ? 'EXECUTED & POSTED TO GL' : 'AWAITING MANAGER APPROVAL'}
            </span>
          </div>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Gross Compensation</span>
            <span className="text-lg font-black text-slate-100 font-mono">${activeRun.grossPayTotal.toLocaleString()}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Tax & Benefit Deductions</span>
            <span className="text-lg font-black text-rose-400 font-mono">-${activeRun.deductionsTotal.toLocaleString()}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Employer Tax Match</span>
            <span className="text-lg font-black text-slate-300 font-mono">${activeRun.employerCostsTotal.toLocaleString()}</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">Net Direct Disbursement</span>
            <span className="text-xl font-black text-emerald-400 font-mono">${activeRun.netPayTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 font-heading">Individual Employee Payslips</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 text-start">Employee</th>
                <th className="p-4 text-start">Department</th>
                <th className="p-4 text-end">Base Salary</th>
                <th className="p-4 text-end">Allowances / Bonus</th>
                <th className="p-4 text-end">Deductions</th>
                <th className="p-4 text-end">Net Pay</th>
                <th className="p-4 text-center">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {payslips.map((ps) => (
                <tr key={ps.id} className="hover:bg-slate-800/40">
                  <td className="p-4">
                    <div className="font-bold text-slate-100">{ps.employeeName}</div>
                    <div className="text-[10px] text-slate-400">{ps.employeeRole}</div>
                  </td>
                  <td className="p-4 text-slate-300">{ps.department}</td>
                  <td className="p-4 text-end font-mono">${ps.baseSalary.toLocaleString()}</td>
                  <td className="p-4 text-end font-mono text-emerald-400">+${(ps.allowances.reduce((a, b) => a + b.amount, 0) + ps.bonusPay).toLocaleString()}</td>
                  <td className="p-4 text-end font-mono text-rose-400">-${(ps.taxDeduction + ps.insuranceDeduction).toLocaleString()}</td>
                  <td className="p-4 text-end font-mono font-bold text-slate-100">${ps.netPay.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => setSelectedPayslip(ps)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs"
                    >
                      Inspect Payslip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Modal */}
      {selectedPayslip && (
        <Modal
          isOpen={!!selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
          title={`Official Payslip — ${selectedPayslip.employeeName}`}
          subtitle={`Period: ${activeRun.periodName}`}
          maxWidth="md"
        >
          <div className="space-y-6 text-xs text-slate-300">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <div className="font-bold text-slate-100 text-sm">{selectedPayslip.employeeName}</div>
                  <div className="text-[10px] text-slate-400">{selectedPayslip.employeeRole} • {selectedPayslip.department}</div>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-base">${selectedPayslip.netPay.toLocaleString()} NET</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Base Salary</span>
                  <span className="font-mono font-bold">${selectedPayslip.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Allowances & Bonuses</span>
                  <span className="font-mono font-bold">+$1,500</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Tax & Insurance Withholding</span>
                  <span className="font-mono font-bold">-$3,500</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedPayslip(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Close
              </button>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF Payslip
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
