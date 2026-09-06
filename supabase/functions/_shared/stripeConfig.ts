export const STRIPE_PRICE_IDS = {
  standard: {
    monthly: 'price_1UCnDKDCcn7z3Fv7QtqmhqHc',
    yearly: 'price_1UCnE0DCcn7z3Fv7HGiAsD4f',
  },
  custom: {
    monthly: 'price_1UCnEsDCcn7z3Fv7Tdi9wc5l',
    yearly: 'price_1UCnFBDCcn7z3Fv75aQYAa6D',
  },
} as const;

export const PLAN_BY_PRICE: Record<string, { plan: 'standard' | 'custom'; billingCycle: 'monthly' | 'yearly' }> = {
  [STRIPE_PRICE_IDS.standard.monthly]: { plan: 'standard', billingCycle: 'monthly' },
  [STRIPE_PRICE_IDS.standard.yearly]: { plan: 'standard', billingCycle: 'yearly' },
  [STRIPE_PRICE_IDS.custom.monthly]: { plan: 'custom', billingCycle: 'monthly' },
  [STRIPE_PRICE_IDS.custom.yearly]: { plan: 'custom', billingCycle: 'yearly' },
};

export const stripePriceId = (plan: string, billingCycle: string) => {
  if (plan === 'standard' || plan === 'custom') return STRIPE_PRICE_IDS[plan][billingCycle as 'monthly' | 'yearly'];
  return null;
};
