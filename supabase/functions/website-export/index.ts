import { authenticate, corsHeaders, json, requireBillingAdmin } from "../_shared/billing.ts";
import { getOrganizationEntitlements } from "../_shared/entitlements.ts";

const enc = new TextEncoder();
const MAX_ENTRIES = 256;
const MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const MAX_INPUT_BYTES = 32 * 1024 * 1024;
const MEDIA_BUCKET = "website-assets";
const DOWNLOAD_CONCURRENCY = 3;
const imageExtensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "website";
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const crc = (bytes: Uint8Array) => { let current = 0xffffffff; for (const byte of bytes) { current ^= byte; for (let index = 0; index < 8; index++) current = (current >>> 1) ^ (0xedb88320 & -(current & 1)); } return (current ^ 0xffffffff) >>> 0; };
const u16 = (value: number) => new Uint8Array([value & 255, (value >>> 8) & 255]);
const u32 = (value: number) => new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
const merge = (parts: Uint8Array[]) => { const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0)); let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; } return output; };

export type ExportFile = { path: string; kind: "text"; content: string } | { path: string; kind: "binary"; content: Uint8Array };

const zipPath = (path: string) => { if (!path || path.includes("\\") || path.includes("\0") || path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Export contains an unsafe file path."); return path; };

export function archive(entries: ExportFile[]) {
  if (entries.length > MAX_ENTRIES) throw new Error("Export exceeds the file entry limit.");
  let offset = 0, total = 0;
  const seen = new Set<string>(), locals: Uint8Array[] = [], central: Uint8Array[] = [];
  for (const file of entries) {
    const path = zipPath(file.path);
    if (seen.has(path)) throw new Error("Export contains duplicate file paths.");
    seen.add(path);
    const name = enc.encode(path), bytes = file.kind === "text" ? enc.encode(file.content) : file.content;
    if (bytes.length > MAX_ENTRY_BYTES || (total += bytes.length) > MAX_INPUT_BYTES) throw new Error("Export exceeds the safe ZIP size limit.");
    const checksum = crc(bytes);
    const local = merge([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(checksum), u32(bytes.length), u32(bytes.length), u16(name.length), u16(0), name, bytes]);
    locals.push(local);
    central.push(merge([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(checksum), u32(bytes.length), u32(bytes.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += local.length;
  }
  const directory = merge(central);
  return merge([...locals, directory, u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(directory.length), u32(offset), u16(0)]);
}

type AssetRecord = { id: string; organization_id: string; site_id: string | null; storage_path: string; mime_type: string; file_size: number; deleted_at: string | null };

function knownAssetId(value: unknown, ids: Set<string>) {
  if (value === null || value === undefined || value === "") return;
  if (typeof value !== "string" || !uuidPattern.test(value)) throw new Error("A referenced media asset cannot be exported safely.");
  ids.add(value);
}

function collectSectionAssets(section: unknown, ids: Set<string>) {
  if (!isObject(section) || !isObject(section.props) || typeof section.type !== "string") return;
  const props = section.props;
  if (section.type === "hero") { knownAssetId(props.backgroundAssetId, ids); knownAssetId(props.sideAssetId, ids); }
  if (section.type === "image") knownAssetId(props.assetId, ids);
  if (section.type === "gallery" && Array.isArray(props.images)) for (const image of props.images) if (isObject(image)) knownAssetId(image.assetId, ids);
  if (Array.isArray(props.items)) for (const item of props.items) if (isObject(item)) { knownAssetId(item.assetId, ids); knownAssetId(item.avatarAssetId, ids); knownAssetId(item.imageAssetId, ids); }
  if (section.type === "header" || section.type === "footer") knownAssetId(props.logoAssetId, ids);
}

function collectDocumentAssets(document: unknown, ids: Set<string>) {
  if (!isObject(document) || !Array.isArray(document.sections)) return;
  for (const section of document.sections) collectSectionAssets(section, ids);
}

export function collectWebsiteAssetIds(pages: any[], globals: unknown, faviconAssetId: unknown, ogAssetIds: unknown[] = []) {
  const ids = new Set<string>();
  for (const page of pages) collectDocumentAssets(page.document, ids);
  if (isObject(globals)) { collectSectionAssets(globals.header, ids); collectSectionAssets(globals.footer, ids); }
  knownAssetId(faviconAssetId, ids);
  for (const id of ogAssetIds) knownAssetId(id, ids);
  return [...ids].sort();
}

function rewriteAsset(value: unknown, assetPaths: Map<string, string>) { return typeof value === "string" ? assetPaths.get(value) : undefined; }

function rewriteSection(section: unknown, assetPaths: Map<string, string>) {
  if (!isObject(section) || !isObject(section.props) || typeof section.type !== "string") return;
  const props = section.props as Record<string, unknown>;
  const rewrite = (idKey: string, srcKey: string) => { if (!(idKey in props)) return; const source = rewriteAsset(props[idKey], assetPaths); delete props[idKey]; if (source) props[srcKey] = source; };
  if (section.type === "hero") { rewrite("backgroundAssetId", "backgroundSrc"); rewrite("sideAssetId", "sideSrc"); }
  if (section.type === "image") rewrite("assetId", "src");
  if (section.type === "gallery" && Array.isArray(props.images)) for (const image of props.images) if (isObject(image)) { const source = rewriteAsset(image.assetId, assetPaths); delete image.assetId; if (source) image.src = source; }
  if (Array.isArray(props.items)) for (const item of props.items) if (isObject(item)) for (const [idKey, srcKey] of [["assetId", "src"], ["avatarAssetId", "avatarSrc"], ["imageAssetId", "imageSrc"]] as const) { const source = rewriteAsset(item[idKey], assetPaths); delete item[idKey]; if (source) item[srcKey] = source; }
  if (section.type === "header" || section.type === "footer") rewrite("logoAssetId", "logoSrc");
}

export function rewriteWebsiteAssetReferences(pages: any[], globals: any, faviconAssetId: unknown, assetPaths: Map<string, string>) {
  const rewrittenPages = clone(pages), rewrittenGlobals = clone(globals || {});
  for (const page of rewrittenPages) {
    if (isObject(page.document) && Array.isArray(page.document.sections)) for (const section of page.document.sections) rewriteSection(section, assetPaths);
    if (page.og_image_asset_id) { const source = rewriteAsset(page.og_image_asset_id, assetPaths); delete page.og_image_asset_id; if (source) page.ogImageSrc = source; }
  }
  if (isObject(rewrittenGlobals)) { rewriteSection(rewrittenGlobals.header, assetPaths); rewriteSection(rewrittenGlobals.footer, assetPaths); }
  return { pages: rewrittenPages, globals: rewrittenGlobals, faviconSrc: rewriteAsset(faviconAssetId, assetPaths) || null };
}

function safeStoragePath(path: unknown, organizationId: string, siteId: string) {
  if (typeof path !== "string" || path.length > 1024 || !path.startsWith(`${organizationId}/${siteId}/`) || path.includes("\\") || path.includes("\0") || path.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("A referenced media asset cannot be exported safely.");
  return path;
}

async function loadExportAssets(admin: any, organizationId: string, siteId: string, ids: string[], baseBytes: number) {
  if (!ids.length) return { files: [] as ExportFile[], paths: new Map<string, string>(), missing: 0, totalBytes: 0 };
  const { data, error } = await admin.from("website_assets").select("id,organization_id,site_id,storage_path,mime_type,file_size,deleted_at").in("id", ids);
  if (error) throw error;
  const records = new Map<string, AssetRecord>((data || []).map((record: AssetRecord) => [record.id, record]));
  const available: AssetRecord[] = [];
  let missing = 0, plannedBytes = baseBytes;
  for (const id of ids) {
    const record = records.get(id);
    if (!record || record.deleted_at) { missing++; continue; }
    if (record.organization_id !== organizationId || record.site_id !== siteId || !(record.mime_type in imageExtensions) || !Number.isSafeInteger(record.file_size) || record.file_size < 0 || record.file_size > MAX_ENTRY_BYTES) throw new Error("A referenced media asset cannot be exported safely.");
    safeStoragePath(record.storage_path, organizationId, siteId);
    if ((plannedBytes += record.file_size) > MAX_INPUT_BYTES) throw new Error("Export exceeds the safe ZIP size limit.");
    available.push(record);
  }
  const downloaded: { record: AssetRecord; bytes: Uint8Array }[] = [];
  for (let index = 0; index < available.length; index += DOWNLOAD_CONCURRENCY) {
    const batch = await Promise.all(available.slice(index, index + DOWNLOAD_CONCURRENCY).map(async (record) => {
      const { data: blob, error: downloadError } = await admin.storage.from(MEDIA_BUCKET).download(record.storage_path);
      if (downloadError || !blob) return null;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.length > MAX_ENTRY_BYTES) throw new Error("Export exceeds the safe ZIP size limit.");
      return { record, bytes };
    }));
    for (const item of batch) { if (item) downloaded.push(item); else missing++; }
  }
  let totalBytes = 0;
  const paths = new Map<string, string>(), files: ExportFile[] = [];
  for (const { record, bytes } of downloaded) {
    totalBytes += bytes.length;
    const path = `public/assets/${record.id}.${imageExtensions[record.mime_type]}`;
    paths.set(record.id, `/${path.slice("public/".length)}`);
    files.push({ path, kind: "binary", content: bytes });
  }
  return { files, paths, missing, totalBytes };
}

function assertSafeTextEntries(entries: ExportFile[]) {
  const environmentSecrets = ["SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "PADDLE_API_KEY", "PADDLE_WEBHOOK_SECRET", "RESEND_API_KEY"].map((name) => Deno.env.get(name)).filter((value): value is string => Boolean(value));
  const unsafePattern = /(?:supabase[^\s"']*\/storage\/v1\/object\/(?:sign|authenticated)|(?:authorization|bearer)\s*[:=]|GEMINI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|PADDLE_[A-Z0-9_]*(?:KEY|SECRET)|RESEND_[A-Z0-9_]*(?:KEY|SECRET))/i;
  for (const entry of entries) if (entry.kind === "text" && (unsafePattern.test(entry.content) || environmentSecrets.some((secret) => entry.content.includes(secret)))) throw new Error("Export contains unsafe private configuration.");
}

export function projectFiles(site: any, pages: any[], globals: any, faviconSrc: string | null, missingAssetCount: number): ExportFile[] {
  const data = JSON.stringify({ site: { name: site.name, locale: site.default_locale, faviconSrc }, globals, pages }, null, 2);
  const missingNote = missingAssetCount ? `\n\n${missingAssetCount} referenced media ${missingAssetCount === 1 ? "file could" : "files could"} not be included and require replacement.` : "";
  return [
    { path: "package.json", kind: "text", content: JSON.stringify({ private: true, type: "module", scripts: { dev: "vite", build: "tsc -b && vite build" }, dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", "react-router-dom": "^7.0.0" }, devDependencies: { "@types/react": "^19.0.0", "@types/react-dom": "^19.0.0", "@vitejs/plugin-react": "^4.0.0", typescript: "^5.0.0", vite: "^6.0.0" } }, null, 2) },
    { path: "vite.config.ts", kind: "text", content: "import{defineConfig}from'vite';import react from'@vitejs/plugin-react';export default defineConfig({plugins:[react()]});" },
    { path: "tsconfig.json", kind: "text", content: JSON.stringify({ compilerOptions: { target: "ES2020", lib: ["ES2020", "DOM"], strict: true, module: "ESNext", moduleResolution: "Bundler", noEmit: true, jsx: "react-jsx" }, include: ["src"] }) },
    { path: "index.html", kind: "text", content: `<html lang="${site.default_locale || "en"}" dir="${site.default_locale === "ar" ? "rtl" : "ltr"}"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${site.name}</title>${faviconSrc ? `<link rel="icon" href="${faviconSrc}"/>` : ""}</head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>` },
    { path: "src/data/site.ts", kind: "text", content: `export const website:any=${data};` },
    { path: "src/config.ts", kind: "text", content: "export const FORM_ENDPOINT=''; // Configure your own form endpoint." },
    { path: "src/main.tsx", kind: "text", content: "import{createRoot}from'react-dom/client';import'./styles.css';import App from'./App';createRoot(document.getElementById('root')!).render(<App/>);" },
    { path: "src/App.tsx", kind: "text", content: "import{BrowserRouter,Routes,Route,Link}from'react-router-dom';import{website}from'./data/site';import{FORM_ENDPOINT}from'./config';const Img=({src,alt='',className='',style={}}:any)=>src?<img src={src} alt={alt} className={className} style={style}/>:null;const Cards=({items=[]}:any)=><div className='grid'>{items.map((x:any,i:number)=><article key={i}><Img src={x.src} alt={x.alt||''} className='card-image'/><Img src={x.avatarSrc||x.imageSrc} alt='' className='avatar'/><h3>{x.title||x.name||x.label}</h3><p>{x.description||x.text||x.quote||x.bio}</p></article>)}</div>;const Section=({s}:any)=>{const p=s.props||{},style={backgroundColor:s.style?.backgroundColor,color:s.style?.textColor};if(s.type==='hero')return <section className='hero' style={{...style,minHeight:p.minHeight,backgroundImage:p.backgroundSrc?`linear-gradient(rgb(15 23 42 / ${p.overlayOpacity??.35}),rgb(15 23 42 / ${p.overlayOpacity??.35})),url(${p.backgroundSrc})`:undefined,backgroundSize:p.imageFit||'cover'}}><div><p>{p.eyebrow}</p><h1>{p.heading}</h1><p>{p.subheading}</p><a href={p.primaryUrl||'#'}>{p.primaryLabel}</a></div><Img src={p.sideSrc} alt='' className='hero-side'/></section>;if(s.type==='image')return <section style={{...style,textAlign:p.alignment}}><Img src={p.src||p.url} alt={p.alt||''} className='content-image' style={{width:`${p.width||100}%`,objectFit:p.fit||'cover',borderRadius:p.radius}}/></section>;if(s.type==='gallery')return <section style={style}><h2>{p.heading}</h2><div className='gallery'>{(p.images||[]).map((x:any,i:number)=><Img key={i} src={x.src} alt={x.alt||''} className='gallery-image'/>)}</div></section>;if(s.type==='contact')return <section style={style}><h2>{p.heading}</h2><p>{p.subheading||p.body}</p><form action={FORM_ENDPOINT||undefined} method='post'><input name='name' placeholder='Name'/><input name='email' type='email' placeholder='Email'/><textarea name='message' placeholder='Message'/><button>Send message</button></form></section>;return <section style={style}><h2>{p.heading}</h2><p>{p.subheading||p.body||p.text}</p><Cards items={p.items}/></section>};const Layout=({page}:any)=>{const h=website.globals.header?.props||{},f=website.globals.footer?.props||{};return <><header><Link to='/'><Img src={h.logoSrc} className='logo'/>{h.siteName||website.site.name}</Link><nav>{(website.globals.navigation||[]).filter((x:any)=>x.visible).map((x:any)=><Link key={x.id} to={website.pages.find((p:any)=>p.id===x.pageId)?.slug||x.externalUrl||'/'}>{x.label}</Link>)}</nav></header><main>{page.document.sections.map((s:any)=><Section key={s.id} s={s}/>)}</main><footer><Img src={f.logoSrc} className='logo'/>{f.description||website.site.name}</footer></>};export default()=> <BrowserRouter><Routes>{website.pages.map((p:any)=><Route key={p.id} path={p.slug} element={<Layout page={p}/>}/>)}</Routes></BrowserRouter>;" },
    { path: "src/styles.css", kind: "text", content: "body{margin:0;font-family:Inter,system-ui;color:#0f172a}header,footer{padding:1rem 5vw;display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap;background:#f8fafc}header a{display:flex;gap:.5rem;align-items:center;color:inherit;text-decoration:none}nav{display:flex;gap:1rem}.logo{width:2rem;height:2rem;object-fit:contain}section{padding:4rem 5vw;max-width:1200px;margin:auto}.hero{max-width:none;display:flex;align-items:center;justify-content:space-between;gap:2rem;background-position:center}.hero-side{width:min(38%,28rem);border-radius:1rem;object-fit:cover}.content-image{display:inline-block;max-width:100%}.grid,.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}.gallery-image,.card-image{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:.75rem}.avatar{width:3rem;height:3rem;border-radius:50%;object-fit:cover}article{padding:1rem;border:1px solid #e2e8f0;border-radius:12px}form{display:grid;gap:.75rem;max-width:32rem}input,textarea,button{font:inherit;padding:.65rem}button{width:max-content}@media(max-width:700px){.hero-side{display:none}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}" },
    { path: "README.md", kind: "text", content: `# ${site.name}\n\nGenerated with NextAura Website Builder. Run \`npm install\` then \`npm run dev\`; build with \`npm run build\`. Configure SPA fallback on static hosting. Set FORM_ENDPOINT in src/config.ts for forms. This Vite SPA updates no server-side SEO.\n\nWebsite media used by this export is bundled in public/assets and does not require NextAura storage at runtime.${missingNote}` },
  ];
}

async function exportWebsite(req: Request) {
  const { admin, user } = await authenticate(req);
  const body = await req.json(), organizationId = String(body.organizationId || ""), siteId = String(body.siteId || ""), source = body.source;
  if (!organizationId || !siteId || !["draft", "published"].includes(source)) throw new Error("Export request is invalid.");
  await requireBillingAdmin(admin, user.id, organizationId);
  const entitlements: any = await getOrganizationEntitlements(admin, organizationId);
  if (!entitlements.access_active || !entitlements.website_code_export) throw new Error("Website code export is not included in your current plan.");
  const { data: site } = await admin.from("website_sites").select("*").eq("id", siteId).eq("organization_id", organizationId).maybeSingle();
  if (!site) throw new Error("Website not found.");
  let pages: any[], globals: any, faviconAssetId: string | null, exportSite = site;
  if (source === "draft") {
    const { data, error } = await admin.from("website_pages").select("id,name,slug,seo_title,seo_description,og_image_asset_id,draft_document").eq("site_id", siteId).eq("organization_id", organizationId).order("sort_order");
    if (error) throw error;
    pages = (data || []).map((page: any) => ({ ...page, document: page.draft_document })); globals = site.global_sections; faviconAssetId = site.favicon_asset_id;
  } else {
    const { data: release, error } = await admin.from("website_releases").select("release_manifest").eq("id", site.published_release_id).eq("organization_id", organizationId).eq("site_id", siteId).eq("status", "published").maybeSingle();
    if (error) throw error;
    const manifest = release?.release_manifest;
    if (!manifest || !Array.isArray(manifest.pages)) throw new Error("This website has no published version to export.");
    const versionIds = manifest.pages.map((page: any) => page.page_version_id).filter((id: unknown) => typeof id === "string");
    const { data: versions, error: versionsError } = await admin.from("website_page_versions").select("id,document").eq("site_id", siteId).eq("organization_id", organizationId).in("id", versionIds);
    if (versionsError || (versions || []).length !== versionIds.length) throw new Error("The published website content is unavailable.");
    const documents = new Map((versions || []).map((version: any) => [version.id, version.document]));
    pages = manifest.pages.map((page: any) => ({ ...page, id: page.page_id, document: documents.get(page.page_version_id) })); globals = manifest.globals; faviconAssetId = manifest.site?.favicon_asset_id || null;
    exportSite = { ...site, name: manifest.site?.name || site.name, default_locale: manifest.site?.default_locale || site.default_locale };
  }
  if (!pages.length || pages.length > 8) throw new Error("This website exceeds the export page limit.");
  const assetIds = collectWebsiteAssetIds(pages, globals, faviconAssetId, source === "draft" ? pages.map((page) => page.og_image_asset_id) : []);
  const preliminaryFiles = projectFiles(exportSite, pages, globals, null, 0);
  const baseBytes = preliminaryFiles.reduce((total, file) => total + (file.kind === "text" ? enc.encode(file.content).length : file.content.length), 0);
  const assets = await loadExportAssets(admin, organizationId, siteId, assetIds, baseBytes);
  const rewritten = rewriteWebsiteAssetReferences(pages, globals, faviconAssetId, assets.paths);
  const entries = [...projectFiles(exportSite, rewritten.pages, rewritten.globals, rewritten.faviconSrc, assets.missing), ...assets.files];
  assertSafeTextEntries(entries);
  const output = archive(entries);
  await admin.from("audit_logs").insert({ organization_id: organizationId, user_name: user.id, action: "website.export_generated", details: JSON.stringify({ site_id: siteId, source, page_count: pages.length, asset_count: assets.files.length, missing_asset_count: assets.missing, total_asset_bytes: assets.totalBytes }) });
  return new Response(output, { headers: { ...corsHeaders, "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${safe(site.public_slug || site.slug)}-nextaura-export.zip"` } });
}

if (import.meta.main) Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try { if (request.method !== "POST") throw new Error("Export request is invalid."); return await exportWebsite(request); }
  catch (error) { return json({ success: false, error: error instanceof Error ? error.message : "Unable to export this website." }, 400); }
});
