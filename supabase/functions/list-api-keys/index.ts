import { authenticate, corsHeaders, json, requireBillingAdmin } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';
import { apiKeyMetadata } from '../_shared/apiKeys.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405);
    const { admin, user } = await authenticate(req);
    const { organizationId } = await req.json();
    if (!organizationId) return json({ success: false, error: 'Organization is required.' }, 400);
    await requireBillingAdmin(admin, user.id, organizationId);
    const entitlements = await getOrganizationEntitlements(admin, organizationId);
    if (!entitlements.access_active || !entitlements.api_access) return json({ success: false, error: 'External API is available on the Custom plan.' }, 403);
    const { data, error } = await admin.from('organization_api_keys').select('id, name, key_prefix, scopes, created_by, created_at, last_used_at, revoked_at, status').eq('organization_id', organizationId).order('created_at', { ascending: false });
    if (error) throw error;
    return json({ success: true, keys: (data || []).map(apiKeyMetadata) });
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Unable to load API keys.' }, 400);
  }
});
