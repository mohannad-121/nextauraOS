import { adminClient } from "./billing.ts";
import {
  decryptIntegrationCredential,
  encryptIntegrationCredential,
  randomOAuthState,
  sha256,
} from "./google-oauth.ts";

// ---------------------------------------------------------------------------
// Scopes
// ---------------------------------------------------------------------------

export const INSTAGRAM_LOGIN_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
] as const;

export const INSTAGRAM_BASE_SCOPES = [
  "instagram_business_basic",
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InstagramAccountType = "BUSINESS" | "CREATOR" | "PERSONAL";

export type InstagramAccount = {
  id: string;
  username: string | null;
  name: string | null;
  account_type: InstagramAccountType;
  profile_picture_url: string | null;
};

export type InstagramDiscovery = {
  account: InstagramAccount;
  grantedScopes: string[];
};

export type InstagramCredential = {
  access_token: string;
  token_type: string;
  expires_at: number;
  ig_user_id: string;
  username: string | null;
};

export class InstagramIntegrationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "InstagramIntegrationError";
  }
}

// ---------------------------------------------------------------------------
// Client config
// ---------------------------------------------------------------------------

const requiredSecret = (name: string) => {
  const value = Deno.env.get(name) || "";
  if (!value) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_CONFIGURATION_REQUIRED",
      `${name} is not configured.`,
      503,
    );
  }
  return value;
};

export const instagramClient = () => ({
  appId: requiredSecret("INSTAGRAM_APP_ID"),
  appSecret: requiredSecret("INSTAGRAM_APP_SECRET"),
  redirectUri: requiredSecret("INSTAGRAM_OAUTH_REDIRECT_URI"),
});

// ---------------------------------------------------------------------------
// OAuth URL builder
// ---------------------------------------------------------------------------

export function buildInstagramAuthorizationUrl(
  state: string,
  reconnect = false,
): string {
  const client = instagramClient();
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", client.appId);
  url.searchParams.set("redirect_uri", client.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", [...INSTAGRAM_LOGIN_SCOPES].join(","));
  url.searchParams.set("state", state);
  if (reconnect) url.searchParams.set("auth_type", "rerequest");
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

export async function exchangeInstagramCode(
  code: string,
  requester: typeof fetch = fetch,
): Promise<{ accessToken: string; expiresAt: number }> {
  const client = instagramClient();

  // Step 1: Short-lived token
  const shortBody = new URLSearchParams({
    client_id: client.appId,
    client_secret: client.appSecret,
    grant_type: "authorization_code",
    redirect_uri: client.redirectUri,
    code,
  });
  const shortResponse = await requester(
    "https://api.instagram.com/oauth/access_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: shortBody,
    },
  );
  if (!shortResponse.ok) {
    const body = await shortResponse.json().catch(() => ({}));
    throw new InstagramIntegrationError(
      "INSTAGRAM_API_ERROR",
      `Instagram authorization failed: ${body?.error_message || shortResponse.status}`,
      502,
    );
  }
  const shortToken = await shortResponse.json();
  if (
    typeof shortToken.access_token !== "string" || !shortToken.access_token
  ) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_API_ERROR",
      "Instagram did not return a usable access token.",
      502,
    );
  }

  // Step 2: Exchange for long-lived token (60-day)
  const longUrl = new URL("https://graph.instagram.com/access_token");
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", client.appSecret);
  longUrl.searchParams.set("access_token", shortToken.access_token);
  const longResponse = await requester(longUrl, { method: "GET" });
  if (!longResponse.ok) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_API_ERROR",
      "Instagram long-lived token exchange failed.",
      502,
    );
  }
  const longToken = await longResponse.json();
  if (
    typeof longToken.access_token !== "string" || !longToken.access_token
  ) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_API_ERROR",
      "Instagram did not return a usable long-lived access token.",
      502,
    );
  }
  const expiresIn = Number(longToken.expires_in || 5184000); // 60 days default
  const expiresAt = Date.now() + expiresIn * 1000;
  return { accessToken: longToken.access_token, expiresAt };
}

