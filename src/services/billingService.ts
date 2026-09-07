import { isSupabaseConfigured, supabase } from './supabaseClient';
import type { BillingCycle, PlanKey } from '../config/pricingConfig';

export interface OrganizationSubscription {
  id: string; organization_id: string; plan: PlanKey; billing_cycle: BillingCycle | null; status: string;
  seat_count: number; billing_provider: 'internal' | 'paddle' | 'stripe' | null;
  provider_customer_id: string | null; provider_subscription_id: string | null; provider_price_id: string | null;
  current_period_end: string | null; next_billed_at: string | null; scheduled_change: { action?: string; effective_at?: string } | null;
}

async function invoke(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error || !data?.success) throw new Error(data?.error || error?.message || 'Billing request failed.');
  return data;
}

export const billingService = {
  async getSubscription(orgId: string): Promise<OrganizationSubscription | null> {
    if (!isSupabaseConfigured() || !orgId) return null;
    const { data, error } = await supabase.from('organization_subscriptions').select('*').eq('organization_id', orgId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
  async preparePaddleCheckout(organizationId: string, plan: Exclude<PlanKey, 'one_app_free'>, billingCycle: BillingCycle, seatCount: number) {
    return invoke('prepare-paddle-checkout', { organizationId, plan, billingCycle, seatCount });
  },
  async activateFreePlan(organizationId: string, seatCount: number) { return invoke('activate-free-plan', { organizationId, seatCount }); },
  async saveSeatCount(organizationId: string, seatCount: number) { return invoke('save-seat-count', { organizationId, seatCount }); },
  async openPortal(organizationId: string) { return invoke('create-paddle-portal', { organizationId }); },
  async updateSeats(organizationId: string, seatCount: number) { return invoke('update-subscription-seats', { organizationId, seatCount }); },
};
