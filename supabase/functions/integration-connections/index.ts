import { authenticate, corsHeaders, json, requireBillingAdmin } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';
import { assertPublicWebhookTarget } from '../_shared/webhook-security.ts';
import { GOOGLE_FOUNDATION_SCOPES, getValidGoogleAccessToken, googleAccount, googleClient, randomOAuthState, sha256 } from '../_shared/google-oauth.ts';
import { githubClient } from '../_shared/github-oauth.ts';

const encoder = new TextEncoder();
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
const toBase64 = (value: Uint8Array) => btoa(String.fromCharCode(...value));
const safeConnection = (row: Record<string, unknown>) => { const { created_by: _createdBy, ...metadata } = row; return metadata; };

async function credentialKey() {
  const raw = Deno.env.get('INTEGRATION_CREDENTIAL_ENCRYPTION_KEY') || '';
  if (!/^[A-Za-z0-9+/]{43}=$/.test(raw)) throw new Error('Integration credential encryption is not configured.');
  return crypto.subtle.importKey('raw', fromBase64(raw), 'AES-GCM', false, ['encrypt']);
}

async function encryptCredential(secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await credentialKey(), encoder.encode(secret));
  return { ciphertext: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) };
}

async function requireConnectionAccess(admin: any, userId: string, organizationId: string) {
  await requireBillingAdmin(admin, userId, organizationId);
  const entitlements = await getOrganizationEntitlements(admin, organizationId);
  if (!entitlements.access_active || !entitlements.automation_access) throw new Error('Connections require an active Custom workspace.');
}

async function requireMembership(admin: any, userId: string, organizationId: string) {
  const { data, error } = await admin.from('organization_members').select('id').eq('organization_id', organizationId).eq('user_id', userId).eq('status', 'Active').maybeSingle();
  if (error || !data) throw new Error('You are not an active member of this organization.');
}

