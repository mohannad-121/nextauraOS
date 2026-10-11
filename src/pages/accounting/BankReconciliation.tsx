import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';

export const BankReconciliation: React.FC = () => {
  const { bankTransactions, reconcileBankTx, accounts } = useApp();

  const operatingAccount = accounts.find((a) => a.category === 'Assets' || a.code === '1000');
  const pendingTx = bankTransactions.filter((tx) => tx.status !== 'Reconciled');
  const reconciledTx = bankTransactions.filter((tx) => tx.status === 'Reconciled');
  const matchRate = bankTransactions.length > 0
    ? `${((reconciledTx.length / bankTransactions.length) * 100).toFixed(1)}%`
    : '0%';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Bank Feed & Automated AI Reconciliation"
        subtitle="Automated matching engine pairing bank statement lines with ledger transactions."
      />

      {/* Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs space-y-1">
          <span className="text-xs text-slate-500 dark:text-[#A3ABC5] font-medium">Bank Statement Balance</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-[#F4F6FF]">
            ${(operatingAccount?.balance || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-[#08B894] dark:text-[#23C99C] font-mono">Bank Feed Sync</span>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs space-y-1">
          <span className="text-xs text-slate-500 dark:text-[#A3ABC5] font-medium">Unmatched Statement Items</span>
          <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">{pendingTx.length} Transactions</div>
          <span className="text-[11px] text-slate-500 dark:text-[#6B7694]">Requires review or one-click match</span>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs space-y-1">
          <span className="text-xs text-slate-500 dark:text-[#A3ABC5] font-medium">Match Rate Confidence</span>
          <div className="text-2xl font-bold text-[#7568E8] dark:text-[#A499FA]">{matchRate}</div>
          <span className="text-[11px] text-[#7568E8] dark:text-[#A499FA] font-mono">AI Neural Matcher Active</span>
        </div>
      </div>

      {/* Split Screen Reconciliation Workstation */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">Statement Lines Awaiting Reconciliation</h3>

        <div className="space-y-4">
          {pendingTx.map((tx) => (
            <div
              key={tx.id}
              className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
            >
              {/* Bank Statement Side */}
              <div className="lg:col-span-5 space-y-1 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-[#1F253D] pb-4 lg:pb-0 lg:pr-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-[#6B7694] font-mono">{tx.date}</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-[#6B7694]">Bank Statement</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">{tx.description}</div>
                <div className="text-xs text-slate-500 dark:text-[#A3ABC5]">Payee: {tx.payee}</div>
                <div className={`text-base font-bold font-mono mt-2 ${tx.amount > 0 ? 'text-[#08B894] dark:text-[#23C99C]' : 'text-slate-900 dark:text-[#F4F6FF]'}`}>
                  {tx.amount > 0 ? `+$${tx.amount.toLocaleString()}` : `-$${Math.abs(tx.amount).toLocaleString()}`}
                </div>
              </div>

              {/* AI Match Suggestion Center */}
              <div className="lg:col-span-7 space-y-3">
                {tx.suggestedMatch ? (
                  <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-[#7568E8]/10 border border-indigo-200/60 dark:border-[#7568E8]/25 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#7568E8] dark:text-[#A499FA] flex items-center gap-1.5 uppercase">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Suggested Match ({tx.suggestedMatch.confidence}% Confidence)
                      </span>
                      <Button
                        onClick={() => reconcileBankTx(tx.id, tx.suggestedMatch!.accountId)}
                        variant="primary"
                        size="xs"
                      >
                        Accept & Reconcile
                      </Button>
                    </div>

                    <div className="text-xs font-semibold text-slate-900 dark:text-[#F4F6FF]">
                      {tx.suggestedMatch.accountName}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#A3ABC5]">{tx.suggestedMatch.reason}</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-[#101426] border border-slate-200/60 dark:border-[#1F253D] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-800 dark:text-[#F4F6FF]">No exact match found in General Ledger</div>
                      <div className="text-[11px] text-slate-500 dark:text-[#A3ABC5]">Select ledger account to record item</div>
                    </div>
                    <Button
                      onClick={() => reconcileBankTx(tx.id, 'acc-6100')}
                      variant="secondary"
                      size="xs"
                    >
                      Post to Expenses
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed History */}
      <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] p-6 space-y-3 shadow-xs">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A3ABC5]">Recently Reconciled</h4>
        <div className="space-y-2">
          {reconciledTx.map((tx) => (
            <div key={tx.id} className="p-3 rounded-xl bg-slate-50/50 dark:bg-[#101426] border border-slate-200/60 dark:border-[#1F253D] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#08B894] dark:text-[#23C99C]" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{tx.description}</span>
                  <span className="text-[11px] text-slate-500 dark:text-[#6B7694] ml-2 font-mono">{tx.date}</span>
                </div>
              </div>
              <span className="font-bold text-slate-900 dark:text-[#F4F6FF] font-mono">${Math.abs(tx.amount).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
