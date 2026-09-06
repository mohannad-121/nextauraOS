import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useApp } from '../../context/AppContext';

export const BillingSuccessPage: React.FC = () => {
  const { navigate } = useApp();
  return <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center"><div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/30"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h1 className="mt-4 text-2xl font-semibold">Checkout received</h1><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Stripe is confirming your subscription. Your plan becomes active after the signed webhook is processed.</p><Button className="mt-6" onClick={() => navigate('settings')}>Open billing settings</Button></div></div>;
};

