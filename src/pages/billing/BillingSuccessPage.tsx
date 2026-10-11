import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { billingService, type OrganizationSubscription } from '../../services/billingService';
import { closePaddleCheckout } from '../../services/paddle';

export const BillingSuccessPage: React.FC = () => {
  const { navigate, currentOrg } = useApp();
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);

  useEffect(() => {
    closePaddleCheckout();
    let disposed = false;
    let timer: number | undefined;
    const poll = async (attempt: number) => {
      try {
        const next = await billingService.getSubscription(currentOrg.id);
        if (disposed) return;
        setSubscription(next);
        if (!next || !['active', 'trialing'].includes(next.status)) {
          if (attempt < 6) timer = window.setTimeout(() => { void poll(attempt + 1); }, 2_000);
        }
      } catch {
        if (!disposed && attempt < 6) timer = window.setTimeout(() => { void poll(attempt + 1); }, 2_000);
      }
    };
    void poll(0);
    return () => { disposed = true; if (timer) window.clearTimeout(timer); };
  }, [currentOrg.id]);

  const active = Boolean(subscription && ['active', 'trialing'].includes(subscription.status));
  const plan = subscription?.plan === 'standard' ? 'Standard' : subscription?.plan === 'custom' ? 'Custom' : 'Your';

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-4rem)] bg-[#090B1A] flex items-center justify-center p-6 text-[#F4F6FF] relative overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#08B894]/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg rounded-3xl border border-[#1F253D] bg-[#161B30] p-8 sm:p-10 text-center shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative z-10 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#08B894]/15 border border-[#08B894]/30 text-[#23C99C] shadow-[0_0_20px_rgba(35,201,156,0.3)]">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#08B894]/10 border border-[#08B894]/30 text-[#23C99C] text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Payment Verified</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F4F6FF] font-heading">
            {active ? 'Subscription Activated' : 'Checkout Received'}
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-[#A3ABC5] max-w-sm mx-auto">
            {active
              ? `${plan} plan is active and provisioned for your workspace.`
              : 'Confirming your Paddle subscription. Your plan becomes active as soon as the signed webhook is processed.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('launchpad')}
            className="w-full sm:w-auto cursor-pointer rounded-xl bg-[#7568E8] hover:bg-[#867AF0] active:bg-[#6056C9] px-5 py-3 text-xs font-bold text-white shadow-[0_0_12px_rgba(117,104,232,0.35)] flex items-center justify-center gap-2 transition-all"
          >
            <span>Go to My Apps</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('settings', 'billing')}
            className="w-full sm:w-auto cursor-pointer rounded-xl bg-[#101426] hover:bg-[#1A2035] border border-[#2A3048] hover:border-[#7568E8]/40 px-5 py-3 text-xs font-semibold text-[#F4F6FF] transition-all"
          >
            Open Billing &amp; Plans
          </button>
        </div>
      </div>
    </div>
  );
};
