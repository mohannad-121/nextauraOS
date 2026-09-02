import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Invoice, Expense, JournalEntry } from '../types';

export const financeService = {
  async fetchInvoices(orgId: string): Promise<Invoice[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', orgId);

    if (error) return [];
    return (data || []).map((inv) => ({
      id: inv.id,
      number: inv.invoice_number,
      customerId: 'cust-1',
      customerName: inv.customer_name,
      customerEmail: inv.customer_email || 'accounting@acme.corp',
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      items: [],
      subtotal: Number(inv.subtotal),
      taxTotal: Number(inv.tax_total),
      discountTotal: 0,
      total: Number(inv.total_amount),
      amountPaid: Number(inv.amount_paid),
      amountDue: Number(inv.total_amount) - Number(inv.amount_paid),
      paymentTerms: 'Net 30',
      currency: 'USD',
      status: inv.status,
      createdAt: inv.created_at || new Date().toISOString(),
    }));
  },

  async createExpense(orgId: string, exp: Omit<Expense, 'id'>): Promise<Expense> {
    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      await supabase.from('expenses').insert({
        id,
        organization_id: orgId,
        employee_id: exp.employeeId,
        employee_name: exp.employeeName,
        employee_avatar: exp.employeeAvatar,
        title: exp.title,
        merchant: exp.merchant,
        date: exp.date,
        category: exp.category,
        amount: exp.amount,
        currency: exp.currency || 'USD',
        status: exp.status,
        payment_method: exp.paymentMethod,
        receipt_url: exp.receiptUrl,
        approved_by: exp.approvedBy,
      });
    }
    return { ...exp, id };
  },

  async createJournalEntry(orgId: string, je: Omit<JournalEntry, 'id'>): Promise<JournalEntry> {
    if (je.totalDebit !== je.totalCredit) {
      throw new Error(`Double-Entry Violation: Total Debit ($${je.totalDebit}) does not equal Total Credit ($${je.totalCredit})`);
    }

    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      await supabase.from('journal_entries').insert({
        id,
        organization_id: orgId,
        entry_number: je.entryNumber,
        date: je.date,
        description: je.description,
        source_module: 'Manual',
        total_debit: je.totalDebit,
        total_credit: je.totalCredit,
        status: je.status || 'Posted',
        created_by: je.postedBy,
      });
    }
    return { ...je, id };
  },
};
