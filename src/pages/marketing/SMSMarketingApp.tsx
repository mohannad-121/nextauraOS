import React, { useState } from 'react';
import { Send, Smartphone, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';

export const SMSMarketingApp: React.FC = () => {
  const { smsCampaigns, createSMSCampaign } = useApp();
  const [isModalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [message, setMessage] = useState('Flash Sale: Get 25% off NextAura Enterprise licenses this week. Use code NEXTAURA25 at checkout: https://nextaura.ai/sale');
  const [targetSegment, setTargetSegment] = useState('VIP Customers');

  const charCount = message.length;
  const segmentCount = Math.ceil(charCount / 160) || 1;

  const handleCreate = () => {
    if (!name || !message) return;
    createSMSCampaign({
      name,
      message,
      status: 'Sent',
      targetSegment,
      recipientCount: 8400,
      sentCount: 8400,
      clickRate: 14.2,
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="SMS Marketing & Broadcast Messaging"
        subtitle="Send targeted SMS broadcasts, inspect phone previews, character limits & short-link tracking."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New SMS Broadcast
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Broadcasts Sent" value={smsCampaigns.length} comparisonText="active messages" accentColor="indigo" />
        <StatCard title="Delivery Success Rate" value="96.4%" change={0.8} accentColor="emerald" />
        <StatCard title="Link Click Rate" value="34.1%" change={4.2} accentColor="cyan" />
        <StatCard title="Total SMS Subscribers" value="28.9K" comparisonText="opted in phone numbers" accentColor="purple" />
      </div>

      {/* SMS Broadcast Composer & Phone Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Composer Form */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 font-heading">SMS Broadcast Composer</h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Campaign Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. End of Quarter Flash Promotion"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-400 font-medium">SMS Message Text</label>
                <span className={`font-mono text-[10px] ${charCount > 160 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                  {charCount} / 160 characters ({segmentCount} SMS Segment{segmentCount > 1 ? 's' : ''})
                </span>
              </div>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-sans text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Audience Segment</label>
              <select
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
              >
                <option value="VIP Customers">VIP Customers (8,400 Numbers)</option>
                <option value="All Opted-in Contacts">All Opted-in Contacts (28,900 Numbers)</option>
                <option value="Inactive Leads">Inactive Leads (4,200 Numbers)</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (name) handleCreate();
              }}
              className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Broadcast SMS Now
            </button>
          </div>
        </div>

        {/* Right: Realistic Phone Preview */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
            <Smartphone className="w-4 h-4" />
            LIVE SMARTPHONE PREVIEW
          </span>

          <div className="w-64 h-[400px] rounded-[36px] bg-slate-950 border-4 border-slate-800 p-4 shadow-2xl relative flex flex-col justify-between overflow-hidden">
            {/* Speaker & Notch */}
            <div className="w-20 h-4 bg-slate-900 rounded-b-xl mx-auto -mt-4" />

            {/* Chat Bubble */}
            <div className="space-y-2 mt-4">
              <div className="text-[10px] text-center text-slate-500 font-mono">Today 10:42 AM</div>
              <div className="p-3 rounded-2xl bg-indigo-600 text-slate-100 text-[11px] leading-relaxed shadow-lg rounded-tl-sm">
                {message || 'Type message text to preview...'}
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mb-1" />
          </div>
        </div>
      </div>

      {/* History */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-100 font-heading">
          Recent SMS Campaign Broadcasts
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 text-start">Campaign</th>
                <th className="p-4 text-start">Segment</th>
                <th className="p-4 text-end">Recipients</th>
                <th className="p-4 text-center">Delivery Rate</th>
                <th className="p-4 text-center">Click Rate</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {smsCampaigns.map((sms) => (
                <tr key={sms.id} className="hover:bg-slate-800/40">
                  <td className="p-4 font-bold text-slate-100">{sms.name}</td>
                  <td className="p-4 text-indigo-400">{sms.targetSegment || 'VIP Contacts'}</td>
                  <td className="p-4 text-end font-mono">{(sms.recipientCount || 0).toLocaleString()}</td>
                  <td className="p-4 text-center font-bold text-emerald-400">{sms.deliveryRate}%</td>
                  <td className="p-4 text-center font-bold text-cyan-400">{sms.clickRate}%</td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                      {sms.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          title="New SMS Broadcast"
          subtitle="Configure SMS campaign title and message text."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 mb-1">Campaign Title</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VIP Promotion" className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 rounded-xl bg-indigo-500 text-slate-950 font-bold shadow-lg shadow-indigo-500/20">Send Broadcast</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
