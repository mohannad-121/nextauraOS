import React, { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
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
        title="Surveys, NPS & Customer Feedback"
        subtitle="Create multi-page CSAT forms, measure Net Promoter Score (NPS) & inspect real-time responses."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Survey Form
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Surveys" value={surveys.length} comparisonText="collecting feedback" accentColor="amber" />
        <StatCard title="Net Promoter Score (NPS)" value="+64" accentColor="emerald" />
        <StatCard title="Avg Customer CSAT" value="4.8 / 5" accentColor="indigo" />
        <StatCard title="Total Form Responses" value={totalResponses.toLocaleString()} comparisonText="live responses collected" accentColor="rose" />
      </div>

      {/* Surveys List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {surveys.map((surv) => (
          <div key={surv.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-semibold tracking-wider">{surv.category || 'CSAT'}</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading mt-0.5">{surv.title}</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
                {surv.status}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 grid grid-cols-3 gap-3 text-xs text-center">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Responses</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{surv.responsesCount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Completion</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{surv.completionRate}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Avg Score</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">{surv.avgScore} / 5.0</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => submitSurveyResponse(surv.id, 5)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 text-xs font-medium flex items-center gap-1.5 transition-colors"
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
          <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Survey Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Customer Satisfaction & Feature Request Survey"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Survey Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="CSAT">Customer Satisfaction (CSAT)</option>
                <option value="NPS">Net Promoter Score (NPS)</option>
                <option value="Feedback">Product Feedback</option>
                <option value="Market Research">Market Research</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs transition-colors"
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

