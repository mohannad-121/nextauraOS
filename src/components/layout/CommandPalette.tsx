import React, { useState } from 'react';
import {
  Search,
  FileText,
  CreditCard,
  FileSignature,
  PieChart,
  Leaf,
  Users,
  Clock,
  UserPlus,
  Calendar as CalendarIcon,
  Award,
  Car,
  Wallet,
  Mail,
  MessageSquare,
  ClipboardList,
  Share2,
  LayoutGrid,
} from 'lucide-react';
import type { AppView } from '../../context/AppContext';
import { useApp } from '../../context/AppContext';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    navigate,
    employees,
    candidates,
    emailCampaigns,
  } = useApp();

  const [query, setQuery] = useState('');

  if (!isCommandPaletteOpen) return null;

  const quickNav: { label: string; app: AppView; sub?: string; icon: any; color: string }[] = [
    { label: 'NextAura Master Launchpad', app: 'launchpad', icon: LayoutGrid, color: 'text-cyan-400' },
    { label: 'Human Resources Hub', app: 'hr', icon: Users, color: 'text-orange-400' },
    { label: 'Marketing Category Hub', app: 'marketing', icon: Mail, color: 'text-rose-400' },
    { label: 'Employees Directory', app: 'employees', sub: 'overview', icon: Users, color: 'text-orange-400' },
    { label: 'Live Attendance Board', app: 'attendance', sub: 'overview', icon: Clock, color: 'text-cyan-400' },
    { label: 'Recruitment & ATS Pipeline', app: 'recruitment', sub: 'overview', icon: UserPlus, color: 'text-pink-400' },
    { label: 'Time Off & Leave Requests', app: 'time-off', sub: 'overview', icon: CalendarIcon, color: 'text-purple-400' },
    { label: 'Appraisals & Performance', app: 'appraisals', sub: 'overview', icon: Award, color: 'text-yellow-400' },
    { label: 'Fleet Vehicle Directory', app: 'fleet', sub: 'overview', icon: Car, color: 'text-blue-400' },
    { label: 'Payroll Processing Control', app: 'payroll', sub: 'overview', icon: Wallet, color: 'text-emerald-400' },
    { label: 'Email Marketing Campaigns', app: 'email', sub: 'overview', icon: Mail, color: 'text-rose-400' },
    { label: 'SMS Marketing Broadcasts', app: 'sms', sub: 'overview', icon: MessageSquare, color: 'text-indigo-400' },
    { label: 'Surveys & Form Builder', app: 'surveys', sub: 'overview', icon: ClipboardList, color: 'text-amber-400' },
    { label: 'Social Content Calendar', app: 'social', sub: 'overview', icon: Share2, color: 'text-cyan-400' },
    { label: 'Invoicing & Invoices List', app: 'invoicing', sub: 'overview', icon: FileText, color: 'text-azure-400' },
    { label: 'Accounting General Ledger', app: 'accounting', sub: 'ledger', icon: CreditCard, color: 'text-indigo-400' },
    { label: 'E-Sign Agreements', app: 'sign', sub: 'overview', icon: FileSignature, color: 'text-teal-400' },
    { label: 'Cap Table & Equity', app: 'equity', sub: 'overview', icon: PieChart, color: 'text-amber-400' },
    { label: 'ESG Carbon Calculator', app: 'esg', sub: 'carbon', icon: Leaf, color: 'text-emerald-400' },
  ];

  const filteredEmployees = employees.filter(
    (e) => e.name.toLowerCase().includes(query.toLowerCase()) || e.jobTitle.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCandidates = candidates.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.appliedPositionTitle.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCampaigns = emailCampaigns.filter(
    (ec) => ec.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-950/80 backdrop-blur-md">
      <div className="fixed inset-0" onClick={() => setCommandPaletteOpen(false)} />

      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden z-10 space-y-4 p-4">
        {/* Input */}
        <div className="relative flex items-center border-b border-slate-800 pb-3">
          <Search className="w-5 h-5 text-cyan-400 absolute left-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employees, candidates, invoices, campaigns, payroll, vehicles..."
            className="w-full pl-11 pr-4 py-2 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto space-y-4 text-xs font-sans pr-1">
          {/* Employees Match */}
          {filteredEmployees.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-400 mb-2 px-3">
                Employees ({filteredEmployees.length})
              </div>
              <div className="space-y-1">
                {filteredEmployees.slice(0, 3).map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      navigate('employees', 'overview', emp.id);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-center justify-between transition-colors text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} alt="" className="w-6 h-6 rounded-lg object-cover" />
                      <div>
                        <div className="font-bold text-slate-100">{emp.name}</div>
                        <div className="text-[10px] text-slate-400">{emp.jobTitle} • {emp.department}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-orange-400">{emp.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Candidates Match */}
          {filteredCandidates.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-pink-400 mb-2 px-3">
                ATS Candidates ({filteredCandidates.length})
              </div>
              <div className="space-y-1">
                {filteredCandidates.slice(0, 3).map((cand) => (
                  <button
                    key={cand.id}
                    onClick={() => {
                      navigate('recruitment', 'kanban', cand.id);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-center justify-between transition-colors text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <UserPlus className="w-4 h-4 text-pink-400" />
                      <div>
                        <div className="font-bold text-slate-100">{cand.name}</div>
                        <div className="text-[10px] text-slate-400">{cand.appliedPositionTitle}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-pink-400">{cand.stage}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Email Campaigns Match */}
          {filteredCampaigns.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-2 px-3">
                Marketing Campaigns ({filteredCampaigns.length})
              </div>
              <div className="space-y-1">
                {filteredCampaigns.slice(0, 3).map((ec) => (
                  <button
                    key={ec.id}
                    onClick={() => {
                      navigate('email', 'overview', ec.id);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-center justify-between transition-colors text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-rose-400" />
                      <span className="font-bold text-slate-100">{ec.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-400">{ec.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Apps Navigation */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-3">
              Applications & Tools Navigation
            </div>
            <div className="space-y-1">
              {quickNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      navigate(item.app, item.sub);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full p-2 rounded-xl hover:bg-slate-800 flex items-center justify-between transition-colors text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span className="font-semibold text-xs">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Jump</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
