import React, { useState } from 'react';
import { Mail, Phone, Plus, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';

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
        phone: phone.trim(),
        company: company.trim(),
        companyName: company.trim(),
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
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Contact
          </Button>
        }
      />

      {contacts.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No Contacts Yet"
          description="Get started by adding your first enterprise customer, vendor, or signatory contact."
          action={
            <Button
              onClick={() => setIsModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add First Contact
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map((cnt) => (
            <div key={cnt.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center font-bold text-sm">
                  {cnt.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{cnt.name}</h3>
                  {(cnt.companyName || cnt.company) && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{cnt.companyName || cnt.company}</div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(cnt.roles || [cnt.type || 'Contact']).map((r) => (
                  <span key={r} className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200/60 dark:border-slate-700/60">
                    {r}
                  </span>
                ))}
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="truncate">{cnt.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
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
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tariq Al-Mansoor"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tariq@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 415 555 0100"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Global Inc."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Contact Role / Type</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="Customer">Customer</option>
                  <option value="Vendor">Vendor</option>
                  <option value="Partner">Partner</option>
                  <option value="Shareholder">Shareholder</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateContact}
                isLoading={isSubmitting}
              >
                Save Contact
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

