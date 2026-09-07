import { authenticate, corsHeaders, json } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { admin, user } = await authenticate(req);
    const { organizationId } = await req.json();
    if (!organizationId) return json({ success: false, error: 'Organization ID is required.' }, 400);
    const { data: membership, error: membershipError } = await admin.from('organization_members')
      .select('organization_id').eq('organization_id', organizationId).eq('user_id', user.id).eq('status', 'Active').maybeSingle();
    if (membershipError || !membership) return json({ success: false, error: 'Unauthorized organization access.' }, 403);
    const entitlements = await getOrganizationEntitlements(admin, organizationId);
    const [activeServices, organizations] = await Promise.all([
      admin.from('organization_services').select('service_key').eq('organization_id', organizationId).eq('status', 'active'),
      admin.from('organizations').select('id')
        .or(`id.eq.${entitlements.billing_root_organization_id},billing_root_organization_id.eq.${entitlements.billing_root_organization_id}`),
    ]);
    if (activeServices.error) throw activeServices.error;
    if (organizations.error) throw organizations.error;
    return json({ success: true, entitlements: { ...entitlements, active_services: activeServices.data.map((service: { service_key: string }) => service.service_key), organization_count: organizations.data.length } });
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Unable to resolve plan entitlements.' }, 400);
  }
});
