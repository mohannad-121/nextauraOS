import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { entitlementService } from '../../services/entitlementService';

export type CompanyCreationAccess = 'loading' | 'custom_owner' | 'upgrade' | 'none' | 'error';

/** UI-only affordance. The creation RPC remains the authorization authority. */
export function useCompanyCreationAccess(): CompanyCreationAccess {
  const { currentOrg, organizations, refreshOrganizations } = useApp();
  const [access, setAccess] = useState<CompanyCreationAccess>('loading');

  useEffect(() => {
    let cancelled = false;
    const resolveAccess = async () => {
      setAccess('loading');
      try {
        const entitlements = await entitlementService.getPlanEntitlements(currentOrg.id);
        if (!entitlements) throw new Error('Company entitlement data is unavailable.');

        const billingRootId = entitlements.billing_root_organization_id;
        // The active organization is authoritative for the root case even
        // before the full membership list has completed its first refresh.
        let billingRoot = currentOrg.id === billingRootId
          ? currentOrg
          : organizations.find((organization) => organization.id === billingRootId);

        // A child context can race the membership-list hydration. Refresh by
        // UUID before deciding the caller lacks a billing-root membership.
        if (!billingRoot) {
          const refreshedOrganizations = await refreshOrganizations();
          billingRoot = refreshedOrganizations.find((organization) => organization.id === billingRootId);
        }

        if (cancelled) return;
        if (!billingRoot) {
          setAccess(currentOrg.membershipRole === 'Owner' ? 'error' : 'none');
          return;
        }
        if (billingRoot.membershipRole !== 'Owner') {
          setAccess('none');
          return;
        }
        if (billingRoot.lifecycleStatus !== 'active') {
          setAccess('none');
          return;
        }
        if (entitlements.plan === 'custom' && entitlements.access_active) {
          setAccess('custom_owner');
          return;
        }
        setAccess(entitlements.plan === 'custom' ? 'none' : 'upgrade');
      } catch {
        if (!cancelled) setAccess(currentOrg.membershipRole === 'Owner' ? 'error' : 'none');
      }
    };
    void resolveAccess();
    return () => { cancelled = true; };
  }, [currentOrg, organizations, refreshOrganizations]);

  return access;
}
