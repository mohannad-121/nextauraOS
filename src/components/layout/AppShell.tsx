import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { NotificationDrawer } from './NotificationDrawer';
import { useApp } from '../../context/AppContext';

interface AppShellProps {
  children: React.ReactNode;
}

const appTitles: Record<string, string> = {
  launchpad: 'App Launcher',
  home: 'Dashboard',
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
  settings: 'NextAura Settings',
  auth: 'Login',
};

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isRtl, activeApp } = useApp();

  useEffect(() => {
    const pageTitle = appTitles[activeApp] || 'Business OS';
    document.title = `${pageTitle} | NextAura`;
  }, [activeApp]);

  // Render Auth page completely alone without Sidebar, Topbar, or AppShell wrapper
  if (activeApp === 'auth') {
    return <>{children}</>;
  }

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="flex-1 flex w-full overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-slate-950">
          <Topbar />
          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
      <NotificationDrawer />
    </div>
  );
};
