import {
  assessMetaDiscoveryHealth,
  buildMetaAuthorizationUrl,
  discoverMetaAccount,
  getMetaConnection,
  hmacSha256Hex,
  isMetaTokenExpired,
  mapMetaPermissionStatuses,
  META_DISCOVERY_SCOPES,
  FACEBOOK_PAGE_BASE_SCOPES,
  FACEBOOK_ACTION_SCOPES,
  DISALLOWED_FACEBOOK_SCOPES,
  ALLOWED_FACEBOOK_RECONNECT_SCOPES,
  MetaIntegrationError,
  normalizeMetaWebhookPayload,
  parseMetaPages,
  sanitizeMetaPayload,
  verifyMetaWebhookSignature,
} from "./meta-integration.ts";
import {
  decryptIntegrationCredential,
  encryptIntegrationCredential,
} from "./google-oauth.ts";
import { metaWebhookHandler } from "../meta-webhook/index.ts";

const assert = (condition: unknown, message = "Assertion failed") => {
  if (!condition) throw new Error(message);
};

const encryptionKey = btoa(
  String.fromCharCode(...new Uint8Array(32).fill(7)),
);
Deno.env.set("INTEGRATION_CREDENTIAL_ENCRYPTION_KEY", encryptionKey);
Deno.env.set("META_APP_ID", "123456789");
Deno.env.set("META_APP_SECRET", "test-app-secret");
Deno.env.set(
  "META_OAUTH_REDIRECT_URI",
  "https://example.supabase.co/functions/v1/meta-oauth-callback",
);
Deno.env.set("META_WEBHOOK_VERIFY_TOKEN", "test-verify-token");
Deno.env.set("META_GRAPH_API_VERSION", "v26.0");

Deno.test("Meta OAuth URL binds state and requests discovery scopes only", () => {
  const url = new URL(buildMetaAuthorizationUrl("opaque-state", true));
  assert(url.origin === "https://www.facebook.com");
  assert(url.pathname === "/v26.0/dialog/oauth");
  assert(url.searchParams.get("state") === "opaque-state");
  assert(url.searchParams.get("auth_type") === "rerequest");
  const scopes = new Set((url.searchParams.get("scope") || "").split(","));
  assert(META_DISCOVERY_SCOPES.every((scope) => scopes.has(scope)));
  assert(FACEBOOK_PAGE_BASE_SCOPES.every((scope) => scopes.has(scope)));
  assert(!scopes.has("pages_manage_posts"));
  assert(!scopes.has("instagram_manage_messages"));
  assert(!scopes.has("pages_read_user_content"));
});

Deno.test("Meta OAuth URL reconnect for Facebook reply requests only base scopes plus pages_manage_engagement", () => {
  const url = new URL(
    buildMetaAuthorizationUrl("opaque-state", true, ["pages_manage_engagement"]),
  );
  assert(url.searchParams.get("auth_type") === "rerequest");
  const scopeParam = url.searchParams.get("scope") || "";
  const scopes = scopeParam.split(",");

  // Exactly the allowed Facebook reconnect set: base + pages_manage_engagement
  assert(scopes.length === 4);
  assert(scopes.includes("public_profile"));
  assert(scopes.includes("pages_show_list"));
  assert(scopes.includes("pages_read_engagement"));
  assert(scopes.includes("pages_manage_engagement"));

  // Strictly must not include pages_read_user_content or other unneeded scopes
  assert(!scopes.includes("pages_read_user_content"));
  assert(!scopes.includes("instagram_basic"));
  assert(!scopes.includes("pages_manage_posts"));
});

Deno.test("Meta OAuth URL strictly rejects pages_read_user_content and other disallowed scopes", () => {
  const url = new URL(
    buildMetaAuthorizationUrl("opaque-state", true, [
      "pages_read_user_content",
      "instagram_basic",
      "pages_manage_posts",
      "unauthorized_scope_xyz",
    ]),
  );
  const scopeParam = url.searchParams.get("scope") || "";
  const scopes = scopeParam.split(",");

  // Only the base scopes remain, invalid scopes are filtered out
  assert(scopes.length === 3);
  assert(scopes.includes("public_profile"));
  assert(scopes.includes("pages_show_list"));
  assert(scopes.includes("pages_read_engagement"));
  assert(!scopes.includes("pages_read_user_content"));
  assert(!scopes.includes("instagram_basic"));
  assert(!scopes.includes("pages_manage_posts"));
  assert(!scopes.includes("unauthorized_scope_xyz"));
});

