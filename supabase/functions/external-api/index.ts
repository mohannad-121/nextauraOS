import { adminClient, corsHeaders, json } from '../_shared/billing.ts';
import { hashApiKey, isApiKeyFormat, type ApiScope } from '../_shared/apiKeys.ts';
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

function boundedNumber(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? Math.min(parsed, maximum) : fallback;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
  const resource = requestResource(req);
  if (!resource) return json({ error: 'Unknown resource.' }, 404);
  try {
    const authorization = req.headers.get('Authorization') || '';
    const bearer = authorization.match(/^Bearer ([^\s]+)$/i);
    const rawKey = bearer?.[1] || '';
    if (!isApiKeyFormat(rawKey)) return json({ error: 'Invalid API key.' }, 401);
    const admin = adminClient();
    const keyHash = await hashApiKey(rawKey);
    const { data: apiKey, error: keyError } = await admin.from('organization_api_keys').select('id,organization_id,scopes,status,revoked_at').eq('key_hash', keyHash).eq('status', 'active').is('revoked_at', null).maybeSingle();
    if (keyError) throw keyError;
    console.info(JSON.stringify({ event: 'external_api_key_lookup', key_prefix: rawKey.slice(0, 17), hash_length: keyHash.length, matched: Boolean(apiKey) }));
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
    const limit = boundedNumber(url.searchParams.get('limit'), 50, 100);
    const offset = boundedNumber(url.searchParams.get('offset'), 0, 10_000);
    const { data, error } = await admin.from(config.table).select(config.columns).eq('organization_id', apiKey.organization_id).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return json({ data: data || [], meta: { resource, count: data?.length || 0, limit, offset } });
  } catch (error: any) {
    // Never include the Authorization header, raw key, or key hash in an error response or audit record.
    return json({ error: error.message === 'External API key hashing is not configured.' ? 'External API is temporarily unavailable.' : 'Unable to process external API request.' }, 500);
  }
});
