import { supabase, isSupabaseConfigured } from './supabaseClient';
import { financeService } from './financeService';
import type { PayrollRun, Payslip, JournalEntry } from '../types';

export const payrollService = {
  async fetchPayrollRuns(orgId: string): Promise<PayrollRun[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payroll runs from Supabase:', error);
      return [];
    }

    return (data || []).map((p) => ({
      id: p.id,
      periodName: p.period || 'Payroll Run',
      periodStart: p.period_start,
      periodEnd: p.period_end,
      payDate: p.pay_date,
      employeeCount: p.employee_count || 0,
      grossPayTotal: Number(p.total_gross) || 0,
      deductionsTotal: Number(p.total_deductions) || 0,
      employerCostsTotal: Number(p.employer_costs_total) || 0,
      netPayTotal: Number(p.total_net) || 0,
      status: p.status || 'Draft',
      createdAt: p.created_at,
    }));
  },

  async fetchPayslipsForRun(orgId: string, runId: string): Promise<Payslip[]> {
    if (!isSupabaseConfigured() || !orgId || !runId) return [];
    const { data, error } = await supabase
      .from('payslips')
      .select('*')
      .eq('organization_id', orgId)
      .eq('payroll_run_id', runId)
      .order('employee_name', { ascending: true });

    if (error) {
      console.error('Error fetching payslips from Supabase:', error);
      return [];
    }

    return (data || []).map((p) => ({
      id: p.id,
      payrollRunId: p.payroll_run_id,
      employeeId: p.employee_id,
      employeeName: p.employee_name,
      department: p.department || '',
      baseSalary: Number(p.base_salary) || 0,
      allowancesTotal: Number(p.allowances_total) || 0,
      bonusPay: Number(p.bonus_pay) || 0,
      taxDeduction: Number(p.tax_deduction) || 0,
      insuranceDeduction: Number(p.insurance_deduction) || 0,
      otherDeductions: Number(p.other_deductions) || 0,
      netPay: Number(p.net_pay) || 0,
      status: p.status || 'Draft',
      createdAt: p.created_at,
    }));
  },

  async createPayrollRun(
    orgId: string,
    run: Omit<PayrollRun, 'id'>,
    payslipsList: Omit<Payslip, 'id' | 'payrollRunId'>[]
  ): Promise<{ run: PayrollRun; payslips: Payslip[] }> {
    const runId = crypto.randomUUID();

    if (isSupabaseConfigured()) {
      const { error: runError } = await supabase.from('payroll_runs').insert({
        id: runId,
        organization_id: orgId,
        period: run.periodName,
        period_start: run.periodStart || null,
        period_end: run.periodEnd || null,
        pay_date: run.payDate,
        employee_count: run.employeeCount,
        total_gross: run.grossPayTotal,
        total_deductions: run.deductionsTotal,
        employer_costs_total: run.employerCostsTotal,
        total_net: run.netPayTotal,
        status: run.status || 'Draft',
      });

      if (runError) {
        console.error('Error inserting payroll run into Supabase:', runError);
        throw new Error(`Failed to create payroll run: ${runError.message}`);
      }

      if (payslipsList.length > 0) {
        const payslipRows = payslipsList.map((ps) => ({
          id: crypto.randomUUID(),
          organization_id: orgId,
          payroll_run_id: runId,
          employee_id: ps.employeeId,
          employee_name: ps.employeeName,
          department: ps.department,
          base_salary: ps.baseSalary,
          allowances_total: ps.allowancesTotal,
          bonus_pay: ps.bonusPay,
          tax_deduction: ps.taxDeduction,
          insurance_deduction: ps.insuranceDeduction,
          other_deductions: ps.otherDeductions,
          net_pay: ps.netPay,
          status: ps.status || 'Draft',
        }));

        const { error: psError } = await supabase.from('payslips').insert(payslipRows);
        if (psError) {
          console.error('Error inserting payslips into Supabase:', psError);
        }
      }
    }

    const createdRun: PayrollRun = { ...run, id: runId };
    const createdPayslips: Payslip[] = payslipsList.map((ps) => ({
      ...ps,
      id: crypto.randomUUID(),
      payrollRunId: runId,
    }));

    return { run: createdRun, payslips: createdPayslips };
  },

  async updatePayrollRunStatus(orgId: string, runId: string, status: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('payroll_runs')
      .update({ status })
      .eq('id', runId)
      .eq('organization_id', orgId);

    if (error) console.error('Error updating payroll run status:', error);
  },

  async deletePayrollRun(orgId: string, runId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    await supabase.from('payslips').delete().eq('payroll_run_id', runId).eq('organization_id', orgId);
    await supabase.from('payroll_runs').delete().eq('id', runId).eq('organization_id', orgId);
  },

  async approvePayrollRun(orgId: string, runId: string, run: PayrollRun): Promise<JournalEntry> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('payroll_runs')
        .update({ status: 'Paid' })
        .eq('id', runId)
        .eq('organization_id', orgId);

      await supabase
        .from('payslips')
        .update({ status: 'Paid' })
        .eq('payroll_run_id', runId)
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
