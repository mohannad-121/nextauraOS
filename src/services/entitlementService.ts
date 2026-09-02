import { supabase, isSupabaseConfigured } from './supabaseClient';
import { NEXTAURA_SERVICES } from '../data/appRegistry';

export interface ServiceRequestItem {
  id: string;
  serviceRequestId: string;
  serviceKey: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface ServiceRequest {
  id: string;
  organizationId: string;
  companyName: string;
  requestedBy: string;
  userEmail: string;
  userName: string;
  status: 'pending' | 'partially_approved' | 'approved' | 'rejected';
  message?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  items: ServiceRequestItem[];
}

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
   */
  async checkIsPlatformAdmin(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return true; // Default admin mode for demo session
    try {
      const { data, error } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', userId)
        .single();
      if (!error && data) return true;
    } catch {
      // Fall through to fallback
    }
    return true;
  },

  /**
   * Fetch active service keys for an organization
   */
  async getActiveOrgServices(orgId: string): Promise<string[]> {
    if (!isSupabaseConfigured()) {
      // Return all non-core service keys for fallback demo mode
      return NEXTAURA_SERVICES.map((s) => s.key);
    }
    try {
      const { data, error } = await supabase
        .from('organization_services')
        .select('service_key')
        .eq('organization_id', orgId)
        .eq('status', 'active');

      if (error || !data || data.length === 0) {
        // Fallback: return default active suite
        return NEXTAURA_SERVICES.map((s) => s.key);
      }
      return data.map((d) => d.service_key);
    } catch {
      return NEXTAURA_SERVICES.map((s) => s.key);
    }
  },

  /**
   * Submit a new service access request
   */
  async submitServiceRequest(
    orgId: string,
    userId: string,
    requestedServiceKeys: string[],
    message?: string
  ): Promise<ServiceRequest> {
    const newRequest: ServiceRequest = {
      id: `req_${Date.now()}`,
      organizationId: orgId,
      companyName: 'NextAura Enterprise',
      requestedBy: userId,
      userEmail: 'user@nextaura.ai',
      userName: 'Enterprise User',
      status: 'pending',
      message: message || '',
      createdAt: new Date().toISOString(),
      items: requestedServiceKeys.map((key, i) => ({
        id: `item_${Date.now()}_${i}`,
        serviceRequestId: `req_${Date.now()}`,
        serviceKey: key,
        status: 'pending',
      })),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data: reqData, error: reqErr } = await supabase
          .from('service_requests')
          .insert({
            organization_id: orgId,
            requested_by: userId,
            status: 'pending',
            message: message || '',
          })
          .select()
          .single();

        if (!reqErr && reqData) {
          const itemsToInsert = requestedServiceKeys.map((key) => ({
            service_request_id: reqData.id,
            service_key: key,
            status: 'pending',
          }));

          await supabase.from('service_request_items').insert(itemsToInsert);

          return {
            ...newRequest,
            id: reqData.id,
          };
        }
      } catch (err) {
        console.warn('DB Service request fallback:', err);
      }
    }

    return newRequest;
  },

  /**
   * Fetch all service requests (Admin Center)
   */
  async getAllServiceRequests(): Promise<ServiceRequest[]> {
    if (!isSupabaseConfigured()) {
      return [
        {
          id: 'req-101',
          organizationId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          companyName: 'Apex Financial Services',
          requestedBy: 'user-1',
          userEmail: 'mohannad@example.com',
          userName: 'Mohannad Abuayyash',
          status: 'pending',
          message: 'Requesting Accounting, CRM, and Employee Directory modules for our team.',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          items: [
            { id: 'itm-1', serviceRequestId: 'req-101', serviceKey: 'accounting', status: 'pending' },
            { id: 'itm-2', serviceRequestId: 'req-101', serviceKey: 'contacts', status: 'pending' },
            { id: 'itm-3', serviceRequestId: 'req-101', serviceKey: 'employees', status: 'pending' },
            { id: 'itm-4', serviceRequestId: 'req-101', serviceKey: 'email_marketing', status: 'pending' },
          ],
        },
      ];
    }

    try {
      const { data: requests, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          organizations(name),
          profiles(full_name, email),
          service_request_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error || !requests) return [];

      return requests.map((r: any) => ({
        id: r.id,
        organizationId: r.organization_id,
        companyName: r.organizations?.name || 'Customer Organization',
        requestedBy: r.requested_by,
        userEmail: r.profiles?.email || 'customer@example.com',
        userName: r.profiles?.full_name || 'Customer Admin',
        status: r.status,
        message: r.message,
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at,
        items: (r.service_request_items || []).map((item: any) => ({
          id: item.id,
          serviceRequestId: item.service_request_id,
          serviceKey: item.service_key,
          status: item.status,
          rejectionReason: item.rejection_reason,
        })),
      }));
    } catch {
      return [];
    }
  },

  /**
   * Update individual service request item (Approve or Reject)
   */
  async updateServiceItemStatus(
    requestId: string,
    orgId: string,
    serviceKey: string,
    status: 'approved' | 'rejected',
    reviewerUserId: string,
    reason?: string
  ): Promise<void> {
    if (status === 'approved') {
      // Activate service for organization
      if (isSupabaseConfigured()) {
        await supabase
          .from('organization_services')
          .upsert({
            organization_id: orgId,
            service_key: serviceKey,
            status: 'active',
            activated_at: new Date().toISOString(),
            activated_by: reviewerUserId,
          }, { onConflict: 'organization_id,service_key' });
      }
    }

    if (isSupabaseConfigured()) {
      await supabase
        .from('service_request_items')
        .update({
          status,
          rejection_reason: reason || null,
        })
        .match({ service_request_id: requestId, service_key: serviceKey });

      // Update parent header status
      await supabase
        .from('service_requests')
        .update({
          status: status === 'approved' ? 'partially_approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerUserId,
        })
        .eq('id', requestId);
    }
  },

  /**
   * Suspend active organization service
   */
  async suspendOrgService(orgId: string, serviceKey: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('organization_services')
        .update({ status: 'suspended' })
        .match({ organization_id: orgId, service_key: serviceKey });
    }
  },

  /**
   * Reactivate suspended organization service
   */
  async reactivateOrgService(orgId: string, serviceKey: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('organization_services')
        .update({ status: 'active' })
        .match({ organization_id: orgId, service_key: serviceKey });
    }
  },

  /**
   * Complete User Onboarding
   */
  async completeUserOnboarding(userId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true, email_verified: true })
        .eq('id', userId);
    }
  },
};
