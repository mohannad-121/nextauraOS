import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  Code2,
  ContactRound,
  Copy,
  GitBranch,
  GripVertical,
  Info,
  Layers3,
  Play,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
  Webhook,
  X,
  XCircle,
} from "lucide-react";
import { automationService } from "../../services/automationService";
import {
  nodeByType,
  nodeRegistry,
  type AutomationNodeDefinition,
} from "../../features/automation/nodeRegistry";
import { integrationConnectionService, type IntegrationConnection } from "../../services/integrationConnectionService";
import {
  triggerMap,
  type WorkflowNode,
  validateWorkflowGraph,
  replaceTriggerInGraph,
  deleteTriggerFromGraph,
  getTriggerNodes,
} from "../../features/automation/workflowValidation";

type PaletteItem = {
  type: string;
  title: string;
  category: "Trigger" | "Logic" | "Action";
  subtitle: string;
  icon: any;
  accent: string;
};
const legacyPalette: PaletteItem[] = [
  {
    type: "employee_created",
    title: "Employee Created",
    category: "Trigger",
    subtitle: "Runs when a new employee is added",
    icon: UserPlus,
    accent: "emerald",
  },
  {
    type: "contact_created",
    title: "Contact Created",
    category: "Trigger",
    subtitle: "Runs when a new contact is created",
    icon: ContactRound,
    accent: "emerald",
  },
  {
    type: "expense_status_changed",
    title: "Expense Status Changed",
    category: "Trigger",
    subtitle: "Runs when an expense changes status",
    icon: Layers3,
    accent: "emerald",
  },
  {
    type: "incoming_webhook",
    title: "Incoming Webhook",
    category: "Trigger",
    subtitle: "Runs when a secure webhook arrives",
    icon: Webhook,
    accent: "emerald",
  },
  {
    type: "if",
    title: "IF",
    category: "Logic",
    subtitle: "Route workflow based on a condition",
    icon: GitBranch,
    accent: "amber",
  },
  {
    type: "create_notification",
    title: "Create Notification",
    category: "Action",
    subtitle: "Create an in-app notification",
    icon: Bell,
    accent: "blue",
  },
  {
    type: "outgoing_webhook",
    title: "Send Webhook",
    category: "Action",
    subtitle: "POST data to an external endpoint",
    icon: Send,
    accent: "blue",
  },
];
void legacyPalette;
const palette = nodeRegistry;
const nodeInfo = nodeByType;
const accentClasses: Record<
  string,
  { border: string; icon: string; stripe: string; glow: string }
> = {
  emerald: {
    border: "border-emerald-400/50",
    icon: "bg-emerald-400/15 text-emerald-300",
    stripe: "bg-emerald-400",
    glow: "shadow-emerald-500/10",
  },
  amber: {
    border: "border-amber-400/50",
    icon: "bg-amber-400/15 text-amber-200",
    stripe: "bg-amber-400",
    glow: "shadow-amber-500/10",
  },
  blue: {
    border: "border-blue-400/50",
    icon: "bg-blue-400/15 text-blue-200",
    stripe: "bg-blue-400",
    glow: "shadow-blue-500/10",
  },
  purple: { border: "border-purple-400/50", icon: "bg-purple-400/15 text-purple-200", stripe: "bg-purple-400", glow: "shadow-purple-500/10" },
  cyan: { border: "border-cyan-400/50", icon: "bg-cyan-400/15 text-cyan-200", stripe: "bg-cyan-400", glow: "shadow-cyan-500/10" },
};
const defaults: Record<string, Record<string, unknown>> = {
  expense_status_changed: { to_status: "Pending" },
  if: { field: "status", operator: "equals", value: "" },
  create_notification: {
    title: "Automation update",
    message: "A workflow event was completed.",
  },
  outgoing_webhook: { url: "", method: "POST" },
  gmail_send_email: { connection_id: "", to: "", cc: "", bcc: "", subject: "", body: "" },
  facebook_comment_reply: {
    connection_id: "",
    resource_id: "",
    comment_id: "{{trigger.comment_id}}",
    message: "",
  },
};

function restoreGraph(workflow: any) {
  const normalize = (node: any) => ({
    ...node,
    data: {
      ...(node.data || {}),
      nodeType: node.type,
      config: node.data?.config || node.config || defaults[node.type] || {},
    },
  });
  if (workflow?.graph_nodes?.length)
    return {
      nodes: workflow.graph_nodes.map(normalize),
      edges: workflow.graph_edges || [],
    };
  if (!workflow || !workflow.trigger_type) {
    return { nodes: [], edges: [] };
  }
  const nodes: any[] = [
    normalize({
      id: "trigger",
      position: { x: 100, y: 220 },
      type: workflow.trigger_type.replace(".", "_"),
      data: {
        config:
          workflow.trigger_config ||
          defaults[workflow.trigger_type.replace(".", "_")] ||
          {},
      },
    }),
  ];
  const edges: any[] = [];
  let last = "trigger";
  if (workflow?.conditions?.length) {
    nodes.push(
      normalize({
        id: "if",
        position: { x: 430, y: 220 },
        type: "if",
        data: { config: workflow.conditions[0] },
      }),
    );
    edges.push({
      id: "trigger-if",
      source: last,
      target: "if",
      type: "smoothstep",
    });
    last = "if";
  }
  (workflow?.actions || []).forEach((action: any, index: number) => {
    const id = `action-${index}`;
    nodes.push(
      normalize({
        id,
        position: { x: 760 + index * 280, y: 220 },
        type: action.type,
        data: { config: action.config },
      }),
    );
    edges.push({
      id: `${last}-${id}`,
      source: last,
      target: id,
      type: "smoothstep",
    });
    last = id;
  });
  return { nodes, edges };
}

function compatibilityDefinition(
  nodes: WorkflowNode[],
  edges: Edge[],
  enabled: boolean = true,
  fallbackTriggerType?: string,
) {
  return validateWorkflowGraph({
    nodes,
    edges,
    enabled,
    fallbackTriggerType,
  });
}