// ---------------------------------------------------------------------------
// Account discovery
// ---------------------------------------------------------------------------

export async function discoverInstagramAccount(
  accessToken: string,
  requester: typeof fetch = fetch,
): Promise<InstagramDiscovery> {
  // Fetch account info
  const meUrl = new URL("https://graph.instagram.com/me");
  meUrl.searchParams.set(
    "fields",
    "id,username,name,account_type,profile_picture_url",
  );
  meUrl.searchParams.set("access_token", accessToken);
  const meResponse = await requester(meUrl, { method: "GET" });
  if (!meResponse.ok) {
    throw new InstagramIntegrationError(
      meResponse.status === 401
        ? "INSTAGRAM_TOKEN_EXPIRED"
        : "INSTAGRAM_API_ERROR",
      meResponse.status === 401
        ? "Instagram token expired. Reconnect to continue."
        : "Instagram account information could not be loaded.",
      502,
    );
  }
  const me = await meResponse.json();
  if (!/^\d+$/.test(String(me?.id || ""))) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_API_ERROR",
      "Instagram account identity is unavailable.",
      502,
    );
  }

  // Fetch granted permissions
  const permUrl = new URL(
    `https://graph.instagram.com/${me.id}/permissions`,
  );
  permUrl.searchParams.set("access_token", accessToken);
  const permResponse = await requester(permUrl, { method: "GET" });
  const permBody = permResponse.ok
    ? await permResponse.json().catch(() => ({ data: [] }))
    : { data: [] };
  const grantedScopes: string[] = (Array.isArray(permBody.data)
    ? permBody.data
    : []).flatMap((item: any) =>
      item?.status === "granted" && typeof item.permission === "string"
        ? [item.permission]
        : []
    );

  const safeStr = (v: unknown, max = 255): string | null => {
    if (typeof v !== "string" || !v.trim()) return null;
    return v.trim().slice(0, max);
  };

  return {
    account: {
      id: String(me.id),
      username: safeStr(me.username),
      name: safeStr(me.name),
      account_type: (me.account_type === "BUSINESS" ||
          me.account_type === "CREATOR")
        ? me.account_type
        : "PERSONAL",
      profile_picture_url: typeof me.profile_picture_url === "string" &&
          me.profile_picture_url.startsWith("https://")
        ? me.profile_picture_url
        : null,
    },
    grantedScopes: [...new Set(grantedScopes)].sort(),
  };
}

// ---------------------------------------------------------------------------
// Health assessment
// ---------------------------------------------------------------------------

export function assessInstagramHealth(grantedScopes: string[]): {
  status: "active" | "degraded";
  missingBaseScopes: string[];
  missingOptionalScopes: string[];
} {
  const missingBaseScopes = (INSTAGRAM_BASE_SCOPES as readonly string[]).filter(
    (s) => !grantedScopes.includes(s),
  );
  const missingOptionalScopes = (INSTAGRAM_LOGIN_SCOPES as readonly string[])
    .filter((s) =>
      !(INSTAGRAM_BASE_SCOPES as readonly string[]).includes(s) &&
      !grantedScopes.includes(s)
    );
  return {
    status: missingBaseScopes.length ? "degraded" : "active",
    missingBaseScopes,
    missingOptionalScopes,
  };
}

// ---------------------------------------------------------------------------
// Connection health check (DB-backed)
// ---------------------------------------------------------------------------

