import React, { useState } from 'react';
import {
  LayoutGrid,
  Home,
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
  ChevronDown,
  ChevronRight,
  FolderKanban,
  BarChart3,
  Settings,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { AppView } from '../../context/AppContext';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const {
    activeApp,
    activeSubView,
    navigate,
    organizations,
    currentOrg,
    switchOrg,
    isSidebarCollapsed,
  } = useApp();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<'finance' | 'hr' | 'marketing' | null>(
    ['invoicing', 'accounting', 'expenses', 'sign', 'equity', 'esg'].includes(activeApp)
      ? 'finance'
      : ['hr', 'employees', 'attendance', 'recruitment', 'time-off', 'appraisals', 'fleet', 'payroll'].includes(activeApp)
      ? 'hr'
      : ['marketing', 'email', 'sms', 'surveys', 'social'].includes(activeApp)
      ? 'marketing'
      : 'finance'
  );

  const [expandedApp, setExpandedApp] = useState<string | null>(activeApp);

  const financeModules = [
    { id: 'invoicing', title: 'Invoicing', icon: CreditCard, color: 'text-azure-400', subViews: [{ id: 'overview', label: 'Invoices Dashboard' }, { id: 'new-invoice', label: 'Create Invoice' }, { id: 'customers', label: 'Customers Directory' }] },
    { id: 'accounting', title: 'Accounting', icon: CreditCard, color: 'text-indigo-400', subViews: [{ id: 'overview', label: 'Accounting Hub' }, { id: 'ledger', label: 'General Ledger' }, { id: 'journal-new', label: 'Journal Entry' }, { id: 'reconciliation', label: 'Bank Reconciliation' }, { id: 'reports', label: 'Financial Reports' }] },
    { id: 'expenses', title: 'Expenses & Cards', icon: CreditCard, color: 'text-rose-400', subViews: [{ id: 'overview', label: 'Expenses Dashboard' }, { id: 'approvals', label: 'Approval Queue' }, { id: 'cards', label: 'Corporate Cards' }] },
    { id: 'sign', title: 'Sign (E-Signature)', icon: FileSignature, color: 'text-teal-400', subViews: [{ id: 'overview', label: 'Sign Documents' }, { id: 'builder', label: 'Prepare Agreement' }] },
    { id: 'equity', title: 'Equity & Cap Table', icon: PieChart, color: 'text-amber-400', subViews: [{ id: 'overview', label: 'Cap Table Summary' }, { id: 'cap-table', label: 'Shareholders' }, { id: 'dilution', label: 'Dilution Simulator' }] },
    { id: 'esg', title: 'ESG & Carbon', icon: Leaf, color: 'text-emerald-400', subViews: [{ id: 'overview', label: 'ESG Hub Scorecard' }, { id: 'carbon', label: 'Carbon Calculator' }] },
  ];

  const hrModules = [
    { id: 'employees', title: 'Employees', icon: Users, color: 'text-orange-400', subViews: [{ id: 'overview', label: 'Employee Directory' }, { id: 'org-chart', label: 'Organization Chart' }] },
    { id: 'attendance', title: 'Attendances', icon: Clock, color: 'text-cyan-400', subViews: [{ id: 'overview', label: 'Who\'s Working Board' }, { id: 'log', label: 'Attendance Log' }, { id: 'kiosk', label: 'Kiosk Mode' }] },
    { id: 'recruitment', title: 'Recruitment (ATS)', icon: UserPlus, color: 'text-pink-400', subViews: [{ id: 'overview', label: 'Recruitment Hub' }, { id: 'kanban', label: 'Candidate Pipeline' }, { id: 'jobs', label: 'Job Openings' }] },
    { id: 'time-off', title: 'Time Off & Leave', icon: CalendarIcon, color: 'text-purple-400', subViews: [{ id: 'overview', label: 'Leave Dashboard' }, { id: 'requests', label: 'Pending Approvals' }, { id: 'calendar', label: 'Team Leave Calendar' }] },
    { id: 'appraisals', title: 'Appraisals & OKRs', icon: Award, color: 'text-yellow-400', subViews: [{ id: 'overview', label: 'Appraisals Hub' }, { id: 'goals', label: 'Goals & OKRs' }] },
    { id: 'fleet', title: 'Fleet Management', icon: Car, color: 'text-blue-400', subViews: [{ id: 'overview', label: 'Vehicles Directory' }, { id: 'maintenance', label: 'Maintenance Schedule' }] },
    { id: 'payroll', title: 'Payroll Processing', icon: Wallet, color: 'text-emerald-400', subViews: [{ id: 'overview', label: 'Payroll Control Center' }, { id: 'runs', label: 'Monthly Runs' }, { id: 'payslips', label: 'Payslip Generator' }] },
  ];

  const marketingModules = [
    { id: 'email', title: 'Email Marketing', icon: Mail, color: 'text-rose-400', subViews: [{ id: 'overview', label: 'Email Campaigns' }, { id: 'new', label: 'Campaign Wizard' }, { id: 'templates', label: 'Email Templates' }] },
    { id: 'sms', title: 'SMS Marketing', icon: MessageSquare, color: 'text-indigo-400', subViews: [{ id: 'overview', label: 'SMS Campaigns' }, { id: 'new', label: 'Create SMS' }] },
    { id: 'surveys', title: 'Surveys & Forms', icon: ClipboardList, color: 'text-amber-400', subViews: [{ id: 'overview', label: 'Active Surveys' }, { id: 'new', label: 'Form Builder' }] },
    { id: 'social', title: 'Social Marketing', icon: Share2, color: 'text-cyan-400', subViews: [{ id: 'overview', label: 'Social Content Calendar' }, { id: 'new', label: 'Compose Post' }, { id: 'accounts', label: 'Connected Accounts' }] },
  ];

  const renderModuleGroup = (title: string, categoryKey: 'finance' | 'hr' | 'marketing', modules: any[], badgeColor: string) => {
    const isOpen = expandedCategory === categoryKey;

    return (
      <div className="space-y-1">
        <button
          onClick={() => setExpandedCategory(isOpen ? null : categoryKey)}
          className="w-full p-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-900/80 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${badgeColor}`} />
            {!isSidebarCollapsed && <span className="uppercase tracking-wider font-mono text-[11px]">{title}</span>}
          </span>
          {!isSidebarCollapsed && (
            isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {(!isSidebarCollapsed && isOpen) && (
          <div className="space-y-1 ps-2">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isModExpanded = expandedApp === mod.id;
              const isModActive = activeApp === mod.id;

              return (
                <div key={mod.id} className="space-y-1">
                  <button
                    onClick={() => {
                      navigate(mod.id as AppView, 'overview');
                      setExpandedApp(isModExpanded ? null : mod.id);
                    }}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                      isModActive
                        ? 'bg-slate-900 text-slate-100 border border-slate-800 shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${mod.color}`} />
                      <span>{mod.title}</span>
                    </div>
                    {isModExpanded ? (
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    )}
                  </button>

                  {isModExpanded && (
                    <div className="ps-8 pe-2 py-1 space-y-1 border-s-2 border-slate-800/80 ms-4">
                      {mod.subViews.map((sub: any) => (
                        <button
                          key={sub.id}
                          onClick={() => navigate(mod.id as AppView, sub.id)}
                          className={`w-full py-1 px-2.5 rounded-lg text-start text-[11px] transition-colors ${
                            isModActive && activeSubView === sub.id
                              ? 'text-cyan-400 font-bold bg-cyan-500/10'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 z-30 bg-slate-950/95 border-e border-slate-800/90 backdrop-blur-xl flex flex-col justify-between transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="space-y-5 p-4">
        {/* Top Brand Logo */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => navigate('launchpad')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center font-black text-cyan-400 text-lg tracking-tighter">
                N
              </div>
            </div>
            {!isSidebarCollapsed && (
              <div>
                <div className="flex items-center gap-1.5 font-black text-base tracking-tight text-slate-100 font-heading">
                  NextAura <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                </div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                  Business OS
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workspace Switcher */}
        {!isSidebarCollapsed && (
          <div className="relative">
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="w-full p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 flex items-center justify-between transition-colors shadow-inner"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="text-base">{currentOrg.logo}</span>
                <div className="text-start truncate">
                  <div className="text-xs font-bold text-slate-100 truncate">{currentOrg.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{currentOrg.baseCurrency} Workspace</div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {isOrgDropdownOpen && (
              <div className="absolute top-full start-0 w-full mt-2 p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1">Switch Workspace</div>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrg(org.id);
                      setIsOrgDropdownOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-colors ${
                      currentOrg.id === org.id
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{org.logo}</span>
                      {org.name}
                    </span>
                    <span className="text-[10px] font-mono uppercase">{org.baseCurrency}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation Menu */}
        <div className="space-y-1 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
          {/* Executive Launchpad */}
          <button
            onClick={() => navigate('launchpad')}
            className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-xs font-bold transition-all ${
              activeApp === 'launchpad'
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-4 h-4 text-cyan-400" />
              {!isSidebarCollapsed && <span>NextAura Apps Launchpad</span>}
            </div>
          </button>

          {/* Executive Overview */}
          <button
            onClick={() => navigate('home')}
            className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all ${
              activeApp === 'home'
                ? 'bg-slate-900 text-slate-100 border border-slate-800 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Home className="w-4 h-4 text-slate-400" />
            {!isSidebarCollapsed && <span>Executive Overview</span>}
          </button>

          {/* HR Overview Direct Link */}
          <button
            onClick={() => navigate('hr')}
            className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all ${
              activeApp === 'hr'
                ? 'bg-slate-900 text-slate-100 border border-slate-800 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Users className="w-4 h-4 text-orange-400" />
            {!isSidebarCollapsed && <span>HR Category Hub</span>}
          </button>

          {/* Marketing Overview Direct Link */}
          <button
            onClick={() => navigate('marketing')}
            className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all ${
              activeApp === 'marketing'
                ? 'bg-slate-900 text-slate-100 border border-slate-800 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Mail className="w-4 h-4 text-rose-400" />
            {!isSidebarCollapsed && <span>Marketing Category Hub</span>}
          </button>

          <div className="pt-2 pb-1">
            {!isSidebarCollapsed && (
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">
                Business Categories
              </div>
            )}
          </div>

          {/* 3 Major Category Groups */}
          {renderModuleGroup('Finance', 'finance', financeModules, 'bg-azure-400')}
          {renderModuleGroup('Human Resources', 'hr', hrModules, 'bg-orange-400')}
          {renderModuleGroup('Marketing', 'marketing', marketingModules, 'bg-rose-400')}

          <div className="pt-3 pb-1">
            {!isSidebarCollapsed && (
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">
                Global Platform
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('calendar')}
            className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
              activeApp === 'calendar' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-cyan-400" />
            {!isSidebarCollapsed && <span>Global Calendar</span>}
          </button>

          <button
            onClick={() => navigate('approvals')}
            className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
              activeApp === 'approvals' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {!isSidebarCollapsed && <span>Central Approvals</span>}
          </button>

          <button
            onClick={() => navigate('contacts')}
            className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
              activeApp === 'contacts' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-400" />
            {!isSidebarCollapsed && <span>Contacts CRM</span>}
          </button>

          <button
            onClick={() => navigate('documents')}
            className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
              activeApp === 'documents' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderKanban className="w-4 h-4 text-slate-400" />
            {!isSidebarCollapsed && <span>Document Vault</span>}
          </button>

          <button
            onClick={() => navigate('analytics')}
            className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
              activeApp === 'analytics' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-slate-400" />
            {!isSidebarCollapsed && <span>Analytics Center</span>}
          </button>

          <button
            onClick={() => navigate('settings')}
            className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
              activeApp === 'settings' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            {!isSidebarCollapsed && <span>Settings & RBAC</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