function WorkflowNodeCard({ id, data, selected }: NodeProps<WorkflowNode>) {
  const info = nodeInfo[data.nodeType] || nodeInfo.create_notification;
  const Icon = info.icon;
  const accent = accentClasses[info.accent] || accentClasses.blue;
  const isTrigger = Boolean(triggerMap[data.nodeType]);
  return (
    <div
      className={`relative min-w-[210px] overflow-hidden rounded-xl border bg-slate-900/95 text-slate-100 shadow-xl backdrop-blur transition ${accent.border} ${accent.glow} ${selected ? "ring-2 ring-white/70" : "hover:-translate-y-0.5 hover:shadow-2xl"}`}
    >
      <div className={`h-1 ${accent.stripe}`} />
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-slate-950 !bg-slate-200"
        />
      )}
      <div className="flex gap-3 p-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent.icon}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <p className="truncate text-sm font-semibold">{info.title}</p>
            <div className="flex items-center gap-1">
              {isTrigger ? (
                <>
                  {data.nodeType === "facebook_page_comment_created" && (
                    <button
                      type="button"
                      title="Test trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        data.onTestTrigger?.(id);
                      }}
                      className="nodrag rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300 hover:bg-emerald-400/25"
                    >
                      Test
                    </button>
                  )}
                  <button
                    type="button"
                    title="Replace trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onReplaceTrigger?.(id);
                    }}
                    className="nodrag rounded bg-cyan-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300 hover:bg-cyan-400/20"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    title="Delete trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onDeleteNode?.(id);
                    }}
                    className="nodrag rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    title="Duplicate node"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onDuplicateNode?.(id);
                    }}
                    className="nodrag rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    title="Delete node"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onDeleteNode?.(id);
                    }}
                    className="nodrag rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            {info.description}
          </p>
        </div>
      </div>
      {data.nodeType === "if" ? (
        <div className="border-t border-white/10 px-3 py-2">
          <div className="relative flex justify-between text-[10px] font-semibold">
            <button
              className="nodrag text-emerald-300 hover:text-white"
              onClick={() => data.onQuickAdd?.(id, "true")}
            >
              + TRUE
            </button>
            <button
              className="nodrag text-rose-300 hover:text-white"
              onClick={() => data.onQuickAdd?.(id, "false")}
            >
              + FALSE
            </button>
            <Handle
              id="true"
              type="source"
              position={Position.Right}
              style={{ top: "48%", right: 42 }}
              className="!h-3 !w-3 !border-2 !border-slate-950 !bg-emerald-400"
            />
            <Handle
              id="false"
              type="source"
              position={Position.Right}
              style={{ top: "48%" }}
              className="!h-3 !w-3 !border-2 !border-slate-950 !bg-rose-400"
            />
          </div>
        </div>
      ) : (
        <>
          <button
            className="nodrag absolute bottom-2 right-6 rounded bg-white/5 px-1.5 text-[10px] text-slate-400 hover:bg-white/10 hover:text-white"
            onClick={() => data.onQuickAdd?.(id)}
          >
            + Add next
          </button>
          <Handle
            type="source"
            position={Position.Right}
            className={`!h-3 !w-3 !border-2 !border-slate-950 ${info.accent === "emerald" ? "!bg-emerald-400" : info.accent === "amber" ? "!bg-amber-400" : "!bg-blue-400"}`}
          />
        </>
      )}
    </div>
  );
}
const visualNodeTypes = Object.fromEntries(
  palette.map((item) => [item.type, WorkflowNodeCard]),
);

