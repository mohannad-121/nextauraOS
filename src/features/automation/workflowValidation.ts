import type { Edge, Node } from "@xyflow/react";
import type { AutomationNodeDefinition } from "./nodeRegistry";

export type WorkflowNode = Node<Record<string, any>>;

export const triggerMap: Record<string, string> = {
  employee_created: "employee.created",
  contact_created: "contact.created",
  expense_status_changed: "expense.status_changed",
  incoming_webhook: "incoming_webhook",
  facebook_page_comment_created: "facebook.page.comment.created",
  instagram_comment_created: "instagram.comment.created",
};

export interface WorkflowCompatibilityDefinition {
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  conditions: Record<string, unknown>[];
  actions: { type: string; config: Record<string, unknown> }[];
}

export interface ValidateWorkflowOptions {
  nodes: WorkflowNode[];
  edges: Edge[];
  enabled: boolean;
  fallbackTriggerType?: string;
}

export function isTriggerNode(node: { type?: string }): boolean {
  return Boolean(node.type && triggerMap[node.type]);
}

export function getTriggerNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.filter(isTriggerNode);
}

export function validateWorkflowGraph({
  nodes,
  edges,
  enabled,
  fallbackTriggerType = "employee.created",
}: ValidateWorkflowOptions): WorkflowCompatibilityDefinition {
  const triggers = getTriggerNodes(nodes);

  if (triggers.length > 1) {
    throw new Error("A workflow can have at most one trigger.");
  }

  if (enabled && triggers.length === 0) {
    throw new Error("An enabled workflow requires exactly one trigger.");
  }

  if (triggers.length === 1) {
    const triggerId = triggers[0].id;
    const incomingEdge = edges.find((edge) => edge.target === triggerId);
    if (incomingEdge) {
      throw new Error("The trigger must begin the graph.");
    }
  }

  const conditions = nodes
    .filter((node) => node.type === "if")
    .map((node) => node.data?.config || {});
  if (conditions.length > 1) {
    throw new Error("Only one IF node is supported.");
  }

  const actions = nodes
    .filter(
      (node): node is WorkflowNode & { type: string } =>
        Boolean(node.type) &&
        (node.type === "create_notification" ||
          node.type === "outgoing_webhook" ||
          node.type === "gmail_send_email" ||
          node.type === "facebook_comment_reply"),
    )
    .map((node) => ({
      type: node.type,
      config: (node.data?.config as Record<string, unknown>) || {},
    }));

  if (enabled && actions.length === 0) {
    throw new Error("Add at least one action node.");
  }

  const triggerType = triggers.length === 1
    ? triggerMap[triggers[0].type || ""]
    : fallbackTriggerType;

  const triggerConfig = triggers.length === 1
    ? (triggers[0].data?.config || {})
    : {};

  return {
    triggerType,
    triggerConfig,
    conditions,
    actions,
  };
}

export interface ReplaceTriggerParams {
  nodes: WorkflowNode[];
  edges: Edge[];
  currentTriggerId: string;
  newTriggerDefinition: AutomationNodeDefinition;
}

export interface ReplaceTriggerResult {
  nodes: WorkflowNode[];
  edges: Edge[];
  newTriggerNode: WorkflowNode;
}

export function replaceTriggerInGraph({
  nodes,
  edges,
  currentTriggerId,
  newTriggerDefinition,
}: ReplaceTriggerParams): ReplaceTriggerResult {
  const currentTrigger = nodes.find((n) => n.id === currentTriggerId);
  if (!currentTrigger) {
    throw new Error("Current trigger not found in workflow.");
  }

  const newTriggerId = crypto.randomUUID();
  const newTriggerNode: WorkflowNode = {
    id: newTriggerId,
    type: newTriggerDefinition.type,
    position: { ...currentTrigger.position },
    data: {
      nodeType: newTriggerDefinition.type,
      config: newTriggerDefinition.defaultConfig || {},
    },
  };

  const updatedNodes = nodes.map((node) =>
    node.id === currentTriggerId ? newTriggerNode : node
  );

  const outgoingEdges = edges.filter((e) => e.source === currentTriggerId);
  const remainingEdges = edges.filter(
    (e) => e.source !== currentTriggerId && e.target !== currentTriggerId
  );

  if (outgoingEdges.length === 1) {
    const reconnectedEdge: Edge = {
      ...outgoingEdges[0],
      id: crypto.randomUUID(),
      source: newTriggerId,
    };
    remainingEdges.push(reconnectedEdge);
  }

  return {
    nodes: updatedNodes,
    edges: remainingEdges,
    newTriggerNode,
  };
}

export interface DeleteTriggerParams {
  nodes: WorkflowNode[];
  edges: Edge[];
  triggerId: string;
}

export interface DeleteTriggerResult {
  nodes: WorkflowNode[];
  edges: Edge[];
  deletedNode: WorkflowNode | null;
}

export function deleteTriggerFromGraph({
  nodes,
  edges,
  triggerId,
}: DeleteTriggerParams): DeleteTriggerResult {
  const targetNode = nodes.find((n) => n.id === triggerId) || null;
  const updatedNodes = nodes.filter((n) => n.id !== triggerId);
  const updatedEdges = edges.filter(
    (e) => e.source !== triggerId && e.target !== triggerId
  );

  return {
    nodes: updatedNodes,
    edges: updatedEdges,
    deletedNode: targetNode,
  };
}

export interface AddNodeParams {
  nodes: WorkflowNode[];
  edges: Edge[];
  item: AutomationNodeDefinition;
  position?: { x: number; y: number };
  sourceId?: string;
  sourceHandle?: string;
}

export type AddNodeResult =
  | {
      action: "added";
      nodes: WorkflowNode[];
      edges: Edge[];
      newNode: WorkflowNode;
    }
  | {
      action: "needs_replacement";
      existingTrigger: WorkflowNode;
      newTriggerDefinition: AutomationNodeDefinition;
    }
  | {
      action: "rejected";
      reason: string;
    };

export function addNodeToGraph({
  nodes,
  edges,
  item,
  position,
  sourceId,
  sourceHandle,
}: AddNodeParams): AddNodeResult {
  if (!item.available) {
    return { action: "rejected", reason: "Node is not available." };
  }

  const isTrigger = item.category === "Trigger" || Boolean(triggerMap[item.type]);

  if (isTrigger) {
    const existingTriggers = getTriggerNodes(nodes);
    if (existingTriggers.length > 0) {
      return {
        action: "needs_replacement",
        existingTrigger: existingTriggers[0],
        newTriggerDefinition: item,
      };
    }
  }

  if (nodes.length >= 100) {
    return { action: "rejected", reason: "Workflow node limit reached." };
  }

  const id = crypto.randomUUID();
  const newNode: WorkflowNode = {
    id,
    type: item.type,
    position: position || {
      x: 180 + nodes.length * 40,
      y: 140 + nodes.length * 35,
    },
    data: {
      nodeType: item.type,
      config: item.defaultConfig || {},
    },
  };

  const updatedNodes = [...nodes, newNode];
  let updatedEdges = edges;

  if (sourceId) {
    const newEdge: Edge = {
      id: crypto.randomUUID(),
      source: sourceId,
      target: id,
      sourceHandle,
      type: "smoothstep",
      label: sourceHandle?.toUpperCase(),
      animated: Boolean(sourceHandle),
    };
    updatedEdges = [...edges, newEdge];
  }

  return {
    action: "added",
    nodes: updatedNodes,
    edges: updatedEdges,
    newNode,
  };
}
