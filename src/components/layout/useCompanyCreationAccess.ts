import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { entitlementService, type PlanEntitlements } from '../../services/entitlementService';

export type CompanyCreationAccess = 'custom_owner' | 'upgrade' | 'none';

/** UI-only affordance. The creation RPC remains the authorization authority. */
export function useCompanyCreationAccess(): CompanyCreationAccess {
  const { currentOrg, organizations } = useApp();
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);

  useEffect(() => {
    let cancelled = false;
    entitlementService.getPlanEntitlements(currentOrg.id)
      .then((result) => { if (!cancelled) setEntitlements(result); })
      .catch(() => { if (!cancelled) setEntitlements(null); });
    return () => { cancelled = true; };
  }, [currentOrg.id]);

  const root = organizations.find((organization) => organization.id === entitlements?.billing_root_organization_id);
  if (!entitlements || root?.membershipRole !== 'Owner') return 'none';
  if (entitlements.plan === 'custom' && entitlements.access_active && root.lifecycleStatus === 'active') return 'custom_owner';
  return 'upgrade';
}
