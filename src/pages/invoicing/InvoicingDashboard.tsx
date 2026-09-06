import React, { useState } from 'react';
import { Plus, Search, Eye, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { formatDate, formatCurrency } from '../../utils/formatters';
import type { Invoice } from '../../types';

export const InvoicingDashboard: React.FC = () => {
  const { navigate, invoices, updateInvoiceStatus } = useApp();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [detailModalInvoice, setDetailModalInvoice] = useState<Invoice | null>(null);

  const totalInvoiced = invoices.reduce((acc, curr) => acc + curr.total, 0);
  const paidTotal = invoices.filter((i) => i.status === 'Paid').reduce((acc, curr) => acc + curr.total, 0);
  const outstandingTotal = invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue' || i.status === 'Partially Paid').reduce((acc, curr) => acc + curr.amountDue, 0);
  const overdueTotal = invoices.filter((i) => i.status === 'Overdue').reduce((acc, curr) => acc + curr.amountDue, 0);

  const filteredInvoices = invoices.filter((i) => {
    const matchesSearch =
      i.number.toLowerCase().includes(search.toLowerCase()) ||
      i.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || i.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        category="Finance"
        title="Invoices"
        subtitle="Create, send, and follow customer invoices from draft through payment."
        actions={
          <button
            onClick={() => navigate('invoicing', 'new-invoice')}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <span className="font-medium text-slate-500">Portfolio</span>
        <span><span className="text-slate-500">Invoiced</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(totalInvoiced, 'USD')}</strong></span>
        <span><span className="text-slate-500">Collected</span> <strong className="ms-1 font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(paidTotal, 'USD')}</strong></span>
        <span><span className="text-slate-500">Outstanding</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(outstandingTotal, 'USD')}</strong></span>
        {overdueTotal > 0 && <span><span className="text-slate-500">Overdue</span> <strong className="ms-1 font-semibold text-rose-700 dark:text-rose-300">{formatCurrency(overdueTotal, 'USD')}</strong></span>}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, customer..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto w-full sm:w-auto">
          {['all', 'draft', 'sent', 'overdue', 'paid'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                selectedStatus === st
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Empty State */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search || selectedStatus !== 'all' ? 'No invoices match your filter' : 'No invoices yet'}
          description={
            search || selectedStatus !== 'all'
              ? 'Try clearing your search term or selecting a different status filter.'
              : 'Create your first invoice to start tracking customer receivables and revenue.'
          }
          actionLabel="Create Invoice"
          onAction={() => navigate('invoicing', 'new-invoice')}
          secondaryActionLabel={search || selectedStatus !== 'all' ? 'Clear Filters' : undefined}
          onSecondaryAction={() => { setSearch(''); setSelectedStatus('all'); }}
        />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 text-start">Invoice</th>
                  <th className="p-3.5 text-start">Customer</th>
                  <th className="p-3.5 text-start">Issue Date</th>
                  <th className="p-3.5 text-start">Due Date</th>
                  <th className="p-3.5 text-end">Total</th>
                  <th className="p-3.5 text-end">Amount Due</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-semibold text-blue-700 dark:text-blue-400">{inv.number}</td>
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100">{inv.customerName}</td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400">{formatDate(inv.issueDate)}</td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400">{formatDate(inv.dueDate)}</td>
                    <td className="p-3.5 text-end font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(inv.total, inv.currency)}</td>
                    <td className="p-3.5 text-end font-semibold text-blue-700 dark:text-blue-400 tabular-nums">{formatCurrency(inv.amountDue, inv.currency)}</td>
                    <td className="p-3.5 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDetailModalInvoice(inv)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {inv.status !== 'Paid' && (
                          <button
                            onClick={() => updateInvoiceStatus(inv.id, 'Paid')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-medium transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModalInvoice && (
        <Modal
          isOpen={!!detailModalInvoice}
          onClose={() => setDetailModalInvoice(null)}
          title={`Invoice ${detailModalInvoice.number}`}
          subtitle={`Billed to ${detailModalInvoice.customerName}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Status</div>
                <div className="mt-1"><StatusBadge status={detailModalInvoice.status} /></div>
              </div>
              <div className="text-end">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Amount</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(detailModalInvoice.total, detailModalInvoice.currency)}</div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Line Items</h4>
              {detailModalInvoice.items.map((itm) => (
                <div key={itm.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex justify-between">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{itm.description}</div>
                    <div className="text-[11px] text-slate-500">Qty: {itm.quantity} × {formatCurrency(itm.unitPrice, detailModalInvoice.currency)}</div>
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(itm.amount, detailModalInvoice.currency)}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDetailModalInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
