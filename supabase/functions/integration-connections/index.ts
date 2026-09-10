import {
  authenticate,
  corsHeaders,
  json,
  requireBillingAdmin,
} from "../_shared/billing.ts";
import { getOrganizationEntitlements } from "../_shared/entitlements.ts";
import { githubClient } from "../_shared/github-oauth.ts";
import {
  encryptIntegrationCredential,
  getValidGoogleAccessToken,
  GOOGLE_FOUNDATION_SCOPES,
  googleAccount,
  googleClient,
  randomOAuthState,
  sha256,
} from "../_shared/google-oauth.ts";
import {
  buildMetaAuthorizationUrl,
  checkMetaConnectionHealth,
  disconnectMetaConnection,
  MetaIntegrationError,
} from "../_shared/meta-integration.ts";
import { assertPublicWebhookTarget } from "../_shared/webhook-security.ts";

const safeConnection = (row: Record<string, unknown>) => {
  const { created_by: _createdBy, ...metadata } = row;
  return metadata;
};

async function requireConnectionAccess(
  admin: any,
  userId: string,
  organizationId: string,
) {
  await requireBillingAdmin(admin, userId, organizationId);
  const entitlements = await getOrganizationEntitlements(admin, organizationId);
  if (!entitlements.access_active || !entitlements.automation_access) {
    throw new Error("Connections require an active Custom workspace.");
  }
}

async function requireMembership(
  admin: any,
  userId: string,
  organizationId: string,
) {
  const { data, error } = await admin.from("organization_members").select("id")
    .eq("organization_id", organizationId).eq("user_id", userId)
    .eq("status", "Active").maybeSingle();
  if (error || !data) {
    throw new Error("You are not an active member of this organization.");
  }
}

async function audit(
  admin: any,
  organizationId: string,
  actorId: string,
  action: string,
  connectionId: string,
  details: Record<string, unknown> = {},
) {
  await admin.from("audit_logs").insert({
    organization_id: organizationId,
    user_name: actorId,
    action,
    details: JSON.stringify({ connection_id: connectionId, ...details }),
  });
}

const numericIds = (value: unknown, field: string) => {
  if (!Array.isArray(value) || value.length > 500) {
    throw new MetaIntegrationError(
      "META_RESOURCE_NOT_AUTHORIZED",
      `${field} is invalid.`,
    );
  }
  const ids = value.map(String);
  if (ids.some((id) => !/^\d+$/.test(id)) || new Set(ids).size !== ids.length) {
    throw new MetaIntegrationError(
      "META_RESOURCE_NOT_AUTHORIZED",
      `${field} contains an invalid resource.`,
    );
  }
  return ids;
};

