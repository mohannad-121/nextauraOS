import React, { useState } from 'react';
import { Plus, Trash2, Send, Sparkles, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { InvoiceItem, Currency } from '../../types';

export const InvoiceBuilder: React.FC = () => {
  const { navigate, customers, createInvoice, currentOrg } = useApp();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  const [currency, setCurrency] = useState<Currency>('USD');
  const [paymentTerms] = useState('Net 30');
  const [notes, setNotes] = useState('Thank you for your business.');

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, amount: 0 },
  ]);

  const updateItem = (id: string, field: keyof InvoiceItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          const sub = updated.quantity * updated.unitPrice;
          const disc = sub * (updated.discount / 100);
          updated.amount = sub - disc;
          return updated;
        }
        return item;
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), description: 'Consulting & Setup Service', quantity: 1, unitPrice: 1500, taxRate: 15, discount: 0, amount: 1500 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const subtotal = items.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);
  const discountTotal = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice * (curr.discount / 100)), 0);
  const taxTotal = items.reduce((acc, curr) => acc + (curr.amount * (curr.taxRate / 100)), 0);
  const total = subtotal - discountTotal + taxTotal;

  const handleSave = (status: 'Draft' | 'Sent') => {
    createInvoice({
      number: invoiceNumber,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerEmail: selectedCustomer.email,
      issueDate,
      dueDate,
      status,
      currency,
      items,
      subtotal,
      taxTotal,
      discountTotal,
      total,
      amountPaid: 0,
      amountDue: total,
      paymentTerms,
      notes,
    });
    navigate('invoicing', 'invoices');
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('invoicing', 'invoices')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave('Draft')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave('Sent')}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send Invoice
          </button>
        </div>
      </div>

      {/* Grid: Left Editor & Right Live PDF Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Editor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
            <h3 className="text-base font-bold text-slate-100 font-heading">Invoice Details</h3>

            {/* Customer & Invoice Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Select Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Dates & Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JOD">JOD</option>
                  <option value="AED">AED</option>
                  <option value="SAR">SAR</option>
                </select>
              </div>
            </div>

            {/* Line Items Editor */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Line Items</h4>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Item description / service details..."
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                    />

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Qty</span>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                          className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Unit Price ($)</span>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Tax (%)</span>
                        <input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => updateItem(item.id, 'taxRate', Number(e.target.value))}
                          className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-1">Total</span>
                          <span className="font-bold text-slate-100">${item.amount.toLocaleString()}</span>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Internal & Customer Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Live Visual PDF Invoice Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-300 space-y-6 text-xs font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live PDF Preview
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold">
                DRAFT PREVIEW
              </span>
            </div>

            {/* Invoice Header */}
            <div className="flex justify-between items-start">
              <div>
                <div className="text-base font-black text-slate-100">{currentOrg.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{currentOrg.legalName}</div>
                <div className="text-[10px] text-slate-500">{currentOrg.address}</div>
                <div className="text-[10px] text-slate-500 font-mono">Tax ID: {currentOrg.taxId}</div>
              </div>
              <div className="text-end">
                <div className="text-lg font-black text-slate-100 font-mono">{invoiceNumber}</div>
                <div className="text-[10px] text-slate-400">Date: {issueDate}</div>
                <div className="text-[10px] text-rose-400 font-semibold">Due: {dueDate}</div>
              </div>
            </div>

            {/* Bill To */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Billed To</div>
              <div className="text-xs font-bold text-slate-100">{selectedCustomer.name}</div>
              <div className="text-[11px] text-slate-400">{selectedCustomer.company}</div>
              <div className="text-[10px] text-slate-500">{selectedCustomer.address}</div>
            </div>

            {/* Live Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-start">
                <thead className="bg-slate-950 text-[10px] font-bold uppercase text-slate-400">
                  <tr>
                    <th className="p-2.5 text-start">Description</th>
                    <th className="p-2.5 text-end">Qty</th>
                    <th className="p-2.5 text-end">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className="p-2.5 font-medium text-slate-200">{i.description}</td>
                      <td className="p-2.5 text-end text-slate-400">{i.quantity}</td>
                      <td className="p-2.5 text-end font-bold text-slate-100">${i.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Live Totals */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800 text-end">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span>-${discountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Tax (VAT)</span>
                <span>${taxTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-100 pt-2 border-t border-slate-800">
                <span>Total Due ({currency})</span>
                <span className="text-cyan-400">${total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
