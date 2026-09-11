import { adminClient, requireBillingAdmin } from "../_shared/billing.ts";
import { canonicalAppUrl } from "../_shared/canonical-app-origin.ts";
import { getOrganizationEntitlements } from "../_shared/entitlements.ts";
import { encryptIntegrationCredential } from "../_shared/google-oauth.ts";
import {
  assessInstagramHealth,
  discoverInstagramAccount,
  exchangeInstagramCode,
  InstagramIntegrationError,
  randomOAuthState,
  sha256,
} from "../_shared/instagram-integration.ts";

const redirect = (result: "connected" | "error") => {
  const url = new URL(canonicalAppUrl("/"));
  url.searchParams.set("instagram", result);
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
      provider: "instagram",
      ...details,
    }),
  });
}

export const instagramOAuthCallbackHandler = async (request: Request) => {
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

    // Consume OAuth state — replay protection via consumed_at
    const { data: oauthState, error: stateError } = await admin.from(
      "integration_oauth_states",
    ).update({ consumed_at: now })
      .eq("state_hash", await sha256(state))
      .eq("provider", "instagram")
      .is("consumed_at", null)
      .gt("expires_at", now)
      .select("organization_id,user_id,connection_id,redirect_path")
      .maybeSingle();

    if (stateError || !oauthState) {
      return Response.redirect(redirect("error"), 303);
    }

    // Authorization checks
    await requireBillingAdmin(admin, oauthState.user_id, oauthState.organization_id);
    const entitlements = await getOrganizationEntitlements(admin, oauthState.organization_id);
    if (!entitlements.access_active || !entitlements.automation_access) {
      return Response.redirect(redirect("error"), 303);
    }

    // Exchange code for long-lived token
    const { accessToken, expiresAt } = await exchangeInstagramCode(code);

    // Discover Instagram account
    const discovery = await discoverInstagramAccount(accessToken);

    // Reject personal (non-professional) accounts
    if (
      discovery.account.account_type !== "BUSINESS" &&
      discovery.account.account_type !== "CREATOR"
    ) {
      // Not a professional account — cannot be used for automation
      return Response.redirect(redirect("error"), 303);
    }

    const expiresAtIso = new Date(expiresAt).toISOString();
    const health = assessInstagramHealth(discovery.grantedScopes);
    const status = health.status;
    const displayName = discovery.account.name ||
      (discovery.account.username ? `@${discovery.account.username}` : "Instagram account");

    let connectionId = "";
    let existingName: string | null = null;

    if (oauthState.connection_id) {
      // Reconnect path
      const { data: existing } = await admin.from("integration_connections")
        .select("id,name")
        .eq("id", oauthState.connection_id)
        .eq("organization_id", oauthState.organization_id)
        .eq("provider", "instagram")
        .maybeSingle();
      if (!existing) {
        throw new InstagramIntegrationError(
          "INSTAGRAM_CONNECTION_NOT_FOUND",
          "Instagram connection not found.",
          404,
        );
      }
      connectionId = existing.id;
      existingName = existing.name;
      // Mark as error temporarily until credential upsert succeeds
      await admin.from("integration_connections").update({
        status: "error",
        updated_at: now,
      }).eq("id", connectionId).eq("organization_id", oauthState.organization_id);
    } else {
      // New connection
      const { data: connection, error } = await admin.from(
        "integration_connections",
      ).insert({
        organization_id: oauthState.organization_id,
        provider: "instagram",
        name: displayName,
        status: "error",
        auth_type: "oauth",
        scopes: [],
        account_label: discovery.account.username
          ? `@${discovery.account.username}`
          : displayName,
        provider_metadata: {},
        created_by: oauthState.user_id,
      }).select("id").single();
      if (error || !connection) {
        throw error || new Error("Unable to save Instagram connection.");
      }
      connectionId = connection.id;
    }

    // Encrypt and store credential
    const credential = {
      access_token: accessToken,
      token_type: "bearer",
      expires_at: expiresAt,
      ig_user_id: discovery.account.id,
      username: discovery.account.username,
    };
    const encrypted = await encryptIntegrationCredential(credential);
    const { error: credentialError } = await admin.from(
      "integration_connection_credentials",
    ).upsert({ connection_id: connectionId, ...encrypted, updated_at: now });
    if (credentialError) throw credentialError;

    // Upsert resource row (the Instagram account itself is the resource)
    await admin.from("integration_connection_resources").delete()
      .eq("organization_id", oauthState.organization_id)
      .eq("connection_id", connectionId);

    const { error: resourceError } = await admin.from("integration_connection_resources").insert({
      organization_id: oauthState.organization_id,
      connection_id: connectionId,
      provider: "instagram",
      resource_type: "instagram_professional_account",
      external_resource_id: discovery.account.id,
      display_name: discovery.account.username
        ? `@${discovery.account.username}`
        : displayName,
      selected: true,
      metadata: {
        username: discovery.account.username,
        name: discovery.account.name,
        account_type: discovery.account.account_type,
        profile_picture_url: discovery.account.profile_picture_url,
      },
    });
    if (resourceError) throw resourceError;

    // Update connection to final state
    const providerMetadata = {
      ig_user_id: discovery.account.id,
      username: discovery.account.username,
      display_name: displayName,
      account_type: discovery.account.account_type,
      connected_at: now,
      health: {
        checked_at: now,
        missing_base_scopes: health.missingBaseScopes,
        missing_optional_scopes: health.missingOptionalScopes,
      },
    };

    const { error: connectionError } = await admin.from(
      "integration_connections",
    ).update({
      name: existingName || displayName,
      status,
      auth_type: "oauth",
      scopes: discovery.grantedScopes,
      account_label: discovery.account.username
        ? `@${discovery.account.username}`
        : displayName,
      expires_at: expiresAtIso,
      last_verified_at: now,
      revoked_at: null,
      provider_metadata: providerMetadata,
      updated_at: now,
    }).eq("id", connectionId).eq("organization_id", oauthState.organization_id);
    if (connectionError) throw connectionError;

    await audit(
      admin,
      oauthState.organization_id,
      oauthState.user_id,
      oauthState.connection_id
        ? "integration.instagram.reconnected"
        : "integration.instagram.connected",
      connectionId,
      {
        ig_user_id: discovery.account.id,
        username: discovery.account.username,
        account_type: discovery.account.account_type,
        missing_scope_count: health.missingBaseScopes.length,
      },
    );

    return Response.redirect(redirect("connected"), 303);
  } catch {
    try {
      return Response.redirect(redirect("error"), 303);
    } catch {
      return new Response("Instagram OAuth callback could not be completed.", {
        status: 400,
      });
    }
  }
};

if (import.meta.main) Deno.serve(instagramOAuthCallbackHandler);