export const integrationConnectionsHandler = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed." }, 405);
  }
  try {
    const { admin, user } = await authenticate(req);
    const body = await req.json();
    const organizationId = String(body.organizationId || "");
    if (!organizationId) {
      return json(
        { success: false, error: "organizationId is required." },
        400,
      );
    }

    if (body.operation === "list") {
      await requireMembership(admin, user.id, organizationId);
      const { data, error } = await admin.from("integration_connections")
        .select(
          "id,organization_id,provider,name,status,auth_type,scopes,account_label,expires_at,last_verified_at,revoked_at,provider_metadata,created_at,updated_at",
        ).eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({
        success: true,
        connections: (data || []).map(safeConnection),
      });
    }

    if (body.operation === "startGithubOAuth") {
      await requireBillingAdmin(admin, user.id, organizationId);
      const entitlements = await getOrganizationEntitlements(
        admin,
        organizationId,
      );
      if (!entitlements.access_active || !entitlements.website_github_export) {
        throw new Error("GitHub export is not included in your current plan.");
      }
      const connectionId = body.connectionId ? String(body.connectionId) : null;
      if (connectionId) {
        const { data: connection } = await admin.from("integration_connections")
          .select("id").eq("id", connectionId)
          .eq("organization_id", organizationId).eq("provider", "github")
          .maybeSingle();
        if (!connection) {
          return json(
            { success: false, error: "GitHub connection not found." },
            404,
          );
        }
      }
      const state = randomOAuthState();
      const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
      const { error } = await admin.from("integration_oauth_states").insert({
        state_hash: await sha256(state),
        provider: "github",
        organization_id: organizationId,
        user_id: user.id,
        connection_id: connectionId,
        expires_at: expiresAt,
      });
      if (error) throw error;
      const client = githubClient();
      const authorizationUrl = new URL(
        "https://github.com/login/oauth/authorize",
      );
      authorizationUrl.searchParams.set("client_id", client.clientId);
      authorizationUrl.searchParams.set("redirect_uri", client.redirectUri);
      authorizationUrl.searchParams.set("scope", "repo");
      authorizationUrl.searchParams.set("state", state);
      await audit(
        admin,
        organizationId,
        user.id,
        connectionId
          ? "integration.github.reconnect_initiated"
          : "integration.github.initiated",
        connectionId || "pending",
      );
      return json({
        success: true,
        authorizationUrl: authorizationUrl.toString(),
      });
    }

    await requireConnectionAccess(admin, user.id, organizationId);

    if (body.operation === "startGoogleOAuth") {
      const connectionId = body.connectionId ? String(body.connectionId) : null;
      if (connectionId) {
        const { data: connection } = await admin.from("integration_connections")
          .select("id").eq("id", connectionId)
          .eq("organization_id", organizationId).eq("provider", "google")
          .maybeSingle();
        if (!connection) {
          return json(
            { success: false, error: "Google connection not found." },
            404,
          );
        }
      }
      const requestedScopes: string[] = Array.isArray(body.additionalScopes)
        ? body.additionalScopes.filter((scope: unknown): scope is string =>
          scope === "https://www.googleapis.com/auth/gmail.send"
        )
        : [];
      const state = randomOAuthState();
      const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
      const { error } = await admin.from("integration_oauth_states").insert({
        state_hash: await sha256(state),
        provider: "google",
        organization_id: organizationId,
        user_id: user.id,
        connection_id: connectionId,
        expires_at: expiresAt,
      });
      if (error) throw error;
      const client = googleClient();
      const authorizationUrl = new URL(
        "https://accounts.google.com/o/oauth2/v2/auth",
      );
      authorizationUrl.searchParams.set("client_id", client.clientId);
      authorizationUrl.searchParams.set("redirect_uri", client.redirectUri);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set(
        "scope",
        [...GOOGLE_FOUNDATION_SCOPES, ...requestedScopes].join(" "),
      );
      authorizationUrl.searchParams.set("state", state);
      authorizationUrl.searchParams.set("access_type", "offline");
      authorizationUrl.searchParams.set("prompt", "consent");
      authorizationUrl.searchParams.set("include_granted_scopes", "true");
      await audit(
        admin,
        organizationId,
        user.id,
        connectionId
          ? "integration.google.reconnect_initiated"
          : "integration.google.initiated",
        connectionId || "pending",
      );
      return json({
        success: true,
        authorizationUrl: authorizationUrl.toString(),
      });
    }

    if (body.operation === "startMetaOAuth") {
      const connectionId = body.connectionId ? String(body.connectionId) : null;
      if (connectionId) {
        const { data: connection } = await admin.from("integration_connections")
          .select("id").eq("id", connectionId)
          .eq("organization_id", organizationId).eq("provider", "meta")
          .maybeSingle();
        if (!connection) {
          throw new MetaIntegrationError(
            "META_CONNECTION_REQUIRED",
            "Meta connection not found.",
            404,
          );
        }
      }
      const state = randomOAuthState();
      const { error } = await admin.from("integration_oauth_states").insert({
        state_hash: await sha256(state),
        provider: "meta",
        organization_id: organizationId,
        user_id: user.id,
        connection_id: connectionId,
        redirect_path: "/automations?tab=connections",
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
      if (error) throw error;
      await audit(
        admin,
        organizationId,
        user.id,
        connectionId
          ? "integration.meta.reconnect_initiated"
          : "integration.meta.initiated",
        connectionId || "pending",
      );
      return json({
        success: true,
        authorizationUrl: buildMetaAuthorizationUrl(
          state,
          Boolean(connectionId),
        ),
      });
    }

    if (body.operation === "createGenericApi") {
      const name = String(body.name || "").trim();
      const baseUrl = String(body.baseUrl || "").trim();
      const secret = String(body.secret || "");
      if (!name || !secret || secret.length > 4096) {
        return json({
          success: false,
          error: "A connection name and API secret are required.",
        }, 400);
      }
      let url: URL;
      try {
        url = new URL(baseUrl);
      } catch {
        return json({
          success: false,
          error: "A valid HTTPS API base URL is required.",
        }, 400);
      }
      if (
        url.protocol !== "https:" || url.username || url.password ||
        (url.port && url.port !== "443")
      ) {
        return json({
          success: false,
          error: "A valid HTTPS API base URL is required.",
        }, 400);
      }
      await assertPublicWebhookTarget(url);
      const { data: connection, error } = await admin.from(
        "integration_connections",
      ).insert({
        organization_id: organizationId,
        provider: "generic_api",
        name,
        status: "active",
        auth_type: "api_key",
        scopes: [],
        account_label: url.hostname,
        created_by: user.id,
      }).select("*").single();
      if (error) throw error;
      const encrypted = await encryptIntegrationCredential({
        base_url: url.origin,
        secret,
      });
      const { error: credentialError } = await admin.from(
        "integration_connection_credentials",
      ).insert({ connection_id: connection.id, ...encrypted });
      if (credentialError) {
        await admin.from("integration_connections").delete().eq(
          "id",
          connection.id,
        ).eq("organization_id", organizationId);
        throw credentialError;
      }
      await audit(
        admin,
        organizationId,
        user.id,
        "integration.connection.created",
        connection.id,
        { provider: "generic_api", hostname: url.hostname },
      );
      return json(
        { success: true, connection: safeConnection(connection) },
        201,
      );
    }

    const connectionId = String(body.connectionId || "");
    if (!connectionId) {
      return json({ success: false, error: "connectionId is required." }, 400);
    }
    const { data: connection, error: lookupError } = await admin.from(
      "integration_connections",
    ).select("*").eq("id", connectionId).eq("organization_id", organizationId)
      .maybeSingle();
    if (lookupError || !connection) {
      return json({ success: false, error: "Connection not found." }, 404);
    }

    if (body.operation === "getMetaDetails") {
      if (connection.provider !== "meta") {
        throw new MetaIntegrationError(
          "META_CONNECTION_REQUIRED",
          "Meta connection not found.",
          404,
        );
      }
      const { data: resources, error } = await admin.from(
        "integration_connection_resources",
      ).select(
        "id,resource_type,external_resource_id,display_name,selected,metadata,updated_at",
      ).eq("organization_id", organizationId).eq("connection_id", connectionId)
        .order("resource_type").order("display_name");
      if (error) throw error;
      return json({
        success: true,
        connection: safeConnection(connection),
        resources: resources || [],
      });
    }

    if (body.operation === "updateMetaResources") {
      if (connection.provider !== "meta") {
        throw new MetaIntegrationError(
          "META_CONNECTION_REQUIRED",
          "Meta connection not found.",
          404,
        );
      }
      const pageIds = numericIds(body.pageIds, "pageIds");
      const instagramIds = numericIds(body.instagramIds, "instagramIds");
      const { data: resources, error } = await admin.from(
        "integration_connection_resources",
      ).select("resource_type,external_resource_id")
        .eq("organization_id", organizationId).eq(
          "connection_id",
          connectionId,
        );
      if (error) throw error;
      const allowed = new Set(
        (resources || []).map((row: any) =>
          `${row.resource_type}:${row.external_resource_id}`
        ),
      );
      const unauthorized = [
        ...pageIds.map((id) => `facebook_page:${id}`),
        ...instagramIds.map((id) => `instagram_account:${id}`),
      ].find((key) => !allowed.has(key));
      if (unauthorized) {
        throw new MetaIntegrationError(
          "META_RESOURCE_NOT_AUTHORIZED",
          "A selected Meta resource is not authorized for this connection.",
          403,
        );
      }
      const now = new Date().toISOString();
      const { error: clearError } = await admin.from(
        "integration_connection_resources",
      ).update({
        selected: false,
        updated_at: now,
      }).eq("organization_id", organizationId).eq(
        "connection_id",
        connectionId,
      );
      if (clearError) throw clearError;
      if (pageIds.length) {
        const { error: pageSelectionError } = await admin.from(
          "integration_connection_resources",
        ).update({
          selected: true,
          updated_at: now,
        }).eq("organization_id", organizationId).eq(
          "connection_id",
          connectionId,
        )
          .eq("resource_type", "facebook_page")
          .in("external_resource_id", pageIds);
        if (pageSelectionError) throw pageSelectionError;
      }
      if (instagramIds.length) {
        const { error: instagramSelectionError } = await admin.from(
          "integration_connection_resources",
        ).update({
          selected: true,
          updated_at: now,
        }).eq("organization_id", organizationId).eq(
          "connection_id",
          connectionId,
        )
          .eq("resource_type", "instagram_account")
          .in("external_resource_id", instagramIds);
        if (instagramSelectionError) throw instagramSelectionError;
      }
      await audit(
        admin,
        organizationId,
        user.id,
        "integration.meta.resources_updated",
        connectionId,
        {
          page_count: pageIds.length,
          instagram_account_count: instagramIds.length,
        },
      );
      return json({ success: true });
    }

    if (body.operation === "checkMetaConnection") {
      if (connection.provider !== "meta") {
        throw new MetaIntegrationError(
          "META_CONNECTION_REQUIRED",
          "Meta connection not found.",
          404,
        );
      }
      const health = await checkMetaConnectionHealth(
        admin,
        connectionId,
        organizationId,
      );
      await audit(
        admin,
        organizationId,
        user.id,
        "integration.meta.health_checked",
        connectionId,
        { status: health.status, code: health.code },
      );
      return json({ success: true, health });
    }

    if (body.operation === "rename") {
      const name = String(body.name || "").trim();
      if (!name || name.length > 120) {
        return json({
          success: false,
          error: "A valid connection name is required.",
        }, 400);
      }
      const { data, error } = await admin.from("integration_connections")
        .update({
          name,
          updated_at: new Date().toISOString(),
        }).eq("id", connectionId).eq("organization_id", organizationId).select(
          "*",
        )
        .single();
      if (error) throw error;
      await audit(
        admin,
        organizationId,
        user.id,
        "integration.connection.renamed",
        connectionId,
      );
      return json({ success: true, connection: safeConnection(data) });
    }

    if (body.operation === "revoke" || body.operation === "delete") {
      const now = new Date().toISOString();
      if (connection.provider === "google") {
        try {
          const { accessToken } = await getValidGoogleAccessToken(
            connectionId,
            organizationId,
          );
          await fetch(
            `https://oauth2.googleapis.com/revoke?token=${
              encodeURIComponent(accessToken)
            }`,
            { method: "POST" },
          );
        } catch {
          // Local revocation remains authoritative.
        }
      }
      if (connection.provider === "meta") {
        await disconnectMetaConnection(admin, connectionId, organizationId);
      }
      const status = connection.provider === "meta"
        ? "disconnected"
        : "revoked";
      const { error } = await admin.from("integration_connections").update({
        status,
        revoked_at: now,
        updated_at: now,
      }).eq("id", connectionId).eq("organization_id", organizationId);
      if (error) throw error;
      await audit(
        admin,
        organizationId,
        user.id,
        connection.provider === "meta"
          ? "integration.meta.disconnected"
          : body.operation === "delete"
          ? "integration.connection.deleted"
          : "integration.connection.revoked",
        connectionId,
      );
      return json({ success: true });
    }

    if (body.operation === "test") {
      if (connection.provider === "meta") {
        const health = await checkMetaConnectionHealth(
          admin,
          connectionId,
          organizationId,
        );
        return json({ success: true, status: health.status, health });
      }
      if (connection.status !== "active") {
        return json({
          success: false,
          error: "Only active connections can be tested.",
        }, 409);
      }
      if (connection.provider === "google") {
        const { accessToken } = await getValidGoogleAccessToken(
          connectionId,
          organizationId,
        );
        const account = await googleAccount(accessToken);
        const now = new Date().toISOString();
        await admin.from("integration_connections").update({
          last_verified_at: now,
          account_label: account.email,
          updated_at: now,
        }).eq("id", connectionId).eq("organization_id", organizationId);
        await audit(
          admin,
          organizationId,
          user.id,
          "integration.google.tested",
          connectionId,
        );
        return json({
          success: true,
          status: "verified",
          accountLabel: account.email,
        });
      }
      await admin.from("integration_connections").update({
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", connectionId).eq("organization_id", organizationId);
      await audit(
        admin,
        organizationId,
        user.id,
        "integration.connection.tested",
        connectionId,
      );
      return json({ success: true, status: "metadata_verified" });
    }
    return json({ success: false, error: "Unsupported operation." }, 400);
  } catch (error) {
    const metaError = error instanceof MetaIntegrationError ? error : null;
    return json({
      success: false,
      code: metaError?.code,
      error: error instanceof Error
        ? error.message
        : "Unable to manage integration connections.",
    }, metaError?.status || 400);
  }
};

if (import.meta.main) Deno.serve(integrationConnectionsHandler);
