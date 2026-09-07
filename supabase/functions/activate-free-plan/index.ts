import { authenticate, corsHeaders, json, recordAudit, requireBillingAdmin } from '../_shared/billing.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { admin, user } = await authenticate(req);
    const body = await req.json();
    const organizationId = String(body.organizationId || '');
    const seatCount = Number(body.seatCount);
    if (!organizationId || !Number.isInteger(seatCount) || seatCount < 1 || seatCount > 10000) return json({ success: false, error: 'Valid organization and seat count are required.' }, 400);
    await requireBillingAdmin(admin, user.id, organizationId);
    await admin.from('organizations').update({ requested_seats: seatCount }).eq('id', organizationId);
    await admin.from('organization_subscriptions').upsert({ organization_id: organizationId, plan: 'one_app_free', billing_cycle: null, status: 'active', seat_count: seatCount, billing_provider: 'internal', provider_customer_id: null, provider_subscription_id: null, provider_item_id: null, provider_price_id: null, next_billed_at: null, scheduled_change: null }, { onConflict: 'organization_id' });
    await recordAudit(admin, organizationId, 'billing.free_plan_activated', `One App Free activated for ${seatCount} seats.`);
    return json({ success: true });
  } catch (error: any) { return json({ success: false, error: error.message || 'Unable to activate free plan.' }, 400); }
});
