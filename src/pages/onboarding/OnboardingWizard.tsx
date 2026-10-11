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
    <div className="min-h-screen bg-[#090B1A] text-[#F4F6FF] flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Background Soft Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#7568E8]/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-[#178CFF]/8 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-[#161B30] border border-[#1F253D] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col min-h-[640px] relative z-10">
        
        {/* Top Stepper Header */}
        <div className="px-8 py-5 border-b border-[#1F253D] bg-[#101426] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7568E8]/20 border border-[#7568E8]/40 flex items-center justify-center font-black text-[#F4F6FF] text-base shadow-[0_0_12px_rgba(117,104,232,0.3)]">
              N
            </div>
            <span className="font-bold text-[#F4F6FF] text-base font-heading">
              Next<span className="text-[#7568E8]">Aura</span> Onboarding
            </span>
          </div>

          {/* Step Indicator Pills */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                  s === step
                    ? 'bg-[#7568E8] text-white shadow-[0_0_10px_rgba(117,104,232,0.4)]'
                    : s < step
                    ? 'bg-[#08B894]/15 text-[#23C99C] border border-[#08B894]/30'
                    : 'bg-[#101426] text-[#6B7694] border border-[#1F253D]'
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
              <div className="w-16 h-16 rounded-2xl bg-[#7568E8]/15 border border-[#7568E8]/30 flex items-center justify-center text-[#A499FA] mx-auto shadow-[0_0_15px_rgba(117,104,232,0.3)]">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold text-[#F4F6FF] font-heading leading-tight">
                  Welcome to NextAura, <span className="text-[#A499FA]">{user.name}</span>.
                </h1>
                <p className="text-xs sm:text-sm text-[#A3ABC5] max-w-lg mx-auto leading-relaxed">
                  Build the operating system your business actually needs. Choose the applications you'd like to activate for your enterprise workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                {[
                  { title: 'Modular Access', desc: 'Activate only the modules your organization requires.' },
                  { title: 'Multi-Tenant RLS', desc: 'Dedicated workspace isolation with role-based controls.' },
                  { title: 'Unified Data Model', desc: 'Shared general ledger, workforce directory & calendar.' },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-[#101426] border border-[#1F253D] text-start space-y-2">
                    <CheckCircle2 className="w-5 h-5 text-[#23C99C]" />
                    <div className="text-xs font-semibold text-[#F4F6FF]">{item.title}</div>
                    <div className="text-[11px] text-[#A3ABC5] leading-normal">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: COMPANY INFORMATION */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-2xl font-bold text-[#F4F6FF] font-heading">Tell us about your company</h2>
                <p className="text-xs text-[#A3ABC5] mt-1">Configure your organization details for billing, tax, and compliance.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#A3ABC5] font-medium mb-1.5">Company Name *</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-[#747E9B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101426] border border-[#2A3048] text-[#F4F6FF] focus:border-[#7568E8] focus:outline-none focus:ring-1 focus:ring-[#7568E8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#A3ABC5] font-medium mb-1.5">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#101426] border border-[#2A3048] text-[#F4F6FF] focus:border-[#7568E8] focus:outline-none focus:ring-1 focus:ring-[#7568E8]"
                  >
                    <option>Technology & Software</option>
                    <option>Financial Services & Fintech</option>
                    <option>Healthcare & Life Sciences</option>
                    <option>Retail & E-commerce</option>
                    <option>Professional Services & Consulting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A3ABC5] font-medium mb-1.5">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#101426] border border-[#2A3048] text-[#F4F6FF] focus:border-[#7568E8] focus:outline-none focus:ring-1 focus:ring-[#7568E8]"
                  >
                    <option>1-10 employees</option>
                    <option>11-50 employees</option>
                    <option>51-200 employees</option>
                    <option>201-500 employees</option>
                    <option>500+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A3ABC5] font-medium mb-1.5">Country</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-[#747E9B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101426] border border-[#2A3048] text-[#F4F6FF] focus:border-[#7568E8] focus:outline-none focus:ring-1 focus:ring-[#7568E8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#A3ABC5] font-medium mb-1.5">Business Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#747E9B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101426] border border-[#2A3048] text-[#F4F6FF] focus:border-[#7568E8] focus:outline-none focus:ring-1 focus:ring-[#7568E8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#A3ABC5] font-medium mb-1.5">Company Website (Optional)</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#101426] border border-[#2A3048] text-[#F4F6FF] focus:border-[#7568E8] focus:outline-none focus:ring-1 focus:ring-[#7568E8]"
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
                  <h2 className="text-2xl font-bold text-[#F4F6FF] font-heading">Choose your NextAura applications</h2>
                  <p className="text-xs text-[#A3ABC5] mt-1">Select the services you want to activate for your organization.</p>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-[#7568E8]/15 border border-[#7568E8]/30 text-[#A499FA] font-semibold text-xs font-mono">
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
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-[#747E9B] uppercase">
                        <Layers className="w-3.5 h-3.5 text-[#7568E8]" />
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
                                  ? 'bg-[#7568E8]/15 border-[#7568E8] text-[#F4F6FF] shadow-[0_0_15px_rgba(117,104,232,0.2)]'
                                  : 'bg-[#101426] border-[#1F253D] hover:border-[#2D3555] text-[#A3ABC5]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-[#7568E8] text-white shadow-[0_0_10px_rgba(117,104,232,0.4)]'
                                        : 'bg-[#161B30] text-[#747E9B] border border-[#1F253D]'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="font-semibold text-xs text-[#F4F6FF]">{service.name}</div>
                                </div>

                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                                    isSelected
                                      ? 'bg-[#7568E8] text-white'
                                      : 'bg-[#161B30] border border-[#2A3048] text-transparent'
                                  }`}
                                >
                                  ✓
                                </div>
                              </div>

                              <p className="text-[11px] text-[#A3ABC5] leading-relaxed">
                                {service.description}
                              </p>

                              <div className="pt-1 flex items-center justify-between text-[10px] font-mono">
                                <span className="text-[#747E9B]">Category: {service.categoryLabel}</span>
                                {isSelected && (
                                  <span className="text-[#23C99C] font-semibold uppercase tracking-wider">[ Selected ]</span>
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
                <h2 className="text-2xl font-bold text-[#F4F6FF] font-heading">Review Service Access Request</h2>
                <p className="text-xs text-[#A3ABC5] mt-1">Please verify your requested applications before submitting to NextAura Admin.</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#101426] border border-[#1F253D] space-y-4">
                <div className="flex items-center justify-between border-b border-[#1F253D] pb-3 text-xs">
                  <span className="text-[#747E9B]">Organization Name</span>
                  <span className="font-semibold text-[#F4F6FF]">{companyName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#1F253D] pb-3 text-xs">
                  <span className="text-[#747E9B]">Requested By</span>
                  <span className="font-semibold text-[#F4F6FF]">{user.name} ({user.email})</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#1F253D] pb-3 text-xs">
                  <span className="text-[#747E9B]">Total Applications Requested</span>
                  <span className="font-bold text-[#A499FA] font-mono">{selectedKeys.length} Services</span>
                </div>

                <div className="pt-2 space-y-2">
                  <span className="text-xs font-semibold text-[#F4F6FF]">Requested Modules:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedKeys.map((key) => {
                      const service = NEXTAURA_SERVICES.find((s) => s.key === key);
                      return (
                        <div key={key} className="p-2.5 rounded-xl bg-[#161B30] border border-[#1F253D] text-xs flex items-center gap-2 text-[#F4F6FF]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#23C99C] shrink-0" />
                          <span className="truncate">{service?.name || key}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#7568E8]/10 border border-[#7568E8]/30 text-xs text-[#F4F6FF] flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#7568E8] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[#F4F6FF]">Review Process Note</div>
                  <div className="text-[11px] text-[#A3ABC5] mt-0.5">
                    Your request will be delivered directly to the NextAura Platform Administrator. You will receive an email notification once your workspace applications are activated.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SUBMITTED / WAITING SCREEN */}
          {step === 5 && (
            <div className="max-w-xl mx-auto text-center space-y-6 py-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-[#08B894]/15 border border-[#08B894]/30 flex items-center justify-center text-[#23C99C] mx-auto shadow-[0_0_15px_rgba(35,201,156,0.3)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Status: Pending Review</span>
                </div>

                <h2 className="text-3xl font-bold text-[#F4F6FF] font-heading">
                  Request Received
                </h2>
                <p className="text-xs text-[#A3ABC5] leading-relaxed">
                  Your NextAura workspace for <strong>{companyName}</strong> is being reviewed by the platform administration team.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#101426] border border-[#1F253D] text-start space-y-3">
                <div className="text-xs font-semibold text-[#F4F6FF]">Requested Applications:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedKeys.map((key) => {
                    const service = NEXTAURA_SERVICES.find((s) => s.key === key);
                    return (
                      <div key={key} className="flex items-center gap-2 text-[#A3ABC5]">
                        <span className="text-[#23C99C]">✓</span>
                        <span className="truncate">{service?.name || key}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#161B30] border border-[#1F253D] text-xs text-[#A3ABC5]">
                You'll receive access once your request is approved. An email notification has been dispatched to <strong className="text-[#F4F6FF]">{user.email}</strong>.
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
          <div className="px-8 py-5 border-t border-[#1F253D] bg-[#101426] flex items-center justify-between">
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
