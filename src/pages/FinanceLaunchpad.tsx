import React from 'react';
import {
  CreditCard, FileSignature, PieChart, Leaf, Users, Clock, UserPlus, Calendar, Award, Car,
  Wallet, Mail, MessageSquare, ClipboardList, Share2, ArrowRight, Building2, Boxes, Plus,
  FolderKanban, BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppView } from '../context/AppContext';
import { useApp } from '../context/AppContext';
import { getServiceCustomIcon } from '../utils/serviceIconMapper';
import { Button } from '../components/common/Button';
import { SectionHeader } from '../components/common/WorkspacePrimitives';

interface AppTile {
  serviceKey: string;
  id: AppView;
  title: string;
  description: string;
  icon: LucideIcon;
  category: 'finance' | 'hr' | 'marketing' | 'platform';
}

const groups: Array<{ id: AppTile['category']; title: string; description: string; apps: AppTile[] }> = [
  {
    id: 'finance',
    title: 'Finance',
    description: 'Money, compliance, ownership, and reporting.',
    apps: [
      { serviceKey: 'invoicing', id: 'invoicing', title: 'Invoicing', description: 'Create invoices and follow every payment.', icon: CreditCard, category: 'finance' },
      { serviceKey: 'accounting', id: 'accounting', title: 'Accounting', description: 'Keep journals, ledgers, and reports in order.', icon: Building2, category: 'finance' },
      { serviceKey: 'expenses', id: 'expenses', title: 'Expenses & Cards', description: 'Submit, review, and control company spend.', icon: CreditCard, category: 'finance' },
      { serviceKey: 'sign', id: 'sign', title: 'Sign', description: 'Prepare agreements and track signatures.', icon: FileSignature, category: 'finance' },
      { serviceKey: 'equity', id: 'equity', title: 'Equity & Cap Table', description: 'Manage ownership and model dilution.', icon: PieChart, category: 'finance' },
      { serviceKey: 'esg', id: 'esg', title: 'ESG & Carbon', description: 'Record sustainability activity and emissions.', icon: Leaf, category: 'finance' },
    ],
  },
  {
    id: 'hr',
    title: 'People',
    description: 'Teams, time, hiring, performance, and pay.',
    apps: [
      { serviceKey: 'employees', id: 'employees', title: 'Employees', description: 'A clear directory for everyone in the company.', icon: Users, category: 'hr' },
      { serviceKey: 'attendance', id: 'attendance', title: 'Attendance', description: 'Track presence, work time, and kiosk entries.', icon: Clock, category: 'hr' },
      { serviceKey: 'recruitment', id: 'recruitment', title: 'Recruitment', description: 'Move candidates through a focused hiring pipeline.', icon: UserPlus, category: 'hr' },
      { serviceKey: 'time_off', id: 'time-off', title: 'Time Off', description: 'Coordinate requests, approvals, and team leave.', icon: Calendar, category: 'hr' },
      { serviceKey: 'appraisals', id: 'appraisals', title: 'Appraisals', description: 'Run reviews and keep goals visible.', icon: Award, category: 'hr' },
      { serviceKey: 'fleet', id: 'fleet', title: 'Fleet', description: 'Organize vehicles and scheduled maintenance.', icon: Car, category: 'hr' },
      { serviceKey: 'payroll', id: 'payroll', title: 'Payroll', description: 'Prepare, review, and complete payroll cycles.', icon: Wallet, category: 'hr' },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing',
    description: 'Guided tools for campaigns and customer feedback.',
    apps: [
      { serviceKey: 'email_marketing', id: 'email', title: 'Email', description: 'Plan and send audience-ready campaigns.', icon: Mail, category: 'marketing' },
      { serviceKey: 'sms_marketing', id: 'sms', title: 'SMS', description: 'Create concise broadcasts and track delivery.', icon: MessageSquare, category: 'marketing' },
      { serviceKey: 'surveys', id: 'surveys', title: 'Surveys', description: 'Build forms and understand customer sentiment.', icon: ClipboardList, category: 'marketing' },
      { serviceKey: 'social_marketing', id: 'social', title: 'Social', description: 'Compose and schedule content across channels.', icon: Share2, category: 'marketing' },
    ],
  },
  {
    id: 'platform',
    title: 'Workspace tools',
    description: 'Shared records and intelligence across the business.',
    apps: [
      { serviceKey: 'contacts', id: 'contacts', title: 'Contacts', description: 'Keep clients, partners, and vendors close.', icon: Users, category: 'platform' },
      { serviceKey: 'documents', id: 'documents', title: 'Documents', description: 'Store and find important business files.', icon: FolderKanban, category: 'platform' },
      { serviceKey: 'analytics', id: 'analytics', title: 'Analytics', description: 'Explore operational trends when you need them.', icon: BarChart3, category: 'platform' },
    ],
  },
];

export const FinanceLaunchpad: React.FC = () => {
  const { navigate, currentOrg, activeServices } = useApp();
  const activeGroups = groups
    .map((group) => ({ ...group, apps: group.apps.filter((app) => activeServices.includes(app.serviceKey)) }))
    .filter((group) => group.apps.length > 0);

  return (
    <div className="mx-auto max-w-[1280px] space-y-10 pb-14">
      <header className="flex flex-col gap-6 border-b border-slate-200/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
            <Boxes className="h-4 w-4" aria-hidden="true" />
            <span>{currentOrg.name}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[2.25rem]">Apps</h1>
          <p className="mt-3 text-[15px] leading-7 text-slate-600 dark:text-slate-400">
            Open the tools your team uses to run the business. Each app shares the same secure workspace context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" onClick={() => navigate('home')}>Workspace home</Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('settings', 'services')}>Add services</Button>
        </div>
      </header>

      {activeGroups.length > 0 ? activeGroups.map((group) => (
        <section key={group.id} className="space-y-4">
          <SectionHeader title={group.title} description={group.description} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.apps.map((app) => {
              const Icon = app.icon;
              const customIcon = getServiceCustomIcon(app.category, app.title, app.serviceKey);
              return (
                <button
                  type="button"
                  key={app.id}
                  onClick={() => navigate(app.id, 'overview')}
                  className="group flex min-h-[154px] flex-col rounded-2xl border border-slate-200/80 bg-white p-5 text-start shadow-[0_1px_2px_rgba(26,35,30,.02)] transition-all hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(26,35,30,.055)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F7F3] text-blue-700 ring-1 ring-inset ring-slate-200/60 group-hover:bg-blue-50 dark:bg-slate-800 dark:text-blue-300 dark:ring-slate-700">
                      {customIcon ? <img src={customIcon} alt="" className="h-5 w-5 object-contain" /> : <Icon className="h-[18px] w-[18px]" aria-hidden="true" />}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800">Active</span>
                  </div>
                  <div className="mt-4 flex-1">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{app.title}</h2>
                    <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{app.description}</p>
                  </div>
                  <span className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    Open app <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <Building2 className="mx-auto h-7 w-7 text-slate-400" />
          <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Your workspace is ready for its first app</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Choose only the services your team needs. You can add or remove them later.</p>
          <Button className="mt-5" onClick={() => navigate('settings', 'services')}>Choose services</Button>
        </div>
      )}
    </div>
  );
};
