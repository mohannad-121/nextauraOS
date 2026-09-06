import React, { useMemo } from 'react';
import {
  ArrowRight, Plus, CheckCircle2, AlertCircle, FileSignature, CreditCard, Users, Calendar,
  Wallet, Mail, Building2, Clock, FolderKanban, BarChart3, LayoutGrid, Activity, UserPlus,
  MessageSquare, ClipboardList, Share2, Award, Car, Leaf,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getServiceCustomIcon } from '../utils/serviceIconMapper';
import { formatDate, formatCurrency } from '../utils/formatters';
import { Button } from '../components/common/Button';
import { SectionHeader, Surface } from '../components/common/WorkspacePrimitives';
import { NextAuraAIIcon } from '../components/common/NextAuraAIIcon';

export const HomeDashboard: React.FC = () => {
  const {
    navigate, user, currentOrg, activeServices, invoices, expenses, signDocuments,
    employees, timeOffRequests, auditLogs,
  } = useApp();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const pendingTimeOff = useMemo(() => timeOffRequests.filter((item) => item.status === 'Pending'), [timeOffRequests]);
  const pendingExpenses = useMemo(() => expenses.filter((item) => item.status === 'Submitted'), [expenses]);
  const pendingSignatures = useMemo(() => signDocuments.filter((item) => item.status === 'Sent' || item.status === 'Partially Signed'), [signDocuments]);
  const overdueInvoices = useMemo(() => invoices.filter((item) => item.status === 'Overdue'), [invoices]);
  const attentionCount = pendingTimeOff.length + pendingExpenses.length + pendingSignatures.length + overdueInvoices.length;

  const allApps = [
    { key: 'invoicing', app: 'invoicing', category: 'finance', title: 'Invoicing', desc: 'Invoices, customers and payments', icon: CreditCard },
    { key: 'accounting', app: 'accounting', category: 'finance', title: 'Accounting', desc: 'Ledger, journals and reports', icon: Building2 },
    { key: 'expenses', app: 'expenses', category: 'finance', title: 'Expenses', desc: 'Claims, reviews and corporate cards', icon: CreditCard },
    { key: 'sign', app: 'sign', category: 'finance', title: 'Sign', desc: 'Prepare and track agreements', icon: FileSignature },
    { key: 'equity', app: 'equity', category: 'finance', title: 'Equity', desc: 'Cap table and dilution planning', icon: BarChart3 },
    { key: 'esg', app: 'esg', category: 'finance', title: 'ESG & Carbon', desc: 'Sustainability records and reporting', icon: Leaf },
    { key: 'employees', app: 'employees', category: 'hr', title: 'Employees', desc: 'People directory and org chart', icon: Users },
    { key: 'attendance', app: 'attendance', category: 'hr', title: 'Attendance', desc: 'Presence, time logs and kiosk', icon: Clock },
    { key: 'recruitment', app: 'recruitment', category: 'hr', title: 'Recruitment', desc: 'Openings and candidate pipeline', icon: UserPlus },
    { key: 'time_off', app: 'time-off', category: 'hr', title: 'Time Off', desc: 'Requests, approvals and calendar', icon: Calendar },
    { key: 'appraisals', app: 'appraisals', category: 'hr', title: 'Appraisals', desc: 'Reviews, goals and OKRs', icon: Award },
    { key: 'fleet', app: 'fleet', category: 'hr', title: 'Fleet', desc: 'Vehicles and maintenance', icon: Car },
    { key: 'payroll', app: 'payroll', category: 'hr', title: 'Payroll', desc: 'Runs, review and payslips', icon: Wallet },
    { key: 'email_marketing', app: 'email', category: 'marketing', title: 'Email', desc: 'Campaigns and templates', icon: Mail },
    { key: 'sms_marketing', app: 'sms', category: 'marketing', title: 'SMS', desc: 'Broadcasts and delivery', icon: MessageSquare },
    { key: 'surveys', app: 'surveys', category: 'marketing', title: 'Surveys', desc: 'Forms and customer feedback', icon: ClipboardList },
    { key: 'social_marketing', app: 'social', category: 'marketing', title: 'Social', desc: 'Content and scheduling', icon: Share2 },
    { key: 'contacts', app: 'contacts', category: 'platform', title: 'Contacts', desc: 'Clients, vendors and partners', icon: Users },
    { key: 'documents', app: 'documents', category: 'platform', title: 'Documents', desc: 'Secure files and search', icon: FolderKanban },
    { key: 'analytics', app: 'analytics', category: 'platform', title: 'Analytics', desc: 'Operational intelligence', icon: BarChart3 },
  ];
  const activeApps = [
    { key: 'nextaura-ai', app: 'ai', category: 'platform', title: 'NextAura AI', desc: 'Ask about work and NextAura', icon: Sparkles },
    ...allApps.filter((item) => activeServices.includes(item.key)),
  ];
  const recordsFirstSubview: Partial<Record<string, string>> = {
    accounting: 'ledger',
    equity: 'cap-table',
    recruitment: 'kanban',
    'time-off': 'requests',
    payroll: 'runs',
  };

  const actionRow = (key: string, icon: React.ReactNode, title: string, detail: string, label: string, onClick: () => void) => (
    <div key={key} className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 last:pb-0 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onClick} className="self-start sm:self-auto">{label}</Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1280px] space-y-9 pb-12">
      <section className="flex flex-col gap-6 border-b border-slate-200/70 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            <span>{currentOrg.name}</span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-[2.25rem]">
            {greeting}, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-slate-500 dark:text-slate-400">
            {attentionCount > 0
              ? `${attentionCount} item${attentionCount === 1 ? '' : 's'} need your attention. Everything else is moving along.`
              : 'Your workspace is clear. Pick up where you left off or start something new.'}
          </p>
        </div>
        <Button variant="secondary" icon={<LayoutGrid className="h-4 w-4" />} onClick={() => navigate('launchpad')}>
          Browse all apps
        </Button>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Quick actions" description="Start a common task without leaving your workspace." />
        <Surface padding="sm" className="flex flex-wrap gap-2.5">
          <Button icon={<NextAuraAIIcon className="h-4 w-4" />} onClick={() => navigate('ai')}>Ask NextAura AI</Button>
          {activeServices.includes('invoicing') && <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('invoicing', 'new-invoice')}>Create invoice</Button>}
          {activeServices.includes('employees') && <Button variant="secondary" icon={<UserPlus className="h-4 w-4" />} onClick={() => navigate('employees')}>Add employee</Button>}
          {activeServices.includes('payroll') && <Button variant="secondary" icon={<Wallet className="h-4 w-4" />} onClick={() => navigate('payroll', 'runs')}>Open payroll runs</Button>}
          {activeServices.includes('email_marketing') && <Button variant="secondary" icon={<Mail className="h-4 w-4" />} onClick={() => navigate('email', 'new')}>New campaign</Button>}
          <Button variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('settings', 'services')}>Add services</Button>
        </Surface>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Your apps"
          description="The tools enabled for this workspace."
          action={<button type="button" onClick={() => navigate('settings', 'services')} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300">Manage apps <ArrowRight className="h-3.5 w-3.5" /></button>}
        />
        {activeApps.length > 0 ? (
          <div className="grid grid-cols-1 gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-700 dark:bg-slate-700">
            {activeApps.map((item) => {
              const Icon = item.icon;
              const customIcon = getServiceCustomIcon(item.category, item.title, item.key);
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => navigate(item.app as never, recordsFirstSubview[item.app] || 'overview')}
                  className="group flex min-h-[104px] items-start gap-3.5 bg-white p-4 text-start transition-colors hover:bg-[#FAFAF8] dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F7F3] text-blue-700 ring-1 ring-inset ring-slate-200/60 transition-colors group-hover:bg-blue-50 dark:bg-slate-800 dark:text-blue-300 dark:ring-slate-700">
                    {item.key === 'nextaura-ai' ? <NextAuraAIIcon className="h-7 w-7" /> : customIcon ? <img src={customIcon} alt="" className="h-5 w-5 object-contain" /> : <Icon className="h-[18px] w-[18px]" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 font-semibold text-slate-900 dark:text-slate-100">{item.title}<ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" /></span>
                    <span className="mt-1.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{item.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <Surface className="text-center">
            <p className="font-medium text-slate-900 dark:text-white">No applications enabled yet</p>
            <p className="mt-1 text-sm text-slate-500">Add the services your team needs to begin working.</p>
            <Button className="mt-4" onClick={() => navigate('settings', 'services')}>Add services</Button>
          </Surface>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]">
        <section className="space-y-4">
          <SectionHeader title="Needs attention" description="Items waiting for review, approval, or follow-up." action={attentionCount > 0 ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">{attentionCount} open</span> : undefined} />
          <Surface>
            {attentionCount > 0 ? (
              <div>
                {pendingTimeOff.map((item) => actionRow(`leave-${item.id}`, <Calendar className="h-4 w-4" />, `Leave request · ${item.employeeName}`, `${item.leaveType} · ${item.startDate} to ${item.endDate}`, 'Review', () => navigate('time-off', 'requests')))}
                {pendingExpenses.map((item) => actionRow(`expense-${item.id}`, <CreditCard className="h-4 w-4" />, item.title, `${item.employeeName} · ${formatCurrency(item.amount, item.currency)}`, 'Review', () => navigate('expenses', 'approvals')))}
                {pendingSignatures.map((item) => actionRow(`sign-${item.id}`, <FileSignature className="h-4 w-4" />, item.title, `${item.recipients.length} recipient${item.recipients.length === 1 ? '' : 's'} waiting`, 'Track', () => navigate('sign')))}
                {overdueInvoices.map((item) => actionRow(`invoice-${item.id}`, <AlertCircle className="h-4 w-4" />, `Invoice ${item.number} is overdue`, `${item.customerName} · ${formatCurrency(item.amountDue, item.currency)}`, 'View', () => navigate('invoicing')))}
              </div>
            ) : (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>
                <p className="mt-4 font-semibold text-slate-900 dark:text-white">Nothing needs your attention</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Approvals, signatures, expenses, and overdue invoices are all clear.</p>
              </div>
            )}
          </Surface>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Recent activity" description="Latest updates in this workspace." icon={Activity} />
          <Surface>
            {auditLogs.length > 0 ? (
              <ol className="space-y-0">
                {auditLogs.slice(0, 5).map((log) => (
                  <li key={log.id} className="relative border-b border-slate-100 py-3.5 ps-5 first:pt-0 last:border-0 last:pb-0 dark:border-slate-800">
                    <span className="absolute start-0 top-[1.15rem] h-2 w-2 rounded-full bg-blue-500 first:top-1" />
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{log.action}</p>
                    <p className="mt-1 text-xs text-slate-500">{log.userName} · {formatDate(log.timestamp)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="py-7 text-center">
                <Activity className="mx-auto h-5 w-5 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-800 dark:text-white">No recent activity</p>
                <p className="mt-1 text-xs text-slate-500">New workspace updates will appear here.</p>
              </div>
            )}
          </Surface>
        </section>
      </div>

      {(employees.length > 0 || invoices.length > 0) && (
        <p className="border-t border-slate-200/70 pt-5 text-xs text-slate-500">
          Workspace summary: {employees.length} employee{employees.length === 1 ? '' : 's'} · {invoices.length} invoice{invoices.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
};
