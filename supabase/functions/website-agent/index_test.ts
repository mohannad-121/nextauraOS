import { websiteAgentEditPlanTest } from "./index.ts";

const { normalizeEditPlan, validateEditPlan, editRepairInstruction } =
  websiteAgentEditPlanTest;

const pageId = "11111111-1111-4111-8111-111111111111";
const heroId = "22222222-2222-4222-8222-222222222222";
const galleryId = "33333333-3333-4333-8333-333333333333";
const assetId = "44444444-4444-4444-8444-444444444444";
const navigationId = "55555555-5555-4555-8555-555555555555";

const hero = {
  pageId,
  id: heroId,
  type: "hero",
  props: {
    eyebrow: "Welcome",
    heading: "Hello",
    subheading: "Current copy",
    primaryLabel: "Start",
    primaryUrl: "#start",
    alignment: "left",
    minHeight: 420,
    backgroundAssetId: assetId,
    overlayOpacity: 0.35,
    imageFit: "cover",
  },
  style: { backgroundColor: "#ffffff", textColor: "#111111", paddingY: 80 },
};
const gallery = {
  pageId,
  id: galleryId,
  type: "gallery",
  props: { heading: "Gallery", items: [{ title: "Legacy item" }] },
  style: { backgroundColor: "#ffffff", textColor: "#111111", paddingY: 80 },
};

const context = () => ({
  pageIds: new Set([pageId]),
  sectionIds: new Set([heroId, galleryId]),
  sectionTypes: new Map([[heroId, "hero"], [galleryId, "gallery"]]),
  sections: new Map<string, any>([[heroId, hero], [galleryId, gallery]]),
  navigationIds: new Set([navigationId]),
  globalSections: {
    header: {
      id: "66666666-6666-4666-8666-666666666666",
      type: "header",
      props: {
        siteName: "NextAura",
        logoAssetId: null,
        ctaLabel: "Start",
        ctaUrl: "#start",
        sticky: false,
        variant: "logo-left",
        mobileOpen: false,
      },
      style: {
        backgroundColor: "#ffffff",
        textColor: "#111111",
        transparent: false,
      },
    },
    footer: {
      id: "77777777-7777-4777-8777-777777777777",
      type: "footer",
      props: {
        siteName: "NextAura",
        logoAssetId: null,
        description: "Description",
        copyright: "Copyright",
        variant: "columns",
        socialLinks: [],
      },
      style: {
        backgroundColor: "#111111",
        textColor: "#ffffff",
        variant: "columns",
      },
    },
  },
  themes: [{
    preset: "minimal",
    primaryColor: "#6750a4",
    backgroundColor: "#ffffff",
    textColor: "#111111",
    headingFont: "Inter",
    bodyFont: "Inter",
    radius: "md",
    direction: "ltr",
  }],
});

const assert = (condition: unknown, message = "Assertion failed") => {
  if (!condition) throw new Error(message);
};

Deno.test("simple Hero edit preserves builder-managed media and validates", () => {
  const plan = validateEditPlan({
    version: 1,
    summary: "Update the Hero title",
    operations: [{
      op: "update_section",
      pageId,
      sectionId: heroId,
      changes: { props: { heading: "أهلاً بكم" } },
    }],
  }, context());
  assert(
    plan.operations[0].changes.props.heading === "أهلاً بكم",
    "Hero heading was not retained",
  );
});

Deno.test("Arabic RTL site-wide edit validates against target-specific contracts", () => {
  const raw = {
    version: 1,
    summary: "تحويل الموقع إلى العربية واتجاه RTL",
    operations: [
      { op: "update_site_metadata", changes: { language: "ar" } },
      {
        op: "update_site_theme",
        theme: {
          direction: "rtl",
          headingFont: "ibm plex sans arabic",
          bodyFont: "Noto Sans Arabic, sans-serif",
          primaryColor: "#AA7733",
        },
      },
      {
        op: "update_global_header",
        changes: { props: { siteName: "نكست أورا", ctaLabel: "ابدأ الآن" } },
      },
      {
        op: "update_global_footer",
        changes: {
          props: {
            description: "حلول أعمال مترابطة",
            copyright: "جميع الحقوق محفوظة",
          },
        },
      },
      {
        op: "update_section",
        pageId,
        sectionId: heroId,
        changes: {
          props: {
            eyebrow: "مرحباً",
            heading: "أهلاً بكم",
            subheading: "نبني مستقبلك الرقمي",
            primaryLabel: "ابدأ الآن",
          },
        },
      },
      {
        op: "update_section",
        pageId,
        sectionId: galleryId,
        changes: { props: { heading: "أعمالنا" } },
      },
      {
        op: "update_navigation_item",
        navigationId,
        changes: { label: "الرئيسية" },
      },
    ],
  };
  const normalized = normalizeEditPlan(raw);
  const plan = validateEditPlan(normalized, context());
  assert(plan.operations.length === 7, "Arabic plan lost operations");
  assert(
    plan.operations[1].theme.direction === "rtl",
    "RTL direction was not retained",
  );
  assert(
    plan.operations[1].theme.headingFont === "IBM Plex Sans Arabic",
    "Arabic heading font alias was not normalized",
  );
  assert(
    plan.operations[1].theme.bodyFont === "Noto Sans Arabic",
    "Arabic body font alias was not normalized",
  );
  assert(
    plan.operations[1].theme.primaryColor === "#aa7733",
    "Theme color was not normalized",
  );
});

