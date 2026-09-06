import { authenticate, corsHeaders, json, recordAudit, requireBillingAdmin, stripeRequest } from '../_shared/billing.ts';
import { stripePriceId } from '../_shared/stripeConfig.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { admin, user } = await authenticate(req);
    const body = await req.json();
    const organizationId = String(body.organizationId || '');
    const plan = String(body.plan || '');
    const billingCycle = String(body.billingCycle || '');
    const seatCount = Number(body.seatCount);
    if (!organizationId || !['standard', 'custom'].includes(plan) || !['monthly', 'yearly'].includes(billingCycle) || !Number.isInteger(seatCount) || seatCount < 1 || seatCount > 10000) {
      return json({ success: false, error: 'A paid plan, billing cycle, organization, and valid seat count are required.' }, 400);
    }
    await requireBillingAdmin(admin, user.id, organizationId);
    const { data: org } = await admin.from('organizations').select('name,requested_seats').eq('id', organizationId).single();
    const { data: existing } = await admin.from('organization_subscriptions').select('stripe_customer_id').eq('organization_id', organizationId).maybeSingle();
    const price = stripePriceId(plan, billingCycle);
    if (!price) return json({ success: false, error: 'Unsupported Stripe price.' }, 400);
    let customerId = existing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripeRequest('customers', 'POST', {
        email: user.email || '', name: org?.name || 'NextAura workspace', 'metadata[organization_id]': organizationId,
      });
      customerId = customer.id;
    }
    const appUrl = Deno.env.get('APP_URL') || req.headers.get('origin') || 'http://localhost:5173';
    const session = await stripeRequest('checkout/sessions', 'POST', {
      mode: 'subscription', customer: customerId, 'line_items[0][price]': price, 'line_items[0][quantity]': String(seatCount),
      success_url: `${appUrl.replace(/\/$/, '')}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl.replace(/\/$/, '')}/pricing`,
      'metadata[organization_id]': organizationId, 'metadata[plan]': plan, 'metadata[billing_cycle]': billingCycle, 'metadata[seat_count]': String(seatCount),
      'subscription_data[metadata][organization_id]': organizationId, 'subscription_data[metadata][plan]': plan, 'subscription_data[metadata][billing_cycle]': billingCycle,
    });
    await admin.from('organizations').update({ requested_seats: seatCount }).eq('id', organizationId);
    await admin.from('organization_subscriptions').upsert({ organization_id: organizationId, plan, billing_cycle: billingCycle, status: 'incomplete', seat_count: seatCount, stripe_customer_id: customerId, stripe_price_id: price }, { onConflict: 'organization_id' });
    await recordAudit(admin, organizationId, 'billing.checkout_started', `${plan} ${billingCycle} checkout created for ${seatCount} seats.`);
    return json({ success: true, url: session.url, sessionId: session.id });
  } catch (error: any) {
    const status = error.message?.includes('authentication') ? 401 : error.message?.includes('Only workspace') ? 403 : 400;
    return json({ success: false, error: error.message || 'Unable to create checkout session.' }, status);
  }
});

