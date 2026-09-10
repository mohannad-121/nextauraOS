export type LegalRoute = "privacy" | "data-deletion";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function resolvePublicLegalRoute(
  pathname: string,
  hostname: string,
  allowLocalDevelopment = false,
): LegalRoute | null {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const route = normalizedPath === "/privacy"
    ? "privacy"
    : normalizedPath === "/data-deletion"
    ? "data-deletion"
    : null;
  if (!route) return null;

  const normalizedHost = hostname.toLowerCase().replace(/\.$/, "");
  if (normalizedHost === "nextauraos.tech") return route;
  if (allowLocalDevelopment && LOCAL_HOSTS.has(normalizedHost)) return route;
  return null;
}
