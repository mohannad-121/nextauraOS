import React, { useState, useEffect } from 'react';
import { CheckCircle2, Download, Plus, Trash2, FileText, Building2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import type { Payslip } from '../../types';

export const PayrollApp: React.FC = () => {
  const {
    activeSubView,
    navigate,
    payrollRuns,
    employees,
    createPayrollRun,
    approvePayrollRun,
    deletePayrollRun,
    fetchPayslipsForRun,
    currentOrg,
    user,
  } = useApp();

  const [selectedRunId, setSelectedRunId] = useState<string>(payrollRuns[0]?.id || '');
  const [selectedRunPayslips, setSelectedRunPayslips] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isLoadingPayslips, setIsLoadingPayslips] = useState<boolean>(false);

  // Create Payroll Run Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [periodName, setPeriodName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [payDate, setPayDate] = useState('');
  const [isSubmittingRun, setIsSubmittingRun] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Draft Payslips array for new run
  const [draftPayslips, setDraftPayslips] = useState<
    {
      employeeId: string;
      employeeName: string;
      employeeRole: string;
      department: string;
      baseSalary: number;
      allowancesTotal: number;
      bonusPay: number;
      taxDeduction: number;
      insuranceDeduction: number;
      otherDeductions: number;
      netPay: number;
    }[]
  >([]);

  // Update selectedRunId if list changes
  useEffect(() => {
    if (payrollRuns.length > 0 && (!selectedRunId || !payrollRuns.some((r) => r.id === selectedRunId))) {
      setSelectedRunId(payrollRuns[0].id);
    }
  }, [payrollRuns, selectedRunId]);

  // Load payslips whenever selected run changes
  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRunPayslips([]);
      return;
    }
    let isCancelled = false;
    setIsLoadingPayslips(true);
    fetchPayslipsForRun(selectedRunId)
      .then((ps) => {
        if (!isCancelled) {
          setSelectedRunPayslips(ps);
        }
      })
      .catch((err) => console.error('Failed fetching payslips for run:', err))
      .finally(() => {
        if (!isCancelled) setIsLoadingPayslips(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedRunId, fetchPayslipsForRun]);

  const activeRun = payrollRuns.find((r) => r.id === selectedRunId) || payrollRuns[0];

  const handleOpenCreateModal = () => {
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();

    setPeriodName(`${monthName} ${year} Payroll`);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();

    setPeriodStart(`${yyyy}-${mm}-01`);
    setPeriodEnd(`${yyyy}-${mm}-${lastDay}`);
    setPayDate(`${yyyy}-${mm}-${lastDay}`);

    // Populate active employees with base salary and default 0 deductions/bonuses
    const initialized = employees.map((emp) => {
      const base = emp.baseSalary || 0;
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeRole: emp.jobTitle,
        department: emp.department || 'General',
        baseSalary: base,
        allowancesTotal: 0,
        bonusPay: 0,
        taxDeduction: 0,
        insuranceDeduction: 0,
        otherDeductions: 0,
        netPay: base,
      };
    });

    setDraftPayslips(initialized);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const updateDraftRow = (index: number, field: string, value: number) => {
    setDraftPayslips((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };
      const gross = row.baseSalary + row.allowancesTotal + row.bonusPay;
      const deductions = row.taxDeduction + row.insuranceDeduction + row.otherDeductions;
      row.netPay = Math.max(0, gross - deductions);
      updated[index] = row;
      return updated;
    });
  };

  const handleSaveRun = async (status: 'Draft' | 'Approved') => {
    if (!periodName.trim() || !payDate) {
      setFormError('Period name and pay date are required.');
      return;
    }

    if (draftPayslips.length === 0) {
      setFormError('No active employees found to include in this payroll run.');
      return;
    }

    setFormError(null);
    setIsSubmittingRun(true);

    try {
      const grossPayTotal = draftPayslips.reduce((sum, p) => sum + p.baseSalary + p.allowancesTotal + p.bonusPay, 0);
      const deductionsTotal = draftPayslips.reduce(
        (sum, p) => sum + p.taxDeduction + p.insuranceDeduction + p.otherDeductions,
        0
      );
      const netPayTotal = draftPayslips.reduce((sum, p) => sum + p.netPay, 0);

      const payslipPayload = draftPayslips.map((p) => ({
        employeeId: p.employeeId,
        employeeName: p.employeeName,
        employeeRole: p.employeeRole,
        department: p.department,
        baseSalary: p.baseSalary,
        allowancesTotal: p.allowancesTotal,
        bonusPay: p.bonusPay,
        taxDeduction: p.taxDeduction,
        insuranceDeduction: p.insuranceDeduction,
        otherDeductions: p.otherDeductions,
        netPay: p.netPay,
        status: status === 'Approved' ? ('Approved' as const) : ('Draft' as const),
      }));

      const newRun = await createPayrollRun(
        {
          periodName: periodName.trim(),
          periodStart,
          periodEnd,
          payDate,
          employeeCount: draftPayslips.length,
          grossPayTotal,
          deductionsTotal,
          employerCostsTotal: 0,
          netPayTotal,
          status,
        },
        payslipPayload
      );

      setSelectedRunId(newRun.id);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error('Failed creating payroll run:', err);
      setFormError(err.message || 'Failed to save payroll run. Please try again.');
    } finally {
      setIsSubmittingRun(false);
    }
  };

  const handleApproveCurrentRun = async () => {
    if (!activeRun?.id) return;
    try {
      await approvePayrollRun(activeRun.id);
    } catch (err: any) {
      console.error('Failed approving payroll run:', err);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (window.confirm('Are you sure you want to delete this draft payroll run?')) {
      try {
        await deletePayrollRun(runId);
      } catch (err: any) {
        console.error('Failed deleting payroll run:', err);
      }
    }
  };

  const generatePayslipPDF = (ps: Payslip, runPeriod: string) => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${ps.employeeName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #0f172a; max-width: 700px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 22px; font-weight: 900; color: #059669; }
            .doc-title { font-size: 14px; font-weight: 700; text-transform: uppercase; color: #64748b; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .info-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
            .info-value { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; background: #f1f5f9; color: #475569; }
            td { padding: 12px 10px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
            .total-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
            .net-pay { font-size: 24px; font-weight: 900; color: #166534; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company-name">${currentOrg.name}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${currentOrg.address || 'Corporate Headquarters'}</div>
            </div>
            <div style="text-align: right;">
              <div class="doc-title">Official Employee Payslip</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Period: ${runPeriod}</div>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Employee</div>
              <div class="info-value">${ps.employeeName}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${ps.employeeRole || ''} • ${ps.department || 'General'}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Disbursement Details</div>
              <div class="info-value">Status: ${ps.status || 'Paid'}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Generated Date: ${new Date().toISOString().substring(0, 10)}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Base Monthly Salary</td><td style="text-align: right; font-family: monospace;">$${(ps.baseSalary || 0).toLocaleString()}</td></tr>
              <tr><td>Allowances Total</td><td style="text-align: right; font-family: monospace; color: #166534;">+$${(ps.allowancesTotal || 0).toLocaleString()}</td></tr>
              <tr><td>Performance Bonus</td><td style="text-align: right; font-family: monospace; color: #166534;">+$${(ps.bonusPay || 0).toLocaleString()}</td></tr>
              <tr><td>Income Tax Deduction</td><td style="text-align: right; font-family: monospace; color: #991b1b;">-$${(ps.taxDeduction || 0).toLocaleString()}</td></tr>
              <tr><td>Insurance & Benefits Withholding</td><td style="text-align: right; font-family: monospace; color: #991b1b;">-$${(ps.insuranceDeduction || 0).toLocaleString()}</td></tr>
              ${ps.otherDeductions ? `<tr><td>Other Deductions</td><td style="text-align: right; font-family: monospace; color: #991b1b;">-$${ps.otherDeductions.toLocaleString()}</td></tr>` : ''}
            </tbody>
          </table>
          <div class="total-box">
            <div>
              <div class="info-label">Net Direct Take-Home Disbursement</div>
              <div style="font-size: 11px; color: #166534;">Deposited into employee account of record</div>
            </div>
            <div class="net-pay">$${(ps.netPay || 0).toLocaleString()}</div>
          </div>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isOwnerOrAdmin = ['Owner', 'Administrator', 'HR Manager'].includes(user.role);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payroll Processing & Disbursements"
        subtitle="Monthly payroll runs, employee compensation calculation, tax deductions & General Ledger GL postings."
        actions={
          <div className="flex items-center gap-3">
            {isOwnerOrAdmin && (
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Create Payroll Run
              </button>
            )}
          </div>
        }
      />

      {/* Subview Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Payroll Control Center' },
          { id: 'runs', label: 'Monthly Runs' },
          { id: 'payslips', label: 'Payslip Generator' },
        ].map((sub) => (
          <button
            key={sub.id}
            onClick={() => navigate('payroll', sub.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubView === sub.id
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* SUBVIEW 1: OVERVIEW / CONTROL CENTER */}
      {activeSubView === 'overview' && (
        <div className="space-y-8">
          {payrollRuns.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-100 font-heading">No Payroll Runs Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Create a new monthly payroll run to calculate employee salaries, manage deductions, generate payslips, and post journal entries to General Ledger.
                </p>
              </div>
              {isOwnerOrAdmin && (
                <button
                  onClick={handleOpenCreateModal}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Create First Payroll Run
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Active Run Banner */}
              {activeRun && (
                <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-2xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        ACTIVE PAYROLL RUN
                      </span>
                      <h2 className="text-2xl font-black text-slate-100 font-heading mt-1">{activeRun.periodName}</h2>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Pay Date: {activeRun.payDate} • {activeRun.employeeCount || selectedRunPayslips.length} Employees Included
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          activeRun.status === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {activeRun.status === 'Paid' ? 'EXECUTED & POSTED TO GL' : `STATUS: ${activeRun.status.toUpperCase()}`}
                      </span>

                      {activeRun.status !== 'Paid' && isOwnerOrAdmin && (
                        <button
                          onClick={handleApproveCurrentRun}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                          Approve & Post to Accounting
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metrics Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Gross Compensation</span>
                      <span className="text-lg font-black text-slate-100 font-mono">${(activeRun.grossPayTotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Tax & Benefit Deductions</span>
                      <span className="text-lg font-black text-rose-400 font-mono">-${(activeRun.deductionsTotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Employer Tax Match</span>
                      <span className="text-lg font-black text-slate-300 font-mono">${(activeRun.employerCostsTotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold block">Net Direct Disbursement</span>
                      <span className="text-xl font-black text-emerald-400 font-mono">${(activeRun.netPayTotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Employee Payslips Table */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 font-heading">Individual Employee Payslips</h3>
                  {payrollRuns.length > 1 && (
                    <select
                      value={selectedRunId}
                      onChange={(e) => setSelectedRunId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                    >
                      {payrollRuns.map((run) => (
                        <option key={run.id} value={run.id}>
                          {run.periodName} ({run.status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {isLoadingPayslips ? (
                  <div className="p-8 text-center text-slate-400 text-xs">Loading payslips...</div>
                ) : selectedRunPayslips.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No payslips recorded for this run.</div>
                ) : (
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
                        {selectedRunPayslips.map((ps) => (
                          <tr key={ps.id} className="hover:bg-slate-800/40">
                            <td className="p-4">
                              <div className="font-bold text-slate-100">{ps.employeeName}</div>
                              <div className="text-[10px] text-slate-400">{ps.employeeRole}</div>
                            </td>
                            <td className="p-4 text-slate-300">{ps.department || 'General'}</td>
                            <td className="p-4 text-end font-mono">${(ps.baseSalary || 0).toLocaleString()}</td>
                            <td className="p-4 text-end font-mono text-emerald-400">
                              +${((ps.allowancesTotal || 0) + (ps.bonusPay || 0)).toLocaleString()}
                            </td>
                            <td className="p-4 text-end font-mono text-rose-400">
                              -${((ps.taxDeduction || 0) + (ps.insuranceDeduction || 0) + (ps.otherDeductions || 0)).toLocaleString()}
                            </td>
                            <td className="p-4 text-end font-mono font-bold text-slate-100">${(ps.netPay || 0).toLocaleString()}</td>
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
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBVIEW 2: MONTHLY RUNS */}
      {activeSubView === 'runs' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 font-heading">Historical & Active Payroll Runs</h3>
              {isOwnerOrAdmin && (
                <button
                  onClick={handleOpenCreateModal}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  Create Payroll Run
                </button>
              )}
            </div>

            {payrollRuns.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="text-slate-400 text-xs">No payroll runs recorded yet.</div>
                {isOwnerOrAdmin && (
                  <button
                    onClick={handleOpenCreateModal}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Create Payroll Run
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4 text-start">Period Name</th>
                      <th className="p-4 text-start">Pay Date</th>
                      <th className="p-4 text-center">Employees</th>
                      <th className="p-4 text-end">Gross Total</th>
                      <th className="p-4 text-end">Deductions</th>
                      <th className="p-4 text-end">Net Direct Pay</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {payrollRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-800/40">
                        <td className="p-4 font-bold text-slate-100">{run.periodName}</td>
                        <td className="p-4 text-slate-300 font-mono">{run.payDate}</td>
                        <td className="p-4 text-center text-slate-300 font-bold">{run.employeeCount || 0}</td>
                        <td className="p-4 text-end font-mono">${(run.grossPayTotal || 0).toLocaleString()}</td>
                        <td className="p-4 text-end font-mono text-rose-400">-${(run.deductionsTotal || 0).toLocaleString()}</td>
                        <td className="p-4 text-end font-mono font-bold text-emerald-400">${(run.netPayTotal || 0).toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              run.status === 'Paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedRunId(run.id);
                                navigate('payroll', 'overview');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                            >
                              Open
                            </button>
                            {run.status !== 'Paid' && isOwnerOrAdmin && (
                              <>
                                <button
                                  onClick={() => approvePayrollRun(run.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleDeleteRun(run.id)}
                                  className="p-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                  title="Delete Draft Run"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 3: PAYSLIP GENERATOR */}
      {activeSubView === 'payslips' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-heading">Payslip Generator & Inspector</h3>
                <p className="text-xs text-slate-400">Select a payroll cycle to generate and print employee payslips.</p>
              </div>

              {payrollRuns.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-400">Payroll Cycle:</label>
                  <select
                    value={selectedRunId}
                    onChange={(e) => setSelectedRunId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  >
                    {payrollRuns.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.periodName} ({r.payDate})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {selectedRunPayslips.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No payslips available for the selected cycle.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedRunPayslips.map((ps) => (
                  <div
                    key={ps.id}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                      <div>
                        <div className="font-bold text-slate-100 text-sm">{ps.employeeName}</div>
                        <div className="text-[10px] text-slate-400">
                          {ps.employeeRole} • {ps.department || 'General'}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ${(ps.netPay || 0).toLocaleString()} NET
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Base Salary</span>
                        <span className="font-mono font-bold">${(ps.baseSalary || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Allowances & Bonus</span>
                        <span className="font-mono font-bold">
                          +${((ps.allowancesTotal || 0) + (ps.bonusPay || 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-rose-400">
                        <span>Tax & Insurance Withholding</span>
                        <span className="font-mono font-bold">
                          -${((ps.taxDeduction || 0) + (ps.insuranceDeduction || 0) + (ps.otherDeductions || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => setSelectedPayslip(ps)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                      >
                        Inspect Breakdown
                      </button>
                      <button
                        onClick={() => generatePayslipPDF(ps, activeRun?.periodName || 'Payroll Cycle')}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF Payslip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE PAYROLL RUN MODAL */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create & Process Payroll Run"
          subtitle="Calculate compensation, adjustments, and deductions for active employees."
          maxWidth="lg"
        >
          <div className="space-y-6 text-xs text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Period Name *</label>
                <input
                  type="text"
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  placeholder="e.g. September 2026 Payroll"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Pay Date *</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Editable Employee Payroll List */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 uppercase text-[10px]">Included Employee Compensation</h4>
              {draftPayslips.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-950 border border-amber-500/30 text-amber-400">
                  No active employees found. Please register employees first before executing payroll.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                  {draftPayslips.map((row, idx) => (
                    <div key={row.employeeId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <div>
                          <div className="font-bold text-slate-100">{row.employeeName}</div>
                          <div className="text-[10px] text-slate-400">
                            {row.employeeRole} • {row.department}
                          </div>
                        </div>
                        <div className="text-end font-mono">
                          <span className="text-[10px] text-slate-500 block uppercase">Net Pay</span>
                          <span className="font-bold text-emerald-400 text-sm">${row.netPay.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Base Salary</label>
                          <input
                            type="number"
                            value={row.baseSalary}
                            onChange={(e) => updateDraftRow(idx, 'baseSalary', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-emerald-400 font-bold mb-0.5">Allowances</label>
                          <input
                            type="number"
                            value={row.allowancesTotal}
                            onChange={(e) => updateDraftRow(idx, 'allowancesTotal', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-emerald-400 font-bold mb-0.5">Bonus</label>
                          <input
                            type="number"
                            value={row.bonusPay}
                            onChange={(e) => updateDraftRow(idx, 'bonusPay', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-rose-400 font-bold mb-0.5">Tax Withholding</label>
                          <input
                            type="number"
                            value={row.taxDeduction}
                            onChange={(e) => updateDraftRow(idx, 'taxDeduction', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-rose-400 font-bold mb-0.5">Insurance</label>
                          <input
                            type="number"
                            value={row.insuranceDeduction}
                            onChange={(e) => updateDraftRow(idx, 'insuranceDeduction', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-rose-400 font-bold mb-0.5">Other Deductions</label>
                          <input
                            type="number"
                            value={row.otherDeductions}
                            onChange={(e) => updateDraftRow(idx, 'otherDeductions', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmittingRun}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveRun('Draft')}
                  disabled={isSubmittingRun}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveRun('Approved')}
                  disabled={isSubmittingRun}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmittingRun ? 'Saving...' : 'Submit & Create Payroll Run'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* PAYSLIP DETAIL MODAL */}
      {selectedPayslip && (
        <Modal
          isOpen={!!selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
          title={`Official Payslip — ${selectedPayslip.employeeName}`}
          subtitle={`Period: ${activeRun?.periodName || 'Payroll Run'}`}
          maxWidth="md"
        >
          <div className="space-y-6 text-xs text-slate-300">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <div className="font-bold text-slate-100 text-sm">{selectedPayslip.employeeName}</div>
                  <div className="text-[10px] text-slate-400">
                    {selectedPayslip.employeeRole} • {selectedPayslip.department || 'General'}
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-base">
                  ${(selectedPayslip.netPay || 0).toLocaleString()} NET
                </span>
              </div>

              <div className="space-y-2 font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Base Monthly Salary</span>
                  <span className="font-bold">${(selectedPayslip.baseSalary || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Allowances Total</span>
                  <span className="font-bold">+${(selectedPayslip.allowancesTotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Performance Bonus</span>
                  <span className="font-bold">+${(selectedPayslip.bonusPay || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Income Tax Deduction</span>
                  <span className="font-bold">-${(selectedPayslip.taxDeduction || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Insurance & Benefits Withholding</span>
                  <span className="font-bold">-${(selectedPayslip.insuranceDeduction || 0).toLocaleString()}</span>
                </div>
                {selectedPayslip.otherDeductions ? (
                  <div className="flex justify-between text-rose-400">
                    <span>Other Deductions</span>
                    <span className="font-bold">-${selectedPayslip.otherDeductions.toLocaleString()}</span>
                  </div>
                ) : null}
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
                onClick={() => {
                  generatePayslipPDF(selectedPayslip, activeRun?.periodName || 'Payroll Run');
                }}
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
