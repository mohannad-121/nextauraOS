import React, { useState, useMemo } from 'react';
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
  Globe2,
  Search,
  Sparkles,
  Layers,
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
  badge?: string;
}

const groups: Array<{ id: AppDirectoryItem['category']; title: string; apps: AppDirectoryItem[] }> = [
  {
    id: 'finance',
    title: 'Finance Suite',
    apps: [
      { serviceKey: 'invoicing', id: 'invoicing', title: 'Invoicing & Payments', description: 'Create, track, and reconcile customer invoices, retainers, and incoming wire payments.', icon: CreditCard, category: 'finance', badge: 'Receivables' },
      { serviceKey: 'accounting', id: 'accounting', defaultSubView: 'ledger', title: 'Accounting & GL', description: 'Double-entry general ledger, journal entries, trial balance, and financial statements.', icon: Building2, category: 'finance', badge: 'Ledger' },
      { serviceKey: 'expenses', id: 'expenses', title: 'Expenses & Cards', description: 'Corporate card spending, employee reimbursement claims, and multi-tier approval flows.', icon: CreditCard, category: 'finance', badge: 'Spend' },
      { serviceKey: 'sign', id: 'sign', title: 'Sign (E-Signature)', description: 'Legally compliant electronic signatures, document builder, and audit trail certificates.', icon: FileSignature, category: 'finance', badge: 'Agreements' },
      { serviceKey: 'equity', id: 'equity', defaultSubView: 'cap-table', title: 'Equity & Cap Table', description: 'Shareholder registry, stock options pool, and scenario funding dilution simulations.', icon: PieChart, category: 'finance', badge: 'Ownership' },
      { serviceKey: 'esg', id: 'esg', title: 'ESG & Carbon', description: 'Sustainability audit records, greenhouse gas Scope 1-3 calculations, and compliance.', icon: Leaf, category: 'finance', badge: 'Carbon' },
    ],
  },
  {
    id: 'hr',
    title: 'Human Resources',
    apps: [
      { serviceKey: 'employees', id: 'employees', title: 'Employee Directory', description: 'Personnel directory, profile documents, emergency contacts, and interactive org charts.', icon: Users, category: 'hr', badge: 'Directory' },
      { serviceKey: 'recruitment', id: 'recruitment', defaultSubView: 'kanban', title: 'Recruitment & ATS', description: 'Kanban job applicant pipeline, candidate interview stages, scorecards, and offers.', icon: UserPlus, category: 'hr', badge: 'Hiring' },
      { serviceKey: 'attendance', id: 'attendance', title: 'Attendance & Kiosk', description: 'Live punch-clock terminal, remote work tracking, shift hours, and anomaly alerts.', icon: Clock, category: 'hr', badge: 'Time' },
      { serviceKey: 'time_off', id: 'time-off', defaultSubView: 'requests', title: 'Time Off & Leave', description: 'Paid vacation requests, sick leave allocations, and organizational absence calendar.', icon: Calendar, category: 'hr', badge: 'Leave' },
      { serviceKey: 'appraisals', id: 'appraisals', title: 'Appraisals & OKRs', description: 'Quarterly performance reviews, goal progression, and 360-degree peer feedback cycles.', icon: Award, category: 'hr', badge: 'Performance' },
      { serviceKey: 'fleet', id: 'fleet', title: 'Fleet Operations', description: 'Company vehicles, scheduled maintenance, driver assignments, and fuel tracking.', icon: Car, category: 'hr', badge: 'Assets' },
      { serviceKey: 'payroll', id: 'payroll', defaultSubView: 'runs', title: 'Payroll Processing', description: 'Gross-to-net salary calculations, tax deductions, payslip generation, and GL sync.', icon: Wallet, category: 'hr', badge: 'Compensation' },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing & Outreach',
    apps: [
      { serviceKey: 'email_marketing', id: 'email', title: 'Email Campaigns', description: 'Rich email broadcasts, newsletter templates, audience segments, and delivery metrics.', icon: Mail, category: 'marketing', badge: 'Email' },
      { serviceKey: 'sms_marketing', id: 'sms', title: 'SMS Marketing', description: 'High-throughput SMS broadcasts, transactional triggers, and delivery receipts.', icon: MessageSquare, category: 'marketing', badge: 'SMS' },
      { serviceKey: 'surveys', id: 'surveys', title: 'Surveys & Feedback', description: 'Customer satisfaction forms, NPS questionnaires, and live response analytics.', icon: ClipboardList, category: 'marketing', badge: 'NPS' },
      { serviceKey: 'social_marketing', id: 'social', title: 'Social Scheduling', description: 'Cross-platform editorial calendar for LinkedIn, X, Facebook, and Instagram posts.', icon: Share2, category: 'marketing', badge: 'Social' },
    ],
  },
  {
    id: 'platform',
    title: 'Global Platform Services',
    apps: [
      { id: 'ai', title: 'NextAura AI Employee', description: 'Autonomous agent that drafts documents, generates reports, and executes system tasks.', customIcon: 'ai', category: 'platform', badge: 'Intelligence' },
      { serviceKey: 'contacts', id: 'contacts', title: 'Contacts & CRM', description: 'Unified counterparty database across customers, leads, suppliers, and partners.', icon: Users, category: 'platform', badge: 'CRM' },
      { serviceKey: 'documents', id: 'documents', title: 'Document Vault', description: 'Secure enterprise file storage, full-text index search, and permission policies.', icon: FolderKanban, category: 'platform', badge: 'Vault' },
      { id: 'calendar', title: 'Enterprise Calendar', description: 'Cross-module synchronization of meetings, payroll dates, invoices, and milestones.', icon: Calendar, category: 'platform', badge: 'Schedule' },
      { id: 'approvals', title: 'Central Approvals', description: 'Consolidated executive inbox for pending expense claims, leave, and invoices.', icon: CheckCircle2, category: 'platform', badge: 'Workflow' },
      { serviceKey: 'analytics', id: 'analytics', title: 'Analytics Center', description: 'Deep operational intelligence, cross-module KPI dashboards, and data charts.', icon: BarChart3, category: 'platform', badge: 'Insights' },
      { serviceKey: 'website_builder', id: 'websites', title: 'Website Builder', description: 'Drag-and-drop landing page composer, SEO tags, and custom domain routing.', icon: Globe2, category: 'platform', badge: 'Web' },
    ],
  },
];

export const FinanceLaunchpad: React.FC = () => {
  const { navigate, currentOrg, activeServices } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter groups according to user organization's active services
  const visibleGroups = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      apps: group.apps.filter((app) => !app.serviceKey || activeServices.includes(app.serviceKey)),
    })).filter((group) => group.apps.length > 0);
  }, [activeServices]);

  // Flatten all available apps for searching & filtering
  const allAvailableApps = useMemo(() => {
    return visibleGroups.flatMap((group) => group.apps);
  }, [visibleGroups]);

  // Filter apps based on search & category tab
  const filteredApps = useMemo(() => {
    return allAvailableApps.filter((app) => {
      const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.badge && app.badge.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [allAvailableApps, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allAvailableApps.length };
    for (const app of allAvailableApps) {
      counts[app.category] = (counts[app.category] || 0) + 1;
    }
    return counts;
  }, [allAvailableApps]);

  const categoryBadges: Record<string, { label: string; text: string; bg: string; border: string }> = {
    finance: { label: 'Finance', text: 'text-[#178CFF]', bg: 'bg-[#178CFF]/10', border: 'border-[#178CFF]/25' },
    hr: { label: 'People', text: 'text-[#08B894]', bg: 'bg-[#08B894]/10', border: 'border-[#08B894]/25' },
    marketing: { label: 'Marketing', text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25' },
    platform: { label: 'Platform', text: 'text-[#A499FA]', bg: 'bg-[#7568E8]/10', border: 'border-[#7568E8]/25' },
  };

  return (
    <div className="space-y-8 pb-16 max-w-[1580px] mx-auto">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#131728] via-[#161B30] to-[#101426] border border-[#1F253D] p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        {/* Subtle decorative glow orb */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#7568E8]/15 via-[#178CFF]/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101426] border border-[#2A3048] text-xs font-semibold text-[#7568E8]">
              <Building2 className="w-3.5 h-3.5 text-[#7568E8]" />
              <span className="text-[#F4F6FF]">{currentOrg.name}</span>
              <span className="text-[#6B7694]">·</span>
              <span className="text-[#23C99C] flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#08B894]" />
                {allAvailableApps.length} Active Modules
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F4F6FF] tracking-tight font-heading">
              Application Hub
            </h1>

            <p className="text-sm sm:text-[15px] leading-relaxed text-[#A3ABC5]">
              Seamlessly discover and launch all unified business applications across Finance, HR, Marketing, and Operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="md"
              icon={<Sparkles className="w-4 h-4 text-[#7568E8]" />}
              onClick={() => navigate('ai')}
            >
              Ask NextAura AI
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('settings', 'services')}
            >
              Add Services
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Navigation Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-2 rounded-2xl bg-[#131728] border border-[#1F253D]">
        {/* Category Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          {[
            { id: 'all', label: 'All Modules' },
            { id: 'finance', label: 'Finance' },
            { id: 'hr', label: 'Human Resources' },
            { id: 'marketing', label: 'Marketing' },
            { id: 'platform', label: 'Global Platform' },
          ].map((tab) => {
            const isSelected = selectedCategory === tab.id;
            const count = categoryCounts[tab.id] || 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#7568E8] text-white shadow-[0_0_14px_rgba(117,104,232,0.35)]'
                    : 'text-[#A3ABC5] hover:text-[#F4F6FF] hover:bg-[#1A2035]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#101426] text-[#747E9B]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Real-time Search Box */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-[#747E9B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applications, records..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#101426] border border-[#2A3048] text-xs text-[#F4F6FF] placeholder-[#6B7694] focus:outline-none focus:ring-2 focus:ring-[#7568E8]/30 focus:border-[#7568E8] transition-all"
          />
        </div>
      </div>

      {/* Application Grid */}
      {filteredApps.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-[#131728] border border-[#1F253D] p-8 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#101426] border border-[#2A3048] flex items-center justify-center text-[#747E9B]">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#F4F6FF]">No applications found</h3>
            <p className="text-xs text-[#A3ABC5] mt-1 max-w-sm mx-auto">
              No enabled applications match &ldquo;{searchQuery}&rdquo;. Try another term or reset your category filter.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
          >
            Clear Search Filter
          </Button>
        </div>
      ) : selectedCategory === 'all' && searchQuery.trim() === '' ? (
        /* Categorized Group Sections when viewing all without search */
        <div className="space-y-10">
          {visibleGroups.map((group) => (
            <section key={group.id} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F253D] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7568E8]" />
                  <h2 className="text-base font-bold text-[#F4F6FF] tracking-tight">{group.title}</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#101426] text-[#A3ABC5] border border-[#2A3048]">
                    {group.apps.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.apps.map((app) => {
                  const Icon = app.icon;
                  const customIcon = app.serviceKey
                    ? getServiceCustomIcon(app.category, app.title, app.serviceKey)
                    : undefined;
                  const badgeStyle = categoryBadges[app.category] || categoryBadges.platform;

                  return (
                    <div
                      key={app.id}
                      onClick={() => navigate(app.id, app.defaultSubView || 'overview')}
                      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#161B30] border border-[#1F253D] hover:border-[#7568E8]/50 hover:bg-[#1A2038] hover:shadow-[0_10px_30px_rgba(117,104,232,0.18)] transition-all duration-200 cursor-pointer overflow-hidden min-h-[175px]"
                    >
                      {/* Top Row: Icon Container and Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#101426] border border-[#2A3048] flex items-center justify-center text-[#7568E8] group-hover:border-[#7568E8]/50 group-hover:scale-105 transition-all shadow-sm shrink-0">
                          {app.customIcon === 'ai' ? (
                            <NextAuraAIIcon className="h-8 w-8" />
                          ) : customIcon ? (
                            <img src={customIcon} alt="" className="h-6 w-6 object-contain" />
                          ) : Icon ? (
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          ) : (
                            <Layers className="h-5 w-5" />
                          )}
                        </div>

                        {app.badge && (
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                          >
                            {app.badge}
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div className="mt-3.5 space-y-1">
                        <h3 className="text-sm font-bold text-[#F4F6FF] group-hover:text-white transition-colors">
                          {app.title}
                        </h3>
                        <p className="text-xs text-[#A3ABC5] leading-relaxed line-clamp-2">
                          {app.description}
                        </p>
                      </div>

                      {/* Bottom Launch Link */}
                      <div className="mt-4 pt-3 border-t border-[#1F253D]/80 flex items-center justify-between text-xs font-semibold text-[#7568E8] group-hover:text-[#A499FA]">
                        <span>Launch App</span>
                        <ArrowRight className="w-4 h-4 text-[#747E9B] group-hover:text-[#7568E8] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* Flat Grid when filtered by category or search */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => {
            const Icon = app.icon;
            const customIcon = app.serviceKey
              ? getServiceCustomIcon(app.category, app.title, app.serviceKey)
              : undefined;
            const badgeStyle = categoryBadges[app.category] || categoryBadges.platform;

            return (
              <div
                key={app.id}
                onClick={() => navigate(app.id, app.defaultSubView || 'overview')}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#161B30] border border-[#1F253D] hover:border-[#7568E8]/50 hover:bg-[#1A2038] hover:shadow-[0_10px_30px_rgba(117,104,232,0.18)] transition-all duration-200 cursor-pointer overflow-hidden min-h-[175px]"
              >
                {/* Top Row: Icon Container and Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#101426] border border-[#2A3048] flex items-center justify-center text-[#7568E8] group-hover:border-[#7568E8]/50 group-hover:scale-105 transition-all shadow-sm shrink-0">
                    {app.customIcon === 'ai' ? (
                      <NextAuraAIIcon className="h-8 w-8" />
                    ) : customIcon ? (
                      <img src={customIcon} alt="" className="h-6 w-6 object-contain" />
                    ) : Icon ? (
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Layers className="h-5 w-5" />
                    )}
                  </div>

                  {app.badge && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                    >
                      {app.badge}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div className="mt-3.5 space-y-1">
                  <h3 className="text-sm font-bold text-[#F4F6FF] group-hover:text-white transition-colors">
                    {app.title}
                  </h3>
                  <p className="text-xs text-[#A3ABC5] leading-relaxed line-clamp-2">
                    {app.description}
                  </p>
                </div>

                {/* Bottom Launch Link */}
                <div className="mt-4 pt-3 border-t border-[#1F253D]/80 flex items-center justify-between text-xs font-semibold text-[#7568E8] group-hover:text-[#A499FA]">
                  <span>Launch App</span>
                  <ArrowRight className="w-4 h-4 text-[#747E9B] group-hover:text-[#7568E8] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
