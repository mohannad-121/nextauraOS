import React, { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';

export const SurveysApp: React.FC = () => {
  const { activeSubView, surveys, createSurvey, submitSurveyResponse } = useApp();
  const [isModalOpen, setModalOpen] = useState(false);

  React.useEffect(() => {
    if (activeSubView === 'new') {
      setModalOpen(true);
    }
  }, [activeSubView]);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'NPS' | 'CSAT' | 'Feedback' | 'Market Research'>('CSAT');

  const totalResponses = surveys.reduce((acc, curr) => acc + curr.responsesCount, 0);

  const handleCreate = () => {
    if (!title) return;
    createSurvey({
      title,
      category,
      status: 'Active',
      questionsCount: 4,
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        category="Marketing"
        title="Surveys & feedback"
        subtitle="Create customer surveys, collect responses, and review feedback in one place."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Survey Form
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white dark:bg-[#161B30] dark:border-[#1F253D] px-5 py-4 text-xs shadow-sm sm:px-6">
        <span className="font-semibold text-slate-700 dark:text-[#A3ABC5]">Feedback register</span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Surveys</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{surveys.length}</strong></span>
        <span><span className="text-slate-500 dark:text-[#A3ABC5]">Responses</span> <strong className="ms-1 font-semibold text-emerald-600 dark:text-[#23C99C]">{totalResponses.toLocaleString()}</strong></span>
      </div>

      {/* Surveys List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {surveys.map((surv) => (
          <div key={surv.id} className="p-5 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-[#2A3048] transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-[#7568E8] dark:text-[#867AF0] uppercase font-semibold tracking-wider">{surv.category || 'CSAT'}</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F6FF] font-heading mt-0.5">{surv.title}</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-700 dark:text-[#A3ABC5] text-[10px] font-semibold uppercase tracking-wider">
                {surv.status}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/60 dark:border-[#1F253D] grid grid-cols-3 gap-3 text-xs text-center">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-[#A3ABC5] block font-medium">Responses</span>
                <span className="font-semibold text-slate-900 dark:text-[#F4F6FF] tabular-nums">{surv.responsesCount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-[#A3ABC5] block font-medium">Completion</span>
                <span className="font-bold text-[#178CFF] dark:text-[#178CFF] tabular-nums">{surv.completionRate}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-[#A3ABC5] block font-medium">Avg Score</span>
                <span className="font-bold text-amber-500 dark:text-amber-400 font-mono tabular-nums">{surv.avgScore} / 5.0</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-[#1F253D] flex justify-end">
              <button
                onClick={() => submitSurveyResponse(surv.id, 5)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Simulate Customer 5★ Response
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Builder Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          title="Build New Customer Survey"
          subtitle="Define survey title, question type & target segment."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Survey Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Customer Satisfaction & Feature Request Survey"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1">Survey Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8]"
              >
                <option value="CSAT">Customer Satisfaction (CSAT)</option>
                <option value="NPS">Net Promoter Score (NPS)</option>
                <option value="Feedback">Product Feedback</option>
                <option value="Market Research">Market Research</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-[#1F253D]">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] hover:bg-slate-200 dark:hover:bg-[#1A2035] text-slate-700 dark:text-[#A3ABC5] text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] text-white font-medium text-xs shadow-[0_0_12px_rgba(117,104,232,0.35)] transition-all"
              >
                Publish Survey
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
