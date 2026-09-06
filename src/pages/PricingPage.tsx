import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { billingService } from '../services/billingService';
import { type BillingCycle, type PlanKey } from '../config/pricingConfig';

type PlanName = 'One App Free' | 'Standard' | 'Custom';

interface Plan {
  name: PlanName;
  description: string;
  monthly: string;
  yearly: string;
  accent: string;
  priceColor: string;
  button: string;
  cta: string;
  features: string[];
}

const plans: Plan[] = [
  {
    name: 'One App Free',
    description: 'A complete starting point for one business workflow.',
    monthly: '0',
    yearly: '0',
    accent: 'border-t-sky-400',
    priceColor: 'text-sky-700',
    button: 'bg-sky-700 hover:bg-sky-800 focus-visible:ring-sky-600',
    cta: 'START NOW',
    features: ['One app', 'Unlimited users', 'NextAura Cloud'],
  },
  {
    name: 'Standard',
    description: 'Every core app for teams running their business in one place.',
    monthly: '7',
    yearly: '5.50',
    accent: 'border-t-rose-400',
    priceColor: 'text-rose-600',
    button: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500',
    cta: 'BUY NOW',
    features: ['All apps', 'NextAura Cloud', 'All core business modules', 'Standard support'],
  },
  {
    name: 'Custom',
    description: 'Flexible operations for complex organizations and integrations.',
    monthly: '10',
    yearly: '8',
    accent: 'border-t-emerald-500',
    priceColor: 'text-emerald-700',
    button: 'bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-600',
    cta: 'BUY NOW',
    features: ['All apps', 'NextAura Cloud', 'Advanced customization', 'Multi-company', 'External API', 'Advanced automation and integrations'],
  },
];

interface PricingContentProps {
  isPublic?: boolean;
  onOpenWorkspace: () => void;
  onChooseServices: () => void;
}

