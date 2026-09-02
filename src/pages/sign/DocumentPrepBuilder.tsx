import React, { useState } from 'react';
import { Send, ArrowLeft, Upload } from 'lucide-react';
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
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('sign', 'overview')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </button>

        <button
          onClick={handleSend}
          className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          Send for Signature
        </button>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-100 font-heading">Prepare Agreement for E-Signature</h2>
          <p className="text-xs text-slate-400 mt-1">Upload PDF, assign signers, and place signature field anchors.</p>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Document Title</label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-semibold"
            />
          </div>

          <div className="p-6 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-2">
            <Upload className="w-6 h-6 text-teal-400 mx-auto" />
            <div className="font-bold text-slate-200">Agreement_NDA_v2.pdf Uploaded</div>
            <p className="text-[11px] text-slate-500">2 Pages • 1.4 MB PDF Document</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
