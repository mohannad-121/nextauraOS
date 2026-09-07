import { supabase } from './supabaseClient';

export type IntegrationConnection = {
  id: string;
  organization_id: string;
  provider: 'google' | 'slack' | 'meta' | 'generic_api';
  name: string;
  status: 'active' | 'expired' | 'revoked' | 'error';
  auth_type: 'api_key' | 'oauth';
  scopes: string[];
  account_label: string | null;
  expires_at: string | null;
  last_verified_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

async function message(error: any, data: any) {
  if (data?.error) return String(data.error);
  try {
    const response = error?.context;
    if (response instanceof Response) return String((await response.clone().json())?.error || 'Unable to manage connections.');
  } catch { /* Use the safe fallback below. */ }
  const value = String(error?.message || '');
  return value.includes('Edge Function returned a non-2xx status code') ? 'Unable to manage connections.' : value || 'Unable to manage connections.';
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('integration-connections', { body });
  if (error || !data?.success) throw new Error(await message(error, data));
  return data;
}

export const integrationConnectionService = {
  async list(organizationId: string): Promise<IntegrationConnection[]> {
    const data = await call({ operation: 'list', organizationId });
    return data.connections || [];
  },
  createGenericApi: (organizationId: string, name: string, baseUrl: string, secret: string) =>
    call({ operation: 'createGenericApi', organizationId, name, baseUrl, secret }),
  rename: (organizationId: string, connectionId: string, name: string) =>
    call({ operation: 'rename', organizationId, connectionId, name }),
  test: (organizationId: string, connectionId: string) =>
    call({ operation: 'test', organizationId, connectionId }),
  revoke: (organizationId: string, connectionId: string) =>
    call({ operation: 'revoke', organizationId, connectionId }),
  remove: (organizationId: string, connectionId: string) =>
    call({ operation: 'delete', organizationId, connectionId }),
};
