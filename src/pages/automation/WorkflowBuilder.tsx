import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Bell,
  ChevronLeft,
  Code2,
  ContactRound,
  GitBranch,
  GripVertical,
  Info,
  Layers3,
  Play,
  Plus,
  Copy,
  Search,
  Trash2,
  Send,
  Sparkles,
  UserPlus,
  Webhook,
} from "lucide-react";
import { automationService } from "../../services/automationService";
import {
  nodeByType,
  nodeRegistry,
  type AutomationNodeDefinition,
} from "../../features/automation/nodeRegistry";
import { integrationConnectionService, type IntegrationConnection } from "../../services/integrationConnectionService";

type WorkflowNode = Node<Record<string, any>>;
type PaletteItem = {
  type: string;
  title: string;
  category: "Trigger" | "Logic" | "Action";
  subtitle: string;
  icon: any;
  accent: string;
};
const triggerMap: Record<string, string> = {
  employee_created: "employee.created",
  contact_created: "contact.created",
  expense_status_changed: "expense.status_changed",
  incoming_webhook: "incoming_webhook",
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
  const nodes: any[] = [
    normalize({
      id: "trigger",
      position: { x: 100, y: 220 },
      type: workflow?.trigger_type?.replace(".", "_") || "employee_created",
      data: {
        config:
          workflow?.trigger_config ||
          defaults[workflow?.trigger_type?.replace(".", "_")] ||
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

function compatibilityDefinition(nodes: WorkflowNode[], edges: Edge[]) {
  const triggers = nodes.filter((node) => triggerMap[node.type || ""]);
  if (triggers.length !== 1) throw Error("Add exactly one trigger node.");
  if (new Set(edges.map((edge) => edge.target)).has(triggers[0].id))
    throw Error("The trigger must begin the graph.");
  const conditions = nodes
    .filter((node) => node.type === "if")
    .map((node) => node.data.config || {});
  if (conditions.length > 1) throw Error("Only one IF node is supported.");
  const actions = nodes
    .filter(
      (node) =>
        node.type === "create_notification" || node.type === "outgoing_webhook" || node.type === "gmail_send_email",
    )
    .map((node) => ({ type: node.type, config: node.data.config || {} }));
  if (!actions.length) throw Error("Add at least one action node.");
  return {
    triggerType: triggerMap[triggers[0].type || ""],
    triggerConfig: triggers[0].data.config || {},
    conditions,
    actions,
  };
}

function WorkflowNodeCard({ id, data, selected }: NodeProps<WorkflowNode>) {
  const info = nodeInfo[data.nodeType] || nodeInfo.create_notification;
  const Icon = info.icon;
  const accent = accentClasses[info.accent] || accentClasses.blue;
  return (
    <div
      className={`relative min-w-[230px] overflow-hidden rounded-2xl border bg-slate-900/95 text-slate-100 shadow-xl backdrop-blur transition ${accent.border} ${accent.glow} ${selected ? "ring-2 ring-white/70" : "hover:-translate-y-0.5 hover:shadow-2xl"}`}
    >
      <div className={`h-1 ${accent.stripe}`} />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-slate-200"
      />
      <div className="flex gap-3 p-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent.icon}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{info.title}</p>
            <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-400">
              idle
            </span>
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

function NodePicker({
  onChoose,
  onClose,
}: {
  onChoose: (node: AutomationNodeDefinition) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const matches = palette.filter((node) =>
    `${node.title} ${node.category} ${node.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add workflow node"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <Search className="h-5 w-5 text-cyan-300" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search nodes..."
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
          ).map((category) => {
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
}: {
  node: WorkflowNode | null;
  update: (config: Record<string, unknown>) => void;
  connections: IntegrationConnection[];
  connectionLoading: boolean;
  onAddGmailPermission: (connectionId: string) => void;
}) {
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
    <aside className="w-full border-s border-white/10 bg-slate-950/80 p-5 xl:w-80">
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
        {["employee_created", "contact_created", "incoming_webhook"].includes(
          node.type || "",
        ) && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
            This trigger needs no additional configuration.
          </div>
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
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState<{
    sourceId?: string;
    sourceHandle?: string;
    position?: { x: number; y: number };
  } | null>(null);
  const flowRef = useRef<any>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { let cancelled = false; setConnections([]); setConnectionLoading(true); integrationConnectionService.list(organizationId).then((items) => { if (!cancelled) setConnections(items); }).catch(() => { if (!cancelled) setConnections([]); }).finally(() => { if (!cancelled) setConnectionLoading(false); }); return () => { cancelled = true; }; }, [organizationId]);
  const add = (
    item: AutomationNodeDefinition,
    position?: { x: number; y: number },
    sourceId?: string,
    sourceHandle?: string,
  ) => {
    if (!item.available) return;
    if (
      item.kind === "trigger" &&
      nodes.some((node) => triggerMap[node.type || ""])
    ) {
      setError("A workflow can currently have one trigger.");
      return;
    }
    if (nodes.length >= 100) {
      setError("Workflow node limit reached.");
      return;
    }
    const id = crypto.randomUUID();
    setNodes((current) => [
      ...current,
      {
        id,
        type: item.type,
        position: position || {
          x: 180 + current.length * 40,
          y: 140 + current.length * 35,
        },
        data: {
          nodeType: item.type,
          config: item.defaultConfig || defaults[item.type] || {},
        },
      },
    ]);
    if (sourceId)
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
  const deleteSelected = () => {
    if (!selected) return;
    if (
      triggerMap[selected.type || ""] &&
      !confirm(
        "Delete the trigger? The workflow will be invalid until you add another trigger.",
      )
    )
      return;
    setNodes((current) => current.filter((node) => node.id !== selected.id));
    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== selected.id && edge.target !== selected.id,
      ),
    );
    setSelected(null);
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
  const addGmailPermission = (connectionId: string) => { integrationConnectionService.startGoogleOAuth(organizationId, connectionId, ['https://www.googleapis.com/auth/gmail.send']).then((result) => window.location.assign(result.authorizationUrl)).catch((reason) => setError(reason.message || 'Unable to add Gmail permission.')); };
  const save = async () => {
    try {
      setSaving(true);
      setError("");
      const definition = compatibilityDefinition(nodes, edges);
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
        enabled,
      };
      if (workflow)
        await automationService.update({ ...body, workflowId: workflow.id });
      else await automationService.create(body);
      onSaved();
      onClose();
    } catch (saveError: any) {
      setError(saveError.message || "Unable to save graph.");
    } finally {
      setSaving(false);
    }
  };
  const filtered = palette.filter((item) =>
    `${item.title} ${item.category} ${item.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const displayNodes = nodes.map((node) => ({
    ...node,
    data: { ...node.data, onQuickAdd: openQuickAdd },
  }));
  return (
    <div className="fixed inset-0 z-[70] bg-[#07111c] text-slate-100">
      {picker && (
        <NodePicker
          onClose={() => setPicker(null)}
          onChoose={(item) => {
            add(item, picker.position, picker.sourceId, picker.sourceHandle);
            setPicker(null);
          }}
        />
      )}
      <div className="flex h-full flex-col">
        <header className="flex min-h-16 items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 backdrop-blur">
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
          {selected && !triggerMap[selected.type || ""] && (
            <>
              <button
                onClick={duplicateSelected}
                className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 lg:inline-flex"
              >
                <Copy className="me-1 h-3.5 w-3.5" />
                Duplicate
              </button>
              <button
                onClick={deleteSelected}
                className="hidden rounded-xl border border-red-400/20 px-3 py-2 text-xs text-red-200 hover:bg-red-400/10 lg:inline-flex"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => setEnabled((value) => !value)}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
          >
            {enabled ? "Disable" : "Enable"}
          </button>
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
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-72 shrink-0 border-e border-white/10 bg-slate-950/70 p-4 lg:block">
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
            className="relative min-w-0 flex-1 bg-[#0a1522]"
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
              onNodeClick={(_, node: any) => setSelected(node)}
              onPaneClick={() => setSelected(null)}
              defaultEdgeOptions={{ type: "smoothstep" }}
              fitView
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
                nodeColor={(node) =>
                  nodeInfo[node.type || ""]?.accent === "emerald"
                    ? "#34d399"
                    : nodeInfo[node.type || ""]?.accent === "amber"
                      ? "#fbbf24"
                      : "#60a5fa"
                }
              />
            </ReactFlow>
            {!nodes.length && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="rounded-2xl border border-white/10 bg-slate-900/85 p-6 text-center shadow-2xl backdrop-blur">
                  <Sparkles className="mx-auto h-6 w-6 text-emerald-300" />
                  <p className="mt-3 font-semibold">
                    Start by adding a trigger
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Choose a node from the library to begin.
                  </p>
                </div>
              </div>
            )}
          </main>
          <ConfigPanel node={selected} update={updateConfig} connections={connections} connectionLoading={connectionLoading} onAddGmailPermission={addGmailPermission} />
        </div>
      </div>
    </div>
  );
}
