import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSyntheticFacebookCommentPayload,
  buildTestDedupeKey,
  evaluateFacebookCommentTrigger,
  validateFacebookTestTriggerPreconditions,
} from "./facebookTriggerUtils.ts";

test("synthetic event payload contains realistic Facebook comment structure and required test markers", () => {
  const payload = buildSyntheticFacebookCommentPayload({
    pageId: "page_123456789",
    pageName: "NextAura AI",
    connectionId: "conn_meta_001",
    message: "Pricing details please",
    postId: "post_987654321",
    senderName: "Alice Tester",
    senderId: "user_777",
  });

  // Strict test mode markers
  assert.equal(payload.test_event, true);
  assert.equal(payload.source, "meta_test");

  // Real page identifiers from connection resource
  assert.equal(payload.page_id, "page_123456789");
  assert.equal(payload.page_name, "NextAura AI");
  assert.equal(payload.connection_id, "conn_meta_001");

  // Comment data
  assert.equal(payload.post_id, "post_987654321");
  assert.equal(payload.message, "Pricing details please");
  assert.equal(payload.from.name, "Alice Tester");
  assert.equal(payload.from.id, "user_777");
  assert.equal(payload.parent_comment_id, null);

  // Raw Facebook Page webhook format
  assert.equal(payload.raw.object, "page");
  assert.equal(payload.raw.entry.length, 1);
  assert.equal(payload.raw.entry[0].id, "page_123456789");
  assert.equal(payload.raw.entry[0].changes[0].field, "feed");
  assert.equal(payload.raw.entry[0].changes[0].value.item, "comment");
  assert.equal(payload.raw.entry[0].changes[0].value.verb, "add");
  assert.equal(payload.raw.entry[0].changes[0].value.post_id, "post_987654321");
  assert.equal(payload.raw.entry[0].changes[0].value.message, "Pricing details please");
  assert.equal(payload.raw.entry[0].changes[0].value.from.name, "Alice Tester");
});

test("synthetic event correctly distinguishes replies from top-level comments", () => {
  const replyPayload = buildSyntheticFacebookCommentPayload({
    pageId: "page_123",
    pageName: "NextAura AI",
    postId: "post_456",
    isReply: true,
    parentCommentId: "comment_parent_789",
    message: "I also agree with this",
  });

  assert.equal(replyPayload.test_event, true);
  assert.equal(replyPayload.parent_comment_id, "comment_parent_789");
  assert.equal(replyPayload.raw.entry[0].changes[0].value.parent_id, "comment_parent_789");
});

test("test deduplication key format is unique and prevents collision with production webhooks", () => {
  const pageId = "104106552574972";
  const commentId1 = "test_c_1001";
  const commentId2 = "test_c_1002";

  const key1 = buildTestDedupeKey(pageId, commentId1);
  const key2 = buildTestDedupeKey(pageId, commentId2);

  // Verifies prefix separation from live webhook keys (e.g. meta:comment:...)
  assert.equal(key1, "meta_test:comment:104106552574972:test_c_1001");
  assert.equal(key2, "meta_test:comment:104106552574972:test_c_1002");

  // Uniqueness check: two test events produce distinct dedupe keys
  assert.notEqual(key1, key2);
  assert.match(key1, /^meta_test:comment:/);
  assert.doesNotMatch(key1, /^meta:comment:/);
});

test("trigger filter: exact_post_id matching and rejection", () => {
  const triggerConfig = {
    resource_id: "page_123",
    exact_post_id: "post_999",
  };

  // Matching post
  const matchingResult = evaluateFacebookCommentTrigger(triggerConfig, {
    page_id: "page_123",
    post_id: "post_999",
    message: "Hello",
  });
  assert.equal(matchingResult.matches, true);
  assert.equal(matchingResult.mismatchReason, undefined);

  // Mismatched post
  const nonMatchingResult = evaluateFacebookCommentTrigger(triggerConfig, {
    page_id: "page_123",
    post_id: "post_different_888",
    message: "Hello",
  });
  assert.equal(nonMatchingResult.matches, false);
  assert.equal(nonMatchingResult.mismatchReason, "Event does not match exact post ID.");

  // Unrestricted trigger (empty exact_post_id) matches any post
  const unrestrictedResult = evaluateFacebookCommentTrigger(
    { resource_id: "page_123" },
    { page_id: "page_123", post_id: "any_post_777", message: "Hello" },
  );
  assert.equal(unrestrictedResult.matches, true);
});

