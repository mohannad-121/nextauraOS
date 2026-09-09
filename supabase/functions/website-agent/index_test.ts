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

Deno.test("translation edits preserve bounded legacy section spacing tokens", () => {
  const legacyContext = context();
  legacyContext.sections.get(heroId).style.paddingY = "large";
  const plan = validateEditPlan({
    version: 1,
    summary: "Translate legacy Hero copy",
    operations: [{
      op: "update_section",
      pageId,
      sectionId: heroId,
      changes: { props: { heading: "Updated heading" } },
    }],
  }, legacyContext);
  assert(plan.operations.length === 1);
});

Deno.test("translation edits preserve bounded legacy global visual tokens", () => {
  const legacyContext = context();
  legacyContext.globalSections.header.style = {
    backgroundColor: "#0a0a0a",
    textColor: "#f5f5f5",
    paddingY: "medium",
    preset: "minimal",
    background: "solid",
    cardStyle: "flat",
    animation: "none",
    animationDelayPreset: "none",
  } as any;
  const plan = validateEditPlan({
    version: 1,
    summary: "Translate legacy header copy",
    operations: [{
      op: "update_global_header",
      changes: { props: { ctaLabel: "Updated label" } },
    }],
  }, legacyContext);
  assert(plan.operations.length === 1);
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

Deno.test("service translation includes every nested title and description", () => {
  const props = {
    heading: "Culinary Offerings",
    items: [
      { title: "Artisanal Cocktails", description: "Handcrafted with rare botanicals.", target: "/cocktails" },
      { title: "Private Dining", description: "Intimate gatherings and celebrations.", target: "/private" },
      { title: "Chef's Tasting Menu", description: "A multi-course sensory exploration.", target: "/menu" },
    ],
    columns: 3,
  };
  const shape = websiteAgentEditPlanTest.translationShapeForSection("services", props) as any;
  assert(shape.heading === "Culinary Offerings");
  assert(shape.items.length === 3);
  assert(shape.items[0].title === "Artisanal Cocktails");
  assert(shape.items[2].description === "A multi-course sensory exploration.");
  assert(shape.items[0].target === undefined);
  const merged = websiteAgentEditPlanTest.mergeTranslatedShape(props, shape, {
    heading: "عروض الطهي",
    items: [
      { title: "كوكتيلات حرفية", description: "مصنوعة بمكونات نباتية نادرة." },
      { title: "تناول طعام خاص", description: "للتجمعات والاحتفالات الحميمة." },
      { title: "قائمة تذوق الشيف", description: "رحلة حسية متعددة الأطباق." },
    ],
  }) as any;
  assert(merged.items[0].title === "كوكتيلات حرفية");
  assert(merged.items[0].target === "/cocktails");
  assert(merged.columns === 3);
  let rejected = false;
  try {
    websiteAgentEditPlanTest.mergeTranslatedShape(
      props,
      shape,
      { heading: "عروض", items: [] },
    );
  } catch {
    rejected = true;
  }
  assert(rejected);
});

Deno.test("testimonial translation covers headings and quotes but preserves people", () => {
  const props = {
    heading: "Guest Reflections",
    items: [{
      author: "Eleanor Vance",
      quote: "Every dish was an absolute masterpiece.",
      role: "Restaurant guest",
    }],
  };
  const shape = websiteAgentEditPlanTest.translationShapeForSection("testimonials", props) as any;
  assert(shape.heading === "Guest Reflections");
  assert(shape.items[0].quote === "Every dish was an absolute masterpiece.");
  assert(shape.items[0].role === "Restaurant guest");
  assert(shape.items[0].author === undefined, "Personal names must stay protected");
});

Deno.test("pricing, team, and gallery nested translation fields are complete", () => {
  const pricing = websiteAgentEditPlanTest.translationShapeForSection("pricing", {
    heading: "Plans",
    items: [{
      name: "Starter",
      description: "For growing teams",
      price: "$49",
      period: "/month",
      features: ["Email support", "Priority access"],
      ctaLabel: "Choose plan",
      target: "/buy",
    }],
  }) as any;
  assert(pricing.items[0].name === "Starter");
  assert(pricing.items[0].features.length === 2);
  assert(pricing.items[0].period === "/month");
  assert(pricing.items[0].price === undefined);
  assert(pricing.items[0].target === undefined);

  const team = websiteAgentEditPlanTest.translationShapeForSection("team", {
    heading: "Our team",
    items: [{ name: "Maya Stone", role: "Head Chef", bio: "Creates memorable menus." }],
  }) as any;
  assert(team.items[0].name === undefined);
  assert(team.items[0].role === "Head Chef");
  assert(team.items[0].bio === "Creates memorable menus.");

  const gallery = websiteAgentEditPlanTest.translationShapeForSection("gallery", {
    heading: "Gallery",
    images: [{ assetId, alt: "Dining room", caption: "An intimate evening" }],
  }) as any;
  assert(gallery.images[0].alt === "Dining room");
  assert(gallery.images[0].caption === "An intimate evening");
  assert(gallery.images[0].assetId === undefined);
});

Deno.test("all supported text-bearing sections pass Arabic and English coverage", () => {
  const fixtures: Record<string, any> = {
    hero: { eyebrow: "Welcome", heading: "Fine dining", subheading: "A memorable evening", primaryLabel: "Reserve", primaryUrl: "/contact" },
    text: { heading: "Our story", body: "Hospitality with purpose" },
    image: { alt: "Elegant dining room", assetId },
    button_group: { heading: "Ready to visit", buttons: [{ label: "Book now", url: "/contact" }] },
    features: { heading: "Why visit", subheading: "Crafted with care", items: [{ title: "Rare ingredients", description: "Selected every morning" }] },
    services: { heading: "Our services", items: [{ title: "Private dining", description: "An intimate celebration" }] },
    testimonials: { heading: "Guest reflections", items: [{ author: "Eleanor Vance", quote: "A wonderful dining experience", role: "Guest" }] },
    pricing: { heading: "Menus", items: [{ name: "Tasting menu", description: "Seven courses", price: "$90", period: "per guest", features: ["Seasonal ingredients"], ctaLabel: "Reserve" }] },
    faq: { heading: "Questions", items: [{ question: "How do I reserve", answer: "Contact our team" }] },
    contact: { heading: "Contact us", text: "Plan your evening", address: "Golden Boulevard 7", email: "hello@example.com" },
    gallery: { heading: "Our gallery", images: [{ assetId, alt: "Signature plate", caption: "Chef selection" }] },
    stats: { heading: "Our story", items: [{ value: "10+", label: "Years of experience" }] },
    team: { heading: "Our team", items: [{ name: "Maya Stone", role: "Head Chef", bio: "Leads our kitchen" }] },
  };
  const translateStrings = (value: any, replacement: string): any =>
    typeof value === "string"
      ? replacement
      : Array.isArray(value)
        ? value.map((item) => translateStrings(item, replacement))
        : value && typeof value === "object"
          ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, translateStrings(child, replacement)]))
          : value;
  for (const [type, props] of Object.entries(fixtures)) {
    const shape = websiteAgentEditPlanTest.translationShapeForSection(type, props);
    assert(shape, `${type} produced no translation shape`);
    const arabic = websiteAgentEditPlanTest.mergeTranslatedShape(props, shape, translateStrings(shape, "نص عربي طبيعي"));
    assert(
      websiteAgentEditPlanTest.translationCoverageIssues("ar", websiteAgentEditPlanTest.translationShapeForSection(type, arabic)).length === 0,
      `${type} retained English after Arabic translation`,
    );
    const arabicShape = websiteAgentEditPlanTest.translationShapeForSection(type, arabic);
    const english = websiteAgentEditPlanTest.mergeTranslatedShape(arabic, arabicShape, translateStrings(arabicShape, "Natural English website copy"));
    assert(
      websiteAgentEditPlanTest.translationCoverageIssues("en", websiteAgentEditPlanTest.translationShapeForSection(type, english)).length === 0,
      `${type} retained Arabic after English translation`,
    );
  }
});

