import { adminClient, requireBillingAdmin } from "../_shared/billing.ts";
import { canonicalAppUrl } from "../_shared/canonical-app-origin.ts";
import { getOrganizationEntitlements } from "../_shared/entitlements.ts";
import {
  encryptIntegrationCredential,
  sha256,
} from "../_shared/google-oauth.ts";
import {
  discoverMetaAccount,
  exchangeMetaCode,
  inspectMetaToken,
  META_DISCOVERY_SCOPES,
  FACEBOOK_PAGE_BASE_SCOPES,
  metaCredential,
  metaProviderMetadata,
  metaResourceRows,
} from "../_shared/meta-integration.ts";

const redirect = (result: "connected" | "error") => {
  const url = new URL(canonicalAppUrl("/"));
  url.searchParams.set("meta", result);
  return url.toString();
};

async function audit(
  admin: any,
  organizationId: string,
  userId: string,
  action: string,
  connectionId: string,
  details: Record<string, unknown> = {},
) {
  await admin.from("audit_logs").insert({
    organization_id: organizationId,
    user_name: userId,
    action,
    details: JSON.stringify({
      connection_id: connectionId,
      provider: "meta",
      ...details,
    }),
  });
}

export const metaOAuthCallbackHandler = async (request: Request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state") || "";
    const code = url.searchParams.get("code") || "";
    if (!state || !code || state.length > 512 || code.length > 4096) {
      return Response.redirect(redirect("error"), 303);
    }
    const admin = adminClient();
    const now = new Date().toISOString();
    const { data: oauthState, error: stateError } = await admin.from(
      "integration_oauth_states",
    ).update({ consumed_at: now }).eq("state_hash", await sha256(state))
      .eq("provider", "meta").is("consumed_at", null).gt("expires_at", now)
      .select("organization_id,user_id,connection_id,redirect_path")
      .maybeSingle();
    if (stateError || !oauthState) {
      return Response.redirect(redirect("error"), 303);
    }

    await requireBillingAdmin(
      admin,
      oauthState.user_id,
      oauthState.organization_id,
    );
    const entitlements = await getOrganizationEntitlements(
      admin,
      oauthState.organization_id,
    );
    if (!entitlements.access_active || !entitlements.automation_access) {
      throw new Error("Meta connections require an active Custom workspace.");
    }

    const token = await exchangeMetaCode(code);
    const [inspection, discovery] = await Promise.all([
      inspectMetaToken(token.accessToken),
      discoverMetaAccount(token.accessToken),
    ]);
    const expiresAtMs = inspection.expiresAt ||
      (token.expiresIn > 0 ? Date.now() + token.expiresIn * 1000 : 0);
    if (!expiresAtMs || expiresAtMs <= Date.now() + 60_000) {
      throw new Error("Meta did not return a valid token expiration.");
    }
    const effectiveExpiresAt = inspection.dataAccessExpiresAt > 0
      ? Math.min(expiresAtMs, inspection.dataAccessExpiresAt)
      : expiresAtMs;
    const expiresAt = new Date(effectiveExpiresAt).toISOString();
    const missingPermissions = FACEBOOK_PAGE_BASE_SCOPES.filter((scope) =>
      !discovery.grantedScopes.includes(scope)
    );
    const status = missingPermissions.length ? "degraded" : "active";

    let connectionId = "";
    let previousSelected = new Set<string>();
    let existingName: string | null = null;
    if (oauthState.connection_id) {
      const { data: existing } = await admin.from("integration_connections")
        .select("id,name").eq("id", oauthState.connection_id)
        .eq("organization_id", oauthState.organization_id)
        .eq("provider", "meta").maybeSingle();
      if (!existing) throw new Error("Meta connection not found.");
      connectionId = existing.id;
      existingName = existing.name;
      const { data: selected } = await admin.from(
        "integration_connection_resources",
      ).select("resource_type,external_resource_id").eq(
        "organization_id",
        oauthState.organization_id,
      ).eq("connection_id", connectionId).eq("selected", true);
      previousSelected = new Set(
        (selected || []).map((row: any) =>
          `${row.resource_type}:${row.external_resource_id}`
        ),
      );
      const { error } = await admin.from("integration_connections").update({
        status: "error",
        updated_at: now,
      }).eq("id", connectionId).eq(
        "organization_id",
        oauthState.organization_id,
      );
      if (error) throw error;
    } else {
      const { data: connection, error } = await admin.from(
        "integration_connections",
      ).insert({
        organization_id: oauthState.organization_id,
        provider: "meta",
        name: discovery.account.name,
        status: "error",
        auth_type: "oauth",
        scopes: [],
        account_label: discovery.account.name,
        provider_metadata: {},
        created_by: oauthState.user_id,
      }).select("id").single();
      if (error || !connection) {
        throw error || new Error("Unable to save Meta connection.");
      }
      connectionId = connection.id;
    }

    const encrypted = await encryptIntegrationCredential(
      metaCredential(token.accessToken, effectiveExpiresAt, discovery),
    );
    const { error: credentialError } = await admin.from(
      "integration_connection_credentials",
    ).upsert({ connection_id: connectionId, ...encrypted, updated_at: now });
    if (credentialError) throw credentialError;

    const { error: deleteError } = await admin.from(
      "integration_connection_resources",
    ).delete().eq("organization_id", oauthState.organization_id)
      .eq("connection_id", connectionId);
    if (deleteError) throw deleteError;
    const resources = metaResourceRows(
      oauthState.organization_id,
      connectionId,
      discovery,
      previousSelected,
      Boolean(oauthState.connection_id),
    );
    if (resources.length) {
      const { error: resourceError } = await admin.from(
        "integration_connection_resources",
      ).insert(resources);
      if (resourceError) throw resourceError;
    }

    const metadata = {
      ...metaProviderMetadata(discovery, now),
      health: {
        checked_at: now,
        missing_permissions: missingPermissions,
        unavailable_selected_resources: [],
      },
    };
    const { error: connectionError } = await admin.from(
      "integration_connections",
    ).update({
      name: existingName || discovery.account.name,
      status,
      auth_type: "oauth",
      scopes: discovery.grantedScopes,
      account_label: discovery.account.name,
      expires_at: expiresAt,
      last_verified_at: now,
      revoked_at: null,
      provider_metadata: metadata,
      updated_at: now,
    }).eq("id", connectionId).eq("organization_id", oauthState.organization_id);
    if (connectionError) throw connectionError;

    await audit(
      admin,
      oauthState.organization_id,
      oauthState.user_id,
      oauthState.connection_id
        ? "integration.meta.reconnected"
        : "integration.meta.connected",
      connectionId,
      {
        page_count: discovery.pages.length,
        instagram_account_count: discovery.instagramAccounts.length,
        missing_permission_count: missingPermissions.length,
      },
    );
    return Response.redirect(redirect("connected"), 303);
  } catch {
    try {
      return Response.redirect(redirect("error"), 303);
    } catch {
      return new Response("Meta OAuth callback could not be completed.", {
        status: 400,
      });
    }
  }
};

if (import.meta.main) Deno.serve(metaOAuthCallbackHandler);