Deno.test("Meta scope constants enforce strict separation and exclusions", () => {
  assert(
    (FACEBOOK_PAGE_BASE_SCOPES as readonly string[]).includes("public_profile"),
  );
  assert(
    (FACEBOOK_ACTION_SCOPES as readonly string[]).includes("pages_manage_engagement"),
  );
  assert(
    (DISALLOWED_FACEBOOK_SCOPES as readonly string[]).includes("pages_read_user_content"),
  );
  assert(
    !(FACEBOOK_PAGE_BASE_SCOPES as readonly string[]).includes("pages_read_user_content"),
  );
  assert(
    !(FACEBOOK_ACTION_SCOPES as readonly string[]).includes("pages_read_user_content"),
  );
  assert(
    !(ALLOWED_FACEBOOK_RECONNECT_SCOPES as readonly string[]).includes("pages_read_user_content"),
  );
});

Deno.test("Meta credential encryption roundtrip never changes token material", async () => {
  const secret = {
    user_access_token: "user-secret-token",
    page_access_tokens: { "100": "page-secret-token" },
  };
  const encrypted = await encryptIntegrationCredential(secret);
  assert(!encrypted.ciphertext.includes("user-secret-token"));
  const decrypted = await decryptIntegrationCredential(encrypted);
  assert(decrypted.user_access_token === "user-secret-token");
  assert(decrypted.page_access_tokens["100"] === "page-secret-token");
});

Deno.test("Meta Page and linked professional Instagram discovery is bounded", () => {
  const parsed = parseMetaPages([
    {
      id: "100",
      name: "Page A",
      category: "Restaurant",
      access_token: "page-token-a",
      picture: { data: { url: "https://cdn.example.com/page.jpg" } },
      instagram_business_account: {
        id: "200",
        username: "business_a",
        name: "Business A",
        profile_picture_url: "https://cdn.example.com/ig.jpg",
      },
    },
    {
      id: "101",
      name: "Page without Instagram",
      access_token: "page-token-b",
    },
  ]);
  assert(parsed.pages.length === 2);
  assert(parsed.instagramAccounts.length === 1);
  assert(parsed.pages[1].connected_instagram_account_id === null);
  assert(parsed.instagramAccounts[0].page_id === "100");
  assert(
    JSON.stringify(parsed.instagramAccounts).includes("page-token") === false,
  );
});

Deno.test("Meta discovery parses granted permissions and revoked Pages", async () => {
  const requester = async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/me") && url.searchParams.has("fields")) {
      return Response.json({ id: "10", name: "Meta Owner" });
    }
    if (url.pathname.endsWith("/me/permissions")) {
      return Response.json({
        data: [
          { permission: "pages_show_list", status: "granted" },
          { permission: "pages_read_engagement", status: "declined" },
          { permission: "instagram_basic", status: "granted" },
        ],
      });
    }
    if (url.pathname.endsWith("/me/accounts")) {
      return Response.json({ data: [] });
    }
    return Response.json({}, { status: 404 });
  };
  const discovery = await discoverMetaAccount(
    "token",
    requester as typeof fetch,
  );
  assert(
    discovery.pages.length === 0,
    "Revoked/unavailable Pages must disappear",
  );
  assert(!discovery.grantedScopes.includes("pages_read_engagement"));
  const missing = discovery.permissionStatuses.find((permission) =>
    permission.name === "pages_read_engagement"
  );
  assert(missing?.status === "declined");
  assert(missing?.requires_app_review === true);
});

Deno.test("Meta permission model reports unavailable grants without faking production approval", () => {
  const permissions = mapMetaPermissionStatuses([]);
  assert(
    permissions.every((permission) => permission.status === "not_granted"),
  );
  assert(
    permissions.every((permission) => !permission.available_in_production),
  );
  assert(permissions.every((permission) => permission.requires_app_review));
});

Deno.test("Meta health distinguishes valid, expired, missing-permission, and revoked-resource states", () => {
  assert(!isMetaTokenExpired(Date.now() + 3_600_000));
  assert(isMetaTokenExpired(Date.now() - 1));

  const selected = new Set(["facebook_page:100"]);
  const healthy = assessMetaDiscoveryHealth(
    [...META_DISCOVERY_SCOPES],
    selected,
    new Set(["facebook_page:100"]),
  );
  assert(healthy.status === "active");

  const missing = assessMetaDiscoveryHealth(
    ["pages_show_list", "instagram_basic"],
    selected,
    new Set(["facebook_page:100"]),
  );
  assert(missing.status === "degraded");
  assert(missing.missingPermissions.includes("pages_read_engagement"));

  const revoked = assessMetaDiscoveryHealth(
    [...META_DISCOVERY_SCOPES],
    selected,
    new Set(),
  );
  assert(revoked.status === "degraded");
  assert(
    revoked.unavailableSelectedResources.includes("facebook_page:100"),
  );
});

