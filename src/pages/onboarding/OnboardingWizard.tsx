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
import { emailService } from '../../services/emailService';
import { organizationService } from '../../services/organizationService';

export const OnboardingWizard: React.FC = () => {
  const { user, currentOrg, setOnboardingActive, navigate } = useApp();
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
      // 1. Create dedicated workspace organization for this user in PostgreSQL
      const newOrg = await organizationService.createOrganizationForUser(
        user.id,
        companyName || `${user.name.split(' ')[0]}'s Company`,
        { industry, country }
      );

      // 2. Submit service request to database for the new organization
      await entitlementService.submitServiceRequest(
        newOrg.id,
        user.id,
        selectedKeys,
        `Initial onboarding service request for ${companyName}`
      );

      // 2. Mark onboarding as completed
      await entitlementService.completeUserOnboarding(user.id);

      // 3. Send email notification to Admin (mabuayyash33@gmail.com) via Resend email service
      const selectedNames = selectedKeys
        .map((k) => NEXTAURA_SERVICES.find((s) => s.key === k)?.name || k);

      await emailService.notifyAdminNewServiceRequest({
        userName: user.name,
        userEmail: user.email,
        companyName,
        requestedServices: selectedNames,
        requestDate: new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      });

      setStep(5);
    } catch (err) {
      console.error('Onboarding submission error:', err);
      setStep(5);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Background Glow Effects */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col min-h-[640px] relative z-10">
        
        {/* Top Stepper Header */}
        <div className="px-8 py-5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 p-0.5">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-black text-cyan-400 text-base">
                N
              </div>
            </div>
            <span className="font-extrabold text-slate-100 font-heading text-base">
              Next<span className="text-cyan-400">Aura</span> Onboarding
            </span>
          </div>

          {/* Step Indicator Pills */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold font-mono transition-all ${
                  s === step
                    ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20'
                    : s < step
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500'
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
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto shadow-xl shadow-cyan-500/10">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-100 font-heading leading-tight">
                  Welcome to NextAura, <span className="text-cyan-400">{user.name}</span>.
                </h1>
                <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Build the operating system your business actually needs. Choose the applications you'd like to activate for your enterprise workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                {[
                  { title: 'Modular Access', desc: 'Activate only the modules your organization requires.' },
                  { title: 'Multi-Tenant RLS', desc: 'Dedicated workspace isolation with role-based controls.' },
                  { title: 'Unified Data Model', desc: 'Shared general ledger, workforce directory & calendar.' },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-start space-y-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    <div className="text-xs font-bold text-slate-200">{item.title}</div>
                    <div className="text-[11px] text-slate-400 leading-normal">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: COMPANY INFORMATION */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-2xl font-black text-slate-100 font-heading">Tell us about your company</h2>
                <p className="text-xs text-slate-400 mt-1">Configure your organization details for billing, tax, and compliance.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Company Name *</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option>Technology & Software</option>
                    <option>Financial Services & Fintech</option>
                    <option>Healthcare & Life Sciences</option>
                    <option>Retail & E-commerce</option>
                    <option>Professional Services & Consulting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option>1-10 employees</option>
                    <option>11-50 employees</option>
                    <option>51-200 employees</option>
                    <option>201-500 employees</option>
                    <option>500+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Country</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Business Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Company Website (Optional)</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-cyan-500 focus:outline-none"
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
                  <h2 className="text-2xl font-black text-slate-100 font-heading">Choose your NextAura applications</h2>
                  <p className="text-xs text-slate-400 mt-1">Select the services you want to activate for your organization.</p>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs font-mono">
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
                      <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
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
                                  ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/50 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="font-bold text-xs text-slate-100">{service.name}</div>
                                </div>

                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                                    isSelected
                                      ? 'bg-cyan-500 text-slate-950'
                                      : 'bg-slate-900 border border-slate-800 text-transparent'
                                  }`}
                                >
                                  ✓
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {service.description}
                              </p>

                              <div className="pt-1 flex items-center justify-between text-[10px] font-mono">
                                <span className="text-slate-500">Category: {service.categoryLabel}</span>
                                {isSelected && (
                                  <span className="text-cyan-400 font-bold uppercase tracking-wider">[ Selected ]</span>
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
                <h2 className="text-2xl font-black text-slate-100 font-heading">Review Service Access Request</h2>
                <p className="text-xs text-slate-400 mt-1">Please verify your requested applications before submitting to NextAura Admin.</p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
                  <span className="text-slate-400">Organization Name</span>
                  <span className="font-bold text-slate-100">{companyName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
                  <span className="text-slate-400">Requested By</span>
                  <span className="font-bold text-slate-100">{user.name} ({user.email})</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
                  <span className="text-slate-400">Total Applications Requested</span>
                  <span className="font-bold text-cyan-400 font-mono">{selectedKeys.length} Services</span>
                </div>

                <div className="pt-2 space-y-2">
                  <span className="text-xs font-bold text-slate-300">Requested Modules:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedKeys.map((key) => {
                      const service = NEXTAURA_SERVICES.find((s) => s.key === key);
                      return (
                        <div key={key} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/90 text-xs flex items-center gap-2 text-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{service?.name || key}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-start gap-3">
                <Clock className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-100">Review Process Note</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Your request will be delivered directly to the NextAura Platform Administrator. You will receive an email notification once your workspace applications are activated.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SUBMITTED / WAITING SCREEN */}
          {step === 5 && (
            <div className="max-w-xl mx-auto text-center space-y-6 py-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Status: Pending Review
                </div>

                <h2 className="text-3xl font-black text-slate-100 font-heading">
                  Request Received
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your NextAura workspace for <strong>{companyName}</strong> is being reviewed by the platform administration team.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-start space-y-3">
                <div className="text-xs font-bold text-slate-200">Requested Applications:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedKeys.map((key) => {
                    const service = NEXTAURA_SERVICES.find((s) => s.key === key);
                    return (
                      <div key={key} className="flex items-center gap-2 text-slate-300">
                        <span className="text-emerald-400">✓</span>
                        <span className="truncate">{service?.name || key}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                You'll receive access once your request is approved. An email notification has been dispatched to <strong>{user.email}</strong>.
              </div>

              <button
                type="button"
                onClick={finishOnboarding}
                className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                Go to Workspace Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation CTA */}
        {step < 5 && (
          <div className="px-8 py-5 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={step === 3 && selectedKeys.length === 0}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
              >
                <span>{submitting ? 'Submitting Request...' : 'Submit Request'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
