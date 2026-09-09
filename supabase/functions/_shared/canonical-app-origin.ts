const CANONICAL_APP_ORIGIN = "https://nextauraos.tech";
const PRODUCTION_APP_ALIAS_HOST = "nextauraos.vercel.app";

const parseOrigin = (value: string) => {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("NEXTAURA_APP_URL must be an HTTP(S) origin.");
  }
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error("NEXTAURA_APP_URL must be an origin without a path.");
  }
  return url;
};

export const canonicalAppOrigin = () => {
  const configured =
    Deno.env.get("NEXTAURA_APP_URL") || Deno.env.get("APP_URL") || "";

  if (!configured) return CANONICAL_APP_ORIGIN;

  const url = parseOrigin(configured.trim());
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === PRODUCTION_APP_ALIAS_HOST ||
    hostname === "nextauraos.tech"
  ) {
    return CANONICAL_APP_ORIGIN;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return url.origin;
  }

  throw new Error("NEXTAURA_APP_URL must use the canonical app origin.");
};

export const canonicalAppUrl = (path: string) =>
  new URL(path, `${canonicalAppOrigin()}/`).toString();
