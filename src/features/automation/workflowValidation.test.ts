import test from "node:test";
import assert from "node:assert/strict";
import {
  validateWorkflowGraph,
  replaceTriggerInGraph,
  deleteTriggerFromGraph,
  addNodeToGraph,
  type WorkflowNode,
} from "./workflowValidation.ts";
import type { Edge } from "@xyflow/react";
import type { AutomationNodeDefinition } from "./nodeRegistry.ts";

const employeeTriggerDef: AutomationNodeDefinition = {
  type: "employee_created",
  title: "Employee Created",
  category: "Trigger",
  kind: "trigger",
  description: "Runs when employee is created",
  icon: () => null,
  accent: "emerald",
  available: true,
  fields: [],
  defaultConfig: {},
};

const facebookTriggerDef: AutomationNodeDefinition = {
  type: "facebook_page_comment_created",
  title: "Facebook — New Page Comment",
  category: "Trigger",
  kind: "trigger",
  description: "Runs on new Facebook comment",
  icon: () => null,
  accent: "emerald",
  available: true,
  fields: [],
  defaultConfig: {
    connection_id: "conn-123",
    resource_id: "page-456",
  },
};

const notificationActionDef: AutomationNodeDefinition = {
  type: "create_notification",
  title: "Create Notification",
  category: "Action",
  kind: "action",
  description: "Sends notification",
  icon: () => null,
  accent: "blue",
  available: true,
  fields: [],
  defaultConfig: {
    title: "Test",
    message: "Test message",
  },
};

test("draft workflow with 0 triggers is allowed during editing and save", () => {
  const nodes: WorkflowNode[] = [];
  const edges: Edge[] = [];

  // Draft workflow (enabled: false) should NOT throw even with 0 triggers
  const result = validateWorkflowGraph({ nodes, edges, enabled: false });
  assert.equal(result.conditions.length, 0);
  assert.equal(result.actions.length, 0);
  assert.ok(result.triggerType); // Fallback trigger type provided for draft schema compatibility
});

test("draft workflow with actions but 0 triggers is allowed during editing and save", () => {
  const actionNode: WorkflowNode = {
    id: "action-1",
    type: "create_notification",
    position: { x: 300, y: 100 },
    data: { nodeType: "create_notification", config: { title: "Hello", message: "World" } },
  };
  const nodes: WorkflowNode[] = [actionNode];
  const edges: Edge[] = [];

  const result = validateWorkflowGraph({ nodes, edges, enabled: false });
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].type, "create_notification");
});

test("adding first trigger succeeds when graph has 0 triggers", () => {
  const nodes: WorkflowNode[] = [];
  const edges: Edge[] = [];

  const result = addNodeToGraph({
    nodes,
    edges,
    item: employeeTriggerDef,
    position: { x: 100, y: 200 },
  });

  assert.equal(result.action, "added");
  if (result.action === "added") {
    assert.equal(result.nodes.length, 1);
    assert.equal(result.nodes[0].type, "employee_created");
    assert.equal(result.nodes[0].position.x, 100);
    assert.equal(result.nodes[0].position.y, 200);
  }
});

test("second trigger cannot exist simultaneously: addNodeToGraph flags replacement", () => {
  const initialTrigger: WorkflowNode = {
    id: "trigger-1",
    type: "employee_created",
    position: { x: 100, y: 200 },
    data: { nodeType: "employee_created", config: {} },
  };
  const nodes: WorkflowNode[] = [initialTrigger];
  const edges: Edge[] = [];

  const result = addNodeToGraph({
    nodes,
    edges,
    item: facebookTriggerDef,
  });

  assert.equal(result.action, "needs_replacement");
  if (result.action === "needs_replacement") {
    assert.equal(result.existingTrigger.id, "trigger-1");
    assert.equal(result.existingTrigger.type, "employee_created");
    assert.equal(result.newTriggerDefinition.type, "facebook_page_comment_created");
  }

  // Validate that graph validation rejects if somehow two triggers are present
  const secondTrigger: WorkflowNode = {
    id: "trigger-2",
    type: "facebook_page_comment_created",
    position: { x: 100, y: 350 },
    data: { nodeType: "facebook_page_comment_created", config: {} },
  };
  assert.throws(
    () => validateWorkflowGraph({ nodes: [initialTrigger, secondTrigger], edges: [], enabled: false }),
    /A workflow can have at most one trigger\./
  );
});

test("replacing existing trigger preserves position and configuration without duplicating", () => {
  const oldTrigger: WorkflowNode = {
    id: "trigger-old",
    type: "employee_created",
    position: { x: 120, y: 240 },
    data: { nodeType: "employee_created", config: {} },
  };
  const nodes: WorkflowNode[] = [oldTrigger];
  const edges: Edge[] = [];

  const replacement = replaceTriggerInGraph({
    nodes,
    edges,
    currentTriggerId: "trigger-old",
    newTriggerDefinition: facebookTriggerDef,
  });

  assert.equal(replacement.nodes.length, 1, "Exactly one node should remain");
  assert.equal(replacement.nodes[0].type, "facebook_page_comment_created");
  assert.equal(replacement.nodes[0].position.x, 120);
  assert.equal(replacement.nodes[0].position.y, 240);
  assert.notEqual(replacement.nodes[0].id, "trigger-old");
  assert.equal(replacement.newTriggerNode.type, "facebook_page_comment_created");
});

