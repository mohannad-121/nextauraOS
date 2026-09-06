import React from 'react';
import {
  Award,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSignature,
  FolderKanban,
  Leaf,
  Mail,
  MessageSquare,
  PieChart,
  Plus,
  Share2,
  UserPlus,
  Users,
  Wallet,
  Car,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppView } from '../context/AppContext';
import { useApp } from '../context/AppContext';
import { getServiceCustomIcon } from '../utils/serviceIconMapper';
import { Button } from '../components/common/Button';
import { NextAuraAIIcon } from '../components/common/NextAuraAIIcon';

interface AppDirectoryItem {
  serviceKey?: string;
  id: AppView;
  defaultSubView?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  customIcon?: 'ai';
  category: 'finance' | 'hr' | 'marketing' | 'platform';
}

const groups: Array<{ id: AppDirectoryItem['category']; title: string; apps: AppDirectoryItem[] }> = [
  {
    id: 'finance',
    title: 'Finance',
    apps: [
      { serviceKey: 'invoicing', id: 'invoicing', title: 'Invoicing', description: 'Invoices and customer payments', icon: CreditCard, category: 'finance' },
      { serviceKey: 'accounting', id: 'accounting', defaultSubView: 'ledger', title: 'Accounting', description: 'Ledgers, journals, and reports', icon: Building2, category: 'finance' },
      { serviceKey: 'expenses', id: 'expenses', title: 'Expenses', description: 'Claims, approvals, and cards', icon: CreditCard, category: 'finance' },
      { serviceKey: 'sign', id: 'sign', title: 'Sign', description: 'Agreements and signatures', icon: FileSignature, category: 'finance' },
      { serviceKey: 'equity', id: 'equity', defaultSubView: 'cap-table', title: 'Equity', description: 'Shareholders and cap table', icon: PieChart, category: 'finance' },
      { serviceKey: 'esg', id: 'esg', title: 'ESG', description: 'Carbon records and reporting', icon: Leaf, category: 'finance' },
    ],
  },
  {
    id: 'hr',
    title: 'Human Resources',
    apps: [
      { serviceKey: 'employees', id: 'employees', title: 'Employees', description: 'Directory and organization chart', icon: Users, category: 'hr' },
      { serviceKey: 'recruitment', id: 'recruitment', defaultSubView: 'kanban', title: 'Recruitment', description: 'Openings and candidates', icon: UserPlus, category: 'hr' },
      { serviceKey: 'attendance', id: 'attendance', title: 'Attendance', description: 'Clock state and attendance log', icon: Clock, category: 'hr' },
      { serviceKey: 'time_off', id: 'time-off', defaultSubView: 'requests', title: 'Time Off', description: 'Requests and team leave', icon: Calendar, category: 'hr' },
      { serviceKey: 'appraisals', id: 'appraisals', title: 'Appraisals', description: 'Reviews, goals, and OKRs', icon: Award, category: 'hr' },
      { serviceKey: 'fleet', id: 'fleet', title: 'Fleet', description: 'Vehicles and maintenance', icon: Car, category: 'hr' },
      { serviceKey: 'payroll', id: 'payroll', defaultSubView: 'runs', title: 'Payroll', description: 'Runs, review, and payslips', icon: Wallet, category: 'hr' },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing',
    apps: [
      { serviceKey: 'email_marketing', id: 'email', title: 'Email Marketing', description: 'Campaigns and templates', icon: Mail, category: 'marketing' },
      { serviceKey: 'sms_marketing', id: 'sms', title: 'SMS Marketing', description: 'Broadcasts and delivery', icon: MessageSquare, category: 'marketing' },
      { serviceKey: 'surveys', id: 'surveys', title: 'Surveys', description: 'Forms and responses', icon: ClipboardList, category: 'marketing' },
      { serviceKey: 'social_marketing', id: 'social', title: 'Social Marketing', description: 'Posts and scheduling', icon: Share2, category: 'marketing' },
    ],
  },
  {
    id: 'platform',
    title: 'Global Platform',
    apps: [
      { id: 'ai', title: 'NextAura AI', description: 'Your digital AI employee', customIcon: 'ai', category: 'platform' },
      { serviceKey: 'contacts', id: 'contacts', title: 'Contacts', description: 'Customers, vendors, and partners', icon: Users, category: 'platform' },
      { serviceKey: 'documents', id: 'documents', title: 'Documents', description: 'Business files and search', icon: FolderKanban, category: 'platform' },
      { id: 'calendar', title: 'Calendar', description: 'Events across your apps', icon: Calendar, category: 'platform' },
      { id: 'approvals', title: 'Approvals', description: 'Decisions waiting for review', icon: CheckCircle2, category: 'platform' },
      { serviceKey: 'analytics', id: 'analytics', title: 'Analytics', description: 'Cross-module reporting', icon: BarChart3, category: 'platform' },
    ],
  },
];

export const FinanceLaunchpad: React.FC = () => {
  const { navigate, currentOrg, activeServices } = useApp();
  const visibleGroups = groups.map((group) => ({
    ...group,
    apps: group.apps.filter((app) => !app.serviceKey || activeServices.includes(app.serviceKey)),
  })).filter((group) => group.apps.length > 0);

  return (
    <div className="mx-auto max-w-[1180px] pb-16">
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-9 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300"><Building2 className="h-4 w-4 text-blue-700 dark:text-blue-300" aria-hidden="true" />{currentOrg.name}</p>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-slate-900 dark:text-slate-100 sm:text-4xl">Applications</h1>
          <p className="mt-3 text-[15px] leading-7 text-slate-600 dark:text-slate-400">Open an application and work directly with its records.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('settings', 'services')}>Add services</Button>
      </header>

      <div className="mt-11 space-y-12">
        {visibleGroups.map((group) => (
          <section key={group.id}>
            <div className="flex items-center gap-5 border-b border-slate-200 pb-3 dark:border-slate-800">
              <h2 className="shrink-0 text-lg font-medium text-slate-900 dark:text-slate-100">{group.title}</h2>
              <span className="text-xs text-slate-600 dark:text-slate-400">{group.apps.length} application{group.apps.length === 1 ? '' : 's'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {group.apps.map((app) => {
                const Icon = app.icon;
                const customIcon = app.serviceKey ? getServiceCustomIcon(app.category, app.title, app.serviceKey) : undefined;
                return (
                  <button
                    type="button"
                    key={app.id}
                    onClick={() => navigate(app.id, app.defaultSubView || 'overview')}
                    className="group flex min-h-24 items-center gap-4 border-b border-slate-200 px-1 py-5 text-start transition-colors hover:bg-[#FAFAF8] dark:border-slate-800 dark:hover:bg-slate-800/50 sm:px-4"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3F6F2] text-blue-700 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800 dark:text-blue-300 dark:ring-slate-700">
                      {app.customIcon === 'ai' ? <NextAuraAIIcon className="h-8 w-8" /> : customIcon ? <img src={customIcon} alt="" className="h-6 w-6 object-contain" /> : Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{app.title}</span>
                      <span className="mt-1 block truncate text-xs text-slate-600 dark:text-slate-400">{app.description}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-blue-700 rtl:rotate-180" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
