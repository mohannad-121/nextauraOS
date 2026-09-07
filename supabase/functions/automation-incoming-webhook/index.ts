import { adminClient } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';
import { hashIncomingWebhookToken, readIncomingWebhookJson } from '../_shared/incoming-webhook.ts';

function response(error: string, status: number) { return Response.json({ success: false, error }, { status }); }
function clientIp(req: Request) { return (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim().slice(0, 64); }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return response('Method not allowed.', 405);
  if (!req.headers.get('content-type')?.toLowerCase().includes('application/json')) return response('Content-Type must be application/json.', 415);
  try {
    const token = req.headers.get('x-nextaura-webhook-token') || '';
    const tokenHash = await hashIncomingWebhookToken(token);
    const admin = adminClient();
    const { data: workflow, error } = await admin.from('automation_workflows').select('id,organization_id,enabled,trigger_type').eq('incoming_webhook_token_hash', tokenHash).maybeSingle();
    if (error || !workflow || !workflow.enabled || workflow.trigger_type !== 'incoming_webhook') return response('Webhook request rejected.', 401);
    const { data: count, error: limitError } = await admin.rpc('consume_automation_incoming_webhook_rate_limit', { p_token_hash: tokenHash, p_client_ip: clientIp(req), p_limit: 60 });
    if (limitError || Number(count) > 60) return response('Webhook request rejected.', 429);
    const entitlements = await getOrganizationEntitlements(admin, workflow.organization_id);
    if (!entitlements.access_active || !entitlements.automation_access) return response('Webhook request rejected.', 403);
    const payload = await readIncomingWebhookJson(req);
    if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > 8192) return response('Webhook payload is too large.', 413);
    const headerKey = req.headers.get('idempotency-key') || crypto.randomUUID();
    if (headerKey.length > 256) return response('Webhook request rejected.', 400);
    const idempotencyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(headerKey));
    const idempotencyKey = Array.from(new Uint8Array(idempotencyHash), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const { error: insertError } = await admin.from('automation_events').insert({
      organization_id: workflow.organization_id, event_type: 'incoming_webhook', entity_type: 'webhook', entity_id: null,
      payload, source: 'incoming_webhook', dedupe_key: `incoming-webhook:${workflow.id}:${idempotencyKey}`,
    });
    if (insertError?.code === '23505') return Response.json({ success: true, duplicate: true }, { status: 200 });
    if (insertError) throw insertError;
    return Response.json({ success: true }, { status: 202 });
  } catch (error: any) {
    const message = String(error?.message || 'Webhook request rejected.');
    if (message.includes('too large')) return response(message, 413);
    if (message.includes('valid JSON') || message.includes('JSON object')) return response(message, 400);
    return response('Webhook request rejected.', 401);
  }
});
