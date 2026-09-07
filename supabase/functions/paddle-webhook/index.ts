import { adminClient, corsHeaders, json, recordAudit } from '../_shared/billing.ts';
import { lifecyclePlanForSubscription, reconcileOrganizationFamilyForPlan, resolveBillingRootOrganizationId, syncOrganizationServiceEntitlements } from '../_shared/entitlements.ts';
import { planByPaddlePrice } from '../_shared/paddleConfig.ts';

function hex(bytes: Uint8Array) { return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }

async function signatureValid(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(';').map((part) => part.trim().split('=')));
  const timestamp = Number(parts.ts);
  const signatures = String(parts.h1 || '').split(',').filter(Boolean);
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}:${payload}`))));
  return signatures.some((signature) => {
    if (signature.length !== digest.length) return false;
    let difference = 0;
    for (let index = 0; index < digest.length; index += 1) difference |= signature.charCodeAt(index) ^ digest.charCodeAt(index);
    return difference === 0;
  });
}

const itemPriceId = (item: any) => item?.price?.id || item?.price_id || null;
const itemQuantity = (item: any) => Number(item?.quantity || 1);
const customData = (data: any) => data?.custom_data || data?.customData || {};

async function checkoutRequest(admin: any, token: string) {
  const { data, error } = await admin.from('paddle_checkout_requests').select('*').eq('checkout_token', token).maybeSingle();
  if (error) throw error;
  if (!data || data.expires_at < new Date().toISOString()) return null;
  return data;
}

async function resolveOrganizationId(admin: any, data: any) {
  const custom = customData(data);
  const checkoutToken = String(custom.checkout_token || '');
  if (checkoutToken) {
    const request = await checkoutRequest(admin, checkoutToken);
    if (!request) return null;
    const firstItem = Array.isArray(data?.items) ? data.items[0] : null;
    const priceId = itemPriceId(firstItem);
    if (priceId && (priceId !== request.price_id || itemQuantity(firstItem) !== request.seat_count)) return null;
    return request.organization_id;
  }
  if (data?.id && String(data?.id).startsWith('sub_')) {
    const { data: existing } = await admin.from('organization_subscriptions').select('organization_id')
      .eq('billing_provider', 'paddle').eq('provider_subscription_id', data.id).maybeSingle();
    if (existing?.organization_id) return existing.organization_id;
  }
  if (data?.subscription_id) {
    const { data: existing } = await admin.from('organization_subscriptions').select('organization_id')
      .eq('billing_provider', 'paddle').eq('provider_subscription_id', data.subscription_id).maybeSingle();
    if (existing?.organization_id) return existing.organization_id;
  }
  return null;
}

async function syncSubscription(admin: any, event: any, organizationId: string) {
  const billingRootOrganizationId = await resolveBillingRootOrganizationId(admin, organizationId);
  const subscription = event.data;
  const item = Array.isArray(subscription?.items) ? subscription.items[0] : null;
  const priceId = itemPriceId(item);
  const mapped = priceId ? planByPaddlePrice[priceId] : null;
  if (!item || !mapped) throw new Error('Paddle subscription contains an unsupported price.');
  const scheduledChange = subscription.scheduled_change || null;
  const currentPeriod = subscription.current_billing_period || {};
  const status = event.event_type === 'subscription.canceled' ? 'canceled' : subscription.status || 'unknown';
  const { error } = await admin.from('organization_subscriptions').upsert({
    organization_id: billingRootOrganizationId,
    plan: mapped.plan,
    billing_cycle: mapped.billingCycle,
    status,
    seat_count: itemQuantity(item),
    billing_provider: 'paddle',
    provider_customer_id: subscription.customer_id || null,
    provider_subscription_id: subscription.id,
    provider_item_id: item?.id || null,
    provider_price_id: priceId,
    current_period_start: currentPeriod.starts_at || null,
    current_period_end: currentPeriod.ends_at || null,
    next_billed_at: subscription.next_billed_at || currentPeriod.ends_at || null,
    scheduled_change: scheduledChange,
  }, { onConflict: 'organization_id' });
  if (error) throw error;
  await admin.from('organizations').update({ requested_seats: itemQuantity(item) }).eq('id', billingRootOrganizationId);
  await reconcileOrganizationFamilyForPlan(admin, billingRootOrganizationId, lifecyclePlanForSubscription(mapped.plan, status));
  await syncOrganizationServiceEntitlements(admin, billingRootOrganizationId);
  await recordAudit(admin, billingRootOrganizationId, `billing.${event.event_type.replaceAll('.', '_')}`, `Paddle subscription state synchronized (${status}).`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const rawBody = await req.text();
  try {
    const secret = Deno.env.get('PADDLE_NOTIFICATION_WEBHOOK_SECRET');
    const signature = req.headers.get('Paddle-Signature') || '';
    if (!secret || !(await signatureValid(rawBody, signature, secret))) return json({ error: 'Invalid Paddle webhook signature.' }, 500);
    const event = JSON.parse(rawBody);
    if (!event?.event_id || !event?.event_type) return json({ error: 'Malformed Paddle event.' }, 500);
    const admin = adminClient();
    const { data: delivery, error: insertError } = await admin.from('paddle_webhook_events')
      .upsert({ paddle_event_id: event.event_id, event_type: event.event_type, payload: event.data, processed_at: null }, { onConflict: 'paddle_event_id', ignoreDuplicates: true })
      .select('id,processed_at').maybeSingle();
    if (insertError) throw insertError;
    if (!delivery) {
      const { data: previous, error } = await admin.from('paddle_webhook_events').select('id,processed_at').eq('paddle_event_id', event.event_id).single();
      if (error) throw error;
      if (previous.processed_at) return json({ received: true, duplicate: true });
    }

    const organizationId = await resolveOrganizationId(admin, event.data);
    if (organizationId && event.event_type.startsWith('subscription.')) await syncSubscription(admin, event, organizationId);
    if (organizationId && event.event_type === 'transaction.payment_failed') {
      await admin.from('organization_subscriptions').update({ status: 'past_due' }).eq('organization_id', organizationId).eq('billing_provider', 'paddle');
      await syncOrganizationServiceEntitlements(admin, organizationId);
      await recordAudit(admin, organizationId, 'billing.payment_failed', 'Paddle reported a failed payment; workspace billing is past due.');
    }
    if (organizationId && event.event_type === 'transaction.completed') await recordAudit(admin, organizationId, 'billing.transaction_completed', 'Paddle completed a transaction; waiting for subscription state synchronization.');
    await admin.from('paddle_webhook_events').update({ organization_id: organizationId, processed_at: new Date().toISOString() }).eq('paddle_event_id', event.event_id);
    return json({ received: true });
  } catch (error: any) {
    console.error('[paddle-webhook]', error);
    return json({ error: error.message || 'Paddle webhook processing failed.' }, 500);
  }
});
