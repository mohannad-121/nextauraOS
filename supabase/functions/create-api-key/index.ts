import { authenticate, corsHeaders, json, recordAudit, requireBillingAdmin } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';
import { apiKeyMetadata, createApiKey, hashApiKey, normalizeScopes } from '../_shared/apiKeys.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405);
    const { admin, user } = await authenticate(req);
    const body = await req.json();
    const organizationId = String(body.organizationId || '');
    const name = String(body.name || '').trim();
    const scopes = normalizeScopes(body.scopes);
    if (!organizationId || !name || name.length > 80 || !scopes) return json({ success: false, error: 'A key name and one or more valid read scopes are required.' }, 400);
    await requireBillingAdmin(admin, user.id, organizationId);
    const entitlements = await getOrganizationEntitlements(admin, organizationId);
    if (!entitlements.access_active || !entitlements.api_access) return json({ success: false, error: 'External API is available on the Custom plan.' }, 403);

    const { rawKey, keyPrefix } = createApiKey();
    const keyHash = await hashApiKey(rawKey);
    const creationSelfCheck = keyHash === await hashApiKey(rawKey);
    console.log(JSON.stringify({ event: 'external_api_key_created', key_prefix: keyPrefix, hash_length: keyHash.length, creation_self_check: creationSelfCheck }));
    if (!creationSelfCheck) throw new Error('External API key creation self-check failed.');
    const { data: key, error } = await admin.from('organization_api_keys').insert({
      organization_id: organizationId, name, key_prefix: keyPrefix, key_hash: keyHash, scopes, created_by: user.id,
    }).select('id, name, key_prefix, scopes, created_by, created_at, last_used_at, revoked_at, status').single();
    if (error) throw error;
    await recordAudit(admin, organizationId, 'api_key.created', `External API key "${name}" (${keyPrefix}) was created.`);
    return json({ success: true, key: rawKey, metadata: apiKeyMetadata(key) }, 201);
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Unable to create API key.' }, 400);
  }
});
