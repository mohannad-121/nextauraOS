import { adminClient } from "./billing.ts";
import {
  decryptIntegrationCredential,
  encryptIntegrationCredential,
  sha256,
} from "./google-oauth.ts";

const encoder = new TextEncoder();
const sensitiveKey =
  /^(access[_-]?token|authorization|cookie|client[_-]?secret|app[_-]?secret)$/i;

export const META_DISCOVERY_SCOPES = [
export const FACEBOOK_PAGE_BASE_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
] as const;

export const INSTAGRAM_BUSINESS_SCOPES = [
  "instagram_basic",
] as const;

export const META_PERMISSION_CATALOG = [
  {
    name: "pages_show_list",
    purpose: "Discover Facebook Pages managed by the connected account.",
    available_in_development: true,
    available_in_production: false,
    requires_app_review: true,
  },
  {
    name: "pages_read_engagement",
    purpose:
      "Read Page identity and linked professional Instagram account metadata.",
    available_in_development: true,
    available_in_production: false,
    requires_app_review: true,
  },
  {
    name: "instagram_basic",
    purpose: "Discover professional Instagram accounts linked to Pages.",
    available_in_development: true,
    available_in_production: false,
    requires_app_review: true,
  },
] as const;

// Future nodes must opt into the narrow capability they implement. These
// permissions are documented here but are intentionally not requested by the
// Phase 1 discovery OAuth flow above.
export const META_FUTURE_CAPABILITY_PERMISSIONS = {
  facebook_page_content: ["pages_manage_posts"],
  facebook_page_comments: ["pages_manage_engagement"],
  facebook_page_messages: ["pages_messaging"],
  facebook_page_insights: ["read_insights"],
  facebook_webhook_subscription: ["pages_manage_metadata"],
  instagram_content: ["instagram_content_publish"],
  instagram_comments: ["instagram_manage_comments"],
  instagram_messages: ["instagram_manage_messages"],
  instagram_insights: ["instagram_manage_insights"],
} as const;

export const META_RESOURCE_DESCRIPTORS = {
  facebook_page: {
    provider: "meta",
    label: "Facebook Page",
    value_field: "external_resource_id",
    display_field: "display_name",
  },
  instagram_account: {
    provider: "meta",
    label: "Instagram professional account",
    value_field: "external_resource_id",
    display_field: "display_name",
  },
} as const;

export type MetaResourceType = "facebook_page" | "instagram_account";

export type MetaPage = {
  page_id: string;
  name: string;
  category: string | null;
  picture_url: string | null;
  connected_instagram_account_id: string | null;
  access_token: string;
};

export type MetaInstagramAccount = {
  instagram_account_id: string;
  username: string | null;
  name: string | null;
  profile_picture_url: string | null;
  page_id: string;
};

export type MetaDiscovery = {
  account: { id: string; name: string };
  grantedScopes: string[];
  permissionStatuses: Array<{
    name: string;
    status: string;
    purpose: string;
    available_in_development: boolean;
    available_in_production: boolean;
    requires_app_review: boolean;
  }>;
  pages: MetaPage[];
  instagramAccounts: MetaInstagramAccount[];
};

export type MetaCredential = {
  user_access_token: string;
  meta_user_id: string;
  token_expires_at: number;
  graph_api_version: string;
  page_access_tokens: Record<string, string>;
};

export class MetaIntegrationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "MetaIntegrationError";
  }
}

const requiredSecret = (name: string) => {
  const value = Deno.env.get(name) || "";
  if (!value) {
    throw new MetaIntegrationError(
      "META_CONFIGURATION_REQUIRED",
      `${name} is not configured.`,
      503,
    );
  }
  return value;
};

export const metaGraphVersion = () => {
  const value = Deno.env.get("META_GRAPH_API_VERSION") || "v26.0";
  if (!/^v\d+\.0$/.test(value)) {
    throw new MetaIntegrationError(
      "META_CONFIGURATION_REQUIRED",
      "META_GRAPH_API_VERSION is invalid.",
      503,
    );
  }
  return value;
};

export const metaClient = () => ({
  appId: requiredSecret("META_APP_ID"),
  appSecret: requiredSecret("META_APP_SECRET"),
  redirectUri: requiredSecret("META_OAUTH_REDIRECT_URI"),
  graphVersion: metaGraphVersion(),
});