test("trigger filter: contains_text case-insensitive substring matching", () => {
  const triggerConfig = {
    resource_id: "page_123",
    contains_text: "Price",
  };

  // Matches case-insensitively
  const matchResult = evaluateFacebookCommentTrigger(triggerConfig, {
    page_id: "page_123",
    post_id: "post_1",
    message: "Can you send the PRICE list please?",
  });
  assert.equal(matchResult.matches, true);

  // Mismatch when word is missing
  const mismatchResult = evaluateFacebookCommentTrigger(triggerConfig, {
    page_id: "page_123",
    post_id: "post_1",
    message: "Just saying hello!",
  });
  assert.equal(mismatchResult.matches, false);
  assert.equal(mismatchResult.mismatchReason, "Message does not contain required text.");
});

test("trigger filter: include_replies configuration", () => {
  const configIgnoreReplies = {
    resource_id: "page_123",
    include_replies: false,
  };

  const configAllowReplies = {
    resource_id: "page_123",
    include_replies: true,
  };

  // Top-level comment: always passes
  const topLevelResult = evaluateFacebookCommentTrigger(configIgnoreReplies, {
    page_id: "page_123",
    post_id: "post_1",
    message: "Top level comment",
    parent_comment_id: null,
  });
  assert.equal(topLevelResult.matches, true);

  // Reply comment with include_replies: false -> rejected
  const replyRejectedResult = evaluateFacebookCommentTrigger(configIgnoreReplies, {
    page_id: "page_123",
    post_id: "post_1",
    message: "A reply comment",
    parent_comment_id: "parent_comment_999",
  });
  assert.equal(replyRejectedResult.matches, false);
  assert.equal(replyRejectedResult.mismatchReason, "Replies are ignored by trigger configuration.");

  // Reply comment with include_replies: true -> accepted
  const replyAcceptedResult = evaluateFacebookCommentTrigger(configAllowReplies, {
    page_id: "page_123",
    post_id: "post_1",
    message: "A reply comment",
    parent_comment_id: "parent_comment_999",
  });
  assert.equal(replyAcceptedResult.matches, true);
});

test("security & authorization preconditions: validates workflow status and connection", () => {
  // Disabled workflow rejected
  const disabledCheck = validateFacebookTestTriggerPreconditions({
    workflowEnabled: false,
    triggerConfig: { connection_id: "conn_1", resource_id: "page_1" },
  });
  assert.equal(disabledCheck.valid, false);
  assert.equal(disabledCheck.error, "Workflow must be enabled to run a test.");

  // Missing connection_id rejected
  const missingConnCheck = validateFacebookTestTriggerPreconditions({
    workflowEnabled: true,
    triggerConfig: { resource_id: "page_1" },
  });
  assert.equal(missingConnCheck.valid, false);
  assert.equal(missingConnCheck.error, "Trigger configuration is missing Meta connection or Facebook Page.");

  // Missing resource_id rejected
  const missingResourceCheck = validateFacebookTestTriggerPreconditions({
    workflowEnabled: true,
    triggerConfig: { connection_id: "conn_1" },
  });
  assert.equal(missingResourceCheck.valid, false);
  assert.equal(missingResourceCheck.error, "Trigger configuration is missing Meta connection or Facebook Page.");

  // Inactive connection rejected
  const inactiveConnCheck = validateFacebookTestTriggerPreconditions({
    workflowEnabled: true,
    triggerConfig: { connection_id: "conn_1", resource_id: "page_1" },
    connectionStatus: "disconnected",
  });
  assert.equal(inactiveConnCheck.valid, false);
  assert.equal(inactiveConnCheck.error, "Meta connection is not active.");

  // Inactive resource rejected
  const inactiveResourceCheck = validateFacebookTestTriggerPreconditions({
    workflowEnabled: true,
    triggerConfig: { connection_id: "conn_1", resource_id: "page_1" },
    connectionStatus: "active",
    resourceStatus: "revoked",
  });
  assert.equal(inactiveResourceCheck.valid, false);
  assert.equal(inactiveResourceCheck.error, "Selected Facebook Page is not active.");

  // Valid active configuration accepted
  const validCheck = validateFacebookTestTriggerPreconditions({
    workflowEnabled: true,
    triggerConfig: { connection_id: "conn_1", resource_id: "page_1" },
    connectionStatus: "active",
    resourceStatus: "active",
  });
  assert.equal(validCheck.valid, true);
  assert.equal(validCheck.error, undefined);
});

