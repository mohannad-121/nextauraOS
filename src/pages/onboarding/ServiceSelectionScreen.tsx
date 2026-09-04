import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  CreditCard,
  Users,
  Share2,
  Globe,
  Sparkles,
} from 'lucide-react';
import { NEXTAURA_SERVICES } from '../../data/appRegistry';
import type { NextAuraServiceDefinition } from '../../data/appRegistry';
import { entitlementService } from '../../services/entitlementService';

interface ServiceSelectionScreenProps {
  organizationId: string;
  userId: string;
  onCompleted: (selectedServiceKeys: string[]) => void;
  onRetryWorkspace?: () => void;
}

interface CategoryConfig {
  key: string;
  label: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  iconBg: string;
  iconColor: string;
  cardUnselectedBg: string;
  cardUnselectedBorder: string;
  cardSelectedBg: string;
  cardSelectedBorder: string;
  checkBg: string;
  pillBadge: string;
  accentColor: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'finance',
    label: 'FINANCE',
    title: 'Finance & Operations',
    description: 'Manage billing, accounting, expenses, e-signatures, equity, and carbon reporting.',
    icon: CreditCard,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-100/80',
    iconColor: 'text-blue-600',
    cardUnselectedBg: 'bg-white hover:bg-blue-50/30',
    cardUnselectedBorder: 'border-slate-200/90 hover:border-blue-300',
    cardSelectedBg: 'bg-blue-50/90',
    cardSelectedBorder: 'border-blue-600 ring-2 ring-blue-500/20 shadow-md shadow-blue-500/10',
    checkBg: 'bg-blue-600 text-white',
    pillBadge: 'bg-blue-100 text-blue-700 font-extrabold',
    accentColor: 'blue',
  },
  {
    key: 'hr',
    label: 'HUMAN RESOURCES',
    title: 'Human Resources & Talent',
    description: 'Empower workforce management, recruitment, time tracking, OKRs, fleet, and payroll.',
    icon: Users,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-100/80',
    iconColor: 'text-purple-600',
    cardUnselectedBg: 'bg-white hover:bg-purple-50/30',
    cardUnselectedBorder: 'border-slate-200/90 hover:border-purple-300',
    cardSelectedBg: 'bg-purple-50/90',
    cardSelectedBorder: 'border-purple-600 ring-2 ring-purple-500/20 shadow-md shadow-purple-500/10',
    checkBg: 'bg-purple-600 text-white',
    pillBadge: 'bg-purple-100 text-purple-700 font-extrabold',
    accentColor: 'purple',
  },
  {
    key: 'marketing',
    label: 'MARKETING',
    title: 'Marketing & Audience Growth',
    description: 'Drive growth with email campaigns, SMS broadcasts, CSAT surveys, and social scheduling.',
    icon: Share2,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-100/80',
    iconColor: 'text-amber-700',
    cardUnselectedBg: 'bg-white hover:bg-amber-50/30',
    cardUnselectedBorder: 'border-slate-200/90 hover:border-amber-300',
    cardSelectedBg: 'bg-amber-50/90',
    cardSelectedBorder: 'border-amber-600 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/10',
    checkBg: 'bg-amber-600 text-white',
    pillBadge: 'bg-amber-100 text-amber-800 font-extrabold',
    accentColor: 'amber',
  },
  {
    key: 'global',
    label: 'GLOBAL PLATFORM',
    title: 'Global Core Platform',
    description: 'Unified customer CRM directory, enterprise document vault, and executive analytics.',
    icon: Globe,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-100/80',
    iconColor: 'text-emerald-600',
    cardUnselectedBg: 'bg-white hover:bg-emerald-50/30',
    cardUnselectedBorder: 'border-slate-200/90 hover:border-emerald-300',
    cardSelectedBg: 'bg-emerald-50/90',
    cardSelectedBorder: 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10',
    checkBg: 'bg-emerald-600 text-white',
    pillBadge: 'bg-emerald-100 text-emerald-700 font-extrabold',
    accentColor: 'emerald',
  },
];

