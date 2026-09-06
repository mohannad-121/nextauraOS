import React, { useEffect, useRef, useState } from 'react';
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
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/authService';

const appLabels: Record<string, string> = {
  launchpad: 'Apps', home: 'Workspace', invoicing: 'Invoicing', accounting: 'Accounting',
  expenses: 'Expenses', sign: 'Sign', equity: 'Equity', esg: 'ESG & Carbon', hr: 'Human Resources',
  employees: 'Employees', attendance: 'Attendance', recruitment: 'Recruitment', 'time-off': 'Time Off',
  appraisals: 'Appraisals', fleet: 'Fleet', payroll: 'Payroll', marketing: 'Marketing', email: 'Email',
  sms: 'SMS', surveys: 'Surveys', social: 'Social', calendar: 'Calendar', approvals: 'Approvals',
  contacts: 'Contacts', documents: 'Documents', analytics: 'Analytics', settings: 'Settings',
};

export const Topbar: React.FC = () => {
  const {
    activeApp, activeSubView, navigate, theme, toggleTheme, language, toggleLanguage, user,
    notifications, setCommandPaletteOpen, setNotificationDrawerOpen, isSidebarCollapsed, setSidebarCollapsed,
  } = useApp();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  const contextualAction = (() => {
    switch (activeApp) {
      case 'invoicing': return { label: 'New invoice', onClick: () => navigate('invoicing', 'new-invoice') };
      case 'employees':
      case 'hr': return { label: 'Add employee', onClick: () => navigate('employees', 'overview') };
      case 'payroll': return { label: 'New payroll run', onClick: () => navigate('payroll', 'overview') };
      case 'expenses': return { label: 'Submit expense', onClick: () => navigate('expenses', 'overview') };
      case 'email':
      case 'marketing': return { label: 'New campaign', onClick: () => navigate('email', 'new') };
      case 'recruitment': return { label: 'New opening', onClick: () => navigate('recruitment', 'overview') };
      case 'contacts': return { label: 'Add contact', onClick: () => navigate('contacts') };
      default: return { label: 'New invoice', onClick: () => navigate('invoicing', 'new-invoice') };
    }
  })();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200/70 bg-white/90 px-3 backdrop-blur-xl dark:border-slate-800 dark:bg-[#222825]/90 sm:px-5 lg:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label={isSidebarCollapsed ? 'Open navigation' : 'Close navigation'}
          aria-expanded={!isSidebarCollapsed}
        >
          {isSidebarCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </button>

        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-2 text-sm">
            <li className="hidden text-slate-500 sm:block">
              <button type="button" onClick={() => navigate('home')} className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">
                NextAura
              </button>
            </li>
            <li aria-hidden="true" className="hidden text-slate-300 dark:text-slate-700 sm:block">/</li>
            <li className="truncate font-medium text-slate-800 dark:text-slate-100">{appLabels[activeApp] || activeApp}</li>
            {activeSubView !== 'overview' && (
              <>
                <li aria-hidden="true" className="hidden text-slate-300 dark:text-slate-700 md:block">/</li>
                <li className="hidden truncate text-slate-500 dark:text-slate-400 md:block">{activeSubView.replaceAll('-', ' ')}</li>
              </>
            )}
          </ol>
        </nav>
      </div>

      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="mx-5 hidden h-10 w-full max-w-sm items-center justify-between rounded-xl border border-slate-200 bg-[#FAFAF8] px-3.5 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800 lg:flex"
      >
        <span className="flex items-center gap-2"><Search className="h-4 w-4" aria-hidden="true" />Search your workspace</span>
        <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">Ctrl K</kbd>
      </button>

      <div className="flex flex-1 items-center justify-end gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={contextualAction.onClick}
          className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-blue-700 px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 sm:flex"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="hidden xl:inline">{contextualAction.label}</span>
          <span className="xl:hidden">Create</span>
        </button>

        <button type="button" onClick={() => setCommandPaletteOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Search">
          <Search className="h-[18px] w-[18px]" />
        </button>
        <button type="button" onClick={toggleLanguage} className="hidden h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 sm:flex" aria-label="Change language">
          <Globe className="h-4 w-4" /><span className="uppercase">{language}</span>
        </button>
        <button type="button" onClick={toggleTheme} className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 sm:flex" aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}>
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
        <button type="button" onClick={() => setNotificationDrawerOpen(true)} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />}
        </button>

        <div className="relative ms-1" ref={menuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((open) => !open)}
            className="flex h-11 items-center gap-2 rounded-xl ps-1.5 pe-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
          >
            <Avatar src={user.avatar} name={user.name} className="h-8 w-8 rounded-lg" />
            <span className="hidden max-w-28 truncate text-xs font-semibold text-slate-800 dark:text-slate-100 2xl:block">{user.name}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 2xl:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute end-0 top-full mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(26,35,30,.14)] dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <button type="button" onClick={() => { navigate('settings'); setUserMenuOpen(false); }} className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                <Settings className="h-4 w-4" />Settings
              </button>
              <button type="button" onClick={async () => { await authService.signOut(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30">
                <LogOut className="h-4 w-4" />Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