export function buildMetaAuthorizationUrl(
  state: string,
  reconnect = false,
) {
  const client = metaClient();
  const url = new URL(
    `https://www.facebook.com/${client.graphVersion}/dialog/oauth`,
  );
  url.searchParams.set("client_id", client.appId);
  url.searchParams.set("redirect_uri", client.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", META_DISCOVERY_SCOPES.join(","));
  url.searchParams.set("scope", FACEBOOK_PAGE_BASE_SCOPES.join(","));
  if (reconnect) url.searchParams.set("auth_type", "rerequest");
  return url.toString();
}

async function responseJson(response: Response, code: string, message: string) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new MetaIntegrationError(code, message, 502);
  return body;
}

export async function exchangeMetaCode(
  code: string,
  requester: typeof fetch = fetch,
) {
  const client = metaClient();
  const exchange = new URL(
    `https://graph.facebook.com/${client.graphVersion}/oauth/access_token`,
  );
  exchange.searchParams.set("client_id", client.appId);
  exchange.searchParams.set("client_secret", client.appSecret);
  exchange.searchParams.set("redirect_uri", client.redirectUri);
  exchange.searchParams.set("code", code);
  const shortToken = await responseJson(
    await requester(exchange, { method: "GET" }),
    "META_API_ERROR",
    "Meta authorization could not be completed.",
  );
  if (typeof shortToken.access_token !== "string" || !shortToken.access_token) {
    throw new MetaIntegrationError(
      "META_API_ERROR",
      "Meta did not return a usable access token.",
      502,
    );
  }

  const longExchange = new URL(
    `https://graph.facebook.com/${client.graphVersion}/oauth/access_token`,
  );
  longExchange.searchParams.set("grant_type", "fb_exchange_token");
  longExchange.searchParams.set("client_id", client.appId);
  longExchange.searchParams.set("client_secret", client.appSecret);
  longExchange.searchParams.set("fb_exchange_token", shortToken.access_token);
  const longToken = await responseJson(
    await requester(longExchange, { method: "GET" }),
    "META_API_ERROR",
    "Meta long-lived authorization could not be completed.",
  );
  if (typeof longToken.access_token !== "string" || !longToken.access_token) {
    throw new MetaIntegrationError(
      "META_API_ERROR",
      "Meta did not return a usable long-lived access token.",
      502,
    );
  }
  return {
    accessToken: longToken.access_token,
    expiresIn: Number(longToken.expires_in || shortToken.expires_in || 0),
  };
}

export async function inspectMetaToken(
  accessToken: string,
  requester: typeof fetch = fetch,
) {
  const client = metaClient();
  const url = graphUrl("debug_token");
  url.searchParams.set("input_token", accessToken);
  const body = await responseJson(
    await requester(url, {
      headers: {
        Authorization: `Bearer ${client.appId}|${client.appSecret}`,
      },
    }),
    "META_API_ERROR",
    "Meta authorization could not be inspected.",
  );
  if (body?.data?.is_valid !== true) {
    throw new MetaIntegrationError(
      "META_RECONNECT_REQUIRED",
      "Meta authorization is not valid. Reconnect Meta to continue.",
      409,
    );
  }
  const expiresAtSeconds = Number(body.data.expires_at || 0);
  return {
    expiresAt: Number.isFinite(expiresAtSeconds) && expiresAtSeconds > 0
      ? expiresAtSeconds * 1000
      : 0,
    dataAccessExpiresAt: Number(body.data.data_access_expires_at || 0) * 1000,
  };
}

const graphUrl = (path: string, fields?: string) => {
  const url = new URL(
    `https://graph.facebook.com/${metaGraphVersion()}/${
      path.replace(/^\//, "")
    }`,
  );
  if (fields) url.searchParams.set("fields", fields);
  return url;
};