function ReplaceTriggerModal({
  currentTriggerNode,
  newTriggerDefinition,
  onConfirm,
  onCancel,
}: {
  currentTriggerNode: WorkflowNode;
  newTriggerDefinition: AutomationNodeDefinition;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const currentInfo = nodeInfo[currentTriggerNode.type || ""] || {
    title: currentTriggerNode.type || "Current trigger",
    accent: "emerald",
    icon: Sparkles,
    description: "",
  };
  const CurrentIcon = currentInfo.icon || Sparkles;
  const NewIcon = newTriggerDefinition.icon || Sparkles;

  return (
    <div
      className="fixed inset-0 z-[1100] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-xs"
      role="alertdialog"
      aria-modal="true"
      aria-label="Replace current trigger"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="p-6">
          <h3 className="text-lg font-bold text-white">Replace current trigger?</h3>
          <p className="mt-1.5 text-xs text-slate-400">
            A workflow can have only one trigger. Replacing the trigger will keep your action and logic nodes while updating the event that starts this workflow.
          </p>

          <div className="mt-6 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current trigger</p>
              <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
                  <CurrentIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{currentInfo.title}</p>
                  <p className="text-xs text-slate-400">{currentInfo.description}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center py-0.5">
              <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-300">
                replacing with
              </span>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New trigger</p>
              <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-200">
                  <NewIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cyan-100">{newTriggerDefinition.title}</p>
                  <p className="text-xs text-cyan-200/70">{newTriggerDefinition.description}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/15 hover:opacity-95"
            >
              Replace trigger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestFacebookCommentModal({
  open,
  onClose,
  triggerNode,
  metaResources,
  organizationId,
  workflowId,
  onRunSuccess,
}: {
  open: boolean;
  onClose: () => void;
  triggerNode: WorkflowNode;
  metaResources?: any[];
  organizationId: string;
  workflowId: string;
  onRunSuccess?: (run: any) => void;
}) {
  const triggerConfig = (triggerNode.data?.config || {}) as Record<string, unknown>;
  const resourceId = String(triggerConfig.resource_id || "");
  const [resources, setResources] = useState<any[]>(metaResources || []);

  useEffect(() => {
    const connId = String(triggerConfig.connection_id || "");
    if (connId && (!resources || resources.length === 0)) {
      integrationConnectionService
        .getMetaDetails(organizationId, connId)
        .then((res) => setResources(res.resources || []))
        .catch(() => setResources([]));
    }
  }, [triggerConfig.connection_id, organizationId]);

  const selectedResource = resources.find(
    (r) => String(r.external_resource_id) === resourceId,
  );
  const pageName = selectedResource?.display_name || resourceId || "NextAura AI";

  const defaultMsg = triggerConfig.contains_text
    ? `NextAura test comment with ${triggerConfig.contains_text}`
    : "NextAura Facebook automation test comment";

  const [message, setMessage] = useState(defaultMsg);
  const [isReply, setIsReply] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "preparing" | "event_created" | "waiting" | "running" | "succeeded" | "mismatch" | "failed"
  >("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  useEffect(() => {
    setMessage(
      triggerConfig.contains_text
        ? `NextAura test comment with ${triggerConfig.contains_text}`
        : "NextAura Facebook automation test comment",
    );
    setStatus("idle");
    setStatusMessage("");
    setResultSummary(null);
    setErrorSummary(null);
    setRunId(null);
  }, [triggerConfig.contains_text, open]);

  if (!open) return null;

  const exactPostId = triggerConfig.exact_post_id ? String(triggerConfig.exact_post_id) : null;
  const isRunning = ["preparing", "event_created", "waiting", "running"].includes(status);

  const handleRunTest = async () => {
    try {
      setStatus("preparing");
      setStatusMessage("Preparing test event...");
      setResultSummary(null);
      setErrorSummary(null);

      const response = await automationService.testTrigger({
        organizationId,
        workflowId,
        triggerNodeId: triggerNode.id,
        message: message.trim(),
        isReply,
        postId: exactPostId || undefined,
      });

      setStatus("event_created");
      setStatusMessage("Synthetic Facebook comment event created.");

      let currentRun = response.run;
      const currentRunId = response.runId || currentRun?.id;
      setRunId(currentRunId);

      if (
        currentRunId &&
        (!currentRun || currentRun.status === "pending" || currentRun.status === "running")
      ) {
        setStatus("waiting");
        setStatusMessage("Waiting for workflow execution...");
        for (let attempt = 0; attempt < 12; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          setStatus("running");
          setStatusMessage("Worker executing downstream actions...");
          const detailRes = await automationService.runDetail(organizationId, currentRunId);
          if (
            detailRes.run &&
            (detailRes.run.status === "completed" || detailRes.run.status === "failed")
          ) {
            currentRun = detailRes.run;
            break;
          }
        }
      }

      if (!currentRun) {
        setStatus("failed");
        setErrorSummary("Run was enqueued but worker status could not be confirmed.");
        return;
      }

      if (currentRun.status === "completed") {
        const summary = currentRun.result_summary || "";
        const isMismatch =
          summary.includes("does not match") ||
          summary.includes("not contain required text") ||
          summary.includes("Replies are ignored");

        if (isMismatch) {
          setStatus("mismatch");
          setStatusMessage("Trigger conditions not met");
          setResultSummary(summary);
        } else {
          setStatus("succeeded");
          setStatusMessage("Test succeeded! Downstream actions executed.");
          setResultSummary(summary || "Workflow action executed successfully.");
          onRunSuccess?.(currentRun);
        }
      } else if (currentRun.status === "failed") {
        setStatus("failed");
        setStatusMessage("Test failed");
        setErrorSummary(currentRun.error_summary || "Workflow run failed during execution.");
      }
    } catch (err: any) {
      setStatus("failed");
      setStatusMessage("Test failed");
      setErrorSummary(err.message || "Failed to execute test.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Test Facebook Comment"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
              <Play className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Test Facebook Comment</h2>
              <p className="text-xs text-slate-400">
                Safe internal development test for Facebook triggers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Target Facebook Page
            </p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{pageName}</p>
              <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
                Authorized Page
              </span>
            </div>
            {exactPostId && (
              <p className="mt-2 text-xs text-amber-300">
                Exact Post ID filter: <span className="font-mono">{exactPostId}</span>
              </p>
            )}
          </div>

          <label className="block text-xs font-medium text-slate-300">
            Comment text
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isRunning}
              placeholder="Enter test comment text..."
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70 disabled:opacity-60"
            />
            {Boolean(triggerConfig.contains_text) && (
              <span className="mt-1 block text-[11px] text-slate-400">
                Trigger requires text containing: <span className="text-cyan-300 font-mono">"{String(triggerConfig.contains_text)}"</span>
              </span>
            )}
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isReply}
              onChange={(e) => setIsReply(e.target.checked)}
              disabled={isRunning}
              className="rounded border-white/10 bg-slate-900 text-cyan-400 focus:ring-cyan-400 disabled:opacity-60"
            />
            Reply to another comment
            {triggerConfig.include_replies === false && (
              <span className="text-[11px] text-amber-400 italic">
                (Trigger ignores replies)
              </span>
            )}
          </label>

          {status !== "idle" && (
            <div
              className={`rounded-xl border p-4 text-xs ${
                status === "succeeded"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : status === "mismatch"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  : status === "failed"
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                ) : status === "succeeded" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : status === "mismatch" ? (
                  <Info className="h-4 w-4 text-amber-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="font-semibold">{statusMessage}</span>
              </div>
              {resultSummary && (
                <p className="mt-1.5 pl-6 text-[11px] opacity-90">{resultSummary}</p>
              )}
              {errorSummary && (
                <p className="mt-1.5 pl-6 text-[11px] opacity-90">{errorSummary}</p>
              )}
              {runId && (
                <p className="mt-2 pl-6 font-mono text-[10px] text-slate-400">
                  Run ID: {runId}
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-white/10 bg-slate-950/40 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            {status === "succeeded" ? "Done" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => void handleRunTest()}
            disabled={isRunning || !message.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/15 hover:opacity-95 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                Running test...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Run test
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

function NodePicker({
  onChoose,
  onClose,
  initialCategory,
  replacementForTitle,
}: {
  onChoose: (node: AutomationNodeDefinition) => void;
  onClose: () => void;
  initialCategory?: "Trigger" | "Logic" | "Action" | "Integration" | "AI" | "Data" | "Utility";
  replacementForTitle?: string;
}) {
  const [query, setQuery] = useState("");
  const matches = palette.filter((node) =>
    `${node.title} ${node.category} ${node.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const allCategories = [
    "Trigger",
    "Logic",
    "Action",
    "Integration",
    "AI",
    "Data",
    "Utility",
  ] as const;

  const categories = initialCategory ? [initialCategory] : allCategories;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add workflow node"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        {replacementForTitle && (
          <div className="border-b border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-xs text-cyan-200">
            <span className="font-semibold text-cyan-100">Replace Trigger:</span> Currently using <span className="underline">{replacementForTitle}</span>. Select a new trigger below.
          </div>
        )}
        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <Search className="h-5 w-5 text-cyan-300" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={initialCategory ? `Search ${initialCategory.toLowerCase()}s...` : "Search nodes..."}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {categories.map((category) => {
            const nodes = matches.filter((node) => node.category === category);
            return nodes.length ? (
              <section key={category} className="mb-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">
                  {category}s
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {nodes.map((node) => {
                    const Icon = node.icon;
                    return (
                      <button
                        key={node.type}
                        disabled={!node.available}
                        onClick={() => node.available && onChoose(node)}
                        className={`flex items-center gap-3 rounded-xl border border-white/10 p-3 text-left ${node.available ? "hover:border-cyan-300/50 hover:bg-white/5" : "cursor-not-allowed opacity-45"}`}
                      >
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${(accentClasses[node.accent] || accentClasses.blue).icon}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-100">
                            {node.title}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {node.description}
                          </p>
                        </div>
                        <span className="ms-auto text-[9px] uppercase tracking-wide text-slate-400">
                          {node.available ? "Available" : "Soon"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}

function ConfigPanel({
  node,
  update,
  connections,
  connectionLoading,
  onAddGmailPermission,
  onAddMetaPermission,
  organizationId,
  onDeleteNode,
  onReplaceTrigger,
  onTestTrigger,
}: {
  node: WorkflowNode | null;
  update: (config: Record<string, unknown>) => void;
  connections: IntegrationConnection[];
  connectionLoading: boolean;
  onAddGmailPermission: (connectionId: string) => void;
  onAddMetaPermission?: (connectionId: string, additionalScopes: string[]) => void;
  organizationId: string;
  onDeleteNode?: () => void;
  onReplaceTrigger?: () => void;
  onTestTrigger?: () => void;
}) {
  const [metaResources, setMetaResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    const info = nodeInfo[node?.type || ""];
    const connectionId = node?.data?.config?.connection_id;
    if (info?.provider === "meta" && connectionId) {
      setLoadingResources(true);
      integrationConnectionService.getMetaDetails(organizationId, String(connectionId))
        .then(res => setMetaResources(res.resources || []))
        .catch(() => setMetaResources([]))
        .finally(() => setLoadingResources(false));
    } else {
      setMetaResources([]);
    }
  }, [node?.data?.config?.connection_id, node?.type, organizationId]);
  if (!node)
    return (
      <aside className="hidden w-80 border-s border-white/10 bg-slate-950/70 p-5 xl:block">
        <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center">
          <Code2 className="mx-auto h-5 w-5 text-slate-500" />
          <p className="mt-3 text-sm font-medium text-slate-300">
            Node configuration
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Select a node to configure its behavior.
          </p>
        </div>
      </aside>
    );
  const info = nodeInfo[node.type || ""];
  const config = node.data.config || {};
  const field = (key: string, value: unknown) =>
    update({ ...config, [key]: value });
  const input = (
    label: string,
    key: string,
    placeholder = "",
    type = "text",
  ) => (
    <label className="block text-xs font-medium text-slate-300">
      {label}
      <input
        type={type}
        value={String(config[key] ?? "")}
        placeholder={placeholder}
        onChange={(event) =>
          field(
            key,
            type === "number" ? Number(event.target.value) : event.target.value,
          )
        }
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70"
      />
    </label>
  );
  return (
    <aside className="absolute inset-y-0 right-0 z-30 w-[min(320px,92vw)] overflow-y-auto border-s border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur xl:relative xl:w-[320px] xl:shrink-0 xl:shadow-none">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentClasses[info?.accent || "blue"].icon}`}
        >
          {info && <info.icon className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{info?.title}</p>
          <p className="text-xs text-slate-500">
            {info?.category} configuration
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {info?.requires_connection && (
          <label className="block text-xs font-medium text-slate-300">
            Connection
            <select
              value={String(config.connection_id || "")}
              onChange={(event) => field("connection_id", event.target.value)}
              disabled={connectionLoading}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/70 disabled:opacity-60"
            >
              <option value="">{connectionLoading ? "Loading connections…" : "Select an active connection"}</option>
              {connections.filter((connection) => connection.status === "active" && connection.provider === info.provider && (!info.connection_type || connection.auth_type === info.connection_type)).map((connection) => <option key={connection.id} value={connection.id}>{connection.name}{connection.account_label ? ` · ${connection.account_label}` : ""}{info.required_scopes?.some((scope) => !connection.scopes.includes(scope)) ? " · Permission required" : ""}</option>)}
            </select>
            <span className="mt-1 block text-[11px] font-normal leading-4 text-slate-500">Only active {info.provider} connections in this company are shown. Credentials are never stored in the workflow.</span>
          </label>
        )}
        {info?.provider === "meta" && config.connection_id && (
          <label className="block text-xs font-medium text-slate-300">
            Facebook Page
            <select
              value={String(config.resource_id || "")}
              onChange={(event) => field("resource_id", event.target.value)}
              disabled={loadingResources}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/70 disabled:opacity-60"
            >
              <option value="">{loadingResources ? "Loading pages..." : "Select a Facebook Page"}</option>
              {metaResources.filter(r => r.resource_type === "facebook_page" && r.selected).map(r => (
                <option key={r.id} value={r.external_resource_id}>{r.display_name}</option>
              ))}
            </select>
          </label>
        )}
        {node.type === "facebook_page_comment_created" && (
          <>
            {input("Message contains (optional)", "contains_text", "e.g. refund")}
            {input("Exact Post ID (optional)", "exact_post_id", "Limit to one specific post")}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(config.include_replies)}
                onChange={(event) => field("include_replies", event.target.checked)}
                className="rounded border-white/10 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
              />
              Include replies to comments
            </label>
          </>
        )}
        {node.type === "expense_status_changed" && (
          <label className="block text-xs font-medium text-slate-300">
            New status
            <select
              value={String(config.to_status || "Pending")}
              onChange={(event) => field("to_status", event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/70"
            >
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>Paid</option>
            </select>
          </label>
        )}
        {node.type === "if" && (
          <>
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
              <Info className="me-1 inline h-3.5 w-3.5" />
              Route the event down exactly one branch.
            </p>
            {input("Field", "field", "e.g. status")}
            <label className="block text-xs font-medium text-slate-300">
              Operator
              <select
                value={String(config.operator || "equals")}
                onChange={(event) => field("operator", event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/70"
              >
                {[
                  "equals",
                  "not_equals",
                  "contains",
                  "greater_than",
                  "less_than",
                  "is_empty",
                  "is_not_empty",
                  "changed_from",
                  "changed_to",
                ].map((operator) => (
                  <option key={operator} value={operator}>
                    {operator.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            {!["is_empty", "is_not_empty"].includes(String(config.operator)) &&
              input("Value", "value", "Value")}
          </>
        )}
        {node.type === "create_notification" && (
          <>
            {input("Title", "title", "Notification title")}
            <label className="block text-xs font-medium text-slate-300">
              Message
              <textarea
                value={String(config.message || "")}
                onChange={(event) => field("message", event.target.value)}
                placeholder="Notification message"
                className="mt-1.5 h-28 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70"
              />
            </label>
          </>
        )}
        {node.type === "outgoing_webhook" && (
          <>
            <p className="rounded-xl border border-blue-400/20 bg-blue-400/10 p-3 text-xs text-blue-100">
              A secure HTTPS POST request will be sent.
            </p>
            {input("Endpoint URL", "url", "https://example.com/webhook")}
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
              Method{" "}
              <span className="float-right font-medium text-slate-100">
                POST
              </span>
            </div>
          </>
        )}
        {node.type === "gmail_send_email" && (
          <>
            <p className="rounded-xl border border-purple-400/20 bg-purple-400/10 p-3 text-xs text-purple-100">Sends through the selected Google account. Gmail send permission is required.</p>
            {input("To", "to", "recipient@example.com", "email")}
            {input("CC", "cc", "Optional recipients", "text")}
            {input("BCC", "bcc", "Optional recipients", "text")}
            {input("Subject", "subject", "Email subject")}
            <label className="block text-xs font-medium text-slate-300">Body<textarea value={String(config.body || "")} onChange={(event) => field("body", event.target.value)} className="mt-1.5 h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/70" /></label>
            {String(config.connection_id || "") && info?.required_scopes?.some((scope) => !connections.find((item) => item.id === config.connection_id)?.scopes.includes(scope)) && <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">Gmail permission required<button onClick={() => onAddGmailPermission(String(config.connection_id))} className="mt-2 block font-semibold underline">Add Gmail permission</button></div>}
          </>
        )}
        {node.type === "facebook_comment_reply" && (
          <>
            <p className="rounded-xl border border-purple-400/20 bg-purple-400/10 p-3 text-xs text-purple-100">
              Post a public reply to a comment on your Facebook Page using the authorized Page connection.
            </p>
            {input("Comment ID", "comment_id", "{{trigger.comment_id}}")}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400">Dynamic tag:</span>
              {["{{trigger.comment_id}}", "{{trigger.post_id}}"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => field("comment_id", tag)}
                  className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 hover:bg-white/10"
                >
                  {tag}
                </button>
              ))}
            </div>
            <label className="block text-xs font-medium text-slate-300">
              Reply Message
              <textarea
                value={String(config.message || "")}
                onChange={(event) => field("message", event.target.value)}
                placeholder="Write your comment reply... e.g. Thanks for reaching out, {{trigger.author_name}}!"
                className="mt-1.5 h-28 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70"
              />
            </label>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400">Insert tag:</span>
              {[
                "{{trigger.author_name}}",
                "{{trigger.message}}",
                "{{trigger.comment_id}}",
                "{{trigger.post_id}}",
                "{{trigger.page_id}}",
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const current = String(config.message || "");
                    field("message", current ? `${current} ${tag}` : tag);
                  }}
                  className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 hover:bg-white/10"
                >
                  {tag}
                </button>
              ))}
            </div>
            {String(config.connection_id || "") &&
              info?.required_scopes?.some(
                (scope) =>
                  !connections
                    .find((item) => item.id === config.connection_id)
                    ?.scopes.includes(scope),
              ) && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
                  <p className="font-semibold text-amber-200">
                    Additional Facebook permission required: pages_manage_engagement
                    Additional Facebook permissions required
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-amber-300/80">
                    Replying to comments on a Facebook Page requires the <code>pages_manage_engagement</code> scope. Reconnect to authorize this permission.
                    Replying to comments on a Facebook Page requires the <code>pages_read_user_content</code> and <code>pages_manage_engagement</code> scopes. Reconnect to authorize these permissions.
                  </p>
                  {onAddMetaPermission && (
                    <button
                      type="button"
                      onClick={() =>
                        onAddMetaPermission(String(config.connection_id), [
                          "pages_read_user_content",
                          "pages_manage_engagement",
                        ])
                      }
                      className="mt-2.5 rounded-lg bg-amber-400/20 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/30"
                    >
                      Authorize / Reconnect with required permission
                      Authorize / Reconnect with required permissions
                    </button>
                  )}
                </div>
              )}
          </>
        )}
        {["employee_created", "contact_created", "incoming_webhook"].includes(
          node.type || "",
        ) && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
            This trigger needs no additional configuration.
          </div>
        )}
      </div>
      <div className="mt-6 border-t border-white/10 pt-4 space-y-2">
        {triggerMap[node.type || ""] ? (
          <>
            {node.type === "facebook_page_comment_created" && onTestTrigger && (
              <button
                type="button"
                onClick={onTestTrigger}
                className="w-full rounded-xl border border-cyan-400/40 bg-cyan-400/15 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-400/25"
              >
                <Play className="me-1 inline h-3.5 w-3.5 fill-current text-cyan-300" />
                Test trigger
              </button>
            )}
            <button
              type="button"
              onClick={onReplaceTrigger}
              className="w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20"
            >
              Replace trigger
            </button>
            <button
              type="button"
              onClick={onDeleteNode}
              className="w-full rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-400/20"
            >
              <Trash2 className="me-1 inline h-3.5 w-3.5" />
              Delete trigger
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onDeleteNode}
            className="w-full rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-400/20"
          >
            <Trash2 className="me-1 inline h-3.5 w-3.5" />
            Delete node
          </button>
        )}
      </div>
      <details className="mt-8 border-t border-white/10 pt-4">
        <summary className="cursor-pointer text-xs font-medium text-slate-500">
          Advanced / debug configuration
        </summary>
        <pre className="mt-3 overflow-auto rounded-xl bg-black/25 p-3 text-[10px] text-slate-400">
          {JSON.stringify(config, null, 2)}
        </pre>
      </details>
    </aside>
  );
}

export function WorkflowBuilder({
  onClose,
  organizationId,
  workflow,
  onSaved,
}: {
  onClose: () => void;
  organizationId: string;
  workflow?: any;
  onSaved: () => void;
}) {
  const initialGraph = useMemo(() => restoreGraph(workflow), [workflow]);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(
    initialGraph.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialGraph.edges,
  );
  const [selected, setSelected] = useState<WorkflowNode | null>(null);
  const [name, setName] = useState(workflow?.name || "Untitled automation");
  const [enabled, setEnabled] = useState(Boolean(workflow?.enabled));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [search, setSearch] = useState("");
  const [replaceModal, setReplaceModal] = useState<{
    currentTrigger: WorkflowNode;
    newTriggerDef: AutomationNodeDefinition;
  } | null>(null);
  const [picker, setPicker] = useState<{
    sourceId?: string;
    sourceHandle?: string;
    position?: { x: number; y: number };
    initialCategory?: "Trigger" | "Logic" | "Action" | "Integration" | "AI" | "Data" | "Utility";
    replacementForTitle?: string;
  } | null>(null);
  const flowRef = useRef<any>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [testModalNode, setTestModalNode] = useState<WorkflowNode | null>(null);
  const hasFacebookTrigger = nodes.some(
    (n) => n.type === "facebook_page_comment_created",
  );

  const handleOpenTest = (triggerNodeId?: string) => {
    const trigger = triggerNodeId
      ? nodes.find((n) => n.id === triggerNodeId)
      : nodes.find((n) => n.type === "facebook_page_comment_created");

    if (!trigger) return;

    if (!workflow?.id) {
      setError("Please save the workflow before running a test.");
      return;
    }
    if (!enabled) {
      setError("Workflow must be enabled to run a test.");
      return;
    }

    const config = (trigger.data?.config || {}) as Record<string, unknown>;
    if (!config.connection_id || !config.resource_id) {
      setSelected(trigger);
      setConfigOpen(true);
      setError("Please configure an active Meta connection and select a Facebook Page in the trigger first.");
      return;
    }

    setError("");
    setTestModalNode(trigger);
  };
  useEffect(() => { const previousOverflow = document.body.style.overflow; const previousPadding = document.body.style.paddingRight; const scrollbar = window.innerWidth - document.documentElement.clientWidth; document.body.style.overflow = "hidden"; if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`; return () => { document.body.style.overflow = previousOverflow; document.body.style.paddingRight = previousPadding; }; }, []);
  useEffect(() => { let cancelled = false; setConnections([]); setConnectionLoading(true); integrationConnectionService.list(organizationId).then((items) => { if (!cancelled) setConnections(items); }).catch(() => { if (!cancelled) setConnections([]); }).finally(() => { if (!cancelled) setConnectionLoading(false); }); return () => { cancelled = true; }; }, [organizationId]);

  const openTriggerPicker = (replacementForTriggerId?: string) => {
    const currentTrigger = replacementForTriggerId
      ? nodes.find((n) => n.id === replacementForTriggerId)
      : nodes.find((n) => triggerMap[n.type || ""]);

    const currentTitle = currentTrigger
      ? (nodeInfo[currentTrigger.type || ""]?.title || currentTrigger.type)
      : undefined;

    setPicker({
      initialCategory: "Trigger",
      replacementForTitle: currentTitle,
      position: currentTrigger ? currentTrigger.position : { x: 100, y: 220 },
    });
  };

  const confirmReplaceTrigger = () => {
    if (!replaceModal) return;
    const { currentTrigger, newTriggerDef } = replaceModal;
    const result = replaceTriggerInGraph({
      nodes,
      edges,
      currentTriggerId: currentTrigger.id,
      newTriggerDefinition: newTriggerDef,
    });

    setNodes(result.nodes);
    setEdges(result.edges);
    setSelected(result.newTriggerNode);
    setConfigOpen(true);
    setError("");
    setReplaceModal(null);
  };

  const deleteNode = useCallback((nodeId: string) => {
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return;

    const isTrigger = Boolean(triggerMap[target.type || ""]);
    if (isTrigger) {
      if (
        !confirm(
          "Delete the trigger? The workflow will be switched to draft until you choose another trigger.",
        )
      ) {
        return;
      }
      const result = deleteTriggerFromGraph({ nodes, edges, triggerId: nodeId });
      setNodes(result.nodes);
      setEdges(result.edges);
      setEnabled(false);
      if (selected?.id === nodeId) {
        setSelected(null);
        setConfigOpen(false);
      }
      setError("");
      return;
    }

    setNodes((current) => current.filter((node) => node.id !== nodeId));
    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
    );
    if (selected?.id === nodeId) {
      setSelected(null);
      setConfigOpen(false);
    }
  }, [nodes, edges, selected, setNodes, setEdges]);

  const deleteSelected = () => {
    if (!selected) return;
    deleteNode(selected.id);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;
      if ((document.activeElement as HTMLElement)?.isContentEditable) return;
      if (selected) {
        event.preventDefault();
        deleteNode(selected.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, deleteNode]);

  const add = (
    item: AutomationNodeDefinition,
    position?: { x: number; y: number },
    sourceId?: string,
    sourceHandle?: string,
  ) => {
    if (!item.available) return;

    const isTrigger = item.category === "Trigger" || Boolean(triggerMap[item.type]);
    if (isTrigger) {
      const existingTrigger = nodes.find((node) => triggerMap[node.type || ""]);
      if (existingTrigger) {
        setReplaceModal({
          currentTrigger: existingTrigger,
          newTriggerDef: item,
        });
        return;
      }
    }

    if (nodes.length >= 100) {
      setError("Workflow node limit reached.");
      return;
    }

    const id = crypto.randomUUID();
    const defaultPosition = isTrigger
      ? { x: 100, y: 220 }
      : {
          x: 180 + nodes.length * 40,
          y: 140 + nodes.length * 35,
        };

    const newNode: WorkflowNode = {
      id,
      type: item.type,
      position: position || defaultPosition,
      data: {
        nodeType: item.type,
        config: item.defaultConfig || defaults[item.type] || {},
      },
    };

    setNodes((current) => [...current, newNode]);

    if (isTrigger && !sourceId) {
      const targetAction = nodes.find(
        (node) => !triggerMap[node.type || ""] && !edges.some((e) => e.target === node.id),
      );
      if (targetAction) {
        setEdges((current) =>
          addEdge(
            {
              id: crypto.randomUUID(),
              source: id,
              target: targetAction.id,
              type: "smoothstep",
            },
            current,
          ),
        );
      }
    } else if (sourceId) {
      setEdges((current) =>
        addEdge(
          {
            id: crypto.randomUUID(),
            source: sourceId,
            target: id,
            sourceHandle,
            type: "smoothstep",
            label: sourceHandle?.toUpperCase(),
            animated: Boolean(sourceHandle),
          },
          current,
        ),
      );
    }

    setSelected(newNode);
    setConfigOpen(true);
    setError("");
  };

  const openQuickAdd = (sourceId?: string, sourceHandle?: string) => {
    const source = nodes.find((node) => node.id === sourceId);
    setPicker({
      sourceId,
      sourceHandle,
      position: source
        ? {
            x: source.position.x + 320,
            y:
              source.position.y +
              (sourceHandle === "false"
                ? 170
                : sourceHandle === "true"
                  ? -120
                  : 0),
          }
        : undefined,
    });
  };

  const duplicateSelected = () => {
    if (!selected || triggerMap[selected.type || ""]) return;
    add(nodeByType[selected.type || ""], {
      x: selected.position.x + 48,
      y: selected.position.y + 48,
    });
  };

  const connect = useCallback(
    (connection: Connection) =>
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            id: crypto.randomUUID(),
            type: "smoothstep",
            animated: Boolean(connection.sourceHandle),
            label: connection.sourceHandle?.toUpperCase(),
            style: {
              stroke:
                connection.sourceHandle === "false"
                  ? "#fb7185"
                  : connection.sourceHandle === "true"
                    ? "#34d399"
                    : "#60a5fa",
              strokeWidth: 2,
            },
          },
          current,
        ),
      ),
    [setEdges],
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (
        !connection.source ||
        !connection.target ||
        connection.source === connection.target
      )
        return false;
      const target = nodes.find((node) => node.id === connection.target);
      if (target && triggerMap[target.type || ""]) return false;
      if (
        edges.some(
          (edge) =>
            edge.source === connection.source &&
            edge.target === connection.target &&
            edge.sourceHandle === connection.sourceHandle,
        )
      )
        return false;
      if (
        connection.sourceHandle &&
        connection.sourceHandle !== "true" &&
        connection.sourceHandle !== "false"
      )
        return false;
      const reachesSource = (id: string, seen = new Set<string>()): boolean => {
        if (id === connection.source) return true;
        if (seen.has(id)) return false;
        seen.add(id);
        return edges
          .filter((edge) => edge.source === id)
          .some((edge) => reachesSource(edge.target, seen));
      };
      return !reachesSource(connection.target);
    },
    [nodes, edges],
  );

  const drop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/nextaura-node");
    const item = palette.find((entry) => entry.type === type);
    if (item && flowRef.current)
      add(
        item,
        flowRef.current.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),
      );
  };

  const updateConfig = (config: Record<string, unknown>) => {
    if (!selected) return;
    setNodes((current) =>
      current.map((node) =>
        node.id === selected.id
          ? { ...node, data: { ...node.data, config } }
          : node,
      ),
    );
    setSelected((current) =>
      current ? { ...current, data: { ...current.data, config } } : current,
    );
  };

  const addGmailPermission = (connectionId: string) => {
    integrationConnectionService
      .startGoogleOAuth(organizationId, connectionId, [
        "https://www.googleapis.com/auth/gmail.send",
      ])
      .then((result) => window.location.assign(result.authorizationUrl))
      .catch((reason) =>
        setError(reason.message || "Unable to add Gmail permission."),
      );
  };

  const addMetaPermission = (connectionId: string, additionalScopes: string[]) => {
    integrationConnectionService
      .startMetaOAuth(organizationId, connectionId, additionalScopes)
      .then((result) => window.location.assign(result.authorizationUrl))
      .catch((reason) =>
        setError(reason.message || "Unable to add Facebook permission."),
      );
  };

  const save = async ({
    enabledOverride = enabled,
    closeOnSuccess = true,
  }: {
    enabledOverride?: boolean;
    closeOnSuccess?: boolean;
  } = {}) => {
    try {
      setSaving(true);
      setError("");
      const definition = compatibilityDefinition(
        nodes,
        edges,
        enabledOverride,
        workflow?.trigger_type,
      );
      const body = {
        organizationId,
        name,
        ...definition,
        graphNodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          config: node.data.config || {},
        })),
        graphEdges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        })),
        enabled: enabledOverride,
      };
      if (workflow)
        await automationService.update({ ...body, workflowId: workflow.id });
      else await automationService.create(body);
      onSaved();
      if (closeOnSuccess) onClose();
      return true;
    } catch (saveError: any) {
      setError(saveError.message || "Unable to save graph.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async () => {
    const nextEnabled = !enabled;
    if (nextEnabled) {
      const triggers = getTriggerNodes(nodes);
      if (triggers.length === 0) {
        setError("An enabled workflow requires a trigger. Add a trigger first.");
        return;
      }
      if (triggers.length > 1) {
        setError("A workflow can have at most one trigger.");
        return;
      }
      const actions = nodes.filter(
        (n) =>
          n.type === "create_notification" ||
          n.type === "outgoing_webhook" ||
          n.type === "gmail_send_email" ||
          n.type === "facebook_comment_reply",
      );
      if (actions.length === 0) {
        setError("Add at least one action node before enabling.");
        return;
      }
    }

    if (!workflow) {
      setEnabled(nextEnabled);
      setError("Save the workflow before changing its enabled status.");
      return;
    }

    setEnabled(nextEnabled);
    const persisted = await save({ enabledOverride: nextEnabled, closeOnSuccess: false });
    if (!persisted) setEnabled(!nextEnabled);
  };

  const filtered = palette.filter((item) =>
    `${item.title} ${item.category} ${item.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const displayNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onQuickAdd: openQuickAdd,
      onReplaceTrigger: (id: string) => openTriggerPicker(id),
      onDeleteNode: (id: string) => deleteNode(id),
      onDuplicateNode: () => duplicateSelected(),
      onTestTrigger: (id: string) => handleOpenTest(id),
    },
  }));

  return createPortal(
    <div className="fixed inset-0 z-[1000] h-[100dvh] w-screen overflow-hidden bg-[#07111c] text-slate-100" style={{ pointerEvents: "auto" }}>
      {picker && (
        <NodePicker
          initialCategory={picker.initialCategory}
          replacementForTitle={picker.replacementForTitle}
          onClose={() => setPicker(null)}
          onChoose={(item) => {
            add(item, picker.position, picker.sourceId, picker.sourceHandle);
            setPicker(null);
          }}
        />
      )}
      {replaceModal && (
        <ReplaceTriggerModal
          currentTriggerNode={replaceModal.currentTrigger}
          newTriggerDefinition={replaceModal.newTriggerDef}
          onConfirm={confirmReplaceTrigger}
          onCancel={() => setReplaceModal(null)}
        />
      )}
      {testModalNode && (
        <TestFacebookCommentModal
          open={Boolean(testModalNode)}
          triggerNode={testModalNode}
          organizationId={organizationId}
          workflowId={workflow?.id || ""}
          onClose={() => setTestModalNode(null)}
          onRunSuccess={() => onSaved()}
        />
      )}
      <div className="flex h-full flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/95 px-3 backdrop-blur">
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Back to automations"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="h-7 w-px bg-white/10" />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-600"
          />
          <span
            className={`hidden rounded-full border px-2.5 py-1 text-xs font-medium sm:inline ${enabled ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-slate-600 bg-slate-800 text-slate-300"}`}
          >
            {enabled ? "Enabled" : "Draft"}
          </span>
          <button
            onClick={() => openQuickAdd()}
            className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/20"
          >
            <Plus className="me-1 inline h-3.5 w-3.5" />
            Add node
          </button>
          <button onClick={() => flowRef.current?.fitView({ padding: 0.28, minZoom: 0.55, maxZoom: 1.1, duration: 180 })} className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 md:inline-flex">Fit view</button>
          <button onClick={() => setFocusMode((value) => !value)} className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 lg:inline-flex">{focusMode ? "Exit focus" : "Focus"}</button>
          {selected && (
            <div className="flex items-center gap-1.5">
              {triggerMap[selected.type || ""] ? (
                <>
                  {selected.type === "facebook_page_comment_created" && (
                    <button
                      onClick={() => handleOpenTest(selected.id)}
                      className="rounded-xl border border-cyan-400/40 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/25"
                    >
                      <Play className="me-1 inline h-3.5 w-3.5 fill-current text-cyan-300" />
                      Test trigger
                    </button>
                  )}
                  <button
                    onClick={() => openTriggerPicker(selected.id)}
                    className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20"
                  >
                    Replace trigger
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="rounded-xl border border-red-400/20 px-3 py-2 text-xs text-red-200 hover:bg-red-400/10"
                    title="Delete trigger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={duplicateSelected}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                  >
                    <Copy className="me-1 h-3.5 w-3.5" />
                    Duplicate
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="rounded-xl border border-red-400/20 px-3 py-2 text-xs text-red-200 hover:bg-red-400/10"
                    title="Delete node"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => void toggleEnabled()}
            disabled={saving}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 disabled:opacity-60"
          >
            {enabled ? "Disable" : "Enable"}
          </button>
          {hasFacebookTrigger ? (
            <button
              onClick={() => handleOpenTest()}
              className="inline-flex items-center rounded-xl border border-cyan-400/40 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/25"
            >
              <Play className="me-1 h-3.5 w-3.5 fill-current text-cyan-300" />
              Test trigger
            </button>
          ) : (
            <button
              disabled
              className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-500 md:inline-flex"
            >
              <Play className="me-1 h-3.5 w-3.5" />
              Test soon
            </button>
          )}
          <button
            disabled
            className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-500 md:inline-flex"
          >
            <Play className="me-1 h-3.5 w-3.5" />
            Test soon
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/15 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </header>
        {error && (
          <div
            role="alert"
            className="border-b border-red-400/20 bg-red-500/10 px-5 py-2 text-sm text-red-200"
          >
            {error}
          </div>
        )}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <aside className="hidden">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search nodes..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>
            <div className="mt-5 space-y-5">
              {(
                [
                  "Trigger",
                  "Logic",
                  "Action",
                  "Integration",
                  "AI",
                  "Data",
                  "Utility",
                ] as const
              ).map((category) => (
                <section key={category}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {category}s
                  </p>
                  <div className="space-y-2">
                    {filtered
                      .filter((item) => item.category === category)
                      .map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.type}
                            draggable={item.available}
                            disabled={!item.available}
                            onDragStart={(event) =>
                              event.dataTransfer.setData(
                                "application/nextaura-node",
                                item.type,
                              )
                            }
                            onClick={() => add(item)}
                            className={`group flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.06] ${item.available ? "" : "cursor-not-allowed opacity-50"}`}
                          >
                            <GripVertical className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg ${(accentClasses[item.accent] || accentClasses.blue).icon}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-200">
                                {item.title}
                              </p>
                              <p className="truncate text-[10px] text-slate-500">
                                {item.description}
                              </p>
                            </div>
                            {item.available ? (
                              <Plus className="ms-auto h-4 w-4 text-slate-600 group-hover:text-slate-300" />
                            ) : (
                              <span className="ms-auto text-[9px] font-bold uppercase tracking-wide text-purple-300">
                                Soon
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </section>
              ))}
            </div>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                Coming next
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Integrations · AI · Data · Utilities
              </p>
            </div>
          </aside>
          <main
            ref={canvasRef}
            onDrop={drop}
            onDoubleClick={() => openQuickAdd(undefined, undefined)}
            onDragOver={(event) => event.preventDefault()}
            className="relative min-h-0 min-w-0 flex-1 bg-[#0a1522]"
          >
            <ReactFlow
              nodes={displayNodes}
              edges={edges}
              nodeTypes={visualNodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={connect}
              isValidConnection={isValidConnection as any}
              onInit={(instance) => {
                flowRef.current = instance;
              }}
              onNodeClick={(_, node: any) => { setSelected(node); setConfigOpen(true); }}
              onPaneClick={() => setSelected(null)}
              defaultEdgeOptions={{ type: "smoothstep" }}
              fitView
              minZoom={0.45}
              maxZoom={1.5}
              fitViewOptions={{ padding: 0.28, minZoom: 0.55, maxZoom: 1.1 }}
            >
              <Background
                color="#284158"
                gap={22}
                size={1}
                variant={BackgroundVariant.Dots}
              />
              <Controls className="!border-white/10 !bg-slate-900 !fill-slate-300 !shadow-xl" />
              <MiniMap
                className="!border !border-white/10 !bg-slate-900/90"
                style={{ width: 150, height: 90 }}
                nodeColor={(node) =>
                  nodeInfo[node.type || ""]?.accent === "emerald"
                    ? "#34d399"
                    : nodeInfo[node.type || ""]?.accent === "amber"
                      ? "#fbbf24"
                      : "#60a5fa"
                }
              />
            </ReactFlow>
            {!nodes.length ? (
              <div className="pointer-events-auto absolute inset-0 grid place-items-center">
                <div className="max-w-md rounded-2xl border border-dashed border-cyan-400/30 bg-slate-900/95 p-8 text-center shadow-2xl backdrop-blur">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white">Choose a trigger</h3>
                  <p className="mt-1.5 text-xs leading-5 text-slate-400">
                    Every automation starts with an event. Select a trigger to begin your workflow.
                  </p>
                  <button
                    onClick={() => openTriggerPicker()}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-95"
                  >
                    <Plus className="h-4 w-4" />
                    Choose a trigger
                  </button>
                </div>
              </div>
            ) : !nodes.some((n) => triggerMap[n.type || ""]) ? (
              <div className="pointer-events-auto absolute top-4 left-4 z-20 flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-200 backdrop-blur shadow-xl">
                <Info className="h-4 w-4 shrink-0 text-amber-300" />
                <span>Workflow has no trigger. Choose a trigger to make this workflow runnable.</span>
                <button
                  onClick={() => openTriggerPicker()}
                  className="rounded-lg bg-amber-400/20 px-3 py-1 font-semibold text-amber-100 hover:bg-amber-400/30"
                >
                  Choose a trigger
                </button>
              </div>
            ) : null}
          </main>
          {configOpen && (
            <div className="contents">
              <button
                aria-label="Close node configuration"
                onClick={() => setConfigOpen(false)}
                className="absolute right-[320px] top-3 z-40 rounded-l-lg border border-white/10 bg-slate-900 px-2 py-2 text-xs text-slate-300 hover:bg-slate-800 xl:right-[320px]"
              >
                ›
              </button>
              <ConfigPanel
                node={selected}
                update={updateConfig}
                connections={connections}
                connectionLoading={connectionLoading}
                onAddGmailPermission={addGmailPermission}
                onAddMetaPermission={addMetaPermission}
                organizationId={organizationId}
                onDeleteNode={deleteSelected}
                onReplaceTrigger={selected && triggerMap[selected.type || ""] ? () => openTriggerPicker(selected.id) : undefined}
                onTestTrigger={selected?.type === "facebook_page_comment_created" ? () => handleOpenTest(selected.id) : undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
