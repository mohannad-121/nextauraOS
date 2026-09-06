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
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <span className="font-medium text-slate-500">Campaign register</span>
        <span><span className="text-slate-500">Campaigns</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{emailCampaigns.length}</strong></span>
        <span><span className="text-slate-500">Open rate</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{avgOpenRate}</strong></span>
        <span><span className="text-slate-500">Click rate</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{avgClickRate}</strong></span>
        <span><span className="text-slate-500">Audience</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{totalSubscribers.toLocaleString()}</strong></span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'campaigns'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Email Campaigns ({emailCampaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'templates'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Email Templates ({emailTemplates.length})
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-3.5">
          {emailCampaigns.map((camp) => (
            <div key={camp.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">{camp.name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
                      {camp.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Subject: <span className="text-slate-700 dark:text-slate-300 font-medium">"{camp.subject}"</span> • Target Segment: <span className="text-blue-600 dark:text-blue-400 font-medium">{camp.targetSegment || 'All Subscribers'}</span>
                  </div>
                </div>

                <div className="text-end text-xs">
                  <span className="text-slate-400 block text-[11px]">Recipients</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{(camp.recipientCount || 0).toLocaleString()} Subscribers</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Delivery Rate</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{camp.deliveryRate}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Open Rate</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">{camp.openRate}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Click Rate</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{camp.clickRate}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Unsubscribes</span>
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
            <div key={tpl.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold tracking-wider">{tpl.category}</span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading mt-0.5">{tpl.name}</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium">HTML Visual</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">{tpl.subject || 'Standard Template'}</p>
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
          <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Campaign Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q3 Product Update Blast"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Email Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Introducing 17 New Enterprise Modules in NextAura"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Target Audience Segment</label>
              <select
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="All Customers">All Verified Customers (78,400)</option>
                <option value="Active Subscribers">Active SaaS Subscribers (14,200)</option>
                <option value="Enterprise Leads">Enterprise Prospects (8,900)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs transition-colors"
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
