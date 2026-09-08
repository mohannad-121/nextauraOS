import { adminClient } from './billing.ts';
import { decryptIntegrationCredential, encryptIntegrationCredential } from './google-oauth.ts';

const required = (name: string) => {
  const value = Deno.env.get(name) || '';
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
};
export const githubClient = () => ({ clientId: required('GITHUB_CLIENT_ID'), clientSecret: required('GITHUB_CLIENT_SECRET'), redirectUri: required('GITHUB_OAUTH_REDIRECT_URI') });
export async function exchangeGithubCode(code: string) {
  const client = githubClient();
  const response = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: client.clientId, client_secret: client.clientSecret, code, redirect_uri: client.redirectUri }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.access_token !== 'string' || !body.access_token) throw new Error('GitHub authorization could not be completed.');
  return body.access_token;
}
export async function githubAccount(accessToken: string) {
  const response = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.login !== 'string' || !body.login) throw new Error('GitHub account verification failed.');
  return { login: body.login };
}
export async function getGithubAccessToken(connectionId: string, organizationId: string) {
  const admin = adminClient();
  const { data: connection } = await admin.from('integration_connections').select('id,status,provider,organization_id').eq('id', connectionId).eq('organization_id', organizationId).maybeSingle();
  if (!connection || connection.provider !== 'github' || connection.status !== 'active') throw new Error('GitHub is not connected. Reconnect GitHub to continue.');
  const { data: credential } = await admin.from('integration_connection_credentials').select('ciphertext,iv').eq('connection_id', connectionId).maybeSingle();
  if (!credential) throw new Error('GitHub connection credentials are unavailable.');
  const value = await decryptIntegrationCredential(credential);
  if (typeof value.access_token !== 'string' || !value.access_token) throw new Error('GitHub is not connected. Reconnect GitHub to continue.');
  return { accessToken: value.access_token, accountLogin: typeof value.account_login === 'string' ? value.account_login : null };
}
export { encryptIntegrationCredential };
