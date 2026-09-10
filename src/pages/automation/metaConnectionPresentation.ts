export const metaConnectionPresentation = (
  connection: {
    status: string;
    account_label: string | null;
    provider_metadata?: {
      display_name?: string;
      pages_count?: number;
      instagram_accounts_count?: number;
    } | null;
  },
) => {
  const metadata = connection.provider_metadata || {};
  const pages = Number(metadata.pages_count || 0);
  const instagram = Number(metadata.instagram_accounts_count || 0);
  const reconnect = [
    "reconnect_required",
    "expired",
    "revoked",
    "disconnected",
    "error",
  ].includes(connection.status);
  return {
    label: connection.status === "active"
      ? "Connected"
      : connection.status === "degraded"
      ? "Connected with limitations"
      : reconnect
      ? "Reconnect required"
      : connection.status,
    account: connection.account_label || metadata.display_name ||
      "Meta account",
    pages,
    instagram,
    reconnect,
    summary: `${pages} Facebook Page${
      pages === 1 ? "" : "s"
    } · ${instagram} Instagram account${instagram === 1 ? "" : "s"}`,
  };
};