async function audit(admin: any, organizationId: string, actorId: string, action: string, connectionId: string, details: Record<string, unknown> = {}) {
  await admin.from('audit_logs').insert({ organization_id: organizationId, user_name: actorId, action, details: JSON.stringify({ connection_id: connectionId, ...details }) });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { admin, user } = await authenticate(req); const body = await req.json(); const organizationId = String(body.organizationId || '');
    if (!organizationId) return json({ success: false, error: 'organizationId is required.' }, 400);
    if (body.operation === 'list') { await requireMembership(admin, user.id, organizationId); const { data, error } = await admin.from('integration_connections').select('id,organization_id,provider,name,status,auth_type,scopes,account_label,expires_at,last_verified_at,revoked_at,created_at,updated_at').eq('organization_id', organizationId).order('created_at', { ascending: false }); if (error) throw error; return json({ success: true, connections: data || [] }); }
    if (body.operation === 'startGithubOAuth') {
      await requireBillingAdmin(admin, user.id, organizationId); const entitlements = await getOrganizationEntitlements(admin, organizationId);
      if (!entitlements.access_active || !entitlements.website_github_export) throw new Error('GitHub export is not included in your current plan.');
      const connectionId = body.connectionId ? String(body.connectionId) : null;
      if (connectionId) { const { data: connection } = await admin.from('integration_connections').select('id').eq('id', connectionId).eq('organization_id', organizationId).eq('provider', 'github').maybeSingle(); if (!connection) return json({ success: false, error: 'GitHub connection not found.' }, 404); }
      const state = randomOAuthState(), expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
      const { error } = await admin.from('integration_oauth_states').insert({ state_hash: await sha256(state), provider: 'github', organization_id: organizationId, user_id: user.id, connection_id: connectionId, expires_at: expiresAt }); if (error) throw error;
      const client = githubClient(), authorizationUrl = new URL('https://github.com/login/oauth/authorize'); authorizationUrl.searchParams.set('client_id', client.clientId); authorizationUrl.searchParams.set('redirect_uri', client.redirectUri); authorizationUrl.searchParams.set('scope', 'repo'); authorizationUrl.searchParams.set('state', state);
      await audit(admin, organizationId, user.id, connectionId ? 'integration.github.reconnect_initiated' : 'integration.github.initiated', connectionId || 'pending'); return json({ success: true, authorizationUrl: authorizationUrl.toString() });
    }
    await requireConnectionAccess(admin, user.id, organizationId);
    if (body.operation === 'startGoogleOAuth') {
      const connectionId = body.connectionId ? String(body.connectionId) : null;
      if (connectionId) { const { data: connection } = await admin.from('integration_connections').select('id').eq('id', connectionId).eq('organization_id', organizationId).eq('provider', 'google').maybeSingle(); if (!connection) return json({ success: false, error: 'Google connection not found.' }, 404); }
      const requestedScopes: string[] = Array.isArray(body.additionalScopes) ? body.additionalScopes.filter((scope: unknown): scope is string => scope === 'https://www.googleapis.com/auth/gmail.send') : []; const state = randomOAuthState(); const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString(); const { error } = await admin.from('integration_oauth_states').insert({ state_hash: await sha256(state), provider: 'google', organization_id: organizationId, user_id: user.id, connection_id: connectionId, expires_at: expiresAt }); if (error) throw error;
      const client = googleClient(); const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth'); authorizationUrl.searchParams.set('client_id', client.clientId); authorizationUrl.searchParams.set('redirect_uri', client.redirectUri); authorizationUrl.searchParams.set('response_type', 'code'); authorizationUrl.searchParams.set('scope', [...GOOGLE_FOUNDATION_SCOPES, ...requestedScopes].join(' ')); authorizationUrl.searchParams.set('state', state); authorizationUrl.searchParams.set('access_type', 'offline'); authorizationUrl.searchParams.set('prompt', 'consent'); authorizationUrl.searchParams.set('include_granted_scopes', 'true');
      await audit(admin, organizationId, user.id, connectionId ? 'integration.google.reconnect_initiated' : 'integration.google.initiated', connectionId || 'pending'); return json({ success: true, authorizationUrl: authorizationUrl.toString() });
    }
    if (body.operation === 'createGenericApi') {
      const name = String(body.name || '').trim(); const baseUrl = String(body.baseUrl || '').trim(); const secret = String(body.secret || '');
      if (!name || !secret || secret.length > 4096) return json({ success: false, error: 'A connection name and API secret are required.' }, 400);
      let url: URL; try { url = new URL(baseUrl); } catch { return json({ success: false, error: 'A valid HTTPS API base URL is required.' }, 400); }
      if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return json({ success: false, error: 'A valid HTTPS API base URL is required.' }, 400);
      await assertPublicWebhookTarget(url);
      const { data: connection, error } = await admin.from('integration_connections').insert({ organization_id: organizationId, provider: 'generic_api', name, status: 'active', auth_type: 'api_key', scopes: [], account_label: url.hostname, created_by: user.id }).select('*').single();
      if (error) throw error;
      const encrypted = await encryptCredential(JSON.stringify({ base_url: url.origin, secret }));
      const { error: credentialError } = await admin.from('integration_connection_credentials').insert({ connection_id: connection.id, ...encrypted });
      if (credentialError) { await admin.from('integration_connections').delete().eq('id', connection.id).eq('organization_id', organizationId); throw credentialError; }
      await audit(admin, organizationId, user.id, 'integration.connection.created', connection.id, { provider: 'generic_api', hostname: url.hostname });
      return json({ success: true, connection: safeConnection(connection) }, 201);
    }
    const connectionId = String(body.connectionId || ''); if (!connectionId) return json({ success: false, error: 'connectionId is required.' }, 400);
    const { data: connection, error: lookupError } = await admin.from('integration_connections').select('*').eq('id', connectionId).eq('organization_id', organizationId).maybeSingle(); if (lookupError || !connection) return json({ success: false, error: 'Connection not found.' }, 404);
    if (body.operation === 'rename') { const name = String(body.name || '').trim(); if (!name || name.length > 120) return json({ success: false, error: 'A valid connection name is required.' }, 400); const { data, error } = await admin.from('integration_connections').update({ name, updated_at: new Date().toISOString() }).eq('id', connectionId).eq('organization_id', organizationId).select('*').single(); if (error) throw error; await audit(admin, organizationId, user.id, 'integration.connection.renamed', connectionId); return json({ success: true, connection: safeConnection(data) }); }
    if (body.operation === 'revoke' || body.operation === 'delete') { const now = new Date().toISOString(); if (connection.provider === 'google') { try { const { accessToken } = await getValidGoogleAccessToken(connectionId, organizationId); await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, { method: 'POST' }); } catch { /* Local revocation remains authoritative. */ } } const { error } = await admin.from('integration_connections').update({ status: 'revoked', revoked_at: now, updated_at: now }).eq('id', connectionId).eq('organization_id', organizationId); if (error) throw error; await audit(admin, organizationId, user.id, body.operation === 'delete' ? 'integration.connection.deleted' : 'integration.connection.revoked', connectionId); return json({ success: true }); }
    if (body.operation === 'test') { if (connection.status !== 'active') return json({ success: false, error: 'Only active connections can be tested.' }, 409); if (connection.provider === 'google') { const { accessToken } = await getValidGoogleAccessToken(connectionId, organizationId); const account = await googleAccount(accessToken); const now = new Date().toISOString(); await admin.from('integration_connections').update({ last_verified_at: now, account_label: account.email, updated_at: now }).eq('id', connectionId).eq('organization_id', organizationId); await audit(admin, organizationId, user.id, 'integration.google.tested', connectionId); return json({ success: true, status: 'verified', accountLabel: account.email }); } await admin.from('integration_connections').update({ last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', connectionId).eq('organization_id', organizationId); await audit(admin, organizationId, user.id, 'integration.connection.tested', connectionId); return json({ success: true, status: 'metadata_verified' }); }
    return json({ success: false, error: 'Unsupported operation.' }, 400);
  } catch (error: any) { return json({ success: false, error: error.message || 'Unable to manage integration connections.' }, 400); }
});
