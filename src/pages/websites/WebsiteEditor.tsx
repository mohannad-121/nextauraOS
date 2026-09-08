import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  Monitor,
  Plus,
  Redo2,
  Save,
  Settings2,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  Upload,
  Wand2,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { websiteBuilderService } from "../../services/websiteBuilderService";
import {
  newSection,
  websiteSectionRegistry,
  type GlobalSections,
  type WebsiteDocument,
  type WebsiteSection,
  WebsiteSectionRenderer,
} from "../../features/websites/sectionRegistry";
import { MediaLibrary } from "./MediaLibrary";

const blank: WebsiteDocument = {
  version: 1,
  theme: {
    primaryColor: "#2563eb",
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    radius: "md",
  },
  sections: [],
};
const globalsBlank: GlobalSections = {
  version: 1,
  navigation: [],
  header: null,
  footer: null,
};
const typing = () =>
  ["INPUT", "TEXTAREA", "SELECT"].includes(
    (document.activeElement as HTMLElement)?.tagName,
  );
const pageSlug = (value: string) =>
  `/${value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
const publicBaseDomain = (
  import.meta.env.VITE_WEBSITE_PUBLIC_BASE_DOMAIN || "nextauraos.tech"
)
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

export function WebsiteEditor({
  siteId,
  pageId,
}: {
  siteId: string;
  pageId: string;
}) {
  const { currentOrg, navigate } = useApp();
  const [site, setSite] = useState<any>(null);
  const [page, setPage] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [doc, setDoc] = useState<WebsiteDocument>(blank);
  const [globals, setGlobals] = useState<GlobalSections>(globalsBlank);
  const [version, setVersion] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [globalSelected, setGlobalSelected] = useState<
    "header" | "footer" | null
  >(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [preview, setPreview] = useState(false);
  const [mediaFor, setMediaFor] = useState<
    "image" | "heroBackground" | "heroSide" | "logo" | "favicon" | null
  >(null);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [history, setHistory] = useState<WebsiteDocument[]>([]);
  const [future, setFuture] = useState<WebsiteDocument[]>([]);
  const [saved, setSaved] = useState(true);
  const [globalsDirty, setGlobalsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishReviewOpen, setPublishReviewOpen] = useState(false);
  const [releases, setReleases] = useState<any[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const load = async (nextPageId = pageId) => {
    try {
      const [siteData, pageData, assetData, releaseData] = await Promise.all([
        websiteBuilderService.getSite(currentOrg.id, siteId),
        websiteBuilderService.getPageDocument(
          currentOrg.id,
          siteId,
          nextPageId,
        ),
        websiteBuilderService.listAssets(currentOrg.id, siteId),
        websiteBuilderService.listReleases(currentOrg.id, siteId),
      ]);
      setSite(siteData.site);
      setPages(siteData.site.website_pages || []);
      setPage(pageData.page);
      setDoc(
        pageData.page.draft_document?.sections
          ? pageData.page.draft_document
          : blank,
      );
      setGlobals(siteData.site.global_sections || globalsBlank);
      setVersion(pageData.page.draft_version);
      setSelected(null);
      setGlobalSelected(null);
      setAssets(assetData.assets || []);
      setReleases(releaseData.releases || []);
      setSaved(true);
      setGlobalsDirty(false);
    } catch (reason: any) {
      setError(reason.message || "Unable to open editor.");
    }
  };
  useEffect(() => {
    void load();
  }, [currentOrg.id, siteId, pageId]);
  const change = (next: WebsiteDocument) => {
    setHistory((items) => [...items.slice(-39), doc]);
    setFuture([]);
    setDoc(next);
    setSaved(false);
  };
  const update = (
    id: string,
    apply: (section: WebsiteSection) => WebsiteSection,
  ) =>
    change({
      ...doc,
      sections: doc.sections.map((section) =>
        section.id === id ? apply(section) : section,
      ),
    });
  const setProp = (id: string, key: string, value: any) =>
    update(id, (section) => ({
      ...section,
      props: { ...section.props, [key]: value },
    }));
  const add = (type: WebsiteSection["type"]) => {
    const item = newSection(type);
    change({ ...doc, sections: [...doc.sections, item] });
    setSelected(item.id);
  };
  const remove = () => {
    if (!selected) return;
    change({
      ...doc,
      sections: doc.sections.filter((section) => section.id !== selected),
    });
    setSelected(null);
  };
  const move = (delta: number) => {
    const index = doc.sections.findIndex((section) => section.id === selected);
    if (index < 0 || !doc.sections[index + delta]) return;
    const sections = [...doc.sections];
    [sections[index], sections[index + delta]] = [
      sections[index + delta],
      sections[index],
    ];
    change({ ...doc, sections });
  };
  const duplicate = () => {
    const index = doc.sections.findIndex((section) => section.id === selected);
    if (index < 0) return;
    const copy = {
      ...structuredClone(doc.sections[index]),
      id: crypto.randomUUID(),
    };
    const sections = [...doc.sections];
    sections.splice(index + 1, 0, copy);
    change({ ...doc, sections });
    setSelected(copy.id);
  };
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [doc, ...items]);
    setHistory((items) => items.slice(0, -1));
    setDoc(previous);
    setSaved(false);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((items) => [...items, doc]);
    setFuture((items) => items.slice(1));
    setDoc(next);
    setSaved(false);
  };
  const save = async () => {
    if (globalsDirty) {
      setError("Save global settings before saving this page.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await websiteBuilderService.savePageDocument({
        organizationId: currentOrg.id,
        siteId,
        pageId: page.id,
        document: doc,
        expectedVersion: version,
      });
      setVersion(result.page.draft_version);
      setSaved(true);
    } catch (reason: any) {
      setError(reason.message || "Unable to save page.");
    } finally {
      setSaving(false);
    }
  };
  const saveGlobals = async () => {
    if (
      site?.published_release_id &&
      !window.confirm(
        "Changing the public URL stops the old hostname immediately. Continue?",
      )
    )
      return;
    setSaving(true);
    setError("");
    try {
      const result = await websiteBuilderService.saveSiteSettings({
        organizationId: currentOrg.id,
        siteId,
        name: site.name,
        publicSlug: site.public_slug,
        defaultLocale: site.default_locale,
        faviconAssetId: site.favicon_asset_id,
        globalSections: globals,
      });
      setSite(result.site);
      setGlobals(result.site.global_sections);
      setGlobalsDirty(false);
    } catch (reason: any) {
      setError(reason.message || "Unable to save global settings.");
    } finally {
      setSaving(false);
    }
  };
  const publish = async () => {
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      if (globalsDirty) {
        const result = await websiteBuilderService.saveSiteSettings({
          organizationId: currentOrg.id,
          siteId,
          name: site.name,
          publicSlug: site.public_slug,
          defaultLocale: site.default_locale,
          faviconAssetId: site.favicon_asset_id,
          globalSections: globals,
        });
        setSite(result.site);
        setGlobals(result.site.global_sections);
        setGlobalsDirty(false);
      }
      if (!saved) {
        const result = await websiteBuilderService.savePageDocument({
          organizationId: currentOrg.id,
          siteId,
          pageId: page.id,
          document: doc,
          expectedVersion: version,
        });
        setVersion(result.page.draft_version);
        setSaved(true);
      }
      await websiteBuilderService.publishSite(currentOrg.id, siteId);
      await load();
      setPublishReviewOpen(false);
      setNotice("Published successfully");
    } catch (reason: any) {
      setError(reason.message || "Unable to publish website.");
    } finally {
      setPublishing(false);
    }
  };
  const unpublish = async () => {
    if (
      !window.confirm(
        "Unpublishing will make this website unavailable publicly. Continue?",
      )
    )
      return;
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      await websiteBuilderService.unpublishSite(currentOrg.id, siteId);
      await load();
      setNotice("Website unpublished");
    } catch (reason: any) {
      setError(reason.message || "Unable to unpublish website.");
    } finally {
      setPublishing(false);
    }
  };
  const chooseAsset = (asset: any) => {
    if (mediaFor === "favicon") {
      setSite({ ...site, favicon_asset_id: asset.id });
      setGlobalsDirty(true);
    } else if (mediaFor === "logo" && globalSelected) {
      setGlobal(globalSelected, {
        props: {
          ...(globals[globalSelected]?.props || {}),
          logoAssetId: asset.id,
        },
      });
    } else if (selected && mediaFor === "image")
      setProp(selected, "assetId", asset.id);
    else if (selected && mediaFor === "heroBackground")
      setProp(selected, "backgroundAssetId", asset.id);
    else if (selected && mediaFor === "heroSide")
      setProp(selected, "sideAssetId", asset.id);
    setMediaFor(null);
  };
  const setGlobal = (
    key: "header" | "footer",
    patch: Partial<WebsiteSection>,
  ) => {
    const existing = globals[key] || newSection(key);
    setGlobals({
      ...globals,
      [key]: {
        ...existing,
        ...patch,
        props: { ...existing.props, ...(patch.props || {}) },
        style: { ...existing.style, ...(patch.style || {}) },
      },
    });
    setGlobalsDirty(true);
  };
  const assetUrls = useMemo(
    () =>
      Object.fromEntries(
        assets
          .filter((asset) => asset.preview_url)
          .map((asset) => [asset.id, asset.preview_url]),
      ),
    [assets],
  );
  const current = doc.sections.find((section) => section.id === selected);
  const width =
    device === "desktop"
      ? "w-full"
      : device === "tablet"
        ? "w-[768px]"
        : "w-[390px]";
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (typing()) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "d"
      ) {
        event.preventDefault();
        duplicate();
      } else if (event.key === "Delete") remove();
      else if (event.key === "Escape") {
        setSelected(null);
        setGlobalSelected(null);
        setPreview(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  const openPage = (id: string) =>
    navigate("websites", "editor", `${siteId}:${id}`);
  const addNav = () => {
    const target = pages[0];
    if (!target) return;
    setGlobals({
      ...globals,
      navigation: [
        ...globals.navigation,
        {
          id: crypto.randomUUID(),
          label: target.name,
          pageId: target.id,
          visible: true,
        },
      ],
    });
    setGlobalsDirty(true);
  };
  const latestRelease = releases.find(
    (release) => release.status === "published",
  );
  const changesPending = Boolean(
    site?.published_release_id &&
    (!saved ||
      globalsDirty ||
      (latestRelease?.published_at &&
        page?.updated_at &&
        new Date(page.updated_at) > new Date(latestRelease.published_at))),
  );
  const publicationStatus = !site?.published_release_id
    ? "Draft"
    : changesPending
      ? "Published · Draft changes pending"
      : `Published · v${latestRelease?.version_number || "—"}`;
  const liveUrl = site?.public_slug
    ? `https://${site.public_slug}.${publicBaseDomain}`
    : "";
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex h-[100dvh] flex-col overflow-hidden bg-[#0a1020] text-slate-100">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0b1224] px-3">
        <button
          onClick={() => navigate("websites")}
          className="rounded-lg p-2 hover:bg-white/10"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 border-l border-white/10 pl-3">
          <p className="truncate text-xs text-slate-400">
            {site?.name || "Website"}
          </p>
          <p className="truncate text-sm font-semibold">
            {page?.name || "Home"}
          </p>
        </div>
        <span
          className={`ml-2 hidden rounded-full px-2 py-1 text-xs sm:inline ${site?.published_release_id ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-400/10 text-slate-300"}`}
        >
          {publicationStatus}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setPagesOpen(!pagesOpen)}
            className="rounded-lg p-2 hover:bg-white/10"
            aria-label="Pages"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="rounded-lg p-2 hover:bg-white/10"
            aria-label="Site settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          {(
            [
              ["desktop", Monitor],
              ["tablet", Tablet],
              ["mobile", Smartphone],
            ] as const
          ).map(([id, Icon]) => (
            <button
              key={id}
              onClick={() => setDevice(id)}
              className={`hidden rounded p-2 sm:block ${device === id ? "bg-blue-500" : "hover:bg-white/10"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          <button
            onClick={() => setPreview(!preview)}
            className="rounded-lg p-2 hover:bg-white/10"
            aria-label="Preview"
          >
            {preview ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => void save()}
            disabled={saving || (saved && !globalsDirty)}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving" : "Save"}
          </button>
          {site?.published_release_id ? (
            <>
              <button
                onClick={() =>
                  window.open(liveUrl, "_blank", "noopener,noreferrer")
                }
                className="hidden items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold hover:bg-white/10 sm:inline-flex"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Live
              </button>
              <button
                onClick={() => void unpublish()}
                disabled={publishing}
                className="rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-300/10 disabled:opacity-50"
              >
                Unpublish
              </button>
            </>
          ) : (
            <button
              onClick={() => setPublishReviewOpen(true)}
              disabled={publishing || !site}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              Publish
            </button>
          )}
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="bg-red-500/15 px-4 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="bg-emerald-500/15 px-4 py-2 text-sm text-emerald-100"
        >
          {notice}
        </p>
      )}
      {publishReviewOpen && (
        <div className="absolute inset-0 z-[1100] grid place-items-center bg-slate-950/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-review-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#10192e] p-6 shadow-2xl"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Publish review
            </p>
            <h2
              id="publish-review-title"
              className="mt-2 text-xl font-semibold"
            >
              Ready to publish?
            </h2>
            <dl className="mt-5 space-y-3 rounded-xl bg-white/5 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Site</dt>
                <dd className="font-medium">{site?.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Public URL</dt>
                <dd className="max-w-[220px] truncate font-medium">
                  {liveUrl}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Pages</dt>
                <dd className="font-medium">{pages.length}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Current status</dt>
                <dd className="font-medium">{publicationStatus}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Your current page and global settings will be saved before the
              immutable release is created.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setPublishReviewOpen(false)}
                disabled={publishing}
                className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => void publish()}
                disabled={publishing}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {publishing ? "Publishing…" : "Publish website"}
              </button>
            </div>
          </div>
        </div>
      )}
      {pagesOpen && (
        <PagePanel
          pages={pages}
          active={page?.id}
          onOpen={openPage}
          onCreate={async (name) => {
            const created = await websiteBuilderService.createPage(
              currentOrg.id,
              siteId,
              name,
              pageSlug(name),
            );
            await load(created.page.id);
          }}
          onHome={async (id) => {
            await websiteBuilderService.setHomepage(currentOrg.id, siteId, id);
            await load();
          }}
        />
      )}{" "}
      {settingsOpen && (
        <SitePanel
          site={site}
          globals={globals}
          pages={pages}
          onChange={(next) => {
            setSite(next.site);
            setGlobals(next.globals);
            setGlobalsDirty(true);
          }}
          onMedia={() => setMediaFor("favicon")}
          onSave={() => void saveGlobals()}
          saving={saving}
        />
      )}
      <div className="flex min-h-0 flex-1">
        {!preview && (
          <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-[#0b1224] p-3 lg:block">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Add Section</h2>
              <button
                onClick={() => setMediaFor("image")}
                className="rounded p-1.5 text-blue-300 hover:bg-white/10"
                title="Media library"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {websiteSectionRegistry
                .filter((definition) => !definition.global)
                .map((definition) => {
                  const Icon = definition.icon;
                  return (
                    <button
                      key={definition.type}
                      onClick={() => add(definition.type)}
                      className="flex w-full items-start gap-3 rounded-xl border border-white/10 p-3 text-left hover:border-blue-400/50 hover:bg-blue-400/10"
                    >
                      <Icon className="mt-0.5 h-4 w-4 text-blue-300" />
                      <span>
                        <span className="block text-xs font-semibold">
                          {definition.title}
                        </span>
                        <span className="mt-1 block text-[11px] leading-4 text-slate-400">
                          {definition.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </aside>
        )}
        <main className="min-w-0 flex-1 overflow-auto bg-[#111a2c] p-5">
          <div
            className={`mx-auto overflow-hidden bg-white shadow-2xl ${width}`}
            dir="auto"
          >
            {globals.header && (
              <GlobalFrame
                label="Global header"
                selected={globalSelected === "header"}
                onSelect={() => {
                  setGlobalSelected("header");
                  setSelected(null);
                }}
              >
                <WebsiteSectionRenderer
                  section={globals.header}
                  device={device}
                  chrome={!preview}
                  selected={globalSelected === "header"}
                  assetUrls={assetUrls}
                  navigation={globals.navigation}
                  onNavigate={openPage}
                />
              </GlobalFrame>
            )}
            {doc.sections.length ? (
              doc.sections.map((section) => (
                <div key={section.id} className="relative">
                  {!preview && selected === section.id && (
                    <div className="absolute right-2 top-2 z-10 flex rounded-lg bg-slate-950 p-1">
                      <button
                        onClick={() => move(-1)}
                        className="p-1.5"
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => move(1)}
                        className="p-1.5"
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={duplicate}
                        className="p-1.5"
                        aria-label="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={remove}
                        className="p-1.5 text-red-300"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <WebsiteSectionRenderer
                    section={section}
                    device={device}
                    chrome={!preview}
                    selected={selected === section.id}
                    onSelect={() => {
                      setSelected(section.id);
                      setGlobalSelected(null);
                    }}
                    assetUrls={assetUrls}
                  />
                </div>
              ))
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 px-6 text-center text-slate-900">
                <Wand2 className="h-9 w-9 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold">
                    Start building your page
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Add a Hero or choose from the section library.
                  </p>
                </div>
                <button
                  onClick={() => add("hero")}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Add Hero
                </button>
              </div>
            )}
            {globals.footer && (
              <GlobalFrame
                label="Global footer"
                selected={globalSelected === "footer"}
                onSelect={() => {
                  setGlobalSelected("footer");
                  setSelected(null);
                }}
              >
                <WebsiteSectionRenderer
                  section={globals.footer}
                  device={device}
                  chrome={!preview}
                  selected={globalSelected === "footer"}
                  assetUrls={assetUrls}
                  navigation={globals.navigation}
                  onNavigate={openPage}
                />
              </GlobalFrame>
            )}
          </div>
        </main>
        {!preview && (
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-white/10 bg-[#0b1224] p-4 xl:block">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {globalSelected
                  ? `Global ${globalSelected}`
                  : current
                    ? "Section settings"
                    : "Page settings"}
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={undo}
                  disabled={!history.length}
                  className="p-1.5 disabled:opacity-30"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  onClick={redo}
                  disabled={!future.length}
                  className="p-1.5 disabled:opacity-30"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {globalSelected ? (
              <GlobalSettings
                kind={globalSelected}
                section={globals[globalSelected]}
                navigation={globals.navigation}
                pages={pages}
                onChange={(patch) => setGlobal(globalSelected, patch)}
                onNavigation={(navigation) => {
                  setGlobals({ ...globals, navigation });
                  setGlobalsDirty(true);
                }}
                onAddNavigation={addNav}
                onMedia={() => setMediaFor("logo")}
              />
            ) : current ? (
              <SectionSettings
                section={current}
                onProp={(key, value) => setProp(current.id, key, value)}
                onStyle={(key, value) =>
                  update(current.id, (item) => ({
                    ...item,
                    style: { ...item.style, [key]: value },
                  }))
                }
                onMedia={setMediaFor}
              />
            ) : (
              <p className="mt-5 text-sm text-slate-400">
                Select a section, or add a global Header and Footer from Site
                settings.
              </p>
            )}
          </aside>
        )}
      </div>
      <MediaLibrary
        open={Boolean(mediaFor)}
        onClose={() => setMediaFor(null)}
        organizationId={currentOrg.id}
        siteId={siteId}
        assets={assets}
        onAssets={setAssets}
        onSelect={chooseAsset}
      />
    </div>,
    document.body,
  );
}

function GlobalFrame({ label, selected, onSelect, children }: any) {
  return (
    <div
      className={`relative ${selected ? "ring-2 ring-blue-500" : ""}`}
      onClick={onSelect}
    >
      <span className="absolute left-2 top-2 z-20 rounded bg-blue-700 px-2 py-0.5 text-[10px] font-bold text-white">
        {label}
      </span>
      {children}
    </div>
  );
}
function SectionSettings({
  section,
  onProp,
  onStyle,
  onMedia,
}: {
  section: WebsiteSection;
  onProp: (key: string, value: any) => void;
  onStyle: (key: string, value: any) => void;
  onMedia: (kind: any) => void;
}) {
  const field = (label: string, key: string, type = "text") => (
    <label className="block text-xs font-medium text-slate-300">
      {label}
      <input
        type={type}
        value={section.props[key] ?? ""}
        onChange={(event) =>
          onProp(
            key,
            type === "number" ? Number(event.target.value) : event.target.value,
          )
        }
        className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm"
      />
    </label>
  );
  return (
    <div className="mt-5 space-y-4">
      {section.type !== "spacer" && field("Heading", "heading")}
      {section.type === "hero" && (
        <>
          {field("Eyebrow", "eyebrow")}
          {field("Subheading", "subheading")}
          <button
            onClick={() => onMedia("heroBackground")}
            className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs"
          >
            Choose background image
          </button>
          <button
            onClick={() => onMedia("heroSide")}
            className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs"
          >
            Choose side image
          </button>
        </>
      )}
      {section.type === "image" && (
        <>
          <button
            onClick={() => onMedia("image")}
            className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs"
          >
            Choose from Media Library
          </button>
          {field("Alt text", "alt")}
          {field("Width", "width", "number")}
        </>
      )}
      {section.type === "text" && (
        <label className="block text-xs font-medium text-slate-300">
          Body
          <textarea
            value={section.props.body || ""}
            onChange={(event) => onProp("body", event.target.value)}
            className="mt-1.5 h-28 w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm"
          />
        </label>
      )}
      {section.type === "spacer" && (
        <>
          {field("Desktop height", "desktop", "number")}
          {field("Tablet height", "tablet", "number")}
          {field("Mobile height", "mobile", "number")}
        </>
      )}
      <label className="block text-xs font-medium text-slate-300">
        Background
        <input
          type="color"
          value={section.style.backgroundColor || "#ffffff"}
          onChange={(event) => onStyle("backgroundColor", event.target.value)}
          className="mt-1.5 w-full"
        />
      </label>
    </div>
  );
}
function GlobalSettings({
  kind,
  section,
  navigation,
  pages,
  onChange,
  onNavigation,
  onAddNavigation,
  onMedia,
}: {
  kind: "header" | "footer";
  section: WebsiteSection | null;
  navigation: any[];
  pages: any[];
  onChange: (patch: Partial<WebsiteSection>) => void;
  onNavigation: (items: any[]) => void;
  onAddNavigation: () => void;
  onMedia: () => void;
}) {
  const props = section?.props || {};
  return (
    <div className="mt-5 space-y-4">
      <p className="rounded-lg bg-blue-500/10 p-3 text-xs text-blue-200">
        Changes apply to all pages.
      </p>
      <label className="block text-xs">
        Site name
        <input
          value={props.siteName || ""}
          onChange={(e) => onChange({ props: { siteName: e.target.value } })}
          className="mt-1 w-full rounded bg-white/5 p-2"
        />
      </label>
      <button
        onClick={onMedia}
        className="w-full rounded border border-white/10 p-2 text-left text-xs"
      >
        Choose logo from Media Library
      </button>
      {kind === "header" && (
        <>
          <label className="block text-xs">
            CTA text
            <input
              value={props.ctaLabel || ""}
              onChange={(e) =>
                onChange({ props: { ctaLabel: e.target.value } })
              }
              className="mt-1 w-full rounded bg-white/5 p-2"
            />
          </label>
          <div className="border-t border-white/10 pt-3">
            <div className="flex justify-between">
              <p className="text-xs font-semibold">Navigation</p>
              <button
                onClick={onAddNavigation}
                className="text-xs text-blue-300"
              >
                + Add link
              </button>
            </div>
            {navigation.map((item: any, index: number) => (
              <div key={item.id} className="mt-2 rounded bg-white/5 p-2">
                <input
                  value={item.label}
                  onChange={(e) =>
                    onNavigation(
                      navigation.map((entry: any, i: number) =>
                        i === index
                          ? { ...entry, label: e.target.value }
                          : entry,
                      ),
                    )
                  }
                  className="w-full bg-transparent text-xs"
                />
                <select
                  value={item.pageId || ""}
                  onChange={(e) =>
                    onNavigation(
                      navigation.map((entry: any, i: number) =>
                        i === index
                          ? {
                              ...entry,
                              pageId: e.target.value,
                              externalUrl: undefined,
                            }
                          : entry,
                      ),
                    )
                  }
                  className="mt-2 w-full bg-transparent text-xs"
                >
                  <option value="">Choose page</option>
                  {pages.map((page: any) => (
                    <option value={page.id} key={page.id}>
                      {page.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      )}
      {kind === "footer" && (
        <label className="block text-xs">
          Description
          <textarea
            value={props.description || ""}
            onChange={(e) =>
              onChange({ props: { description: e.target.value } })
            }
            className="mt-1 h-20 w-full rounded bg-white/5 p-2"
          />
        </label>
      )}
    </div>
  );
}
function PagePanel({
  pages,
  active,
  onOpen,
  onCreate,
  onHome,
}: {
  pages: any[];
  active?: string;
  onOpen: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onHome: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  return (
    <div className="absolute right-4 top-16 z-[1002] w-72 rounded-xl border border-white/10 bg-[#10192e] p-3 shadow-2xl">
      <p className="text-sm font-semibold">Pages</p>
      <div className="mt-2 space-y-1">
        {pages.map((page: any) => (
          <div
            key={page.id}
            className={`flex items-center justify-between rounded p-2 text-xs ${page.id === active ? "bg-blue-500/20" : ""}`}
          >
            <button onClick={() => onOpen(page.id)}>{page.name}</button>
            {page.is_homepage ? (
              <span className="text-emerald-300">Home</span>
            ) : (
              <button
                onClick={() => void onHome(page.id)}
                className="text-slate-400 hover:text-white"
              >
                Make home
              </button>
            )}
          </div>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            void onCreate(name.trim());
            setName("");
          }
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New page"
          className="min-w-0 flex-1 rounded bg-white/5 p-2 text-xs"
        />
        <button className="rounded bg-blue-600 p-2">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
function SitePanel({
  site,
  globals,
  pages,
  onChange,
  onMedia,
  onSave,
  saving,
}: {
  site: any;
  globals: GlobalSections;
  pages: any[];
  onChange: (value: any) => void;
  onMedia: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  void pages;
  return (
    <div className="absolute right-4 top-16 z-[1002] w-80 rounded-xl border border-white/10 bg-[#10192e] p-4 shadow-2xl">
      <p className="text-sm font-semibold">Site settings</p>
      <label className="mt-3 block text-xs">
        Site name
        <input
          value={site?.name || ""}
          onChange={(e) =>
            onChange({ site: { ...site, name: e.target.value }, globals })
          }
          className="mt-1 w-full rounded bg-white/5 p-2"
        />
      </label>
      <label className="mt-3 block text-xs">
        Public URL slug
        <input
          value={site?.public_slug || ""}
          onChange={(e) =>
            onChange({
              site: { ...site, public_slug: e.target.value.toLowerCase() },
              globals,
            })
          }
          pattern="[a-z0-9-]+"
          className="mt-1 w-full rounded bg-white/5 p-2"
        />
        <span className="mt-1 block text-[10px] text-slate-400">
          https://{site?.public_slug || "your-site"}.{publicBaseDomain}
        </span>
      </label>
      <label className="mt-3 block text-xs">
        Locale
        <select
          value={site?.default_locale || "en"}
          onChange={(e) =>
            onChange({
              site: { ...site, default_locale: e.target.value },
              globals,
            })
          }
          className="mt-1 w-full rounded bg-white/5 p-2"
        >
          <option value="en">English</option>
          <option value="ar">Arabic</option>
        </select>
      </label>
      <button
        onClick={onMedia}
        className="mt-3 w-full rounded border border-white/10 p-2 text-left text-xs"
      >
        Choose favicon from Media Library
      </button>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() =>
            onChange({
              site,
              globals: {
                ...globals,
                header: globals.header || newSection("header"),
              },
            })
          }
          className="rounded border border-white/10 p-2 text-xs"
        >
          Add Header
        </button>
        <button
          onClick={() =>
            onChange({
              site,
              globals: {
                ...globals,
                footer: globals.footer || newSection("footer"),
              },
            })
          }
          className="rounded border border-white/10 p-2 text-xs"
        >
          Add Footer
        </button>
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="mt-4 w-full rounded bg-blue-600 p-2 text-xs font-semibold"
      >
        Save global settings
      </button>
    </div>
  );
}
