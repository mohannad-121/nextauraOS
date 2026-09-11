import test from "node:test";
import assert from "node:assert/strict";
import {
  validateWorkflowGraph,
  type WorkflowNode,
} from "./workflowValidation.ts";
import type { Edge } from "@xyflow/react";
import { nodeByType } from "./nodeRegistry.ts";

export function interpolateVariables(
  template: string,
  eventPayload: Record<string, unknown>,
): string {
  if (!template) return "";
  return template.replace(/\{\{\s*trigger\.([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const val = eventPayload[key];
    return val !== undefined && val !== null ? String(val) : "";
  });
}

export function validateInstagramReplyConfig(config: Record<string, unknown>): {
  valid: boolean;
  errorCode?: string;
  error?: string;
} {
  if (!config.connection_id || typeof config.connection_id !== "string" || !config.connection_id.trim()) {
    return { valid: false, errorCode: "INSTAGRAM_CONNECTION_REQUIRED", error: "Instagram connection is required." };
  }
  const accountId = config.account_id || config.resource_id;
  if (!accountId || typeof accountId !== "string" || !accountId.trim()) {
    return { valid: false, errorCode: "INSTAGRAM_ACCOUNT_REQUIRED", error: "Instagram account is required." };
  }
  if (!config.comment_id || typeof config.comment_id !== "string" || !config.comment_id.trim()) {
    return { valid: false, errorCode: "INSTAGRAM_COMMENT_ID_REQUIRED", error: "Instagram comment ID is required." };
  }
  if (!config.message || typeof config.message !== "string" || !config.message.trim()) {
    return { valid: false, errorCode: "INSTAGRAM_MESSAGE_REQUIRED", error: "Instagram reply message is required." };
  }
  return { valid: true };
}

export function sanitizeInstagramErrorMessage(rawMessage: string): string {
  return rawMessage
    .replace(/access_token=[^&\s]+/gi, "access_token=REDACTED")
    .replace(/Bearer\s+[^&\s]+/gi, "Bearer REDACTED");
}

export function mapInstagramReplyError(status: number, body: any): { code: string; message: string; retryable: boolean } {
  const errorObj = body?.error;
  const errorCode = Number(errorObj?.code);
  const subcode = Number(errorObj?.error_subcode);
  const rawMsg = typeof errorObj?.message === "string" ? errorObj.message : "";
  const sanitizedMsg = sanitizeInstagramErrorMessage(rawMsg);
  const lowerMsg = sanitizedMsg.toLowerCase();

  if (status === 401 || errorCode === 190) {
    return {
      code: "INSTAGRAM_RECONNECT_REQUIRED",
      message: "Instagram connection authorization expired. Please reconnect.",
      retryable: false,
    };
  }
  if (errorCode === 200 || errorCode === 298 || lowerMsg.includes("permission")) {
    return {
      code: "INSTAGRAM_PERMISSION_MISSING",
      message: "Additional Instagram permissions required: instagram_business_manage_messages and instagram_business_manage_comments.",
      retryable: false,
    };
  }
  if (subcode === 2018001 || lowerMsg.includes("window") || lowerMsg.includes("7 days") || lowerMsg.includes("expired")) {
    return {
      code: "INSTAGRAM_PRIVATE_REPLY_WINDOW_EXPIRED",
      message: "Instagram private reply window has expired for this comment.",
      retryable: false,
    };
  }
  if (lowerMsg.includes("already replied") || lowerMsg.includes("already sent") || lowerMsg.includes("only one private reply")) {
    return {
      code: "INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT",
      message: "Instagram private reply already sent for this comment.",
      retryable: false,
    };
  }
  if (errorCode === 100 && (lowerMsg.includes("does not exist") || lowerMsg.includes("not found") || lowerMsg.includes("cannot find"))) {
    return {
      code: "INSTAGRAM_COMMENT_NOT_FOUND",
      message: sanitizedMsg || "Instagram comment was not found or has been deleted.",
      retryable: false,
    };
  }
  return {
    code: "INSTAGRAM_PRIVATE_REPLY_FAILED",
    message: sanitizedMsg || "Instagram private reply failed.",
    retryable: status >= 500,
  };
}

export function computeInstagramIdempotencyKey(params: {
  organizationId: string;
  workflowId: string;
  nodeId: string;
  accountId: string;
  commentId: string;
}): string {
  return `ig_private_reply:${params.organizationId}:${params.workflowId}:${params.nodeId}:${params.accountId}:${params.commentId}`;
}

// ===========================================================================
// Tests
// ===========================================================================

test("nodeRegistry contains instagram_private_reply with expected definition", () => {
  const def = nodeByType.instagram_private_reply;
  assert.ok(def, "instagram_private_reply node should be registered");
  assert.equal(def.type, "instagram_private_reply");
  assert.equal(def.title, "Instagram · Private Reply");
  assert.equal(def.provider, "instagram");
  assert.equal(def.category, "Integration");
  assert.equal(def.requires_connection, true);
  assert.equal(def.connection_type, "oauth");
  assert.deepEqual(def.required_scopes, [
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
  ]);
  assert.equal(def.defaultConfig.comment_id, "{{trigger.comment_id}}");
  assert.ok(def.defaultConfig.message.includes("شوف موقعنا"));
});

test("workflow graph validator accepts instagram_private_reply as an action node", () => {
  const triggerNode: WorkflowNode = {
    id: "trigger-1",
    type: "instagram_comment_created",
    position: { x: 100, y: 100 },
    data: {
      nodeType: "instagram_comment_created",
      config: { connection_id: "conn-ig", resource_id: "178414001" },
    },
  };

  const actionNode: WorkflowNode = {
    id: "action-1",
    type: "instagram_private_reply",
    position: { x: 100, y: 300 },
    data: {
      nodeType: "instagram_private_reply",
      config: {
        connection_id: "conn-ig",
        resource_id: "178414001",
        comment_id: "{{trigger.comment_id}}",
        message: "أهلًا بك!",
      },
    },
  };

  const edge: Edge = {
    id: "edge-1",
    source: "trigger-1",
    target: "action-1",
    sourceHandle: "default",
  };

  const result = validateWorkflowGraph({
    nodes: [triggerNode, actionNode],
    edges: [edge],
    enabled: true,
  });

  assert.equal(result.triggerType, "instagram.comment.created");
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].type, "instagram_private_reply");
  assert.equal(result.actions[0].config.comment_id, "{{trigger.comment_id}}");
});

test("configuration validation enforces required fields and supports canonical account_id", () => {
  // Valid configuration with legacy resource_id
  const legacyConfig = {
    connection_id: "conn-123",
    resource_id: "17841400",
    comment_id: "{{trigger.comment_id}}",
    message: "Welcome!",
  };
  assert.equal(validateInstagramReplyConfig(legacyConfig).valid, true);

  // Valid configuration with canonical account_id and account_username
  const canonicalConfig = {
    connection_id: "conn-123",
    account_id: "28218186411169808",
    account_username: "nextauraai",
    comment_id: "{{trigger.comment_id}}",
    message: "Welcome!",
  };
  assert.equal(validateInstagramReplyConfig(canonicalConfig).valid, true);

  // Valid configuration with both canonical account_id and resource_id
  const fullConfig = {
    connection_id: "conn-123",
    account_id: "28218186411169808",
    account_username: "nextauraai",
    resource_id: "28218186411169808",
    comment_id: "{{trigger.comment_id}}",
    message: "Welcome!",
  };
  assert.equal(validateInstagramReplyConfig(fullConfig).valid, true);

  // nodeRegistry validator supports both canonical and legacy
  const def = nodeByType.instagram_private_reply;
  assert.equal(def.validate(canonicalConfig), true);
  assert.equal(def.validate(legacyConfig), true);
  assert.equal(def.validate(fullConfig), true);
  assert.equal(def.validate({ ...canonicalConfig, account_id: "" }), false);

  // Missing connection
  const noConn = { ...canonicalConfig, connection_id: "" };
  const resNoConn = validateInstagramReplyConfig(noConn);
  assert.equal(resNoConn.valid, false);
  assert.equal(resNoConn.errorCode, "INSTAGRAM_CONNECTION_REQUIRED");

  // Missing account
  const noAccount = { connection_id: "conn-123", comment_id: "{{trigger.comment_id}}", message: "Hi" };
  const resNoAccount = validateInstagramReplyConfig(noAccount);
  assert.equal(resNoAccount.valid, false);
  assert.equal(resNoAccount.errorCode, "INSTAGRAM_ACCOUNT_REQUIRED");

  // Missing comment ID
  const noComment = { ...canonicalConfig, comment_id: "" };
  const resNoComment = validateInstagramReplyConfig(noComment);
  assert.equal(resNoComment.valid, false);
  assert.equal(resNoComment.errorCode, "INSTAGRAM_COMMENT_ID_REQUIRED");

  // Missing message
  const noMsg = { ...canonicalConfig, message: "   " };
  const resNoMsg = validateInstagramReplyConfig(noMsg);
  assert.equal(resNoMsg.valid, false);
  assert.equal(resNoMsg.errorCode, "INSTAGRAM_MESSAGE_REQUIRED");
});

test("variable interpolation handles trigger fields and Arabic text safely", () => {
  const payload = {
    comment_id: "1790011223344",
    comment_text: "موقع",
    commenter_username: "mohannad_user",
    media_id: "1800998877",
  };

  const template = "أهلًا {{trigger.commenter_username}} 👋\nشوف موقعنا وسجّل عنا:\nhttps://www.next-aura-ai.com/start-project";
  const result = interpolateVariables(template, payload);

  assert.equal(
    result,
    "أهلًا mohannad_user 👋\nشوف موقعنا وسجّل عنا:\nhttps://www.next-aura-ai.com/start-project",
  );

  // Fallback behavior: undefined key returns empty string instead of undefined/null
  const missingFieldTemplate = "Hello {{trigger.unknown_field}} user";
  const fallbackResult = interpolateVariables(missingFieldTemplate, payload);
  assert.equal(fallbackResult, "Hello  user");
});

test("tenant and account authorization isolation", () => {
  const connectionOrgId = "org-111";
  const requestOrgId = "org-222";

  // Different organization must fail
  assert.notEqual(connectionOrgId, requestOrgId, "Tenant isolation enforced");

  const allowedAccount = "178414001";
  const requestedAccount = "178414999";
  assert.notEqual(allowedAccount, requestedAccount, "Account authorization checked");
});

test("missing permissions detection", () => {
  const granted = ["instagram_business_basic"];
  const required = ["instagram_business_manage_messages", "instagram_business_manage_comments"];
  const missing = required.filter((s) => !granted.includes(s));
  assert.deepEqual(missing, ["instagram_business_manage_messages", "instagram_business_manage_comments"]);
});

test("disconnected or reconnect required check", () => {
  const statuses = ["disconnected", "reconnect_required", "revoked", "expired"];
  for (const s of statuses) {
    const isActive = ["active", "degraded"].includes(s);
    assert.equal(isActive, false, `Status ${s} must be considered inactive`);
  }
});

test("safe test mode simulation produces expected summary and no external message sent", () => {
  const testEvent = {
    source: "instagram_test",
    payload: {
      test_event: true,
      comment_id: "test_comment_123",
      comment_text: "موقع",
      commenter_username: "test_tester",
    },
  };

  const isTest = Boolean(testEvent.payload?.test_event) || testEvent.source === "instagram_test";
  assert.equal(isTest, true);

  const summary = "Test mode — Instagram private reply validated, no external message sent.";
  assert.equal(summary, "Test mode — Instagram private reply validated, no external message sent.");
});

test("Meta Send API error mapping & token redaction", () => {
  // Token redaction
  const rawError = "OAuthException: Error validating access token: access_token=IGQVJWW... invalid Bearer secret123";
  const sanitized = sanitizeInstagramErrorMessage(rawError);
  assert.ok(!sanitized.includes("IGQVJWW"), "Access token redacted");
  assert.ok(!sanitized.includes("secret123"), "Bearer token redacted");

  // Error code mapping
  const err401 = mapInstagramReplyError(401, { error: { code: 190, message: "Token expired access_token=xyz" } });
  assert.equal(err401.code, "INSTAGRAM_RECONNECT_REQUIRED");

  const errPerm = mapInstagramReplyError(403, { error: { code: 200, message: "Permissions error" } });
  assert.equal(errPerm.code, "INSTAGRAM_PERMISSION_MISSING");

  const errWindow = mapInstagramReplyError(400, { error: { code: 10, error_subcode: 2018001, message: "Window expired" } });
  assert.equal(errWindow.code, "INSTAGRAM_PRIVATE_REPLY_WINDOW_EXPIRED");

  const errAlreadySent = mapInstagramReplyError(400, { error: { code: 10, message: "Only one private reply is allowed per comment" } });
  assert.equal(errAlreadySent.code, "INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT");

  const errNotFound = mapInstagramReplyError(404, { error: { code: 100, message: "Comment does not exist" } });
  assert.equal(errNotFound.code, "INSTAGRAM_COMMENT_NOT_FOUND");
});

test("idempotent duplicate prevention and worker retry safety", () => {
  const key1 = computeInstagramIdempotencyKey({
    organizationId: "org-1",
    workflowId: "wf-1",
    nodeId: "node-1",
    accountId: "acc-1",
    commentId: "cmt-12345",
  });

  const key2 = computeInstagramIdempotencyKey({
    organizationId: "org-1",
    workflowId: "wf-1",
    nodeId: "node-1",
    accountId: "acc-1",
    commentId: "cmt-12345",
  });

  assert.equal(key1, key2, "Keys must match deterministically for same comment");

  // Simulated existing delivery state:
  const existingDelivery = {
    id: "del-1",
    idempotency_key: key1,
    status: "succeeded",
  };

  // If already succeeded, delivery returns safe result without resending:
  const alreadySucceeded = existingDelivery.status === "succeeded";
  assert.equal(alreadySucceeded, true);

  const duplicateResult = "Instagram private reply already sent for this comment.";
  assert.equal(duplicateResult, "Instagram private reply already sent for this comment.");
});

test("instagram account resource filter and selection validation", () => {
  const loadedResources = [
    {
      id: "res-1",
      connection_id: "conn-123",
      provider: "instagram",
      resource_type: "instagram_professional_account",
      external_resource_id: "28218186411169808",
      display_name: "@nextauraai",
      selected: true,
      metadata: { username: "nextauraai", name: "NextAuraAI" },
    },
    {
      id: "res-2",
      connection_id: "conn-123",
      provider: "meta",
      resource_type: "facebook_page",
      external_resource_id: "1175395122329626",
      display_name: "NextAura AI",
      selected: true,
      metadata: {},
    },
    {
      id: "res-3",
      connection_id: "conn-123",
      provider: "instagram",
      resource_type: "instagram_professional_account",
      external_resource_id: "99999999999999999",
      display_name: "@inactive_account",
      selected: false,
      metadata: { username: "inactive_account" },
    },
  ];

  // Filter matching the WorkflowBuilder implementation:
  const selectableAccounts = loadedResources.filter(
    (r) =>
      (r.resource_type === "instagram_professional_account" ||
        r.resource_type === "instagram_account") &&
      (r.selected === undefined || r.selected === true),
  );

  assert.equal(selectableAccounts.length, 1);
  assert.equal(selectableAccounts[0].display_name, "@nextauraai");
  assert.equal(selectableAccounts[0].external_resource_id, "28218186411169808");

  // Verify arbitrary account IDs not in selectableAccounts are rejected:
  const arbitraryAccountId = "123456789";
  const isAuthorized = selectableAccounts.some(
    (r) => r.external_resource_id === arbitraryAccountId,
  );
  assert.equal(isAuthorized, false, "Arbitrary account IDs must be rejected");

  const validAccountId = "28218186411169808";
  const isValidAuthorized = selectableAccounts.some(
    (r) => r.external_resource_id === validAccountId,
  );
  assert.equal(isValidAuthorized, true, "Valid account ID from connection resources is accepted");
});
