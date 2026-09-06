import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { NotificationDrawer } from './NotificationDrawer';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useApp } from '../../context/AppContext';

interface AppShellProps {
  children: React.ReactNode;
}

const appTitles: Record<string, string> = {
  launchpad: 'App Launcher',
  home: 'Workspace Home',
  invoicing: 'Invoicing',
  accounting: 'NextAura Finance',
  expenses: 'Expenses',
  sign: 'NextAura Sign',
  equity: 'Equity & Cap Table',
  esg: 'ESG & Carbon',
  hr: 'NextAura Human Resources',
  employees: 'Employees',
  attendance: 'Attendance',
  recruitment: 'Recruitment ATS',
  'time-off': 'Time Off',
  appraisals: 'Appraisals',
  fleet: 'Fleet Management',
  payroll: 'Payroll',
  marketing: 'NextAura Marketing',
  email: 'Email Marketing',
  sms: 'SMS Marketing',
  surveys: 'Surveys & CSAT',
  social: 'Social Marketing',
  calendar: 'Calendar',
  approvals: 'Approvals',
  contacts: 'Contacts',
  documents: 'Document Vault',
  analytics: 'Analytics',
  ai: 'NextAura AI',
  pricing: 'Pricing',
  settings: 'NextAura Settings',
  auth: 'Login',
};

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isRtl, activeApp, activeSubView, navigate, isSidebarCollapsed, setSidebarCollapsed } = useApp();

  useEffect(() => {
    const pageTitle = appTitles[activeApp] || 'Business OS';
    document.title = `${pageTitle} | NextAura`;
  }, [activeApp]);

  useEffect(() => {
    const smallViewport = window.matchMedia('(max-width: 1023px)');
    if (smallViewport.matches) setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // Render Auth page completely alone without Sidebar, Topbar, or AppShell wrapper
  if (activeApp === 'auth') {
    return <>{children}</>;
  }

  return (
    <div className={`min-h-screen bg-[#F7F7F4] dark:bg-[#171B19] text-slate-900 dark:text-slate-100 flex flex-col antialiased ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="flex-1 flex w-full overflow-x-hidden">
        <Sidebar />
        {!isSidebarCollapsed && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarCollapsed(true)}
            className="fixed inset-0 z-[25] bg-slate-900/15 backdrop-blur-[1px] lg:hidden"
          />
        )}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-transparent">
          <Topbar />
          <main className="workspace-main flex-1 w-full max-w-[1480px] mx-auto px-4 py-5 sm:px-6 sm:py-7 xl:px-10 xl:py-9 animate-in fade-in duration-200">
            <ErrorBoundary
              activeApp={activeApp}
              activeSubView={activeSubView}
              onReset={() => navigate('home', 'overview')}
            >
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <CommandPalette />
      <NotificationDrawer />
    </div>
  );
};
