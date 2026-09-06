import React, { useState } from 'react';
import {
  Sparkles,
  Building,
  Globe,
  Phone,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NEXTAURA_SERVICES } from '../../data/appRegistry';
import { entitlementService } from '../../services/entitlementService';
import { organizationService } from '../../services/organizationService';
import { Button } from '../../components/common/Button';

export const OnboardingWizard: React.FC = () => {
  const { user, currentOrg, refreshServices, setOnboardingActive, navigate } = useApp();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 2: Company details
  const [companyName, setCompanyName] = useState(currentOrg.name || 'NextAura Enterprise');
  const [industry, setIndustry] = useState('Technology & Software');
  const [companySize, setCompanySize] = useState('11-50 employees');
  const [country, setCountry] = useState('United States');
  const [phone, setPhone] = useState('+1 (415) 890-1234');
  const [website, setWebsite] = useState('https://nextaura.ai');

  // Step 3: Selected services (array of service keys)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([
    'invoicing',
    'accounting',
    'employees',
    'attendance',
  ]);

  const [submitting, setSubmitting] = useState(false);

  const toggleService = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleNext = () => {
    if (step < 5) setStep((s) => (s + 1) as any);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as any);
  };

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    try {
      // 1. Transactionally create workspace organization for this user in PostgreSQL
      const newOrg = await organizationService.createOrganizationForUser(
        companyName || `${user.name.split(' ')[0]}'s Workspace`
      );

      // 2. Instantly activate selected services in database
      await entitlementService.activateOrganizationServices(newOrg.id, selectedKeys);

      // 3. Mark onboarding as completed
      await entitlementService.completeUserOnboarding(user.id);

      if (refreshServices) refreshServices();
      setStep(4);
    } catch (err: any) {
      console.error('Onboarding workspace creation error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const finishOnboarding = () => {
    if (setOnboardingActive) setOnboardingActive(false);
    navigate('launchpad');
  };

  // Group services by category
  const categories = [
    { key: 'finance', label: 'FINANCE' },
    { key: 'hr', label: 'HUMAN RESOURCES' },
    { key: 'marketing', label: 'MARKETING' },
    { key: 'global', label: 'GLOBAL PLATFORM' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Background Soft Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-slate-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col min-h-[640px] relative z-10">
        
        {/* Top Stepper Header */}
        <div className="px-8 py-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 p-0.5 shadow-xs">
              <div className="w-full h-full rounded-[10px] bg-white dark:bg-slate-950 flex items-center justify-center font-bold text-indigo-600 text-base">
                N
              </div>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Next<span className="text-indigo-600 dark:text-indigo-400">Aura</span> Onboarding
            </span>
          </div>

          {/* Step Indicator Pills */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                  s === step
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : s < step
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Wizard Body */}
        <div className="flex-1 p-8 sm:p-10 overflow-y-auto">
          
          {/* STEP 1: WELCOME PAGE */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto text-center space-y-6 py-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto shadow-xs">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Welcome to NextAura, <span className="text-indigo-600 dark:text-indigo-400">{user.name}</span>.
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Build the operating system your business actually needs. Choose the applications you'd like to activate for your enterprise workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                {[
                  { title: 'Modular Access', desc: 'Activate only the modules your organization requires.' },
                  { title: 'Multi-Tenant RLS', desc: 'Dedicated workspace isolation with role-based controls.' },
                  { title: 'Unified Data Model', desc: 'Shared general ledger, workforce directory & calendar.' },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-start space-y-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: COMPANY INFORMATION */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tell us about your company</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure your organization details for billing, tax, and compliance.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Company Name *</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option>Technology & Software</option>
                    <option>Financial Services & Fintech</option>
                    <option>Healthcare & Life Sciences</option>
                    <option>Retail & E-commerce</option>
                    <option>Professional Services & Consulting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option>1-10 employees</option>
                    <option>11-50 employees</option>
                    <option>51-200 employees</option>
                    <option>201-500 employees</option>
                    <option>500+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Country</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Business Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Company Website (Optional)</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SERVICE SELECTION */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Choose your NextAura applications</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select the services you want to activate for your organization.</p>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 font-medium text-xs font-mono">
                  {selectedKeys.length} services selected
                </div>
              </div>

              {/* Service Cards Grouped by Category */}
              <div className="space-y-8">
                {categories.map((cat) => {
                  const catServices = NEXTAURA_SERVICES.filter((s) => s.category === cat.key);
                  if (catServices.length === 0) return null;

                  return (
                    <div key={cat.key} className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                        <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{cat.label}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catServices.map((service) => {
                          const Icon = service.icon;
                          const isSelected = selectedKeys.includes(service.key);

                          return (
                            <div
                              key={service.key}
                              onClick={() => toggleService(service.key)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                                isSelected
                                  ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-500/50 text-slate-900 dark:text-slate-100 shadow-2xs'
                                  : 'bg-slate-50/50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{service.name}</div>
                                </div>

                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-transparent'
                                  }`}
                                >
                                  ✓
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                {service.description}
                              </p>

                              <div className="pt-1 flex items-center justify-between text-[10px] font-mono">
                                <span className="text-slate-400 dark:text-slate-500">Category: {service.categoryLabel}</span>
                                {isSelected && (
                                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">[ Selected ]</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW REQUEST */}
          {step === 4 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Review Service Access Request</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Please verify your requested applications before submitting to NextAura Admin.</p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Organization Name</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{companyName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Requested By</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{user.name} ({user.email})</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Total Applications Requested</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{selectedKeys.length} Services</span>
                </div>

                <div className="pt-2 space-y-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Requested Modules:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedKeys.map((key) => {
                      const service = NEXTAURA_SERVICES.find((s) => s.key === key);
                      return (
                        <div key={key} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs flex items-center gap-2 text-slate-800 dark:text-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="truncate">{service?.name || key}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-3">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Review Process Note</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Your request will be delivered directly to the NextAura Platform Administrator. You will receive an email notification once your workspace applications are activated.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SUBMITTED / WAITING SCREEN */}
          {step === 5 && (
            <div className="max-w-xl mx-auto text-center space-y-6 py-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Status: Pending Review
                </div>

                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Request Received
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your NextAura workspace for <strong>{companyName}</strong> is being reviewed by the platform administration team.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-start space-y-3">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Requested Applications:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedKeys.map((key) => {
                    const service = NEXTAURA_SERVICES.find((s) => s.key === key);
                    return (
                      <div key={key} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                        <span className="truncate">{service?.name || key}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                You'll receive access once your request is approved. An email notification has been dispatched to <strong>{user.email}</strong>.
              </div>

              <Button
                className="w-full py-3"
                onClick={finishOnboarding}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Go to Workspace Dashboard
              </Button>
            </div>
          )}
        </div>

        {/* Footer Navigation CTA */}
        {step < 5 && (
          <div className="px-8 py-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>

            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={step === 3 && selectedKeys.length === 0}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmitRequest}
                isLoading={submitting}
                icon={<CheckCircle2 className="w-4 h-4" />}
                iconPosition="right"
              >
                Submit Request
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
