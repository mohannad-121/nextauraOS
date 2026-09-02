import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ExternalSignerExperience } from './ExternalSignerExperience';
import type { SignDocument } from '../../types';

export const SignDashboard: React.FC = () => {
  const { navigate, signDocuments } = useApp();
  const [selectedDoc, setSelectedDoc] = useState<SignDocument | null>(null);
  const [isSignerModalOpen, setIsSignerModalOpen] = useState(false);

  const completedDocs = signDocuments.filter((d) => d.status === 'Completed');
  const activeDocs = signDocuments.filter((d) => d.status === 'Sent' || d.status === 'Partially Signed');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Electronic Signatures (Sign)"
        subtitle="Prepare, send, and legally e-sign business agreements with audit trail certificates."
        actions={
          <button
            onClick={() => navigate('sign', 'builder')}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Prepare Document
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Agreements Sent" value={signDocuments.length} change={12.0} accentColor="teal" />
        <StatCard title="Awaiting Signatures" value={activeDocs.length} change={0} comparisonText="active workflow" accentColor="amber" />
        <StatCard title="Completed & Executed" value={completedDocs.length} change={25.0} accentColor="emerald" />
        <StatCard title="Compliance Rate" value="100%" comparisonText="SOC2 & eIDAS valid" accentColor="cyan" />
      </div>

      {/* Document List Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 font-heading">Document Workflows</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 text-start">Document Title</th>
                <th className="p-4 text-start">Recipients</th>
                <th className="p-4 text-start">Created Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {signDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/40">
                  <td className="p-4">
                    <div className="font-semibold text-slate-100">{doc.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{doc.fileName} ({doc.fileSize})</div>
                  </td>
                  <td className="p-4 text-slate-300">
                    <div className="flex -space-x-2">
                      {doc.recipients.map((r) => (
                        <span
                          key={r.id}
                          className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center font-bold text-[10px]"
                          title={`${r.name} (${r.status})`}
                        >
                          {r.name.substring(0, 1)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">{doc.createdAt}</td>
                  <td className="p-4 text-center">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedDoc(doc);
                        setIsSignerModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 font-bold text-xs"
                    >
                      Sign / Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signer Modal */}
      {isSignerModalOpen && selectedDoc && (
        <Modal
          isOpen={isSignerModalOpen}
          onClose={() => setIsSignerModalOpen(false)}
          title={`E-Sign Agreement — ${selectedDoc.title}`}
          maxWidth="4xl"
        >
          <ExternalSignerExperience
            document={selectedDoc}
            onComplete={() => setIsSignerModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};
