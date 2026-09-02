import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { JournalEntryLine } from '../../types';

export const JournalEntryForm: React.FC = () => {
  const { navigate, accounts, createJournalEntry, user } = useApp();

  const [entryNumber] = useState(`JE-2026-00${Math.floor(Math.random() * 90 + 10)}`);
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [reference, setReference] = useState('INV-MANUAL-01');
  const [description, setDescription] = useState('Manual Accrual Entry');

  const [lines, setLines] = useState<JournalEntryLine[]>([
    { id: '1', accountId: accounts[0]?.id || '', accountCode: accounts[0]?.code || '1000', accountName: accounts[0]?.name || '', description: 'Debit adjustment', debit: 5000, credit: 0 },
    { id: '2', accountId: accounts[4]?.id || '', accountCode: accounts[4]?.code || '2000', accountName: accounts[4]?.name || '', description: 'Credit AP adjustment', debit: 0, credit: 5000 },
  ]);

  const totalDebit = lines.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const updateLine = (id: string, field: keyof JournalEntryLine, val: any) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id === id) {
          if (field === 'accountId') {
            const acc = accounts.find((a) => a.id === val);
            return {
              ...line,
              accountId: val,
              accountCode: acc?.code || '',
              accountName: acc?.name || '',
            };
          }
          return { ...line, [field]: val };
        }
        return line;
      })
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: Date.now().toString(), accountId: accounts[0]?.id || '', accountCode: accounts[0]?.code || '', accountName: accounts[0]?.name || '', description: '', debit: 0, credit: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const handleSubmit = () => {
    if (!isBalanced) return;
    createJournalEntry({
      entryNumber,
      date,
      reference,
      description,
      status: 'Posted',
      postedBy: user.name,
      lines,
      totalDebit,
      totalCredit,
    });
    navigate('accounting', 'ledger');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('accounting', 'ledger')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to General Ledger
        </button>

        <button
          onClick={handleSubmit}
          disabled={!isBalanced}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 ${
            isBalanced
              ? 'bg-indigo-500 hover:bg-indigo-400 text-slate-950 shadow-indigo-500/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Post Journal Entry
        </button>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-100 font-heading">New Double-Entry Journal Post</h2>
          <p className="text-xs text-slate-400 mt-1">Total Debits must equal Total Credits before posting.</p>
        </div>

        {/* Header Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Journal Entry Number</label>
            <input type="text" value={entryNumber} readOnly className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono font-bold text-indigo-400" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Posting Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Reference / Document #</label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Entry Memo / Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100" />
        </div>

        {/* Lines Editor */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Journal Lines</h4>
            <button onClick={addLine} className="flex items-center gap-1 text-xs font-semibold text-indigo-400">
              <Plus className="w-3.5 h-3.5" /> Add Line
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((ln) => (
              <div key={ln.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-center">
                <div className="sm:col-span-5">
                  <span className="text-[10px] text-slate-500 block mb-1">Account</span>
                  <select
                    value={ln.accountId}
                    onChange={(e) => updateLine(ln.id, 'accountId', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name} ({a.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <span className="text-[10px] text-slate-500 block mb-1">Debit ($)</span>
                  <input
                    type="number"
                    value={ln.debit || ''}
                    onChange={(e) => updateLine(ln.id, 'debit', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono font-bold text-slate-100"
                  />
                </div>

                <div className="sm:col-span-3">
                  <span className="text-[10px] text-slate-500 block mb-1">Credit ($)</span>
                  <input
                    type="number"
                    value={ln.credit || ''}
                    onChange={(e) => updateLine(ln.id, 'credit', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono font-bold text-slate-100"
                  />
                </div>

                <div className="sm:col-span-1 text-center pt-4 sm:pt-0">
                  <button onClick={() => removeLine(ln.id)} className="text-rose-400 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Balance Verification Footer */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Debits: <strong className="text-slate-100 font-mono">${totalDebit.toLocaleString()}</strong></span>
            <span className="mx-3 text-slate-600">|</span>
            <span className="text-slate-400">Credits: <strong className="text-slate-100 font-mono">${totalCredit.toLocaleString()}</strong></span>
          </div>

          <div>
            {isBalanced ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Balanced (Debits = Credits)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Imbalanced (${Math.abs(totalDebit - totalCredit)} difference)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
