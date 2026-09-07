import { authenticate, corsHeaders, json, recordAudit, requireBillingAdmin } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';
import { apiKeyMetadata } from '../_shared/apiKeys.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405);
    const { admin, user } = await authenticate(req);
    const { organizationId, keyId } = await req.json();
    if (!organizationId || !keyId) return json({ success: false, error: 'Organization and API key are required.' }, 400);
    await requireBillingAdmin(admin, user.id, organizationId);
    const entitlements = await getOrganizationEntitlements(admin, organizationId);
    if (!entitlements.access_active || !entitlements.api_access) return json({ success: false, error: 'External API is available on the Custom plan.' }, 403);
    const { data: key, error } = await admin.from('organization_api_keys').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', keyId).eq('organization_id', organizationId).eq('status', 'active').select('id, name, key_prefix, scopes, created_by, created_at, last_used_at, revoked_at, status').maybeSingle();
    if (error) throw error;
    if (!key) return json({ success: false, error: 'Active API key not found in this workspace.' }, 404);
    await recordAudit(admin, organizationId, 'api_key.revoked', `External API key "${key.name}" (${key.key_prefix}) was revoked.`);
    return json({ success: true, metadata: apiKeyMetadata(key) });
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Unable to revoke API key.' }, 400);
  }
});
