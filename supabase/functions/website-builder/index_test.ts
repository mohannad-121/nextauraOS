import { websiteBuilderTest } from "./index.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("canonical draft comparison recognizes no-op saves", () => {
  const authoritative = {
    version: 1,
    theme: { direction: "ltr", primaryColor: "#123456" },
    sections: [{ id: "one", type: "text", props: { body: "Same" }, style: {} }],
  };
  const reordered = {
    sections: [{ style: {}, props: { body: "Same" }, type: "text", id: "one" }],
    theme: { primaryColor: "#123456", direction: "ltr" },
    version: 1,
  };
  assert(
    websiteBuilderTest.canonicalJson(authoritative) ===
      websiteBuilderTest.canonicalJson(reordered),
    "Equivalent JSON documents must be treated as a no-op",
  );
  assert(
    websiteBuilderTest.canonicalJson(authoritative) !==
      websiteBuilderTest.canonicalJson({ ...reordered, version: 2 }),
    "Real document changes must not be treated as a no-op",
  );
});
