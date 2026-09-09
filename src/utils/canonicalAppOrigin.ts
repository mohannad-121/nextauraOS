export const CANONICAL_APP_ORIGIN = "https://nextauraos.tech";
export const PRODUCTION_APP_ALIAS_HOST = "nextauraos.vercel.app";

export const canonicalAppOrigin = () => {
  const hostname = window.location.hostname.toLowerCase();
  return hostname === "nextauraos.tech" || hostname === PRODUCTION_APP_ALIAS_HOST
    ? CANONICAL_APP_ORIGIN
    : window.location.origin;
};

export const redirectProductionAliasToCanonicalOrigin = () => {
  if (
    !import.meta.env.PROD ||
    window.location.hostname.toLowerCase() !== PRODUCTION_APP_ALIAS_HOST
  ) {
    return false;
  }

  window.location.replace(
    `${CANONICAL_APP_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
  return true;
};
