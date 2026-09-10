import { supabase } from './supabaseClient';

export type IntegrationConnection = {
  id: string;
  organization_id: string;
  provider: 'google' | 'github' | 'slack' | 'meta' | 'generic_api';
  name: string;
  status: 'active' | 'degraded' | 'reconnect_required' | 'disconnected' | 'expired' | 'revoked' | 'error';
  auth_type: 'api_key' | 'oauth';
  scopes: string[];
  account_label: string | null;
  expires_at: string | null;
  last_verified_at: string | null;
  revoked_at: string | null;
  provider_metadata: MetaProviderMetadata;
  created_at: string;
  updated_at: string;
};

export type MetaPermissionStatus = {
  name: string;
  status: string;
  purpose: string;
  available_in_development: boolean;
  available_in_production: boolean;
  requires_app_review: boolean;
};

export type MetaProviderMetadata = {
  meta_user_id?: string;
  display_name?: string;
  graph_api_version?: string;
  connected_at?: string;
  pages_count?: number;
  instagram_accounts_count?: number;
  permission_statuses?: MetaPermissionStatus[];
  health?: {
    checked_at?: string;
    missing_permissions?: string[];
    unavailable_selected_resources?: string[];
  };
};

export type MetaConnectionResource = {
  id: string;
  resource_type: 'facebook_page' | 'instagram_account';
  external_resource_id: string;
  display_name: string;
  selected: boolean;
  metadata: {
    category?: string | null;
    picture_url?: string | null;
    connected_instagram_account_id?: string | null;
    username?: string | null;
    name?: string | null;
    profile_picture_url?: string | null;
    page_id?: string;
  };
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
  startGoogleOAuth: (organizationId: string, connectionId?: string, additionalScopes?: string[]) =>
    call({ operation: 'startGoogleOAuth', organizationId, ...(connectionId ? { connectionId } : {}), ...(additionalScopes?.length ? { additionalScopes } : {}) }),
  startGithubOAuth: (organizationId: string, connectionId?: string) =>
    call({ operation: 'startGithubOAuth', organizationId, ...(connectionId ? { connectionId } : {}) }),
  startMetaOAuth: (organizationId: string, connectionId?: string) =>
    call({ operation: 'startMetaOAuth', organizationId, ...(connectionId ? { connectionId } : {}) }),
  getMetaDetails: (organizationId: string, connectionId: string) =>
    call({ operation: 'getMetaDetails', organizationId, connectionId }) as Promise<{ success: true; connection: IntegrationConnection; resources: MetaConnectionResource[] }>,
  updateMetaResources: (organizationId: string, connectionId: string, pageIds: string[], instagramIds: string[]) =>
    call({ operation: 'updateMetaResources', organizationId, connectionId, pageIds, instagramIds }),
  checkMetaConnection: (organizationId: string, connectionId: string) =>
    call({ operation: 'checkMetaConnection', organizationId, connectionId }),
  rename: (organizationId: string, connectionId: string, name: string) =>
    call({ operation: 'rename', organizationId, connectionId, name }),
  test: (organizationId: string, connectionId: string) =>
    call({ operation: 'test', organizationId, connectionId }),
  revoke: (organizationId: string, connectionId: string) =>
    call({ operation: 'revoke', organizationId, connectionId }),
  remove: (organizationId: string, connectionId: string) =>
    call({ operation: 'delete', organizationId, connectionId }),
};
