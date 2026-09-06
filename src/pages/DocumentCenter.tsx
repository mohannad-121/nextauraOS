import React, { useState } from 'react';
import { FileText, Download, Plus, Upload } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';

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
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Upload Document
          </Button>
        }
      />

      {documents.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="Vault Empty"
          description="Upload your first corporate agreement, audit document, or legal record."
          action={
            <Button
              onClick={() => setIsModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Upload First Document
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/50">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{doc.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{doc.category} • {doc.date} • {doc.size}</div>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Downloading document: ${doc.name}`)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
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
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Document Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Master Services Agreement 2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="Legal Agreements">Legal Agreements</option>
                <option value="Audit & Compliance">Audit & Compliance</option>
                <option value="ESG Reports">ESG Reports</option>
                <option value="Corporate Governance">Corporate Governance</option>
                <option value="Financial Reports">Financial Reports</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddDocument}
                isLoading={isSubmitting}
              >
                Upload Document
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