Deno.test("coverage detector performs one bounded repair for untranslated fields", async () => {
  const bundle = {
    section: {
      heading: "Guest Reflections",
      items: [{ quote: "Every dish was an absolute masterpiece." }],
    },
  };
  let calls = 0;
  const translated = await websiteAgentEditPlanTest.translatedBundle(
    "ar",
    bundle,
    [],
    async (_target: "en" | "ar", supplied: Record<string, unknown>, repair = "") => {
      calls += 1;
      if (calls === 1) {
        return { section: { heading: "انطباعات ضيوفنا", items: [{ quote: "Every dish was an absolute masterpiece." }] } };
      }
      assert(repair.includes("section.items[0].quote"));
      assert(Object.keys(supplied).length === 1, "Repair must include only untranslated fields");
      return { field_0: "كان كل طبق تحفة فنية مطلقة." };
    },
  ) as any;
  assert(calls === 2, "Exactly one coverage repair pass was expected");
  assert(translated.section.items[0].quote.includes("تحفة"));
  assert(websiteAgentEditPlanTest.translationCoverageIssues("ar", translated).length === 0);
});

Deno.test("coverage detector allows explicit brand terms but catches English copy", () => {
  assert(
    websiteAgentEditPlanTest.translationCoverageIssues(
      "ar",
      { heading: "تجربة راقية في Bella Roma" },
      ["Bella Roma"],
    ).length === 0,
  );
  const issues = websiteAgentEditPlanTest.translationCoverageIssues(
    "ar",
    { heading: "Guest Reflections" },
  );
  assert(issues.length === 1 && issues[0].pathLabel === "heading");
});

Deno.test("new Website Agent plans receive stable server-owned section IDs", () => {
  const plan = websiteAgentEditPlanTest.assignWebsitePlanSectionIds({
    pages: [{ sections: [{ type: "services", props: {}, style: {} }] }],
  }) as any;
  assert(
    /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(plan.pages[0].sections[0].id),
    "Generated section did not receive a UUID",
  );
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
