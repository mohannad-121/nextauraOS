import React, { useState } from 'react';
import { Send, Smartphone, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';

export const SMSMarketingApp: React.FC = () => {
  const { activeSubView, smsCampaigns, createSMSCampaign, contacts } = useApp();
  const [isModalOpen, setModalOpen] = useState(false);

  React.useEffect(() => {
    if (activeSubView === 'new') {
      setModalOpen(true);
    }
  }, [activeSubView]);

  const [name, setName] = useState('');
  const [message, setMessage] = useState('Flash Sale: Get 25% off NextAura Enterprise licenses this week. Use code NEXTAURA25 at checkout: https://nextaura.ai/sale');
  const [targetSegment, setTargetSegment] = useState('VIP Customers');

  const charCount = message.length;
  const segmentCount = Math.ceil(charCount / 160) || 1;

  const avgDeliveryRate = smsCampaigns.length > 0
    ? `${(smsCampaigns.reduce((sum, c) => sum + (c.deliveryRate || 0), 0) / smsCampaigns.length).toFixed(1)}%`
    : '0%';

  const avgClickRate = smsCampaigns.length > 0
    ? `${(smsCampaigns.reduce((sum, c) => sum + (c.clickRate || 0), 0) / smsCampaigns.length).toFixed(1)}%`
    : '0%';

  const totalSMSSubscribers = contacts.length > 0 ? contacts.length : smsCampaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0);

  const handleCreate = () => {
    if (!name || !message) return;
    createSMSCampaign({
      name,
      message,
      status: 'Sent',
      targetSegment,
      recipientCount: totalSMSSubscribers || 50,
      sentCount: totalSMSSubscribers || 50,
      clickRate: 0,
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        category="Marketing"
        title="SMS broadcasts"
        subtitle="Write a concise message, choose its audience, and review delivery from one guided workspace."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            New SMS Broadcast
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white dark:bg-[#161B30] dark:border-[#1F253D] px-5 py-4 text-xs shadow-sm sm:px-6">
        <span className="font-semibold text-slate-700 dark:text-[#A3ABC5]">Broadcast register</span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Broadcasts</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{smsCampaigns.length}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Delivery</span> <strong className="ms-1 font-semibold text-[#178CFF] dark:text-[#178CFF]">{avgDeliveryRate}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Click rate</span> <strong className="ms-1 font-semibold text-emerald-600 dark:text-[#23C99C]">{avgClickRate}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Audience</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{totalSMSSubscribers.toLocaleString()}</strong></span>
      </div>

      {/* SMS Broadcast Composer & Phone Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Composer Form */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6FF] font-heading">SMS Broadcast Composer</h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Campaign Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. End of Quarter Flash Promotion"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-700 dark:text-[#A3ABC5] font-medium">SMS Message Text</label>
                <span className={`font-mono text-[10px] ${charCount > 160 ? 'text-amber-500 dark:text-amber-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                  {charCount} / 160 characters ({segmentCount} SMS Segment{segmentCount > 1 ? 's' : ''})
                </span>
              </div>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 font-sans text-xs focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Audience Segment</label>
              <select
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
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
              className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Broadcast SMS Now
            </button>
          </div>
        </div>

        {/* Right: Realistic Phone Preview */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#A3ABC5] uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-[#7568E8] dark:text-[#867AF0]" />
            LIVE SMARTPHONE PREVIEW
          </span>

          <div className="w-60 h-[380px] rounded-[32px] bg-slate-900 dark:bg-[#090B1A] border-4 border-slate-800 dark:border-[#1F253D] p-3.5 shadow-lg relative flex flex-col justify-between overflow-hidden">
            {/* Speaker & Notch */}
            <div className="w-16 h-3.5 bg-slate-800 dark:bg-[#131728] rounded-b-xl mx-auto -mt-3.5" />

            {/* Chat Bubble */}
            <div className="space-y-2 mt-3">
              <div className="text-[10px] text-center text-slate-500 dark:text-slate-400 font-mono">Today 10:42 AM</div>
              <div className="p-3 rounded-2xl bg-[#7568E8] text-white text-[11px] leading-relaxed shadow-sm rounded-tl-xs">
                {message || 'Type message text to preview...'}
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="w-20 h-1 bg-slate-700 dark:bg-[#2A3048] rounded-full mx-auto mb-1" />
          </div>
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#1F253D] font-semibold text-xs text-slate-900 dark:text-[#F4F6FF] font-heading">
          Recent SMS Campaign Broadcasts
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-[#101426] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A3ABC5] border-b border-slate-200/80 dark:border-[#1F253D]">
              <tr>
                <th className="p-3.5 text-start">Campaign</th>
                <th className="p-3.5 text-start">Segment</th>
                <th className="p-3.5 text-end">Recipients</th>
                <th className="p-3.5 text-center">Delivery Rate</th>
                <th className="p-3.5 text-center">Click Rate</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F253D] font-medium">
              {smsCampaigns.map((sms) => (
                <tr key={sms.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1A2035]/50 transition-colors">
                  <td className="p-3.5 font-semibold text-slate-900 dark:text-[#F4F6FF]">{sms.name}</td>
                  <td className="p-3.5 text-[#7568E8] dark:text-[#867AF0]">{sms.targetSegment || 'VIP Contacts'}</td>
                  <td className="p-3.5 text-end font-mono tabular-nums text-slate-900 dark:text-[#F4F6FF]">{(sms.recipientCount || 0).toLocaleString()}</td>
                  <td className="p-3.5 text-center font-semibold text-emerald-600 dark:text-[#23C99C] tabular-nums">{sms.deliveryRate}%</td>
                  <td className="p-3.5 text-center font-semibold text-[#178CFF] tabular-nums">{sms.clickRate}%</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-700 dark:text-[#A3ABC5] text-[10px] font-semibold uppercase tracking-wider">
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
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Campaign Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VIP Promotion"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
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
                Send Broadcast
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
