import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { ExternalSignerExperience } from './ExternalSignerExperience';
import type { SignDocument } from '../../types';

export const SignDashboard: React.FC = () => {
  const { navigate, signDocuments } = useApp();
  const [selectedDoc, setSelectedDoc] = useState<SignDocument | null>(null);
  const [isSignerModalOpen, setIsSignerModalOpen] = useState(false);

  const completedDocs = signDocuments.filter((d) => d.status === 'Completed');
  const activeDocs = signDocuments.filter((d) => d.status === 'Sent' || d.status === 'Partially Signed');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Signatures"
        subtitle="Prepare agreements, send them for signature, and follow every document to completion."
        actions={
          <Button
            onClick={() => navigate('sign', 'builder')}
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
          >
            Prepare Document
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-[#1F253D] dark:bg-[#161B30] sm:px-6">
        <span className="font-medium text-slate-500 dark:text-[#6B7694]">Document register</span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Total</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{signDocuments.length}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Awaiting signatures</span> <strong className="ms-1 font-semibold text-amber-500 dark:text-amber-400">{activeDocs.length}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Completed</span> <strong className="ms-1 font-semibold text-[#08B894] dark:text-[#23C99C]">{completedDocs.length}</strong></span>
      </div>

      {/* Document List Table */}
      <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#1F253D] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">Document Workflows</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50/70 dark:bg-[#101426] text-[11px] font-semibold text-slate-500 dark:text-[#A3ABC5] border-b border-slate-200/80 dark:border-[#1F253D]">
              <tr>
                <th className="p-3.5 text-start">Document Title</th>
                <th className="p-3.5 text-start">Recipients</th>
                <th className="p-3.5 text-start">Created Date</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F253D] font-medium">
              {signDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-[#101426]/50 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{doc.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-[#6B7694] font-mono">{doc.fileName} ({doc.fileSize})</div>
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-[#A3ABC5]">
                    <div className="flex -space-x-1.5">
                      {doc.recipients.map((r) => (
                        <span
                          key={r.id}
                          className="w-6 h-6 rounded-full bg-indigo-50 text-[#7568E8] dark:bg-[#7568E8]/10 dark:text-[#A499FA] border border-indigo-200 dark:border-[#7568E8]/20 flex items-center justify-center font-semibold text-[10px]"
                          title={`${r.name} (${r.status})`}
                        >
                          {r.name.substring(0, 1)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-500 dark:text-[#A3ABC5]">{doc.createdAt}</td>
                  <td className="p-3.5 text-center">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="p-3.5 text-center">
                    <Button
                      onClick={() => {
                        setSelectedDoc(doc);
                        setIsSignerModalOpen(true);
                      }}
                      variant="secondary"
                      size="xs"
                    >
                      Sign / Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* External Signer Modal */}
      {isSignerModalOpen && selectedDoc && (
        <Modal
          isOpen={isSignerModalOpen}
          onClose={() => setIsSignerModalOpen(false)}
          title={`E-Sign Agreement — ${selectedDoc.title}`}
          subtitle="Legally binding document execution powered by NextAura Sign."
          maxWidth="xl"
        >
          <ExternalSignerExperience
            document={selectedDoc}
            onClose={() => setIsSignerModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};
