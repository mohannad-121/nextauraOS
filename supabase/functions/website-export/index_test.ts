import { archive, collectWebsiteAssetIds, projectFiles, rewriteWebsiteAssetReferences, type ExportFile } from "./index.ts";

function readStoredEntry(zip: Uint8Array, expectedPath: string) {
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 30 <= zip.length) {
    const signature = new DataView(zip.buffer, zip.byteOffset + offset, 4).getUint32(0, true);
    if (signature !== 0x04034b50) break;
    const view = new DataView(zip.buffer, zip.byteOffset + offset);
    const size = view.getUint32(18, true), nameSize = view.getUint16(26, true), extraSize = view.getUint16(28, true), nameStart = offset + 30;
    const path = decoder.decode(zip.slice(nameStart, nameStart + nameSize)), dataStart = nameStart + nameSize + extraSize;
    if (path === expectedPath) return zip.slice(dataStart, dataStart + size);
    offset = dataStart + size;
  }
  throw new Error(`Missing ZIP entry: ${expectedPath}`);
}

Deno.test("website export ZIP preserves binary media bytes", () => {
  const original = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 255, 1, 254, 42]);
  const entries: ExportFile[] = [{ path: "src/data/site.ts", kind: "text", content: "export const site = {};" }, { path: "public/assets/fixture.png", kind: "binary", content: original }];
  const extracted = readStoredEntry(archive(entries), "public/assets/fixture.png");
  if (extracted.length !== original.length || extracted.some((byte, index) => byte !== original[index])) throw new Error("Binary ZIP round-trip changed media bytes.");
});

const assetA = "11111111-1111-4111-8111-111111111111";
const assetB = "22222222-2222-4222-8222-222222222222";
const assetC = "33333333-3333-4333-8333-333333333333";
const assetD = "44444444-4444-4444-8444-444444444444";

Deno.test("media export collects known references once and rewrites only exported copies", () => {
  const draftPages = [{ id: "draft", document: { sections: [
    { type: "hero", props: { backgroundAssetId: assetA, sideAssetId: assetB } },
    { type: "image", props: { assetId: assetC, alt: "Image" } },
    { type: "gallery", props: { images: [{ assetId: assetA, alt: "Reused" }, { assetId: assetD }] } },
    { type: "team", props: { items: [{ avatarAssetId: assetB, imageAssetId: assetC, assetId: assetD }] } },
  ] } }];
  const globals = { header: { type: "header", props: { logoAssetId: assetA } }, footer: { type: "footer", props: { logoAssetId: assetB } } };
  const ids = collectWebsiteAssetIds(draftPages, globals, assetC);
  if (ids.length !== 4 || !ids.includes(assetA) || !ids.includes(assetD)) throw new Error("Known media references were not deduplicated.");
  const paths = new Map([[assetA, "/assets/a.png"], [assetB, "/assets/b.jpg"], [assetC, "/assets/c.webp"], [assetD, "/assets/d.png"]]);
  const rewritten = rewriteWebsiteAssetReferences(draftPages, globals, assetC, paths);
  const serialized = JSON.stringify(rewritten);
  if (serialized.includes(assetA) || serialized.includes(assetB) || !serialized.includes("/assets/a.png") || rewritten.pages[0].document.sections[2].props.images[0].src !== "/assets/a.png") throw new Error("Media references were not rewritten to local paths.");
  if (draftPages[0].document.sections[0].props.backgroundAssetId !== assetA) throw new Error("Export rewrote a source draft document.");
});

Deno.test("draft and published media discovery stays source-specific", () => {
  const draft = [{ document: { sections: [{ type: "image", props: { assetId: assetA } }] } }];
  const published = [{ document: { sections: [{ type: "image", props: { assetId: assetB } }] } }];
  const draftIds = collectWebsiteAssetIds(draft, {}, null);
  const publishedIds = collectWebsiteAssetIds(published, {}, null);
  if (draftIds.join() !== assetA || publishedIds.join() !== assetB) throw new Error("Draft and published media discovery mixed content.");
});

Deno.test({ name: "a media-bearing exported project builds offline from NextAura storage", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const root = await Deno.makeTempDir({ prefix: "nextaura-export-" });
  try {
    const pages = [{ id: "home", slug: "/", document: { sections: [{ id: "hero", type: "hero", props: { heading: "مرحبا", backgroundSrc: "/assets/fixture.png" }, style: {} }] } }];
    const entries = [...projectFiles({ name: "Offline media", default_locale: "ar" }, pages, { navigation: [] }, "/assets/fixture.png", 0), { path: "public/assets/fixture.png", kind: "binary" as const, content: new Uint8Array([137, 80, 78, 71]) }];
    const zip = archive(entries);
    if (!readStoredEntry(zip, "public/assets/fixture.png").length || readStoredEntry(zip, "src/data/site.ts").some((byte) => byte === 0)) throw new Error("Export archive does not contain expected media and source files.");
    for (const entry of entries) {
      const destination = `${root}/${entry.path}`;
      await Deno.mkdir(destination.substring(0, destination.lastIndexOf("/")), { recursive: true });
      await Deno.writeFile(destination, entry.kind === "text" ? new TextEncoder().encode(entry.content) : entry.content);
    }
    const install = await new Deno.Command("npm", { args: ["install", "--ignore-scripts", "--no-audit", "--no-fund"], cwd: root, stdout: "piped", stderr: "piped" }).output();
    if (!install.success) throw new Error(new TextDecoder().decode(install.stderr));
    const build = await new Deno.Command("npm", { args: ["run", "build"], cwd: root, stdout: "piped", stderr: "piped" }).output();
    if (!build.success) throw new Error(`${new TextDecoder().decode(build.stdout)}\n${new TextDecoder().decode(build.stderr)}`);
    const output = await Deno.readTextFile(`${root}/dist/index.html`);
    if (!output.includes('dir="rtl"')) throw new Error("Exported Arabic document lost RTL metadata.");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
} });
