import React, { useState } from 'react';
import {
  Plus,
  Star,
  CheckCircle2,
  FileSignature,
  Calendar as CalendarIcon,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import type { CandidateStage, Candidate } from '../../types';

export const RecruitmentATS: React.FC = () => {
  const {
    activeSubView,
    candidates,
    jobOpenings,
    interviews,
    updateCandidateStage,
    createCandidate,
    scheduleInterview,
    scoreCandidate,
    createJobOffer,
    hireCandidateToEmployee,
    createJobOpening,
    navigate,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'kanban' | 'jobs' | 'interviews'>('kanban');

  React.useEffect(() => {
    if (activeSubView === 'jobs') {
      setActiveTab('jobs');
    } else if (activeSubView === 'interviews') {
      setActiveTab('interviews');
    } else {
      setActiveTab('kanban');
    }
  }, [activeSubView]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Modals
  const [isJobModalOpen, setJobModalOpen] = useState(false);
  const [isCandidateModalOpen, setCandidateModalOpen] = useState(false);
  const [isInterviewModalOpen, setInterviewModalOpen] = useState(false);
  const [isOfferModalOpen, setOfferModalOpen] = useState(false);

  // Job Opening Form
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [salaryRange, setSalaryRange] = useState('$140k - $180k');

  // New Candidate Form
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candPosition, setCandPosition] = useState('Senior AI Engineer');
  const [candSource, setCandSource] = useState<'LinkedIn' | 'Company Website' | 'Referral' | 'Indeed' | 'Other'>('LinkedIn');

  // Interview Form
  const [intDate, setIntDate] = useState('2026-09-15');
  const [intTime, setIntTime] = useState('10:00 AM');
  const [intType, setIntType] = useState<'HR Screening' | 'Technical' | 'Manager' | 'Final'>('Technical');

  // Offer Form
  const [offerSalary, setOfferSalary] = useState(140000);
  const [offerStartDate, setOfferStartDate] = useState('2026-10-01');

  const stages: CandidateStage[] = [
    'New Applicant',
    'Screening',
    'Phone Interview',
    'Technical Interview',
    'Final Interview',
    'Offer',
    'Hired',
  ];

  const stageColors: Record<CandidateStage, string> = {
    'New Applicant': 'text-slate-600 dark:text-slate-400',
    Screening: 'text-blue-600 dark:text-blue-400',
    'Phone Interview': 'text-indigo-600 dark:text-indigo-400',
    'Technical Interview': 'text-purple-600 dark:text-purple-400',
    'Final Interview': 'text-amber-600 dark:text-amber-400',
    Offer: 'text-rose-600 dark:text-rose-400',
    Hired: 'text-emerald-600 dark:text-emerald-400',
    Rejected: 'text-rose-600 dark:text-rose-400',
  };

  const handleCreateJob = () => {
    if (!jobTitle) return;
    createJobOpening({
      title: jobTitle,
      department,
      location: 'San Francisco HQ / Remote',
      employmentType: 'Full-time',
      hiringManager: 'Moayad Mansour',
      openingsCount: 1,
      salaryRange,
      status: 'Open',
      description: 'Role overview',
      requirements: ['Core competency'],
      createdAt: new Date().toISOString().substring(0, 10),
    });
    setJobModalOpen(false);
  };

  const handleAddCandidate = () => {
    if (!candName || !candEmail) return;
    createCandidate({
      name: candName,
      email: candEmail,
      phone: candPhone || '+1 415 555 0199',
      location: 'San Francisco, CA',
      appliedPositionId: 'pos-1',
      appliedPositionTitle: candPosition,
      department: 'Engineering',
      source: candSource,
      rating: 4,
      skills: ['TypeScript', 'React', 'Node.js'],
      appliedDate: new Date().toISOString().substring(0, 10),
    });
    setCandName('');
    setCandEmail('');
    setCandidateModalOpen(false);
  };

  const handleScheduleInterview = () => {
    if (!selectedCandidate) return;
    scheduleInterview({
      candidateId: selectedCandidate.id,
      candidateName: selectedCandidate.name,
      positionTitle: selectedCandidate.appliedPositionTitle,
      type: intType,
      interviewers: ['Moayad Mansour', 'Sarah Chen'],
      date: intDate,
      time: intTime,
      location: 'Google Meet / Room 402',
    });
    setInterviewModalOpen(false);
  };

  const handleCreateOffer = () => {
    if (!selectedCandidate) return;
    createJobOffer({
      candidateId: selectedCandidate.id,
      candidateName: selectedCandidate.name,
      positionTitle: selectedCandidate.appliedPositionTitle,
      department: selectedCandidate.department,
      baseSalary: offerSalary,
      startDate: offerStartDate,
    });
    setOfferModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Recruitment & Applicant Tracking (ATS)"
        subtitle="Manage job openings, candidate pipeline, interviews, offer letters & seamless employee conversion."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setCandidateModalOpen(true)}
              variant="secondary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
            >
              Add Candidate
            </Button>
            <Button
              onClick={() => setJobModalOpen(true)}
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
            >
              Create Job Opening
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open Positions" value={jobOpenings.length} comparisonText="active requisitions" accentColor="amber" />
        <StatCard title="Active Applicants" value={candidates.length} change={14.0} accentColor="azure" />
        <StatCard title="Interviews Scheduled" value={interviews.length} comparisonText="in calendar" accentColor="indigo" />
        <StatCard title="Offer Accept Rate" value="88.5%" comparisonText="YTD metric" accentColor="emerald" />
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'kanban'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Candidate Hiring Pipeline (Kanban)
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'jobs'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Job Openings Directory ({jobOpenings.length})
        </button>
        <button
          onClick={() => setActiveTab('interviews')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'interviews'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Scheduled Interviews ({interviews.length})
        </button>
      </div>

      {/* TAB 1: KANBAN PIPELINE */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 overflow-x-auto pb-4">
          {stages.map((stg) => {
            const stageCandidates = candidates.filter((c) => c.stage === stg);
            return (
              <div key={stg} className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3 shrink-0 w-72 lg:w-auto">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/60 pb-2">
                  <span className={`text-xs font-semibold truncate ${stageColors[stg]}`}>{stg}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold border border-slate-200/80 dark:border-slate-700">
                    {stageCandidates.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {stageCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      onClick={() => setSelectedCandidate(cand)}
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer space-y-2.5 transition-all shadow-sm group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {cand.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{cand.appliedPositionTitle}</div>
                        </div>
                        <div className="flex items-center text-amber-500 text-[11px] font-semibold">
                          <Star className="w-3 h-3 fill-current me-0.5" />
                          {cand.rating}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {cand.skills.slice(0, 2).map((sk) => (
                          <span key={sk} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">
                            {sk}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                        <span>Source: {cand.source}</span>
                        <span className="font-mono">{cand.appliedDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: JOB OPENINGS DIRECTORY */}
      {activeTab === 'jobs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobOpenings.map((job) => (
            <div key={job.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{job.title}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">{job.department} • {job.location}</div>
                </div>
                <StatusBadge status={job.status} />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 grid grid-cols-3 gap-3 text-xs text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">Openings</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{job.openingsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Applicants</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{job.applicantsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Salary Range</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{job.salaryRange}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SCHEDULED INTERVIEWS */}
      {activeTab === 'interviews' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {interviews.map((int) => (
              <div key={int.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">{int.type}</span>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{int.candidateName}</h3>
                    <div className="text-xs text-slate-500">{int.positionTitle}</div>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    {int.date} @ {int.time}
                  </div>
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Interviewers: {int.interviewers.join(', ')}</span>
                  <span>{int.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Inspector & Action Modal */}
      {selectedCandidate && (
        <Modal
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          title={`Candidate: ${selectedCandidate.name}`}
          subtitle={`Applied for ${selectedCandidate.appliedPositionTitle}`}
          maxWidth="lg"
        >
          <div className="space-y-6 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Current Stage</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm">{selectedCandidate.stage}</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-slate-500 text-[10px] uppercase font-semibold">Move Stage:</label>
                <select
                  value={selectedCandidate.stage}
                  onChange={(e) => {
                    updateCandidateStage(selectedCandidate.id, e.target.value as CandidateStage);
                    setSelectedCandidate({ ...selectedCandidate, stage: e.target.value as CandidateStage });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
                >
                  {stages.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Score Rating Bar */}
            <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <span className="font-medium text-slate-900 dark:text-slate-100">Score & Evaluation Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      scoreCandidate(selectedCandidate.id, star);
                      setSelectedCandidate({ ...selectedCandidate, rating: star });
                    }}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star className={`w-5 h-5 ${star <= selectedCandidate.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'}`} />
                  </button>
                ))}
                <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 ms-2">{selectedCandidate.rating} / 5.0</span>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">Email</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedCandidate.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Phone</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedCandidate.phone}</span>
              </div>
            </div>

            {/* Action Buttons: Schedule Interview, Create Offer, Hire */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap gap-2 justify-end">
              <Button
                onClick={() => setInterviewModalOpen(true)}
                variant="secondary"
                size="sm"
                icon={<CalendarIcon className="w-4 h-4" />}
              >
                Schedule Interview
              </Button>

              <Button
                onClick={() => setOfferModalOpen(true)}
                variant="secondary"
                size="sm"
                icon={<FileSignature className="w-4 h-4" />}
              >
                Generate Offer
              </Button>

              <Button
                onClick={() => {
                  hireCandidateToEmployee(selectedCandidate.id);
                  setSelectedCandidate(null);
                  navigate('employees', 'overview');
                }}
                variant="primary"
                size="sm"
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Hire & Auto-Create Employee
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Candidate Modal */}
      {isCandidateModalOpen && (
        <Modal
          isOpen={isCandidateModalOpen}
          onClose={() => setCandidateModalOpen(false)}
          title="Add New Job Candidate"
          subtitle="Add applicant details directly into the ATS hiring pipeline."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Candidate Full Name</label>
              <input type="text" value={candName} onChange={(e) => setCandName(e.target.value)} placeholder="e.g. Layla Hassan" className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Email Address</label>
                <input type="email" value={candEmail} onChange={(e) => setCandEmail(e.target.value)} placeholder="layla@example.com" className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs" />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Phone Number</label>
                <input type="text" value={candPhone} onChange={(e) => setCandPhone(e.target.value)} placeholder="+1 415 555 0199" className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Applied Position</label>
                <input type="text" value={candPosition} onChange={(e) => setCandPosition(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs" />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Sourcing Channel</label>
                <select value={candSource} onChange={(e) => setCandSource(e.target.value as any)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs">
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Company Website">Company Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Indeed">Indeed</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
              <Button onClick={() => setCandidateModalOpen(false)} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleAddCandidate} variant="primary" size="sm">Add Candidate</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule Interview Modal */}
      {isInterviewModalOpen && (
        <Modal
          isOpen={isInterviewModalOpen}
          onClose={() => setInterviewModalOpen(false)}
          title={`Schedule Interview: ${selectedCandidate?.name}`}
          subtitle="Adds event to Global Calendar & notifies interviewers."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Interview Type</label>
              <select value={intType} onChange={(e) => setIntType(e.target.value as any)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs">
                <option value="HR Screening">HR Screening</option>
                <option value="Technical">Technical Deep Dive</option>
                <option value="Manager">Hiring Manager Interview</option>
                <option value="Final">Executive Final Round</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Date</label>
                <input type="date" value={intDate} onChange={(e) => setIntDate(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs" />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Time</label>
                <input type="text" value={intTime} onChange={(e) => setIntTime(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs" />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
              <Button onClick={() => setInterviewModalOpen(false)} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleScheduleInterview} variant="primary" size="sm">Confirm Interview</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Offer Modal */}
      {isOfferModalOpen && (
        <Modal
          isOpen={isOfferModalOpen}
          onClose={() => setOfferModalOpen(false)}
          title={`Generate Job Offer: ${selectedCandidate?.name}`}
          subtitle="Moves candidate to Offer stage and prepares offer letter."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Annual Base Salary ($)</label>
              <input type="number" value={offerSalary} onChange={(e) => setOfferSalary(Number(e.target.value))} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs" />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Proposed Start Date</label>
              <input type="date" value={offerStartDate} onChange={(e) => setOfferStartDate(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs" />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
              <Button onClick={() => setOfferModalOpen(false)} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleCreateOffer} variant="primary" size="sm">Issue Offer Letter</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Job Modal */}
      {isJobModalOpen && (
        <Modal
          isOpen={isJobModalOpen}
          onClose={() => setJobModalOpen(false)}
          title="Create New Job Requisition"
          subtitle="Publish new open position on company careers portal."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Job Title</label>
              <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior AI Infrastructure Engineer" className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Department</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs">
                  <option value="Engineering">Engineering</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales & Growth">Sales & Growth</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 text-[11px]">Target Salary Range</label>
                <input type="text" value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 font-bold text-xs" />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
              <Button onClick={() => setJobModalOpen(false)} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleCreateJob} variant="primary" size="sm">Publish Job Opening</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
