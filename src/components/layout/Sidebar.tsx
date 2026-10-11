import React, { useState } from 'react';
import {
  Home,
  CreditCard,
  Users,
  UserPlus,
  Calendar as CalendarIcon,
  Wallet,
  Mail,
  MessageSquare,
  ChevronDown,
  FolderKanban,
  BarChart3,
  Settings,
  Sparkles,
  BadgeDollarSign,
  Workflow,
  Globe2,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const {
    activeApp,
    activeSubView,
    navigate,
    currentOrg,
    isSidebarCollapsed,
    activeServices,
  } = useApp();

  const [expandedMenu, setExpandedMenu] = useState<string | null>(() => {
    if (['employees', 'attendance', 'time-off', 'appraisals', 'recruitment', 'payroll'].includes(activeApp)) return 'users';
    if (['invoicing', 'accounting', 'expenses', 'sign', 'equity', 'esg'].includes(activeApp)) return 'finance';
    if (['email', 'sms', 'surveys', 'social'].includes(activeApp)) return 'marketing';
    return null;
  });

  const toggleSubmenu = (key: string) => {
    setExpandedMenu((prev) => (prev === key ? null : key));
  };

  const isCrmActive = activeApp === 'contacts' || activeApp === 'crm';
  const isOverviewActive = activeApp === 'home';
  const isAnalyticsActive = activeApp === 'analytics';
  const isFinanceActive = ['invoicing', 'accounting', 'expenses', 'equity', 'esg'].includes(activeApp) && activeApp !== 'launchpad';
  const isTeamActive = ['hr', 'employees', 'attendance', 'recruitment', 'time-off', 'appraisals', 'fleet', 'payroll'].includes(activeApp);

  return (
    <aside
      aria-label="Primary navigation"
      className={`fixed inset-y-0 start-0 h-screen shrink-0 z-30 bg-[#131728] border-e border-[#1F243D] flex flex-col justify-between transition-[width,transform] duration-200 lg:sticky select-none ${
        isSidebarCollapsed ? '-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:w-[68px]' : 'translate-x-0 w-[240px]'
      }`}
    >
      {/* Background Decorative Curve (sampled from reference bottom-left) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-gradient-to-tr from-[#7568E8]/20 via-[#178CFF]/10 to-transparent blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1F243D]/60 shrink-0">
          <div
            onClick={() => navigate('contacts')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {/* Golden 8-point star logo emblem matching reference */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.35)] shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.93 4.93l2.12 2.12m9.9 9.9l2.12 2.12M4.93 19.07l2.12-2.12m9.9-9.9l2.12-2.12" />
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1 font-bold text-[15px] tracking-tight text-[#F4F6FF]">
                  NextAura<span className="text-[#7568E8] font-extrabold ms-0.5">OS</span>
                </div>
                <span className="text-[10px] text-[#6B7694] tracking-wider uppercase font-medium">Business Platform</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-4 text-xs font-medium">
          
          {/* SECTION 1: DASHBOARDS */}
          <div>
            {!isSidebarCollapsed && (
              <div className="px-2 pb-1.5 text-[10px] font-semibold text-[#6B7694] uppercase tracking-wider">
                Dashboards
              </div>
            )}

            <div className="space-y-0.5">
              {/* Overview */}
              <button
                type="button"
                onClick={() => navigate('home')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  isOverviewActive
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="Overview"
              >
                <Home className={`w-4 h-4 shrink-0 ${isOverviewActive ? 'text-[#F4F6FF]' : 'text-[#747E9B]'}`} />
                {!isSidebarCollapsed && <span>Overview</span>}
              </button>

              {/* Analytics */}
              <button
                type="button"
                onClick={() => navigate('analytics')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  isAnalyticsActive
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="Analytics"
              >
                <BarChart3 className={`w-4 h-4 shrink-0 ${isAnalyticsActive ? 'text-[#F4F6FF]' : 'text-[#747E9B]'}`} />
                {!isSidebarCollapsed && <span>Analytics</span>}
              </button>

              {/* CRM / Sales — Primary Reference Target */}
              <button
                type="button"
                onClick={() => navigate('contacts')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  isCrmActive
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_14px_rgba(117,104,232,0.3)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="CRM / Sales"
              >
                <Users className={`w-4 h-4 shrink-0 ${isCrmActive ? 'text-[#F4F6FF]' : 'text-[#747E9B]'}`} />
                {!isSidebarCollapsed && <span className="font-medium">CRM / Sales</span>}
              </button>

              {/* Finance */}
              <button
                type="button"
                onClick={() => navigate('invoicing')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  isFinanceActive
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="Finance"
              >
                <CreditCard className={`w-4 h-4 shrink-0 ${isFinanceActive ? 'text-[#F4F6FF]' : 'text-[#747E9B]'}`} />
                {!isSidebarCollapsed && <span>Finance</span>}
              </button>

              {/* Team / Projects */}
              <button
                type="button"
                onClick={() => navigate('hr')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  isTeamActive
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="Team / Projects"
              >
                <Briefcase className={`w-4 h-4 shrink-0 ${isTeamActive ? 'text-[#F4F6FF]' : 'text-[#747E9B]'}`} />
                {!isSidebarCollapsed && <span>Team / Projects</span>}
              </button>
            </div>
          </div>

          {/* SECTION 2: APPS */}
          <div>
            {!isSidebarCollapsed && (
              <div className="px-2 pb-1.5 text-[10px] font-semibold text-[#6B7694] uppercase tracking-wider">
                Apps
              </div>
            )}

            <div className="space-y-0.5">
              {/* User Management */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (isSidebarCollapsed) navigate('employees');
                    else toggleSubmenu('users');
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition-all ${
                    ['employees', 'attendance', 'time-off', 'appraisals'].includes(activeApp)
                      ? 'text-[#F4F6FF] bg-[#1A2035]'
                      : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4 text-[#747E9B] shrink-0" />
                    {!isSidebarCollapsed && <span>User Management</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <ChevronDown className={`w-3.5 h-3.5 text-[#6B7694] transition-transform duration-200 ${expandedMenu === 'users' ? 'rotate-180' : ''}`} />
                  )}
                </button>
                {expandedMenu === 'users' && !isSidebarCollapsed && (
                  <div className="ms-6 ps-2.5 my-1 border-s border-[#1F243D] space-y-1">
                    <button onClick={() => navigate('employees', 'overview')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'employees' && activeSubView === 'overview' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Employees List</button>
                    <button onClick={() => navigate('employees', 'org-chart')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'employees' && activeSubView === 'org-chart' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Org Chart</button>
                    <button onClick={() => navigate('attendance')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'attendance' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Attendance Kiosk</button>
                    <button onClick={() => navigate('time-off')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'time-off' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Leave Requests</button>
                  </div>
                )}
              </div>

              {/* Projects & Tasks */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (isSidebarCollapsed) navigate('approvals');
                    else toggleSubmenu('projects');
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition-all ${
                    ['approvals', 'fleet', 'recruitment', 'payroll'].includes(activeApp)
                      ? 'text-[#F4F6FF] bg-[#1A2035]'
                      : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-[#747E9B] shrink-0" />
                    {!isSidebarCollapsed && <span>Projects & Tasks</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <ChevronDown className={`w-3.5 h-3.5 text-[#6B7694] transition-transform duration-200 ${expandedMenu === 'projects' ? 'rotate-180' : ''}`} />
                  )}
                </button>
                {expandedMenu === 'projects' && !isSidebarCollapsed && (
                  <div className="ms-6 ps-2.5 my-1 border-s border-[#1F243D] space-y-1">
                    <button onClick={() => navigate('approvals')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'approvals' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Central Approvals</button>
                    <button onClick={() => navigate('recruitment')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'recruitment' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Recruitment ATS</button>
                    <button onClick={() => navigate('payroll')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'payroll' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Payroll Runs</button>
                    <button onClick={() => navigate('fleet')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'fleet' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Fleet Operations</button>
                  </div>
                )}
              </div>

              {/* Finance Suite */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (isSidebarCollapsed) navigate('invoicing');
                    else toggleSubmenu('finance');
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition-all ${
                    ['invoicing', 'accounting', 'expenses', 'equity', 'esg'].includes(activeApp)
                      ? 'text-[#F4F6FF] bg-[#1A2035]'
                      : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-[#747E9B] shrink-0" />
                    {!isSidebarCollapsed && <span>Finance Suite</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <ChevronDown className={`w-3.5 h-3.5 text-[#6B7694] transition-transform duration-200 ${expandedMenu === 'finance' ? 'rotate-180' : ''}`} />
                  )}
                </button>
                {expandedMenu === 'finance' && !isSidebarCollapsed && (
                  <div className="ms-6 ps-2.5 my-1 border-s border-[#1F243D] space-y-1">
                    <button onClick={() => navigate('invoicing', 'overview')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'invoicing' && activeSubView === 'overview' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Invoices</button>
                    <button onClick={() => navigate('invoicing', 'customers')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'invoicing' && activeSubView === 'customers' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Customers</button>
                    <button onClick={() => navigate('accounting', 'ledger')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'accounting' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>General Ledger</button>
                    <button onClick={() => navigate('expenses')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'expenses' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Expenses & Cards</button>
                    <button onClick={() => navigate('equity')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'equity' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>Equity & Cap Table</button>
                    <button onClick={() => navigate('esg')} className={`block w-full text-start py-1 text-[11px] ${activeApp === 'esg' ? 'text-[#7568E8] font-semibold' : 'text-[#A3ABC5] hover:text-white'}`}>ESG & Carbon</button>
                  </div>
                )}
              </div>

              {/* Calendar */}
              <button
                type="button"
                onClick={() => navigate('calendar')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  activeApp === 'calendar'
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="Calendar"
              >
                <CalendarIcon className="w-4 h-4 text-[#747E9B] shrink-0" />
                {!isSidebarCollapsed && <span>Calendar</span>}
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={() => navigate('email')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  activeApp === 'email'
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="Email"
              >
                <Mail className="w-4 h-4 text-[#747E9B] shrink-0" />
                {!isSidebarCollapsed && <span>Email Marketing</span>}
              </button>

              {/* Chat / SMS */}
              <button
                type="button"
                onClick={() => navigate('sms')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  activeApp === 'sms'
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="Chat & SMS"
              >
                <MessageSquare className="w-4 h-4 text-[#747E9B] shrink-0" />
                {!isSidebarCollapsed && <span>Chat & Broadcasts</span>}
              </button>

              {/* File Manager & Documents */}
              <button
                type="button"
                onClick={() => navigate('documents')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  ['documents', 'sign'].includes(activeApp)
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="File Manager"
              >
                <FolderKanban className="w-4 h-4 text-[#747E9B] shrink-0" />
                {!isSidebarCollapsed && <span>File Manager</span>}
              </button>

              {/* NextAura AI */}
              <button
                type="button"
                onClick={() => navigate('ai')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  activeApp === 'ai'
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="NextAura AI"
              >
                <Sparkles className="w-4 h-4 text-[#7568E8] shrink-0" />
                {!isSidebarCollapsed && <span className="font-semibold text-[#F4F6FF]">NextAura AI</span>}
              </button>
            </div>
          </div>

          {/* SECTION 3: PAGES & PLATFORM */}
          <div>
            {!isSidebarCollapsed && (
              <div className="px-2 pb-1.5 text-[10px] font-semibold text-[#6B7694] uppercase tracking-wider">
                Pages
              </div>
            )}

            <div className="space-y-0.5">
              {/* Plans & Billing */}
              <button
                type="button"
                onClick={() => navigate('pricing')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  activeApp === 'pricing'
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="Plans & Billing"
              >
                <BadgeDollarSign className="w-4 h-4 text-[#747E9B] shrink-0" />
                {!isSidebarCollapsed && <span>Plans & Billing</span>}
              </button>

              {/* Automations */}
              <button
                type="button"
                onClick={() => navigate('automations')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  activeApp === 'automations'
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="Automations"
              >
                <Workflow className="w-4 h-4 text-[#747E9B] shrink-0" />
                {!isSidebarCollapsed && <span>Automations</span>}
              </button>

              {/* Website Builder */}
              {activeServices.includes('website_builder') && (
                <button
                  type="button"
                  onClick={() => navigate('websites')}
                  className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                    activeApp === 'websites'
                      ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                      : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                  }`}
                  title="Websites"
                >
                  <Globe2 className="w-4 h-4 text-[#747E9B] shrink-0" />
                  {!isSidebarCollapsed && <span>Websites</span>}
                </button>
              )}

              {/* Settings */}
              <button
                type="button"
                onClick={() => navigate('settings')}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  activeApp === 'settings'
                    ? 'bg-[#262356] border border-[#584BE2] text-[#F4F6FF] font-semibold shadow-[0_0_12px_rgba(117,104,232,0.25)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
                title="Settings"
              >
                <Settings className="w-4 h-4 text-[#747E9B] shrink-0" />
                {!isSidebarCollapsed && <span>Settings</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Workspace Status */}
        {!isSidebarCollapsed && (
          <div className="p-3 border-t border-[#1F243D]/60 bg-[#101426]/50 shrink-0">
            <div className="flex items-center justify-between text-[11px] text-[#6B7694]">
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-[#08B894] animate-pulse shrink-0" />
                <span className="truncate">{currentOrg.name}</span>
              </span>
              <span className="font-mono text-[10px] text-[#A3ABC5] shrink-0">{currentOrg.baseCurrency}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

