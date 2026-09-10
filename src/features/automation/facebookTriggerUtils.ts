/**
 * Utilities for Facebook New Page Comment trigger testing,
 * event payload simulation, filter evaluation, and security checks.
 */

export interface SyntheticFacebookCommentOptions {
  pageId: string;
  pageName: string;
  connectionId?: string;
  commentId?: string;
  postId?: string;
  message?: string;
  isReply?: boolean;
  parentCommentId?: string;
  senderName?: string;
  senderId?: string;
}

export interface SyntheticFacebookCommentPayload {
  test_event: true;
  source: "meta_test";
  connection_id?: string;
  page_id: string;
  page_name: string;
  post_id: string;
  comment_id: string;
  message: string;
  parent_comment_id: string | null;
  from: {
    id: string;
    name: string;
  };
  created_time: string;
  raw: {
    object: "page";
    entry: Array<{
      id: string;
      time: number;
      changes: Array<{
        field: "feed";
        value: {
          item: "comment";
          verb: "add";
          comment_id: string;
          parent_id: string;
          post_id: string;
          message: string;
          created_time: number;
          from: {
            id: string;
            name: string;
          };
        };
      }>;
    }>;
  };
}

export function buildTestDedupeKey(pageId: string, commentId: string): string {
  return `meta_test:comment:${pageId}:${commentId}`;
}

export function buildSyntheticFacebookCommentPayload(
  options: SyntheticFacebookCommentOptions,
): SyntheticFacebookCommentPayload {
  const commentId = options.commentId || `test_c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const postId = options.postId || `test_p_${Date.now()}`;
  const isReply = Boolean(options.isReply);
  const parentCommentId = isReply
    ? (options.parentCommentId || `test_parent_${Date.now()}`)
    : null;
  const now = new Date();
  const createdTimeSeconds = Math.floor(now.getTime() / 1000);
  const senderId = options.senderId || "test_user_456";
  const senderName = options.senderName || "NextAura Test User";

  return {
    test_event: true,
    source: "meta_test",
    connection_id: options.connectionId,
    page_id: options.pageId,
    page_name: options.pageName,
    post_id: postId,
    comment_id: commentId,
    message: options.message || "Test comment from NextAura Automation Builder",
    parent_comment_id: parentCommentId,
    from: {
      id: senderId,
      name: senderName,
    },
    created_time: now.toISOString(),
    raw: {
      object: "page",
      entry: [
        {
          id: options.pageId,
          time: createdTimeSeconds,
          changes: [
            {
              field: "feed",
              value: {
                item: "comment",
                verb: "add",
                comment_id: commentId,
                parent_id: parentCommentId || postId,
                post_id: postId,
                message: options.message || "Test comment from NextAura Automation Builder",
                created_time: createdTimeSeconds,
                from: {
                  id: senderId,
                  name: senderName,
                },
              },
            },
          ],
        },
      ],
    },
  };
}

export interface TriggerConfig {
  connection_id?: string;
  resource_id?: string;
  contains_text?: string;
  exact_post_id?: string;
  include_replies?: boolean;
}

export function evaluateFacebookCommentTrigger(
  config: TriggerConfig,
  payload: {
    connection_id?: string;
    page_id: string;
    post_id: string;
    message?: string;
    parent_comment_id?: string | null;
  },
): { matches: boolean; mismatchReason?: string } {
  if (config.connection_id && payload.connection_id && config.connection_id !== payload.connection_id) {
    return { matches: false, mismatchReason: "Event does not match trigger connection." };
  }

  if (config.resource_id && config.resource_id !== payload.page_id) {
    return { matches: false, mismatchReason: "Event does not match trigger page." };
  }

  if (config.contains_text && typeof payload.message === "string") {
    const required = config.contains_text.trim().toLowerCase();
    if (required && !payload.message.toLowerCase().includes(required)) {
      return { matches: false, mismatchReason: "Message does not contain required text." };
    }
  }

  if (config.exact_post_id && config.exact_post_id.trim()) {
    if (config.exact_post_id.trim() !== payload.post_id.trim()) {
      return { matches: false, mismatchReason: "Event does not match exact post ID." };
    }
  }

  if (config.include_replies === false && payload.parent_comment_id) {
    return { matches: false, mismatchReason: "Replies are ignored by trigger configuration." };
  }

  return { matches: true };
}

export function validateFacebookTestTriggerPreconditions(params: {
  workflowEnabled: boolean;
  triggerConfig: Record<string, unknown>;
  connectionStatus?: string;
  resourceStatus?: string;
}): { valid: boolean; error?: string } {
  if (!params.workflowEnabled) {
    return { valid: false, error: "Workflow must be enabled to run a test." };
  }

  const connectionId = String(params.triggerConfig.connection_id || "");
  const resourceId = String(params.triggerConfig.resource_id || "");

  if (!connectionId || !resourceId) {
    return {
      valid: false,
      error: "Trigger configuration is missing Meta connection or Facebook Page.",
    };
  }

  if (params.connectionStatus && params.connectionStatus !== "active" && params.connectionStatus !== "degraded") {
    return {
      valid: false,
      error: "Meta connection is not active.",
    };
  }

  if (params.resourceStatus && params.resourceStatus !== "active") {
    return {
      valid: false,
      error: "Selected Facebook Page is not active.",
    };
  }

  return { valid: true };
}

