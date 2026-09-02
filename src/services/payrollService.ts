import { supabase, isSupabaseConfigured } from './supabaseClient';
import { financeService } from './financeService';
import type { PayrollRun, JournalEntry } from '../types';

export const payrollService = {
  async fetchPayrollRuns(orgId: string): Promise<PayrollRun[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('organization_id', orgId);

    if (error) return [];
    return (data || []).map((p) => ({
      id: p.id,
      periodName: p.period,
      month: 'September',
      year: 2026,
      payDate: p.pay_date,
      employeeCount: p.employee_count,
      grossPayTotal: Number(p.total_gross),
      deductionsTotal: Number(p.total_deductions),
      employerCostsTotal: Number(p.total_gross) * 0.1,
      netPayTotal: Number(p.total_net),
      status: p.status,
    }));
  },

  async createPayrollRun(orgId: string, run: Omit<PayrollRun, 'id'>): Promise<PayrollRun> {
    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      await supabase.from('payroll_runs').insert({
        id,
        organization_id: orgId,
        period: run.periodName,
        pay_date: run.payDate,
        employee_count: run.employeeCount,
        total_gross: run.grossPayTotal,
        total_deductions: run.deductionsTotal,
        total_net: run.netPayTotal,
        status: run.status,
      });
    }
    return { ...run, id };
  },

  async approvePayrollRun(orgId: string, runId: string, run: PayrollRun): Promise<JournalEntry> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('payroll_runs')
        .update({ status: 'Paid' })
        .eq('id', runId)
        .eq('organization_id', orgId);
    }

    const entryNumber = `JE-PAY-${Date.now().toString().slice(-4)}`;
    const journalEntry = await financeService.createJournalEntry(orgId, {
      entryNumber,
      date: new Date().toISOString().substring(0, 10),
      reference: 'PAYROLL-DISBURSEMENT',
      description: `Monthly Payroll Disbursement — ${run.periodName} (${run.employeeCount} Employees)`,
      lines: [
        { id: '1', accountId: 'acc-6010', accountCode: '6010', accountName: 'Salaries & Wages Expense', debit: run.grossPayTotal, credit: 0, description: 'Gross Wages' },
        { id: '2', accountId: 'acc-2100', accountCode: '2100', accountName: 'Payroll Tax Payable', debit: 0, credit: run.deductionsTotal, description: 'Payroll Taxes Withheld' },
        { id: '3', accountId: 'acc-1010', accountCode: '1010', accountName: 'Operating Bank Account', debit: 0, credit: run.netPayTotal, description: 'Net Direct Deposit Disbursement' },
      ],
      totalDebit: run.grossPayTotal,
      totalCredit: run.grossPayTotal,
      status: 'Posted',
      postedBy: 'Payroll System',
    });

    return journalEntry;
  },
};