type TableRows = Record<string, any[]>;
class FakeQuery {
  private filters: Array<[string, unknown]> = [];
  constructor(private rows: any[]) {}
  select() {
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push([key, value]);
    return this;
  }
  maybeSingle() {
    const data =
      this.rows.find((row) =>
        this.filters.every(([key, value]) => row[key] === value)
      ) || null;
    return Promise.resolve({ data, error: null });
  }
}
const fakeAdmin = (tables: TableRows) => ({
  from: (table: string) => new FakeQuery(tables[table] || []),
});

Deno.test("Meta server credential contract enforces tenant and selected resource", async () => {
  const encrypted = await encryptIntegrationCredential({
    user_access_token: "user-token",
    token_expires_at: Date.now() + 60_000_000,
    page_access_tokens: { "100": "page-token" },
  });
  const tables = {
    integration_connections: [{
      id: "connection-a",
      organization_id: "org-a",
      provider: "meta",
      status: "active",
      scopes: [...FACEBOOK_PAGE_BASE_SCOPES],
      expires_at: new Date(Date.now() + 60_000_000).toISOString(),
    }],
    integration_connection_credentials: [{
      connection_id: "connection-a",
      ...encrypted,
    }],
    integration_connection_resources: [{
      id: "resource-a",
      organization_id: "org-a",
      connection_id: "connection-a",
      resource_type: "facebook_page",
      external_resource_id: "100",
      selected: true,
      metadata: {},
    }],
  };
  const result = await getMetaConnection({
    organizationId: "org-a",
    connectionId: "connection-a",
    requiredScopes: ["pages_show_list"],
    requiredResourceType: "facebook_page",
    resourceId: "100",
    admin: fakeAdmin(tables),
  });
  assert(result.accessToken === "page-token");
  let tenantRejected = false;
  try {
    await getMetaConnection({
      organizationId: "org-b",
      connectionId: "connection-a",
      admin: fakeAdmin(tables),
    });
  } catch (error) {
    tenantRejected = error instanceof MetaIntegrationError &&
      error.code === "META_CONNECTION_REQUIRED";
  }
  assert(
    tenantRejected,
    "Cross-organization connection access was not rejected",
  );
});

Deno.test("Meta webhook verification and SHA-256 signatures are strict", async () => {
  const raw = JSON.stringify({ object: "page", entry: [] });
  const digest = await hmacSha256Hex("test-app-secret", raw);
  assert(await verifyMetaWebhookSignature(raw, `sha256=${digest}`));
  assert(!await verifyMetaWebhookSignature(raw, `sha256=${"0".repeat(64)}`));

  const challenge = await metaWebhookHandler(
    new Request(
      "https://example.com?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=12345",
    ),
  );
  assert(challenge.status === 200 && await challenge.text() === "12345");
  const invalidChallenge = await metaWebhookHandler(
    new Request(
      "https://example.com?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345",
    ),
  );
  assert(invalidChallenge.status === 403);
  const accepted = await metaWebhookHandler(
    new Request("https://example.com", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${digest}`,
      },
      body: raw,
    }),
  );
  assert(accepted.status === 200);
  const rejected = await metaWebhookHandler(
    new Request("https://example.com", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${"0".repeat(64)}`,
      },
      body: raw,
    }),
  );
  assert(rejected.status === 401);
});

Deno.test("Meta webhook normalization is deterministic, deduplicable, and redacted", async () => {
  const payload = {
    object: "instagram",
    entry: [{
      id: "200",
      time: 1_700_000_000,
      changes: [{
        field: "comments",
        value: { id: "event-1", text: "Hello", access_token: "secret" },
      }],
    }],
  };
  const first = await normalizeMetaWebhookPayload(payload);
  const second = await normalizeMetaWebhookPayload(payload);
  assert(first.length === 1);
  assert(first[0].externalEventId === second[0].externalEventId);
  assert(first[0].product === "instagram");
  assert(!JSON.stringify(first[0].payload).includes("access_token"));
  const sanitized = sanitizeMetaPayload({
    cookie: "secret",
    safe: "value",
  }) as any;
  assert(sanitized.cookie === undefined && sanitized.safe === "value");
});
