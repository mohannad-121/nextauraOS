import React from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  Globe2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  WebsiteSectionRenderer,
  type GlobalSections,
  type WebsiteDocument,
  type NavigationItem,
} from "../../features/websites/sectionRegistry";

type PublicWebsiteForm = {
  public_id: string;
  name: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  success_message: string;
};

type PublicSite = {
  site: { name: string; public_slug: string; favicon_url: string | null };
  page: {
    path: string;
    name: string;
    seo_title: string | null;
    seo_description: string | null;
    document: WebsiteDocument;
  };
  pages: Array<{ id: string; path: string; name: string }>;
  globals: GlobalSections;
  asset_urls: Record<string, string>;
  forms: PublicWebsiteForm[];
};
const base =
  import.meta.env.VITE_SUPABASE_URL || "https://demo-nextaura.supabase.co";
const publicBaseDomain = (
  import.meta.env.VITE_WEBSITE_PUBLIC_BASE_DOMAIN || "nextauraos.tech"
)
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
const reserved = new Set([
  "www",
  "app",
  "api",
  "admin",
  "auth",
  "mail",
  "support",
  "dashboard",
  "status",
  "cdn",
  "assets",
  "static",
  "sites",
]);
export const isPublicWebsiteHostname = (
  hostname = window.location.hostname,
) => {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    !publicBaseDomain ||
    host === publicBaseDomain ||
    !host.endsWith(`.${publicBaseDomain}`)
  )
    return false;
  const label = host.slice(0, -(publicBaseDomain.length + 1));
  return (
    /^[a-z0-9](?:[a-z0-9-]{0,77}[a-z0-9])?$/.test(label) && !reserved.has(label)
  );
};
export const isPublicWebsiteRoot = (hostname = window.location.hostname) =>
  Boolean(publicBaseDomain) &&
  hostname.toLowerCase().replace(/\.$/, "") === publicBaseDomain;
const route = () => {
  if (isPublicWebsiteHostname())
    return {
      slug: window.location.hostname
        .slice(0, -(publicBaseDomain.length + 1))
        .toLowerCase(),
      path: window.location.pathname.replace(/\/$/, "") || "/",
      hostnameMode: true,
    };
  const parts = window.location.pathname.split("/").filter(Boolean);
  return {
    slug: parts[1] || "",
    path: "/" + parts.slice(2).join("/") || "/",
    hostnameMode: false,
  };
};

function applySeo(data: PublicSite, hostnameMode: boolean) {
  const title = data.page.seo_title || data.page.name || data.site.name;
  document.title = title;
  const set = (name: string, value: string | null, property = false) => {
    let node = document.head.querySelector(
      `meta[${property ? "property" : "name"}="${name}"]`,
    ) as HTMLMetaElement | null;
    if (!value) {
      node?.remove();
      return;
    }
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute(property ? "property" : "name", name);
      document.head.appendChild(node);
    }
    node.content = value;
  };
  set("description", data.page.seo_description);
  set("og:title", title, true);
  set("og:description", data.page.seo_description, true);
  let canonical = document.head.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href =
    hostnameMode && publicBaseDomain
      ? `https://${data.site.public_slug}.${publicBaseDomain}${data.page.path}`
      : window.location.href;
  if (data.site.favicon_url) {
    let icon = document.head.querySelector(
      'link[rel="icon"]',
    ) as HTMLLinkElement | null;
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = data.site.favicon_url;
  }
}

export function PublicWebsitePage() {
  const [state, setState] = React.useState<{
    data?: PublicSite;
    error?: string;
    loading: boolean;
  }>({ loading: true });
  const load = React.useCallback(async () => {
    const current = route();
    if (!current.slug) {
      setState({ loading: false, error: "Site not found." });
      return;
    }
    setState({ loading: true });
    try {
      const response = await fetch(
        `${base}/functions/v1/website-public?site=${encodeURIComponent(current.slug)}&path=${encodeURIComponent(current.path)}${current.hostnameMode ? `&hostname=${encodeURIComponent(window.location.hostname)}` : ""}`,
      );
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(body.error || "Unable to load this site.");
      setState({ loading: false, data: body });
      applySeo(body, current.hostnameMode);
    } catch (error: any) {
      setState({
        loading: false,
        error: error.message || "Unable to load this site.",
      });
    }
  }, []);
  React.useEffect(() => {
    void load();
    const pop = () => void load();
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [load]);
  if (state.loading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-600">
        Loading website…
      </main>
    );
  if (!state.data)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-white px-6 text-center text-slate-900">
        <h1 className="text-2xl font-semibold">
          {state.error === "Page not found."
            ? "Page not found"
            : "This site is unavailable"}
        </h1>
        <a className="text-sm text-blue-700 underline" href="/">
          Return home
        </a>
      </main>
    );
  const data = state.data;
  const hostnameMode = route().hostnameMode;
  const paths = Object.fromEntries(
    data.pages.map((page) => [
      page.id,
      hostnameMode
        ? page.path
        : `/site/${data.site.public_slug}${page.path === "/" ? "/" : page.path}`,
    ]),
  );
  const navigate = (id: string) => {
    const href = paths[id];
    if (href) {
      window.history.pushState({}, "", href);
      void load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{
        ["--website-primary" as string]:
          data.page.document.theme?.primaryColor || "#2563eb",
        borderRadius:
          data.page.document.theme?.radius === "lg"
            ? "1rem"
            : data.page.document.theme?.radius === "sm"
              ? ".25rem"
              : ".5rem",
      }}
    >
      {data.globals.header && (
        <WebsiteSectionRenderer
          section={data.globals.header}
          device="desktop"
          chrome={false}
          assetUrls={data.asset_urls}
          navigation={data.globals.navigation as NavigationItem[]}
          onNavigate={navigate}
        />
      )}
      {data.page.document.sections.map((section) => (
        <WebsiteSectionRenderer
          key={section.id}
          section={section}
          device="desktop"
          chrome={false}
          assetUrls={data.asset_urls}
        />
      ))}
      {data.forms.length > 0 && <PublicForms forms={data.forms} />}
      {data.globals.footer && (
        <WebsiteSectionRenderer
          section={data.globals.footer}
          device="desktop"
          chrome={false}
          assetUrls={data.asset_urls}
          navigation={data.globals.navigation as NavigationItem[]}
          onNavigate={navigate}
        />
      )}
    </div>
  );
}

