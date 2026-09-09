import { canonicalAppOrigin, canonicalAppUrl } from "./canonical-app-origin.ts";

Deno.test("normalizes the production alias and preserves a local development origin", () => {
  const originalCanonical = Deno.env.get("NEXTAURA_APP_URL");
  const originalLegacy = Deno.env.get("APP_URL");
  try {
    Deno.env.set("NEXTAURA_APP_URL", "https://nextauraos.vercel.app");
    Deno.env.delete("APP_URL");
    if (canonicalAppOrigin() !== "https://nextauraos.tech") {
      throw new Error("The production alias must normalize to the canonical origin.");
    }
    if (canonicalAppUrl("/settings") !== "https://nextauraos.tech/settings") {
      throw new Error("Canonical app URLs must preserve relative paths.");
    }

    Deno.env.set("NEXTAURA_APP_URL", "http://localhost:5173");
    if (canonicalAppOrigin() !== "http://localhost:5173") {
      throw new Error("Local development must retain its configured origin.");
    }
  } finally {
    if (originalCanonical === undefined) Deno.env.delete("NEXTAURA_APP_URL");
    else Deno.env.set("NEXTAURA_APP_URL", originalCanonical);
    if (originalLegacy === undefined) Deno.env.delete("APP_URL");
    else Deno.env.set("APP_URL", originalLegacy);
  }
});
