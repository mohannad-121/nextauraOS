import React, { useState } from 'react';
import { Star, CheckCircle, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';

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
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Appraisals & goals"
        subtitle="Run performance reviews, keep goals visible, and understand team skills."
      />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-xs dark:border-[#1F253D] dark:bg-[#161B30] sm:px-6">
        <span className="font-medium text-slate-500 dark:text-[#A3ABC5]">Performance workspace</span>
        <span><span className="text-slate-500 dark:text-[#6B7694]">Reviews</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{appraisals.length}</strong></span>
        <span><span className="text-slate-500 dark:text-[#6B7694]">Completed</span> <strong className="ms-1 font-semibold text-emerald-600 dark:text-[#23C99C]">{appraisals.filter((item) => item.status === 'Completed').length}</strong></span>
        <span><span className="text-slate-500 dark:text-[#6B7694]">Goals</span> <strong className="ms-1 font-semibold text-slate-900 dark:text-[#F4F6FF]">{employeeGoals.length}</strong></span>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 dark:border-[#1F253D] pb-3">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'reviews'
              ? 'bg-slate-900 text-white dark:bg-[#7568E8] dark:text-white shadow-[0_0_12px_rgba(117,104,232,0.35)]'
              : 'text-slate-600 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF] hover:bg-slate-100 dark:hover:bg-[#101426]'
          }`}
        >
          Performance Reviews ({appraisals.length})
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'goals'
              ? 'bg-slate-900 text-white dark:bg-[#7568E8] dark:text-white shadow-[0_0_12px_rgba(117,104,232,0.35)]'
              : 'text-slate-600 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF] hover:bg-slate-100 dark:hover:bg-[#101426]'
          }`}
        >
          Goals & OKRs ({employeeGoals.length})
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'skills'
              ? 'bg-slate-900 text-white dark:bg-[#7568E8] dark:text-white shadow-[0_0_12px_rgba(117,104,232,0.35)]'
              : 'text-slate-600 dark:text-[#A3ABC5] hover:text-slate-900 dark:hover:text-[#F4F6FF] hover:bg-slate-100 dark:hover:bg-[#101426]'
          }`}
        >
          Department Skills Matrix
        </button>
      </div>

      {/* TAB 1: REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {appraisals.map((app) => (
            <div key={app.id} className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-[#1F253D] pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <Avatar src={app.employeeAvatar} name={app.employeeName} className="w-10 h-10 rounded-xl" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF]">{app.employeeName}</h4>
                    <div className="text-xs text-slate-500 dark:text-[#A3ABC5]">{app.jobTitle} • {app.department}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center text-amber-500 text-sm font-bold justify-end">
                      <Star className="w-4 h-4 fill-current me-1" />
                      {app.overallRating} / 5.0
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-[#6B7694]">Overall Score</span>
                  </div>
                  <StatusBadge status={app.stage} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs text-center p-3.5 rounded-xl bg-slate-50/50 dark:bg-[#101426] border border-slate-200/60 dark:border-[#1F253D]">
                <div>
                  <span className="text-slate-400 dark:text-[#6B7694] block text-[10px]">Self Evaluation</span>
                  <span className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{app.selfRating} / 5.0</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-[#6B7694] block text-[10px]">Manager Rating</span>
                  <span className="font-semibold text-slate-900 dark:text-[#F4F6FF]">{app.managerRating} / 5.0</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-[#6B7694] block text-[10px]">Goals On Track</span>
                  <span className="font-semibold text-emerald-600 dark:text-[#23C99C]">{app.goalsOnTrackCount} Active Goals</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1F253D] text-xs">
                {app.stage === 'Self Review' && (
                  <Button
                    onClick={() => {
                      setSelectedAppraisalId(app.id);
                      setReviewModalMode('self');
                    }}
                    variant="primary"
                    size="sm"
                    icon={<Send className="w-4 h-4" />}
                  >
                    Submit Self Review
                  </Button>
                )}

                {app.stage === 'Manager Review' && (
                  <Button
                    onClick={() => {
                      setSelectedAppraisalId(app.id);
                      setReviewModalMode('manager');
                    }}
                    variant="primary"
                    size="sm"
                    icon={<Star className="w-4 h-4" />}
                  >
                    Submit Manager Evaluation
                  </Button>
                )}

                {app.stage !== 'Completed' && (
                  <Button
                    onClick={() => completeAppraisal(app.id)}
                    variant="secondary"
                    size="sm"
                    icon={<CheckCircle className="w-4 h-4" />}
                  >
                    Mark Completed
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: GOALS & OKRS */}
      {activeTab === 'goals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employeeGoals.map((g) => (
            <div key={g.id} className="p-6 rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-semibold text-[#7568E8] uppercase tracking-wider">{g.category}</span>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-[#F4F6FF] mt-0.5">{g.title}</h4>
                </div>
                <StatusBadge status={g.status} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500 dark:text-[#A3ABC5]">Progress</span>
                  <span className="text-slate-900 dark:text-[#F4F6FF] font-mono">{g.progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#101426] overflow-hidden">
                  <div className="h-full bg-[#7568E8] rounded-full" style={{ width: `${g.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SKILLS MATRIX */}
      {activeTab === 'skills' && (
        <div className="rounded-2xl bg-white dark:bg-[#161B30] border border-slate-200/80 dark:border-[#1F253D] shadow-sm overflow-hidden">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50/70 dark:bg-[#101426] text-[11px] font-semibold text-slate-500 dark:text-[#A3ABC5] border-b border-slate-200/80 dark:border-[#1F253D]">
              <tr>
                <th className="p-3.5 text-start">Employee</th>
                <th className="p-3.5 text-start">Primary Skill</th>
                <th className="p-3.5 text-start">Secondary Skill</th>
                <th className="p-3.5 text-center">Competency Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1F253D] font-medium">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-[#101426]/60 transition-colors">
                  <td className="p-3.5 font-semibold text-slate-900 dark:text-[#F4F6FF]">{emp.name}</td>
                  <td className="p-3.5 text-slate-700 dark:text-[#A3ABC5]">{emp.skills[0]?.name || 'Architecture'}</td>
                  <td className="p-3.5 text-slate-500 dark:text-[#6B7694]">{emp.skills[1]?.name || 'Management'}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#7568E8]/10 text-[#7568E8] dark:bg-[#7568E8]/15 dark:text-[#7568E8] border border-[#7568E8]/20 text-[10px] font-semibold">
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
          <div className="space-y-4 text-xs text-slate-600 dark:text-[#A3ABC5]">
            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1 text-[11px]">Performance Rating (1.0 - 5.0)</label>
              <input type="number" step="0.1" min="1" max="5" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-amber-600 dark:text-amber-400 font-mono font-bold text-xs focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] outline-none" />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-[#A3ABC5] font-medium mb-1 text-[11px]">Feedback & Accomplishments</label>
              <textarea rows={4} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} className="w-full p-3.5 rounded-xl bg-white dark:bg-[#101426] border border-slate-200 dark:border-[#2A3048] text-slate-900 dark:text-[#F4F6FF] text-xs focus:ring-2 focus:ring-[#7568E8]/20 focus:border-[#7568E8] outline-none resize-none" />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200/80 dark:border-[#1F253D]">
              <Button onClick={() => setReviewModalMode(null)} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleSubmitReview} variant="primary" size="sm">Submit Review</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