export async function checkInstagramConnectionHealth(
  admin: any,
  connectionId: string,
  organizationId: string,
): Promise<{
  status: "active" | "degraded" | "reconnect_required" | "disconnected";
  code: string;
  message: string;
  missingBaseScopes?: string[];
  missingOptionalScopes?: string[];
}> {
  const { data: connection } = await admin.from("integration_connections")
    .select("id,status,expires_at,provider")
    .eq("id", connectionId)
    .eq("organization_id", organizationId)
    .eq("provider", "instagram")
    .maybeSingle();

  if (!connection) {
    return {
      status: "disconnected",
      code: "INSTAGRAM_CONNECTION_NOT_FOUND",
      message: "Instagram connection not found.",
    };
  }

  const { data: credRow } = await admin.from(
    "integration_connection_credentials",
  ).select("ciphertext,iv").eq("connection_id", connectionId).maybeSingle();
  if (!credRow) {
    return {
      status: "reconnect_required",
      code: "INSTAGRAM_CREDENTIAL_MISSING",
      message: "Instagram credentials are missing. Reconnect to continue.",
    };
  }

  let credential: InstagramCredential;
  try {
    credential = await decryptIntegrationCredential(credRow);
  } catch {
    return {
      status: "reconnect_required",
      code: "INSTAGRAM_CREDENTIAL_INVALID",
      message: "Instagram credentials could not be decrypted. Reconnect to continue.",
    };
  }

  if (credential.expires_at && credential.expires_at <= Date.now() + 60_000) {
    const now = new Date().toISOString();
    await admin.from("integration_connections").update({
      status: "reconnect_required",
      updated_at: now,
    }).eq("id", connectionId).eq("organization_id", organizationId);
    return {
      status: "reconnect_required",
      code: "INSTAGRAM_TOKEN_EXPIRED",
      message: "Instagram token expired. Reconnect to continue.",
    };
  }

  let discovery: InstagramDiscovery;
  try {
    discovery = await discoverInstagramAccount(credential.access_token);
  } catch (error) {
    const isExpired = error instanceof InstagramIntegrationError &&
      error.code === "INSTAGRAM_TOKEN_EXPIRED";
    const now = new Date().toISOString();
    await admin.from("integration_connections").update({
      status: isExpired ? "reconnect_required" : "degraded",
      updated_at: now,
    }).eq("id", connectionId).eq("organization_id", organizationId);
    return {
      status: isExpired ? "reconnect_required" : "degraded",
      code: isExpired ? "INSTAGRAM_TOKEN_EXPIRED" : "INSTAGRAM_API_ERROR",
      message: error instanceof Error
        ? error.message
        : "Instagram health check failed.",
    };
  }

  const health = assessInstagramHealth(discovery.grantedScopes);
  const now = new Date().toISOString();
  await admin.from("integration_connections").update({
    status: health.status,
    scopes: discovery.grantedScopes,
    last_verified_at: now,
    updated_at: now,
    provider_metadata: {
      ig_user_id: discovery.account.id,
      username: discovery.account.username,
      display_name: discovery.account.name ||
        discovery.account.username || "Instagram account",
      account_type: discovery.account.account_type,
      health: {
        checked_at: now,
        missing_base_scopes: health.missingBaseScopes,
        missing_optional_scopes: health.missingOptionalScopes,
      },
    },
    updated_at: now,
  }).eq("id", connectionId).eq("organization_id", organizationId);

  return {
    status: health.status,
    code: health.status === "active"
      ? "INSTAGRAM_CONNECTED"
      : "INSTAGRAM_DEGRADED",
    message: health.status === "active"
      ? "Instagram connection is active."
      : `Instagram connection is degraded. Missing scopes: ${health.missingBaseScopes.join(", ")}`,
    missingBaseScopes: health.missingBaseScopes,
    missingOptionalScopes: health.missingOptionalScopes,
  };
}

// ---------------------------------------------------------------------------
// Token refresh (Instagram long-lived tokens can be refreshed before expiry)
// ---------------------------------------------------------------------------

