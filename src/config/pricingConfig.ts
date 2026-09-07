export type BillingCycle = 'monthly' | 'yearly';
export type PlanKey = 'one_app_free' | 'standard' | 'custom';

export interface PricingPlan {
  key: PlanKey;
  name: string;
  monthlyPerSeat: number;
  yearlyPerSeat: number;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
  description: string;
}

const environment = import.meta.env;

export const PADDLE_PRICE_IDS = {
  standard: {
    monthly: environment.VITE_PADDLE_STANDARD_MONTHLY_PRICE_ID || 'pri_01m1xkjn0e25b2fh64xc3gwtwz',
    yearly: environment.VITE_PADDLE_STANDARD_YEARLY_PRICE_ID || 'pri_01m1xkkmx9jnt7fm8dgp39g5cr',
  },
  custom: {
    monthly: environment.VITE_PADDLE_CUSTOM_MONTHLY_PRICE_ID || 'pri_01m1xkra5038az9bs921zmapwy',
    yearly: environment.VITE_PADDLE_CUSTOM_YEARLY_PRICE_ID || 'pri_01m1xkrxamktvhqbxbgmsd5p6q',
  },
} as const;

export const isPaddleSandbox = (environment.VITE_PADDLE_ENV || 'sandbox') === 'sandbox';

export const PRICING_PLANS: PricingPlan[] = [
  {
    key: 'one_app_free',
    name: 'One App Free',
    monthlyPerSeat: 0,
    yearlyPerSeat: 0,
    description: 'One business application with unlimited users.',
  },
  {
    key: 'standard',
    name: 'Standard',
    monthlyPerSeat: 7,
    yearlyPerSeat: 5.5,
    monthlyPriceId: PADDLE_PRICE_IDS.standard.monthly,
    yearlyPriceId: PADDLE_PRICE_IDS.standard.yearly,
    description: 'Every core app for teams running their business in one place.',
  },
  {
    key: 'custom',
    name: 'Custom',
    monthlyPerSeat: 10,
    yearlyPerSeat: 8,
    monthlyPriceId: PADDLE_PRICE_IDS.custom.monthly,
    yearlyPriceId: PADDLE_PRICE_IDS.custom.yearly,
    description: 'Flexible operations for complex organizations and integrations.',
  },
];

export const getPricingPlan = (key: PlanKey) => PRICING_PLANS.find((plan) => plan.key === key)!;

export const getDisplayedPlanTotal = (plan: PricingPlan, cycle: BillingCycle, seatCount: number) => {
  const perSeat = cycle === 'yearly' ? plan.yearlyPerSeat * 12 : plan.monthlyPerSeat;
  return perSeat * seatCount;
};
