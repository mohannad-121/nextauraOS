import React, { useState } from 'react';
import { Mail, Phone, Building2, Plus, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';

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
    <div className="space-y-8">
      <PageHeader
        title="Customer Directory"
        subtitle="Manage customer relationships, lifetime revenue, and outstanding receivables."
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Customer
          </button>
        }
      />

      {customers.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-200 font-heading">No Customers Listed</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add customer accounts to start generating invoices and tracking receivables.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add First Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((c) => (
            <div
              key={c.id}
              className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-sm">
                  {c.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-heading">{c.name}</h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-500" />
                    {c.company}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{c.phone}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Lifetime Revenue</span>
                  <span className="font-bold text-slate-100">${c.lifetimeRevenue.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Outstanding</span>
                  <span className={`font-bold ${c.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    ${c.outstandingBalance.toLocaleString()}
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
          title="Add New Customer Account"
          subtitle="Create customer record for invoicing and billing."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-300">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-medium mb-1">Customer / Contact Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Apex Global LLC"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@apex.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 415 555 0199"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-1.5"
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

