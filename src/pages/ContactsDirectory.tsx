import React, { useState } from 'react';
import { Mail, Phone, Plus, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { Modal } from '../components/common/Modal';

export const ContactsDirectory: React.FC = () => {
  const { contacts, createContact } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [roleType, setRoleType] = useState<'Customer' | 'Vendor' | 'Partner' | 'Shareholder'>('Customer');

  const handleCreateContact = async () => {
    if (!name.trim() || !email.trim()) {
      setErrorMessage('Please provide both full name and email address.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await createContact({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || '+1 415 555 0100',
        company: company.trim() || 'Enterprise Counterparty',
        companyName: company.trim() || 'Enterprise Counterparty',
        type: roleType,
        roles: [roleType as any],
      });
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create contact. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Unified Contacts & Counterparties"
        subtitle="Central CRM directory across customers, vendors, signatories, and shareholders."
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Contact
          </button>
        }
      />

      {contacts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-200 font-heading">No Contacts Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Get started by adding your first enterprise customer, vendor, or signatory contact.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs shadow-lg inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add First Contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map((cnt) => (
            <div key={cnt.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
                  {cnt.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-heading">{cnt.name}</h3>
                  <div className="text-[11px] text-slate-400">{cnt.companyName || cnt.company || 'Enterprise Counterparty'}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(cnt.roles || [cnt.type || 'Contact']).map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                    {r}
                  </span>
                ))}
              </div>

              <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{cnt.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{cnt.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add New Counterparty Contact"
          subtitle="Create contact entry stored centrally for invoicing, contracts, and CRM."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-300">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tariq Al-Mansoor"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tariq@company.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 415 555 0100"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Global Inc."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Contact Role / Type</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Customer">Customer</option>
                  <option value="Vendor">Vendor</option>
                  <option value="Partner">Partner</option>
                  <option value="Shareholder">Shareholder</option>
                </select>
              </div>
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
                onClick={handleCreateContact}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

