export const PADDLE_PRICE_IDS = {
  standard: {
    monthly: Deno.env.get('PADDLE_STANDARD_MONTHLY_PRICE_ID') || 'pri_01m1xkjn0e25b2fh64xc3gwtwz',
    yearly: Deno.env.get('PADDLE_STANDARD_YEARLY_PRICE_ID') || 'pri_01m1xkkmx9jnt7fm8dgp39g5cr',
  },
  custom: {
    monthly: Deno.env.get('PADDLE_CUSTOM_MONTHLY_PRICE_ID') || 'pri_01m1xkra5038az9bs921zmapwy',
    yearly: Deno.env.get('PADDLE_CUSTOM_YEARLY_PRICE_ID') || 'pri_01m1xkrxamktvhqbxbgmsd5p6q',
  },
} as const;

export type PaidPlan = keyof typeof PADDLE_PRICE_IDS;
export type BillingCycle = 'monthly' | 'yearly';

export const paddlePriceId = (plan: string, billingCycle: string) => {
  if ((plan === 'standard' || plan === 'custom') && (billingCycle === 'monthly' || billingCycle === 'yearly')) {
    return PADDLE_PRICE_IDS[plan][billingCycle];
  }
  return null;
};

export const planByPaddlePrice: Record<string, { plan: PaidPlan; billingCycle: BillingCycle }> = {
  [PADDLE_PRICE_IDS.standard.monthly]: { plan: 'standard', billingCycle: 'monthly' },
  [PADDLE_PRICE_IDS.standard.yearly]: { plan: 'standard', billingCycle: 'yearly' },
  [PADDLE_PRICE_IDS.custom.monthly]: { plan: 'custom', billingCycle: 'monthly' },
  [PADDLE_PRICE_IDS.custom.yearly]: { plan: 'custom', billingCycle: 'yearly' },
};
