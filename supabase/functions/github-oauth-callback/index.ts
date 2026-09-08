import { adminClient } from '../_shared/billing.ts';
import { encryptIntegrationCredential, exchangeGithubCode, githubAccount } from '../_shared/github-oauth.ts';
import { sha256 } from '../_shared/google-oauth.ts';

const redirect = (result: 'connected' | 'error') => {
  const origin = (Deno.env.get('NEXTAURA_APP_URL') || Deno.env.get('APP_URL') || '').replace(/\/$/, '');
  if (!/^https?:\/\/(localhost(?::\d+)?|[a-z0-9.-]+)$/i.test(origin)) throw new Error('APP_URL is not configured.');
  return `${origin}/?github=${result}`;
};
Deno.serve(async (request) => {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  try {
    const url = new URL(request.url), state = url.searchParams.get('state') || '', code = url.searchParams.get('code') || '';
    if (!state || !code) return Response.redirect(redirect('error'), 303);
    const admin = adminClient(), now = new Date().toISOString();
    const { data: oauthState } = await admin.from('integration_oauth_states').update({ consumed_at: now }).eq('state_hash', await sha256(state)).eq('provider', 'github').is('consumed_at', null).gt('expires_at', now).select('organization_id,user_id,connection_id').maybeSingle();
    if (!oauthState) return Response.redirect(redirect('error'), 303);
    const accessToken = await exchangeGithubCode(code), account = await githubAccount(accessToken);
    const credential = await encryptIntegrationCredential({ access_token: accessToken, account_login: account.login });
    const existing = oauthState.connection_id ? await admin.from('integration_connections').select('id').eq('id', oauthState.connection_id).eq('organization_id', oauthState.organization_id).eq('provider', 'github').maybeSingle() : { data: null };
    let connectionId = existing.data?.id;
    if (connectionId) {
      await admin.from('integration_connections').update({ name: account.login, status: 'active', auth_type: 'oauth', scopes: ['repo'], account_label: account.login, revoked_at: null, last_verified_at: now, updated_at: now }).eq('id', connectionId).eq('organization_id', oauthState.organization_id);
      await admin.from('integration_connection_credentials').update({ ...credential, updated_at: now }).eq('connection_id', connectionId);
    } else {
      const { data: connection, error } = await admin.from('integration_connections').insert({ organization_id: oauthState.organization_id, provider: 'github', name: account.login, status: 'active', auth_type: 'oauth', scopes: ['repo'], account_label: account.login, created_by: oauthState.user_id, last_verified_at: now }).select('id').single();
      if (error || !connection) throw error || new Error('Unable to save GitHub connection.');
      connectionId = connection.id;
      await admin.from('integration_connection_credentials').insert({ connection_id: connectionId, ...credential });
    }
    await admin.from('audit_logs').insert({ organization_id: oauthState.organization_id, user_name: oauthState.user_id, action: 'integration.github.connected', details: JSON.stringify({ connection_id: connectionId, provider: 'github' }) });
    return Response.redirect(redirect('connected'), 303);
  } catch { try { return Response.redirect(redirect('error'), 303); } catch { return new Response('GitHub OAuth callback could not be completed.', { status: 400 }); } }
});
