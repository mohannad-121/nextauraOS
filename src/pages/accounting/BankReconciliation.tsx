import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';

export const BankReconciliation: React.FC = () => {
  const { bankTransactions, reconcileBankTx, accounts } = useApp();

  const operatingAccount = accounts.find((a) => a.category === 'Assets' || a.code === '1000');
  const pendingTx = bankTransactions.filter((tx) => tx.status !== 'Reconciled');
  const reconciledTx = bankTransactions.filter((tx) => tx.status === 'Reconciled');
  const matchRate = bankTransactions.length > 0
    ? `${((reconciledTx.length / bankTransactions.length) * 100).toFixed(1)}%`
    : '0%';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bank Feed & Automated AI Reconciliation"
        subtitle="Automated matching engine pairing bank statement lines with ledger transactions."
      />

      {/* Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs text-slate-400 font-semibold">Bank Statement Balance</span>
          <div className="text-2xl font-black text-slate-100 font-heading">
            ${(operatingAccount?.balance || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Bank Feed Sync</span>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs text-slate-400 font-semibold">Unmatched Statement Items</span>
          <div className="text-2xl font-black text-amber-400 font-heading">{pendingTx.length} Transactions</div>
          <span className="text-[10px] text-slate-500">Requires review or one-click match</span>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-xs text-slate-400 font-semibold">Match Rate Confidence</span>
          <div className="text-2xl font-black text-cyan-400 font-heading">{matchRate}</div>
          <span className="text-[10px] text-cyan-400 font-mono">AI Neural Matcher Active</span>
        </div>
      </div>

      {/* Split Screen Reconciliation Workstation */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-100 font-heading">Statement Lines Awaiting Reconciliation</h3>

        <div className="space-y-4">
          {pendingTx.map((tx) => (
            <div
              key={tx.id}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
            >
              {/* Bank Statement Side */}
              <div className="lg:col-span-5 space-y-1 border-b lg:border-b-0 lg:border-e border-slate-800 pb-4 lg:pb-0 lg:pe-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">{tx.date}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Bank Statement</span>
                </div>
                <div className="text-sm font-bold text-slate-100 font-sans">{tx.description}</div>
                <div className="text-xs text-slate-400">Payee: {tx.payee}</div>
                <div className={`text-base font-black font-mono mt-2 ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-100'}`}>
                  {tx.amount > 0 ? `+$${tx.amount.toLocaleString()}` : `-$${Math.abs(tx.amount).toLocaleString()}`}
                </div>
              </div>

              {/* AI Match Suggestion Center */}
              <div className="lg:col-span-7 space-y-3">
                {tx.suggestedMatch ? (
                  <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Suggested Match ({tx.suggestedMatch.confidence}% Confidence)
                      </span>
                      <button
                        onClick={() => reconcileBankTx(tx.id, tx.suggestedMatch!.accountId)}
                        className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20"
                      >
                        Accept & Reconcile
                      </button>
                    </div>

                    <div className="text-xs font-semibold text-slate-200">
                      {tx.suggestedMatch.accountName}
                    </div>
                    <p className="text-[11px] text-slate-400">{tx.suggestedMatch.reason}</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-300">No exact match found in General Ledger</div>
                      <div className="text-[10px] text-slate-500">Select ledger account to record item</div>
                    </div>
                    <button
                      onClick={() => reconcileBankTx(tx.id, 'acc-6100')}
                      className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                    >
                      Post to Expenses
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed History */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recently Reconciled</h4>
        <div className="space-y-2">
          {reconciledTx.map((tx) => (
            <div key={tx.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-semibold text-slate-200">{tx.description}</span>
                  <span className="text-[10px] text-slate-400 ml-2 font-mono">{tx.date}</span>
                </div>
              </div>
              <span className="font-bold text-slate-100">${Math.abs(tx.amount).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
