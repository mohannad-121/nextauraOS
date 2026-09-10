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

export const metaWebhookHandler = async (request: Request) => {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode") || "";
    const verifyToken = url.searchParams.get("hub.verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge") || "";
    if (
      mode === "subscribe" && challenge && challenge.length <= 1024 &&
      timingSafeEqual(verifyToken, requiredVerifyToken())
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
    const signature = request.headers.get("x-hub-signature-256") || "";
    if (!await verifyMetaWebhookSignature(rawBody, signature)) {
      throw new MetaIntegrationError(
        "META_WEBHOOK_SIGNATURE_INVALID",
        "Meta webhook signature is invalid.",
        401,
      );
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
