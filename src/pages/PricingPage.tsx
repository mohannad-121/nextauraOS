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
  accent: string;
  priceColor: string;
  button: string;
  cta: string;
  features: string[];
}

const plans: Plan[] = [
  { name: 'One App Free', description: 'A complete starting point for one business workflow.', monthly: String(PRICING_PLANS[0].monthlyPerSeat), yearly: String(PRICING_PLANS[0].yearlyPerSeat), accent: 'border-t-sky-400', priceColor: 'text-sky-700', button: 'bg-sky-700 hover:bg-sky-800 focus-visible:ring-sky-600', cta: 'START NOW', features: ['One app', 'Unlimited users', 'NextAura Cloud'] },
  { name: 'Standard', description: 'Every core app for teams running their business in one place.', monthly: String(PRICING_PLANS[1].monthlyPerSeat), yearly: String(PRICING_PLANS[1].yearlyPerSeat), accent: 'border-t-rose-400', priceColor: 'text-rose-600', button: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500', cta: 'BUY NOW', features: ['All apps', 'NextAura Cloud', 'All core business modules', 'Standard support'] },
  { name: 'Custom', description: 'Flexible operations for complex organizations and integrations.', monthly: String(PRICING_PLANS[2].monthlyPerSeat), yearly: String(PRICING_PLANS[2].yearlyPerSeat), accent: 'border-t-emerald-500', priceColor: 'text-emerald-700', button: 'bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-600', cta: 'BUY NOW', features: ['All apps', 'NextAura Cloud', 'Advanced customization', 'Multi-company', 'External API', 'Advanced automation and integrations'] },
];

interface PricingContentProps {
  isPublic?: boolean;
  onOpenWorkspace: () => void;
  onChooseServices: () => void;
}

const PricingContent: React.FC<PricingContentProps & { organizationId?: string; customerEmail?: string }> = ({ isPublic = false, onOpenWorkspace, onChooseServices, organizationId, customerEmail }) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);
  const [seatCount, setSeatCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const billingToggleId = useId();
  const selectedPlanData = selectedPlan ? getPricingPlan(selectedPlan === 'One App Free' ? 'one_app_free' : selectedPlan.toLowerCase() as PlanKey) : null;
  const totalDue = selectedPlanData ? getDisplayedPlanTotal(selectedPlanData, billingCycle, seatCount) : 0;

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
      else {
        const result = await billingService.preparePaddleCheckout(organizationId, key, billingCycle, seatCount);
        await openPaddleCheckout({ priceId: result.priceId, quantity: seatCount, customerEmail, customData: result.customData });
      }
    } catch (err: any) { setError(err.message || 'Unable to start billing.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] pb-16">
      <header className="mx-auto max-w-3xl border-b border-slate-200/90 pb-10 text-center sm:pb-12">
        <p className="text-sm font-semibold tracking-[0.08em] text-blue-700">SIMPLE PRICING</p>
        <h1 className="font-caveat mt-2 text-5xl font-semibold leading-[0.92] tracking-[-0.04em] text-slate-900 sm:text-6xl lg:text-7xl">Choose how your team works</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600">Start with one app or bring every NextAura workflow together. Pricing is per user, per month.</p>

        <div className="mt-9 flex flex-col items-center gap-3" role="group" aria-label="Billing cycle">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <span className={`text-sm transition-colors ${billingCycle === 'monthly' ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'}`}>Monthly</span>
            <input id={billingToggleId} type="checkbox" checked={billingCycle === 'yearly'} onChange={(event) => setBillingCycle(event.currentTarget.checked ? 'yearly' : 'monthly')} className="peer sr-only" aria-label="Bill yearly instead of monthly" aria-controls="pricing-plans" />
            <label htmlFor={billingToggleId} className="relative inline-flex h-9 w-[92px] cursor-pointer items-center rounded-full bg-slate-100 p-1 shadow-[inset_0_1px_1px_rgba(15,23,42,.08),0_2px_6px_rgba(15,23,42,.06)] transition-shadow duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-green-600 peer-focus-visible:ring-offset-4">
              <svg viewBox="0 0 212.4992 84.4688" className="h-full w-full overflow-visible" aria-hidden="true">
                <path pathLength="360" fill="none" stroke="#16A34A" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" d="M 42.2496,84.4688 C 18.913594,84.474104 -0.00530424,65.555206 0,42.2192 0.01148477,18.895066 18.925464,-0.00530377 42.2496,0 65.573736,-0.00530377 84.487715,18.895066 84.4992,42.2192 84.504504,65.555206 65.585606,84.474104 42.2496,84.4688 18.913594,84.474104 -0.00530424,65.555206 0,42.2192 0.01148477,18.895066 18.925463,-0.00188652 42.2496,0 c 64,0 64,84.4688 128,84.4688 23.32414,0.0019 42.23812,-18.895066 42.2496,-42.2192 C 212.5042,18.913594 193.58561,-0.005304 170.2496,0 146.91359,-0.005304 127.9947,18.913594 128,42.2496 c 0.0115,23.324134 18.92546,42.224504 42.2496,42.2192 23.32414,0.0053 42.23812,-18.895066 42.2496,-42.2192 C 212.5042,18.913594 193.58561,-0.005304 170.2496,0 c -64,0 -64,84.4688 -128,84.4688 z" style={{ strokeDasharray: '130 230', strokeDashoffset: billingCycle === 'yearly' ? 180 : 0, transform: billingCycle === 'yearly' ? 'scaleY(-1)' : 'scaleY(1)', transformOrigin: 'center', transition: 'stroke-dashoffset 500ms ease-out, transform 500ms ease-out' }} />
              </svg>
            </label>
            <span className={`text-sm transition-colors ${billingCycle === 'yearly' ? 'font-semibold text-emerald-700' : 'font-medium text-slate-500'}`}>Yearly</span>
          </div>
          <span className="text-xs font-semibold text-emerald-700">Yearly saves up to 21% &middot; billed annually</span>
        </div>
      </header>

      <section id="pricing-plans" className="mt-10 grid grid-cols-1 gap-5 sm:mt-12 sm:gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = billingCycle === 'yearly' ? plan.yearly : plan.monthly;
          return <article key={plan.name} className={`group relative flex min-h-[570px] flex-col overflow-hidden rounded-[20px] border border-slate-200 border-t-4 ${plan.accent} bg-white px-7 pb-7 pt-8 shadow-[0_8px_30px_rgba(30,41,59,.06),0_1px_2px_rgba(30,41,59,.04)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_38px_rgba(30,41,59,.11),0_3px_8px_rgba(30,41,59,.05)] sm:px-8 ${plan.name === 'Standard' ? 'lg:-mt-2 lg:min-h-[586px] lg:pb-9 lg:pt-10' : ''}`}>
            {plan.name === 'Standard' && <span className="absolute right-6 top-5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold tracking-[0.06em] text-rose-700">MOST POPULAR</span>}
            <div className="min-h-32 border-b border-slate-100 pb-7"><h2 className="text-2xl font-semibold tracking-tight text-slate-900">{plan.name}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p></div>
            <div className="border-b border-slate-100 py-8" aria-live="polite"><div className="flex items-end gap-2.5"><span className={`text-6xl font-semibold tracking-[-0.065em] tabular-nums transition-opacity duration-150 ${plan.priceColor}`}>${price}</span><span className="pb-2 text-sm leading-5 text-slate-500">/ user<br />/ month</span></div><p className="mt-3 h-5 text-xs font-medium text-slate-500">{billingCycle === 'yearly' && plan.name !== 'One App Free' ? 'Billed annually' : '\u00a0'}</p></div>
            <ul className="flex-1 space-y-4 py-8" aria-label={`${plan.name} features`}>{plan.features.map((feature) => <li key={feature} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-700"><span className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-current/10 ${plan.priceColor}`}><Check className="h-3 w-3" strokeWidth={2.8} aria-hidden="true" /></span><span>{feature}</span></li>)}</ul>
            <button type="button" onClick={() => choosePlan(plan)} className={`w-full cursor-pointer rounded-xl px-5 py-3.5 text-sm font-bold tracking-wide text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md active:translate-y-0 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${plan.button}`}>{plan.cta}</button>
            {plan.name !== 'One App Free' && <button type="button" onClick={() => choosePlan(plan)} className="mt-3 w-full cursor-pointer rounded-lg px-5 py-2.5 text-xs font-bold tracking-wide text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">FREE TRIAL</button>}
          </article>;
        })}
      </section>

      {selectedPlan && <section id="plan-next-step" className="mt-10 rounded-[20px] border border-slate-200 bg-[#FAFAF8] px-6 py-7 shadow-[0_10px_28px_rgba(30,41,59,.05)] sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8" aria-live="polite">
        <div className="min-w-0"><p className="text-xs font-bold tracking-[0.08em] text-blue-700">SELECTED PLAN</p><p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-blue-700" aria-hidden="true" />{selectedPlan}</p><p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">{selectedPlan === 'One App Free' ? 'Activate one app for your workspace. You can change your plan later.' : 'Secure Paddle Checkout will open with your selected seat quantity.'}</p>
          {!isPublic && <label className="mt-5 block text-sm font-semibold text-slate-700">Seats<input type="number" min={1} max={10000} value={seatCount} onChange={(e) => setSeatCount(Math.max(1, Number(e.target.value) || 1))} className="mt-2 block min-h-11 w-40 cursor-text rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20" /></label>}
          {!isPublic && selectedPlanData && !isPaddleSandbox && <p className="mt-4 text-sm font-semibold text-slate-900">Estimated {billingCycle === 'yearly' ? 'annual' : 'monthly'} total: <span className="tabular-nums">${totalDue.toFixed(2)}</span> <span className="font-normal text-slate-500">({seatCount} seats)</span></p>}
          {!isPublic && error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </div>
        <div className="mt-6 shrink-0 sm:mt-0 sm:text-right"><button type="button" onClick={completeSelection} disabled={busy} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:bg-blue-800 hover:shadow-md active:translate-y-0 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto">{selectedPlan !== 'One App Free' && !isPublic && <ShieldCheck className="h-4 w-4" aria-hidden="true" />}{isPublic ? 'Open NextAura' : busy ? 'Opening...' : selectedPlan === 'One App Free' ? 'Activate free plan' : 'Continue to secure checkout'}<ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /></button>{selectedPlan !== 'One App Free' && !isPublic && <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500 sm:justify-end"><ShieldCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />Secure checkout powered by Paddle</p>}</div>
      </section>}

      <p className="mt-8 text-center text-xs leading-5 text-slate-500">Paid plans use Paddle Checkout. Payment details never pass through NextAura.</p>
    </div>
  );
};

