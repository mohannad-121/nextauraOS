import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
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
  return <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center"><div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/30"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h1 className="mt-4 text-2xl font-semibold">Checkout received</h1><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{active ? `${plan} plan is active.` : 'Confirming your Paddle subscription. Your plan becomes active after the signed webhook is processed.'}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button onClick={() => navigate('settings', 'billing')}>Open Billing &amp; Plans</Button><Button variant="secondary" onClick={() => navigate('launchpad')}>Go to My Apps</Button></div></div></div>;
};
