import { adminClient } from '../_shared/billing.ts';
import { encryptIntegrationCredential, exchangeGoogleCode, googleAccount, sha256 } from '../_shared/google-oauth.ts';
import { canonicalAppUrl } from '../_shared/canonical-app-origin.ts';

const safeRedirect = (result: 'connected' | 'error') => {
  const url = new URL(canonicalAppUrl('/'));
  url.searchParams.set('google', result);
  return url.toString();
};
const audit = async (admin: any, organizationId: string, userId: string, action: string, connectionId: string) => { await admin.from('audit_logs').insert({ organization_id: organizationId, user_name: userId, action, details: JSON.stringify({ connection_id: connectionId, provider: 'google' }) }); };

Deno.serve(async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  try {
    const url = new URL(req.url); const state = url.searchParams.get('state') || ''; const code = url.searchParams.get('code') || '';
    if (!state || !code) return Response.redirect(safeRedirect('error'), 303);
    const admin = adminClient(); const now = new Date().toISOString(); const { data: oauthState, error } = await admin.from('integration_oauth_states').update({ consumed_at: now }).eq('state_hash', await sha256(state)).eq('provider', 'google').is('consumed_at', null).gt('expires_at', now).select('id,organization_id,user_id,connection_id,redirect_path').maybeSingle();
    if (error || !oauthState) return Response.redirect(safeRedirect('error'), 303);
    const token = await exchangeGoogleCode(code); const account = await googleAccount(token.access_token); const scopes = typeof token.scope === 'string' ? token.scope.split(' ').filter(Boolean) : []; const expiresAt = new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString();
    let existing: any = null;
    if (oauthState.connection_id) { const { data } = await admin.from('integration_connections').select('id,organization_id,provider,name').eq('id', oauthState.connection_id).eq('organization_id', oauthState.organization_id).eq('provider', 'google').maybeSingle(); existing = data; }
    let priorRefresh: string | null = null;
    if (existing) { const { data: prior } = await admin.from('integration_connection_credentials').select('ciphertext,iv').eq('connection_id', existing.id).maybeSingle(); if (prior) { try { const { decryptIntegrationCredential } = await import('../_shared/google-oauth.ts'); priorRefresh = (await decryptIntegrationCredential(prior)).refresh_token || null; } catch { priorRefresh = null; } } }
    const credential = { access_token: token.access_token, refresh_token: typeof token.refresh_token === 'string' ? token.refresh_token : priorRefresh, expires_at: new Date(expiresAt).getTime(), scopes, token_type: token.token_type || 'Bearer', account_email: account.email };
    const encrypted = await encryptIntegrationCredential(credential); let connectionId: string;
    if (existing) { connectionId = existing.id; const { error: updateError } = await admin.from('integration_connections').update({ name: existing.name || account.email, status: 'active', auth_type: 'oauth', scopes, account_label: account.email, expires_at: expiresAt, last_verified_at: now, revoked_at: null, updated_at: now }).eq('id', connectionId).eq('organization_id', oauthState.organization_id); if (updateError) throw updateError; const { error: credentialError } = await admin.from('integration_connection_credentials').update({ ...encrypted, updated_at: now }).eq('connection_id', connectionId); if (credentialError) throw credentialError; await audit(admin, oauthState.organization_id, oauthState.user_id, 'integration.google.reconnected', connectionId); }
    else { const { data: connection, error: connectionError } = await admin.from('integration_connections').insert({ organization_id: oauthState.organization_id, provider: 'google', name: account.email, status: 'active', auth_type: 'oauth', scopes, account_label: account.email, expires_at: expiresAt, last_verified_at: now, created_by: oauthState.user_id }).select('id').single(); if (connectionError || !connection) throw connectionError || new Error('Unable to create Google connection.'); connectionId = connection.id; const { error: credentialError } = await admin.from('integration_connection_credentials').insert({ connection_id: connectionId, ...encrypted }); if (credentialError) { await admin.from('integration_connections').update({ status: 'error', updated_at: now }).eq('id', connectionId); throw credentialError; } await audit(admin, oauthState.organization_id, oauthState.user_id, 'integration.google.connected', connectionId); }
    return Response.redirect(safeRedirect('connected'), 303);
  } catch { try { return Response.redirect(safeRedirect('error'), 303); } catch { return new Response('Google OAuth callback could not be completed.', { status: 400 }); } }
});
