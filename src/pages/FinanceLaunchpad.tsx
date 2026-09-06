import React from 'react';
import {
  CreditCard,
  FileSignature,
  PieChart,
  Leaf,
  Users,
  Clock,
  UserPlus,
  Calendar,
  Award,
  Car,
  Wallet,
  Mail,
  MessageSquare,
  ClipboardList,
  Share2,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import type { AppView } from '../context/AppContext';
import { useApp } from '../context/AppContext';
import { getServiceCustomIcon } from '../utils/serviceIconMapper';
import { Button } from '../components/common/Button';

export const FinanceLaunchpad: React.FC = () => {
  const {
    navigate,
    currentOrg,
    invoices,
    journalEntries,
    expenses,
    signDocuments,
    shareholders,
    carbonActivities,
    employees,
    attendanceRecords,
    candidates,
    timeOffRequests,
    appraisals,
    vehicles,
    payrollRuns,
    emailCampaigns,
    smsCampaigns,
    surveys,
    socialPosts,
  } = useApp();

  const totalRevenue = invoices.filter((i) => i.status === 'Paid').reduce((acc, i) => acc + i.total, 0);
  const paidInvoicesCount = invoices.filter((i) => i.status === 'Paid').length;
  const pendingExpensesCount = expenses.filter((e) => e.status === 'Submitted').length;
  const activeSignDocsCount = signDocuments.filter((d) => d.status === 'Sent' || d.status === 'Partially Signed').length;

  const activeEmployeesCount = employees.filter((e) => e.status === 'Active').length;
  const checkedInCount = attendanceRecords.filter((r) => r.status === 'Working' || r.status === 'Remote').length;
  const activeCandidatesCount = candidates.length;
  const pendingLeaveCount = timeOffRequests.filter((r) => r.status === 'Pending').length;
  const activeVehiclesCount = vehicles.filter((v) => v.status === 'Assigned' || v.status === 'Available').length;
  const emailOpenBadge = emailCampaigns.length > 0 ? `${emailCampaigns[0].openRate}% Open Rate` : '0% Open Rate';
  const smsDeliveryBadge = smsCampaigns.length > 0 ? `${smsCampaigns[0].deliveryRate}% Delivery` : '0% Delivery';
  const activeSurveysCount = surveys.length;
  const scheduledPostsCount = socialPosts.filter((p) => p.status === 'Scheduled').length;

  const financeApps = [
    {
      id: 'invoicing',
      sub: 'overview',
      title: 'Invoicing & Billing',
      desc: 'Customer invoices, multi-currency schedules & receivables.',
      icon: CreditCard,
      accent: 'border-slate-200/80 dark:border-slate-800 text-blue-600 dark:text-blue-400',
      badge: `${paidInvoicesCount} Paid Invoices`,
      category: 'finance',
    },
    {
      id: 'accounting',
      sub: 'overview',
      title: 'Accounting & Ledger',
      desc: 'General ledger, journal entries & GAAP financial reports.',
      icon: CreditCard,
      accent: 'border-slate-200/80 dark:border-slate-800 text-indigo-600 dark:text-indigo-400',
      badge: `${journalEntries.length} Entries`,
      category: 'finance',
    },
    {
      id: 'expenses',
      sub: 'overview',
      title: 'Expenses & Cards',
      desc: 'Receipt OCR scanning, spend policies & virtual cards.',
      icon: CreditCard,
      accent: 'border-slate-200/80 dark:border-slate-800 text-rose-600 dark:text-rose-400',
      badge: `${pendingExpensesCount} Pending Review`,
      category: 'finance',
    },
    {
      id: 'sign',
      sub: 'overview',
      title: 'Sign (E-Signature)',
      desc: 'Legally binding e-signatures & audit trail certificates.',
      icon: FileSignature,
      accent: 'border-slate-200/80 dark:border-slate-800 text-teal-600 dark:text-teal-400',
      badge: `${activeSignDocsCount} Active Docs`,
      category: 'finance',
    },
    {
      id: 'equity',
      sub: 'overview',
      title: 'Equity & Cap Table',
      desc: 'Cap table modeling, option pools & funding dilution.',
      icon: PieChart,
      accent: 'border-slate-200/80 dark:border-slate-800 text-amber-600 dark:text-amber-400',
      badge: `${shareholders.length} Shareholders`,
      category: 'finance',
    },
    {
      id: 'esg',
      sub: 'overview',
      title: 'ESG & Sustainability',
      desc: 'CSRD readiness scorecard & Scope 1-3 carbon tracking.',
      icon: Leaf,
      accent: 'border-slate-200/80 dark:border-slate-800 text-emerald-600 dark:text-emerald-400',
      badge: `${carbonActivities.length} Activities`,
      category: 'finance',
    },
  ];

  const hrApps = [
    {
      id: 'employees',
      sub: 'overview',
      title: 'Employees Directory',
      desc: 'Central people directory, work info & interactive org chart.',
      icon: Users,
      accent: 'border-slate-200/80 dark:border-slate-800 text-amber-600 dark:text-amber-400',
      badge: `${activeEmployeesCount} Active Staff`,
      category: 'hr',
    },
    {
      id: 'attendance',
      sub: 'overview',
      title: 'Attendances & Clock',
      desc: 'Live "Who\'s Working" board, clock-in timer & kiosk mode.',
      icon: Clock,
      accent: 'border-slate-200/80 dark:border-slate-800 text-blue-600 dark:text-blue-400',
      badge: `${checkedInCount} Checked In`,
      category: 'hr',
    },
    {
      id: 'recruitment',
      sub: 'overview',
      title: 'Recruitment & ATS',
      desc: 'Drag-and-drop candidate Kanban pipeline & offer builder.',
      icon: UserPlus,
      accent: 'border-slate-200/80 dark:border-slate-800 text-rose-600 dark:text-rose-400',
      badge: `${activeCandidatesCount} Candidates`,
      category: 'hr',
    },
    {
      id: 'time-off',
      sub: 'overview',
      title: 'Time Off & Leave',
      desc: 'Leave allocations, manager approvals & shared team calendar.',
      icon: Calendar,
      accent: 'border-slate-200/80 dark:border-slate-800 text-purple-600 dark:text-purple-400',
      badge: `${pendingLeaveCount} Pending Req`,
      category: 'hr',
    },
    {
      id: 'appraisals',
      sub: 'overview',
      title: 'Appraisals & Performance',
      desc: '360° review cycles, OKRs/goals & skills matrix.',
      icon: Award,
      accent: 'border-slate-200/80 dark:border-slate-800 text-amber-600 dark:text-amber-400',
      badge: `${appraisals.length} Active Reviews`,
      category: 'hr',
    },
    {
      id: 'fleet',
      sub: 'overview',
      title: 'Fleet Management',
      desc: 'Company vehicles, odometer logs & maintenance alerts.',
      icon: Car,
      accent: 'border-slate-200/80 dark:border-slate-800 text-blue-600 dark:text-blue-400',
      badge: `${activeVehiclesCount} Active Vehicles`,
      category: 'hr',
    },
    {
      id: 'payroll',
      sub: 'overview',
      title: 'Payroll Processing',
      desc: 'Monthly payroll runs, automated payslips & GL posting.',
      icon: Wallet,
      accent: 'border-slate-200/80 dark:border-slate-800 text-emerald-600 dark:text-emerald-400',
      badge: `${payrollRuns.length} Payroll Runs`,
      category: 'hr',
    },
  ];

  const marketingApps = [
    {
      id: 'email',
      sub: 'overview',
      title: 'Email Marketing',
      desc: 'Visual email designer, audience segmentation & open analytics.',
      icon: Mail,
      accent: 'border-slate-200/80 dark:border-slate-800 text-rose-600 dark:text-rose-400',
      badge: emailOpenBadge,
      category: 'marketing',
    },
    {
      id: 'sms',
      sub: 'overview',
      title: 'SMS Marketing',
      desc: 'Broadcast SMS, phone preview & short trackable links.',
      icon: MessageSquare,
      accent: 'border-slate-200/80 dark:border-slate-800 text-indigo-600 dark:text-indigo-400',
      badge: smsDeliveryBadge,
      category: 'marketing',
    },
    {
      id: 'surveys',
      sub: 'overview',
      title: 'Surveys & Forms',
      desc: 'Multi-page form builder, NPS scoring & CSAT analytics.',
      icon: ClipboardList,
      accent: 'border-slate-200/80 dark:border-slate-800 text-amber-600 dark:text-amber-400',
      badge: `${activeSurveysCount} Active Surveys`,
      category: 'marketing',
    },
    {
      id: 'social',
      sub: 'overview',
      title: 'Social Marketing',
      desc: 'Multi-platform social content composer & calendar.',
      icon: Share2,
      accent: 'border-slate-200/80 dark:border-slate-800 text-blue-600 dark:text-blue-400',
      badge: `${scheduledPostsCount} Posts Scheduled`,
      category: 'marketing',
    },
  ];

  const renderAppCard = (app: any) => {
    const Icon = app.icon;
    const customIcon = getServiceCustomIcon(app.category, app.title, app.id);

    return (
      <div
        key={app.id}
        onClick={() => navigate(app.id as AppView, app.sub)}
        className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer flex flex-col justify-between space-y-4 group"
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center">
            {customIcon ? (
              <img
                src={customIcon}
                alt={`${app.title} icon`}
                className="w-5 h-5 object-contain select-none"
              />
            ) : (
              <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            )}
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400 font-mono">
            {app.badge}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{app.title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-sans">{app.desc}</p>
        </div>

        <div className="pt-2 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">
          <span>Open Application</span>
          <ArrowUpRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Welcome Banner */}
      <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-3.5 h-3.5" />
              NextAura Business Operating System
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Enterprise Ecosystem — {currentOrg.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Manage your entire company from one unified platform: Finance, Human Resources, Attendance, Hiring, Payroll, and Customer Marketing.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={() => navigate('home')}
              variant="primary"
              size="md"
              icon={<ArrowUpRight className="w-4 h-4" />}
            >
              Executive Workspace
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 font-medium block text-[10px] uppercase">Active Workspace</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
              <span>{currentOrg.logo}</span> {currentOrg.name}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 font-medium block text-[10px] uppercase">Total Workforce</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 mt-0.5 block">{employees.length} Employees</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 font-medium block text-[10px] uppercase">Monthly Revenue</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">${totalRevenue.toLocaleString()} USD</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 font-medium block text-[10px] uppercase">System Security</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> SOC2 & GDPR Compliant
            </span>
          </div>
        </div>
      </div>

      {/* CATEGORY 1: FINANCE APPLICATIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Finance Applications</h2>
              <p className="text-xs text-slate-500">Invoicing, general ledger, expense OCR, e-signature, equity & ESG.</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold">
            6 MODULES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {financeApps.map(renderAppCard)}
        </div>
      </div>

      {/* CATEGORY 2: HUMAN RESOURCES APPLICATIONS */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Human Resources Applications</h2>
              <p className="text-xs text-slate-500">Directory, live clock-in attendance, ATS hiring pipeline, leave, performance & payroll.</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold">
            7 MODULES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hrApps.map(renderAppCard)}
        </div>
      </div>

      {/* CATEGORY 3: MARKETING APPLICATIONS */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Marketing Applications</h2>
              <p className="text-xs text-slate-500">Email campaigns, SMS marketing, CSAT surveys & multi-platform social media scheduler.</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold">
            4 MODULES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {marketingApps.map(renderAppCard)}
        </div>
      </div>
    </div>
  );
};
