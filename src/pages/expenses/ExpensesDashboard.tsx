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
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
            >
              Approval Queue ({pendingApprovals.length})
            </button>
            <button
              onClick={() => setSubmitModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Expense</span>
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <span className="font-medium text-slate-500">Expense register</span>
        <span><span className="text-slate-500">Recorded spend</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(totalSpent)}</strong></span>
        <span><span className="text-slate-500">Awaiting approval</span> <strong className="ms-1 font-semibold text-amber-800 dark:text-amber-300">{pendingApprovals.length}</strong></span>
      </div>

      {/* Expense List */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-heading">Recent Expense Claims</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 dark:border-slate-800">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 flex items-center gap-2.5">
                    <Avatar src={exp.employeeAvatar} name={exp.employeeName} className="w-7 h-7 rounded-lg" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{exp.employeeName}</span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{exp.title}</div>
                    <div className="text-[11px] text-slate-400">{exp.merchant}</div>
                  </td>
                  <td className="p-3.5 text-slate-500 dark:text-slate-400">{exp.category}</td>
                  <td className="p-3.5 text-slate-500 dark:text-slate-400">{exp.date}</td>
                  <td className="p-3.5 text-end font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(exp.amount, exp.currency)}</td>
                  <td className="p-3.5 text-center">
                    {exp.policyViolations && exp.policyViolations.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Cap Exceeded
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Compliant</span>
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
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            {/* Receipt Upload Mock */}
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2.5">
              {isScanning ? (
                <div className="py-4 space-y-1.5">
                  <Sparkles className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
                  <div className="font-semibold text-blue-700 dark:text-blue-400">Scanning receipt with AI OCR...</div>
                  <p className="text-[11px] text-slate-500">Extracting merchant name, total amount, tax & date</p>
                </div>
              ) : (
                <>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 w-10 h-10 mx-auto flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Drop receipt image or click to scan</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Supports PNG, JPG, PDF up to 10MB</p>
                  </div>
                  <button
                    onClick={handleSimulateScan}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium border border-blue-200 text-xs inline-flex items-center gap-1.5 transition-colors"
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
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Expense Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. STK Steakhouse Client Dinner"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Merchant</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Merchant name"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Amount ($)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value="Meals & Entertainment">Meals & Entertainment</option>
                  <option value="Travel & Lodging">Travel & Lodging</option>
                  <option value="Software & Cloud">Software & Cloud</option>
                  <option value="Training & Development">Training & Development</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSubmitModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs shadow-xs disabled:opacity-50 transition-colors"
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