export const ServiceSelectionScreen: React.FC<ServiceSelectionScreenProps> = ({
  organizationId,
  userId,
  onCompleted,
  onRetryWorkspace,
}) => {
  // CRITICAL: Must start empty [] (No pre-selected services)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Audit and deduplicate services by key
  const deduplicatedServices = useMemo(() => {
    const map = new Map<string, NextAuraServiceDefinition>();
    NEXTAURA_SERVICES.forEach((service) => {
      if (!map.has(service.key)) {
        map.set(service.key, service);
      }
    });
    return Array.from(map.values());
  }, []);

  // CRITICAL: Invariant check for missing organization ID
  if (!organizationId) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-5 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Workspace Setup Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your workspace organization could not be initialized or retrieved. Please try setting up your workspace again.
          </p>
          {onRetryWorkspace && (
            <button
              type="button"
              onClick={onRetryWorkspace}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Workspace Setup</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const toggleService = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleSelectAllCategory = (categoryServices: NextAuraServiceDefinition[]) => {
    const catKeys = categoryServices.map((s) => s.key);
    const allSelected = catKeys.every((k) => selectedKeys.includes(k));

    if (allSelected) {
      setSelectedKeys((prev) => prev.filter((k) => !catKeys.includes(k)));
    } else {
      setSelectedKeys((prev) => Array.from(new Set([...prev, ...catKeys])));
    }
  };

  const handleActivateServices = async () => {
    if (selectedKeys.length === 0) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Activate selected services in database
      await entitlementService.activateOrganizationServices(organizationId, selectedKeys);

      // 2. Mark initial service selection completed in profile
      await entitlementService.completeUserOnboarding(userId);

      // CRITICAL: Only transition to dashboard AFTER confirmed database persistence!
      onCompleted(selectedKeys);
    } catch (err: any) {
      console.error('[ServiceSelection] Service activation failed:', err);
      setErrorMsg(err.message || 'Failed to activate selected applications. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 relative font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Decorative Ambient Soft Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:28px_28px] opacity-30" />
      </div>

      {/* Header Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-6 sm:px-10 py-4 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Welcome Header */}
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center font-black text-cyan-400 text-xl font-heading">
                N
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
                  Welcome to Next<span className="text-blue-600">Aura</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                  <Sparkles className="w-3 h-3 text-blue-600" /> Enterprise SaaS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Choose the applications your team needs. You can add more services later.
              </p>
            </div>
          </div>

          {/* Right Controls: Search + Selected Counter */}
          <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-end">
            {/* Search Box */}
            <div className="relative w-full max-w-xs">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100/80 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Selected Count Badge */}
            <div className="px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-xs shrink-0 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>{selectedKeys.length} selected</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-8 relative z-10 space-y-10">

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-3 shadow-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Categories & Service Cards Grid */}
        {CATEGORIES.map((cat) => {
          const CategoryIcon = cat.icon;

          // Filter services for current category with guaranteed deduplication
          const categoryServices = deduplicatedServices.filter((s) => s.category === cat.key);
          
          if (categoryServices.length === 0) return null;

          // Apply search filter if query entered
          const filteredServices = categoryServices.filter(
            (s) =>
              s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.description.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (filteredServices.length === 0) return null;

          const allCatSelected = filteredServices.every((s) => selectedKeys.includes(s.key));

          return (
            <section key={cat.key} className="space-y-4">
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cat.iconBg} ${cat.iconColor} shadow-sm border border-slate-200/50`}>
                    <CategoryIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-extrabold font-mono tracking-wider px-2 py-0.5 rounded-md border ${cat.badgeClass}`}>
                        {cat.label}
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        {cat.title}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cat.description}
                    </p>
                  </div>
                </div>

                {/* Optional "Select all in category" button */}
                <button
                  type="button"
                  onClick={() => toggleSelectAllCategory(filteredServices)}
                  className="self-start sm:self-auto text-xs font-bold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 transition-colors flex items-center gap-1.5"
                >
                  <Check className={`w-3.5 h-3.5 ${allCatSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{allCatSelected ? 'Deselect category' : `Select all in ${cat.title.split(' ')[0]}`}</span>
                </button>
              </div>

              {/* Service Cards Grid (Desktop 3, Tablet 2, Mobile 1) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredServices.map((service) => {
                  const Icon = service.icon;
                  const isSelected = selectedKeys.includes(service.key);

                  return (
                    <div
                      key={service.key}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => toggleService(service.key)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          toggleService(service.key);
                        }
                      }}
                      className={`group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                        isSelected
                          ? `${cat.cardSelectedBg} ${cat.cardSelectedBorder}`
                          : `${cat.cardUnselectedBg} ${cat.cardUnselectedBorder} hover:shadow-md hover:-translate-y-0.5`
                      }`}
                    >
                      {/* Top Row: Icon + Name + Selection Control */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                              isSelected
                                ? `${cat.iconBg} ${cat.iconColor} shadow-inner`
                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200/80 group-hover:text-slate-900'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 group-hover:text-slate-950">
                              {service.name}
                            </h3>
                            {service.isCore && (
                              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded mt-0.5">
                                Core Included
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Checkmark Badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSelected && (
                            <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full ${cat.pillBadge}`}>
                              Selected
                            </span>
                          )}
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                              isSelected
                                ? cat.checkBg
                                : 'border border-slate-300 bg-white text-transparent group-hover:border-slate-400'
                            }`}
                          >
                            <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Description */}
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {service.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Empty Search Fallback */}
        {searchQuery && deduplicatedServices.every((s) => 
          !s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !s.description.toLowerCase().includes(searchQuery.toLowerCase())
        ) && (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No applications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any services matching "<span className="font-semibold text-slate-700">{searchQuery}</span>". Try clearing your search term.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 underline pt-2"
            >
              Clear search filter
            </button>
          </div>
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 sm:px-10 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Selected Status Text */}
          <div>
            {selectedKeys.length === 0 ? (
              <span className="text-xs sm:text-sm text-slate-500 font-medium">
                Select at least one application to continue.
              </span>
            ) : (
              <span className="text-xs sm:text-sm text-slate-900 font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span>
                  {selectedKeys.length} {selectedKeys.length === 1 ? 'application' : 'applications'} selected
                </span>
              </span>
            )}
          </div>

          {/* Activate Button */}
          <button
            type="button"
            onClick={handleActivateServices}
            disabled={submitting || selectedKeys.length === 0}
            className="px-6 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>{submitting ? 'Activating Services...' : 'Activate Services'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
