import { corsHeaders, json, adminClient, recordAudit, stripeRequest } from '../_shared/billing.ts';
import { PLAN_BY_PRICE } from '../_shared/stripeConfig.ts';

function hex(bytes: Uint8Array) { return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(''); }
async function signatureValid(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(',').map((part) => part.split('=')));
  const timestamp = Number(parts.t); const signature = parts.v1;
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`))));
  if (digest.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < digest.length; i++) diff |= digest.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const body = await req.text();
  try {
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!secret) return json({ error: 'Stripe webhook secret is not configured.' }, 503);
    const signature = req.headers.get('Stripe-Signature') || '';
    if (!(await signatureValid(body, signature, secret))) return json({ error: 'Invalid Stripe signature.' }, 400);
    const event = JSON.parse(body); const admin = adminClient();
    const { data: inserted, error: insertError } = await admin.from('stripe_webhook_events').insert({ stripe_event_id: event.id, event_type: event.type, payload: event.data?.object }).select('id').maybeSingle();
    if (insertError?.code === '23505') return json({ received: true, duplicate: true });
    if (insertError) throw insertError;
    const object = event.data?.object || {};
    const metadata = object.metadata || {};
    let organizationId = metadata.organization_id || null;
    if (!organizationId && object.customer) {
      const { data } = await admin.from('organization_subscriptions').select('organization_id').eq('stripe_customer_id', object.customer).maybeSingle();
      organizationId = data?.organization_id || null;
    }
    if (!organizationId && metadata.organization_id) organizationId = metadata.organization_id;
    if (organizationId) await admin.from('stripe_webhook_events').update({ organization_id: organizationId }).eq('id', inserted?.id);

    if (['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
      let subscription = object;
      if (event.type === 'checkout.session.completed' && object.subscription) subscription = await stripeRequest(`subscriptions/${object.subscription}`, 'GET');
      const item = subscription.items?.data?.[0]; const priceId = item?.price?.id || metadata.price_id || null;
      const mapped = priceId ? PLAN_BY_PRICE[priceId] : null;
      organizationId = organizationId || subscription.metadata?.organization_id || null;
      if (organizationId) {
        await admin.from('organization_subscriptions').upsert({
          organization_id: organizationId, plan: mapped?.plan || subscription.metadata?.plan || metadata.plan || 'standard', billing_cycle: mapped?.billingCycle || subscription.metadata?.billing_cycle || metadata.billing_cycle || 'monthly', status: event.type === 'customer.subscription.deleted' ? 'canceled' : (subscription.status || 'unknown'), seat_count: item?.quantity || Number(metadata.seat_count) || 1, stripe_customer_id: subscription.customer || object.customer || null, stripe_subscription_id: subscription.id || object.subscription || null, stripe_subscription_item_id: item?.id || null, stripe_price_id: priceId, current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null, current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null, cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        }, { onConflict: 'organization_id' });
        await admin.from('organizations').update({ requested_seats: item?.quantity || Number(metadata.seat_count) || 1 }).eq('id', organizationId);
        await recordAudit(admin, organizationId, `billing.${event.type.replaceAll('.', '_')}`, `Stripe subscription state synchronized (${subscription.status || 'canceled'}).`);
      }
    } else if (event.type === 'invoice.payment_failed' && organizationId) {
      await admin.from('organization_subscriptions').update({ status: 'past_due' }).eq('organization_id', organizationId);
      await recordAudit(admin, organizationId, 'billing.payment_failed', 'Stripe reported a failed invoice payment; workspace billing is past due.');
    } else if (event.type === 'invoice.paid' && organizationId) {
      await admin.from('organization_subscriptions').update({ status: 'active' }).eq('organization_id', organizationId);
      await recordAudit(admin, organizationId, 'billing.invoice_paid', 'Stripe confirmed invoice payment.');
    }
    return json({ received: true });
  } catch (error: any) {
    console.error('[stripe-webhook]', error);
    return json({ error: error.message || 'Webhook processing failed.' }, 400);
  }
});
