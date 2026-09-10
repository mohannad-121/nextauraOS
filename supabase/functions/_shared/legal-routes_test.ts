import { resolvePublicLegalRoute } from "../../../src/pages/legal/legalRoutes.ts";

const assert = (condition: unknown, message = "Assertion failed") => {
  if (!condition) throw new Error(message);
};

Deno.test("legal routes are public only on the canonical root host", () => {
  assert(
    resolvePublicLegalRoute("/privacy", "nextauraos.tech") === "privacy",
  );
  assert(
    resolvePublicLegalRoute("/data-deletion/", "nextauraos.tech") ===
      "data-deletion",
  );
  assert(
    resolvePublicLegalRoute("/privacy", "customer.nextauraos.tech") === null,
  );
  assert(
    resolvePublicLegalRoute("/data-deletion", "app.nextauraos.tech") === null,
  );
  assert(resolvePublicLegalRoute("/app", "nextauraos.tech") === null);
});

Deno.test("legal routes can render on local development without affecting other hosts", () => {
  assert(
    resolvePublicLegalRoute("/privacy", "localhost", true) === "privacy",
  );
  assert(resolvePublicLegalRoute("/privacy", "localhost", false) === null);
  assert(resolvePublicLegalRoute("/privacy", "example.com", true) === null);
});
