import React, { useState } from 'react';
import { Star, CheckCircle, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';

export const AppraisalsApp: React.FC = () => {
  const { appraisals, employeeGoals, employees, submitSelfReview, submitManagerReview, completeAppraisal } = useApp();
  const [activeTab, setActiveTab] = useState<'reviews' | 'goals' | 'skills'>('reviews');

  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string | null>(null);
  const [reviewModalMode, setReviewModalMode] = useState<'self' | 'manager' | null>(null);
  const [reviewRating, setReviewRating] = useState(4.5);
  const [reviewNotes, setReviewNotes] = useState('Demonstrates stellar leadership and execution.');

  const selectedAppraisal = appraisals.find((a) => a.id === selectedAppraisalId);

  const handleSubmitReview = () => {
    if (!selectedAppraisalId) return;
    if (reviewModalMode === 'self') {
      submitSelfReview(selectedAppraisalId, reviewRating, reviewNotes);
    } else if (reviewModalMode === 'manager') {
      submitManagerReview(selectedAppraisalId, reviewRating, reviewNotes);
    }
    setReviewModalMode(null);
    setSelectedAppraisalId(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Appraisals & Performance OKRs"
        subtitle="360° performance review cycles, employee goals/OKRs & department skills matrix."
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Active Review Cycle" value="Q3 2026" comparisonText="in progress" accentColor="yellow" />
        <StatCard title="Completed Reviews" value={`${appraisals.filter((a) => a.status === 'Completed').length} / ${appraisals.length}`} change={18.0} accentColor="emerald" />
        <StatCard title="Company Goals on Track" value="85%" comparisonText={`${employeeGoals.length} goals active`} accentColor="cyan" />
        <StatCard title="Average Performance Rating" value="4.7 / 5" comparisonText="high performers" accentColor="indigo" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'reviews'
              ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Performance Reviews ({appraisals.length})
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'goals'
              ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Goals & OKRs ({employeeGoals.length})
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'skills'
              ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Department Skills Matrix
        </button>
      </div>

      {/* TAB 1: REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {appraisals.map((app) => (
            <div key={app.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <img src={app.employeeAvatar} alt="" className="w-10 h-10 rounded-2xl object-cover" />
                  <div>
                    <h4 className="text-base font-bold text-slate-100 font-heading">{app.employeeName}</h4>
                    <div className="text-xs text-slate-400">{app.jobTitle} • {app.department}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-end">
                    <div className="flex items-center text-amber-400 text-base font-black">
                      <Star className="w-4 h-4 fill-current me-1" />
                      {app.overallRating} / 5.0
                    </div>
                    <span className="text-[10px] text-slate-500">Overall Score</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-bold">
                    {app.stage}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs text-center p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">Self Evaluation</span>
                  <span className="font-bold text-slate-200">{app.selfRating} / 5.0</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Manager Rating</span>
                  <span className="font-bold text-slate-200">{app.managerRating} / 5.0</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Goals On Track</span>
                  <span className="font-bold text-emerald-400">{app.goalsOnTrackCount} Active Goals</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80 text-xs">
                {app.stage === 'Self Review' && (
                  <button
                    onClick={() => {
                      setSelectedAppraisalId(app.id);
                      setReviewModalMode('self');
                    }}
                    className="px-4 py-2 rounded-xl bg-yellow-500 text-slate-950 font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Self Review
                  </button>
                )}

                {app.stage === 'Manager Review' && (
                  <button
                    onClick={() => {
                      setSelectedAppraisalId(app.id);
                      setReviewModalMode('manager');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5" />
                    Submit Manager Evaluation
                  </button>
                )}

                {app.stage !== 'Completed' && (
                  <button
                    onClick={() => completeAppraisal(app.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Mark Completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: GOALS & OKRS */}
      {activeTab === 'goals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {employeeGoals.map((g) => (
            <div key={g.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">{g.category}</span>
                  <h4 className="text-sm font-bold text-slate-100 font-heading mt-0.5">{g.title}</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  {g.status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-slate-100 font-mono">{g.progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${g.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SKILLS MATRIX */}
      {activeTab === 'skills' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4 text-start">Employee</th>
                <th className="p-4 text-start">Primary Skill</th>
                <th className="p-4 text-start">Secondary Skill</th>
                <th className="p-4 text-center">Competency Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-800/40">
                  <td className="p-4 font-bold text-slate-100">{emp.name}</td>
                  <td className="p-4 text-slate-300">{emp.skills[0]?.name || 'Architecture'}</td>
                  <td className="p-4 text-slate-400">{emp.skills[1]?.name || 'Management'}</td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold">
                      {emp.skills[0]?.level || 'Expert'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Evaluation Modal */}
      {reviewModalMode && selectedAppraisal && (
        <Modal
          isOpen={!!reviewModalMode}
          onClose={() => setReviewModalMode(null)}
          title={`Submit ${reviewModalMode === 'self' ? 'Self Review' : 'Manager Evaluation'}: ${selectedAppraisal.employeeName}`}
          subtitle="Score performance rating & provide qualitative feedback."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="block text-slate-400 mb-1">Performance Rating (1.0 - 5.0)</label>
              <input type="number" step="0.1" min="1" max="5" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold" />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Feedback & Accomplishments</label>
              <textarea rows={4} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-sans" />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setReviewModalMode(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200">Cancel</button>
              <button onClick={handleSubmitReview} className="px-5 py-2 rounded-xl bg-yellow-500 text-slate-950 font-bold shadow-lg shadow-yellow-500/20">Submit Review</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
