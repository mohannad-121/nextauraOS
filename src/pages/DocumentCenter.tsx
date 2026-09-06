import React, { useState } from 'react';
import { FileText, Download, Plus, Upload } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Modal } from '../components/common/Modal';

interface DocumentItem {
  id: string;
  name: string;
  category: string;
  date: string;
  size: string;
  type: string;
}

export const DocumentCenter: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([
    { id: 'doc-1', name: 'Series A Investor Rights Agreement', category: 'Legal Agreements', date: '2026-08-25', size: '2.4 MB', type: 'PDF' },
    { id: 'doc-2', name: 'Mutual Non-Disclosure Agreement (Vertex)', category: 'Legal Agreements', date: '2026-08-10', size: '850 KB', type: 'PDF' },
    { id: 'doc-3', name: 'Audit Report FY2025 (KPMG Certified)', category: 'Audit & Compliance', date: '2026-03-15', size: '4.8 MB', type: 'PDF' },
    { id: 'doc-4', name: 'GHG Protocol Carbon Footprint Verification', category: 'ESG Reports', date: '2026-07-01', size: '1.9 MB', type: 'PDF' },
    { id: 'doc-5', name: 'Articles of Incorporation (Delaware)', category: 'Corporate Governance', date: '2024-01-10', size: '3.1 MB', type: 'PDF' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Legal Agreements');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddDocument = () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      name: name.trim(),
      category,
      date: new Date().toISOString().substring(0, 10),
      size: '1.2 MB',
      type: 'PDF',
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setName('');
    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Secure Document Vault"
        subtitle="Central encrypted repository for contracts, financial audits & corporate records."
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Upload Document
          </button>
        }
      />

      {documents.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-200 font-heading">Vault Empty</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Upload your first corporate agreement, audit document, or legal record.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
          <div className="divide-y divide-slate-800 text-xs">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-100">{doc.name}</div>
                    <div className="text-[10px] text-slate-400">{doc.category} • {doc.date} • {doc.size}</div>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Downloading document: ${doc.name}`)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Upload Vault Document"
          subtitle="Add document record into the organization's secure vault."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Document Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Master Services Agreement 2026"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Legal Agreements">Legal Agreements</option>
                <option value="Audit & Compliance">Audit & Compliance</option>
                <option value="ESG Reports">ESG Reports</option>
                <option value="Corporate Governance">Corporate Governance</option>
                <option value="Financial Reports">Financial Reports</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDocument}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                Upload Document
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

