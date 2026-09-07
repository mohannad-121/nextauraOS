import { authenticate, corsHeaders, json, requireBillingAdmin } from '../_shared/billing.ts';
import { paddleRequest } from '../_shared/paddle.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { admin, user } = await authenticate(req);
    const body = await req.json();
    const organizationId = String(body.organizationId || '');
    await requireBillingAdmin(admin, user.id, organizationId);
    const { data: subscription } = await admin.from('organization_subscriptions')
      .select('billing_provider,provider_customer_id,provider_subscription_id')
      .eq('organization_id', organizationId).maybeSingle();
    if (subscription?.billing_provider !== 'paddle' || !subscription.provider_customer_id) {
      return json({ success: false, error: 'No Paddle customer is linked to this workspace yet.' }, 400);
    }
    const portal = await paddleRequest(`customers/${subscription.provider_customer_id}/portal-sessions`, 'POST', {
      subscription_ids: subscription.provider_subscription_id ? [subscription.provider_subscription_id] : [],
    });
    const url = portal?.urls?.general?.overview;
    if (!url) throw new Error('Paddle did not return a customer portal URL.');
    return json({ success: true, url });
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Unable to open Paddle billing portal.' }, 400);
  }
});
