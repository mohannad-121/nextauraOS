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
          organizations ( id, name, slug, created_by, created_at )
        `)
        .eq('user_id', userId)
        .eq('status', 'Active');

      if (error) {
        console.error('[Organization Service] Fetch orgs error:', error);
        throw new Error(`Failed to query user organizations: ${error.message}`);
      }

      if (!data) return [];

      return data
        .map((row: any) => row.organizations)
        .filter((org: any) => Boolean(org && org.id))
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
        }));
    } catch (err: any) {
      console.error('[Organization Service] Exception fetching orgs:', err);
      throw err;
    }
  },

  /**
   * Atomically create workspace organization + owner membership via PostgreSQL RPC
   */
  async createOrganizationForUser(userId: string, orgName: string): Promise<Organization> {
    if (!userId || !orgName) {
      throw new Error('User ID and Organization Name are required to create a workspace.');
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.rpc('create_user_workspace', {
        p_user_id: userId,
        p_org_name: orgName,
      });

      if (error || !data) {
        console.error('[Organization Service] Atomic workspace creation RPC failed:', error);
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
      };
    }

    throw new Error('Supabase client is not configured.');
  },
};
