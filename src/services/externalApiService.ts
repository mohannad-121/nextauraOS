import { supabase, isSupabaseConfigured } from './supabaseClient';

export const EXTERNAL_API_SCOPES = ['employees:read', 'contacts:read', 'invoices:read', 'expenses:read', 'payroll:read', 'documents:read', 'approvals:read'] as const;
export type ExternalApiScope = typeof EXTERNAL_API_SCOPES[number];

export interface OrganizationApiKey {
  id: string; name: string; key_prefix: string; scopes: ExternalApiScope[]; created_by: string; created_at: string;
  last_used_at: string | null; revoked_at: string | null; status: 'active' | 'revoked';
}

async function invoke<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error || !data?.success) {
    const response = error?.context instanceof Response ? await error.context.clone().json().catch(() => null) : null;
    throw new Error(data?.error || response?.error || error?.message || 'External API request failed.');
  }
  return data as T;
}

export const externalApiService = {
  async list(organizationId: string) { return (await invoke<{ keys: OrganizationApiKey[] }>('list-api-keys', { organizationId })).keys; },
  async create(organizationId: string, name: string, scopes: ExternalApiScope[]) { return invoke<{ key: string; metadata: OrganizationApiKey }>('create-api-key', { organizationId, name, scopes }); },
  async revoke(organizationId: string, keyId: string) { return invoke<{ metadata: OrganizationApiKey }>('revoke-api-key', { organizationId, keyId }); },
};
