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
import { getServiceCustomIcon } from '../../utils/serviceIconMapper';

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
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-700',
    cardUnselectedBg: 'bg-white hover:bg-slate-50/80',
    cardUnselectedBorder: 'border-slate-200/80 hover:border-slate-300',
    cardSelectedBg: 'bg-indigo-50/50 dark:bg-slate-800',
    cardSelectedBorder: 'border-blue-600 ring-2 ring-blue-500/20 shadow-xs',
    checkBg: 'bg-blue-700 text-white',
    pillBadge: 'bg-blue-100 text-blue-800 font-semibold',
    accentColor: 'indigo',
  },
  {
    key: 'hr',
    label: 'HUMAN RESOURCES',
    title: 'Human Resources & Talent',
    description: 'Empower workforce management, recruitment, time tracking, OKRs, fleet, and payroll.',
    icon: Users,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-800',
    cardUnselectedBg: 'bg-white hover:bg-slate-50/80',
    cardUnselectedBorder: 'border-slate-200/80 hover:border-slate-300',
    cardSelectedBg: 'bg-amber-50/50 dark:bg-slate-800',
    cardSelectedBorder: 'border-amber-600 ring-2 ring-amber-500/20 shadow-xs',
    checkBg: 'bg-amber-600 text-white',
    pillBadge: 'bg-amber-100 text-amber-800 font-semibold',
    accentColor: 'amber',
  },
  {
    key: 'marketing',
    label: 'MARKETING',
    title: 'Marketing & Audience Growth',
    description: 'Drive growth with email campaigns, SMS broadcasts, CSAT surveys, and social scheduling.',
    icon: Share2,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-700',
    cardUnselectedBg: 'bg-white hover:bg-slate-50/80',
    cardUnselectedBorder: 'border-slate-200/80 hover:border-slate-300',
    cardSelectedBg: 'bg-rose-50/50 dark:bg-slate-800',
    cardSelectedBorder: 'border-rose-600 ring-2 ring-rose-500/20 shadow-xs',
    checkBg: 'bg-rose-600 text-white',
    pillBadge: 'bg-rose-100 text-rose-800 font-semibold',
    accentColor: 'rose',
  },
  {
    key: 'global',
    label: 'GLOBAL PLATFORM',
    title: 'Global Core Platform',
    description: 'Unified customer CRM directory, enterprise document vault, and executive analytics.',
    icon: Globe,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-700',
    cardUnselectedBg: 'bg-white hover:bg-slate-50/80',
    cardUnselectedBorder: 'border-slate-200/80 hover:border-slate-300',
    cardSelectedBg: 'bg-emerald-50/50 dark:bg-slate-800',
    cardSelectedBorder: 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs',
    checkBg: 'bg-emerald-600 text-white',
    pillBadge: 'bg-emerald-100 text-emerald-800 font-semibold',
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
      <div className="min-h-screen w-full bg-[#F8F9FA] dark:bg-slate-950 text-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center space-y-5 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Workspace Setup Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your workspace organization could not be initialized or retrieved. Please try setting up your workspace again.
          </p>
          {onRetryWorkspace && (
            <button
              type="button"
              onClick={onRetryWorkspace}
              className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
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
    <div className="min-h-screen w-full bg-[#F8F9FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative font-sans flex flex-col">
      {/* Header Bar */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 px-6 sm:px-10 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Welcome Header */}
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black text-lg shadow-xs shrink-0 font-heading">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 font-heading tracking-tight">
                  Welcome to NextAura
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium">
                  <Sparkles className="w-3 h-3 text-blue-600" /> Enterprise Operating System
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select the applications your organization requires today. Additional services can be enabled anytime.
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
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
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
            <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 text-blue-700 font-medium text-xs shrink-0 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>{selectedKeys.length} selected</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-8 relative z-10 space-y-8">

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="font-medium">{errorMsg}</span>
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
            <section key={cat.key} className="space-y-3.5">
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cat.iconBg} ${cat.iconColor} border border-slate-200/60 dark:border-slate-700`}>
                    <CategoryIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded border ${cat.badgeClass}`}>
                        {cat.label}
                      </span>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">
                        {cat.title}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Optional "Select all in category" button */}
                <button
                  type="button"
                  onClick={() => toggleSelectAllCategory(filteredServices)}
                  className="self-start sm:self-auto text-xs font-medium text-slate-500 hover:text-blue-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                >
                  <Check className={`w-3.5 h-3.5 ${allCatSelected ? 'text-blue-700' : 'text-slate-400'}`} />
                  <span>{allCatSelected ? 'Deselect category' : `Select all ${cat.title.split(' ')[0]}`}</span>
                </button>
              </div>

              {/* Service Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((service) => {
                  const Icon = service.icon;
                  const customIcon = getServiceCustomIcon(service.category, service.name, service.key);
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
                      className={`group relative p-4.5 rounded-2xl border transition-all duration-180 cursor-pointer flex flex-col justify-between space-y-3 select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        isSelected
                          ? `${cat.cardSelectedBg} ${cat.cardSelectedBorder}`
                          : `${cat.cardUnselectedBg} ${cat.cardUnselectedBorder} shadow-xs`
                      }`}
                    >
                      {/* Top Row: Icon + Name + Selection Control */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                              isSelected
                                ? `${cat.iconBg} ${cat.iconColor}`
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {customIcon ? (
                              <img
                                src={customIcon}
                                alt={`${service.name} icon`}
                                className="w-5 h-5 object-contain select-none pointer-events-none"
                              />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                              {service.name}
                            </h3>
                            {service.isCore && (
                              <span className="inline-block text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-0.5">
                                Core Included
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Checkmark Badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSelected && (
                            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cat.pillBadge}`}>
                              Selected
                            </span>
                          )}
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                              isSelected
                                ? cat.checkBg
                                : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent'
                            }`}
                          >
                            <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Description */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
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
          <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No applications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any services matching "<span className="font-semibold text-slate-700 dark:text-slate-300">{searchQuery}</span>". Try clearing your search term.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-blue-700 hover:underline pt-1"
            >
              Clear search filter
            </button>
          </div>
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      <footer className="sticky bottom-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-6 sm:px-10 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Selected Status Text */}
          <div>
            {selectedKeys.length === 0 ? (
              <span className="text-xs sm:text-sm text-slate-500 font-medium">
                Select at least one application to continue.
              </span>
            ) : (
              <span className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
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
            className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>{submitting ? 'Activating Services...' : 'Activate Services'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
