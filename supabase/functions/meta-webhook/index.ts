import { adminClient } from "../_shared/billing.ts";
import {
  MetaIntegrationError,
  normalizeMetaWebhookPayload,
  timingSafeEqual,
  verifyMetaWebhookSignature,
} from "../_shared/meta-integration.ts";

const MAX_BODY_BYTES = 256 * 1024;

const requiredVerifyToken = () => {
  const value = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "";
  if (!value) throw new Error("META_WEBHOOK_VERIFY_TOKEN is not configured.");
  return value;
};

const instagramVerifyToken = () =>
  Deno.env.get("INSTAGRAM_WEBHOOK_VERIFY_TOKEN") || "";

// Verify HMAC-SHA256 signature using the Instagram app secret
async function verifyInstagramWebhookSignature(
  body: string,
  signature: string,
): Promise<boolean> {
  const secret = Deno.env.get("INSTAGRAM_APP_SECRET") || "";
  if (!secret) return false;
  // Instagram uses the same X-Hub-Signature-256 mechanism as Meta
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const expected = "sha256=" +
    [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
  return timingSafeEqual(signature, expected);
}

async function handleInstagramWebhookPayload(payload: unknown): Promise<void> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
  const p = payload as Record<string, any>;
  const entries: Array<Record<string, unknown>> = [];
  for (const entry of (Array.isArray(p.entry) ? p.entry : []).slice(0, 100)) {
    if (!entry || typeof entry !== "object") continue;
    const igUserId = String(entry.id || "");
    if (!igUserId || !/^\d+$/.test(igUserId)) continue;
    for (
      const change of (Array.isArray(entry.changes) ? entry.changes : [])
        .slice(0, 50)
    ) {
      if (!change || typeof change !== "object") continue;
      const field = String(change.field || "");
      const value = change.value || {};
      if (field === "comments" || field === "live_comments") {
        const commentId = String(value.id || "");
        const parentCommentId = value.parent_id &&
            value.parent_id !== value.media_id
          ? String(value.parent_id)
          : undefined;
        if (!commentId) continue;
        entries.push({
          event_type: "instagram.comment.created",
          entity_type: "instagram_comment",
          entity_id: null,
          source: "instagram_webhook",
          dedupe_key: `instagram_webhook:comment:${igUserId}:${commentId}`,
          occurred_at: new Date().toISOString(),
          payload: {
            ig_user_id: igUserId,
            comment_id: commentId,
            parent_comment_id: parentCommentId,
            media_id: value.media_id ? String(value.media_id) : undefined,
            text: typeof value.text === "string"
              ? value.text.slice(0, 2048)
              : undefined,
            from: value.from
              ? {
                id: String(value.from?.id || ""),
                username: value.from?.username || null,
              }
              : undefined,
          },
        });
      }
      // messages / messaging_postbacks — store raw for future trigger nodes
      if (field === "messages" || field === "messaging_postbacks") {
        const messaging = Array.isArray(value.messaging)
          ? value.messaging
          : [value];
        for (const msg of messaging.slice(0, 10)) {
          const mid = String(
            msg?.message?.mid || msg?.postback?.mid || msg?.mid || "",
          );
          if (!mid) continue;
          entries.push({
            event_type: "instagram.comment.created", // placeholder until message trigger node added
            entity_type: "instagram_comment",
            entity_id: null,
            source: "instagram_webhook",
            dedupe_key: `instagram_webhook:message:${igUserId}:${mid}`,
            occurred_at: new Date().toISOString(),
            payload: {
              ig_user_id: igUserId,
              field,
              raw: msg,
            },
          });
        }
      }
    }
  }
  if (!entries.length) return;
  const admin = adminClient();
  // Note: instagram webhook events are stored for future trigger nodes.
  // We intentionally do NOT fan out to automation_events yet (no trigger node registered).
  // This stores raw events for auditing and future use.
  try {
    await admin.from("meta_webhook_events").upsert(
      entries.map((e) => ({
        organization_id: "00000000-0000-0000-0000-000000000000", // placeholder — no page binding for Instagram Login
        connection_id: "00000000-0000-0000-0000-000000000000",
        resource_id: "00000000-0000-0000-0000-000000000000",
        product: "instagram",
        event_type: e.event_type,
        external_event_id: String(e.dedupe_key || ""),
        external_resource_id: String((e.payload as any)?.ig_user_id || ""),
        occurred_at: e.occurred_at,
        payload: e.payload,
      })),
      { onConflict: "connection_id,external_event_id", ignoreDuplicates: true },
    );
  } catch {
    // Best-effort — do not fail webhook acknowledgement for storage errors
  }
}