const PricingContent: React.FC<PricingContentProps & { organizationId?: string }> = ({ isPublic = false, onOpenWorkspace, onChooseServices, organizationId }) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);
  const [seatCount, setSeatCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectedPlanData = plans.find((plan) => plan.name === selectedPlan);
  const monthlyEquivalent = Number(selectedPlanData ? (billingCycle === 'yearly' ? selectedPlanData.yearly : selectedPlanData.monthly) : 0);
  const totalDue = billingCycle === 'yearly' ? monthlyEquivalent * seatCount * 12 : monthlyEquivalent * seatCount;

  const choosePlan = (plan: Plan) => {
    setSelectedPlan(plan.name);
    requestAnimationFrame(() => document.getElementById('plan-next-step')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const completeSelection = async () => {
    if (!selectedPlan || !organizationId) return onOpenWorkspace();
    const key = selectedPlan === 'One App Free' ? 'one_app_free' : selectedPlan.toLowerCase() as PlanKey;
    setBusy(true); setError('');
    try {
      if (key === 'one_app_free') { await billingService.activateFreePlan(organizationId, seatCount); onChooseServices(); }
      else { const result = await billingService.createCheckout(organizationId, key, billingCycle, seatCount); if (result.url) window.location.assign(result.url); }
    } catch (err: any) { setError(err.message || 'Unable to start billing.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] pb-16">
      <header className="mx-auto max-w-3xl border-b border-slate-200 pb-9 text-center">
        <p className="text-sm font-medium text-blue-700">Simple pricing</p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.035em] text-slate-900 sm:text-5xl">Choose how your team works</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
          Start with one app or bring every NextAura workflow together. Pricing is per user, per month.
        </p>

        <div className="mt-8 inline-flex flex-col items-center gap-2">
          <div role="tablist" aria-label="Billing cycle" className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm">
            {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                id={`billing-${cycle}`}
                type="button"
                role="tab"
                aria-selected={billingCycle === cycle}
                aria-controls="pricing-plans"
                onClick={() => setBillingCycle(cycle)}
                className={`min-w-28 rounded-full px-5 py-2.5 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                  billingCycle === cycle ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {cycle}
              </button>
            ))}
          </div>
          <span className="text-xs font-medium text-emerald-700">Yearly saves up to 21% · billed annually</span>
        </div>
      </header>

      <section id="pricing-plans" role="tabpanel" aria-labelledby={`billing-${billingCycle}`} className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = billingCycle === 'yearly' ? plan.yearly : plan.monthly;
          return (
            <article key={plan.name} className={`flex min-h-[570px] flex-col border border-slate-200 border-t-4 ${plan.accent} bg-white px-7 pb-7 pt-8 shadow-[0_8px_30px_rgba(30,41,59,.055)] sm:px-8`}>
              <div className="min-h-32 border-b border-slate-200 pb-7">
                <h2 className="text-2xl font-medium tracking-tight text-slate-900">{plan.name}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
              </div>

              <div className="border-b border-slate-200 py-8" aria-live="polite">
                <div className="flex items-end gap-2">
                  <span className={`text-6xl font-medium tracking-[-0.06em] tabular-nums transition-opacity duration-150 ${plan.priceColor}`}>${price}</span>
                  <span className="pb-2 text-sm leading-5 text-slate-500">/ user<br />/ month</span>
                </div>
                <p className="mt-3 h-5 text-xs text-slate-500">{billingCycle === 'yearly' && plan.name !== 'One App Free' ? 'Billed annually' : '\u00a0'}</p>
              </div>

              <ul className="flex-1 space-y-4 py-8" aria-label={`${plan.name} features`}>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.priceColor}`} strokeWidth={2.2} aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button type="button" onClick={() => choosePlan(plan)} className={`w-full px-5 py-3.5 text-sm font-semibold tracking-wide text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${plan.button}`}>
                {plan.cta}
              </button>
              {plan.name !== 'One App Free' && (
                <button type="button" onClick={() => choosePlan(plan)} className="mt-3 w-full px-5 py-2.5 text-xs font-semibold tracking-wide text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                  FREE TRIAL
                </button>
              )}
            </article>
          );
        })}
      </section>

      {selectedPlan && (
        <section id="plan-next-step" className="mt-10 border-y border-slate-200 bg-[#FAFAF8] px-6 py-7 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8" aria-live="polite">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-blue-700" aria-hidden="true" />{selectedPlan} selected</p>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
              {selectedPlan === 'One App Free' ? 'Activate one app for your workspace. You can change your plan later.' : 'Secure Stripe Checkout will open with your selected seat quantity.'}
            </p>
            {!isPublic && <label className="mt-4 block text-sm font-medium text-slate-700">Seats<input type="number" min={1} max={10000} value={seatCount} onChange={(e) => setSeatCount(Math.max(1, Number(e.target.value) || 1))} className="mt-1.5 block w-40 border border-slate-300 px-3 py-2 text-sm" /></label>}
            {!isPublic && selectedPlanData && <p className="mt-3 text-sm font-semibold text-slate-900">Estimated {billingCycle === 'yearly' ? 'annual' : 'monthly'} total: ${totalDue.toFixed(2)} <span className="font-normal text-slate-500">({seatCount} seats)</span></p>}
            {!isPublic && error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          </div>
          <button type="button" onClick={completeSelection} disabled={busy} className="mt-5 inline-flex shrink-0 items-center gap-2 bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:mt-0">
            {isPublic ? 'Open NextAura' : busy ? 'Opening…' : selectedPlan === 'One App Free' ? 'Activate free plan' : 'Continue to secure checkout'}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        </section>
      )}

      <p className="mt-8 text-center text-xs leading-5 text-slate-500">
        Paid plans use Stripe-hosted Checkout. Payment details never pass through NextAura.
      </p>
    </div>
  );
};

export const PricingPage: React.FC = () => {
  const { navigate, currentOrg } = useApp();
  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-4rem)] bg-white px-4 py-10 text-slate-900 sm:-mx-6 sm:-my-7 sm:px-6 sm:py-12 xl:-mx-10 xl:-my-9 xl:px-10">
      <PricingContent organizationId={currentOrg.id} onOpenWorkspace={() => navigate('settings', 'services')} onChooseServices={() => navigate('settings', 'services')} />
    </div>
  );
};

export const PublicPricingPage: React.FC = () => (
  <div className="min-h-screen bg-white text-slate-900 antialiased">
    <nav className="border-b border-slate-200 bg-white" aria-label="Public navigation">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#285143] text-xs text-white">NA</span>
          NextAura
        </a>
        <a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
          Open workspace <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </nav>
    <main className="px-4 py-12 sm:px-6 sm:py-16">
      <PricingContent isPublic onOpenWorkspace={() => { window.location.href = '/'; }} onChooseServices={() => { window.location.href = '/'; }} />
    </main>
    <footer className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-500">
      <a href="/" className="inline-flex items-center gap-2 font-medium hover:text-slate-800"><ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />Return to NextAura</a>
    </footer>
  </div>
);
