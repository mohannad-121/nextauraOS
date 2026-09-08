import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Loader2, Sparkles, X } from "lucide-react";
import { websiteBuilderService } from "../../services/websiteBuilderService";

type Proposal = {
  id: string;
  expiresAt?: string;
  createdAt?: string;
  plan: { summary?: string; operations?: any[] };
};

const examples = [
  "Make this page more premium",
  "Add an FAQ",
  "Change colors to black and gold",
  "Add an About page",
  "Make the site Arabic",
];

const label = (type?: string) =>
  (type || "section").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function operationSummary(operation: any, pages: any[]) {
  const page = pages.find((item) => item.id === operation.pageId)?.name || "this page";
  const section = label(operation.section?.type);
  switch (operation.op) {
    case "update_site_theme": return "Updated site theme";
    case "update_site_metadata": return "Updated site details";
    case "update_global_header": return "Updated global header";
    case "update_global_footer": return "Updated global footer";
    case "add_section": return `Added ${section} section to ${page}`;
    case "update_section": return `Updated a section on ${page}`;
    case "remove_section": return `Removed a section from ${page}`;
    case "move_section": return `Moved a section on ${page}`;
    case "duplicate_section": return `Duplicated a section on ${page}`;
    case "create_page": return `Created ${operation.name || "a new"} page`;
    case "rename_page": return `Renamed ${page}`;
    case "update_page_slug": return `Updated ${page} URL`;
    case "update_page_seo": return `Updated ${page} SEO`;
    case "add_navigation_item": return `Added ${operation.label || "a page"} to navigation`;
    case "update_navigation_item": return "Updated navigation";
    case "remove_navigation_item": return "Removed navigation item";
    default: return "Updated website draft";
  }
}

export function WebsiteAiEditDrawer({
  open, onClose, organizationId, siteId, currentPageId, pages, onApplied,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  siteId: string;
  currentPageId: string;
  pages: any[];
  onApplied: () => Promise<void>;
}) {
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [stage, setStage] = useState<"" | "generating" | "applying">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const operationCards = useMemo(
    () => proposal?.plan?.operations?.map((operation) => operationSummary(operation, pages)) || [],
    [proposal, pages],
  );
  const refreshHistory = useCallback(async () => {
    const result = await websiteBuilderService.listEditPlans(organizationId, siteId);
    setHistory(result.proposals || []);
  }, [organizationId, siteId]);
  if (!open) return null;
  const generate = async () => {
    if (!instruction.trim() || stage) return;
    setStage("generating"); setError(""); setNotice("");
    try {
      const result = await websiteBuilderService.generateEditPlan({
        organizationId, siteId, currentPageId, instruction: instruction.trim(),
      });
      setProposal(result.proposal);
      await refreshHistory();
    } catch (reason: any) {
      setError(reason.message || "We couldn't generate a valid edit suggestion.");
    } finally { setStage(""); }
  };
  const apply = async () => {
    if (!proposal || stage) return;
    setStage("applying"); setError("");
    try {
      await websiteBuilderService.applyEditPlan(organizationId, proposal.id);
      await onApplied();
      setNotice("Changes applied to draft. Review your changes before publishing.");
      setProposal(null); setInstruction("");
      await refreshHistory();
    } catch (reason: any) {
      setError(reason.message || "We couldn't apply this AI suggestion.");
    } finally { setStage(""); }
  };
  const close = () => { if (!stage) { setProposal(null); setError(""); setNotice(""); onClose(); } };
  return (
    <div className="fixed inset-0 z-[1200] bg-slate-950/65" role="presentation" onMouseDown={close}>
      <aside
        role="dialog" aria-modal="true" aria-labelledby="ai-edit-title" aria-busy={Boolean(stage)}
        onMouseDown={(event) => event.stopPropagation()}
        className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#10192e] shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-white/10 p-5">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-300"><Sparkles className="h-3.5 w-3.5" /> Website AI</p><h2 id="ai-edit-title" className="mt-1 text-xl font-semibold">{proposal ? "Review changes" : "Edit with AI"}</h2><p className="mt-1 text-sm text-slate-400">{proposal ? "Review the draft-only changes before applying." : "Describe what you’d like to change."}</p></div>
          <button onClick={close} disabled={Boolean(stage)} aria-label="Close AI editor" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 focus:ring-2 focus:ring-violet-400"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</p>}
          {!proposal ? <>
            <label className="mt-4 block text-sm font-medium">Describe the changes you want<textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={6000} placeholder="Describe the changes you want…" className="mt-2 h-36 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30" /></label>
            <div className="mt-3 flex flex-wrap gap-2">{examples.map((example) => <button key={example} onClick={() => setInstruction(example)} className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-100 hover:bg-violet-400/20">{example}</button>)}</div>
            {stage === "generating" && <div className="mt-5 rounded-xl border border-violet-300/15 bg-violet-400/10 p-4 text-sm text-violet-100"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Understanding your request · Reviewing website structure · Creating and validating an edit plan</div>}
            {history.length > 0 && <section className="mt-8"><h3 className="text-sm font-semibold">Recent AI suggestions</h3><div className="mt-3 space-y-2">{history.map((item) => <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-sm text-slate-200">{item.plan_json?.summary || item.instruction}</p><p className="mt-1 text-xs text-slate-500">{item.status === "applied" ? "Applied to draft" : item.status}</p></div>)}</div></section>}
          </> : <>
            <p className="rounded-xl bg-violet-400/10 p-4 text-sm leading-6 text-violet-50">{proposal.plan.summary}</p>
            <h3 className="mt-6 text-sm font-semibold">AI suggested changes</h3>
            <ol className="mt-3 space-y-2">{operationCards.map((summary, index) => <li key={`${summary}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-100"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-400/15 text-xs text-violet-200">{index + 1}</span>{summary}<details className="mt-2 text-xs text-slate-400"><summary className="cursor-pointer hover:text-slate-200">Details <ChevronDown className="inline h-3.5 w-3.5" /></summary><p className="mt-2">This change will be validated and applied only to the website draft.</p></details></li>)}</ol>
            <p className="mt-5 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">Publishing remains manual. Applying these changes never publishes your website.</p>
          </>}
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-white/10 p-4">
          {proposal ? <><button onClick={() => { setProposal(null); setError(""); }} disabled={Boolean(stage)} className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-white/10">Regenerate</button><button onClick={close} disabled={Boolean(stage)} className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-white/10">Cancel</button><button onClick={() => void apply()} disabled={Boolean(stage)} className="inline-flex items-center gap-2 rounded-lg bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">{stage === "applying" && <Loader2 className="h-4 w-4 animate-spin" />}{stage === "applying" ? "Applying changes…" : "Apply Changes"}</button></> : <button onClick={() => void generate()} disabled={!instruction.trim() || Boolean(stage)} className="inline-flex items-center gap-2 rounded-lg bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">{stage === "generating" && <Loader2 className="h-4 w-4 animate-spin" />}Generate changes</button>}
        </footer>
      </aside>
    </div>
  );
}
