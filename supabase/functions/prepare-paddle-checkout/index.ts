import { authenticate, corsHeaders, json, recordAudit, requireBillingAdmin } from '../_shared/billing.ts';
import { paddlePriceId } from '../_shared/paddleConfig.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { admin, user } = await authenticate(req);
    const body = await req.json();
    const organizationId = String(body.organizationId || '');
    const plan = String(body.plan || '');
    const billingCycle = String(body.billingCycle || '');
    const seatCount = Number(body.seatCount);
    const priceId = paddlePriceId(plan, billingCycle);
    if (!organizationId || !priceId || !Number.isInteger(seatCount) || seatCount < 1 || seatCount > 10000) {
      return json({ success: false, error: 'A supported paid plan, billing cycle, organization, and seat count are required.' }, 400);
    }

    await requireBillingAdmin(admin, user.id, organizationId);
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { error } = await admin.from('paddle_checkout_requests').insert({
      checkout_token: token,
      organization_id: organizationId,
      requested_by: user.id,
      plan,
      billing_cycle: billingCycle,
      seat_count: seatCount,
      price_id: priceId,
      expires_at: expiresAt,
    });
    if (error) throw error;

    await recordAudit(admin, organizationId, 'billing.paddle_checkout_started', `Paddle checkout prepared for ${plan} ${billingCycle} with ${seatCount} seats.`);
    return json({
      success: true,
      priceId,
      customData: { checkout_token: token, organization_id: organizationId, plan, billing_cycle: billingCycle, seat_count: String(seatCount) },
    });
  } catch (error: any) {
    const status = error.message?.includes('authentication') ? 401 : error.message?.includes('Only workspace') ? 403 : 400;
    return json({ success: false, error: error.message || 'Unable to prepare Paddle Checkout.' }, status);
  }
});
