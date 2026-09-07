import { adminClient } from './billing.ts';

const encoder = new TextEncoder();
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
const toBase64 = (value: Uint8Array) => btoa(String.fromCharCode(...value));
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

function requiredSecret(name: string) { const value = Deno.env.get(name) || ''; if (!value) throw new Error(`${name} is not configured.`); return value; }
async function key(usages: KeyUsage[]) { const raw = requiredSecret('INTEGRATION_CREDENTIAL_ENCRYPTION_KEY'); if (!/^[A-Za-z0-9+/]{43}=$/.test(raw)) throw new Error('Integration credential encryption is not configured.'); return crypto.subtle.importKey('raw', fromBase64(raw), 'AES-GCM', false, usages); }
export async function encryptIntegrationCredential(value: unknown) { const iv = crypto.getRandomValues(new Uint8Array(12)); const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(['encrypt']), encoder.encode(JSON.stringify(value))); return { ciphertext: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) }; }
export async function decryptIntegrationCredential(row: { ciphertext: string; iv: string }) { const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(row.iv) }, await key(['decrypt']), fromBase64(row.ciphertext)); return JSON.parse(new TextDecoder().decode(decrypted)); }
export async function sha256(value: string) { const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
export function randomOAuthState() { return toBase64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''); }
export function googleClient() { return { clientId: requiredSecret('GOOGLE_CLIENT_ID'), clientSecret: requiredSecret('GOOGLE_CLIENT_SECRET'), redirectUri: requiredSecret('GOOGLE_OAUTH_REDIRECT_URI') }; }
export const GOOGLE_FOUNDATION_SCOPES = ['openid', 'email', 'profile'];

export async function exchangeGoogleCode(code: string) {
  const client = googleClient(); const body = new URLSearchParams({ code, client_id: client.clientId, client_secret: client.clientSecret, redirect_uri: client.redirectUri, grant_type: 'authorization_code' });
  const response = await fetch(GOOGLE_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) throw new Error('Google authorization could not be completed.');
  const token = await response.json(); if (!token?.access_token || typeof token.access_token !== 'string') throw new Error('Google did not return a usable access token.');
  return token;
}
export async function googleAccount(accessToken: string) { const response = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } }); if (!response.ok) throw new Error('Google account verification failed.'); const account = await response.json(); if (!account?.email || typeof account.email !== 'string') throw new Error('Google account email is unavailable.'); return { email: account.email, label: typeof account.name === 'string' ? account.name : account.email }; }

export async function getValidGoogleAccessToken(connectionId: string, organizationId: string) {
  const admin = adminClient(); const { data: connection, error } = await admin.from('integration_connections').select('id,organization_id,provider,status,expires_at').eq('id', connectionId).eq('organization_id', organizationId).maybeSingle();
  if (error || !connection || connection.provider !== 'google' || connection.status !== 'active') throw new Error('Google connection is unavailable.');
  const { data: row, error: credentialError } = await admin.from('integration_connection_credentials').select('ciphertext,iv').eq('connection_id', connectionId).maybeSingle();
  if (credentialError || !row) throw new Error('Google connection credentials are unavailable.');
  const credential = await decryptIntegrationCredential(row); const now = Date.now();
  if (typeof credential.access_token === 'string' && Number(credential.expires_at || 0) > now + 60_000) return { accessToken: credential.access_token, accountLabel: credential.account_email || null };
  if (typeof credential.refresh_token !== 'string' || !credential.refresh_token) { await admin.from('integration_connections').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', connectionId).eq('organization_id', organizationId); throw new Error('Google connection expired. Reconnect it to continue.'); }
  try {
    const client = googleClient(); const body = new URLSearchParams({ client_id: client.clientId, client_secret: client.clientSecret, refresh_token: credential.refresh_token, grant_type: 'refresh_token' }); const response = await fetch(GOOGLE_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }); if (!response.ok) throw new Error('refresh failed'); const refreshed = await response.json(); if (!refreshed?.access_token) throw new Error('refresh failed');
    const updated = { ...credential, access_token: refreshed.access_token, refresh_token: typeof refreshed.refresh_token === 'string' ? refreshed.refresh_token : credential.refresh_token, expires_at: now + Number(refreshed.expires_in || 3600) * 1000, token_type: refreshed.token_type || credential.token_type || 'Bearer' }; const encrypted = await encryptIntegrationCredential(updated); const timestamp = new Date().toISOString(); await admin.from('integration_connection_credentials').update({ ...encrypted, updated_at: timestamp }).eq('connection_id', connectionId); await admin.from('integration_connections').update({ status: 'active', expires_at: new Date(updated.expires_at).toISOString(), updated_at: timestamp }).eq('id', connectionId).eq('organization_id', organizationId); return { accessToken: updated.access_token, accountLabel: updated.account_email || null };
  } catch {
    await admin.from('integration_connections').update({ status: 'error', updated_at: new Date().toISOString() }).eq('id', connectionId).eq('organization_id', organizationId); throw new Error('Google connection refresh failed. Reconnect it to continue.');
  }
}
