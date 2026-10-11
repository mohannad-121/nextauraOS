import React, { useState } from 'react';
import { Plus, AlertTriangle, Sparkles, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { formatCurrency } from '../../utils/formatters';

export const ExpensesDashboard: React.FC = () => {
  const { navigate, expenses, createExpense, user } = useApp();

  const [isSubmitModalOpen, setSubmitModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Meals & Entertainment');
  const [notes, setNotes] = useState('');

  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingApprovals = expenses.filter((e) => e.status === 'Manager Review' || e.status === 'Submitted');

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setTitle('Client Advisory Dinner');
      setMerchant('STK Steakhouse San Francisco');
      setAmount('142.50');
      setCategory('Meals & Entertainment');
      setNotes('Dinner meeting with Arzana Arabia executive board.');
    }, 1500);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title || !amount) {
      setErrorMessage('Expense title and amount are required.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await createExpense({
        employeeId: user.id,
        employeeName: user.name,
        employeeAvatar: user.avatar,
        title,
        merchant,
        date: new Date().toISOString().substring(0, 10),
        category,
        amount: Number(amount),
        currency: 'USD',
        status: 'Manager Review',
        paymentMethod: 'Personal Cash/Card',
        notes,
      });
      setTitle('');
      setMerchant('');
      setAmount('');
      setNotes('');
      setSubmitModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        category="Finance"
        title="Expenses"
        subtitle="Submit receipts, review claims, and keep company spend moving through approval."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('expenses', 'approvals')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#101426] hover:bg-slate-200 dark:hover:bg-[#1F253D] text-slate-800 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF] border border-slate-200 dark:border-[#1F253D] text-xs font-medium transition-colors cursor-pointer"
            >
              Approval Queue ({pendingApprovals.length})
            </button>
            <button
              onClick={() => setSubmitModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Expense</span>
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-[#1F253D] dark:bg-[#161B30] sm:px-6">
        <span className="font-medium text-slate-500 dark:text-[#6B7694]">Expense register</span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Recorded spend</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{formatCurrency(totalSpent)}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Awaiting approval</span> <strong className="ms-1 font-semibold text-amber-500 dark:text-amber-400">{pendingApprovals.length}</strong></span>
      </div>

      {/* Expense List */}
      <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#1F253D] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF] font-heading">Recent Expense Claims</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-[#101426] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A3ABC5] border-b border-slate-200/80 dark:border-[#1F253D]">
              <tr>
                <th className="p-3.5 text-start">Employee</th>
                <th className="p-3.5 text-start">Title & Merchant</th>
                <th className="p-3.5 text-start">Category</th>
                <th className="p-3.5 text-start">Date</th>
                <th className="p-3.5 text-end">Amount</th>
                <th className="p-3.5 text-center">Policy Check</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F253D] font-medium">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-[#101426]/50 transition-colors">
                  <td className="p-3.5 flex items-center gap-2.5">
                    <Avatar src={exp.employeeAvatar} name={exp.employeeName} className="w-7 h-7 rounded-lg" />
                    <span className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{exp.employeeName}</span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{exp.title}</div>
                    <div className="text-[11px] text-slate-400 dark:text-[#6B7694]">{exp.merchant}</div>
                  </td>
                  <td className="p-3.5 text-slate-500 dark:text-[#A3ABC5]">{exp.category}</td>
                  <td className="p-3.5 text-slate-500 dark:text-[#A3ABC5]">{exp.date}</td>
                  <td className="p-3.5 text-end font-semibold text-slate-900 dark:text-[#F4F6FF] tabular-nums">{formatCurrency(exp.amount, exp.currency)}</td>
                  <td className="p-3.5 text-center">
                    {exp.policyViolations && exp.policyViolations.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-medium inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Cap Exceeded
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-[#6B7694]">Compliant</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <StatusBadge status={exp.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submission Modal with Interactive OCR Scanner */}
      {isSubmitModalOpen && (
        <Modal
          isOpen={isSubmitModalOpen}
          onClose={() => setSubmitModalOpen(false)}
          title="Submit New Expense Claim"
          subtitle="Upload receipt for automated AI OCR data extraction."
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-[#A3ABC5]">
            {/* Receipt Upload Mock */}
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#101426] border border-dashed border-slate-200 dark:border-[#2A3048] text-center space-y-2.5">
              {isScanning ? (
                <div className="py-4 space-y-1.5">
                  <Sparkles className="w-7 h-7 text-[#7568E8] animate-spin mx-auto" />
                  <div className="font-semibold text-[#7568E8] dark:text-[#A499FA]">Scanning receipt with AI OCR...</div>
                  <p className="text-[11px] text-slate-500 dark:text-[#6B7694]">Extracting merchant name, total amount, tax & date</p>
                </div>
              ) : (
                <>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#161B30] text-[#7568E8] dark:text-[#A499FA] w-10 h-10 mx-auto flex items-center justify-center border border-slate-200 dark:border-[#2A3048] shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-[#F4F6FF]">Drop receipt image or click to scan</div>
                    <p className="text-[11px] text-slate-400 dark:text-[#6B7694] mt-0.5">Supports PNG, JPG, PDF up to 10MB</p>
                  </div>
                  <button
                    onClick={handleSimulateScan}
                    className="px-3.5 py-1.5 rounded-xl bg-[#7568E8]/10 text-[#7568E8] dark:text-[#A499FA] hover:bg-[#7568E8]/20 font-medium border border-[#7568E8]/25 text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Simulate AI OCR Scan
                  </button>
                </>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Expense Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. STK Steakhouse Client Dinner"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Merchant</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Merchant name"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Amount ($)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-[#6B7694] font-semibold focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                >
                  <option value="Meals & Entertainment">Meals & Entertainment</option>
                  <option value="Travel & Lodging">Travel & Lodging</option>
                  <option value="Software & Cloud">Software & Cloud</option>
                  <option value="Training & Development">Training & Development</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-[#1F253D]">
              <button
                onClick={() => setSubmitModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#101426] hover:bg-slate-200 dark:hover:bg-[#1F253D] text-slate-700 dark:text-[#A3ABC5] text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Expense'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