export function PublicWebsiteRoot() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_20%_12%,rgba(37,99,235,.36),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(14,165,233,.22),transparent_28%)]" />
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
          <a
            href="/"
            className="flex items-center gap-2 text-sm font-bold tracking-tight"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500 shadow-lg shadow-blue-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            NextAura OS
          </a>
          <a
            href="/app"
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/10"
          >
            Open NextAura
          </a>
        </nav>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 sm:px-8 md:grid-cols-[1.1fr_.9fr] md:items-center md:pb-28 md:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-100">
              <Sparkles className="h-3.5 w-3.5" />
              The connected business workspace
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Run your entire business from one intelligent workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              CRM, Finance, HR, Marketing, Automation, Websites, AI and
              operations in one connected platform.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/app"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
              >
                Open NextAura <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/10"
              >
                Explore Features
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-5">
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Today in NextAura
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    Your business, connected.
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                  All systems active
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric
                  icon={Building2}
                  label="Operations"
                  value="One workspace"
                />
                <Metric icon={Bot} label="Automation" value="Ready to run" />
                <Metric
                  icon={Globe2}
                  label="Websites"
                  value="Publish with confidence"
                />
                <Metric
                  icon={ShieldCheck}
                  label="Control"
                  value="Secure by design"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
      <section
        id="features"
        className="border-t border-white/10 bg-slate-900/70 px-6 py-16 sm:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-blue-300">
            One operating system
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">
            A clear view across every part of your company.
          </h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              title="Customer operations"
              text="Bring leads, contacts and service delivery into one workflow."
            />
            <Feature
              title="Finance and people"
              text="Keep financial visibility and your workforce aligned."
            />
            <Feature
              title="Automation and AI"
              text="Turn repeatable work into reliable, governed execution."
            />
            <Feature
              title="Your public presence"
              text="Create, publish and manage websites from the same workspace."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.04] p-3">
      <Icon className="h-4 w-4 text-blue-300" />
      <p className="mt-3 text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
function Feature({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </article>
  );
}

function PublicForms({ forms }: { forms: PublicWebsiteForm[] }) {
  const [result, setResult] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const form = forms[0];
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setResult("");
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    try {
      const response = await fetch(`${base}/functions/v1/website-form-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_public_id: form.public_id,
          values,
          request_id: crypto.randomUUID(),
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(body.error || "Unable to submit the form.");
      setResult(body.message || form.success_message);
      event.currentTarget.reset();
    } catch (error: any) {
      setResult(
        error.message || "Unable to submit the form. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="bg-slate-50 px-6 py-12">
      <form
        onSubmit={submit}
        className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold">{form.name}</h2>
        {form.fields.map((field: PublicWebsiteForm["fields"][number]) => (
          <label key={field.name} className="mt-4 block text-sm font-medium">
            {field.label}
            {field.required && " *"}
            {field.type === "textarea" ? (
              <textarea
                required={field.required}
                name={field.name}
                className="mt-1 block min-h-24 w-full rounded border border-slate-300 p-2"
              />
            ) : field.type === "select" ? (
              <select
                required={field.required}
                name={field.name}
                className="mt-1 block w-full rounded border border-slate-300 p-2"
              >
                <option value="">Select…</option>
                {field.options?.map((item: string) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            ) : (
              <input
                required={field.required}
                name={field.name}
                type={
                  field.type === "phone"
                    ? "tel"
                    : field.type === "email"
                      ? "email"
                      : "text"
                }
                className="mt-1 block w-full rounded border border-slate-300 p-2"
              />
            )}
          </label>
        ))}
        <button
          disabled={busy}
          className="mt-5 rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send message"}
        </button>
        {result && (
          <p role="status" className="mt-3 text-sm">
            {result}
          </p>
        )}
      </form>
    </section>
  );
}
