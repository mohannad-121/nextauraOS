import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key, stripe-signature',
};

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

export const adminClient = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function authenticate(req: Request) {
  const header = req.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) throw new Error('Missing Authorization header');
  const token = header.slice(7);
  const admin = adminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) throw new Error('Invalid authentication token');
  return { admin, user, token };
}

export async function requireBillingAdmin(admin: any, userId: string, organizationId: string) {
  const { data, error } = await admin
    .from('organization_members')
    .select('role,status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'Active')
    .maybeSingle();
  if (error || !data || !['Owner', 'Administrator'].includes(data.role)) {
    throw new Error('Only workspace owners and administrators can manage billing');
  }
  return data;
}

export async function stripeRequest(path: string, method = 'POST', values: Record<string, string> = {}) {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY in Supabase Edge Function secrets.');
  const body = new URLSearchParams(values);
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : body,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Stripe request failed (${response.status})`);
  return data;
}

export async function recordAudit(admin: any, organizationId: string, action: string, details: string) {
  await admin.from('audit_logs').insert({ organization_id: organizationId, user_name: 'Stripe Billing', action, details });
}

