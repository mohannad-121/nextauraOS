import { authenticate, corsHeaders, json, requireBillingAdmin, stripeRequest } from '../_shared/billing.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { admin, user } = await authenticate(req);
    const body = await req.json(); const organizationId = String(body.organizationId || '');
    await requireBillingAdmin(admin, user.id, organizationId);
    const { data: subscription } = await admin.from('organization_subscriptions').select('stripe_customer_id').eq('organization_id', organizationId).maybeSingle();
    if (!subscription?.stripe_customer_id) return json({ success: false, error: 'No Stripe customer is linked to this workspace yet.' }, 400);
    const appUrl = Deno.env.get('APP_URL') || req.headers.get('origin') || 'http://localhost:5173';
    const portal = await stripeRequest('billing_portal/sessions', 'POST', { customer: subscription.stripe_customer_id, return_url: `${appUrl.replace(/\/$/, '')}/settings` });
    return json({ success: true, url: portal.url });
  } catch (error: any) { return json({ success: false, error: error.message || 'Unable to open billing portal.' }, 400); }
});

