import { isSupabaseConfigured, supabase } from './supabaseClient';
import type { Organization } from '../types';

export const organizationService = {
  /**
   * Fetch all organizations current user belongs to
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    if (!userId || !isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations ( id, name, slug, created_by, created_at, lifecycle_status, billing_root_organization_id )
        `)
        .eq('user_id', userId)
        .eq('status', 'Active')
        .order('created_at', { ascending: true })
        .order('organization_id', { ascending: true });

      if (error) {
        console.error('[Organization Service] Fetch orgs error:', error);
        throw new Error(`Failed to query user organizations: ${error.message}`);
      }

      if (!data) return [];

      return data
        .filter((row: any) => Boolean(row.organizations && row.organizations.id))
        .map((row: any) => ({
          ...row.organizations,
          membershipRole: row.role,
        }))
        .map((org: any) => ({
          id: org.id,
          name: org.name,
          legalName: org.name,
          logo: '',
          taxId: '',
          registrationNumber: '',
          baseCurrency: 'USD',
          country: 'United States',
          address: '',
          fiscalYearEnd: '12-31',
          lifecycleStatus: org.lifecycle_status,
          billingRootOrganizationId: org.billing_root_organization_id,
          membershipRole: org.membershipRole,
        }));
    } catch (err: any) {
      console.error('[Organization Service] Exception fetching orgs:', err);
      throw err;
    }
  },

  /** Resolve the database-authoritative active organization for this session. */
  async resolveActiveOrganization(organizations: Organization[]): Promise<Organization | null> {
    if (!isSupabaseConfigured()) return organizations[0] || null;
    const { data: organizationId, error } = await supabase.rpc('resolve_active_organization');
    if (error) throw new Error(`Failed to resolve active organization: ${error.message}`);
    if (!organizationId) return null;
    const organization = organizations.find((candidate) => candidate.id === organizationId);
    if (!organization) throw new Error('Resolved active organization is not available to this user.');
    return organization;
  },

  /** Persist a validated, membership-scoped active organization preference. */
  async setActiveOrganization(organizationId: string): Promise<void> {
    if (!organizationId || !isSupabaseConfigured()) return;
    const { error } = await supabase.rpc('set_active_organization', {
      p_organization_id: organizationId,
    });
    if (error) throw new Error(`Failed to set active organization: ${error.message}`);
  },

  /**
   * Atomically create workspace organization + owner membership via secure parameterless RPC
   * User identity derived strictly from server-authenticated auth.uid().
   */
  async createOrganizationForUser(orgName: string): Promise<Organization> {
    if (!orgName) {
      throw new Error('Organization Name is required to create a workspace.');
    }

    if (isSupabaseConfigured()) {
      // ITEM 6: Parameterless user identity. Uses auth.uid() inside database function.
      const { data, error } = await supabase.rpc('create_user_workspace', {
        p_org_name: orgName,
      });

      if (error || !data) {
        console.error('[Organization Service] Secure workspace creation RPC failed:', error);
        throw new Error(`Failed to create workspace: ${error?.message || 'Unknown database error'}`);
      }

      return {
        id: data.id,
        name: data.name,
        legalName: data.name,
        logo: '',
        taxId: '',
        registrationNumber: '',
        baseCurrency: 'USD',
        country: 'United States',
        address: '',
        fiscalYearEnd: '12-31',
        lifecycleStatus: data.lifecycle_status,
        billingRootOrganizationId: data.billing_root_organization_id,
      };
    }

    throw new Error('Supabase client is not configured.');
  },

  /**
   * Create a child company through the server-authorized workspace RPC.
   * The RPC derives identity, validates the billing root Owner and Custom plan,
   * and creates the company plus its services atomically.
   */
  async createChildOrganization(orgName: string, billingRootOrganizationId: string): Promise<Organization> {
    const name = orgName.trim();
    if (!name) throw new Error('Company name is required.');
    if (!billingRootOrganizationId) throw new Error('A billing root is required to create a company.');
    if (!isSupabaseConfigured()) throw new Error('Supabase client is not configured.');

    const { data, error } = await supabase.rpc('create_user_workspace', {
      p_org_name: name,
      p_billing_root_organization_id: billingRootOrganizationId,
    });
    if (error || !data) {
      throw new Error(error?.message || 'Unable to create the company.');
    }

    return {
      id: data.id,
      name: data.name,
      legalName: data.name,
      logo: '',
      taxId: '',
      registrationNumber: '',
      baseCurrency: 'USD',
      country: 'United States',
      address: '',
      fiscalYearEnd: '12-31',
      lifecycleStatus: data.lifecycle_status,
      billingRootOrganizationId: data.billing_root_organization_id,
      membershipRole: 'Owner',
    };
  },
};
