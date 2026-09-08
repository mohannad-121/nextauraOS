import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ExternalLink,
  Globe2,
  Plus,
  Sparkles,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { EmptyState } from "../../components/common/EmptyState";
import { Modal } from "../../components/common/Modal";
import { websiteBuilderService } from "../../services/websiteBuilderService";
import { websiteTemplates } from "../../features/websites/templateRegistry";
import { WebsiteEditor } from "./WebsiteEditor";
const summaries: Record<string, string> = {
  restaurant: "Hero · Services · Gallery · Testimonials · Contact",
  agency: "Hero · Services · Stats · Team · Contact",
  saas: "Hero · Features · Pricing · FAQ · CTA",
  portfolio: "Hero · Gallery · Services · Testimonials · Contact",
  fitness: "Hero · Services · Stats · Pricing · Team · Contact",
  beauty: "Hero · Services · Gallery · Pricing · Team · Contact",
};
export function WebsitesPage() {
  const { currentOrg, navigate, activeSubView, selectedResourceId } = useApp();
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentStep, setAgentStep] = useState<"prompt" | "review">("prompt");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [language, setLanguage] = useState("auto");
  const [styleHint, setStyleHint] = useState("Modern");
  const [agentPlan, setAgentPlan] = useState<any>(null);
  const [agentPlanId, setAgentPlanId] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentStage, setAgentStage] = useState(0);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setSites((await websiteBuilderService.listSites(currentOrg.id)).sites);
    } catch (e: any) {
      setError(e.message || "Unable to load websites.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [currentOrg.id]);
  const close = () => {
    setOpen(false);
    setStep(1);
    setTemplate("");
    setName("");
    setSlug("");
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const result = await websiteBuilderService.createSite(
        currentOrg.id,
        name,
        slug || undefined,
        template || undefined,
      );
      close();
      navigate("websites", "editor", `${result.site.id}:${result.page.id}`);
    } catch (reason: any) {
      setError(reason.message || "Unable to create website.");
    } finally {
      setSaving(false);
    }
  };
  const openBuilder = async (siteId: string) => {
    const data = await websiteBuilderService.getSite(currentOrg.id, siteId);
    const page =
      data.site.website_pages?.find((p: any) => p.is_homepage) ||
      data.site.website_pages?.[0];
    if (page) navigate("websites", "editor", `${siteId}:${page.id}`);
  };
  const closeAgent = () => {
    if (agentLoading) return;
    setAgentOpen(false);
    setAgentStep("prompt");
    setAgentPlan(null);
    setAgentPlanId("");
    setAgentStage(0);
  };
  const generateAgentPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setAgentLoading(true);
    setAgentStage(0);
    const timer = window.setInterval(
      () => setAgentStage((current) => Math.min(current + 1, 3)),
      900,
    );
    try {
      const result = await websiteBuilderService.generateAgentPlan({
        organizationId: currentOrg.id,
        prompt: agentPrompt,
        businessName: businessName || undefined,
        language,
        styleHint,
      });
      setAgentPlan(result.plan);
      setAgentPlanId(result.planId);
      setAgentStep("review");
    } catch (reason: any) {
      setError(
        reason.message ||
          "We couldn't generate a valid site structure. Please try again.",
      );
    } finally {
      window.clearInterval(timer);
      setAgentLoading(false);
    }
  };
  const applyAgentPlan = async () => {
    if (!agentPlanId) return;
    setError("");
    setAgentLoading(true);
    try {
      const result = await websiteBuilderService.applyAgentPlan(
        currentOrg.id,
        agentPlanId,
      );
      window.sessionStorage.setItem("nextaura-ai-draft-site", result.siteId);
      closeAgent();
      await load();
      navigate("websites", "editor", `${result.siteId}:${result.homepageId}`);
    } catch (reason: any) {
      setError(reason.message || "Unable to create your draft website.");
    } finally {
      setAgentLoading(false);
    }
  };
  const route =
    activeSubView === "editor" ? selectedResourceId?.split(":") : null;
  if (route?.length === 2)
    return <WebsiteEditor siteId={route[0]} pageId={route[1]} />;
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <header className="flex items-end justify-between border-b border-slate-200 pb-8">
        <div>
          <p className="flex gap-2 text-sm font-medium text-blue-700">
            <Globe2 className="h-4 w-4" />
            Website Builder
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Websites
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
          >
            <Plus className="h-4 w-4" />
            Create website
          </button>
          <button
            onClick={() => setAgentOpen(true)}
            className="inline-flex gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Build with AI
          </button>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p>Loading websites…</p>
      ) : sites.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <article
              key={site.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Globe2 className="h-5 w-5 text-blue-700" />
              <div className="mt-4 flex items-center justify-between gap-3">
                <h2 className="font-semibold">{site.name}</h2>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${site.published_release_id ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {site.published_release_id ? "Published" : "Draft"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {site.public_slug || site.slug}
              </p>
              <button
                onClick={() => void openBuilder(site.id)}
                className="mt-5 inline-flex gap-1 text-sm font-semibold text-blue-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open builder
              </button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Create your first website"
          description="Start with a starter template or blank canvas."
          actionLabel="Create website"
          onAction={() => setOpen(true)}
        />
      )}
      <Modal
        isOpen={open}
        onClose={close}
        title={step === 1 ? "Choose a starting point" : "Website details"}
        subtitle={
          step === 1
            ? "Pick a starter you can fully customize."
            : "Your template opens directly in the editor."
        }
        maxWidth="6xl"
      >
        {step === 1 ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Card
                title="Start Blank"
                description="An empty structured Home page."
                category="Blank canvas"
                summary="Start with your own sections"
                selected={!template}
                onClick={() => setTemplate("")}
              />
              {websiteTemplates.map((item) => (
                <Card
                  key={item.id}
                  title={item.name}
                  description={item.description}
                  category={item.category}
                  summary={summaries[item.id]}
                  selected={template === item.id}
                  onClick={() => setTemplate(item.id)}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={create} className="mx-auto max-w-xl space-y-5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex gap-1 text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Change starter
            </button>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
              {template
                ? `Selected: ${websiteTemplates.find((item) => item.id === template)?.name}`
                : "Selected: Start Blank"}
            </p>
            <label className="block text-sm font-medium">
              Website name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm font-medium">
              URL slug{" "}
              <span className="font-normal text-slate-500">(optional)</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                pattern="[a-z0-9-]+"
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={close}
                className="rounded-xl px-4 py-2"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              >
                {saving ? "Creating…" : "Create website"}
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        isOpen={agentOpen}
        onClose={closeAgent}
        title={
          agentStep === "prompt"
            ? "Describe your website"
            : "Review your AI website plan"
        }
        subtitle={
          agentStep === "prompt"
            ? "AI creates a draft. You decide when to publish."
            : "Nothing is created until you confirm."
        }
        maxWidth="4xl"
      >
        {agentStep === "prompt" ? (
          <form onSubmit={generateAgentPlan} className="space-y-5">
            <label className="block text-sm font-medium">
              Describe the website
              <textarea
                required
                minLength={12}
                maxLength={6000}
                value={agentPrompt}
                onChange={(event) => setAgentPrompt(event.target.value)}
                placeholder="Build a modern fitness coaching website with a dark premium look, pricing, coach profiles, testimonials and a contact form."
                className="mt-2 min-h-40 w-full resize-y rounded-xl border border-slate-300 p-3 leading-6 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium">
                Business name{" "}
                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  maxLength={120}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                />
              </label>
              <label className="text-sm font-medium">
                Language
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                >
                  <option value="auto">Auto</option>
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Style
                <select
                  value={styleHint}
                  onChange={(event) => setStyleHint(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                >
                  {[
                    "Modern",
                    "Luxury",
                    "Minimal",
                    "Bold",
                    "Elegant",
                    "Playful",
                    "Professional",
                  ].map((style) => (
                    <option key={style}>{style}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900">
              <Sparkles className="mr-2 inline h-4 w-4" />
              Your content is planned as safe editable sections. It will never
              publish automatically.
            </p>
            {agentLoading && (
              <div
                className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"
                aria-live="polite"
              >
                {
                  [
                    "Understanding your business",
                    "Planning pages",
                    "Designing sections",
                    "Preparing your draft",
                  ][agentStage]
                }
                …
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeAgent}
                className="rounded-xl px-4 py-2"
              >
                Cancel
              </button>
              <button
                disabled={agentLoading}
                className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {agentLoading ? "Generating…" : "Generate website"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-700">
                Website
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">
                {agentPlan?.site?.name}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {agentPlan?.site?.theme?.preset} ·{" "}
                {agentPlan?.site?.language === "ar"
                  ? "Arabic / RTL"
                  : "English / LTR"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {agentPlan?.pages?.map((page: any) => (
                <article
                  key={page.clientId}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <h4 className="font-semibold">
                    {page.name}
                    {page.isHomepage ? " · Home" : ""}
                  </h4>
                  <p className="mt-2 text-xs text-slate-500">
                    {page.sections
                      .map((section: any) => section.type.replaceAll("_", " "))
                      .join(" · ")}
                  </p>
                </article>
              ))}
            </div>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              This will create an AI-generated draft only. Review and edit it in
              Website Editor before using the existing Publish action.
            </p>
            <div className="flex justify-between gap-3">
              <button
                type="button"
                disabled={agentLoading}
                onClick={() => setAgentStep("prompt")}
                className="rounded-xl px-4 py-2"
              >
                Generate again
              </button>
              <button
                disabled={agentLoading}
                onClick={() => void applyAgentPlan()}
                className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {agentLoading ? "Creating draft…" : "Create draft"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
function Card({
  title,
  description,
  category,
  summary,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  category: string;
  summary: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-48 rounded-2xl border p-5 text-left ${selected ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        {category}
      </span>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <p className="mt-5 text-xs font-medium text-slate-500">{summary}</p>
      {selected && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-blue-700 px-2 py-1 text-xs font-semibold text-white">
          <Check className="h-3 w-3" />
          Selected
        </span>
      )}
    </button>
  );
}
