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
          : resource.resource_type === "instagram_professional_account")
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

      const facebookAutomationEvents = rows.filter((row: any) => {
        const val = row.payload?.event?.value || {};
        return row.product === 'facebook' && 
          row.event_type === 'change.feed' &&
          val.item === 'comment' &&
          val.verb === 'add';
      }).map((row: any) => {
        const val = row.payload?.event?.value || {};
        return {
          organization_id: row.organization_id,
          event_type: 'facebook.page.comment.created',
          entity_type: 'facebook_comment',
          entity_id: null,
          payload: {
            connection_id: row.connection_id,
            page_id: row.external_resource_id,
            post_id: val.post_id,
            comment_id: val.comment_id,
            parent_comment_id: val.parent_id && val.parent_id !== val.post_id ? val.parent_id : undefined,
            message: val.message,
            author_id: val.sender_id,
            author_name: val.sender_name,
            created_time: val.created_time || row.occurred_at,
          },
          source: 'meta_webhook',
          dedupe_key: `meta_webhook:comment:${row.connection_id}:${row.external_event_id}`,
          occurred_at: row.occurred_at,
        };
      });

      const instagramAutomationEvents = rows.filter((row: any) => {
        const val = row.payload?.event?.value || {};
        return row.product === 'instagram' && 
          (row.event_type === 'change.comments' || row.event_type === 'change.live_comments');
      }).map((row: any) => {
        const val = row.payload?.event?.value || {};
        return {
          organization_id: row.organization_id,
          event_type: 'instagram.comment.created',
          entity_type: 'instagram_comment',
          entity_id: null,
          payload: {
            connection_id: row.connection_id,
            instagram_account_id: row.external_resource_id,
            media_id: val.media_id ? String(val.media_id) : undefined,
            comment_id: val.id ? String(val.id) : undefined,
            parent_comment_id: val.parent_id && val.parent_id !== val.media_id ? String(val.parent_id) : undefined,
            comment_text: val.text,
            commenter_id: val.from?.id ? String(val.from.id) : undefined,
            commenter_username: val.from?.username,
            created_time: row.occurred_at,
          },
          source: 'instagram_webhook',
          dedupe_key: `instagram_webhook:comment:${row.connection_id}:${row.external_event_id}`,
          occurred_at: row.occurred_at,
        };
      });

      const automationEvents = [
        ...facebookAutomationEvents,
        ...instagramAutomationEvents
      ];

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
