import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Invoice, Expense, JournalEntry, Customer } from '../types';

export const financeService = {
  // Invoices
  async fetchInvoices(orgId: string): Promise<Invoice[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[FinanceService] Fetch invoices error:', error);
      return [];
    }

    return (data || []).map((inv) => ({
      id: inv.id,
      number: inv.invoice_number || `INV-${inv.id.slice(0, 6)}`,
      customerId: 'cust-1',
      customerName: inv.customer_name || 'Customer',
      customerEmail: inv.customer_email || 'billing@client.com',
      issueDate: inv.issue_date || new Date().toISOString().substring(0, 10),
      dueDate: inv.due_date || new Date().toISOString().substring(0, 10),
      items: [
        {
          id: '1',
          description: 'Professional Services / Billing Item',
          quantity: 1,
          unitPrice: Number(inv.subtotal) || Number(inv.total_amount) || 0,
          taxRate: 0,
          discount: 0,
          amount: Number(inv.subtotal) || Number(inv.total_amount) || 0,
        },
      ],
      subtotal: Number(inv.subtotal) || 0,
      taxTotal: Number(inv.tax_total) || 0,
      discountTotal: 0,
      total: Number(inv.total_amount) || 0,
      amountPaid: Number(inv.amount_paid) || 0,
      amountDue: (Number(inv.total_amount) || 0) - (Number(inv.amount_paid) || 0),
      paymentTerms: 'Net 30',
      currency: 'USD',
      status: inv.status || 'Draft',
      createdAt: inv.created_at || new Date().toISOString(),
    }));
  },

  async createInvoice(orgId: string, inv: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('invoices').insert({
        id,
        organization_id: orgId,
        invoice_number: inv.number,
        customer_name: inv.customerName,
        customer_email: inv.customerEmail,
        issue_date: inv.issueDate,
        due_date: inv.dueDate,
        subtotal: inv.subtotal,
        tax_total: inv.taxTotal,
        total_amount: inv.total,
        amount_paid: inv.amountPaid || 0,
        status: inv.status || 'Draft',
      });
      if (error) {
        console.error('[FinanceService] Create invoice error:', error);
        throw new Error(`Failed to create invoice: ${error.message}`);
      }
    }
    return { ...inv, id, createdAt };
  },

  async updateInvoiceStatus(orgId: string, id: string, status: Invoice['status']): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const updates: any = { status };
    if (status === 'Paid') {
      const { data } = await supabase.from('invoices').select('total_amount').eq('id', id).single();
      if (data) {
        updates.amount_paid = data.total_amount;
      }
    }
    const { error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId);
    if (error) {
      console.error('[FinanceService] Update invoice error:', error);
      throw new Error(`Failed to update invoice: ${error.message}`);
    }
  },

  async deleteInvoice(orgId: string, id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);
    if (error) {
      console.error('[FinanceService] Delete invoice error:', error);
    }
  },

  // Customers & Contacts
  async fetchCustomers(orgId: string): Promise<Customer[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[FinanceService] Fetch customers error:', error);
      return [];
    }

    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      company: c.company_name || c.name,
      taxId: '',
      address: '',
      currency: 'USD',
      lifetimeRevenue: Number(c.balance) || 0,
      outstandingBalance: 0,
      avgPaymentDays: 0,
      invoicesCount: 0,
    }));
  },

  async createCustomer(orgId: string, cust: { name: string; email: string; phone?: string; company?: string }): Promise<Customer> {
    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('contacts').insert({
        id,
        organization_id: orgId,
        name: cust.name,
        email: cust.email,
        phone: cust.phone || '',
        company_name: cust.company || cust.name,
        type: 'Customer',
        roles: ['Customer'],
      });
      if (error) {
        console.error('[FinanceService] Create customer error:', error);
        throw new Error(`Failed to create customer: ${error.message}`);
      }
    }
    return {
      id,
      name: cust.name,
      email: cust.email,
      phone: cust.phone || '',
      company: cust.company || cust.name,
      taxId: '',
      address: '',
      currency: 'USD',
      lifetimeRevenue: 0,
      outstandingBalance: 0,
      avgPaymentDays: 0,
      invoicesCount: 0,
    };
  },

  // Expenses
  async fetchExpenses(orgId: string): Promise<Expense[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[FinanceService] Fetch expenses error:', error);
      return [];
    }

    return (data || []).map((exp) => ({
      id: exp.id,
      employeeId: exp.employee_id || 'emp-1',
      employeeName: exp.employee_name || 'Staff Member',
      employeeAvatar: exp.employee_avatar || '',
      title: exp.title,
      merchant: exp.merchant,
      date: exp.date,
      category: exp.category,
      amount: Number(exp.amount),
      currency: exp.currency || 'USD',
      status: exp.status || 'Pending',
      paymentMethod: exp.payment_method || 'Corporate Card',
      receiptUrl: exp.receipt_url,
      approvedBy: exp.approved_by,
    }));
  },

  async createExpense(orgId: string, exp: Omit<Expense, 'id'>): Promise<Expense> {
    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('expenses').insert({
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
        status: exp.status || 'Pending',
        payment_method: exp.paymentMethod,
        receipt_url: exp.receiptUrl,
        approved_by: exp.approvedBy,
      });
      if (error) {
        console.error('[FinanceService] Create expense error:', error);
        throw new Error(`Failed to submit expense: ${error.message}`);
      }
    }
    return { ...exp, id };
  },

  async updateExpenseStatus(orgId: string, id: string, status: Expense['status'], approvedBy?: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('expenses')
      .update({ status, approved_by: approvedBy })
      .eq('id', id)
      .eq('organization_id', orgId);
    if (error) {
      console.error('[FinanceService] Update expense error:', error);
      throw new Error(`Failed to update expense status: ${error.message}`);
    }
  },

  // Journal Entries
  async fetchJournalEntries(orgId: string): Promise<JournalEntry[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((je) => ({
      id: je.id,
      entryNumber: je.entry_number,
      date: je.date,
      reference: 'GL-REF',
      description: je.description,
      status: je.status || 'Posted',
      postedBy: je.created_by || 'System Accountant',
      lines: [
        { id: '1', accountId: 'acc-1', accountCode: '1000', accountName: 'General Cash Account', description: 'Debit Entry', debit: Number(je.total_debit), credit: 0 },
        { id: '2', accountId: 'acc-2', accountCode: '2000', accountName: 'Accounts Payable', description: 'Credit Entry', debit: 0, credit: Number(je.total_credit) },
      ],
      totalDebit: Number(je.total_debit),
      totalCredit: Number(je.total_credit),
    }));
  },

  async createJournalEntry(orgId: string, je: Omit<JournalEntry, 'id'>): Promise<JournalEntry> {
    if (je.totalDebit !== je.totalCredit) {
      throw new Error(`Double-Entry Violation: Total Debit ($${je.totalDebit}) does not equal Total Credit ($${je.totalCredit})`);
    }

    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('journal_entries').insert({
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
      if (error) {
        console.error('[FinanceService] Create journal entry error:', error);
        throw new Error(`Failed to post journal entry: ${error.message}`);
      }
    }
    return { ...je, id };
  },
};