export async function refreshInstagramToken(
  connectionId: string,
  organizationId: string,
  admin: any = adminClient(),
  requester: typeof fetch = fetch,
): Promise<{ expiresAt: number }> {
  const { data: credRow } = await admin.from(
    "integration_connection_credentials",
  ).select("ciphertext,iv").eq("connection_id", connectionId).maybeSingle();
  if (!credRow) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_CREDENTIAL_MISSING",
      "Instagram credentials are missing.",
      404,
    );
  }

  const credential: InstagramCredential = await decryptIntegrationCredential(
    credRow,
  );

  const refreshUrl = new URL(
    "https://graph.instagram.com/refresh_access_token",
  );
  refreshUrl.searchParams.set("grant_type", "ig_refresh_token");
  refreshUrl.searchParams.set("access_token", credential.access_token);
  const response = await requester(refreshUrl, { method: "GET" });
  if (!response.ok) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_REFRESH_FAILED",
      "Instagram token refresh failed. Reconnect to continue.",
      502,
    );
  }
  const refreshed = await response.json();
  if (
    typeof refreshed.access_token !== "string" || !refreshed.access_token
  ) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_REFRESH_FAILED",
      "Instagram did not return a refreshed access token.",
      502,
    );
  }
  const expiresIn = Number(refreshed.expires_in || 5184000);
  const expiresAt = Date.now() + expiresIn * 1000;
  const expiresAtIso = new Date(expiresAt).toISOString();

  const updatedCredential: InstagramCredential = {
    ...credential,
    access_token: refreshed.access_token,
    expires_at: expiresAt,
  };
  const encrypted = await encryptIntegrationCredential(updatedCredential);
  const now = new Date().toISOString();
  await admin.from("integration_connection_credentials").update({
    ...encrypted,
    updated_at: now,
  }).eq("connection_id", connectionId);
  await admin.from("integration_connections").update({
    expires_at: expiresAtIso,
    last_verified_at: now,
    status: "active",
    updated_at: now,
  }).eq("id", connectionId).eq("organization_id", organizationId);

  return { expiresAt };
}

// ---------------------------------------------------------------------------
// Disconnect
// ---------------------------------------------------------------------------

export async function disconnectInstagramConnection(
  admin: any,
  connectionId: string,
  organizationId: string,
  requester: typeof fetch = fetch,
): Promise<void> {
  const { data: credRow } = await admin.from(
    "integration_connection_credentials",
  ).select("ciphertext,iv").eq("connection_id", connectionId).maybeSingle();
  if (credRow) {
    try {
      const credential: InstagramCredential = await decryptIntegrationCredential(
        credRow,
      );
      // Revoke token via Instagram API
      const client = instagramClient();
      const revokeUrl = new URL(
        `https://graph.instagram.com/${credential.ig_user_id}/app`,
      );
      revokeUrl.searchParams.set("access_token", credential.access_token);
      await requester(revokeUrl, { method: "DELETE" });
    } catch {
      // Local disconnect remains authoritative even if remote revoke fails
    }
  }
}

// ---------------------------------------------------------------------------
// OAuth state helpers (re-export from google-oauth to keep callers clean)
// ---------------------------------------------------------------------------

export { randomOAuthState, sha256 };

// ---------------------------------------------------------------------------
// Private reply helper (stub — not wired to automation nodes yet)
// Private reply helper
// ---------------------------------------------------------------------------

export interface SendInstagramPrivateReplyParams {
  accountId: string;
  commentId: string;
  message: string;
  accessToken: string;
  apiVersion?: string;
  requester?: typeof fetch;
}

export interface SendInstagramPrivateReplyResult {
  message_id: string;
  recipient_id?: string;
}

/**
 * Send an Instagram private reply to a comment using the official Send API.
 * POST https://graph.instagram.com/{API_VERSION}/{IG_USER_ID}/messages
 * Authorization: Bearer <INSTAGRAM_ACCESS_TOKEN>
 *
 * @param params - Configuration including account ID, comment ID, message text, and access token
 */
