import React, { useId, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { billingService } from '../services/billingService';
import { getDisplayedPlanTotal, getPricingPlan, isPaddleSandbox, PRICING_PLANS, type BillingCycle, type PlanKey } from '../config/pricingConfig';
import { openPaddleCheckout } from '../services/paddle';

type PlanName = 'One App Free' | 'Standard' | 'Custom';

interface Plan {
  name: PlanName;
  description: string;
  monthly: string;
  yearly: string;
  popular?: boolean;
  cta: string;
  features: string[];
}

const plans: Plan[] = [
  {
    name: 'One App Free',
    description: 'A complete starting point for one business workflow with unlimited team members.',
    monthly: String(PRICING_PLANS[0].monthlyPerSeat),
    yearly: String(PRICING_PLANS[0].yearlyPerSeat),
    cta: 'Start Free',
    features: ['One app of your choice', 'Unlimited workspace users', 'NextAura Cloud hosting', 'Standard community support'],
  },
  {
    name: 'Standard',
    description: 'Every core app for growing teams running their entire company operations in one place.',
    monthly: String(PRICING_PLANS[1].monthlyPerSeat),
    yearly: String(PRICING_PLANS[1].yearlyPerSeat),
    popular: true,
    cta: 'Get Standard',
    features: ['All business apps included', 'NextAura Cloud hosting', 'All core business modules', 'Priority email support', 'Unified analytics & approvals'],
  },
  {
    name: 'Custom',
    description: 'Flexible operations and full platform access for complex organizations and custom workflows.',
    monthly: String(PRICING_PLANS[2].monthlyPerSeat),
    yearly: String(PRICING_PLANS[2].yearlyPerSeat),
    cta: 'Upgrade to Custom',
    features: ['All business apps included', 'NextAura Cloud hosting', 'Advanced customization', 'Multi-company tenancy', 'Full Developer REST API', 'Advanced automations & webhooks', 'Dedicated account manager'],
  },
];

interface PricingContentProps {
  isPublic?: boolean;
  onOpenWorkspace: () => void;
  onChooseServices: () => void;
}

const PricingContent: React.FC<PricingContentProps & { organizationId?: string; customerEmail?: string }> = ({
  isPublic = false,
  onOpenWorkspace,
  onChooseServices,
  organizationId,
  customerEmail,
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);
  const [seatCount, setSeatCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const billingToggleId = useId();

  const selectedPlanData = selectedPlan
    ? getPricingPlan(selectedPlan === 'One App Free' ? 'one_app_free' : (selectedPlan.toLowerCase() as PlanKey))
    : null;
  const totalDue = selectedPlanData ? getDisplayedPlanTotal(selectedPlanData, billingCycle, seatCount) : 0;

  const choosePlan = (plan: Plan) => {
    setSelectedPlan(plan.name);
    requestAnimationFrame(() =>
      document.getElementById('plan-next-step')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
  };

  const completeSelection = async () => {
    if (!selectedPlan || !organizationId) return onOpenWorkspace();
    const key = selectedPlan === 'One App Free' ? 'one_app_free' : (selectedPlan.toLowerCase() as PlanKey);
    setBusy(true);
    setError('');
    try {
      if (key === 'one_app_free') {
        await billingService.activateFreePlan(organizationId, seatCount);
        onChooseServices();
      } else {
        const result = await billingService.preparePaddleCheckout(organizationId, key, billingCycle, seatCount);
        await openPaddleCheckout({
          priceId: result.priceId,
          quantity: seatCount,
          customerEmail,
          customData: result.customData,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Unable to start billing.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] pb-16">
      {/* Header */}
      <header className="mx-auto max-w-3xl pb-10 text-center sm:pb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#7568E8]/30 bg-[#7568E8]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#A499FA]">
          <Sparkles className="h-3.5 w-3.5 text-[#7568E8]" />
          <span>Simple, Transparent Pricing</span>
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F4F6FF] sm:text-5xl font-heading">
          Choose how your team works
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#A3ABC5]">
          Start with one free app or bring every NextAura workflow together. Pricing is calculated per seat, per month.
        </p>

        {/* Billing cycle toggle */}
        <div className="mt-8 flex flex-col items-center gap-2.5" role="group" aria-label="Billing cycle">
          <div className="flex items-center justify-center gap-3.5">
            <span
              className={`text-xs transition-colors cursor-pointer ${
                billingCycle === 'monthly' ? 'font-semibold text-[#F4F6FF]' : 'font-medium text-[#747E9B]'
              }`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly Billing
            </span>
            <input
              id={billingToggleId}
              type="checkbox"
              checked={billingCycle === 'yearly'}
              onChange={(e) => setBillingCycle(e.currentTarget.checked ? 'yearly' : 'monthly')}
              className="peer sr-only"
              aria-label="Bill yearly instead of monthly"
              aria-controls="pricing-plans"
            />
            <label
              htmlFor={billingToggleId}
              className="relative inline-flex h-8 w-16 cursor-pointer items-center rounded-full bg-[#101426] p-1 border border-[#1F253D] shadow-inner transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#7568E8]"
            >
              <span
                className={`h-6 w-6 rounded-full bg-[#7568E8] shadow-[0_0_10px_rgba(117,104,232,0.5)] transition-transform duration-200 ease-out ${
                  billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-0'
                }`}
              />
            </label>
            <span
              className={`text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'yearly' ? 'font-semibold text-[#23C99C]' : 'font-medium text-[#747E9B]'
              }`}
              onClick={() => setBillingCycle('yearly')}
            >
              <span>Annual Billing</span>
              <span className="rounded-full bg-[#08B894]/15 border border-[#08B894]/30 px-2 py-0.5 text-[10px] font-bold text-[#23C99C]">
                Save up to 21%
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* Pricing cards grid */}
      <section id="pricing-plans" className="mt-4 grid grid-cols-1 gap-6 sm:mt-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = billingCycle === 'yearly' ? plan.yearly : plan.monthly;
          const isSelected = selectedPlan === plan.name;
          const isPopular = plan.popular;

          return (
            <article
              key={plan.name}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 p-7 sm:p-8 ${
                isPopular
                  ? 'border-[#7568E8] bg-[#161B30] shadow-[0_0_25px_rgba(117,104,232,0.2)] lg:-translate-y-2'
                  : 'border-[#1F253D] bg-[#161B30] hover:border-[#2D3555] hover:shadow-lg'
              } ${isSelected ? 'ring-2 ring-[#7568E8]' : ''}`}
            >
              {isPopular && (
                <div className="absolute right-6 top-6 rounded-full bg-[#7568E8]/20 border border-[#7568E8]/40 px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-[#A499FA]">
                  Most Popular
                </div>
              )}

              <div>
                {/* Title & Desc */}
                <div className="border-b border-[#1F253D] pb-6">
                  <h2 className="text-xl font-bold tracking-tight text-[#F4F6FF] font-heading">{plan.name}</h2>
                  <p className="mt-2.5 text-xs leading-relaxed text-[#A3ABC5] min-h-[36px]">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="border-b border-[#1F253D] py-6" aria-live="polite">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold tracking-tight text-[#F4F6FF] tabular-nums font-heading">
                      ${price}
                    </span>
                    <span className="text-xs text-[#747E9B]">
                      / user <br />
                      / month
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-[#747E9B]">
                    {billingCycle === 'yearly' && plan.name !== 'One App Free'
                      ? 'Billed annually'
                      : plan.name === 'One App Free'
                      ? 'Free forever'
                      : 'Billed monthly'}
                  </p>
                </div>

                {/* Features List */}
                <ul className="space-y-3.5 py-6" aria-label={`${plan.name} features`}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-xs text-[#A3ABC5]">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#08B894]/15 text-[#23C99C]">
                        <Check className="h-3 w-3" strokeWidth={2.8} aria-hidden="true" />
                      </span>
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => choosePlan(plan)}
                  className={`w-full cursor-pointer rounded-xl px-5 py-3 text-xs font-bold tracking-wide transition-all duration-200 active:scale-[.99] flex items-center justify-center gap-2 ${
                    isPopular
                      ? 'bg-[#7568E8] hover:bg-[#867AF0] text-white shadow-[0_0_12px_rgba(117,104,232,0.35)]'
                      : 'bg-[#101426] hover:bg-[#1A2035] text-[#F4F6FF] border border-[#1F253D] hover:border-[#7568E8]/40'
                  }`}
                >
                  <span>{plan.cta}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                {plan.name !== 'One App Free' && (
                  <button
                    type="button"
                    onClick={() => choosePlan(plan)}
                    className="w-full cursor-pointer rounded-xl px-4 py-2 text-[11px] font-semibold text-[#747E9B] hover:text-[#F4F6FF] hover:bg-[#101426] transition-colors"
                  >
                    Start 14-day free trial
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {/* Selected Plan Next Step Box */}
      {selectedPlan && (
        <section
          id="plan-next-step"
          className="mt-10 rounded-2xl border border-[#7568E8]/40 bg-[#161B30] p-6 sm:p-8 shadow-[0_0_20px_rgba(117,104,232,0.15)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
          aria-live="polite"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#7568E8]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#A499FA] uppercase tracking-wider">
                Selected Plan
              </span>
              <span className="text-base font-bold text-[#F4F6FF] flex items-center gap-1.5 font-heading">
                <Sparkles className="h-4 w-4 text-[#7568E8]" aria-hidden="true" />
                {selectedPlan}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#A3ABC5] max-w-xl">
              {selectedPlan === 'One App Free'
                ? 'Activate one free workflow application for your entire workspace. You can upgrade anytime.'
                : 'Enterprise checkout securely handled by Paddle. Seats and billing can be adjusted dynamically in workspace settings.'}
            </p>

            {!isPublic && selectedPlan !== 'One App Free' && (
              <div className="mt-4 flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-[#A3ABC5]">
                  <span>Team Seats:</span>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={seatCount}
                    onChange={(e) => setSeatCount(Math.max(1, Number(e.target.value) || 1))}
                    className="h-9 w-24 rounded-xl border border-[#2A3048] bg-[#101426] px-3 text-xs font-bold text-[#F4F6FF] focus:border-[#7568E8] focus:outline-none focus:ring-1 focus:ring-[#7568E8]"
                  />
                </label>
                {selectedPlanData && !isPaddleSandbox && (
                  <div className="text-xs font-semibold text-[#F4F6FF]">
                    Estimated {billingCycle === 'yearly' ? 'annual' : 'monthly'} total:{' '}
                    <strong className="text-emerald-400 font-bold tabular-nums">${totalDue.toFixed(2)}</strong>{' '}
                    <span className="text-[11px] font-normal text-[#747E9B]">({seatCount} seats)</span>
                  </div>
                )}
              </div>
            )}
            {!isPublic && error && <p className="mt-2 text-xs text-[#F43F5E]">{error}</p>}
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={completeSelection}
              disabled={busy}
              className="w-full sm:w-auto cursor-pointer rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] px-6 py-3.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedPlan !== 'One App Free' && !isPublic && <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              <span>
                {isPublic
                  ? 'Open NextAura'
                  : busy
                  ? 'Processing...'
                  : selectedPlan === 'One App Free'
                  ? 'Activate Free Plan'
                  : 'Continue to Secure Checkout'}
              </span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </button>
            {selectedPlan !== 'One App Free' && !isPublic && (
              <p className="flex items-center gap-1.5 text-[11px] text-[#747E9B]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#23C99C]" aria-hidden="true" />
                <span>PCI-DSS Level 1 checkout by Paddle</span>
              </p>
            )}
          </div>
        </section>
      )}

      <footer className="mt-12 text-center text-xs text-[#747E9B] space-y-1">
        <p>Paid enterprise plans use Paddle Checkout. Credit card details are never stored on NextAura servers.</p>
        <p>Cancel or modify your subscription at any time directly from Workspace Settings.</p>
      </footer>
    </div>
  );
};

export const PricingPage: React.FC = () => {
  const { navigate, currentOrg, user } = useApp();
  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-4rem)] bg-[#090B1A] px-4 py-8 sm:-mx-6 sm:-my-7 sm:px-6 sm:py-10 xl:-mx-10 xl:-my-9 xl:px-10 text-[#F4F6FF]">
      <PricingContent
        organizationId={currentOrg.id}
        customerEmail={user.email}
        onOpenWorkspace={() => navigate('settings', 'services')}
        onChooseServices={() => navigate('settings', 'services')}
      />
    </div>
  );
};

export const PublicPricingPage: React.FC = () => (
  <div className="min-h-screen bg-[#090B1A] text-[#F4F6FF] antialiased">
    <nav className="border-b border-[#1F253D] bg-[#101426]/80 backdrop-blur-md sticky top-0 z-50" aria-label="Public navigation">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex cursor-pointer items-center gap-2.5 font-bold tracking-tight text-[#F4F6FF] text-base font-heading">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7568E8]/20 border border-[#7568E8]/40 p-1 shadow-[0_0_12px_rgba(117,104,232,0.3)]">
            <img src="/logo.png" alt="NextAura" className="w-full h-full object-contain" />
          </span>
          NextAura OS
        </a>
        <a
          href="/"
          className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#A3ABC5] hover:text-[#F4F6FF] transition-colors rounded-xl px-3.5 py-2 border border-[#1F253D] hover:border-[#7568E8]/40 bg-[#161B30]"
        >
          <span>Open Workspace</span>
          <ExternalLink className="h-3.5 w-3.5 text-[#7568E8]" aria-hidden="true" />
        </a>
      </div>
    </nav>
    <main className="px-4 py-12 sm:px-6 sm:py-16">
      <PricingContent
        isPublic
        onOpenWorkspace={() => {
          window.location.href = '/';
        }}
        onChooseServices={() => {
          window.location.href = '/';
        }}
      />
    </main>
    <footer className="border-t border-[#1F253D] bg-[#101426] px-4 py-8 text-center text-xs text-[#747E9B]">
      <a
        href="/"
        className="inline-flex cursor-pointer items-center gap-2 font-medium transition-colors hover:text-[#F4F6FF]"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        <span>Return to NextAura OS</span>
      </a>
    </footer>
  </div>
);
