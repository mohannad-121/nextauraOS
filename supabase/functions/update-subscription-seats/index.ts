import { authenticate, corsHeaders, json, recordAudit, requireBillingAdmin } from '../_shared/billing.ts';
import { paddleRequest } from '../_shared/paddle.ts';

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
      if (subscription.billing_provider !== 'paddle' || !subscription.provider_subscription_id) return json({ success: false, error: 'Paddle subscription is not ready yet. Complete checkout first.' }, 409);
      const remote = await paddleRequest(`subscriptions/${subscription.provider_subscription_id}`);
      const currentItems = Array.isArray(remote?.items) ? remote.items : [];
      if (!currentItems.length) return json({ success: false, error: 'Paddle subscription items could not be found.' }, 409);
      await paddleRequest(`subscriptions/${subscription.provider_subscription_id}`, 'PATCH', {
        items: currentItems.map((item: any) => ({ price_id: item.price?.id || item.price_id, quantity: seatCount })),
        proration_billing_mode: 'prorated_immediately',
      });
      await admin.from('organizations').update({ requested_seats: seatCount }).eq('id', organizationId);
      await recordAudit(admin, organizationId, 'billing.seats_update_requested', `Paddle seat quantity change requested for ${seatCount} seats; awaiting webhook confirmation.`);
      return json({ success: true, seatCount, pendingWebhook: true });
    } else {
      await admin.from('organization_subscriptions').update({ seat_count: seatCount }).eq('organization_id', organizationId);
    }
    await admin.from('organizations').update({ requested_seats: seatCount }).eq('id', organizationId);
    await recordAudit(admin, organizationId, 'billing.seats_updated', `Seat quantity updated to ${seatCount}.`);
    return json({ success: true, seatCount });
  } catch (error: any) { return json({ success: false, error: error.message || 'Unable to update subscription seats.' }, 400); }
});
