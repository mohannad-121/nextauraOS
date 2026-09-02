import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';

export const CapTable: React.FC = () => {
  const { shareholders, createShareholder } = useApp();
  const [isModalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'Founder' | 'Investor' | 'Employee'>('Investor');
  const [shareClass, setShareClass] = useState<'Common A' | 'Preferred Series A' | 'Options Pool'>('Preferred Series A');
  const [sharesCount, setSharesCount] = useState('500000');
  const [investment, setInvestment] = useState('1000000');

  const handleIssue = () => {
    if (!name || !sharesCount) return;
    const count = Number(sharesCount);
    const totalCurrentShares = shareholders.reduce((acc, curr) => acc + curr.sharesCount, 0);
    const newTotal = totalCurrentShares + count;
    const ownership = Number(((count / newTotal) * 100).toFixed(1));

    createShareholder({
      name,
      email,
      type,
      shareClass,
      sharesCount: count,
      ownershipPercentage: ownership,
      totalInvestment: Number(investment || 0),
      issueDate: new Date().toISOString().substring(0, 10),
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Shareholders Directory & Cap Table"
        subtitle="Manage share classes, ownership percentages, equity issuances & options."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Issue New Shares
          </button>
        }
      />

      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 text-start">Shareholder Name</th>
                <th className="p-4 text-start">Security Class</th>
                <th className="p-4 text-end">Shares Issued</th>
                <th className="p-4 text-end">Ownership Stake</th>
                <th className="p-4 text-end">Capital Invested</th>
                <th className="p-4 text-start">Issue Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {shareholders.map((sh) => (
                <tr key={sh.id} className="hover:bg-slate-800/40">
                  <td className="p-4">
                    <div className="font-bold text-slate-100">{sh.name}</div>
                    <div className="text-[10px] text-slate-400">{sh.email}</div>
                  </td>
                  <td className="p-4 text-slate-300">{sh.shareClass}</td>
                  <td className="p-4 text-end font-mono font-bold text-slate-100">{sh.sharesCount.toLocaleString()}</td>
                  <td className="p-4 text-end font-mono font-bold text-amber-400">{sh.ownershipPercentage}%</td>
                  <td className="p-4 text-end font-bold text-slate-200">
                    {sh.totalInvestment > 0 ? `$${sh.totalInvestment.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-4 text-slate-400">{sh.issueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          title="Issue New Stock Certificates"
          subtitle="Add new shareholder or grant additional equity shares."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 mb-1">Shareholder Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                  <option value="Founder">Founder</option>
                  <option value="Investor">Investor</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Share Class</label>
                <select value={shareClass} onChange={(e) => setShareClass(e.target.value as any)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                  <option value="Common A">Common A</option>
                  <option value="Preferred Series A">Preferred Series A</option>
                  <option value="Options Pool">Options Pool</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Number of Shares</label>
                <input type="number" value={sharesCount} onChange={(e) => setSharesCount(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-bold" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Capital Investment ($)</label>
                <input type="number" value={investment} onChange={(e) => setInvestment(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200">Cancel</button>
              <button onClick={handleIssue} className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20">Issue Certificate</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