export const metaWebhookHandler = async (request: Request) => {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode") || "";
    const verifyToken = url.searchParams.get("hub.verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge") || "";
    const igToken = instagramVerifyToken();
    const isInstagramVerify = igToken && timingSafeEqual(verifyToken, igToken);
    const isFacebookVerify = timingSafeEqual(verifyToken, requiredVerifyToken());
    if (
      mode === "subscribe" && challenge && challenge.length <= 1024 &&
      timingSafeEqual(verifyToken, requiredVerifyToken())
      (isInstagramVerify || isFacebookVerify)
    ) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return new Response("Forbidden", { status: 403 });
  }
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    if (
      !(request.headers.get("content-type") || "").toLowerCase().startsWith(
        "application/json",
      )
    ) {
      return new Response("Unsupported media type", { status: 415 });
    }
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return new Response("Payload too large", { status: 413 });
    }
    const rawBody = await request.text();
    if (
      !rawBody || new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES
    ) {
      return new Response("Payload too large", { status: 413 });
    }

    // Determine payload source: peek at object field to route signature validation
    let payloadObject = "";
    try {
      payloadObject = (JSON.parse(rawBody) as any)?.object || "";
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const signature = request.headers.get("x-hub-signature-256") || "";
    if (!await verifyMetaWebhookSignature(rawBody, signature)) {
      throw new MetaIntegrationError(
        "META_WEBHOOK_SIGNATURE_INVALID",
        "Meta webhook signature is invalid.",
        401,
      );
    const isInstagramPayload = payloadObject === "instagram";

    if (isInstagramPayload) {
      if (!await verifyInstagramWebhookSignature(rawBody, signature)) {
        throw new MetaIntegrationError(
          "INSTAGRAM_WEBHOOK_SIGNATURE_INVALID",
          "Instagram webhook signature is invalid.",
          401,
        );
      }
    } else {
      if (!await verifyMetaWebhookSignature(rawBody, signature)) {
        throw new MetaIntegrationError(
          "META_WEBHOOK_SIGNATURE_INVALID",
          "Meta webhook signature is invalid.",
          401,
        );
      }
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Route Instagram payloads to dedicated handler
    if (isInstagramPayload) {
      await handleInstagramWebhookPayload(payload);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    const events = await normalizeMetaWebhookPayload(payload);
    if (!events.length) return new Response("EVENT_RECEIVED", { status: 200 });

    const admin = adminClient();
    const externalIds = [...new Set(events.map((event) => event.resourceId))];
    const { data: resources, error: resourceError } = await admin.from(
      "integration_connection_resources",
    ).select(
      "id,organization_id,connection_id,resource_type,external_resource_id",
    )
      .eq("provider", "meta").eq("selected", true)
      .in("external_resource_id", externalIds);
    if (resourceError) throw resourceError;
    const connectionIds = [
      ...new Set((resources || []).map((row: any) => row.connection_id)),
    ];
    const activeConnections = new Set<string>();
    if (connectionIds.length) {
      const { data: connections, error } = await admin.from(
        "integration_connections",
      ).select("id").eq("provider", "meta").in("status", ["active", "degraded"])
        .in("id", connectionIds);
      if (error) throw error;
      for (const connection of connections || []) {
        activeConnections.add(connection.id);
      }
    }
    const rows = events.flatMap((event) =>
      (resources || []).filter((resource: any) =>
        resource.external_resource_id === event.resourceId &&
        activeConnections.has(resource.connection_id) &&
        (event.product === "facebook"
          ? resource.resource_type === "facebook_page"
          : resource.resource_type === "instagram_account")
      ).map((resource: any) => ({
        organization_id: resource.organization_id,
        connection_id: resource.connection_id,
        resource_id: resource.id,
        product: event.product,
        event_type: event.eventType,
        external_event_id: event.externalEventId,
        external_resource_id: event.resourceId,
        occurred_at: event.occurredAt,
        payload: event.payload,
      }))
    ).slice(0, 500);
    if (rows.length) {
      const { error } = await admin.from("meta_webhook_events").upsert(rows, {
        onConflict: "connection_id,external_event_id",
        ignoreDuplicates: true,
      });
      if (error) throw error;

      const automationEvents = rows.filter((row: any) => 
        row.product === 'facebook' && 
        row.event_type === 'change.feed' &&
        row.payload?.item === 'comment' &&
        row.payload?.verb === 'add'
      ).map((row: any) => ({
        organization_id: row.organization_id,
        event_type: 'facebook.page.comment.created',
        entity_type: 'facebook_comment',
        entity_id: null,
        payload: {
          connection_id: row.connection_id,
          page_id: row.external_resource_id,
          post_id: row.payload.post_id,
          comment_id: row.payload.comment_id,
          parent_comment_id: row.payload.parent_id !== row.payload.post_id ? row.payload.parent_id : undefined,
          message: row.payload.message,
          author_id: row.payload.sender_id,
          author_name: row.payload.sender_name,
          created_time: row.payload.created_time,
        },
        source: 'meta_webhook',
        dedupe_key: `meta_webhook:comment:${row.connection_id}:${row.external_event_id}`,
        occurred_at: row.occurred_at,
      }));

      if (automationEvents.length) {
        const { error: autoError } = await admin.from("automation_events").upsert(automationEvents, {
          onConflict: "dedupe_key",
          ignoreDuplicates: true,
        });
        if (autoError) throw autoError;
      }
    }
    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    if (error instanceof MetaIntegrationError) {
      return new Response(error.code, { status: error.status });
    }
    return new Response("META_WEBHOOK_ERROR", { status: 500 });
  }
};

if (import.meta.main) Deno.serve(metaWebhookHandler);
