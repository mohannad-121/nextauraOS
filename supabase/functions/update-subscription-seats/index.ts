import { authenticate, corsHeaders, json, recordAudit, requireBillingAdmin, stripeRequest } from '../_shared/billing.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { admin, user } = await authenticate(req);
    const body = await req.json(); const organizationId = String(body.organizationId || ''); const seatCount = Number(body.seatCount);
    if (!organizationId || !Number.isInteger(seatCount) || seatCount < 1 || seatCount > 10000) return json({ success: false, error: 'Valid organization and seat count are required.' }, 400);
    await requireBillingAdmin(admin, user.id, organizationId);
    const { count: memberCount } = await admin.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'Active');
    if ((memberCount || 0) > seatCount) return json({ success: false, error: `You have ${memberCount} active members. Remove members before reducing seats below that count.` }, 400);
    const { data: subscription } = await admin.from('organization_subscriptions').select('*').eq('organization_id', organizationId).maybeSingle();
    if (!subscription) return json({ success: false, error: 'No billing record exists for this workspace.' }, 404);
    if (subscription.plan !== 'one_app_free') {
      if (!subscription.stripe_subscription_id) return json({ success: false, error: 'Stripe subscription is not ready yet. Complete checkout first.' }, 409);
      let itemId = subscription.stripe_subscription_item_id;
      if (!itemId) { const remote = await stripeRequest(`subscriptions/${subscription.stripe_subscription_id}`, 'GET'); itemId = remote.items?.data?.[0]?.id; }
      if (!itemId) return json({ success: false, error: 'Stripe subscription item could not be found.' }, 409);
      await stripeRequest(`subscription_items/${itemId}`, 'POST', { quantity: String(seatCount), proration_behavior: 'create_prorations' });
      await admin.from('organization_subscriptions').update({ seat_count: seatCount, stripe_subscription_item_id: itemId }).eq('organization_id', organizationId);
    } else {
      await admin.from('organization_subscriptions').update({ seat_count: seatCount }).eq('organization_id', organizationId);
    }
    await admin.from('organizations').update({ requested_seats: seatCount }).eq('id', organizationId);
    await recordAudit(admin, organizationId, 'billing.seats_updated', `Seat quantity updated to ${seatCount}.`);
    return json({ success: true, seatCount });
  } catch (error: any) { return json({ success: false, error: error.message || 'Unable to update subscription seats.' }, 400); }
});