async function graphGet(
  url: URL,
  accessToken: string,
  requester: typeof fetch,
) {
  const response = await requester(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return await responseJson(
    response,
    response.status === 401 ? "META_TOKEN_EXPIRED" : "META_API_ERROR",
    response.status === 401
      ? "Meta authorization expired. Reconnect Meta to continue."
      : "Meta account information could not be loaded.",
  );
}

async function pagedData(
  initialUrl: URL,
  accessToken: string,
  requester: typeof fetch,
) {
  const output: unknown[] = [];
  let next: URL | null = initialUrl;
  for (let page = 0; next && page < 5; page += 1) {
    const body = await graphGet(next, accessToken, requester);
    if (Array.isArray(body.data)) output.push(...body.data.slice(0, 100));
    const nextValue = body?.paging?.next;
    if (typeof nextValue !== "string" || !nextValue) break;
    const candidate = new URL(nextValue);
    if (
      candidate.protocol !== "https:" ||
      candidate.hostname !== "graph.facebook.com"
    ) {
      throw new MetaIntegrationError(
        "META_API_ERROR",
        "Meta returned an invalid pagination URL.",
        502,
      );
    }
    candidate.searchParams.delete("access_token");
    next = candidate;
  }
  return output;
}

const safeRemoteUrl = (value: unknown) => {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

export function parseMetaPages(rows: unknown[]) {
  const pages: MetaPage[] = [];
  const instagramAccounts: MetaInstagramAccount[] = [];
  const seenPages = new Set<string>();
  const seenInstagram = new Set<string>();
  for (const value of rows.slice(0, 500)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, any>;
    if (!/^\d+$/.test(String(row.id || "")) || typeof row.name !== "string") {
      continue;
    }
    if (typeof row.access_token !== "string" || !row.access_token) continue;
    const pageId = String(row.id);
    if (seenPages.has(pageId)) continue;
    seenPages.add(pageId);
    const instagram = row.instagram_business_account;
    const instagramId = instagram && /^\d+$/.test(String(instagram.id || ""))
      ? String(instagram.id)
      : null;
    pages.push({
      page_id: pageId,
      name: row.name.trim().slice(0, 255),
      category: typeof row.category === "string"
        ? row.category.trim().slice(0, 255) || null
        : null,
      picture_url: safeRemoteUrl(row.picture?.data?.url),
      connected_instagram_account_id: instagramId,
      access_token: row.access_token,
    });
    if (instagramId && !seenInstagram.has(instagramId)) {
      seenInstagram.add(instagramId);
      instagramAccounts.push({
        instagram_account_id: instagramId,
        username: typeof instagram.username === "string"
          ? instagram.username.trim().slice(0, 255) || null
          : null,
        name: typeof instagram.name === "string"
          ? instagram.name.trim().slice(0, 255) || null
          : null,
        profile_picture_url: safeRemoteUrl(instagram.profile_picture_url),
        page_id: pageId,
      });
    }
  }
  return { pages, instagramAccounts };
}

export function mapMetaPermissionStatuses(rows: unknown[]) {
  const statuses = new Map<string, string>();
  for (const value of rows) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    if (typeof row.permission === "string" && typeof row.status === "string") {
      statuses.set(row.permission, row.status);
    }
  }
  return META_PERMISSION_CATALOG.map((permission) => ({
    ...permission,
    status: statuses.get(permission.name) || "not_granted",
  }));
}

export async function discoverMetaAccount(
  accessToken: string,
  requester: typeof fetch = fetch,
): Promise<MetaDiscovery> {
  const accountBody = await graphGet(
    graphUrl("me", "id,name"),
    accessToken,
    requester,
  );
  if (
    !/^\d+$/.test(String(accountBody.id || "")) ||
    typeof accountBody.name !== "string" || !accountBody.name.trim()
  ) {
    throw new MetaIntegrationError(
      "META_API_ERROR",
      "Meta account identity is unavailable.",
      502,
    );
  }
  const permissionRows = await pagedData(
    graphUrl("me/permissions"),
    accessToken,
    requester,
  );
  const permissionStatuses = mapMetaPermissionStatuses(permissionRows);
  const grantedScopes = permissionRows.flatMap((value: any) =>
    value && value.status === "granted" && typeof value.permission === "string"
      ? [value.permission]
      : []
  );
  const pageRows = await pagedData(
    graphUrl(
      "me/accounts",
      "id,name,category,picture{url},access_token,instagram_business_account{id,username,name,profile_picture_url}",
    ),
    accessToken,
    requester,
  );
  const parsed = parseMetaPages(pageRows);
  return {
    account: {
      id: String(accountBody.id),
      name: accountBody.name.trim().slice(0, 255),
    },
    grantedScopes: [...new Set(grantedScopes)].sort(),
    permissionStatuses,
    ...parsed,
  };
}

export function metaProviderMetadata(
  discovery: MetaDiscovery,
  connectedAt = new Date().toISOString(),
) {
  return {
    meta_user_id: discovery.account.id,
    display_name: discovery.account.name,
    graph_api_version: metaGraphVersion(),
    connected_at: connectedAt,
    pages_count: discovery.pages.length,
    instagram_accounts_count: discovery.instagramAccounts.length,
    permission_statuses: discovery.permissionStatuses,
  };
}

export function metaCredential(
  accessToken: string,
  expiresAt: number,
  discovery: MetaDiscovery,
): MetaCredential {
  return {
    user_access_token: accessToken,
    meta_user_id: discovery.account.id,
    token_expires_at: expiresAt,
    graph_api_version: metaGraphVersion(),
    page_access_tokens: Object.fromEntries(
      discovery.pages.map((page) => [page.page_id, page.access_token]),
    ),
  };
}

export function metaResourceRows(
  organizationId: string,
  connectionId: string,
  discovery: MetaDiscovery,
  selectedKeys = new Set<string>(),
  preserveSelection = false,
) {
  const selected = (type: MetaResourceType, id: string) =>
    preserveSelection ? selectedKeys.has(`${type}:${id}`) : true;
  return [
    ...discovery.pages.map((page) => ({
      organization_id: organizationId,
      connection_id: connectionId,
      provider: "meta",
      resource_type: "facebook_page" as const,
      external_resource_id: page.page_id,
      display_name: page.name,
      selected: selected("facebook_page", page.page_id),
      metadata: {
        category: page.category,
        picture_url: page.picture_url,
        connected_instagram_account_id: page.connected_instagram_account_id,
      },
    })),
    ...discovery.instagramAccounts.map((account) => ({
      organization_id: organizationId,
      connection_id: connectionId,
      provider: "meta",
      resource_type: "instagram_account" as const,
      external_resource_id: account.instagram_account_id,
      display_name: account.username
        ? `@${account.username}`
        : account.name || "Instagram account",
      selected: selected("instagram_account", account.instagram_account_id),
      metadata: {
        username: account.username,
        name: account.name,
        profile_picture_url: account.profile_picture_url,
        page_id: account.page_id,
      },
    })),
  ];
}

export function isMetaTokenExpired(
  expiresAt: string | number | null | undefined,
  now = Date.now(),
) {
  const value = typeof expiresAt === "number"
    ? expiresAt
    : new Date(expiresAt || "").getTime();
  return !Number.isFinite(value) || value <= now + 60_000;
}

export function assessMetaDiscoveryHealth(
  grantedScopes: string[],
  selectedKeys: Iterable<string>,
  discoveredKeys: ReadonlySet<string>,
) {
  const missingPermissions = META_DISCOVERY_SCOPES.filter((scope) =>
  const missingPermissions = FACEBOOK_PAGE_BASE_SCOPES.filter((scope) =>
    !grantedScopes.includes(scope)
  );
  const unavailableSelectedResources = [...selectedKeys].filter((key) =>
    !discoveredKeys.has(key)
  );
  return {
    status: missingPermissions.length || unavailableSelectedResources.length
      ? "degraded" as const
      : "active" as const,
    missingPermissions,
    unavailableSelectedResources,
  };
}

export async function getMetaConnection({
  organizationId,
  connectionId,
  requiredScopes = [],
  requiredResourceType,
  resourceId,
  admin = adminClient(),
}: {
  organizationId: string;
  connectionId: string;
  requiredScopes?: string[];
  requiredResourceType?: MetaResourceType;
  resourceId?: string;
  admin?: any;
}) {
  const { data: connection, error } = await admin.from(
    "integration_connections",
  )
    .select("id,organization_id,provider,status,scopes,expires_at")
    .eq("id", connectionId).eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !connection || connection.provider !== "meta") {
    throw new MetaIntegrationError(
      "META_CONNECTION_REQUIRED",
      "A Meta connection is required.",
      404,
    );
  }
  if (!["active", "degraded"].includes(connection.status)) {
    throw new MetaIntegrationError(
      "META_RECONNECT_REQUIRED",
      "Reconnect Meta to continue.",
      409,
    );
  }
  if (isMetaTokenExpired(connection.expires_at)) {
    throw new MetaIntegrationError(
      "META_TOKEN_EXPIRED",
      "Meta authorization expired. Reconnect Meta to continue.",
      409,
    );
  }
  const scopes = Array.isArray(connection.scopes) ? connection.scopes : [];
  const missingScope = requiredScopes.find((scope) => !scopes.includes(scope));
  if (missingScope) {
    throw new MetaIntegrationError(
      "META_PERMISSION_MISSING",
      `Meta permission ${missingScope} is required.`,
      409,
    );
  }
  const { data: credentialRow } = await admin.from(
    "integration_connection_credentials",
  ).select("ciphertext,iv").eq("connection_id", connectionId).maybeSingle();
  if (!credentialRow) {
    throw new MetaIntegrationError(
      "META_RECONNECT_REQUIRED",
      "Meta credentials are unavailable. Reconnect Meta to continue.",
      409,
    );
  }
  const credential = await decryptIntegrationCredential(
    credentialRow,
  ) as MetaCredential;
  if (
    typeof credential.user_access_token !== "string" ||
    credential.token_expires_at <= Date.now() + 60_000
  ) {
    throw new MetaIntegrationError(
      "META_TOKEN_EXPIRED",
      "Meta authorization expired. Reconnect Meta to continue.",
      409,
    );
  }

  let resource: any = null;
  if (requiredResourceType || resourceId) {
    if (!requiredResourceType || !resourceId) {
      throw new MetaIntegrationError(
        "META_RESOURCE_NOT_AUTHORIZED",
        "A Meta resource type and ID are required.",
      );
    }
    const { data } = await admin.from("integration_connection_resources")
      .select("id,resource_type,external_resource_id,metadata,selected")
      .eq("organization_id", organizationId).eq("connection_id", connectionId)
      .eq("resource_type", requiredResourceType)
      .eq("external_resource_id", resourceId).eq("selected", true)
      .maybeSingle();
    if (!data) {
      const code = requiredResourceType === "facebook_page"
        ? "META_PAGE_NOT_FOUND"
        : "META_INSTAGRAM_ACCOUNT_NOT_FOUND";
      throw new MetaIntegrationError(
        code,
        "The selected Meta resource is unavailable or not authorized.",
        404,
      );
    }
    resource = data;
  }

  const pageId = requiredResourceType === "instagram_account"
    ? String(resource?.metadata?.page_id || "")
    : requiredResourceType === "facebook_page"
    ? resourceId || ""
    : "";
  const resourceAccessToken = pageId
    ? credential.page_access_tokens?.[pageId]
    : credential.user_access_token;
  if (!resourceAccessToken) {
    throw new MetaIntegrationError(
      "META_RECONNECT_REQUIRED",
      "Meta resource credentials are unavailable. Reconnect Meta to continue.",
      409,
    );
  }
  return { connection, resource, accessToken: resourceAccessToken, credential };
}

export async function checkMetaConnectionHealth(
  admin: any,
  connectionId: string,
  organizationId: string,
  requester: typeof fetch = fetch,
) {
  const { data: connection } = await admin.from("integration_connections")
    .select(
      "id,organization_id,provider,status,scopes,expires_at,provider_metadata",
    )
    .eq("id", connectionId).eq("organization_id", organizationId)
    .eq("provider", "meta").maybeSingle();
  if (!connection) {
    throw new MetaIntegrationError(
      "META_CONNECTION_REQUIRED",
      "A Meta connection is required.",
      404,
    );
  }
  const now = new Date().toISOString();
  if (
    connection.expires_at &&
    new Date(connection.expires_at).getTime() <= Date.now() + 60_000
  ) {
    await admin.from("integration_connections").update({
      status: "reconnect_required",
      updated_at: now,
    }).eq("id", connectionId).eq("organization_id", organizationId);
    return {
      status: "reconnect_required",
      code: "META_TOKEN_EXPIRED",
      message: "Meta authorization expired. Reconnect Meta to continue.",
    };
  }
  try {
    const { data: credentialRow } = await admin.from(
      "integration_connection_credentials",
    ).select("ciphertext,iv").eq("connection_id", connectionId).maybeSingle();
    if (!credentialRow) throw new Error("missing credential");
    const credential = await decryptIntegrationCredential(
      credentialRow,
    ) as MetaCredential;
    const discovery = await discoverMetaAccount(
      credential.user_access_token,
      requester,
    );
    const { data: selectedRows, error: resourceReadError } = await admin.from(
      "integration_connection_resources",
    ).select("id,resource_type,external_resource_id,selected")
      .eq("organization_id", organizationId).eq("connection_id", connectionId);
    if (resourceReadError) throw resourceReadError;
    const selectedKeys = new Set<string>(
      (selectedRows || []).filter((row: any) => row.selected).map((row: any) =>
        `${row.resource_type}:${row.external_resource_id}`
      ),
    );
    const discoveredRows = metaResourceRows(
      organizationId,
      connectionId,
      discovery,
      selectedKeys,
      true,
    );
    const discoveredKeys = new Set<string>(
      discoveredRows.map((row) =>
        `${row.resource_type}:${row.external_resource_id}`
      ),
    );
    const assessment = assessMetaDiscoveryHealth(
      discovery.grantedScopes,
      selectedKeys,
      discoveredKeys,
    );
    if (discoveredRows.length) {
      const { error: resourceUpsertError } = await admin.from(
        "integration_connection_resources",
      ).upsert(
        discoveredRows.map((row) => ({ ...row, updated_at: now })),
        {
          onConflict: "connection_id,resource_type,external_resource_id",
        },
      );
      if (resourceUpsertError) throw resourceUpsertError;
    }
    const staleResourceIds = (selectedRows || []).filter((row: any) =>
      !discoveredKeys.has(
        `${row.resource_type}:${row.external_resource_id}`,
      )
    ).map((row: any) => row.id);
    if (staleResourceIds.length) {
      const { error: staleResourceError } = await admin.from(
        "integration_connection_resources",
      ).delete().eq("organization_id", organizationId)
        .eq("connection_id", connectionId).in("id", staleResourceIds);
      if (staleResourceError) throw staleResourceError;
    }
    const status = assessment.status;
    const metadata = {
      ...connection.provider_metadata,
      ...metaProviderMetadata(
        discovery,
        connection.provider_metadata?.connected_at || now,
      ),
      health: {
        checked_at: now,
        missing_permissions: assessment.missingPermissions,
        unavailable_selected_resources: assessment.unavailableSelectedResources,
      },
    };
    await admin.from("integration_connections").update({
      status,
      scopes: discovery.grantedScopes,
      account_label: discovery.account.name,
      provider_metadata: metadata,
      last_verified_at: now,
      updated_at: now,
    }).eq("id", connectionId).eq("organization_id", organizationId);
    return {
      status,
      code: assessment.missingPermissions.length
        ? "META_PERMISSION_MISSING"
        : null,
      message: status === "active"
        ? "Meta connection is healthy."
        : "Meta is connected with missing permissions or unavailable selected resources.",
      missingPermissions: assessment.missingPermissions,
      unavailableSelectedResources: assessment.unavailableSelectedResources,
      pagesCount: discovery.pages.length,
      instagramAccountsCount: discovery.instagramAccounts.length,
    };
  } catch (error) {
    const metaError = error instanceof MetaIntegrationError ? error : null;
    await admin.from("integration_connections").update({
      status: "reconnect_required",
      updated_at: now,
    }).eq("id", connectionId).eq("organization_id", organizationId);
    return {
      status: "reconnect_required",
      code: metaError?.code || "META_RECONNECT_REQUIRED",
      message:
        "Meta authorization is no longer valid. Reconnect Meta to continue.",
    };
  }
}

export async function disconnectMetaConnection(
  admin: any,
  connectionId: string,
  organizationId: string,
  requester: typeof fetch = fetch,
) {
  const { data: row } = await admin.from("integration_connection_credentials")
    .select("ciphertext,iv").eq("connection_id", connectionId).maybeSingle();
  if (row) {
    try {
      const credential = await decryptIntegrationCredential(
        row,
      ) as MetaCredential;
      const url = graphUrl(`${credential.meta_user_id}/permissions`);
      await requester(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${credential.user_access_token}` },
      });
    } catch {
      // Local credential deletion is authoritative even if Meta is unreachable.
    }
  }
  const { error: credentialDeleteError } = await admin.from(
    "integration_connection_credentials",
  ).delete().eq(
    "connection_id",
    connectionId,
  );
  if (credentialDeleteError) throw credentialDeleteError;
  const { error: resourceUpdateError } = await admin.from(
    "integration_connection_resources",
  ).update({
    selected: false,
    updated_at: new Date().toISOString(),
  }).eq("connection_id", connectionId).eq("organization_id", organizationId);
  if (resourceUpdateError) throw resourceUpdateError;
}

const toHex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

export async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
    ),
  );
}

export function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyMetaWebhookSignature(
  rawBody: string,
  signature: string,
  appSecret = requiredSecret("META_APP_SECRET"),
) {
  const match = /^sha256=([a-f0-9]{64})$/i.exec(signature.trim());
  if (!match) return false;
  const expected = await hmacSha256Hex(appSecret, rawBody);
  return timingSafeEqual(expected, match[1].toLowerCase());
}

export function sanitizeMetaPayload(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (typeof value === "string") return value.slice(0, 4000);
  if (
    typeof value === "number" || typeof value === "boolean" || value === null
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) =>
      sanitizeMetaPayload(item, depth + 1)
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).slice(0, 100)
        .filter(([key]) => !sensitiveKey.test(key))
        .map(([key, child]) => [
          key.slice(0, 120),
          sanitizeMetaPayload(child, depth + 1),
        ]),
    );
  }
  return null;
}

const firstExternalEventId = (value: any) =>
  value?.message?.mid || value?.post_id || value?.comment_id || value?.id ||
  value?.value?.id || null;

export async function normalizeMetaWebhookPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new MetaIntegrationError(
      "META_API_ERROR",
      "Meta webhook payload is invalid.",
    );
  }
  const root = payload as Record<string, any>;
  const product = root.object === "instagram"
    ? "instagram"
    : root.object === "page"
    ? "facebook"
    : null;
  if (!product || !Array.isArray(root.entry) || root.entry.length > 100) {
    throw new MetaIntegrationError(
      "META_API_ERROR",
      "Meta webhook payload is unsupported.",
    );
  }
  const events: Array<{
    product: "facebook" | "instagram";
    eventType: string;
    externalEventId: string;
    resourceId: string;
    occurredAt: string;
    payload: Record<string, unknown>;
  }> = [];
  for (let entryIndex = 0; entryIndex < root.entry.length; entryIndex += 1) {
    const entry = root.entry[entryIndex];
    if (!entry || !/^\d+$/.test(String(entry.id || ""))) continue;
    const candidates = [
      ...(Array.isArray(entry.changes)
        ? entry.changes.map((change: any) => ({
          type: `change.${String(change?.field || "unknown").slice(0, 100)}`,
          value: change,
        }))
        : []),
      ...(Array.isArray(entry.messaging)
        ? entry.messaging.map((message: any) => ({
          type: "messaging",
          value: message,
        }))
        : []),
    ].slice(0, 100);
    for (let eventIndex = 0; eventIndex < candidates.length; eventIndex += 1) {
      const candidate = candidates[eventIndex];
      const suppliedId = firstExternalEventId(candidate.value);
      const externalEventId = await sha256(
        JSON.stringify({
          object: root.object,
          entryId: entry.id,
          entryTime: entry.time,
          entryIndex,
          eventIndex,
          type: candidate.type,
          suppliedId,
          value: suppliedId ? undefined : candidate.value,
        }),
      );
      const safePayload = sanitizeMetaPayload({
        entry_id: String(entry.id),
        entry_time: entry.time ?? null,
        event: candidate.value,
      }) as Record<string, unknown>;
      events.push({
        product,
        eventType: candidate.type,
        externalEventId,
        resourceId: String(entry.id),
        occurredAt: Number.isFinite(Number(entry.time))
          ? new Date(Number(entry.time) * 1000).toISOString()
          : new Date().toISOString(),
        payload: safePayload,
      });
    }
  }
  return events;
}

export { encryptIntegrationCredential };
