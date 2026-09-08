import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const publicSlug = (value: string | null) => Boolean(value && /^[a-z0-9](?:[a-z0-9-]{0,77}[a-z0-9])?$/.test(value));
const reply = (body: unknown, status = 200, cache = 'no-store') => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': cache, Vary: 'Origin' } });

function safePath(value: string | null) {
  const raw = value || '/';
  if (!raw.startsWith('/') || raw.includes('\\') || raw.includes('..') || !/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]*\/?$/i.test(raw)) return null;
  const normalized = raw.replace(/\/+$/, '');
  return normalized || '/';
}

function referencedIds(value: unknown, keys: Set<string>) {
  const result = new Set<string>();
  const walk = (item: unknown) => {
    if (Array.isArray(item)) item.forEach(walk);
    else if (item && typeof item === 'object') Object.entries(item as Record<string, unknown>).forEach(([key, child]) => {
      if (keys.has(key) && uuid(child)) result.add(child as string); else walk(child);
    });
  };
  walk(value);
  return [...result];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return reply({ success: false, error: 'Method not allowed.' }, 405);
  const url = new URL(req.url); const slug = url.searchParams.get('site'); const requestedPath = safePath(url.searchParams.get('path'));
  if (!publicSlug(slug) || !requestedPath) return reply({ success: false, error: 'Site not found.' }, 404);
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: site } = await admin.from('website_sites').select('id,public_slug,published_release_id').eq('public_slug', slug!).is('archived_at', null).maybeSingle();
    if (!site?.published_release_id) return reply({ success: false, error: 'Site not found.' }, 404);
    const { data: release } = await admin.from('website_releases').select('id,site_id,release_manifest').eq('id', site.published_release_id).eq('site_id', site.id).eq('status', 'published').maybeSingle();
    const manifest: any = release?.release_manifest;
    if (!release || !manifest || !Array.isArray(manifest.pages) || !manifest.site || manifest.site.id !== site.id || (manifest.site.public_slug && manifest.site.public_slug !== slug)) return reply({ success: false, error: 'Site not found.' }, 404);
    const pages = manifest.pages.filter((item: any) => item && uuid(item.page_id) && uuid(item.page_version_id) && typeof item.slug === 'string' && typeof item.name === 'string');
    const page = pages.find((item: any) => item.slug === requestedPath);
    if (!page) return reply({ success: false, error: 'Page not found.' }, 404, 'public, max-age=60, stale-while-revalidate=300');
    const { data: versions } = await admin.from('website_page_versions').select('id,page_id,site_id,document').eq('site_id', site.id).in('id', pages.map((item: any) => item.page_version_id));
    const versionById = new Map((versions || []).filter((item: any) => pages.some((candidate: any) => candidate.page_version_id === item.id && candidate.page_id === item.page_id)).map((item: any) => [item.id, item]));
    const version: any = versionById.get(page.page_version_id);
    if (!version || !version.document || typeof version.document !== 'object') return reply({ success: false, error: 'Page not found.' }, 404);
    const globals = manifest.globals && typeof manifest.globals === 'object' ? manifest.globals : { version: 1, navigation: [], header: null, footer: null };
    const releaseContent = [globals, ...[...versionById.values()].map((item: any) => item.document), manifest.site.favicon_asset_id];
    const assetIds = referencedIds(releaseContent, new Set(['assetId', 'backgroundAssetId', 'sideAssetId', 'logoAssetId', 'favicon_asset_id']));
    const formIds = referencedIds(releaseContent, new Set(['formPublicId'])); const asset_urls: Record<string, string> = {};
    if (assetIds.length) { const { data: assets } = await admin.from('website_assets').select('id,storage_path').eq('site_id', site.id).is('deleted_at', null).in('id', assetIds); await Promise.all((assets || []).map(async (asset: any) => { const { data } = await admin.storage.from('website-assets').createSignedUrl(asset.storage_path, 3600); if (data?.signedUrl) asset_urls[asset.id] = data.signedUrl; })); }
    const forms: any[] = [];
    if (formIds.length) { const { data } = await admin.from('website_forms').select('public_id,name,schema,success_message').eq('site_id', site.id).eq('status', 'active').is('archived_at', null).in('public_id', formIds); for (const form of data || []) { const fields = form.schema?.fields; if (Array.isArray(fields) && fields.length <= 20) forms.push({ public_id: form.public_id, name: form.name, fields: fields.map((field: any) => ({ name: field?.name, label: field?.label, type: field?.type, required: Boolean(field?.required), options: Array.isArray(field?.options) ? field.options.slice(0, 50) : undefined })).filter((field: any) => typeof field.name === 'string' && typeof field.label === 'string'), success_message: form.success_message }); } }
    return reply({ success: true, release: { id: release.id }, site: { name: String(manifest.site.name || ''), public_slug: slug, favicon_url: manifest.site.favicon_asset_id ? asset_urls[manifest.site.favicon_asset_id] || null : null }, page: { path: page.slug, name: page.name, seo_title: page.seo_title || null, seo_description: page.seo_description || null, document: version.document }, pages: pages.map((item: any) => ({ id: item.page_id, path: item.slug, name: item.name })), globals, asset_urls, forms }, 200, 'public, max-age=300, stale-while-revalidate=900');
  } catch { return reply({ success: false, error: 'Unable to load this site.' }, 503); }
});
