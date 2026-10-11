import React, { useState } from 'react';
import { Send, ArrowLeft, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DocumentPrepBuilder: React.FC = () => {
  const { navigate } = useApp();
  const [docTitle, setDocTitle] = useState('Mutual Non-Disclosure Agreement (NDA)');
  const [recipientName, setRecipientName] = useState('Sarah Chen');
  const [recipientEmail, setRecipientEmail] = useState('sarah.chen@nextaura.ai');

  const handleSend = () => {
    navigate('sign', 'overview');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('sign', 'overview')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-[#A3ABC5] dark:hover:text-[#F4F6FF] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </button>

        <button
          onClick={handleSend}
          className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          Send for Signature
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs space-y-6">
        <div className="border-b border-slate-100 dark:border-[#1F253D] pb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-[#F4F6FF] font-heading">Prepare Agreement for E-Signature</h2>
          <p className="text-xs text-slate-500 dark:text-[#A3ABC5] mt-0.5">Upload PDF, assign signers, and place signature field anchors.</p>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Document Title</label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] font-medium"
            />
          </div>

          <div className="p-6 rounded-xl bg-slate-50 dark:bg-[#101426] border border-dashed border-slate-200 dark:border-[#2A3048] text-center space-y-2">
            <FileText className="w-7 h-7 text-[#7568E8] dark:text-[#A499FA] mx-auto" />
            <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">Agreement_NDA_v2.pdf Uploaded</div>
            <p className="text-[11px] text-slate-500 dark:text-[#6B7694]">2 Pages • 1.4 MB PDF Document</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

