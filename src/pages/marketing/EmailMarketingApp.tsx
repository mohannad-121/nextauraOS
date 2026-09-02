import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';

export const EmailMarketingApp: React.FC = () => {
  const { emailCampaigns, emailTemplates, createEmailCampaign } = useApp();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');

  const [isModalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [targetSegment, setTargetSegment] = useState('All Customers');

  const handleCreate = () => {
    if (!name || !subject) return;
    createEmailCampaign({
      name,
      subject,
      senderName: 'NextAura Growth',
      senderEmail: 'growth@nextaura.ai',
      status: 'Scheduled',
      targetSegment,
      recipientCount: 24500,
      sentCount: 24500,
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Email Marketing & Automation"
        subtitle="Design email campaigns, target segments, inspect open/click rates & build reusable templates."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Create Campaign
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Active Campaigns" value={emailCampaigns.length} comparisonText="sent & scheduled" accentColor="rose" />
        <StatCard title="Avg Open Rate" value="41.8%" change={2.4} accentColor="cyan" />
        <StatCard title="Click-Through Rate" value="18.2%" change={1.2} accentColor="indigo" />
        <StatCard title="Total Subscribers" value="78.4K" comparisonText="verified emails" accentColor="emerald" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'campaigns'
              ? 'bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Email Campaigns ({emailCampaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'templates'
              ? 'bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Email Templates ({emailTemplates.length})
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {emailCampaigns.map((camp) => (
            <div key={camp.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100 font-heading">{camp.name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase">
                      {camp.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Subject: <span className="text-slate-200 font-medium">"{camp.subject}"</span> • Target Segment: <span className="text-cyan-400 font-semibold">{camp.targetSegment || 'All Subscribers'}</span>
                  </div>
                </div>

                <div className="text-end text-xs">
                  <span className="text-slate-500 block">Recipients</span>
                  <span className="font-mono font-bold text-slate-100">{(camp.recipientCount || 0).toLocaleString()} Subscribers</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-center p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">Delivery Rate</span>
                  <span className="font-bold text-slate-100">{camp.deliveryRate}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Open Rate</span>
                  <span className="font-bold text-rose-400 font-mono">{camp.openRate}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Click Rate</span>
                  <span className="font-bold text-cyan-400 font-mono">{camp.clickRate}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Unsubscribes</span>
                  <span className="font-bold text-slate-400 font-mono">{camp.unsubscribeRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {emailTemplates.map((tpl) => (
            <div key={tpl.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-rose-400 uppercase font-bold">{tpl.category}</span>
                  <h3 className="text-base font-bold text-slate-100 font-heading mt-0.5">{tpl.name}</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 text-[10px]">HTML Visual</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">{tpl.subject || 'Standard Template'}</p>
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
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 mb-1">Campaign Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 Product Update Blast" className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Email Subject Line</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Introducing 17 New Enterprise Modules in NextAura" className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-semibold" />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Target Audience Segment</label>
              <select value={targetSegment} onChange={(e) => setTargetSegment(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                <option value="All Customers">All Verified Customers (78,400)</option>
                <option value="Active Subscribers">Active SaaS Subscribers (14,200)</option>
                <option value="Enterprise Leads">Enterprise Prospects (8,900)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 rounded-xl bg-rose-500 text-slate-950 font-bold shadow-lg shadow-rose-500/20">Schedule Campaign</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
