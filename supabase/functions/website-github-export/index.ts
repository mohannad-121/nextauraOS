import { authenticate, corsHeaders, json, requireBillingAdmin } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';
import { getGithubAccessToken } from '../_shared/github-oauth.ts';
import { generateStandaloneWebsiteProject } from '../website-export/index.ts';

const namePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const base64 = (bytes: Uint8Array) => { let value = ''; for (let index = 0; index < bytes.length; index += 0x8000) value += String.fromCharCode(...bytes.subarray(index, index + 0x8000)); return btoa(value); };
const github = async (token: string, path: string, init: RequestInit = {}) => {
  const response = await fetch(`https://api.github.com${path}`, { ...init, headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  const body = await response.json().catch(() => ({})); return { response, body };
};
const safeGithubError = (status: number, body: any) => status === 422 ? 'A repository with this name already exists.' : status === 401 || status === 403 ? 'GitHub permission was denied. Reconnect GitHub to continue.' : status === 429 ? 'GitHub rate limit reached. Try again later.' : typeof body?.message === 'string' && body.message === 'Not Found' ? 'GitHub connection is unavailable. Reconnect GitHub to continue.' : 'GitHub could not complete the export. Try again later.';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (request.method !== 'POST') throw new Error('Export request is invalid.');
    const { admin, user } = await authenticate(request), body = await request.json(), organizationId = String(body.organizationId || ''), siteId = String(body.siteId || ''), source = body.source, repositoryName = String(body.repositoryName || '').trim(), visibility = body.visibility === 'public' ? 'public' : 'private', description = String(body.description || '').trim(), connectionId = String(body.connectionId || '');
    if (!organizationId || !siteId || !connectionId || !['draft', 'published'].includes(source) || !namePattern.test(repositoryName) || description.length > 350) throw new Error('Export request is invalid.');
    await requireBillingAdmin(admin, user.id, organizationId);
    const entitlements: any = await getOrganizationEntitlements(admin, organizationId); if (!entitlements.access_active || !entitlements.website_github_export) throw new Error('GitHub export is not included in your current plan.');
    const since = new Date(Date.now() - 60_000).toISOString(), { count } = await admin.from('audit_logs').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('user_name', user.id).eq('action', 'website.github_export_completed').gte('created_at', since); if ((count || 0) >= 3) throw new Error('Too many GitHub exports were started. Try again in a minute.');
    const { accessToken, accountLogin } = await getGithubAccessToken(connectionId, organizationId), project = await generateStandaloneWebsiteProject(admin, user.id, organizationId, siteId, source);
    const created = await github(accessToken, '/user/repos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: repositoryName, private: visibility === 'private', description: description || undefined, auto_init: false }) });
    if (!created.response.ok) throw new Error(safeGithubError(created.response.status, created.body));
    const owner = created.body.owner?.login, repo = created.body.name, defaultBranch = created.body.default_branch || 'main', htmlUrl = created.body.html_url;
    if (typeof owner !== 'string' || typeof repo !== 'string' || typeof htmlUrl !== 'string') throw new Error('GitHub could not complete the export. Try again later.');
    try {
      const blobs = await Promise.all(project.entries.map(async (file) => { const content = file.kind === 'text' ? btoa(unescape(encodeURIComponent(file.content))) : base64(file.content); const result = await github(accessToken, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, encoding: 'base64' }) }); if (!result.response.ok || typeof result.body.sha !== 'string') throw new Error(safeGithubError(result.response.status, result.body)); return { path: file.path, mode: '100644', type: 'blob', sha: result.body.sha }; }));
      const tree = await github(accessToken, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tree: blobs }) }); if (!tree.response.ok || typeof tree.body.sha !== 'string') throw new Error(safeGithubError(tree.response.status, tree.body));
      const commit = await github(accessToken, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Initial website export from NextAura', tree: tree.body.sha }) }); if (!commit.response.ok || typeof commit.body.sha !== 'string') throw new Error(safeGithubError(commit.response.status, commit.body));
      const ref = await github(accessToken, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: `refs/heads/${defaultBranch}`, sha: commit.body.sha }) }); if (!ref.response.ok) throw new Error(safeGithubError(ref.response.status, ref.body));
    } catch (error) { throw new Error(`Repository created at ${htmlUrl}, but the project upload did not complete. ${error instanceof Error ? error.message : 'Retry by creating a new repository.'}`); }
    await admin.from('audit_logs').insert({ organization_id: organizationId, user_name: user.id, action: 'website.github_export_completed', details: JSON.stringify({ site_id: siteId, source, visibility, file_count: project.entries.length, asset_count: project.assetCount, repository: `${owner}/${repo}`, account: accountLogin }) });
    return json({ success: true, repository: { owner, name: repo, url: htmlUrl, visibility } });
  } catch (error: any) { return json({ success: false, error: error?.message || 'Unable to export to GitHub.' }, 400); }
});
