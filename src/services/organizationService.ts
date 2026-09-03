import { isSupabaseConfigured, supabase } from './supabaseClient';
import type { Organization } from '../types';

export interface UserOrganizationMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  userRole: string;
  memberStatus: string;
}

export const organizationService = {
  /**
   * Fetch all organizations that the authenticated user belongs to
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      // Query organization_members JOIN organizations
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          status,
          organization:organizations (
            id,
            name,
            slug,
            legal_name,
            tax_id,
            logo_url,
            base_currency,
            country,
            created_at
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'Active');

      if (error) {
        console.error('Error fetching user organizations:', error);
        return [];
      }

      if (!data || data.length === 0) return [];

      return data.map((item: any) => {
        const org = item.organization;
        return {
          id: org.id,
          name: org.name,
          legalName: org.legal_name || `${org.name} Inc.`,
          logo: org.logo_url || '⚡',
          taxId: org.tax_id || 'US-000000',
          registrationNumber: 'REG-100',
          baseCurrency: (org.base_currency as any) || 'USD',
          country: org.country || 'United States',
          address: '100 Business Center',
          fiscalYearEnd: '12-31',
        };
      });
    } catch (err) {
      console.error('Failed to get user organizations:', err);
      return [];
    }
  },

  /**
   * Create a brand new organization workspace for a user
   */
  async createOrganizationForUser(
    userId: string,
    orgName: string,
    details?: { industry?: string; country?: string }
  ): Promise<Organization> {
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

    if (isSupabaseConfigured()) {
      try {
        // 1. Insert organizations row
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            slug: slug,
            legal_name: `${orgName} Inc.`,
            country: details?.country || 'United States',
            base_currency: 'USD',
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // 2. Insert organization_members row with role = Owner
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: orgData.id,
            user_id: userId,
            role: 'Owner',
            status: 'Active',
          });

        if (memberError) console.error('Error creating org member:', memberError);

        return {
          id: orgData.id,
          name: orgData.name,
          legalName: orgData.legal_name || `${orgName} Inc.`,
          logo: '⚡',
          taxId: 'US-000000',
          registrationNumber: 'REG-100',
          baseCurrency: 'USD',
          country: orgData.country || 'United States',
          address: '100 Corporate Way',
          fiscalYearEnd: '12-31',
        };
      } catch (err) {
        console.error('Error creating database organization:', err);
      }
    }

    // Client-side fallback if offline/no supabase
    const localId = `org_${Math.random().toString(36).substring(2, 9)}`;
    return {
      id: localId,
      name: orgName,
      legalName: `${orgName} Inc.`,
      logo: '⚡',
      taxId: 'US-000000',
      registrationNumber: 'REG-100',
      baseCurrency: 'USD',
      country: details?.country || 'United States',
      address: '100 Corporate Way',
      fiscalYearEnd: '12-31',
    };
  },
};
