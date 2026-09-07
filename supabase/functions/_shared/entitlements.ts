const ACCESS_STATUSES = new Set(['active', 'trialing', 'past_due']);

export interface PlanCapabilities {
  plan: 'one_app_free' | 'standard' | 'custom';
  access_active: boolean;
  max_apps: number | null;
  all_apps: boolean;
  max_organizations: number | null;
  api_access: boolean;
  automation_access: boolean;
  customization_access: boolean;
  support_tier: 'community' | 'standard' | 'priority';
  ai_access: boolean;
}

export async function getOrganizationEntitlements(admin: any, organizationId: string): Promise<PlanCapabilities> {
  const { data: subscription, error: subscriptionError } = await admin.from('organization_subscriptions').select('plan,status').eq('organization_id', organizationId).maybeSingle();
  if (subscriptionError) throw subscriptionError;
  const plan = (subscription?.plan || 'one_app_free') as PlanCapabilities['plan'];
  const { data: capability, error: capabilityError } = await admin.from('plan_capabilities').select('*').eq('plan', plan).single();
  if (capabilityError || !capability) throw capabilityError || new Error(`No capabilities configured for ${plan}.`);
  return { ...capability, access_active: subscription ? ACCESS_STATUSES.has(subscription.status) : true } as PlanCapabilities;
}

export async function syncOrganizationServiceEntitlements(admin: any, organizationId: string) {
  const entitlements = await getOrganizationEntitlements(admin, organizationId);
  if (!entitlements.access_active) {
    const { error } = await admin.from('organization_services').update({ status: 'suspended' }).eq('organization_id', organizationId).eq('status', 'active');
    if (error) throw error;
    return entitlements;
  }

  if (entitlements.all_apps) {
    const { data: services, error: servicesError } = await admin.from('services').select('key').eq('is_active', true).in('minimum_plan', entitlements.plan === 'custom' ? ['standard', 'custom'] : ['standard']);
    if (servicesError) throw servicesError;
    if (services?.length) {
      const { error } = await admin.from('organization_services').upsert(services.map((service: { key: string }) => ({ organization_id: organizationId, service_key: service.key, status: 'active', activated_at: new Date().toISOString() })), { onConflict: 'organization_id,service_key' });
      if (error) throw error;
    }
    return entitlements;
  }

  const { data: activeServices, error: activeError } = await admin.from('organization_services').select('service_key,activated_at').eq('organization_id', organizationId).eq('status', 'active').order('activated_at', { ascending: true });
  if (activeError) throw activeError;
  const allowedKeys = new Set((activeServices || []).slice(0, entitlements.max_apps ?? 0).map((service: { service_key: string }) => service.service_key));
  const extraKeys = (activeServices || []).map((service: { service_key: string }) => service.service_key).filter((key: string) => !allowedKeys.has(key));
  if (extraKeys.length) {
    const { error } = await admin.from('organization_services').update({ status: 'suspended' }).eq('organization_id', organizationId).in('service_key', extraKeys);
    if (error) throw error;
  }
  return entitlements;
}
