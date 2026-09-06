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
    monthlyPriceId: STRIPE_PRICE_IDS.standard.monthly,
    yearlyPriceId: STRIPE_PRICE_IDS.standard.yearly,
    description: 'Every core app for teams running their business in one place.',
  },
  {
    key: 'custom',
    name: 'Custom',
    monthlyPerSeat: 10,
    yearlyPerSeat: 8,
    monthlyPriceId: STRIPE_PRICE_IDS.custom.monthly,
    yearlyPriceId: STRIPE_PRICE_IDS.custom.yearly,
    description: 'Flexible operations for complex organizations and integrations.',
  },
];

export const getPricingPlan = (key: PlanKey) => PRICING_PLANS.find((plan) => plan.key === key)!;

