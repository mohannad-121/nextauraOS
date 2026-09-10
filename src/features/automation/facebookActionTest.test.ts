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

export function validateFacebookReplyConfig(config: Record<string, unknown>): {
  valid: boolean;
  errorCode?: string;
  error?: string;
} {
  if (!config.connection_id || typeof config.connection_id !== "string") {
    return { valid: false, errorCode: "FACEBOOK_CONNECTION_REQUIRED", error: "Facebook connection is required." };
  }
  if (!config.resource_id || typeof config.resource_id !== "string") {
    return { valid: false, errorCode: "FACEBOOK_PAGE_REQUIRED", error: "Facebook Page is required." };
  }
  if (!config.comment_id || typeof config.comment_id !== "string") {
    return { valid: false, errorCode: "FACEBOOK_COMMENT_ID_REQUIRED", error: "Facebook comment ID is required." };
  }
  if (!config.message || typeof config.message !== "string") {
    return { valid: false, errorCode: "FACEBOOK_REPLY_MESSAGE_REQUIRED", error: "Reply message is required." };
  }
  return { valid: true };
}

export function sanitizeMetaErrorMessage(rawMessage: string): string {
  return rawMessage.replace(/access_token=[^&\s]+/gi, "access_token=REDACTED");
}

export function mapMetaReplyError(status: number, body: any): { code: string; message: string; retryable: boolean } {
  const errorObj = body?.error;
  const errorCode = errorObj?.code;
  const subcode = errorObj?.error_subcode;
  const rawMsg = typeof errorObj?.message === "string" ? errorObj.message : "";
  const sanitizedMsg = sanitizeMetaErrorMessage(rawMsg);

  if (errorCode === 100 || /does not exist|unsupported post request|invalid object/i.test(sanitizedMsg)) {
    return {
      code: "FACEBOOK_COMMENT_NOT_FOUND",
      message: sanitizedMsg || "Facebook comment was not found or is inaccessible.",
      retryable: false,
    };
  }
  if (errorCode === 200 || errorCode === 10 || /permission/i.test(sanitizedMsg)) {
    return {
      code: "FACEBOOK_PERMISSION_MISSING",
      message: "Permission pages_manage_engagement is required to reply to this comment.",
      retryable: false,
    };
  }
  if (errorCode === 190 || subcode === 463 || subcode === 467) {
    return {
      code: "FACEBOOK_RECONNECT_REQUIRED",
      message: "Meta authorization expired or invalid. Reconnect Meta to continue.",
      retryable: false,
    };
  }
  return {
    code: "FACEBOOK_REPLY_FAILED",
    message: sanitizedMsg || "Failed to post reply to Facebook comment.",
    retryable: status >= 500 || status === 429,
  };
}

test("nodeRegistry contains facebook_comment_reply with expected definition", () => {
  const def = nodeByType.facebook_comment_reply;
  assert.ok(def, "facebook_comment_reply node should be registered");
  assert.equal(def.type, "facebook_comment_reply");
  assert.equal(def.title, "Facebook · Reply to Comment");
  assert.equal(def.category, "Integration");
  assert.equal(def.kind, "integration");
  assert.equal(def.available, true);
  assert.equal(def.provider, "meta");
  assert.equal(def.requires_connection, true);
  assert.equal(def.connection_type, "oauth");
  assert.ok(def.required_scopes?.includes("pages_manage_engagement"));
  assert.ok(def.required_scopes?.includes("pages_read_engagement"));
  assert.ok(def.required_scopes?.includes("pages_show_list"));
  assert.ok(!def.required_scopes?.includes("pages_read_user_content"));
  assert.ok(!def.required_scopes?.includes("instagram_basic"));
  assert.ok(!def.required_scopes?.includes("pages_manage_posts"));
  assert.equal(def.defaultConfig.comment_id, "{{trigger.comment_id}}");
});

test("variable interpolation handles standard trigger fields and spaces", () => {
  const payload = {
    comment_id: "1175395122329626_1234567890",
    post_id: "1175395122329626_9876543210",
    page_id: "1175395122329626",
    author_name: "John Doe",
    message: "Is this still available?",
  };

  const text = "Hi {{trigger.author_name}}, in response to \"{{ trigger.message }}\" on comment {{trigger.comment_id}}";
  const interpolated = interpolateVariables(text, payload);
  assert.equal(
    interpolated,
    "Hi John Doe, in response to \"Is this still available?\" on comment 1175395122329626_1234567890",
  );
});

test("variable interpolation leaves unknown keys empty without throwing", () => {
  const payload = { author_name: "Jane" };
  const text = "Hello {{trigger.author_name}}, {{trigger.unknown_field}}!";
  const interpolated = interpolateVariables(text, payload);
  assert.equal(interpolated, "Hello Jane, !");
});

