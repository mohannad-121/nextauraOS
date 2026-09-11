import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Unplug,
  X,
} from "lucide-react";
import {
  type IntegrationConnection,
  integrationConnectionService,
  type MetaConnectionResource,
  type MetaPermissionStatus,
  type MetaProviderMetadata,
} from "../../services/integrationConnectionService";
import { metaConnectionPresentation } from "./metaConnectionPresentation";

type Props = {
  open: boolean;
  organizationId: string;
  connection: IntegrationConnection | null;
  onClose: () => void;
  onChanged: (message: string) => Promise<void>;
  onReconnect: (connectionId: string) => Promise<void>;
};

function FacebookMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M14 8h3V4.5c-.52-.07-2.3-.22-4.42-.22C8.16 4.28 7 6.73 7 9.8V13H4v3.91h3V24h4.68v-7.09h3.14L16 13h-4.32V10.2C11.68 9.07 12 8 14 8Z" />
    </svg>
  );
}

function InstagramMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MetaConnectionDialog({
  open,
  organizationId,
  connection,
  onClose,
  onChanged,
  onReconnect,
}: Props) {
  const dialog = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [resources, setResources] = useState<MetaConnectionResource[]>([]);
  const [details, setDetails] = useState<IntegrationConnection | null>(null);
  const [healthMessage, setHealthMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async (checkHealth: boolean) => {
    if (!connection) return;
    setLoading(true);
    setError("");
    try {
      if (
        checkHealth && !["disconnected", "revoked"].includes(connection.status)
      ) {
        const result = await integrationConnectionService.checkMetaConnection(
          organizationId,
          connection.id,
        );
        setHealthMessage(result.health?.message || "Meta connection checked.");
      }
      const result = await integrationConnectionService.getMetaDetails(
        organizationId,
        connection.id,
      );
      setDetails(result.connection);
      setResources(result.resources);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load Meta connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !connection) return;
    previousFocus.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setDetails(connection);
    setResources([]);
    setHealthMessage("");
    void load(true);
    queueMicrotask(() => closeButton.current?.focus());
    return () => previousFocus.current?.focus();
  }, [open, connection?.id, organizationId]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key === "Tab" && dialog.current) {
        const focusable = [...dialog.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        )];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, busy, onClose]);

  if (!open || !connection) return null;
  const current = details || connection;
  const presentation = metaConnectionPresentation(current);
  const pages = resources.filter((item) =>
    item.resource_type === "facebook_page"
  );
  const instagram = resources.filter((item) =>
    item.resource_type === "instagram_account"
  );
  const metaMeta = current.provider_metadata as MetaProviderMetadata;
  const permissions = metaMeta?.permission_statuses || [];
  const toggle = (id: string) => {
    setResources((items) =>
      items.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await integrationConnectionService.updateMetaResources(
        organizationId,
        connection.id,
        pages.filter((item) => item.selected).map((item) =>
          item.external_resource_id
        ),
        instagram.filter((item) => item.selected).map((item) =>
          item.external_resource_id
        ),
      );
      await onChanged("Meta resource selection saved.");
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save Meta resources.",
      );
    } finally {
      setBusy(false);
    }
  };
  const disconnect = async () => {
    if (
      !window.confirm(
        "Disconnect Meta? Stored Meta credentials will be removed.",
      )
    ) return;
    setBusy(true);
    setError("");
    try {
      await integrationConnectionService.revoke(organizationId, connection.id);
      await onChanged("Meta disconnected. Stored credentials were removed.");
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to disconnect Meta.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-6">
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meta-connection-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Meta connection
            </p>
            <h2
              id="meta-connection-title"
              className="mt-1 truncate text-xl font-semibold text-slate-950"
            >
              {presentation.account}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {presentation.summary}
            </p>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close Meta connection"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
          {loading
            ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />Checking Meta connection…
              </div>
            )
            : (
              <div className="space-y-6">
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Connection health
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {healthMessage || presentation.label}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void load(true)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw
                        className="h-4 w-4"
                        aria-hidden="true"
                      />Refresh
                    </button>
                  </div>
                  {presentation.reconnect && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onReconnect(connection.id)}
                      className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Reconnect Meta
                    </button>
                  )}
                </section>

                <ResourceSection
                  title="Facebook Pages"
                  empty="No accessible Facebook Pages were returned by Meta."
                  icon={<FacebookMark />}
                  resources={pages}
                  onToggle={toggle}
                />
                <ResourceSection
                  title="Instagram professional accounts"
                  empty="No professional Instagram accounts linked to these Pages were found."
                  icon={<InstagramMark />}
                  resources={instagram}
                  onToggle={toggle}
                />

                <section>
                  <h3 className="font-semibold text-slate-900">Permissions</h3>
                  <div className="mt-3 space-y-2">
                    {permissions.map((permission: MetaPermissionStatus) => {
                      const granted = permission.status === "granted";
                      return (
                        <div
                          key={permission.name}
                          className="rounded-xl border border-slate-200 p-3"
                        >
                          <div className="flex items-start gap-2">
                            {granted
                              ? (
                                <CheckCircle2
                                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                                  aria-hidden="true"
                                />
                              )
                              : (
                                <AlertTriangle
                                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                                  aria-hidden="true"
                                />
                              )}
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {permission.name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {permission.purpose}
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-600">
                                {granted ? "Granted" : "Not granted"}
                                {permission.requires_app_review
                                  ? " · App Review/Advanced Access required for production users"
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!permissions.length && (
                      <p className="text-sm text-slate-500">
                        Permission details are available after connecting Meta.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            <Unplug className="h-4 w-4" aria-hidden="true" />Disconnect
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="min-h-11 flex-1 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || loading || presentation.reconnect}
              onClick={() => void save()}
              className="min-h-11 flex-1 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:flex-none"
            >
              {busy ? "Saving…" : "Save resources"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function ResourceSection({
  title,
  empty,
  icon,
  resources,
  onToggle,
}: {
  title: string;
  empty: string;
  icon: React.ReactNode;
  resources: MetaConnectionResource[];
  onToggle: (id: string) => void;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        {icon}
        {title}
      </h3>
      <div className="mt-3 space-y-2">
        {resources.map((resource) => (
          <label
            key={resource.id}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 hover:border-blue-300"
          >
            <input
              type="checkbox"
              checked={resource.selected}
              onChange={() => onToggle(resource.id)}
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            {(resource.metadata.picture_url ||
                resource.metadata.profile_picture_url)
              ? (
                <img
                  src={resource.metadata.picture_url ||
                    resource.metadata.profile_picture_url || ""}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )
              : (
                <span
                  className="h-9 w-9 rounded-full bg-slate-100"
                  aria-hidden="true"
                />
              )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-900">
                {resource.display_name}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {resource.resource_type === "facebook_page"
                  ? resource.metadata.category || "Facebook Page"
                  : resource.metadata.name || "Instagram professional account"}
              </span>
            </span>
          </label>
        ))}
        {!resources.length && (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}
