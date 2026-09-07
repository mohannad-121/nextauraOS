import { adminClient, corsHeaders, json } from '../_shared/billing.ts';
import { apiKeyMode, hashApiKey, isApiKeyFormat, type ApiScope } from '../_shared/apiKeys.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';

type Resource = 'employees' | 'contacts' | 'invoices' | 'expenses' | 'payroll' | 'documents' | 'approvals';

const resources: Record<Resource, { scope: ApiScope; table?: string; columns?: string }> = {
  employees: { scope: 'employees:read', table: 'employees', columns: 'id,employee_number,name,email,phone,avatar,job_title,department,work_location,start_date,employment_type,status,manager_name,created_at' },
  contacts: { scope: 'contacts:read', table: 'contacts', columns: 'id,name,email,phone,company_name,type,roles,status,created_at' },
  invoices: { scope: 'invoices:read', table: 'invoices', columns: 'id,invoice_number,customer_name,customer_email,issue_date,due_date,subtotal,tax_total,total_amount,amount_paid,status,created_at' },
  expenses: { scope: 'expenses:read', table: 'expenses', columns: 'id,employee_name,title,merchant,date,category,amount,currency,status,approved_by,created_at' },
  // Payroll deliberately exposes run-level operational totals only; no employee compensation or payslips.
  payroll: { scope: 'payroll:read', table: 'payroll_runs', columns: 'id,period,pay_date,employee_count,total_gross,total_deductions,total_net,status,created_at' },
  // These UI modules do not yet persist tenant records, so the routes are explicit rather than querying arbitrary sources.
  documents: { scope: 'documents:read' },
  approvals: { scope: 'approvals:read' },
};

function requestResource(req: Request): Resource | null {
  const path = new URL(req.url).pathname.split('/').filter(Boolean);
  const functionIndex = path.lastIndexOf('external-api');
  const value = functionIndex >= 0 ? path[functionIndex + 1] : null;
  return value && value in resources ? value as Resource : null;
}

function boundedLimit(value: string | null) {
  if (value === null || value.trim() === '') return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 50;
  return Math.min(parsed, 100);
}

function boundedOffset(value: string | null) {
  if (value === null || value.trim() === '') return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 10_000);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
  const resource = requestResource(req);
  if (!resource) return json({ error: 'Unknown resource.' }, 404);
  try {
    const authorization = req.headers.get('Authorization') || '';
    console.log(JSON.stringify({ event: 'external_api_request_arrived', authorization_present: Boolean(authorization), requested_scope: resources[resource].scope, expected_mode: apiKeyMode() }));
    // HTTP permits optional whitespace around a Bearer credential. The format validator below
    // still rejects empty values, multiple tokens, and all non-NextAura key strings.
    const bearer = authorization.match(/^Bearer\s+(.+?)\s*$/i);
    const rawKey = bearer?.[1]?.trim() || '';
    console.log(JSON.stringify({ event: 'external_api_key_extracted', extracted_key_length: rawKey.length, key_prefix: rawKey.slice(0, 17), format_valid: isApiKeyFormat(rawKey) }));
    if (!isApiKeyFormat(rawKey)) return json({ error: 'Invalid API key.' }, 401);
    const admin = adminClient();
    const keyHash = await hashApiKey(rawKey);
    console.log(JSON.stringify({ event: 'external_api_key_hash_computed', key_prefix: rawKey.slice(0, 17), hash_length: keyHash.length, hash_prefix: keyHash.slice(0, 8) }));
    console.log(JSON.stringify({ event: 'external_api_key_hash_lookup_attempted', key_prefix: rawKey.slice(0, 17) }));
    const { data: apiKey, error: keyError } = await admin.from('organization_api_keys').select('id,organization_id,scopes,status,revoked_at').eq('key_hash', keyHash).eq('status', 'active').is('revoked_at', null).maybeSingle();
    if (keyError) throw keyError;
    console.log(JSON.stringify({ event: 'external_api_key_lookup_result', key_prefix: rawKey.slice(0, 17), matched: Boolean(apiKey) }));
    if (!apiKey) {
      const { data: candidates, error: candidatesError } = await admin.from('organization_api_keys')
        .select('id,key_prefix,key_hash,status,revoked_at')
        .eq('key_prefix', rawKey.slice(0, 17));
      if (candidatesError) throw candidatesError;
      console.log(JSON.stringify({
        event: 'external_api_key_prefix_candidates',
        key_prefix: rawKey.slice(0, 17),
        count: candidates?.length || 0,
        candidates: (candidates || []).map((candidate: { id: string; key_prefix: string; key_hash: string; status: string; revoked_at: string | null }) => ({
          id: candidate.id,
          key_prefix: candidate.key_prefix,
          hash_length: candidate.key_hash.length,
          status: candidate.status,
          revoked_at_present: Boolean(candidate.revoked_at),
        })),
      }));
    }
    if (!apiKey) return json({ error: 'Invalid API key.' }, 401);
    const entitlements = await getOrganizationEntitlements(admin, apiKey.organization_id);
    if (!entitlements.access_active || !entitlements.api_access) return json({ error: 'External API is available on the Custom plan.' }, 403);
    const config = resources[resource];
    if (!apiKey.scopes.includes(config.scope)) return json({ error: `This API key does not include ${config.scope}.` }, 403);
    const { data: allowed, error: rateError } = await admin.rpc('consume_organization_api_key_rate_limit', { p_api_key_id: apiKey.id });
    if (rateError) throw rateError;
    if (!allowed) return json({ error: 'Rate limit exceeded. Try again in one minute.' }, 429);
    await admin.from('organization_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id);
    if (!config.table || !config.columns) return json({ error: `${resource} records are not persisted in NextAura yet.`, code: 'RESOURCE_NOT_AVAILABLE' }, 501);
    const url = new URL(req.url);
    const limit = boundedLimit(url.searchParams.get('limit'));
    const offset = boundedOffset(url.searchParams.get('offset'));
    const { data, error } = await admin.from(config.table).select(config.columns).eq('organization_id', apiKey.organization_id).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return json({ data: data || [], meta: { resource, count: data?.length || 0, limit, offset } });
  } catch (error: any) {
    // Never include the Authorization header, raw key, or key hash in an error response or audit record.
    return json({ error: error.message === 'External API key hashing is not configured.' ? 'External API is temporarily unavailable.' : 'Unable to process external API request.' }, 500);
  }
});
