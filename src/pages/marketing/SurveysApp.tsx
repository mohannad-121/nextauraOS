import React, { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';

export const SurveysApp: React.FC = () => {
  const { surveys, createSurvey, submitSurveyResponse } = useApp();
  const [isModalOpen, setModalOpen] = useState(false);

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
    <div className="space-y-8">
      <PageHeader
        title="Surveys, NPS & Customer Feedback"
        subtitle="Create multi-page CSAT forms, measure Net Promoter Score (NPS) & inspect real-time responses."
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Create Survey Form
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Active Surveys" value={surveys.length} comparisonText="collecting feedback" accentColor="amber" />
        <StatCard title="Net Promoter Score (NPS)" value="+64" change={5.0} accentColor="emerald" />
        <StatCard title="Avg Customer CSAT" value="4.8 / 5" change={0.2} accentColor="cyan" />
        <StatCard title="Total Form Responses" value={totalResponses.toLocaleString()} comparisonText="live responses collected" accentColor="indigo" />
      </div>

      {/* Surveys List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {surveys.map((surv) => (
          <div key={surv.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-amber-400 uppercase font-bold">{surv.category || 'CSAT'}</span>
                <h3 className="text-base font-bold text-slate-100 font-heading mt-0.5">{surv.title}</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                {surv.status}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-3 gap-3 text-xs text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">Responses</span>
                <span className="font-bold text-slate-100">{surv.responsesCount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Completion</span>
                <span className="font-bold text-cyan-400">{surv.completionRate}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Avg Score</span>
                <span className="font-bold text-amber-400 font-mono">{surv.avgScore} / 5.0</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => submitSurveyResponse(surv.id, 5)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5"
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
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 mb-1">Survey Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q3 Customer Satisfaction & Feature Request Survey" className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100" />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Survey Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                <option value="CSAT">Customer Satisfaction (CSAT)</option>
                <option value="NPS">Net Promoter Score (NPS)</option>
                <option value="Feedback">Product Feedback</option>
                <option value="Market Research">Market Research</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20">Publish Survey</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
