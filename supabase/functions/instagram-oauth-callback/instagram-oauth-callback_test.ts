import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { instagramOAuthCallbackHandler } from "./index.ts";

Deno.test("OAuth callback failure cases", async (t) => {
  await t.step("rejects non-GET request", async () => {
    const req = new Request("https://test.local/", { method: "POST" });
    const res = await instagramOAuthCallbackHandler(req);
    assertEquals(res.status, 405);
  });

  await t.step("redirects to error when missing code", async () => {
    const req = new Request("https://test.local/?state=test");
    const res = await instagramOAuthCallbackHandler(req);
    assertEquals(res.status, 303);
    assertEquals(res.headers.get("location")?.includes("instagram=error"), true);
  });

  await t.step("redirects to error when missing state", async () => {
    const req = new Request("https://test.local/?code=test");
    const res = await instagramOAuthCallbackHandler(req);
    assertEquals(res.status, 303);
    assertEquals(res.headers.get("location")?.includes("instagram=error"), true);
  });

  await t.step("redirects to error when state is too long", async () => {
    const req = new Request(`https://test.local/?code=test&state=${"a".repeat(1000)}`);
    const res = await instagramOAuthCallbackHandler(req);
    assertEquals(res.status, 303);
    assertEquals(res.headers.get("location")?.includes("instagram=error"), true);
  });
});

