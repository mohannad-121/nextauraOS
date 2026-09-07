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
  Plus,
  Sparkles,
  Building2,
  BadgeDollarSign,
} from 'lucide-react';
import type { AppView } from '../../context/AppContext';
import { useApp } from '../../context/AppContext';
import { getServiceCustomIcon } from '../../utils/serviceIconMapper';
import { NextAuraAIIcon } from '../common/NextAuraAIIcon';

export const Sidebar: React.FC = () => {
  const {
    activeApp,
    activeSubView,
    navigate,
    organizations,
    currentOrg,
    switchOrg,
    isSidebarCollapsed,
    activeServices,
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

  const rawFinanceModules = [
    { key: 'invoicing', id: 'invoicing', title: 'Invoicing', icon: CreditCard, color: 'text-blue-700 dark:text-blue-300', subViews: [{ id: 'overview', label: 'Invoices' }, { id: 'new-invoice', label: 'Create Invoice' }, { id: 'customers', label: 'Customers' }] },
    { key: 'accounting', id: 'accounting', defaultSubView: 'ledger', title: 'Accounting', icon: CreditCard, color: 'text-blue-600 dark:text-blue-400', subViews: [{ id: 'overview', label: 'Accounting Overview' }, { id: 'ledger', label: 'General Ledger' }, { id: 'journal-new', label: 'Journal Entry' }, { id: 'reconciliation', label: 'Bank Reconciliation' }, { id: 'reports', label: 'Financial Reports' }] },
    { key: 'expenses', id: 'expenses', title: 'Expenses & Cards', icon: CreditCard, color: 'text-rose-600 dark:text-rose-400', subViews: [{ id: 'overview', label: 'Expenses' }, { id: 'approvals', label: 'Approval Queue' }, { id: 'cards', label: 'Corporate Cards' }] },
    { key: 'sign', id: 'sign', title: 'Sign (E-Signature)', icon: FileSignature, color: 'text-teal-600 dark:text-teal-400', subViews: [{ id: 'overview', label: 'Sign Documents' }, { id: 'builder', label: 'Prepare Agreement' }] },
    { key: 'equity', id: 'equity', defaultSubView: 'cap-table', title: 'Equity & Cap Table', icon: PieChart, color: 'text-amber-600 dark:text-amber-400', subViews: [{ id: 'overview', label: 'Ownership' }, { id: 'cap-table', label: 'Shareholders' }, { id: 'dilution', label: 'Dilution Simulator' }] },
    { key: 'esg', id: 'esg', title: 'ESG & Carbon', icon: Leaf, color: 'text-emerald-600 dark:text-emerald-400', subViews: [{ id: 'overview', label: 'ESG Records' }, { id: 'carbon', label: 'Carbon Calculator' }] },
  ];

  const rawHrModules = [
    { key: 'employees', id: 'employees', title: 'Employees', icon: Users, color: 'text-amber-600 dark:text-amber-400', subViews: [{ id: 'overview', label: 'Employee Directory' }, { id: 'org-chart', label: 'Organization Chart' }] },
    { key: 'attendance', id: 'attendance', title: 'Attendances', icon: Clock, color: 'text-cyan-600 dark:text-cyan-400', subViews: [{ id: 'overview', label: 'Who\'s Working Board' }, { id: 'log', label: 'Attendance Log' }, { id: 'kiosk', label: 'Kiosk Mode' }] },
    { key: 'recruitment', id: 'recruitment', defaultSubView: 'kanban', title: 'Recruitment (ATS)', icon: UserPlus, color: 'text-rose-600 dark:text-rose-400', subViews: [{ id: 'overview', label: 'Recruitment Overview' }, { id: 'kanban', label: 'Candidate Pipeline' }, { id: 'jobs', label: 'Job Openings' }] },
    { key: 'time_off', id: 'time-off', defaultSubView: 'requests', title: 'Time Off & Leave', icon: CalendarIcon, color: 'text-purple-600 dark:text-purple-400', subViews: [{ id: 'overview', label: 'My Requests' }, { id: 'requests', label: 'Pending Approvals' }, { id: 'calendar', label: 'Team Leave Calendar' }] },
    { key: 'appraisals', id: 'appraisals', title: 'Appraisals & OKRs', icon: Award, color: 'text-amber-600 dark:text-amber-400', subViews: [{ id: 'overview', label: 'Review Cycles' }, { id: 'goals', label: 'Goals & OKRs' }] },
    { key: 'fleet', id: 'fleet', title: 'Fleet Management', icon: Car, color: 'text-blue-600 dark:text-blue-400', subViews: [{ id: 'overview', label: 'Vehicles Directory' }, { id: 'maintenance', label: 'Maintenance Schedule' }] },
    { key: 'payroll', id: 'payroll', defaultSubView: 'runs', title: 'Payroll Processing', icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', subViews: [{ id: 'overview', label: 'Payroll Overview' }, { id: 'runs', label: 'Payroll Runs' }, { id: 'payslips', label: 'Payslip Generator' }] },
  ];

  const rawMarketingModules = [
    { key: 'email_marketing', id: 'email', title: 'Email Marketing', icon: Mail, color: 'text-rose-600 dark:text-rose-400', subViews: [{ id: 'overview', label: 'Email Campaigns' }, { id: 'new', label: 'Campaign Wizard' }, { id: 'templates', label: 'Email Templates' }] },
    { key: 'sms_marketing', id: 'sms', title: 'SMS Marketing', icon: MessageSquare, color: 'text-indigo-600 dark:text-indigo-400', subViews: [{ id: 'overview', label: 'SMS Campaigns' }, { id: 'new', label: 'Create SMS' }] },
    { key: 'surveys', id: 'surveys', title: 'Surveys & Forms', icon: ClipboardList, color: 'text-amber-600 dark:text-amber-400', subViews: [{ id: 'overview', label: 'Active Surveys' }, { id: 'new', label: 'Form Builder' }] },
    { key: 'social_marketing', id: 'social', title: 'Social Marketing', icon: Share2, color: 'text-sky-600 dark:text-sky-400', subViews: [{ id: 'overview', label: 'Social Content Calendar' }, { id: 'new', label: 'Compose Post' }, { id: 'accounts', label: 'Connected Accounts' }] },
  ];

  const financeModules = rawFinanceModules.filter((m) => activeServices.includes(m.key));
  const hrModules = rawHrModules.filter((m) => activeServices.includes(m.key));
  const marketingModules = rawMarketingModules.filter((m) => activeServices.includes(m.key));

  const contactsCustomIcon = getServiceCustomIcon('contacts');
  const documentsCustomIcon = getServiceCustomIcon('documents');
  const analyticsCustomIcon = getServiceCustomIcon('analytics');

  const renderModuleGroup = (title: string, categoryKey: 'finance' | 'hr' | 'marketing', modules: any[], badgeColor: string) => {
    const isOpen = expandedCategory === categoryKey;

    return (
      <div className="space-y-1">
        <button
          aria-label={title}
          onClick={() => setExpandedCategory(isOpen ? null : categoryKey)}
          className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${badgeColor}`} />
            {!isSidebarCollapsed && <span className="text-[11px] font-semibold">{title}</span>}
          </span>
          {!isSidebarCollapsed && (
            isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {(!isSidebarCollapsed && isOpen) && (
          <div className="space-y-0.5 ps-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const customIcon = getServiceCustomIcon(categoryKey, mod.title, mod.key);
              const isModExpanded = expandedApp === mod.id;
              const isModActive = activeApp === mod.id;

              return (
                <div key={mod.id} className="space-y-0.5">
                  <button
                    onClick={() => {
                      if (!isModActive) {
                        navigate(mod.id as AppView, mod.defaultSubView || 'overview');
                      }
                      setExpandedApp(isModExpanded ? null : mod.id);
                    }}
                    className={`w-full px-2.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-medium transition-all ${
                      isModActive
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.08)]'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {customIcon ? (
                        <img
                          src={customIcon}
                          alt={`${mod.title} icon`}
                          className="w-4 h-4 object-contain select-none pointer-events-none"
                        />
                      ) : (
                        <Icon className={`w-4 h-4 ${mod.color}`} />
                      )}
                      <span>{mod.title}</span>
                    </div>
                    {isModExpanded ? (
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    )}
                  </button>

                  {isModExpanded && (
                    <div className="ps-5 pe-1 py-1 space-y-0.5 border-s border-slate-200 dark:border-slate-800 ms-4">
                      {mod.subViews.map((sub: any) => (
                        <button
                          key={sub.id}
                          onClick={() => navigate(mod.id as AppView, sub.id)}
                          className={`w-full py-1 px-2 rounded-lg text-start text-[11px] transition-colors ${
                            isModActive && activeSubView === sub.id
                              ? 'text-blue-700 dark:text-blue-400 font-semibold bg-blue-50/80 dark:bg-blue-950/40'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/30'
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
      aria-label="Primary workspace navigation"
      className={`fixed inset-y-0 start-0 h-screen shrink-0 z-30 bg-[#FCFCFA] dark:bg-[#1D221F] border-e border-slate-200/80 dark:border-slate-800 flex flex-col justify-between transition-[width,transform] duration-300 lg:sticky ${
        isSidebarCollapsed ? '-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:w-[76px]' : 'translate-x-0 w-[280px]'
      }`}
    >
      <div className="space-y-5 p-3.5 overflow-y-auto">
        {/* Top Brand Logo */}
        <div className="flex items-center justify-between px-1">
          <div
            onClick={() => navigate('launchpad')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center font-semibold text-sm shadow-sm group-hover:bg-blue-800 transition-colors">
              NA
            </div>
            {!isSidebarCollapsed && (
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100 font-heading">
                  NextAura <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                </div>
                <div className="text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
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
              aria-label="Switch workspace"
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="w-full p-3 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between transition-colors shadow-[0_1px_2px_rgba(26,35,30,.02)]"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><Building2 className="h-3.5 w-3.5" aria-hidden="true" /></span>
                <div className="text-start truncate">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{currentOrg.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{currentOrg.baseCurrency} Workspace</div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {isOrgDropdownOpen && (
              <div className="absolute top-full start-0 w-full mt-1.5 p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg z-50 space-y-0.5">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">Switch Workspace</div>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      void switchOrg(org.id).catch((error) => console.error('[Sidebar] Failed to switch workspace:', error));
                      setIsOrgDropdownOpen(false);
                    }}
                    className={`w-full p-2 rounded-lg flex items-center justify-between text-xs font-medium transition-colors ${
                      currentOrg.id === org.id
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                      {org.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{org.baseCurrency}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation Sections */}
        <div className="space-y-3 pt-1">
          {/* Main Apps & Overview */}
          <div className="space-y-0.5">
            <button
              aria-label="Workspace Home"
              onClick={() => navigate('home')}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
                activeApp === 'home'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.08)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <Home className="w-4 h-4 text-slate-500" />
              {!isSidebarCollapsed && <span>Workspace Home</span>}
            </button>

            <button
              aria-label="Apps Launchpad"
              onClick={() => navigate('launchpad')}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
                activeApp === 'launchpad'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.08)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {!isSidebarCollapsed && <span>Apps Launchpad</span>}
            </button>

            <button
              aria-label="NextAura AI"
              onClick={() => navigate('ai')}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
                activeApp === 'ai'
                  ? 'bg-emerald-50 text-emerald-900 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.1)] dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <NextAuraAIIcon className="w-4 h-4" />
              {!isSidebarCollapsed && <span>NextAura AI</span>}
            </button>
          </div>

          <div className="pt-1">
            {!isSidebarCollapsed && (
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 pb-1">
                Business Operations
              </div>
            )}
          </div>

          {/* 3 Major Category Groups */}
          {renderModuleGroup('Finance', 'finance', financeModules, 'bg-indigo-500')}
          {renderModuleGroup('Human Resources', 'hr', hrModules, 'bg-amber-500')}
          {renderModuleGroup('Marketing', 'marketing', marketingModules, 'bg-rose-500')}

          <div className="pt-1">
            {!isSidebarCollapsed && (
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 pb-1">
                Global Platform
              </div>
            )}
          </div>

          <div className="space-y-0.5">
            <button
              aria-label="Global Calendar"
              onClick={() => navigate('calendar')}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
                activeApp === 'calendar'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.08)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              {!isSidebarCollapsed && <span>Global Calendar</span>}
            </button>

            <button
              aria-label="Central Approvals"
              onClick={() => navigate('approvals')}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
                activeApp === 'approvals'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.08)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {!isSidebarCollapsed && <span>Central Approvals</span>}
            </button>

            <button
              aria-label="Contacts CRM"
              onClick={() => navigate('contacts')}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
                activeApp === 'contacts'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.08)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }`}
            >
              {contactsCustomIcon ? (
                <img src={contactsCustomIcon} alt="Contacts CRM icon" className="w-4 h-4 object-contain select-none pointer-events-none" />
              ) : (
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              )}
              {!isSidebarCollapsed && <span>Contacts CRM</span>}
            </button>

            <button
              aria-label="Document Vault"
              onClick={() => navigate('documents')}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
                activeApp === 'documents'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.08)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }`}
            >
              {documentsCustomIcon ? (
                <img src={documentsCustomIcon} alt="Document Vault icon" className="w-4 h-4 object-contain select-none pointer-events-none" />
              ) : (
                <FolderKanban className="w-4 h-4 text-slate-500" />
              )}
              {!isSidebarCollapsed && <span>Document Vault</span>}
            </button>

            <button
              aria-label="Analytics Center"
              onClick={() => navigate('analytics')}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
                activeApp === 'analytics'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.08)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }`}
            >
              {analyticsCustomIcon ? (
                <img src={analyticsCustomIcon} alt="Analytics Center icon" className="w-4 h-4 object-contain select-none pointer-events-none" />
              ) : (
                <BarChart3 className="w-4 h-4 text-slate-500" />
              )}
              {!isSidebarCollapsed && <span>Analytics Center</span>}
            </button>

            <button
              aria-label="Add Services"
              onClick={() => navigate('settings', 'services')}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
                activeApp === 'settings' && activeSubView === 'services'
                  ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.08)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {!isSidebarCollapsed && <span>Add Services</span>}
            </button>

            <button
              aria-label="Settings"
              onClick={() => navigate('settings')}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
                activeApp === 'settings' && activeSubView !== 'services' && activeSubView !== 'admin-requests'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.08)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-500" />
              {!isSidebarCollapsed && <span>Settings</span>}
            </button>

            <button
              aria-label="Pricing"
              onClick={() => navigate('pricing')}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
                activeApp === 'pricing'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold shadow-[inset_0_0_0_1px_rgba(40,81,67,.08)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <BadgeDollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {!isSidebarCollapsed && <span>Pricing</span>}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
