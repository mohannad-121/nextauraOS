import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface OrganizationService {
  id: string;
  organizationId: string;
  serviceKey: string;
  status: 'active' | 'suspended';
  activatedAt: string;
}

export const entitlementService = {
  /**
   * Check if current user is a NextAura Platform Admin
   * Strictly returns false on missing record or database error. NO fail-open behavior.
   */
  async checkIsPlatformAdmin(userId: string): Promise<boolean> {
    if (!userId || !isSupabaseConfigured()) return false;
    try {
      const { data, error } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return false;
      return data.user_id === userId;
    } catch (err) {
      console.error('[Entitlement] Platform admin check error:', err);
      return false;
    }
  },

  /**
   * Fetch active service keys for an organization
   * Successful query with 0 rows returns [] (ZERO services).
   * Database errors THROW an exception.
   */
  async getActiveOrgServices(orgId: string): Promise<string[]> {
    if (!orgId) return [];

    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('organization_services')
      .select('service_key')
      .eq('organization_id', orgId)
      .eq('status', 'active');

    if (error) {
      console.error('[Entitlement] Failed to query organization services:', error);
      throw new Error(`Failed to load organization services: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((d) => d.service_key);
  },

  /**
   * Atomically activate organization services AND complete profile onboarding
   * via trusted server-side Edge Function + PostgreSQL RPC.
   * NO direct browser writes to organization_services or profiles!
   */
  async activateOrganizationServices(orgId: string, serviceKeys: string[]): Promise<void> {
    if (!orgId) {
      throw new Error('Organization ID is required for service activation.');
    }

    if (serviceKeys.length === 0) {
      return;
    }

    if (isSupabaseConfigured()) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('User authentication session expired. Please sign in again.');
      }

      // Routes through trusted Edge Function complete-service-selection
      const { data, error } = await supabase.functions.invoke('complete-service-selection', {
        body: { organizationId: orgId, serviceKeys },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || !data?.success) {
        const errorMessage = data?.error || error?.message || 'Failed to complete service activation.';
        console.error('[Entitlement Error] Trusted service activation failed:', errorMessage);
        throw new Error(errorMessage);
      }
    }
  },

  /**
   * Complete User Onboarding & Service Selection
   * Delegates to trusted Edge Function complete-service-selection.
   */
  async completeUserOnboarding(_userId: string): Promise<void> {
    // Service selection & onboarding completion handled atomically in activateOrganizationServices
  },
};
