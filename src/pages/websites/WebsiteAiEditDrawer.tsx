import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Circle, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { websiteBuilderService } from "../../services/websiteBuilderService";

type Proposal = { id: string; expiresAt?: string; createdAt?: string; plan: { summary?: string; operations?: any[] } };
type TaskStep = { id: string; label: string; status: "pending" | "running" | "completed" | "failed" | "cancelled"; attemptCount: number; maxAttempts: number; operationCount: number; errorSummary?: string | null; proposal?: Proposal | null };
type AgentTask = { id: string; instruction: string; targetLanguage: "en" | "ar"; status: "planning" | "generating" | "ready_for_review" | "applying" | "applied" | "failed" | "conflict" | "cancelled" | "expired"; totalSteps: number; completedSteps: number; errorSummary?: string | null; conflictResources?: Array<{ type: "global" | "page"; id: string }>; steps: TaskStep[] };

const isReviewableProposal = (value: any): value is Proposal => Boolean(value?.id && typeof value.plan?.summary === "string" && Array.isArray(value.plan.operations) && value.plan.operations.length);
const examples = ["Make this page more premium", "Add an FAQ", "Change colors to black and gold", "Add an About page", "Make the site Arabic"];
const label = (type?: string) => (type || "section").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function operationSummary(operation: any, pages: any[]) {
  const page = pages.find((item) => item.id === operation.pageId)?.name || "this page";
  const section = label(operation.section?.type);
  switch (operation.op) {
    case "update_site_theme": return "Updated site language layout";
    case "update_site_metadata": return "Updated site language";
    case "update_global_header": return "Translated the global header";
    case "update_global_footer": return "Translated the global footer";
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
    case "update_navigation_item": return "Translated a navigation label";
    case "remove_navigation_item": return "Removed navigation item";
    default: return "Updated website draft";
  }
}

