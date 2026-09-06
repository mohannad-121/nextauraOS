import React, { useState } from 'react';
import { Plus, Trash2, Send, Sparkles, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { InvoiceItem, Currency } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export const InvoiceBuilder: React.FC = () => {
  const { navigate, customers, createInvoice, createCustomer, currentOrg } = useApp();

  const [isNewCustomerMode, setIsNewCustomerMode] = useState<boolean>(customers.length === 0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerEmail, setCustomCustomerEmail] = useState('');
  const [customCustomerCompany, setCustomCustomerCompany] = useState('');

  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  const [currency, setCurrency] = useState<Currency>('USD');
  const [paymentTerms] = useState('Net 30');
  const [notes, setNotes] = useState('Thank you for your business.');

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Consulting & Setup Service', quantity: 1, unitPrice: 1500, taxRate: 15, discount: 0, amount: 1500 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const foundCustomer = customers.find((c) => c.id === selectedCustomerId);
  const activeCustomerName = isNewCustomerMode
    ? customCustomerName || 'New Client / Customer'
    : foundCustomer?.name || customers[0]?.name || 'Client Name';
  const activeCustomerEmail = isNewCustomerMode
    ? customCustomerEmail || 'client@company.com'
    : foundCustomer?.email || customers[0]?.email || 'client@company.com';
  const activeCustomerCompany = isNewCustomerMode
    ? customCustomerCompany || 'Client Enterprise'
    : foundCustomer?.company || customers[0]?.company || 'Client Enterprise';

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
      { id: Date.now().toString(), description: 'Additional Professional Service', quantity: 1, unitPrice: 500, taxRate: 15, discount: 0, amount: 500 },
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

  const handleSave = async (status: 'Draft' | 'Sent') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let targetCustId = selectedCustomerId;
      let targetCustName = activeCustomerName;
      let targetCustEmail = activeCustomerEmail;

      if (isNewCustomerMode || !targetCustId) {
        if (!customCustomerName.trim() || !customCustomerEmail.trim()) {
          setErrorMsg('Customer name and email address are required.');
          setIsSubmitting(false);
          return;
        }
        const newCust = await createCustomer({
          name: customCustomerName.trim(),
          email: customCustomerEmail.trim(),
          company: customCustomerCompany.trim(),
        });
        targetCustId = newCust.id;
        targetCustName = newCust.name;
        targetCustEmail = newCust.email;
      }

      await createInvoice({
        number: invoiceNumber,
        customerId: targetCustId,
        customerName: targetCustName,
        customerEmail: targetCustEmail,
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

      navigate('invoicing', 'overview');
    } catch (err: any) {
      console.error('Invoice creation error:', err);
      setErrorMsg('We could not create the invoice. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('invoicing', 'overview')}
          className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>

        <div className="flex items-center gap-2.5">
          <button
            disabled={isSubmitting}
            onClick={() => handleSave('Draft')}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 disabled:opacity-50 text-xs font-medium transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => handleSave('Sent')}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Sending...' : 'Send Invoice'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* Grid: Left Editor & Right Live PDF Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Editor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">Invoice Details</h3>

            {/* Customer & Invoice Number */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Customer</label>
                    <button
                      type="button"
                      onClick={() => setIsNewCustomerMode(!isNewCustomerMode)}
                      className="text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      {isNewCustomerMode ? 'Select Existing' : '+ New Customer'}
                    </button>
                  </div>

                  {!isNewCustomerMode && customers.length > 0 ? (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.company})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Customer / Client Name"
                        value={customCustomerName}
                        onChange={(e) => setCustomCustomerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                      <input
                        type="email"
                        placeholder="Customer Email (e.g. billing@client.com)"
                        value={customCustomerEmail}
                        onChange={(e) => setCustomCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                      <input
                        type="text"
                        placeholder="Company Name (Optional)"
                        value={customCustomerCompany}
                        onChange={(e) => setCustomCustomerCompany(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Dates & Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
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
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Line Items</h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Item description / service details..."
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                    />

                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Quantity</span>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                          className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Unit Price</span>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Tax (%)</span>
                        <input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => updateItem(item.id, 'taxRate', Number(e.target.value))}
                          className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Total</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(item.amount, currency)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Live Visual PDF Invoice Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md text-slate-800 dark:text-slate-200 space-y-6 text-xs font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live Invoice Preview
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 text-[10px] font-semibold">
                DRAFT
              </span>
            </div>

            {/* Invoice Header */}
            <div className="flex justify-between items-start">
              <div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{currentOrg.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{currentOrg.legalName}</div>
                <div className="text-[10px] text-slate-400">{currentOrg.address}</div>
                {currentOrg.taxId && <div className="text-[10px] text-slate-400 font-mono">Tax ID: {currentOrg.taxId}</div>}
              </div>
              <div className="text-end">
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 font-mono">{invoiceNumber}</div>
                <div className="text-[10px] text-slate-500">Date: {issueDate}</div>
                <div className="text-[10px] text-rose-600 font-medium">Due: {dueDate}</div>
              </div>
            </div>

            {/* Bill To */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
              <div className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Billed To</div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{activeCustomerName}</div>
              <div className="text-[11px] text-slate-500">{activeCustomerCompany}</div>
              <div className="text-[10px] text-slate-400">{activeCustomerEmail}</div>
            </div>

            {/* Live Table */}
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="p-2.5 text-start">Description</th>
                    <th className="p-2.5 text-end">Qty</th>
                    <th className="p-2.5 text-end">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{i.description || 'Service item'}</td>
                      <td className="p-2.5 text-end text-slate-500">{i.quantity}</td>
                      <td className="p-2.5 text-end font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(i.amount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Live Totals */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-end text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal, currency)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(discountTotal, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>Tax (VAT)</span>
                <span className="tabular-nums">{formatCurrency(taxTotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <span>Total Due</span>
                <span className="text-blue-700 dark:text-blue-400 font-mono tabular-nums">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
