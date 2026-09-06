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
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </button>

        <button
          onClick={handleSend}
          className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          Send for Signature
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">Prepare Agreement for E-Signature</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload PDF, assign signers, and place signature field anchors.</p>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Document Title</label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
            />
          </div>

          <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
            <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400 mx-auto" />
            <div className="font-semibold text-slate-900 dark:text-slate-100">Agreement_NDA_v2.pdf Uploaded</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">2 Pages • 1.4 MB PDF Document</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

