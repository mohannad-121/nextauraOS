import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';

export const EmailMarketingApp: React.FC = () => {
  const { activeSubView, emailCampaigns, emailTemplates, createEmailCampaign, contacts } = useApp();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');
  const [isModalOpen, setModalOpen] = useState(false);

  React.useEffect(() => {
    if (activeSubView === 'new') {
      setModalOpen(true);
    } else if (activeSubView === 'templates') {
      setActiveTab('templates');
    } else {
      setActiveTab('campaigns');
    }
  }, [activeSubView]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [targetSegment, setTargetSegment] = useState('All Customers');

  const avgOpenRate = emailCampaigns.length > 0
    ? `${(emailCampaigns.reduce((sum, c) => sum + (c.openRate || 0), 0) / emailCampaigns.length).toFixed(1)}%`
    : '0%';

  const avgClickRate = emailCampaigns.length > 0
    ? `${(emailCampaigns.reduce((sum, c) => sum + (c.clickRate || 0), 0) / emailCampaigns.length).toFixed(1)}%`
    : '0%';

  const totalSubscribers = contacts.length > 0 ? contacts.length : emailCampaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0);

  const handleCreate = () => {
    if (!name || !subject) return;
    createEmailCampaign({
      name,
      subject,
      senderName: 'NextAura Growth',
      senderEmail: 'growth@nextaura.ai',
      status: 'Scheduled',
      targetSegment,
      recipientCount: totalSubscribers || 100,
      sentCount: totalSubscribers || 100,
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        category="Marketing"
        title="Email campaigns"
        subtitle="Create a campaign, choose its audience, and review performance after sending."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white dark:bg-[#161B30] dark:border-[#1F253D] px-5 py-4 text-xs shadow-sm sm:px-6">
        <span className="font-semibold text-slate-700 dark:text-[#A3ABC5]">Campaign register</span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Campaigns</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{emailCampaigns.length}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Open rate</span> <strong className="ms-1 font-semibold text-[#178CFF] dark:text-[#178CFF]">{avgOpenRate}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Click rate</span> <strong className="ms-1 font-semibold text-emerald-600 dark:text-[#23C99C]">{avgClickRate}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Audience</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{totalSubscribers.toLocaleString()}</strong></span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#1F253D] pb-3">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'campaigns'
              ? 'bg-[#7568E8] text-white shadow-[0_0_10px_rgba(117,104,232,0.3)]'
              : 'text-slate-600 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF] hover:bg-slate-100 dark:hover:bg-[#1A2035]'
          }`}
        >
          Email Campaigns ({emailCampaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'templates'
              ? 'bg-[#7568E8] text-white shadow-[0_0_10px_rgba(117,104,232,0.3)]'
              : 'text-slate-600 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF] hover:bg-slate-100 dark:hover:bg-[#1A2035]'
          }`}
        >
          Email Templates ({emailTemplates.length})
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-3.5">
          {emailCampaigns.map((camp) => (
            <div key={camp.id} className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-[#2A3048] transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-[#1F253D] pb-3.5 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6FF] font-heading">{camp.name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-700 dark:text-[#A3ABC5] text-[10px] font-semibold uppercase tracking-wider">
                      {camp.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A3ABC5] mt-1">
                    Subject: <span className="text-slate-700 dark:text-slate-200 font-medium">"{camp.subject}"</span> • Target Segment: <span className="text-[#7568E8] dark:text-[#867AF0] font-medium">{camp.targetSegment || 'All Subscribers'}</span>
                  </div>
                </div>

                <div className="text-end text-xs">
                  <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Recipients</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-[#F4F6FF] tabular-nums">{(camp.recipientCount || 0).toLocaleString()} Subscribers</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center p-3 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/60 dark:border-[#1F253D]">
                <div>
                  <span className="text-slate-400 dark:text-[#A3ABC5] block text-[10px] uppercase font-semibold">Delivery Rate</span>
                  <span className="font-semibold text-slate-900 dark:text-[#F4F6FF] tabular-nums">{camp.deliveryRate}%</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-[#A3ABC5] block text-[10px] uppercase font-semibold">Open Rate</span>
                  <span className="font-bold text-[#178CFF] dark:text-[#178CFF] font-mono tabular-nums">{camp.openRate}%</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-[#A3ABC5] block text-[10px] uppercase font-semibold">Click Rate</span>
                  <span className="font-bold text-emerald-600 dark:text-[#23C99C] font-mono tabular-nums">{camp.clickRate}%</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-[#A3ABC5] block text-[10px] uppercase font-semibold">Unsubscribes</span>
                  <span className="font-medium text-slate-500 dark:text-slate-400 font-mono tabular-nums">{camp.unsubscribeRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {emailTemplates.map((tpl) => (
            <div key={tpl.id} className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-3 hover:border-slate-300 dark:hover:border-[#2A3048] transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-[#7568E8] dark:text-[#867AF0] uppercase font-semibold tracking-wider">{tpl.category}</span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6FF] font-heading mt-0.5">{tpl.name}</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-600 dark:text-[#A3ABC5] text-[10px] font-medium">HTML Visual</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#A3ABC5] leading-relaxed font-sans">{tpl.subject || 'Standard Template'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          title="Create Email Campaign"
          subtitle="Configure campaign details, target audience & subject line."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Campaign Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q3 Product Update Blast"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Email Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Introducing 17 New Enterprise Modules in NextAura"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Target Audience Segment</label>
              <select
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              >
                <option value="All Customers">All Verified Customers (78,400)</option>
                <option value="Active Subscribers">Active SaaS Subscribers (14,200)</option>
                <option value="Enterprise Leads">Enterprise Prospects (8,900)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-[#1F253D]">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] hover:bg-slate-200 dark:hover:bg-[#1A2035] text-slate-700 dark:text-[#A3ABC5] text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] transition-all"
              >
                Schedule Campaign
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