test("action nodes and clear outgoing edges are preserved during replacement", () => {
  const oldTrigger: WorkflowNode = {
    id: "trigger-1",
    type: "employee_created",
    position: { x: 100, y: 200 },
    data: { nodeType: "employee_created", config: {} },
  };
  const action1: WorkflowNode = {
    id: "action-1",
    type: "create_notification",
    position: { x: 400, y: 200 },
    data: { nodeType: "create_notification", config: { title: "Notify", message: "Page comment" } },
  };
  const action2: WorkflowNode = {
    id: "action-2",
    type: "outgoing_webhook",
    position: { x: 700, y: 200 },
    data: { nodeType: "outgoing_webhook", config: { url: "https://api.example.com" } },
  };

  const edge1: Edge = { id: "edge-1", source: "trigger-1", target: "action-1", type: "smoothstep" };
  const edge2: Edge = { id: "edge-2", source: "action-1", target: "action-2", type: "smoothstep" };

  const nodes = [oldTrigger, action1, action2];
  const edges = [edge1, edge2];

  const replacement = replaceTriggerInGraph({
    nodes,
    edges,
    currentTriggerId: "trigger-1",
    newTriggerDefinition: facebookTriggerDef,
  });

  // Action nodes must be preserved untouched
  assert.equal(replacement.nodes.length, 3);
  const preservedAction1 = replacement.nodes.find((n) => n.id === "action-1");
  const preservedAction2 = replacement.nodes.find((n) => n.id === "action-2");
  assert.ok(preservedAction1);
  assert.ok(preservedAction2);
  assert.equal(preservedAction1?.data.config.title, "Notify");

  // Edges check: edge1 reconnected to new trigger, edge2 intact
  assert.equal(replacement.edges.length, 2);
  const reconnectedEdge = replacement.edges.find((e) => e.target === "action-1");
  assert.ok(reconnectedEdge);
  assert.equal(reconnectedEdge?.source, replacement.newTriggerNode.id);

  const intactEdge = replacement.edges.find((e) => e.source === "action-1" && e.target === "action-2");
  assert.ok(intactEdge);
});

test("deleting trigger removes node and edges, keeping action nodes", () => {
  const trigger: WorkflowNode = {
    id: "trigger-1",
    type: "employee_created",
    position: { x: 100, y: 200 },
    data: { nodeType: "employee_created", config: {} },
  };
  const action: WorkflowNode = {
    id: "action-1",
    type: "create_notification",
    position: { x: 400, y: 200 },
    data: { nodeType: "create_notification", config: {} },
  };
  const edge: Edge = { id: "e1", source: "trigger-1", target: "action-1" };

  const deletion = deleteTriggerFromGraph({
    nodes: [trigger, action],
    edges: [edge],
    triggerId: "trigger-1",
  });

  assert.equal(deletion.nodes.length, 1);
  assert.equal(deletion.nodes[0].id, "action-1");
  assert.equal(deletion.edges.length, 0);
  assert.equal(deletion.deletedNode?.id, "trigger-1");
});

test("enabling with 0 triggers is rejected", () => {
  const action: WorkflowNode = {
    id: "action-1",
    type: "create_notification",
    position: { x: 400, y: 200 },
    data: { nodeType: "create_notification", config: { title: "T", message: "M" } },
  };

  assert.throws(
    () => validateWorkflowGraph({ nodes: [action], edges: [], enabled: true }),
    /An enabled workflow requires exactly one trigger\./
  );
});

test("enabling with 1 trigger and 1 action is accepted", () => {
  const trigger: WorkflowNode = {
    id: "trigger-1",
    type: "facebook_page_comment_created",
    position: { x: 100, y: 200 },
    data: {
      nodeType: "facebook_page_comment_created",
      config: { connection_id: "conn-1", resource_id: "page-1" },
    },
  };
  const action: WorkflowNode = {
    id: "action-1",
    type: "create_notification",
    position: { x: 400, y: 200 },
    data: { nodeType: "create_notification", config: { title: "T", message: "M" } },
  };
  const edge: Edge = { id: "e1", source: "trigger-1", target: "action-1" };

  const result = validateWorkflowGraph({
    nodes: [trigger, action],
    edges: [edge],
    enabled: true,
  });

  assert.equal(result.triggerType, "facebook.page.comment.created");
  assert.equal(result.triggerConfig.connection_id, "conn-1");
  assert.equal(result.actions.length, 1);
});
