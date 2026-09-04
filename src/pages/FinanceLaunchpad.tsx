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
  const pendingExpensesCount = expenses.filter((e) => e.status === 'Manager Review').length;
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
      accent: 'from-azure-500/20 to-blue-600/10 border-azure-500/30 text-azure-400',
      badge: `${paidInvoicesCount} Paid Invoices`,
      category: 'finance',
    },
    {
      id: 'accounting',
      sub: 'overview',
      title: 'Accounting & Ledger',
      desc: 'General ledger, AI reconciliation & GAAP financial reports.',
      icon: CreditCard,
      accent: 'from-indigo-500/20 to-purple-600/10 border-indigo-500/30 text-indigo-400',
      badge: `${journalEntries.length} Entries`,
      category: 'finance',
    },
    {
      id: 'expenses',
      sub: 'overview',
      title: 'Expenses & Cards',
      desc: 'Receipt OCR scanning, spend policies & virtual cards.',
      icon: CreditCard,
      accent: 'from-rose-500/20 to-pink-600/10 border-rose-500/30 text-rose-400',
      badge: `${pendingExpensesCount} Pending Review`,
      category: 'finance',
    },
    {
      id: 'sign',
      sub: 'overview',
      title: 'Sign (E-Signature)',
      desc: 'Legally binding e-signatures & audit trail certificates.',
      icon: FileSignature,
      accent: 'from-teal-500/20 to-emerald-600/10 border-teal-500/30 text-teal-400',
      badge: `${activeSignDocsCount} Active Docs`,
      category: 'finance',
    },
    {
      id: 'equity',
      sub: 'overview',
      title: 'Equity & Cap Table',
      desc: 'Cap table modeling, option pools & funding dilution.',
      icon: PieChart,
      accent: 'from-amber-500/20 to-orange-600/10 border-amber-500/30 text-amber-400',
      badge: `${shareholders.length} Shareholders`,
      category: 'finance',
    },
    {
      id: 'esg',
      sub: 'overview',
      title: 'ESG & Sustainability',
      desc: 'CSRD readiness scorecard & Scope 1-3 carbon tracking.',
      icon: Leaf,
      accent: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30 text-emerald-400',
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
      accent: 'from-orange-500/20 to-amber-600/10 border-orange-500/30 text-orange-400',
      badge: `${activeEmployeesCount} Active Staff`,
      category: 'hr',
    },
    {
      id: 'attendance',
      sub: 'overview',
      title: 'Attendances & Clock',
      desc: 'Live "Who\'s Working" board, clock-in timer & kiosk mode.',
      icon: Clock,
      accent: 'from-cyan-500/20 to-blue-600/10 border-cyan-500/30 text-cyan-400',
      badge: `${checkedInCount} Checked In`,
      category: 'hr',
    },
    {
      id: 'recruitment',
      sub: 'overview',
      title: 'Recruitment & ATS',
      desc: 'Drag-and-drop candidate Kanban pipeline & offer builder.',
      icon: UserPlus,
      accent: 'from-pink-500/20 to-rose-600/10 border-pink-500/30 text-pink-400',
      badge: `${activeCandidatesCount} Candidates`,
      category: 'hr',
    },
    {
      id: 'time-off',
      sub: 'overview',
      title: 'Time Off & Leave',
      desc: 'Leave allocations, manager approvals & shared team calendar.',
      icon: Calendar,
      accent: 'from-purple-500/20 to-indigo-600/10 border-purple-500/30 text-purple-400',
      badge: `${pendingLeaveCount} Pending Req`,
      category: 'hr',
    },
    {
      id: 'appraisals',
      sub: 'overview',
      title: 'Appraisals & Performance',
      desc: '360° review cycles, OKRs/goals & skills matrix.',
      icon: Award,
      accent: 'from-yellow-500/20 to-amber-600/10 border-yellow-500/30 text-yellow-400',
      badge: `${appraisals.length} Active Reviews`,
      category: 'hr',
    },
    {
      id: 'fleet',
      sub: 'overview',
      title: 'Fleet Management',
      desc: 'Company vehicles, odometer logs & maintenance alerts.',
      icon: Car,
      accent: 'from-blue-500/20 to-cyan-600/10 border-blue-500/30 text-blue-400',
      badge: `${activeVehiclesCount} Active Vehicles`,
      category: 'hr',
    },
    {
      id: 'payroll',
      sub: 'overview',
      title: 'Payroll Processing',
      desc: 'Monthly payroll runs, automated payslips & GL posting.',
      icon: Wallet,
      accent: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30 text-emerald-400',
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
      accent: 'from-rose-500/20 to-red-600/10 border-rose-500/30 text-rose-400',
      badge: emailOpenBadge,
      category: 'marketing',
    },
    {
      id: 'sms',
      sub: 'overview',
      title: 'SMS Marketing',
      desc: 'Broadcast SMS, phone preview & short trackable links.',
      icon: MessageSquare,
      accent: 'from-indigo-500/20 to-purple-600/10 border-indigo-500/30 text-indigo-400',
      badge: smsDeliveryBadge,
      category: 'marketing',
    },
    {
      id: 'surveys',
      sub: 'overview',
      title: 'Surveys & Forms',
      desc: 'Multi-page form builder, NPS scoring & CSAT analytics.',
      icon: ClipboardList,
      accent: 'from-amber-500/20 to-orange-600/10 border-amber-500/30 text-amber-400',
      badge: `${activeSurveysCount} Active Surveys`,
      category: 'marketing',
    },
    {
      id: 'social',
      sub: 'overview',
      title: 'Social Marketing',
      desc: 'Multi-platform social content composer & calendar.',
      icon: Share2,
      accent: 'from-cyan-500/20 to-blue-600/10 border-cyan-500/30 text-cyan-400',
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
        className={`p-6 rounded-3xl bg-slate-900/90 border shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between space-y-4 ${app.accent}`}
      >
        <div className="flex items-start justify-between">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
            {customIcon ? (
              <img
                src={customIcon}
                alt={`${app.title} icon`}
                className="w-6 h-6 object-contain select-none"
              />
            ) : (
              <Icon className="w-6 h-6" />
            )}
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] font-bold font-mono">
            {app.badge}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-100 font-heading">{app.title}</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">{app.desc}</p>
        </div>

        <div className="pt-2 flex items-center justify-between text-xs font-bold">
          <span>Open Application</span>
          <ArrowUpRight className="w-4 h-4 opacity-70" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider border border-cyan-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              NextAura Business Operating System
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-100 font-heading tracking-tight">
              Enterprise Ecosystem — {currentOrg.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed font-sans">
              Manage your entire company from one platform: Finance, Human Resources, Attendance, Hiring, Payroll, and Customer Engagement Marketing.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('home')}
              className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-transform hover:scale-105"
            >
              Executive Overview
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-500 font-medium block text-[10px] uppercase">Active Workspace</span>
            <span className="font-bold text-slate-200 flex items-center gap-1.5 mt-0.5">
              <span>{currentOrg.logo}</span> {currentOrg.name}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-500 font-medium block text-[10px] uppercase">Total Workforce</span>
            <span className="font-bold text-cyan-400 mt-0.5 block">{employees.length} Employees</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-500 font-medium block text-[10px] uppercase">Monthly Revenue</span>
            <span className="font-bold text-emerald-400 mt-0.5 block">${totalRevenue.toLocaleString()} USD</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-500 font-medium block text-[10px] uppercase">System Security</span>
            <span className="font-bold text-indigo-400 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> SOC2 & GDPR Compliant
            </span>
          </div>
        </div>
      </div>

      {/* CATEGORY 1: FINANCE APPLICATIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-azure-500/10 text-azure-400 border border-azure-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 font-heading">Finance Applications</h2>
              <p className="text-xs text-slate-400">Invoicing, general ledger, expense OCR, e-signature, equity & ESG.</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-azure-500/10 text-azure-400 border border-azure-500/20 text-[10px] font-bold">
            6 MODULES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {financeApps.map(renderAppCard)}
        </div>
      </div>

      {/* CATEGORY 2: HUMAN RESOURCES APPLICATIONS */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 font-heading">Human Resources Applications</h2>
              <p className="text-xs text-slate-400">Directory, live clock-in attendance, ATS hiring pipeline, leave, performance & payroll.</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold">
            7 MODULES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hrApps.map(renderAppCard)}
        </div>
      </div>

      {/* CATEGORY 3: MARKETING APPLICATIONS */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 font-heading">Marketing Applications</h2>
              <p className="text-xs text-slate-400">Email campaigns, SMS marketing, CSAT surveys & multi-platform social media scheduler.</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
            4 MODULES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {marketingApps.map(renderAppCard)}
        </div>
      </div>
    </div>
  );
};
