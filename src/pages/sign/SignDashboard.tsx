import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
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
        title="Electronic Signatures (Sign)"
        subtitle="Prepare, send, and legally e-sign business agreements with audit trail certificates."
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

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Agreements Sent" value={signDocuments.length} change={12.0} accentColor="teal" />
        <StatCard title="Awaiting Signatures" value={activeDocs.length} change={0} comparisonText="active workflow" accentColor="amber" />
        <StatCard title="Completed & Executed" value={completedDocs.length} change={25.0} accentColor="emerald" />
        <StatCard title="Compliance Rate" value="100%" comparisonText="SOC2 & eIDAS valid" accentColor="azure" />
      </div>

      {/* Document List Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Document Workflows</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="p-3.5 text-start">Document Title</th>
                <th className="p-3.5 text-start">Recipients</th>
                <th className="p-3.5 text-start">Created Date</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {signDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{doc.title}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{doc.fileName} ({doc.fileSize})</div>
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300">
                    <div className="flex -space-x-1.5">
                      {doc.recipients.map((r) => (
                        <span
                          key={r.id}
                          className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-semibold text-[10px]"
                          title={`${r.name} (${r.status})`}
                        >
                          {r.name.substring(0, 1)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-500">{doc.createdAt}</td>
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
