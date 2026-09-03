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
   * Instantly activate organization services in database
   * Strictly inspects Supabase error and throws on failure.
   */
  async activateOrganizationServices(orgId: string, serviceKeys: string[]): Promise<void> {
    if (!orgId) {
      throw new Error('Organization ID is required for service activation.');
    }

    if (serviceKeys.length === 0) {
      return;
    }

    if (isSupabaseConfigured()) {
      const rows = serviceKeys.map((key) => ({
        organization_id: orgId,
        service_key: key,
        status: 'active',
        activated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('organization_services')
        .upsert(rows, { onConflict: 'organization_id,service_key' });

      if (error) {
        console.error('[Entitlement] Error activating services:', error);
        throw new Error(`Failed to activate services: ${error.message}`);
      }
    }
  },

  /**
   * Complete User Onboarding & Service Selection
   * Strictly checks database mutation error.
   */
  async completeUserOnboarding(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to complete onboarding.');
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('profiles')
        .update({
          initial_service_selection_completed: true,
          onboarding_completed: true,
          email_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[Entitlement] Error updating onboarding profile:', error);
        throw new Error(`Failed to update onboarding profile: ${error.message}`);
      }
    }
  },
};
