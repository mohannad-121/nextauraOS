import { metaConnectionPresentation } from "../../../src/pages/automation/metaConnectionPresentation.ts";

const assert = (condition: unknown, message = "Assertion failed") => {
  if (!condition) throw new Error(message);
};

Deno.test("Meta connection UI presents disconnected state", () => {
  const result = metaConnectionPresentation({
    status: "disconnected",
    account_label: "Meta Owner",
    provider_metadata: {},
  });
  assert(result.label === "Reconnect required");
  assert(result.reconnect);
});

Deno.test("Meta connection UI presents connected resource counts", () => {
  const result = metaConnectionPresentation({
    status: "active",
    account_label: "Meta Owner",
    provider_metadata: { pages_count: 2, instagram_accounts_count: 1 },
  });
  assert(result.label === "Connected");
  assert(result.summary === "2 Facebook Pages · 1 Instagram account");
});

Deno.test("Meta connection UI presents reconnect-required state", () => {
  const result = metaConnectionPresentation({
    status: "reconnect_required",
    account_label: null,
    provider_metadata: { display_name: "Meta Account" },
  });
  assert(result.label === "Reconnect required");
  assert(result.account === "Meta Account");
});