export const PricingPage: React.FC = () => {
  const { navigate, currentOrg, user } = useApp();
  return <div className="-mx-4 -my-5 min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_50%_0%,rgba(226,232,240,.62),transparent_31rem),#fff] px-4 py-10 text-slate-900 sm:-mx-6 sm:-my-7 sm:px-6 sm:py-12 xl:-mx-10 xl:-my-9 xl:px-10"><PricingContent organizationId={currentOrg.id} customerEmail={user.email} onOpenWorkspace={() => navigate('settings', 'services')} onChooseServices={() => navigate('settings', 'services')} /></div>;
};

export const PublicPricingPage: React.FC = () => <div className="min-h-screen bg-white text-slate-900 antialiased"><nav className="border-b border-slate-200 bg-white" aria-label="Public navigation"><div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6"><a href="/" className="flex cursor-pointer items-center gap-2.5 font-semibold tracking-tight text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#285143] text-xs text-white">NA</span>NextAura</a><a href="/" className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">Open workspace <ExternalLink className="h-4 w-4" aria-hidden="true" /></a></div></nav><main className="px-4 py-12 sm:px-6 sm:py-16"><PricingContent isPublic onOpenWorkspace={() => { window.location.href = '/'; }} onChooseServices={() => { window.location.href = '/'; }} /></main><footer className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-500"><a href="/" className="inline-flex cursor-pointer items-center gap-2 font-medium transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />Return to NextAura</a></footer></div>;
