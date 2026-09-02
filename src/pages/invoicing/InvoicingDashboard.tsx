import React, { useState } from 'react';
import { Plus, Search, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';
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
    <div className="space-y-8">
      <PageHeader
        title="Invoicing Management"
        subtitle="Create, send, and track customer invoices, recurring schedules, and collections."
        actions={
          <button
            onClick={() => navigate('invoicing', 'new-invoice')}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Create Invoice
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Invoiced" value={totalInvoiced} isCurrency change={14.2} accentColor="azure" />
        <StatCard title="Paid Collections" value={paidTotal} isCurrency change={18.0} accentColor="emerald" />
        <StatCard title="Outstanding Balance" value={outstandingTotal} isCurrency change={-2.4} accentColor="cyan" />
        <StatCard title="Overdue Invoices" value={overdueTotal} isCurrency change={12.0} accentColor="rose" />
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, customer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['all', 'draft', 'sent', 'overdue', 'paid'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                selectedStatus === st
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 text-start">Invoice</th>
                <th className="p-4 text-start">Customer</th>
                <th className="p-4 text-start">Issue Date</th>
                <th className="p-4 text-start">Due Date</th>
                <th className="p-4 text-end">Total</th>
                <th className="p-4 text-end">Amount Due</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-cyan-400">{inv.number}</td>
                  <td className="p-4 font-semibold text-slate-200">{inv.customerName}</td>
                  <td className="p-4 text-slate-400">{formatDate(inv.issueDate)}</td>
                  <td className="p-4 text-slate-400">{formatDate(inv.dueDate)}</td>
                  <td className="p-4 text-end font-bold text-slate-100">${inv.total.toLocaleString()}</td>
                  <td className="p-4 text-end font-bold text-cyan-400">${inv.amountDue.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setDetailModalInvoice(inv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                        title="View Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {inv.status !== 'Paid' && (
                        <button
                          onClick={() => updateInvoiceStatus(inv.id, 'Paid')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold"
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

      {/* Detail Modal */}
      {detailModalInvoice && (
        <Modal
          isOpen={!!detailModalInvoice}
          onClose={() => setDetailModalInvoice(null)}
          title={`Invoice ${detailModalInvoice.number}`}
          subtitle={`Billed to ${detailModalInvoice.customerName}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs text-slate-300">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Status</div>
                <StatusBadge status={detailModalInvoice.status} />
              </div>
              <div className="text-end">
                <div className="text-[10px] text-slate-500 uppercase">Total Amount</div>
                <div className="text-lg font-bold text-slate-100">${detailModalInvoice.total.toLocaleString()}</div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-200">Line Items</h4>
              {detailModalInvoice.items.map((itm) => (
                <div key={itm.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">{itm.description}</div>
                    <div className="text-[10px] text-slate-400">Qty: {itm.quantity} × ${itm.unitPrice}</div>
                  </div>
                  <div className="font-bold text-slate-100">${itm.amount.toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setDetailModalInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
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