Deno.test("Arabic language requests always receive site-wide context", () => {
  assert(
    websiteAgentEditPlanTest.editRequestIntent("حوّل الموقع كله للعربي وخليه RTL") === "SITE_LANGUAGE",
    "Arabic site-language intent was not classified",
  );
  assert(
    websiteAgentEditPlanTest.editRequestScope("حوّل الموقع كله للعربي وخليه RTL") === "site",
    "Arabic site-language request was incorrectly scoped to one page",
  );
});

Deno.test("normalization removes only unambiguous blank optional URLs", () => {
  const normalized = normalizeEditPlan({
    version: 1,
    summary: "Update Hero",
    operations: [{
      op: "update_section",
      pageId,
      sectionId: heroId,
      changes: { props: { heading: "Updated", secondaryUrl: "   " } },
    }],
  }) as any;
  assert(
    !("secondaryUrl" in normalized.operations[0].changes.props),
    "Blank URL was not removed",
  );
  validateEditPlan(normalized, context());
});

Deno.test("invalid section key reports the exact operation and field path", () => {
  const candidate = {
    version: 1,
    summary: "Invalid Hero update",
    operations: [{
      op: "update_section",
      pageId,
      sectionId: heroId,
      changes: { props: { content: "Unsupported" } },
    }],
  };
  try {
    validateEditPlan(candidate, context());
    throw new Error("Invalid section key unexpectedly passed");
  } catch (error: any) {
    assert(error.code === "AI_EDIT_SECTION_INVALID", "Wrong validation code");
    assert(
      error.path === "operations.0.changes.props.content",
      "Validation path was not exact",
    );
    const repair = editRepairInstruction(error, candidate, context());
    assert(
      repair.includes("Operation 1 (update_section)"),
      "Repair omitted operation identity",
    );
    assert(
      repair.includes("Target section type is hero"),
      "Repair omitted target section contract",
    );
    assert(
      repair.includes("ENTIRE corrected edit plan"),
      "Repair did not request a full plan",
    );
  }
});

Deno.test("publish-like operations remain unsupported", () => {
  try {
    validateEditPlan({
      version: 1,
      summary: "Edit and publish",
      operations: [{ op: "publish_site" }],
    }, context());
    throw new Error("Publish operation unexpectedly passed");
  } catch (error: any) {
    assert(
      error.code === "AI_EDIT_UNSUPPORTED_OPERATION",
      "Publish rejection code changed",
    );
  }
});

Deno.test("complexity router keeps simple edits fast and routes site language tasks", () => {
  assert(
    websiteAgentEditPlanTest.siteLanguageComplexityRoute("Add an FAQ") ===
      "single_request",
  );
  assert(
    websiteAgentEditPlanTest.siteLanguageComplexityRoute(
      "Make the entire site Arabic and RTL",
    ) === "persistent_task",
  );
  assert(
    websiteAgentEditPlanTest.targetLanguageForInstruction(
      "Translate the whole site to English",
    ) === "en",
  );
  assert(
    websiteAgentEditPlanTest.targetLanguageForInstruction(
      "حوّل الموقع كله للعربي",
    ) === "ar",
  );
});

Deno.test("translation contract preserves non-text values and rejects shape drift", () => {
  const props = {
    heading: "Welcome",
    primaryUrl: "/contact",
    items: [{ title: "Fast", description: "Built for teams", url: "/teams" }],
    columns: 3,
  };
  const shape = websiteAgentEditPlanTest.translationShape(props) as any;
  assert(shape.heading === "Welcome");
  assert(shape.primaryUrl === undefined);
  assert(shape.items[0].url === undefined);
  const merged = websiteAgentEditPlanTest.mergeTranslatedShape(
    props,
    shape,
    {
      heading: "مرحباً",
      items: [{ title: "سريع", description: "مصمم للفرق" }],
    },
  ) as any;
  assert(merged.heading === "مرحباً");
  assert(merged.primaryUrl === "/contact");
  assert(merged.items[0].url === "/teams");
  assert(merged.columns === 3);
  let rejected = false;
  try {
    websiteAgentEditPlanTest.mergeTranslatedShape(
      props,
      shape,
      { heading: "مرحباً", items: [] },
    );
  } catch {
    rejected = true;
  }
  assert(rejected);
});

Deno.test("task stale detection rebases version-only drift with identical content", () => {
  const conflicts = websiteAgentEditPlanTest.taskBaselineConflicts(
    {
      global_version: 2,
      global_hash: "same-global",
      pages: { [pageId]: 4 },
      page_hashes: { [pageId]: "same-page" },
    },
    {
      global_version: 3,
      global_hash: "same-global",
      pages: { [pageId]: 5 },
      page_hashes: { [pageId]: "same-page" },
    },
  );
  assert(conflicts.length === 0, "No-op version drift must be safely rebasable");
});

Deno.test("task stale detection preserves genuine page and global conflicts", () => {
  const conflicts = websiteAgentEditPlanTest.taskBaselineConflicts(
    {
      global_version: 2,
      global_hash: "old-global",
      pages: { [pageId]: 4 },
      page_hashes: { [pageId]: "old-page" },
    },
    {
      global_version: 3,
      global_hash: "new-global",
      pages: { [pageId]: 5 },
      page_hashes: { [pageId]: "new-page" },
    },
  );
  assert(
    conflicts.some((item) => item.type === "global"),
    "Global content mutation must conflict",
  );
  assert(
    conflicts.some((item) => item.type === "page" && item.id === pageId),
    "Page content mutation must conflict",
  );
});
