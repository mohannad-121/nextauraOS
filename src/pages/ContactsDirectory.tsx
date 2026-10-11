import React, { useState } from 'react';
import { Mail, Phone, Plus, UserPlus, LayoutDashboard, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { CrmDashboard } from './crm/CrmDashboard';

export const ContactsDirectory: React.FC = () => {
  const { contacts, createContact } = useApp();
  const [activeTab, setActiveTab] = useState<'crm' | 'contacts'>('crm');
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
    <div className="space-y-6">
      {/* Top Tab Bar */}
      <div className="flex items-center justify-between border-b border-[#1F253D] pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#131728] border border-[#1F253D]">
          <button
            type="button"
            onClick={() => setActiveTab('crm')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'crm'
                ? 'bg-[#7568E8] text-white shadow-[0_0_12px_rgba(117,104,232,0.35)]'
                : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>CRM & Deal Pipeline</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'contacts'
                ? 'bg-[#7568E8] text-white shadow-[0_0_12px_rgba(117,104,232,0.35)]'
                : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Contacts Directory</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#22273D] text-[#A3ABC5]">
              {contacts.length}
            </span>
          </button>
        </div>

        {activeTab === 'contacts' && (
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Contact
          </Button>
        )}
      </div>

      {activeTab === 'crm' ? (
        <CrmDashboard
          onOpenDirectory={() => setActiveTab('contacts')}
          onAddContact={() => {
            setActiveTab('contacts');
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-6">
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
                <div key={cnt.id} className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-[#2D3555] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-[#7568E8]/15 text-[#7568E8] dark:text-[#A499FA] border border-indigo-200/60 dark:border-[#7568E8]/30 flex items-center justify-center font-bold text-sm">
                      {cnt.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">{cnt.name}</h3>
                      {(cnt.companyName || cnt.company) && (
                        <div className="text-[11px] text-slate-500 dark:text-[#A3ABC5]">{cnt.companyName || cnt.company}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(cnt.roles || [cnt.type || 'Contact']).map((r) => (
                      <span key={r} className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1F253D] text-slate-700 dark:text-[#A3ABC5] text-[10px] font-medium border border-slate-200/60 dark:border-[#2A3048]">
                        {r}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-[#A3ABC5] pt-3 border-t border-slate-100 dark:border-[#1F253D]">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-[#747E9B]" />
                      <span className="truncate">{cnt.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-[#747E9B]" />
                      <span>{cnt.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <label className="block text-slate-600 dark:text-[#A3ABC5] font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tariq Al-Mansoor"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-[#A3ABC5] font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tariq@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-[#A3ABC5] font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 415 555 0100"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-[#A3ABC5] font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Global Inc."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-[#A3ABC5] font-medium mb-1">Contact Role / Type</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] transition-all"
                >
                  <option value="Customer">Customer</option>
                  <option value="Vendor">Vendor</option>
                  <option value="Partner">Partner</option>
                  <option value="Shareholder">Shareholder</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#1F253D]">
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

