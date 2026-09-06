import React, { useState } from 'react';
import { Mail, Phone, Building2, Plus, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';

export const CustomersList: React.FC = () => {
  const { customers, createCustomer } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleCreateCustomer = async () => {
    if (!name.trim() || !email.trim()) {
      setErrorMessage('Customer name and email address are required.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await createCustomer({
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        category="Invoicing"
        title="Customer Directory"
        subtitle="Manage customer relationships, lifetime revenue, and outstanding receivables."
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        }
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No Customers Listed"
          description="Add customer accounts to start generating invoices and tracking receivables."
          actionLabel="Add First Customer"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {customers.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold text-xs font-heading shrink-0">
                  {c.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-heading truncate">{c.name}</h3>
                  {c.company && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{c.company}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                )}
              </div>

              <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-medium">Lifetime Revenue</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(c.lifetimeRevenue)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-medium">Outstanding</span>
                  <span className={`font-semibold tabular-nums ${c.outstandingBalance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500'}`}>
                    {formatCurrency(c.outstandingBalance)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Customer Account"
          subtitle="Create customer record for invoicing and billing."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Customer / Contact Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Apex Global LLC"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@apex.com"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 415 555 0199"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs shadow-xs disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