export function WebsiteAiEditDrawer({ open, onClose, organizationId, siteId, currentPageId, pages, onApplied, hasUnsavedChanges, onSaveBeforeGenerate }: {
  open: boolean; onClose: () => void; organizationId: string; siteId: string; currentPageId: string; pages: any[]; onApplied: (result: any) => Promise<void>; hasUnsavedChanges: boolean; onSaveBeforeGenerate: () => Promise<void>;
}) {
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [task, setTask] = useState<AgentTask | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [stage, setStage] = useState<"" | "generating" | "applying">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const continueRunning = useRef(false);
  const taskRunnerActive = useRef(false);
  const taskProposals = useMemo(() => task?.steps.map((step) => step.proposal).filter(isReviewableProposal) || [], [task]);
  const operationCards = useMemo(() => (proposal ? [proposal] : taskProposals).flatMap((item) => (item.plan.operations || []).map((operation) => operationSummary(operation, pages))), [proposal, taskProposals, pages]);
  const reviewReady = Boolean(proposal) || task?.status === "ready_for_review";

  const refreshHistory = useCallback(async () => {
    const result = await websiteBuilderService.listEditPlans(organizationId, siteId);
    setHistory(result.proposals || []);
  }, [organizationId, siteId]);

  const driveTask = useCallback(async (taskId: string) => {
    if (taskRunnerActive.current) return;
    taskRunnerActive.current = true;
    continueRunning.current = true;
    setStage("generating");
    setError("");
    try {
      for (let guard = 0; guard < 200 && continueRunning.current; guard += 1) {
        const result = await websiteBuilderService.runNextEditTaskStep(organizationId, taskId);
        const next = result.task as AgentTask;
        setTask(next);
        if (next.status === "ready_for_review") { setStage(""); await refreshHistory(); break; }
        if (["failed", "conflict", "cancelled", "expired", "applied"].includes(next.status)) {
          setStage("");
          if (["failed", "conflict"].includes(next.status)) setError(next.errorSummary || "Website AI could not complete this task.");
          break;
        }
        await wait(400);
      }
    } catch (reason: any) {
      setError(reason.message || "Website AI could not continue this task.");
      setStage("");
    } finally { taskRunnerActive.current = false; }
  }, [organizationId, refreshHistory]);

  useEffect(() => {
    if (!open) { continueRunning.current = false; return; }
    let active = true;
    continueRunning.current = true;
    void Promise.all([refreshHistory(), websiteBuilderService.getActiveEditTask(organizationId, siteId)]).then(([, result]) => {
      if (!active || !result.task) return;
      const resumed = result.task as AgentTask;
      setTask(resumed);
      setInstruction(resumed.instruction);
      if (["planning", "generating"].includes(resumed.status)) void driveTask(resumed.id);
    }).catch((reason: any) => { if (active) setError(reason.message || "Unable to load Website AI progress."); });
    return () => { active = false; continueRunning.current = false; };
  }, [open, organizationId, siteId, refreshHistory, driveTask]);

  if (!open) return null;

  const generate = async () => {
    if (!instruction.trim() || stage) return;
    if (hasUnsavedChanges) { setError("Save your current changes before using AI."); return; }
    setStage("generating"); setError(""); setNotice(""); setProposal(null); setTask(null);
    try {
      const started = await websiteBuilderService.startEditTask({ organizationId, siteId, currentPageId, instruction: instruction.trim() });
      if (started.mode === "persistent_task") { setTask(started.task); await driveTask(started.task.id); return; }
      const result = await websiteBuilderService.generateEditPlan({ organizationId, siteId, currentPageId, instruction: instruction.trim() });
      if (!isReviewableProposal(result.proposal)) throw new Error("We couldn't generate a valid edit plan. Please try again.");
      setProposal(result.proposal);
      await refreshHistory();
    } catch (reason: any) {
      setProposal(null); setError(reason.message || "We couldn't generate a valid edit suggestion.");
    } finally { if (!taskRunnerActive.current) setStage(""); }
  };

  const apply = async () => {
    if ((!isReviewableProposal(proposal) && task?.status !== "ready_for_review") || stage) return;
    setStage("applying"); setError("");
    try {
      const response = task ? await websiteBuilderService.applyEditTask(organizationId, task.id) : await websiteBuilderService.applyEditPlan(organizationId, proposal!.id);
      if (!response?.result?.success || !Number.isInteger(response.result.operationCount)) throw new Error("AI changes could not be verified. Nothing was published.");
      await onApplied(response.result);
      setNotice(`${response.result.operationCount} change${response.result.operationCount === 1 ? "" : "s"} applied to your draft. Your live site has not changed.`);
      setProposal(null); setTask(null); setInstruction("");
      await refreshHistory();
    } catch (reason: any) {
      setError(reason.message || "We couldn't apply this AI suggestion.");
      if (task) {
        try {
          const refreshed = await websiteBuilderService.getEditTask(organizationId, task.id);
          setTask(refreshed.task);
        } catch {
          // Keep the reviewed task visible when a follow-up status refresh fails.
        }
      }
    }
    finally { setStage(""); }
  };

  const cancelTask = async () => {
    if (!task) return;
    continueRunning.current = false; setError("");
    try {
      const result = await websiteBuilderService.cancelEditTask(organizationId, task.id);
      setTask(result.task); setStage(""); setNotice("Website AI task cancelled. No draft changes were applied.");
    } catch (reason: any) { setError(reason.message || "Unable to cancel this task."); }
  };
  const resumeTask = async () => {
    if (!task) return;
    setError("");
    const result = await websiteBuilderService.resumeEditTask(organizationId, task.id);
    setTask(result.task); await driveTask(task.id);
  };
  const resetReview = () => { continueRunning.current = false; setProposal(null); setTask(null); setError(""); setStage(""); };
  const close = () => { continueRunning.current = false; setError(""); setNotice(""); onClose(); };
  const completed = task?.completedSteps || 0;
  const progress = task?.totalSteps ? Math.round((completed / task.totalSteps) * 100) : 0;

  return <div className="fixed inset-0 z-[1200] bg-slate-950/65" role="presentation" onMouseDown={close}>
    <aside role="dialog" aria-modal="true" aria-labelledby="ai-edit-title" aria-busy={Boolean(stage)} onMouseDown={(event) => event.stopPropagation()} className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#10192e] shadow-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-300"><Sparkles className="h-3.5 w-3.5" /> Website AI</p><h2 id="ai-edit-title" className="mt-1 text-xl font-semibold">{reviewReady ? "Review changes" : "Edit with AI"}</h2><p className="mt-1 text-sm text-slate-400">{reviewReady ? "Review grouped draft-only changes before applying." : "Describe what you'd like to change."}</p></div>
        <button onClick={close} aria-label="Close AI editor" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 focus:ring-2 focus:ring-violet-400"><X className="h-5 w-5" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</p>}
        {task && !["cancelled", "applied"].includes(task.status) && <section className="mt-4 rounded-xl border border-violet-300/15 bg-violet-400/[0.07] p-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{task.targetLanguage === "ar" ? "Arabic site conversion" : "English site conversion"}</p><p className="mt-1 text-xs text-slate-400">{completed} of {task.totalSteps} steps complete</p></div><span className="text-sm font-bold text-violet-200">{progress}%</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-400 transition-[width]" style={{ width: `${progress}%` }} /></div>
          <ol className="mt-4 space-y-2">{task.steps.map((step) => <li key={step.id} className="flex items-start gap-2 text-sm"><span className="mt-0.5 text-violet-300">{step.status === "completed" ? <Check className="h-4 w-4" /> : step.status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-4 w-4" />}</span><span className={step.status === "pending" ? "text-slate-400" : "text-slate-100"}>{step.label}{step.status === "failed" && <span className="block text-xs text-red-200">{step.errorSummary}</span>}</span></li>)}</ol>
          {task.status === "conflict" && <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-amber-100"><p>This website changed while AI was preparing your edits.</p><ul className="mt-2 list-disc space-y-1 pl-4">{(task.conflictResources || []).map((resource) => <li key={`${resource.type}-${resource.id}`}>{resource.type === "global" ? "Global site content" : pages.find((page) => page.id === resource.id)?.name || "A website page"}</li>)}</ul></div>}
        </section>}
        {!reviewReady && !task ? <>
          {hasUnsavedChanges && <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100"><p>Save your current changes before using AI.</p><button onClick={() => void onSaveBeforeGenerate()} disabled={Boolean(stage)} className="mt-2 rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-bold text-slate-950 disabled:opacity-60">Save &amp; Continue</button></div>}
          <label className="mt-4 block text-sm font-medium">Describe the changes you want<textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={6000} placeholder="Describe the changes you want…" className="mt-2 h-36 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30" /></label>
          <div className="mt-3 flex flex-wrap gap-2">{examples.map((example) => <button key={example} onClick={() => setInstruction(example)} className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-100 hover:bg-violet-400/20">{example}</button>)}</div>
          {stage === "generating" && <div className="mt-5 rounded-xl border border-violet-300/15 bg-violet-400/10 p-4 text-sm text-violet-100"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Creating and validating a bounded edit plan</div>}
          {history.length > 0 && <section className="mt-8"><h3 className="text-sm font-semibold">Recent AI suggestions</h3><div className="mt-3 space-y-2">{history.map((item) => <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-sm text-slate-200">{item.plan_json?.summary || item.instruction}</p><p className="mt-1 text-xs text-slate-500">{item.status === "applied" ? "Applied to draft" : item.status}</p></div>)}</div></section>}
        </> : reviewReady ? <>
          <p className="mt-4 rounded-xl bg-violet-400/10 p-4 text-sm leading-6 text-violet-50">{proposal?.plan.summary || `${operationCards.length} validated changes across ${taskProposals.length} safe batches.`}</p>
          <h3 className="mt-6 text-sm font-semibold">AI suggested changes</h3>
          <ol className="mt-3 space-y-2">{operationCards.map((summary, index) => <li key={`${summary}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-100"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-400/15 text-xs text-violet-200">{index + 1}</span>{summary}<details className="mt-2 text-xs text-slate-400"><summary className="cursor-pointer hover:text-slate-200">Details <ChevronDown className="inline h-3.5 w-3.5" /></summary><p className="mt-2">This validated change will be applied only to the website draft.</p></details></li>)}</ol>
          <p className="mt-5 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">Publishing remains manual. All batches apply transactionally and never publish your website.</p>
        </> : null}
      </div>
      <footer className="flex flex-col-reverse gap-2 border-t border-white/10 p-4 sm:flex-row sm:flex-wrap sm:justify-end">
        {reviewReady ? <><button onClick={resetReview} disabled={Boolean(stage)} className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-white/10">Regenerate</button><button onClick={close} disabled={stage === "applying"} className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-white/10">Cancel</button><button onClick={() => void apply()} disabled={Boolean(stage)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">{stage === "applying" && <Loader2 className="h-4 w-4 animate-spin" />}{stage === "applying" ? "Applying changes…" : `Apply ${operationCards.length} Changes`}</button></> : task && ["failed", "conflict"].includes(task.status) ? <><button onClick={() => void cancelTask()} className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-white/10">Cancel task</button><button onClick={() => void resumeTask()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950"><RotateCcw className="h-4 w-4" />{task.status === "conflict" ? "Recheck changes" : "Retry task"}</button></> : task && ["planning", "generating"].includes(task.status) ? <button onClick={() => void cancelTask()} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/10">Cancel task</button> : <button onClick={() => void generate()} disabled={!instruction.trim() || hasUnsavedChanges || Boolean(stage)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">{stage === "generating" && <Loader2 className="h-4 w-4 animate-spin" />}Generate changes</button>}
      </footer>
    </aside>
  </div>;
}
