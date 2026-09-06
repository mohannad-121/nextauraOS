import React from 'react';
import { Avatar } from '../common/Avatar';
import {
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';

export const Topbar: React.FC = () => {
  const {
    activeApp,
    activeSubView,
    navigate,
    theme,
    toggleTheme,
    language,
    toggleLanguage,
    user,
    notifications,
    setCommandPaletteOpen,
    setNotificationDrawerOpen,
    isSidebarCollapsed,
    setSidebarCollapsed,
  } = useApp();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const appBreadcrumbs: Record<string, string> = {
    launchpad: 'Finance Launchpad',
    home: 'Workspace Home',
    invoicing: 'Invoicing',
    accounting: 'Accounting & Ledger',
    expenses: 'Expenses & Cards',
    sign: 'Sign (E-Signature)',
    equity: 'Equity & Cap Table',
    esg: 'ESG & Carbon',
    hr: 'Human Resources',
    employees: 'Employee Directory',
    attendance: 'Attendance Board',
    recruitment: 'Recruitment ATS',
    'time-off': 'Time Off',
    appraisals: 'Appraisals',
    fleet: 'Fleet Management',
    payroll: 'Payroll Processing',
    marketing: 'Marketing Hub',
    email: 'Email Marketing',
    sms: 'SMS Marketing',
    surveys: 'Surveys & CSAT',
    social: 'Social Marketing',
    calendar: 'Global Calendar',
    approvals: 'Central Approvals',
    contacts: 'Contacts Directory',
    documents: 'Document Vault',
    analytics: 'Analytics Center',
    settings: 'Settings',
  };

  // Dynamic Contextual Primary Action Button
  const getContextualAction = () => {
    switch (activeApp) {
      case 'invoicing':
        return { label: 'New Invoice', onClick: () => navigate('invoicing', 'new-invoice') };
      case 'employees':
      case 'hr':
        return { label: 'Add Employee', onClick: () => navigate('employees', 'overview') };
      case 'payroll':
        return { label: 'Create Payroll Run', onClick: () => navigate('payroll', 'overview') };
      case 'expenses':
        return { label: 'Submit Expense', onClick: () => navigate('expenses', 'overview') };
      case 'email':
      case 'marketing':
        return { label: 'New Campaign', onClick: () => navigate('email', 'new') };
      case 'recruitment':
        return { label: 'New Job Opening', onClick: () => navigate('recruitment', 'overview') };
      case 'contacts':
        return { label: 'Add Contact', onClick: () => navigate('contacts') };
      default:
        return { label: 'New Invoice', onClick: () => navigate('invoicing', 'new-invoice') };
    }
  };

  const primaryAction = getContextualAction();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-6 flex items-center justify-between">
      {/* Left Breadcrumb & Sidebar Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Sidebar"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span
            onClick={() => navigate('home')}
            className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            NextAura
          </span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold font-heading">
            {appBreadcrumbs[activeApp] || activeApp}
          </span>
          {activeSubView !== 'overview' && (
            <>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-blue-700 dark:text-blue-400 capitalize">{activeSubView.replace('-', ' ')}</span>
            </>
          )}
        </div>
      </div>

      {/* Center Search Bar Trigger (Cmd+K) */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="hidden md:flex items-center justify-between w-80 px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 transition-all text-xs"
      >
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Search invoices, employees, records...</span>
        </div>
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 shadow-xs">
          ⌘K
        </kbd>
      </button>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* Dynamic Contextual Action Button */}
        <button
          onClick={primaryAction.onClick}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{primaryAction.label}</span>
        </button>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1"
          title="Toggle Language / RTL"
        >
          <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="uppercase">{language}</span>
        </button>

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Dark or Light Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setNotificationDrawerOpen(true)}
          className="relative p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          )}
        </button>

        {/* User Profile Avatar */}
        <div
          onClick={() => navigate('settings')}
          className="flex items-center gap-2.5 ps-2 border-s border-slate-200 dark:border-slate-800 cursor-pointer group"
        >
          <Avatar
            src={user.avatar}
            name={user.name}
            className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700"
          />
          <div className="hidden lg:block text-start">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              {user.name}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user.role}</div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={async () => {
            await authService.signOut();
          }}
          className="p-1.5 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 transition-colors flex items-center gap-1.5 text-xs font-medium"
          title="Sign Out of NextAura"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </header>
  );
};
