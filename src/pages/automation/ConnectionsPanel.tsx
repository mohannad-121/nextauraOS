import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  entitlementService,
  type PlanEntitlements,
} from "../../services/entitlementService";
import {
  type IntegrationConnection,
  integrationConnectionService,
} from "../../services/integrationConnectionService";
import { MetaConnectionDialog } from "./MetaConnectionDialog";
import { metaConnectionPresentation } from "./metaConnectionPresentation";

const providerLabel: Record<IntegrationConnection["provider"], string> = {
  generic_api: "Generic API",
  google: "Google",
  github: "GitHub",
  slack: "Slack",
  meta: "Meta",
  instagram: "Instagram",
};
const statusStyle: Record<IntegrationConnection["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  degraded: "bg-amber-50 text-amber-700",
  reconnect_required: "bg-amber-50 text-amber-700",
  disconnected: "bg-slate-100 text-slate-600",
  expired: "bg-amber-50 text-amber-700",
  revoked: "bg-slate-100 text-slate-600",
  error: "bg-rose-50 text-rose-700",
};
const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

function MetaMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 15.5C4.4 5.2 8.1 1.4 12.1 1.4c5.9 0 8.1 17.2 12.6 17.2 2.5 0 4.3-2.8 5.3-6.1"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M2 15.5c1.9 3.1 4.1 3.1 6.2.2C11.1 11.7 14.5 1.4 19.4 1.4c4.3 0 7.8 5.9 10.6 11.1"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GithubMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.57 9.57 0 0 1 12 6.83c.85 0 1.71.11 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function InstagramMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function ConnectionsPanel() {
  const { currentOrg, navigate } = useApp();
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addChoice, setAddChoice] = useState<"menu" | "generic">("menu");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [managedMeta, setManagedMeta] = useState<IntegrationConnection | null>(
    null,
  );
  const canManage = ["Owner", "Admin", "Administrator"].includes(
    currentOrg.membershipRole || "",
  );
  const allowed = Boolean(
    entitlements?.access_active && entitlements.automation_access,
  );

  const load = async () => {
    const organizationId = currentOrg.id;
    setLoading(true);
    setError("");
    setConnections([]);
    try {
      const [items, plan] = await Promise.all([
        integrationConnectionService.list(organizationId),
        entitlementService.getPlanEntitlements(organizationId),
      ]);
      if (currentOrg.id === organizationId) {
        setConnections(items);
        setEntitlements(plan);
      }
    } catch (reason) {
      if (currentOrg.id === organizationId) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load connections.",
        );
      }
    } finally {
      if (currentOrg.id === organizationId) setLoading(false);
    }
  };

  useEffect(() => {
    setManagedMeta(null);
    void load();
  }, [currentOrg.id]);

  const mutate = async (
    operation: () => Promise<unknown>,
    success?: string,
  ) => {
    try {
      setBusy(true);
      setError("");
      await operation();
      if (success) setError(success);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to update connection.",
      );
    } finally {
      setBusy(false);
    }
  };
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    await mutate(async () => {
      await integrationConnectionService.createGenericApi(
        currentOrg.id,
        name,
        baseUrl,
        secret,
      );
      setName("");
      setBaseUrl("");
      setSecret("");
      setFormOpen(false);
    }, "Connection saved. Its secret is not stored in the browser.");
  };
  const connectGoogle = async (connectionId?: string) => {
    try {
      setBusy(true);
      const result = await integrationConnectionService.startGoogleOAuth(
        currentOrg.id,
        connectionId,
      );
      window.location.assign(result.authorizationUrl);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to start Google connection.",
      );
      setBusy(false);
    }
  };
  const connectGithub = async (connectionId?: string) => {
    try {
      setBusy(true);
      const result = await integrationConnectionService.startGithubOAuth(
        currentOrg.id,
        connectionId,
      );
      window.location.assign(result.authorizationUrl);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to start GitHub connection.",
      );
      setBusy(false);
    }
  };
  const connectMeta = async (connectionId?: string) => {
    try {
      setBusy(true);
      const result = await integrationConnectionService.startMetaOAuth(
        currentOrg.id,
        connectionId,
      );
      window.location.assign(result.authorizationUrl);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to start Meta connection.",
      );
      setBusy(false);
    }
  };
  const connectInstagram = async (connectionId?: string) => {
    try {
      setBusy(true);
      const result = await integrationConnectionService.startInstagramOAuth(
        currentOrg.id,
        connectionId,
      );
      window.location.assign(result.authorizationUrl);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to start Instagram connection.",
      );
      setBusy(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbacks = ["github", "google", "meta", "instagram"] as const;
    const provider = callbacks.find((key) => params.has(key));
    if (!provider) return;
    const result = params.get(provider);
    params.delete(provider);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${
        params.size ? `?${params}` : ""
      }${window.location.hash}`,
    );
    const label = providerLabel[provider];
    setError(
      result === "connected"
        ? `${label} connected successfully.`
        : `${label} connection could not be completed. Try again.`,
    );
    if (result === "connected") void load();
  }, []);

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading connections…
        </div>
      </section>
    );
  }
  if (!allowed) {
    return (
      <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-start gap-3">
          <CircleAlert
            className="mt-0.5 h-5 w-5 text-blue-700"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-semibold text-slate-900">
              Connections are available on Custom
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Upgrade to securely connect external services to automation
              workflows.
            </p>
            <button
              onClick={() => navigate("pricing")}
              className="mt-4 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
            >
              View Custom plan
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Connections</h2>
          <p className="text-sm text-slate-500">
            Organization-scoped credentials for integration nodes.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setAddChoice("menu");
              setFormOpen(true);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />Add connection
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            error.includes("saved") || error.includes("successful") ||
              error.includes("disconnected")
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {error}
        </p>
      )}

      {formOpen && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Add connection</h3>
              <p className="text-xs text-slate-500">
                Credentials stay encrypted on the server.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label="Close"
              className="rounded-lg p-2 hover:bg-slate-200"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {addChoice === "menu"
            ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ConnectionChoice
                  title="Connect Google"
                  description="Google identity and approved Google integration permissions."
                  disabled={busy}
                  onClick={() => void connectGoogle()}
                  icon={
                    <span className="text-lg font-bold text-blue-700">G</span>
                  }
                />
                <ConnectionChoice
                  title="Connect GitHub"
                  description="Export NextAura websites directly to repositories."
                  disabled={busy}
                  onClick={() => void connectGithub()}
                  icon={<GithubMark />}
                />
                <ConnectionChoice
                  title="Connect Meta"
                  description="Connect Facebook Pages and linked Instagram professional accounts."
                  disabled={busy}
                  onClick={() => void connectMeta()}
                  icon={<MetaMark />}
                />
                <ConnectionChoice
                  title="Connect Instagram"
                  description="Connect an Instagram Business or Creator account directly."
                  disabled={busy}
                  onClick={() => void connectInstagram()}
                  icon={<InstagramMark />}
                />
                <ConnectionChoice
                  title="Generic API"
                  description="Store an API base URL and token securely."
                  disabled={busy}
                  onClick={() => setAddChoice("generic")}
                  icon={<Link2 className="h-5 w-5" aria-hidden="true" />}
                />
                <p className="text-xs text-slate-500 sm:col-span-2">
                  Slack and WhatsApp Cloud API connections are coming later.
                </p>
              </div>
            )
            : (
              <form onSubmit={create} className="mt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Connection name<input
                      required
                      maxLength={120}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                      placeholder="Partner API"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    API base URL<input
                      required
                      type="url"
                      value={baseUrl}
                      onChange={(event) => setBaseUrl(event.target.value)}
                      className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                      placeholder="https://api.example.com"
                    />
                  </label>
                </div>
                <label className="mt-3 block text-sm font-medium">
                  Secret / API token<input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={secret}
                    onChange={(event) => setSecret(event.target.value)}
                    className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                  />
                </label>
                <p className="mt-2 text-xs text-amber-700">
                  This secret cannot be viewed again after saving.
                </p>
                <button
                  disabled={busy}
                  className="mt-4 min-h-11 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Save connection
                </button>
              </form>
            )}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        {connections.length
          ? connections.map((connection) => {
            const meta = connection.provider === "meta"
              ? metaConnectionPresentation(connection)
              : null;
            return (
              <article
                key={connection.id}
                className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
                    {connection.provider === "meta"
                      ? <MetaMark className="h-4 w-5" />
                      : connection.provider === "instagram"
                      ? <InstagramMark className="h-4 w-4" />
                      : connection.provider === "github"
                      ? <GithubMark className="h-4 w-4" />
                      : <Link2 className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {connection.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {providerLabel[connection.provider]} ·{" "}
                      {connection.account_label || "No account label"} · Created
                      {" "}
                      {date(connection.created_at)}
                      {connection.last_verified_at
                        ? ` · Verified ${date(connection.last_verified_at)}`
                        : ""}
                    </p>
                    {meta && (
                      <p className="mt-1 text-xs text-slate-500">
                        {meta.summary}
                      </p>
                    )}
                    {connection.provider === "instagram" &&
                      connection.scopes.length > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        {connection.scopes.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      statusStyle[connection.status]
                    }`}
                  >
                    {meta?.label || connection.status.replaceAll("_", " ")}
                  </span>
                  {canManage && (
                    <>
                      {connection.provider === "meta" && (
                        <button
                          disabled={busy}
                          onClick={() => setManagedMeta(connection)}
                          className="min-h-10 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Manage resources
                        </button>
                      )}
                      {connection.provider === "google" && (
                        <IconAction
                          title="Reconnect Google"
                          disabled={busy}
                          onClick={() => void connectGoogle(connection.id)}
                        >
                          <Link2 className="h-4 w-4" />
                        </IconAction>
                      )}
                      {connection.provider === "github" && (
                        <IconAction
                          title="Reconnect GitHub"
                          disabled={busy}
                          onClick={() => void connectGithub(connection.id)}
                        >
                          <Link2 className="h-4 w-4" />
                        </IconAction>
                      )}
                      {connection.provider === "meta" && meta?.reconnect && (
                        <button
                          disabled={busy}
                          onClick={() => void connectMeta(connection.id)}
                          className="min-h-10 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Reconnect
                        </button>
                      )}
                      {connection.provider === "instagram" && (
                        <>
                          <IconAction
                            title="Refresh token"
                            disabled={busy}
                            onClick={() =>
                              void mutate(
                                () =>
                                  integrationConnectionService
                                    .refreshInstagramToken(
                                      currentOrg.id,
                                      connection.id,
                                    ),
                                "Instagram token refreshed.",
                              )}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </IconAction>
                          <IconAction
                            title="Reconnect Instagram"
                            disabled={busy}
                            onClick={() => void connectInstagram(connection.id)}
                          >
                            <Link2 className="h-4 w-4" />
                          </IconAction>
                        </>
                      )}
                      <IconAction
                        title="Rename"
                        disabled={busy}
                        onClick={() => {
                          const next = window.prompt(
                            "Connection name",
                            connection.name,
                          );
                          if (
                            next && next.trim() &&
                            next.trim() !== connection.name
                          ) {
                            void mutate(() =>
                              integrationConnectionService.rename(
                                currentOrg.id,
                                connection.id,
                                next.trim(),
                              )
                            );
                          }
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconAction>
                      {connection.provider !== "meta" && connection.provider !== "instagram" && (
                        <IconAction
                          title="Test"
                          disabled={busy || connection.status !== "active"}
                          onClick={() =>
                            void mutate(() =>
                              integrationConnectionService.test(
                                currentOrg.id,
                                connection.id,
                              ), "Connection successful.")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </IconAction>
                      )}
                      {connection.status === "active" &&
                        connection.provider !== "meta" &&
                        connection.provider !== "instagram" && (
                        <IconAction
                          title="Revoke"
                          disabled={busy}
                          onClick={() =>
                            window.confirm(
                              "Revoke this connection? It can no longer be selected.",
                            ) && void mutate(() =>
                              integrationConnectionService.revoke(
                                currentOrg.id,
                                connection.id,
                              )
                            )}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </IconAction>
                      )}
                      {connection.provider !== "meta" && connection.provider !== "instagram" && (
                        <IconAction
                          title="Delete"
                          destructive
                          disabled={busy}
                          onClick={() =>
                            window.confirm(
                              "Delete this connection? It will be revoked and removed from selectors.",
                            ) && void mutate(() =>
                              integrationConnectionService.remove(
                                currentOrg.id,
                                connection.id,
                              )
                            )}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconAction>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })
          : (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No connections yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Connect Google, GitHub, Meta, or a Generic API.
                Connect Google, GitHub, Meta, Instagram, or a Generic API.
              </p>
              {canManage && (
                <button
                  onClick={() => {
                    setAddChoice("menu");
                    setFormOpen(true);
                  }}
                  className="mt-4 text-sm font-semibold text-blue-700"
                >
                  + Add connection
                </button>
              )}
            </div>
          )}
      </div>

      <MetaConnectionDialog
        open={Boolean(managedMeta)}
        organizationId={currentOrg.id}
        connection={managedMeta}
        onClose={() => setManagedMeta(null)}
        onReconnect={async (connectionId) => await connectMeta(connectionId)}
        onChanged={async (message) => {
          setError(message);
          await load();
        }}
      />
    </section>
  );
}

function ConnectionChoice(
  { title, description, disabled, onClick, icon }: {
    title: string;
    description: string;
    disabled: boolean;
    onClick: () => void;
    icon: React.ReactNode;
  },
) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-28 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
    >
      <span className="mt-0.5 text-slate-800">{icon}</span>
      <span>
        <b className="block text-slate-900">{title}</b>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </button>
  );
}

function IconAction(
  { title, disabled, onClick, destructive = false, children }: {
    title: string;
    disabled: boolean;
    onClick: () => void;
    destructive?: boolean;
    children: React.ReactNode;
  },
) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`rounded-lg p-2 disabled:opacity-40 ${
        destructive
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-500 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