export async function sendInstagramPrivateReply(
  params: SendInstagramPrivateReplyParams,
): Promise<SendInstagramPrivateReplyResult> {
  const {
    accountId,
    commentId,
    message,
    accessToken,
    apiVersion = Deno.env.get("INSTAGRAM_GRAPH_API_VERSION") ||
      Deno.env.get("META_GRAPH_API_VERSION") || "v26.0",
    requester = fetch,
  } = params;

  if (!accountId || !/^\d+$/.test(String(accountId).trim())) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_ACCOUNT_REQUIRED",
      "Instagram account ID is required and must be a numeric ID.",
      400,
    );
  }

  const cleanCommentId = typeof commentId === "string" ? commentId.trim() : "";
  if (!cleanCommentId || cleanCommentId.length > 256) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_COMMENT_ID_REQUIRED",
      "Instagram comment ID is required and must be valid.",
      400,
    );
  }

  const cleanMessage = typeof message === "string" ? message.trim() : "";
  if (!cleanMessage) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_MESSAGE_REQUIRED",
      "Instagram reply message is required.",
      400,
    );
  }

  if (cleanMessage.length > 1000) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_MESSAGE_REQUIRED",
      "Instagram reply message must be 1000 characters or fewer.",
      400,
    );
  }

  if (!accessToken || typeof accessToken !== "string" || !accessToken.trim()) {
    throw new InstagramIntegrationError(
      "INSTAGRAM_RECONNECT_REQUIRED",
      "Instagram access token is missing or expired. Reconnect to continue.",
      401,
    );
  }

  const cleanVersion = apiVersion.startsWith("v") ? apiVersion : `v${apiVersion}`;
  const url = new URL(`https://graph.instagram.com/${cleanVersion}/${accountId.trim()}/messages`);

  const response = await requester(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { comment_id: cleanCommentId },
      message: { text: cleanMessage },
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = body?.error;
    const rawMsg = String(error?.message || "");
    const lowerMsg = rawMsg.toLowerCase();
    const code = Number(error?.code);
    const subcode = Number(error?.error_subcode);

    if (response.status === 401 || code === 190) {
      throw new InstagramIntegrationError(
        "INSTAGRAM_RECONNECT_REQUIRED",
        "Instagram connection authorization expired. Please reconnect.",
        401,
      );
    }

    if (code === 200 || code === 298 || lowerMsg.includes("permission")) {
      throw new InstagramIntegrationError(
        "INSTAGRAM_PERMISSION_MISSING",
        "Additional Instagram permissions required: instagram_business_manage_messages and instagram_business_manage_comments.",
        403,
      );
    }

    if (
      subcode === 2018001 ||
      lowerMsg.includes("window") ||
      lowerMsg.includes("7 days") ||
      lowerMsg.includes("expired")
    ) {
      throw new InstagramIntegrationError(
        "INSTAGRAM_PRIVATE_REPLY_WINDOW_EXPIRED",
        "Instagram private reply window has expired for this comment.",
        400,
      );
    }

    if (
      lowerMsg.includes("already replied") ||
      lowerMsg.includes("already sent") ||
      lowerMsg.includes("only one private reply")
    ) {
      throw new InstagramIntegrationError(
        "INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT",
        "Instagram private reply already sent for this comment.",
        400,
      );
    }

    if (
      code === 100 &&
      (lowerMsg.includes("does not exist") ||
        lowerMsg.includes("not found") ||
        lowerMsg.includes("cannot find"))
    ) {
      throw new InstagramIntegrationError(
        "INSTAGRAM_COMMENT_NOT_FOUND",
        "Instagram comment was not found or has been deleted.",
        404,
      );
    }

    throw new InstagramIntegrationError(
      response.status === 401
        ? "INSTAGRAM_TOKEN_EXPIRED"
        : "INSTAGRAM_PRIVATE_REPLY_FAILED",
      rawMsg || body?.error?.message || "Instagram private reply failed.",
      response.status >= 500 ? 502 : response.status,
    );
  }

  const result = await response.json();
  return {
    message_id: String(result.message_id || result.id || ""),
    recipient_id: result.recipient_id ? String(result.recipient_id) : undefined,
  };
}

/**
 * Backward compatibility alias for replyToInstagramComment
 */
export async function replyToInstagramComment(
  igUserId: string,
  commentId: string,
  text: string,
  accessToken: string,
  requester: typeof fetch = fetch,
): Promise<{ message_id: string; recipient_id?: string }> {
  return sendInstagramPrivateReply({
    accountId: igUserId,
    commentId,
    message: text,
    accessToken,
    requester,
  });
}
