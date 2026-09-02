import React from 'react';
import { FileText, Download } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';

export const DocumentCenter: React.FC = () => {
  const documents = [
    { name: 'Series A Investor Rights Agreement', category: 'Legal Agreements', date: '2026-08-25', size: '2.4 MB', type: 'PDF' },
    { name: 'Mutual Non-Disclosure Agreement (Vertex)', category: 'Legal Agreements', date: '2026-08-10', size: '850 KB', type: 'PDF' },
    { name: 'Audit Report FY2025 (KPMG Certified)', category: 'Audit & Compliance', date: '2026-03-15', size: '4.8 MB', type: 'PDF' },
    { name: 'GHG Protocol Carbon Footprint Verification', category: 'ESG Reports', date: '2026-07-01', size: '1.9 MB', type: 'PDF' },
    { name: 'Articles of Incorporation (Delaware)', category: 'Corporate Governance', date: '2024-01-10', size: '3.1 MB', type: 'PDF' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Secure Document Vault"
        subtitle="Central encrypted repository for contracts, financial audits & corporate records."
      />

      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="divide-y divide-slate-800 text-xs">
          {documents.map((doc) => (
            <div key={doc.name} className="p-4 flex items-center justify-between hover:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-100">{doc.name}</div>
                  <div className="text-[10px] text-slate-400">{doc.category} • {doc.date} • {doc.size}</div>
                </div>
              </div>

              <button className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300" title="Download">
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