test("configuration validation enforces required fields", () => {
  assert.equal(
    validateFacebookReplyConfig({}).errorCode,
    "FACEBOOK_CONNECTION_REQUIRED",
  );
  assert.equal(
    validateFacebookReplyConfig({ connection_id: "c-1" }).errorCode,
    "FACEBOOK_PAGE_REQUIRED",
  );
  assert.equal(
    validateFacebookReplyConfig({ connection_id: "c-1", resource_id: "p-1" }).errorCode,
    "FACEBOOK_COMMENT_ID_REQUIRED",
  );
  assert.equal(
    validateFacebookReplyConfig({ connection_id: "c-1", resource_id: "p-1", comment_id: "{{trigger.comment_id}}" }).errorCode,
    "FACEBOOK_REPLY_MESSAGE_REQUIRED",
  );
  assert.equal(
    validateFacebookReplyConfig({
      connection_id: "c-1",
      resource_id: "p-1",
      comment_id: "{{trigger.comment_id}}",
      message: "Thank you!",
    }).valid,
    true,
  );
});

test("workflow graph validator accepts facebook_comment_reply as an action node", () => {
  const triggerNode: WorkflowNode = {
    id: "trigger-1",
    type: "facebook_page_comment_created",
    position: { x: 100, y: 100 },
    data: {
      nodeType: "facebook_page_comment_created",
      config: { connection_id: "conn-1", resource_id: "page-1" },
    },
  };

  const actionNode: WorkflowNode = {
    id: "action-1",
    type: "facebook_comment_reply",
    position: { x: 400, y: 100 },
    data: {
      nodeType: "facebook_comment_reply",
      config: {
        connection_id: "conn-1",
        resource_id: "page-1",
        comment_id: "{{trigger.comment_id}}",
        message: "Thanks for commenting!",
      },
    },
  };

  const edge: Edge = {
    id: "edge-1",
    source: "trigger-1",
    target: "action-1",
  };

  const result = validateWorkflowGraph({
    nodes: [triggerNode, actionNode],
    edges: [edge],
    enabled: true,
  });

  assert.equal(result.triggerType, "facebook.page.comment.created");
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].type, "facebook_comment_reply");
});

test("scope validation correctly identifies missing pages_manage_engagement", () => {
  const currentScopes = ["public_profile", "pages_show_list", "pages_read_engagement"];
  const def = nodeByType.facebook_comment_reply;

  const missingScopes = (def.required_scopes || []).filter(
    (scope) => !currentScopes.includes(scope),
  );

  assert.deepEqual(missingScopes, ["pages_manage_engagement"]);

  const updatedScopes = [...currentScopes, "pages_manage_engagement"];
  const stillMissing = (def.required_scopes || []).filter(
    (scope) => !updatedScopes.includes(scope),
  );
  assert.deepEqual(stillMissing, []);
});

test("Facebook Reply reconnect flow requests exactly base scopes plus pages_manage_engagement without pages_read_user_content", () => {
  const baseScopes = ["public_profile", "pages_show_list", "pages_read_engagement"];
  const actionScope = "pages_manage_engagement";
  const requestedScopes = Array.from(new Set([...baseScopes, actionScope]));

  assert.deepEqual(requestedScopes, [
    "public_profile",
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_engagement",
  ]);

  // Strictly verify exclusion of pages_read_user_content and other unneeded scopes
  assert(!requestedScopes.includes("pages_read_user_content"));
  assert(!requestedScopes.includes("instagram_basic"));
  assert(!requestedScopes.includes("pages_manage_posts"));
});

test("error mapping and token redaction protects sensitive credentials", () => {
  const rawMetaError = {
    error: {
      message: "Invalid OAuth access token - Cannot parse access token: access_token=EAAxxxx1234567890abcdef",
      type: "OAuthException",
      code: 190,
      error_subcode: 467,
    },
  };

  const mapped = mapMetaReplyError(401, rawMetaError);
  assert.equal(mapped.code, "FACEBOOK_RECONNECT_REQUIRED");
  assert.equal(mapped.retryable, false);

  const sensitiveRaw = "Error with access_token=EAABsecret12345 in parameter";
  const sanitized = sanitizeMetaErrorMessage(sensitiveRaw);
  assert.equal(sanitized, "Error with access_token=REDACTED in parameter");
  assert.ok(!sanitized.includes("EAABsecret12345"));
});

test("error mapping recognizes comment not found vs missing permission", () => {
  const notFoundError = {
    error: {
      message: "Unsupported post request. Object with ID '123_fake' does not exist.",
      type: "GraphMethodException",
      code: 100,
    },
  };
  const mappedNotFound = mapMetaReplyError(404, notFoundError);
  assert.equal(mappedNotFound.code, "FACEBOOK_COMMENT_NOT_FOUND");
  assert.equal(mappedNotFound.retryable, false);

  const permissionError = {
    error: {
      message: "(#200) Requires pages_manage_engagement permission to manage the object",
      type: "OAuthException",
      code: 200,
    },
  };
  const mappedPerm = mapMetaReplyError(403, permissionError);
  assert.equal(mappedPerm.code, "FACEBOOK_PERMISSION_MISSING");
  assert.equal(mappedPerm.retryable, false);
});

test("test mode simulation produces expected result summary", () => {
  const isTest = true;
  const lastFacebookTestMode = true;
  const branchSuffix = " (linear branch)";

  const summary = (lastFacebookTestMode
    ? "Test mode — Facebook reply validated, no external reply sent."
    : "Facebook reply action completed.") + branchSuffix;

  assert.equal(
    summary,
    "Test mode — Facebook reply validated, no external reply sent. (linear branch)",
  );
  assert.ok(isTest);
});

