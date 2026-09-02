import React, { useState } from 'react';
import { Plus, AlertTriangle, Sparkles, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

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

  const handleSubmit = () => {
    if (!title || !amount) return;
    createExpense({
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
    setSubmitModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Employee Expenses & Cards"
        subtitle="Receipt capture with AI OCR, manager approval workflows, policy checks & corporate cards."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('expenses', 'approvals')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Approval Queue ({pendingApprovals.length})
            </button>
            <button
              onClick={() => setSubmitModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Submit Expense
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Expense Spend" value={totalSpent} isCurrency change={-3.2} accentColor="cyan" />
        <StatCard title="Awaiting Approval" value={pendingApprovals.length} change={0} comparisonText="active items" accentColor="amber" />
        <StatCard title="Corporate Cards Active" value={2} comparisonText="virtual & physical" accentColor="indigo" />
        <StatCard title="Reimbursed YTD" value={1450} isCurrency change={8.4} accentColor="emerald" />
      </div>

      {/* Expense List */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 font-heading">Recent Expense Claims</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 text-start">Employee</th>
                <th className="p-4 text-start">Title & Merchant</th>
                <th className="p-4 text-start">Category</th>
                <th className="p-4 text-start">Date</th>
                <th className="p-4 text-end">Amount</th>
                <th className="p-4 text-center">Policy Alert</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-800/40">
                  <td className="p-4 flex items-center gap-2.5">
                    <img src={exp.employeeAvatar} alt="" className="w-7 h-7 rounded-xl object-cover" />
                    <span className="font-semibold text-slate-200">{exp.employeeName}</span>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-100">{exp.title}</div>
                    <div className="text-[10px] text-slate-400">{exp.merchant}</div>
                  </td>
                  <td className="p-4 text-slate-300">{exp.category}</td>
                  <td className="p-4 text-slate-400">{exp.date}</td>
                  <td className="p-4 text-end font-bold text-slate-100">${exp.amount.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    {exp.policyViolations && exp.policyViolations.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1 justify-center">
                        <AlertTriangle className="w-3 h-3" />
                        Cap Exceeded
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Compliant</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
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
          <div className="space-y-5 text-xs text-slate-300">
            {/* Receipt Upload Mock */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-3">
              {isScanning ? (
                <div className="py-6 space-y-2">
                  <Sparkles className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                  <div className="font-bold text-cyan-400">Scanning receipt with AI OCR...</div>
                  <p className="text-[11px] text-slate-500">Extracting merchant name, total amount, tax & date</p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-slate-900 text-cyan-400 w-12 h-12 mx-auto flex items-center justify-center border border-slate-800">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">Drop receipt image or click to scan</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Supports PNG, JPG, PDF up to 10MB</p>
                  </div>
                  <button
                    onClick={handleSimulateScan}
                    className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-bold border border-cyan-500/20 text-xs inline-flex items-center gap-1.5"
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
                <label className="block text-slate-400 font-medium mb-1">Expense Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. STK Steakhouse Client Dinner"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Merchant</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Merchant name"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Amount ($)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-bold text-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                >
                  <option value="Meals & Entertainment">Meals & Entertainment</option>
                  <option value="Travel & Lodging">Travel & Lodging</option>
                  <option value="Software & Cloud">Software & Cloud</option>
                  <option value="Training & Development">Training & Development</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSubmitModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
              >
                Submit Expense
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
