import {
  authenticate,
  corsHeaders,
  json,
  requireBillingAdmin,
} from "../_shared/billing.ts";
import { getOrganizationEntitlements } from "../_shared/entitlements.ts";

const sectionTypes = new Set([
  "hero",
  "text",
  "image",
  "button_group",
  "spacer",
  "features",
  "services",
  "testimonials",
  "pricing",
  "faq",
  "contact",
  "gallery",
  "stats",
  "team",
]);
const fontAllowlist = new Set([
  "Inter",
  "Manrope",
  "Playfair Display",
  "DM Sans",
  "Noto Sans Arabic",
  "IBM Plex Sans Arabic",
]);
const styleHints = new Set([
  "Modern",
  "Luxury",
  "Minimal",
  "Bold",
  "Elegant",
  "Playful",
  "Professional",
]);
const dangerous =
  /<\/?script|on[a-z]+\s*=|javascript:|<iframe|data:text\/html/i;
const uuid = (value: unknown) =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value);
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max: number, field: string, required = true) => {
  if (
    typeof value !== "string" ||
    (required && !value.trim()) ||
    value.length > max ||
    dangerous.test(value)
  ) {
    throw new Error(`Website plan ${field} is invalid.`);
  }
  return value.trim();
};
const safeUrl = (value: unknown) =>
  typeof value === "string" &&
  /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(value) &&
  !dangerous.test(value);
const slug = (value: unknown, field: string) => {
  const result = text(value, 63, field).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(result)) {
    throw new Error(`Website plan ${field} is invalid.`);
  }
  return result;
};

type Plan = Record<string, any>;

// Image acquisition is intentionally server-owned. Until an approved provider
// credential is installed, plans carry only semantic intents and drafts remain
// fully usable without remote URLs or invented asset IDs.
type WebsiteImageProvider = {
  readonly configured: boolean;
  readonly mode: "intent-only" | "approved-provider";
};
const websiteImageProvider: WebsiteImageProvider = {
  configured: false,
  mode: "intent-only",
};

class PlanValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly path: string,
  ) {
    super(message);
    this.name = "PlanValidationError";
  }
}

const failPlan = (code: string, message: string, path: string): never => {
  throw new PlanValidationError(code, message, path);
};

const agentSectionSchemas: Record<
  string,
  { props: string[]; style: string[] }
> = {
  hero: {
    props: [
      "eyebrow",
      "heading",
      "subheading",
      "primaryLabel",
      "primaryUrl",
      "secondaryLabel",
      "secondaryUrl",
      "alignment",
      "minHeight",
      "overlayOpacity",
      "imageFit",
    ],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
  text: {
    props: ["heading", "body", "alignment", "maxWidth"],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
  image: {
    props: ["alt", "width", "alignment", "radius", "fit"],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
  button_group: {
    props: ["heading", "buttons"],
    style: ["backgroundColor", "textColor", "paddingY", "alignment"],
  },
  spacer: { props: ["desktop", "tablet", "mobile"], style: [] },
  features: {
    props: ["eyebrow", "heading", "subheading", "layout", "columns", "items"],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
  services: {
    props: ["heading", "layout", "columns", "items"],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
  testimonials: {
    props: ["heading", "layout", "columns", "items"],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
  pricing: {
    props: ["heading", "layout", "items"],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
  faq: {
    props: ["heading", "layout", "items"],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
  contact: {
    props: ["heading", "text", "phone", "email", "address", "showForm"],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
  gallery: {
    props: ["heading", "layout", "columns", "images"],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
  stats: {
    props: ["heading", "layout", "items"],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
  team: {
    props: ["heading", "layout", "columns", "items"],
    style: ["backgroundColor", "textColor", "paddingY"],
  },
};

// These are presentation tokens, not arbitrary CSS. They are shared with the
// renderer so an AI plan can only select deliberate, reviewed treatments.
const visualStyleKeys = [
  "preset",
  "background",
  "cardStyle",
  "animation",
  "animationDelayPreset",
];
const visualPresets = new Set([
  "minimal",
  "centered-editorial",
  "split-image",
  "icon-cards",
  "bordered-grid",
  "editorial-list",
  "image-cards",
  "large-quote",
  "inline-strip",
  "featured-grid",
]);
const backgroundPresets = new Set([
  "solid",
  "soft",
  "contrast",
  "accent",
  "gradient",
  "split",
]);
const cardStylePresets = new Set(["flat", "bordered", "elevated", "glass"]);
const animationPresets = new Set([
  "none",
  "fade-up",
  "fade-in",
  "slide-left",
  "slide-right",
  "scale-in",
]);
const animationDelayPresets = new Set(["none", "short", "medium"]);
for (const [type, schema] of Object.entries(agentSectionSchemas)) {
  schema.style = [...new Set([...schema.style, ...visualStyleKeys])];
  if (type === "hero") schema.props.push("imageIntent");
}

const persistedSectionSchemas = Object.fromEntries(
  Object.entries(agentSectionSchemas).map(([type, schema]) => [
    type,
    { props: [...schema.props], style: [...schema.style] },
  ]),
) as typeof agentSectionSchemas;
persistedSectionSchemas.hero.props.push("backgroundAssetId", "sideAssetId");
persistedSectionSchemas.image.props.push("assetId", "url");
persistedSectionSchemas.contact.props.push("mapUrl");
// Existing drafts created by the original generator may carry gallery cards in
// `items`. New AI output is still restricted to the canonical `images` field.
persistedSectionSchemas.gallery.props.push("items");

const globalSectionSchemas = {
  header: {
    props: [
      "siteName",
      "logoAssetId",
      "ctaLabel",
      "ctaUrl",
      "sticky",
      "variant",
      "mobileOpen",
    ],
    style: ["backgroundColor", "textColor", "transparent", "variant"],
  },
  footer: {
    props: [
      "siteName",
      "logoAssetId",
      "description",
      "copyright",
      "variant",
      "socialLinks",
    ],
    style: ["backgroundColor", "textColor", "transparent", "variant"],
  },
} as const;
const themeKeys = [
  "preset",
  "primaryColor",
  "secondaryColor",
  "surfaceColor",
  "mutedTextColor",
  "backgroundColor",
  "textColor",
  "headingFont",
  "bodyFont",
  "radius",
  "direction",
] as const;
const themePresets = new Set([
  "minimal",
  "dark",
  "warm",
  "bold",
  "luxury",
  "wellness",
]);
const colorKeys = new Set([
  "primaryColor",
  "secondaryColor",
  "surfaceColor",
  "mutedTextColor",
  "backgroundColor",
  "textColor",
]);

function normalizePlan(value: unknown): unknown {
  const clean = (item: unknown, key = ""): unknown => {
    if (Array.isArray(item)) return item.map((child) => clean(child));
    if (!record(item)) return typeof item === "string" ? item.trim() : item;
    const output: Record<string, unknown> = {};
    for (const [childKey, child] of Object.entries(item)) {
      if (child === null || child === undefined) continue;
      // Empty optional URLs are not links. Removing them is safer than accepting a blank URL.
      if (
        typeof child === "string" &&
        !child.trim() &&
        /(url|target)$/i.test(childKey)
      ) {
        continue;
      }
      output[childKey] = clean(child, childKey);
    }
    if (key === "sections" || "type" in output) {
      if (output.style === undefined) output.style = {};
    }
    if (typeof output.slug === "string" && output.slug === "") {
      output.slug = "/";
    }
    if (record(output.theme)) {
      for (
        const color of [
          "primaryColor",
          "secondaryColor",
          "surfaceColor",
          "mutedTextColor",
          "backgroundColor",
          "textColor",
        ]
      ) {
        if (typeof output.theme[color] === "string") {
          output.theme[color] = output.theme[color].toLowerCase();
        }
      }
    }
    return output;
  };
  return clean(value);
}

const arabicFontAliases = new Map([
  ["noto sans arabic", "Noto Sans Arabic"],
  ["noto sans arabic, sans-serif", "Noto Sans Arabic"],
  ["ibm plex sans arabic", "IBM Plex Sans Arabic"],
  ["ibm plex sans arabic, sans-serif", "IBM Plex Sans Arabic"],
]);

function normalizeEditPlan(value: unknown): unknown {
  const cleanStrings = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(cleanStrings);
    if (!record(item)) return typeof item === "string" ? item.trim() : item;
    return Object.fromEntries(
      Object.entries(item).map(([key, child]) => [key, cleanStrings(child)]),
    );
  };
  const normalized = cleanStrings(value);
  if (!record(normalized) || !Array.isArray(normalized.operations)) {
    return normalized;
  }

  const normalizeValues = (container: unknown) => {
    if (!record(container)) return;
    for (const [key, child] of Object.entries(container)) {
      if ((child === null || child === "") && /(url|target)$/i.test(key)) {
        delete container[key];
        continue;
      }
      if (
        colorKeys.has(key) && typeof child === "string" &&
        /^#[0-9a-f]{6}$/i.test(child)
      ) {
        container[key] = child.toLowerCase();
      }
      if (
        (key === "headingFont" || key === "bodyFont") &&
        typeof child === "string"
      ) {
        container[key] = arabicFontAliases.get(child.toLowerCase()) || child;
      }
    }
  };
  const normalizeSection = (section: unknown) => {
    if (!record(section)) return;
    if (section.props === null || section.props === undefined) {
      section.props = {};
    }
    if (section.style === null || section.style === undefined) {
      section.style = {};
    }
    normalizeValues(section.props);
    normalizeValues(section.style);
  };

  for (const operation of normalized.operations) {
    if (!record(operation)) continue;
    for (
      const key of [
        "pageId",
        "pageRef",
        "targetPageId",
        "targetPageRef",
      ] as const
    ) {
      if (operation[key] === null) delete operation[key];
    }
    normalizeValues(operation.theme);
    if (record(operation.seo)) {
      for (const key of ["title", "description"] as const) {
        if (operation.seo[key] === null) delete operation.seo[key];
      }
    }
    if (record(operation.changes)) {
      for (const key of ["props", "style"] as const) {
        if (operation.changes[key] === null) delete operation.changes[key];
        else normalizeValues(operation.changes[key]);
        if (
          record(operation.changes[key]) &&
          !Object.keys(operation.changes[key]).length
        ) {
          delete operation.changes[key];
        }
      }
    }
    normalizeSection(operation.section);
    if (Array.isArray(operation.sections)) {
      operation.sections.forEach(normalizeSection);
    }
  }
  return normalized;
}

const sectionReference = Object.entries(agentSectionSchemas)
  .map(
    ([type, schema]) =>
      `${type}: props=[${schema.props.join(",")}], style=[${
        schema.style.join(",")
      }]`,
  )
  .join("; ");

function validateSection(section: any) {
  if (
    !record(section) ||
    Object.keys(section).some(
      (key) => !["type", "props", "style"].includes(key),
    )
  ) {
    failPlan(
      "PLAN_SECTION_INVALID",
      "Website plan section is invalid.",
      "section",
    );
  }
  if (
    !sectionTypes.has(String(section.type)) ||
    !record(section.props) ||
    !record(section.style) ||
    Object.keys(section.props).length > 40 ||
    Object.keys(section.style).length > 40 ||
    JSON.stringify(section).length > 16384 ||
    dangerous.test(JSON.stringify(section))
  ) {
    failPlan(
      "PLAN_SECTION_INVALID",
      "Website plan section is invalid.",
      "section",
    );
  }
  const schema = agentSectionSchemas[String(section.type)];
  if (
    !schema ||
    Object.keys(section.props).some((key) => !schema.props.includes(key)) ||
    Object.keys(section.style).some((key) => !schema.style.includes(key))
  ) {
    failPlan(
      "PLAN_SECTION_INVALID",
      "Website plan section uses unsupported props or styles.",
      `section.${String(section.type)}`,
    );
  }
  const style = section.style;
  if (
    (style.preset !== undefined && !visualPresets.has(String(style.preset))) ||
    (style.background !== undefined &&
      !backgroundPresets.has(String(style.background))) ||
    (style.cardStyle !== undefined &&
      !cardStylePresets.has(String(style.cardStyle))) ||
    (style.animation !== undefined &&
      !animationPresets.has(String(style.animation))) ||
    (style.animationDelayPreset !== undefined &&
      !animationDelayPresets.has(String(style.animationDelayPreset)))
  ) {
    failPlan(
      "PLAN_VISUAL_INVALID",
      "Website plan uses an unsupported visual preset.",
      `section.${String(section.type)}.style`,
    );
  }
  const items = Array.isArray(section.props.items)
    ? section.props.items
    : Array.isArray(section.props.images)
    ? section.props.images
    : [];
  const limits: Record<string, number> = {
    features: 12,
    services: 12,
    testimonials: 12,
    pricing: 4,
    faq: 20,
    gallery: 24,
    stats: 8,
    team: 16,
  };
  if (
    limits[String(section.type)] !== undefined &&
    items.length > limits[String(section.type)]
  ) {
    failPlan(
      "PLAN_SECTION_INVALID",
      "Website plan section has too many items.",
      `section.${String(section.type)}.items`,
    );
  }
  if (
    items.some(
      (item: unknown) => !record(item) || dangerous.test(JSON.stringify(item)),
    )
  ) {
    failPlan(
      "PLAN_SECTION_INVALID",
      "Website plan section contains invalid content.",
      `section.${String(section.type)}.items`,
    );
  }
  const scan = (value: unknown, key = ""): void => {
    if (typeof value === "string") {
      if (
        value.length > 4000 ||
        dangerous.test(value) ||
        (/(url|target)$/i.test(key) && !safeUrl(value))
      ) {
        failPlan(
          "PLAN_URL_INVALID",
          "Website plan contains an invalid URL or string.",
          `section.${String(section.type)}.${key}`,
        );
      }
    } else if (Array.isArray(value)) value.forEach((item) => scan(item));
    else if (record(value)) {
      Object.entries(value).forEach(([childKey, child]) =>
        scan(child, childKey)
      );
    }
  };
  scan(section.props);
  scan(section.style);
  return {
    type: String(section.type),
    props: section.props,
    style: section.style,
  };
}

function validatePlan(value: unknown): Plan {
  if (
    !record(value) ||
    value.version !== 1 ||
    !record(value.site) ||
    !Array.isArray(value.pages) ||
    !Array.isArray(value.navigation) ||
    !record(value.header) ||
    !record(value.footer) ||
    Object.keys(value).some(
      (key) =>
        ![
          "version",
          "site",
          "pages",
          "navigation",
          "header",
          "footer",
        ].includes(key),
    )
  ) {
    throw new Error("Website plan is invalid.");
  }
  if (
    value.pages.length < 1 ||
    value.pages.length > 8 ||
    value.navigation.length > 8
  ) {
    throw new Error("Website plan page count is invalid.");
  }
  const site = value.site;
  if (
    Object.keys(site).some(
      (key) => !["name", "slugSuggestion", "language", "theme"].includes(key),
    ) ||
    !record(site.theme)
  ) {
    throw new Error("Website plan site settings are invalid.");
  }
  text(site.name, 120, "site name");
  slug(site.slugSuggestion, "site slug");
  if (!["en", "ar"].includes(String(site.language))) {
    throw new Error("Website plan language is invalid.");
  }
  const theme = site.theme;
  if (
    Object.keys(theme).some(
      (key) =>
        ![
          "preset",
          "primaryColor",
          "secondaryColor",
          "surfaceColor",
          "mutedTextColor",
          "backgroundColor",
          "textColor",
          "headingFont",
          "bodyFont",
          "radius",
          "direction",
        ].includes(key),
    ) ||
    !/^#[0-9a-f]{6}$/i.test(String(theme.primaryColor)) ||
    !/^#[0-9a-f]{6}$/i.test(String(theme.secondaryColor)) ||
    !/^#[0-9a-f]{6}$/i.test(String(theme.surfaceColor)) ||
    !/^#[0-9a-f]{6}$/i.test(String(theme.mutedTextColor)) ||
    !/^#[0-9a-f]{6}$/i.test(String(theme.backgroundColor)) ||
    !/^#[0-9a-f]{6}$/i.test(String(theme.textColor)) ||
    !fontAllowlist.has(String(theme.headingFont)) ||
    !fontAllowlist.has(String(theme.bodyFont)) ||
    !["sm", "md", "lg"].includes(String(theme.radius)) ||
    !["ltr", "rtl"].includes(String(theme.direction))
  ) {
    throw new Error("Website plan theme is invalid.");
  }
  const pageIds = new Set<string>();
  let homepageCount = 0;
  let totalSections = 0;
  const paths = new Set<string>();
  const pages = value.pages.map((page: unknown) => {
    if (
      !record(page) ||
      Object.keys(page).some(
        (key) =>
          ![
            "clientId",
            "name",
            "slug",
            "isHomepage",
            "seo",
            "sections",
          ].includes(key),
      ) ||
      !record(page.seo) ||
      !Array.isArray(page.sections)
    ) {
      throw new Error("Website plan page is invalid.");
    }
    const clientId = text(page.clientId, 40, "page client ID");
    const name = text(page.name, 120, "page name");
    const path = String(page.slug);
    if (
      !/^\/$|^\/[a-z0-9](?:[a-z0-9/-]{0,190}[a-z0-9])?$/.test(path) ||
      paths.has(path) ||
      pageIds.has(clientId) ||
      typeof page.isHomepage !== "boolean" ||
      page.sections.length > 20
    ) {
      throw new Error("Website plan page is invalid.");
    }
    paths.add(path);
    pageIds.add(clientId);
    if (page.isHomepage) homepageCount += 1;
    totalSections += page.sections.length;
    return {
      clientId,
      name,
      slug: path,
      isHomepage: page.isHomepage,
      seo: {
        title: text(page.seo.title, 160, "SEO title"),
        description: text(page.seo.description, 320, "SEO description"),
      },
      sections: page.sections.map(validateSection),
    };
  });
  if (homepageCount !== 1 || totalSections > 80) {
    throw new Error("Website plan homepage or section count is invalid.");
  }
  const navigation = value.navigation.map((item: unknown) => {
    if (
      !record(item) ||
      Object.keys(item).some(
        (key) => !["label", "targetPageClientId"].includes(key),
      )
    ) {
      throw new Error("Website plan navigation is invalid.");
    }
    const targetPageClientId = text(
      item.targetPageClientId,
      40,
      "navigation target",
    );
    if (!pageIds.has(targetPageClientId)) {
      throw new Error("Website plan navigation target is invalid.");
    }
    return {
      label: text(item.label, 80, "navigation label"),
      targetPageClientId,
    };
  });
  const global = (item: Record<string, unknown>, type: "header" | "footer") => {
    if (
      Object.keys(item).some(
        (key) => !["type", "props", "style"].includes(key),
      ) ||
      item.type !== type ||
      !record(item.props) ||
      !record(item.style) ||
      dangerous.test(JSON.stringify(item))
    ) {
      throw new Error(`Website plan ${type} is invalid.`);
    }
    return { type, props: item.props, style: item.style };
  };
  return {
    version: 1,
    site: {
      name: text(site.name, 120, "site name"),
      slugSuggestion: slug(site.slugSuggestion, "site slug"),
      language: site.language,
      theme: {
        preset: text(theme.preset, 48, "theme preset"),
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        surfaceColor: theme.surfaceColor,
        mutedTextColor: theme.mutedTextColor,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        headingFont: theme.headingFont,
        bodyFont: theme.bodyFont,
        radius: theme.radius,
        direction: theme.direction,
      },
    },
    pages,
    navigation,
    header: global(value.header, "header"),
    footer: global(value.footer, "footer"),
  };
}

const systemInstruction =
  `Generate exactly one JSON Website Plan and nothing else. You are designing a premium website, not filling a form. Never publish. Never output HTML, CSS, JavaScript, markdown, image URLs, secrets, database operations, or fields not listed below.
Root keys exactly: version, site, pages, navigation, header, footer. version is 1.
site exactly: name, slugSuggestion, language, theme. language is only en or ar. theme exactly: preset, primaryColor, secondaryColor, surfaceColor, mutedTextColor, backgroundColor, textColor, headingFont, bodyFont, radius, direction. Colors are 6-digit #rrggbb. Fonts only: Inter, Manrope, Playfair Display, DM Sans, Noto Sans Arabic, IBM Plex Sans Arabic. radius only sm, md, lg. direction only ltr, rtl. Use intentional pairings: luxury=Playfair Display + Manrope, SaaS=Manrope + Inter, portfolio=DM Sans + Inter, Arabic luxury=IBM Plex Sans Arabic + Noto Sans Arabic.
Each page exactly: clientId, name, slug, isHomepage, seo, sections. Exactly one homepage has slug "/" and isHomepage true; all other slugs are lowercase paths such as "/about". seo exactly has non-empty title and description. No null values.
Every section exactly has type, props, style. props and style always exist; no id, label, metadata, or children outside props. Use only this reference: ${sectionReference}. style presets: preset is one of minimal, centered-editorial, split-image, icon-cards, bordered-grid, editorial-list, image-cards, large-quote, inline-strip, featured-grid; background is solid, soft, contrast, accent, gradient, or split; cardStyle is flat, bordered, elevated, or glass; animation is none, fade-up, fade-in, slide-left, slide-right, or scale-in; animationDelayPreset is none, short, or medium. Vary adjacent sections deliberately: do not repeat a dark/card treatment. Use imageIntent only for a specific semantic description; it is not a URL or asset ID. Do not include image, map, social, booking, or other URLs. Omit optional CTA URLs and targets instead of using empty strings.
navigation items exactly: label, targetPageClientId; targets must equal a page clientId. header exactly has type "header", props, style. footer exactly has type "footer", props, style. Be specific to the business request with concise copy, a clear primary and secondary CTA hierarchy, and a meaningful visual rhythm. Arabic requests must use Arabic content, ar, rtl, and an allowed Arabic font.`;

function classifyPlanError(error: unknown): PlanValidationError {
  if (error instanceof PlanValidationError) return error;
  const message = error instanceof Error
    ? error.message
    : "Website plan is invalid.";
  if (message.includes("theme")) {
    return new PlanValidationError("PLAN_THEME_INVALID", message, "site.theme");
  }
  if (message.includes("navigation")) {
    return new PlanValidationError("PLAN_NAV_INVALID", message, "navigation");
  }
  if (message.includes("URL")) {
    return new PlanValidationError("PLAN_URL_INVALID", message, "sections");
  }
  if (message.includes("page") || message.includes("homepage")) {
    return new PlanValidationError("PLAN_PAGE_INVALID", message, "pages");
  }
  if (message.includes("section")) {
    return new PlanValidationError(
      "PLAN_SECTION_INVALID",
      message,
      "pages.sections",
    );
  }
  return new PlanValidationError("PLAN_INVALID", message, "plan");
}

function validateGeneratedPlan(value: unknown, attempt: number): Plan {
  try {
    return validatePlan(normalizePlan(value));
  } catch (error) {
    const validationError = classifyPlanError(error);
    console.error("website_agent_plan_validation_failed", {
      attempt,
      code: validationError.code,
      reason: validationError.message,
      path: validationError.path,
    });
    throw validationError;
  }
}

type WebsiteAgentRequest = {
  prompt: string;
  businessName?: string;
  language?: string;
  styleHint?: string;
  repair?: string;
  system?: string;
  context?: Record<string, unknown>;
};

class GeminiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiProviderError";
  }
}

async function generateWithGemini({
  prompt,
  businessName,
  language,
  styleHint,
  repair,
  system = systemInstruction,
  context,
}: WebsiteAgentRequest) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Website AI is not configured.");
  const overrideModel = Deno.env.get("GEMINI_MODEL");
  let model = overrideModel || "gemini-3.5-flash-lite";
  const controller = new AbortController();
  // A bounded 40 seconds accommodates one valid structured response without
  // leaving a request open indefinitely. Context is scoped before this call.
  const timeout = setTimeout(() => controller.abort(), 40_000);
  const request = (requestedModel: string) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${
        encodeURIComponent(requestedModel)
      }:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify({
                    request: prompt,
                    businessName: businessName || undefined,
                    language,
                    styleHint,
                    repair,
                    context,
                  }),
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 6000,
          },
        }),
      },
    );
  let response: Response;
  try {
    response = await request(model);
    if (response.status === 404 && !overrideModel) {
      model = "gemini-3.5-flash";
      response = await request(model);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GeminiProviderError(
        "Website AI took too long to respond. Please try again.",
      );
    }
    throw new GeminiProviderError(
      "Website AI is temporarily unavailable. Please try again later.",
    );
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    let providerCode = "unknown";
    try {
      const providerPayload = await response.clone().json();
      if (typeof providerPayload?.error?.status === "string") {
        providerCode = providerPayload.error.status;
      }
    } catch {
      /* Do not log provider response bodies. */
    }
    console.error("website_agent_gemini_request_failed", {
      model,
      status: response.status,
      provider_code: providerCode,
    });
  }
  if (response.status === 429) {
    throw new GeminiProviderError(
      "Gemini free-tier usage limit reached. Please try again later.",
    );
  }
  if (response.status === 404) {
    throw new GeminiProviderError("The configured AI model is unavailable.");
  }
  if (response.status === 400) {
    throw new GeminiProviderError(
      "Website AI configuration is incompatible with the selected model.",
    );
  }
  if ([401, 403].includes(response.status)) {
    throw new GeminiProviderError("Website AI is not configured correctly.");
  }
  if (!response.ok) {
    throw new GeminiProviderError(
      "Website AI is temporarily unavailable. Please try again later.",
    );
  }
  const payload = await response.json();
  const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof content !== "string" || content.length > 262144) {
    throw new Error("Website AI returned an invalid response.");
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Website AI returned an invalid response.");
  }
}

const websiteAgentModel = {
  generateStructuredPlan: generateWithGemini,
};

async function authorize(admin: any, userId: string, organizationId: string) {
  await requireBillingAdmin(admin, userId, organizationId);
  const entitlements: any = await getOrganizationEntitlements(
    admin,
    organizationId,
  );
  if (!entitlements.access_active || !entitlements.website_builder_access) {
    throw new Error("Website Builder is not available for this organization.");
  }
  const { data: service } = await admin
    .from("organization_services")
    .select("service_key")
    .eq("organization_id", organizationId)
    .eq("service_key", "website_builder")
    .eq("status", "active")
    .maybeSingle();
  if (!service) {
    throw new Error(
      "Activate Website Builder in Services before using Website AI.",
    );
  }
}

const editOperations = new Set([
  "add_section",
  "update_section",
  "remove_section",
  "move_section",
  "duplicate_section",
  "update_site_theme",
  "update_site_metadata",
  "update_global_header",
  "update_global_footer",
  "create_page",
  "rename_page",
  "update_page_slug",
  "update_page_seo",
  "add_navigation_item",
  "update_navigation_item",
  "remove_navigation_item",
]);
const safeJson = (value: unknown) => JSON.stringify(value ?? null);
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => key in value);
const hasOnly = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key));
const integer = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= min &&
  value <= max;
const editFailure = (code: string, path: string) =>
  failPlan(code, "Website edit plan is invalid.", path);

function validateEditStyle(
  style: Record<string, unknown>,
  path: string,
  code = "AI_EDIT_SECTION_INVALID",
) {
  for (const [key, value] of Object.entries(style)) {
    if (
      (["backgroundColor", "textColor"].includes(key) &&
        (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value))) ||
      (key === "paddingY" && !integer(value, 0, 240)) ||
      (key === "alignment" &&
        !["left", "center", "right"].includes(String(value))) ||
      (key === "preset" && !visualPresets.has(String(value))) ||
      (key === "background" && !backgroundPresets.has(String(value))) ||
      (key === "cardStyle" && !cardStylePresets.has(String(value))) ||
      (key === "animation" && !animationPresets.has(String(value))) ||
      (key === "animationDelayPreset" &&
        !animationDelayPresets.has(String(value)))
    ) editFailure(code, `${path}.${key}`);
  }
}

function validateEditSection(
  section: unknown,
  schema: { props: string[]; style: string[] } | undefined,
  path: string,
) {
  if (
    !record(section) || !exactKeys(section, ["type", "props", "style"]) ||
    typeof section.type !== "string" || !sectionTypes.has(section.type) ||
    !record(section.props) || !record(section.style) || !schema ||
    Object.keys(section.props).length > 40 ||
    Object.keys(section.style).length > 40 ||
    safeJson(section).length > 16384 || dangerous.test(safeJson(section))
  ) {
    editFailure("AI_EDIT_SECTION_INVALID", path);
  }
  const candidate = section as Record<string, any>;
  const allowedSchema = schema as { props: string[]; style: string[] };
  const invalidProp = Object.keys(candidate.props).find((key) =>
    !allowedSchema.props.includes(key)
  );
  if (invalidProp) {
    editFailure("AI_EDIT_SECTION_INVALID", `${path}.props.${invalidProp}`);
  }
  const invalidStyle = Object.keys(candidate.style).find((key) =>
    !allowedSchema.style.includes(key)
  );
  if (invalidStyle) {
    editFailure("AI_EDIT_SECTION_INVALID", `${path}.style.${invalidStyle}`);
  }
  validateEditStyle(candidate.style, `${path}.style`);

  const listKey = candidate.type === "gallery"
    ? (Array.isArray(candidate.props.images) ? "images" : "items")
    : "items";
  const items = candidate.props[listKey];
  const limits: Record<string, number> = {
    features: 12,
    services: 12,
    testimonials: 12,
    pricing: 4,
    faq: 20,
    gallery: 24,
    stats: 8,
    team: 16,
  };
  if (
    items !== undefined && (!Array.isArray(items) ||
      (limits[candidate.type] !== undefined &&
        items.length > limits[candidate.type]) ||
      items.some((item) => !record(item) || dangerous.test(safeJson(item))))
  ) {
    editFailure("AI_EDIT_SECTION_INVALID", `${path}.props.${listKey}`);
  }
  const scan = (item: unknown, itemPath: string, key = "") => {
    if (typeof item === "string") {
      if (
        item.length > 4000 || dangerous.test(item) ||
        (/(url|target)$/i.test(key) && !safeUrl(item))
      ) {
        editFailure("AI_EDIT_SECTION_INVALID", itemPath);
      }
    } else if (Array.isArray(item)) {
      item.forEach((child, index) => scan(child, `${itemPath}.${index}`));
    } else if (record(item)) {
      Object.entries(item).forEach(([childKey, child]) =>
        scan(child, `${itemPath}.${childKey}`, childKey)
      );
    }
  };
  scan(candidate.props, `${path}.props`);
  scan(candidate.style, `${path}.style`);
}

function validateThemeState(
  theme: unknown,
  path: string,
  requireCore: boolean,
) {
  if (
    !record(theme) || !hasOnly(theme, [...themeKeys]) ||
    !Object.keys(theme).length
  ) {
    editFailure("AI_EDIT_INVALID_THEME", path);
  }
  const candidate = theme as Record<string, unknown>;
  if (
    requireCore &&
    !["primaryColor", "backgroundColor", "textColor", "radius"].every((key) =>
      key in candidate
    )
  ) {
    editFailure("AI_EDIT_INVALID_THEME", path);
  }
  for (const [key, value] of Object.entries(candidate)) {
    if (
      (colorKeys.has(key) &&
        (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value))) ||
      (key === "preset" && !themePresets.has(String(value))) ||
      (["headingFont", "bodyFont"].includes(key) &&
        !fontAllowlist.has(String(value))) ||
      (key === "radius" && !["sm", "md", "lg"].includes(String(value))) ||
      (key === "direction" && !["ltr", "rtl"].includes(String(value)))
    ) editFailure("AI_EDIT_INVALID_THEME", `${path}.${key}`);
  }
}

function validateGlobalSectionState(
  section: unknown,
  type: "header" | "footer",
  path: string,
) {
  const schema = globalSectionSchemas[type];
  if (
    !record(section) || !record(section.props) || !record(section.style) ||
    section.type !== type || safeJson(section).length > 16384 ||
    dangerous.test(safeJson(section))
  ) {
    editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", path);
  }
  const candidate = section as Record<string, any>;
  const invalidProp = Object.keys(candidate.props).find((key) =>
    !(schema.props as readonly string[]).includes(key)
  );
  const invalidStyle = Object.keys(candidate.style).find((key) =>
    !(schema.style as readonly string[]).includes(key)
  );
  if (invalidProp) {
    editFailure(
      "AI_EDIT_INVALID_GLOBAL_SECTION",
      `${path}.props.${invalidProp}`,
    );
  }
  if (invalidStyle) {
    editFailure(
      "AI_EDIT_INVALID_GLOBAL_SECTION",
      `${path}.style.${invalidStyle}`,
    );
  }
  const props = candidate.props;
  const style = candidate.style;
  if (
    props.siteName !== undefined &&
    (typeof props.siteName !== "string" || !props.siteName.trim() ||
      props.siteName.length > 120)
  ) editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", `${path}.props.siteName`);
  if (
    props.logoAssetId !== undefined && props.logoAssetId !== null &&
    !uuid(props.logoAssetId)
  ) editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", `${path}.props.logoAssetId`);
  if (
    style.backgroundColor !== undefined &&
    (typeof style.backgroundColor !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(style.backgroundColor))
  ) {
    editFailure(
      "AI_EDIT_INVALID_GLOBAL_SECTION",
      `${path}.style.backgroundColor`,
    );
  }
  if (
    style.textColor !== undefined &&
    (typeof style.textColor !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(style.textColor))
  ) editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", `${path}.style.textColor`);
  if (
    style.transparent !== undefined && typeof style.transparent !== "boolean"
  ) {
    editFailure(
      "AI_EDIT_INVALID_GLOBAL_SECTION",
      `${path}.style.transparent`,
    );
  }
  if (type === "header") {
    if (
      props.ctaLabel !== undefined &&
      (typeof props.ctaLabel !== "string" || props.ctaLabel.length > 80)
    ) editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", `${path}.props.ctaLabel`);
    if (props.ctaUrl !== undefined && !safeUrl(props.ctaUrl)) {
      editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", `${path}.props.ctaUrl`);
    }
    if (props.sticky !== undefined && typeof props.sticky !== "boolean") {
      editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", `${path}.props.sticky`);
    }
    if (
      props.mobileOpen !== undefined && typeof props.mobileOpen !== "boolean"
    ) {
      editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", `${path}.props.mobileOpen`);
    }
    if (
      (props.variant !== undefined && props.variant !== "logo-left") ||
      (style.variant !== undefined && style.variant !== "logo-left")
    ) {
      editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", `${path}.variant`);
    }
  } else {
    if (
      props.description !== undefined &&
      (typeof props.description !== "string" || props.description.length > 1000)
    ) {
      editFailure(
        "AI_EDIT_INVALID_GLOBAL_SECTION",
        `${path}.props.description`,
      );
    }
    if (
      props.copyright !== undefined &&
      (typeof props.copyright !== "string" || props.copyright.length > 200)
    ) editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", `${path}.props.copyright`);
    if (
      (props.variant !== undefined && props.variant !== "columns") ||
      (style.variant !== undefined && style.variant !== "columns")
    ) editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", `${path}.variant`);
    if (
      props.socialLinks !== undefined &&
      (!Array.isArray(props.socialLinks) || props.socialLinks.length)
    ) {
      editFailure(
        "AI_EDIT_INVALID_GLOBAL_SECTION",
        `${path}.props.socialLinks`,
      );
    }
  }
}

function validateSeo(seo: unknown, path: string) {
  if (
    !record(seo) || !hasOnly(seo, ["title", "description"]) ||
    !Object.keys(seo).length
  ) editFailure("AI_EDIT_INVALID_SEO", path);
  const candidate = seo as Record<string, unknown>;
  if (
    candidate.title !== undefined &&
    (typeof candidate.title !== "string" || !candidate.title.trim() ||
      candidate.title.length > 160)
  ) editFailure("AI_EDIT_INVALID_SEO", `${path}.title`);
  if (
    candidate.description !== undefined &&
    (typeof candidate.description !== "string" ||
      !candidate.description.trim() ||
      candidate.description.length > 320)
  ) editFailure("AI_EDIT_INVALID_SEO", `${path}.description`);
}

function validateEditPlan(value: any, context: any): Plan {
  if (
    !record(value) || !exactKeys(value, ["version", "summary", "operations"]) ||
    value.version !== 1 ||
    typeof value.summary !== "string" || !value.summary.trim() ||
    value.summary.length > 500 ||
    !Array.isArray(value.operations) || value.operations.length < 1 ||
    value.operations.length > 30 || dangerous.test(safeJson(value))
  ) {
    editFailure("AI_EDIT_INVALID_PLAN", "plan");
  }
  const createdRefs = new Set<string>();
  const validPageTarget = (
    operation: Record<string, unknown>,
    path: string,
  ) => {
    const pageId = operation.pageId;
    const pageRef = operation.pageRef;
    if ((typeof pageId === "string") === (typeof pageRef === "string")) {
      editFailure("AI_EDIT_INVALID_TARGET", path);
    }
    if (typeof pageId === "string" && !context.pageIds.has(pageId)) {
      editFailure("AI_EDIT_INVALID_TARGET", path);
    }
    if (typeof pageRef === "string" && !createdRefs.has(pageRef)) {
      editFailure("AI_EDIT_INVALID_TARGET", path);
    }
  };
  let createdPageCount = 0;
  const operations = (value.operations as any[]).map(
    (raw: any, index: number) => {
      const path = `operations.${index}`;
      if (
        !record(raw) || typeof raw.op !== "string" ||
        !editOperations.has(raw.op)
      ) editFailure("AI_EDIT_UNSUPPORTED_OPERATION", path);
      const operation: any = raw;
      const op = operation.op as string;
      if (op === "create_page") {
        if (
          !exactKeys(operation, [
            "op",
            "tempRef",
            "name",
            "slug",
            "seo",
            "sections",
          ]) || typeof operation.tempRef !== "string" ||
          !/^new:[a-z0-9][a-z0-9_-]{0,60}$/.test(operation.tempRef) ||
          createdRefs.has(operation.tempRef) ||
          typeof operation.name !== "string" || !operation.name.trim() ||
          operation.name.length > 120 ||
          typeof operation.slug !== "string" ||
          !/^\/[a-z0-9](?:[a-z0-9/-]{0,190}[a-z0-9])?$/.test(operation.slug) ||
          !Array.isArray(operation.sections) ||
          operation.sections.length > 100 ||
          context.pageIds.size + ++createdPageCount > 8
        ) editFailure("AI_EDIT_INVALID_PAGE", path);
        validateSeo(operation.seo, `${path}.seo`);
        createdRefs.add(operation.tempRef);
        operation.sections.forEach((section: any, sectionIndex: number) => {
          const schema = record(section)
            ? agentSectionSchemas[String(section.type)]
            : undefined;
          validateEditSection(
            section,
            schema,
            `${path}.sections.${sectionIndex}`,
          );
        });
      } else if (op === "update_site_theme") {
        if (!exactKeys(operation, ["op", "theme"])) {
          editFailure(
            "AI_EDIT_INVALID_THEME",
            path,
          );
        }
        validateThemeState(operation.theme, `${path}.theme`, false);
        for (const theme of context.themes) {
          validateThemeState(
            { ...theme, ...operation.theme },
            `${path}.theme`,
            true,
          );
        }
      } else if (op === "update_site_metadata") {
        if (
          !exactKeys(operation, ["op", "changes"]) ||
          !record(operation.changes) ||
          !hasOnly(operation.changes, ["name", "language"]) ||
          !Object.keys(operation.changes).length
        ) editFailure("AI_EDIT_INVALID_METADATA", path);
        if (
          operation.changes.name !== undefined &&
          (typeof operation.changes.name !== "string" ||
            !operation.changes.name.trim() ||
            operation.changes.name.length > 120)
        ) editFailure("AI_EDIT_INVALID_METADATA", `${path}.changes.name`);
        if (
          operation.changes.language !== undefined &&
          !["en", "ar"].includes(operation.changes.language)
        ) editFailure("AI_EDIT_INVALID_METADATA", `${path}.changes.language`);
      } else if (
        op === "update_global_header" || op === "update_global_footer"
      ) {
        const type = op === "update_global_header" ? "header" : "footer";
        if (
          !exactKeys(operation, ["op", "changes"]) ||
          !record(operation.changes) ||
          !hasOnly(operation.changes, ["props", "style"]) ||
          !Object.keys(operation.changes).length
        ) editFailure("AI_EDIT_INVALID_GLOBAL_SECTION", path);
        if (
          operation.changes.props !== undefined &&
          !record(operation.changes.props)
        ) {
          editFailure(
            "AI_EDIT_INVALID_GLOBAL_SECTION",
            `${path}.changes.props`,
          );
        }
        if (
          operation.changes.style !== undefined &&
          !record(operation.changes.style)
        ) {
          editFailure(
            "AI_EDIT_INVALID_GLOBAL_SECTION",
            `${path}.changes.style`,
          );
        }
        const current = context.globalSections[type];
        validateGlobalSectionState(
          {
            ...current,
            props: { ...current?.props, ...(operation.changes.props || {}) },
            style: { ...current?.style, ...(operation.changes.style || {}) },
          },
          type,
          `${path}.changes`,
        );
      } else if (op === "add_navigation_item") {
        if (
          !hasOnly(operation, [
            "op",
            "label",
            "index",
            "targetPageId",
            "targetPageRef",
          ]) || Object.keys(operation).length !== 4 ||
          typeof operation.label !== "string" || !operation.label.trim() ||
          operation.label.length > 80 ||
          !integer(operation.index, 0, context.navigationIds.size) ||
          ((typeof operation.targetPageId === "string") ===
            (typeof operation.targetPageRef === "string"))
        ) editFailure("AI_EDIT_INVALID_NAVIGATION", path);
        if (
          typeof operation.targetPageId === "string" &&
          !context.pageIds.has(operation.targetPageId)
        ) editFailure("AI_EDIT_NAV_TARGET_INVALID", path);
        if (
          typeof operation.targetPageRef === "string" &&
          !createdRefs.has(operation.targetPageRef)
        ) editFailure("AI_EDIT_NAV_TARGET_INVALID", path);
      } else if (op === "update_navigation_item") {
        if (
          !exactKeys(operation, ["op", "navigationId", "changes"]) ||
          typeof operation.navigationId !== "string" ||
          !context.navigationIds.has(operation.navigationId) ||
          !record(operation.changes) ||
          !hasOnly(operation.changes, [
            "label",
            "index",
            "targetPageId",
            "targetPageRef",
          ]) || !Object.keys(operation.changes).length
        ) editFailure("AI_EDIT_INVALID_NAVIGATION", path);
        if (
          operation.changes.label !== undefined &&
          (typeof operation.changes.label !== "string" ||
            !operation.changes.label.trim() ||
            operation.changes.label.length > 80)
        ) editFailure("AI_EDIT_INVALID_NAVIGATION", `${path}.changes.label`);
        if (
          operation.changes.index !== undefined &&
          !integer(
            operation.changes.index,
            0,
            Math.max(0, context.navigationIds.size - 1),
          )
        ) editFailure("AI_EDIT_INVALID_NAVIGATION", `${path}.changes.index`);
        if (
          operation.changes.targetPageId !== undefined &&
          (!context.pageIds.has(operation.changes.targetPageId) ||
            operation.changes.targetPageRef !== undefined)
        ) editFailure("AI_EDIT_NAV_TARGET_INVALID", path);
        if (
          operation.changes.targetPageRef !== undefined &&
          (!createdRefs.has(operation.changes.targetPageRef) ||
            operation.changes.targetPageId !== undefined)
        ) editFailure("AI_EDIT_NAV_TARGET_INVALID", path);
      } else if (op === "remove_navigation_item") {
        if (
          !exactKeys(operation, ["op", "navigationId"]) ||
          typeof operation.navigationId !== "string" ||
          !context.navigationIds.has(operation.navigationId)
        ) editFailure("AI_EDIT_INVALID_NAVIGATION", path);
      } else {
        validPageTarget(operation, path);
        if (op === "add_section") {
          if (
            !hasOnly(operation, [
              "op",
              "pageId",
              "pageRef",
              "index",
              "section",
            ]) || !integer(operation.index, 0, 100) ||
            !record(operation.section)
          ) editFailure("AI_EDIT_INVALID_SECTION", path);
          validateEditSection(
            operation.section,
            agentSectionSchemas[String(operation.section.type)],
            `${path}.section`,
          );
        } else if (op === "update_section") {
          if (
            !hasOnly(operation, [
              "op",
              "pageId",
              "pageRef",
              "sectionId",
              "changes",
            ]) || typeof operation.sectionId !== "string" ||
            !context.sectionIds.has(operation.sectionId) ||
            !record(operation.changes) ||
            !hasOnly(operation.changes, ["props", "style"]) ||
            !Object.keys(operation.changes).length
          ) editFailure("AI_EDIT_INVALID_SECTION", path);
          const current = context.sections.get(operation.sectionId);
          if (
            !current || typeof operation.pageId !== "string" ||
            current.pageId !== operation.pageId
          ) editFailure("AI_EDIT_INVALID_TARGET", path);
          const editableSchema = agentSectionSchemas[current.type];
          if (
            operation.changes.props !== undefined &&
            !record(operation.changes.props)
          ) editFailure("AI_EDIT_SECTION_INVALID", `${path}.changes.props`);
          if (
            operation.changes.style !== undefined &&
            !record(operation.changes.style)
          ) editFailure("AI_EDIT_SECTION_INVALID", `${path}.changes.style`);
          const invalidProp = Object.keys(operation.changes.props || {}).find((
            key,
          ) => !editableSchema?.props.includes(key));
          const invalidStyle = Object.keys(operation.changes.style || {}).find((
            key,
          ) => !editableSchema?.style.includes(key));
          if (invalidProp) {
            editFailure(
              "AI_EDIT_SECTION_INVALID",
              `${path}.changes.props.${invalidProp}`,
            );
          }
          if (invalidStyle) {
            editFailure(
              "AI_EDIT_SECTION_INVALID",
              `${path}.changes.style.${invalidStyle}`,
            );
          }
          validateEditSection(
            {
              type: current.type,
              props: { ...current.props, ...(operation.changes.props || {}) },
              style: { ...current.style, ...(operation.changes.style || {}) },
            },
            persistedSectionSchemas[current.type],
            `${path}.changes`,
          );
        } else if (op === "remove_section") {
          if (
            !hasOnly(operation, ["op", "pageId", "pageRef", "sectionId"]) ||
            typeof operation.sectionId !== "string" ||
            !context.sectionIds.has(operation.sectionId) ||
            context.sections.get(operation.sectionId)?.pageId !==
              operation.pageId
          ) editFailure("AI_EDIT_INVALID_SECTION", path);
        } else if (op === "move_section" || op === "duplicate_section") {
          if (
            !hasOnly(operation, [
              "op",
              "pageId",
              "pageRef",
              "sectionId",
              "index",
            ]) || typeof operation.sectionId !== "string" ||
            !context.sectionIds.has(operation.sectionId) ||
            context.sections.get(operation.sectionId)?.pageId !==
              operation.pageId ||
            !integer(operation.index, 0, 100)
          ) editFailure("AI_EDIT_INVALID_SECTION", path);
        } else if (op === "rename_page") {
          if (
            !hasOnly(operation, ["op", "pageId", "pageRef", "name"]) ||
            typeof operation.name !== "string" || !operation.name.trim() ||
            operation.name.length > 120
          ) editFailure("AI_EDIT_INVALID_PAGE", path);
        } else if (op === "update_page_slug") {
          if (
            !hasOnly(operation, ["op", "pageId", "pageRef", "slug"]) ||
            typeof operation.slug !== "string" ||
            !/^\/$|^\/[a-z0-9](?:[a-z0-9/-]{0,190}[a-z0-9])?$/.test(
              operation.slug,
            ) || operation.slug.includes("//") || /[?#]/.test(operation.slug)
          ) editFailure("AI_EDIT_INVALID_PAGE", path);
        } else if (op === "update_page_seo") {
          if (
            !hasOnly(operation, ["op", "pageId", "pageRef", "seo"])
          ) editFailure("AI_EDIT_INVALID_SEO", path);
          validateSeo(operation.seo, `${path}.seo`);
        }
      }
      return operation;
    },
  );
  return { version: 1, summary: value.summary.trim(), operations };
}

const editOperationReference =
  `Return only JSON with root keys version, summary, operations. version=1; summary is 1-500 characters; 1-30 operations. Never publish, release, deploy, HTML, CSS, JavaScript, arbitrary code, assets, billing, auth, or integrations. Use only IDs supplied in context. Every operation must contain exactly the documented fields and no extras.
Operations: add_section {op,pageId|pageRef,index,section}; update_section {op,pageId|pageRef,sectionId,changes:{props?,style?}}; remove_section {op,pageId|pageRef,sectionId}; move_section {op,pageId|pageRef,sectionId,index}; duplicate_section {op,pageId|pageRef,sectionId,index}; update_site_theme {op,theme}; update_site_metadata {op,changes:{name?,language?}} where language is only en or ar (never locale or direction); update_global_header/update_global_footer {op,changes:{props?,style?}}; create_page {op,tempRef,name,slug,seo:{title?,description?},sections}; rename_page {op,pageId|pageRef,name}; update_page_slug {op,pageId|pageRef,slug}; update_page_seo {op,pageId|pageRef,seo:{title?,description?}}; add_navigation_item {op,label,index,targetPageId|targetPageRef}; update_navigation_item {op,navigationId,changes:{label?,index?,targetPageId?,targetPageRef?}}; remove_navigation_item {op,navigationId}. A new page tempRef must be new:lowercase_name and can be referenced only after its create_page operation. Section has exactly type,props,style. Allowed new-section types and keys: ${sectionReference}. For an existing section, use only its context.allowedEditableProps and context.allowedEditableStyles; never invent generic text, content, label, or items keys. Header props=[${
    globalSectionSchemas.header.props.join(",")
  }], header style=[${
    globalSectionSchemas.header.style.join(",")
  }]. Footer props=[${
    globalSectionSchemas.footer.props.join(",")
  }], footer style=[${
    globalSectionSchemas.footer.style.join(",")
  }]. Theme keys=[${
    themeKeys.join(",")
  }]; preset is minimal,dark,warm,bold,luxury,or wellness; fonts are ${
    [...fontAllowlist].join(",")
  }; radius is sm,md,or lg; direction is ltr or rtl; colors are six-digit hex. Do not mutate media IDs. Translate navigation labels only with update_navigation_item.`;

function editSystemInstruction() {
  return `You create safe draft-only Website Builder edit proposals. ${editOperationReference} Existing content context and target-specific allowed keys are authoritative. Preserve fields that were not requested by emitting only changed keys. If the request cannot be represented safely, do not invent an operation. Do not claim publication. Arabic requests use Arabic content, update_site_metadata changes.language="ar", update_site_theme theme.direction="rtl", and allowed Arabic fonts. Return the entire plan, never a partial fragment.`;
}

async function loadEditContext(
  admin: any,
  organizationId: string,
  siteId: string,
  currentPageId?: string,
  scope: "page" | "site" = "site",
) {
  const { data: site, error: siteError } = await admin.from("website_sites")
    .select("id,name,default_locale,global_version,global_sections")
    .eq("id", siteId).eq("organization_id", organizationId).is(
      "archived_at",
      null,
    ).maybeSingle();
  if (siteError) throw siteError;
  if (!site) throw new Error("Website plan not found.");
  let pageQuery = admin.from("website_pages").select(
      "id,name,slug,seo_title,seo_description,draft_version,updated_at,draft_document",
    ).eq("organization_id", organizationId).eq("site_id", siteId);
  if (scope === "page" && currentPageId) pageQuery = pageQuery.eq("id", currentPageId);
  const { data: pages, error: pagesError } = await pageQuery.order("sort_order");
  if (pagesError) throw pagesError;
  const pageRows = pages || [];
  const globals = record(site.global_sections) ? site.global_sections : {};
  const navigation = Array.isArray(globals.navigation)
    ? globals.navigation
    : [];
  const sections = pageRows.flatMap((page: any) =>
    Array.isArray(page.draft_document?.sections)
      ? page.draft_document.sections.map((section: any) => ({
        pageId: page.id,
        id: section.id,
        type: section.type,
        props: section.props,
        style: section.style,
        allowedEditableProps:
          agentSectionSchemas[String(section.type)]?.props || [],
        allowedEditableStyles:
          agentSectionSchemas[String(section.type)]?.style || [],
      }))
      : []
  );
  const context = {
    site: {
      id: site.id,
      name: site.name,
      language: site.default_locale,
      globalVersion: site.global_version,
      metadataEditableKeys: ["name", "language"],
      themeEditableKeys: [...themeKeys],
      header: globals.header
        ? {
          ...globals.header,
          allowedEditableProps: globalSectionSchemas.header.props,
          allowedEditableStyles: globalSectionSchemas.header.style,
        }
        : null,
      footer: globals.footer
        ? {
          ...globals.footer,
          allowedEditableProps: globalSectionSchemas.footer.props,
          allowedEditableStyles: globalSectionSchemas.footer.style,
        }
        : null,
      navigation,
    },
    pages: pageRows.map((page: any) => ({
      id: page.id,
      name: page.name,
      slug: page.slug,
      seo: { title: page.seo_title, description: page.seo_description },
      draftVersion: page.draft_version,
      theme: page.draft_document?.theme || {},
      sections: sections.filter((section: any) => section.pageId === page.id)
        .map(({ pageId: _pageId, ...section }: any) => section),
    })),
  };
  const baseVersions = {
    global_version: site.global_version,
    pages: Object.fromEntries(
      pageRows.map((page: any) => [page.id, page.draft_version]),
    ),
    page_updated_at: Object.fromEntries(
      pageRows.map((page: any) => [page.id, page.updated_at]),
    ),
  };
  return {
    context,
    baseVersions,
    pageIds: new Set(pageRows.map((page: any) => page.id)),
    sectionIds: new Set(sections.map((section: any) => section.id)),
    sections: new Map(sections.map((section: any) => [section.id, section])),
    sectionTypes: new Map(
      sections.map((section: any) => [section.id, section.type]),
    ),
    navigationIds: new Set(
      navigation.map((item: any) => item?.id).filter(Boolean),
    ),
    globalSections: {
      header: globals.header ?? null,
      footer: globals.footer ?? null,
    },
    themes: pageRows.map((page: any) =>
      record(page.draft_document?.theme) ? page.draft_document.theme : {}
    ),
  };
}

function editRequestScope(instruction: string): "page" | "site" {
  return /\b(arabic|rtl|whole site|all pages|every page|navigation|add (an )?(about|new) page|site theme|site name|language)\b/i
    .test(instruction)
    ? "site"
    : "page";
}

function editValidationMetadata(
  error: PlanValidationError,
  candidate: unknown,
) {
  const match = /^operations\.(\d+)/.exec(error.path);
  const operationIndex = match ? Number(match[1]) : null;
  const operation = operationIndex === null || !record(candidate) ||
      !Array.isArray(candidate.operations)
    ? undefined
    : candidate.operations[operationIndex];
  return {
    operationIndex,
    operationType: record(operation) && typeof operation.op === "string"
      ? operation.op
      : null,
  };
}

function editOperationContract(
  error: PlanValidationError,
  candidate: unknown,
  context: any,
) {
  const { operationIndex, operationType } = editValidationMetadata(
    error,
    candidate,
  );
  const operation = operationIndex === null || !record(candidate) ||
      !Array.isArray(candidate.operations)
    ? undefined
    : candidate.operations[operationIndex];
  if (operationType === "update_section" && record(operation)) {
    const section = context.sections.get(operation.sectionId);
    if (section) {
      const schema = agentSectionSchemas[section.type];
      return `Target section type is ${section.type}. Allowed changes.props keys: ${
        schema.props.join(", ")
      }. Allowed changes.style keys: ${schema.style.join(", ")}.`;
    }
  }
  if (operationType === "update_global_header") {
    return `Allowed header props: ${
      globalSectionSchemas.header.props.join(", ")
    }. Allowed header style: ${globalSectionSchemas.header.style.join(", ")}.`;
  }
  if (operationType === "update_global_footer") {
    return `Allowed footer props: ${
      globalSectionSchemas.footer.props.join(", ")
    }. Allowed footer style: ${globalSectionSchemas.footer.style.join(", ")}.`;
  }
  if (operationType === "update_site_metadata") {
    return "Allowed metadata changes are name and language; language is only en or ar. Locale and direction are not metadata fields.";
  }
  if (operationType === "update_site_theme") {
    return `Allowed theme keys: ${themeKeys.join(", ")}.`;
  }
  return editOperationReference;
}

function editRepairInstruction(
  error: PlanValidationError,
  candidate: unknown,
  context: any,
) {
  const { operationIndex, operationType } = editValidationMetadata(
    error,
    candidate,
  );
  const operationLabel = operationIndex === null
    ? "The plan"
    : `Operation ${operationIndex + 1}${
      operationType ? ` (${operationType})` : ""
    }`;
  return `${operationLabel} failed ${error.code} at ${error.path}. ${
    editOperationContract(error, candidate, context)
  } Return the ENTIRE corrected edit plan. Keep valid operations, correct or remove only the invalid requested change, use only supplied IDs, and never add publish/release operations.`;
}

function publicError(error: unknown, operation = "") {
  const message = error instanceof Error ? error.message : "";
  const safeMessages = new Set([
    "Missing Authorization header",
    "Invalid authentication token",
    "Only workspace owners and administrators can manage billing",
    "Website Builder is not available for this organization.",
    "Activate Website Builder in Services before using Website AI.",
    "Website AI is not configured.",
    "Website AI is not configured correctly.",
    "Website AI is temporarily unavailable. Please try again later.",
    "Gemini free-tier usage limit reached. Please try again later.",
    "The configured AI model is unavailable.",
    "Website AI configuration is incompatible with the selected model.",
    "Website AI took too long to respond. Please try again.",
    "This website plan has already been applied.",
    "This website plan has expired. Generate a new plan.",
    "Website plan not found.",
    "This website changed after the AI suggestion was created. Generate the suggestion again.",
    "This AI suggestion expired. Generate it again.",
    "That change isn't supported by the Website Builder yet.",
    "No effective change was produced.",
    "AI changes could not be verified. Nothing was published.",
  ]);
  if (safeMessages.has(message)) return message;
  return operation === "generateEditPlan"
    ? "We couldn't generate a valid edit plan. Please try again."
    : "We couldn't generate a valid site structure. Please try again.";
}

export const websiteAgentHandler = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  let operation = "";
  let organizationId = "";
  try {
    if (req.method !== "POST") {
      return json({ success: false, error: "Method not allowed." }, 405);
    }
    const { admin, user } = await authenticate(req);
    const body = await req.json();
    operation = String(body.operation || "");
    organizationId = String(body.organizationId || "");
    if (!uuid(organizationId)) throw new Error("Website plan not found.");
    await authorize(admin, user.id, organizationId);
    if (operation === "generatePlan") {
      const prompt = text(body.prompt, 6000, "prompt");
      const businessName = body.businessName
        ? text(body.businessName, 120, "business name")
        : "";
      const language = ["auto", "en", "ar"].includes(String(body.language))
        ? String(body.language)
        : "auto";
      const styleHint = styleHints.has(String(body.styleHint))
        ? String(body.styleHint)
        : "";
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await admin
        .from("website_agent_plans")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id)
        .gte("created_at", since);
      if ((count || 0) >= 3) {
        return json(
          {
            success: false,
            error:
              "Please wait a moment before generating another website plan.",
          },
          429,
        );
      }
      let plan: Plan;
      try {
        plan = validateGeneratedPlan(
          await websiteAgentModel.generateStructuredPlan({
            prompt,
            businessName,
            language,
            styleHint,
          }),
          1,
        );
      } catch (firstError) {
        if (firstError instanceof GeminiProviderError) throw firstError;
        const validationError = classifyPlanError(firstError);
        plan = validateGeneratedPlan(
          await websiteAgentModel.generateStructuredPlan({
            prompt,
            businessName,
            language,
            styleHint,
            repair:
              `Previous output failed ${validationError.code} at ${validationError.path}: ${
                validationError.message.slice(0, 300)
              }. Return the entire corrected JSON using every exact schema constraint in the system instruction.`,
          }),
          2,
        );
      }
      const { data, error } = await admin
        .from("website_agent_plans")
        .insert({
          organization_id: organizationId,
          created_by: user.id,
          prompt,
          plan_json: plan,
        })
        .select("id,expires_at,plan_json")
        .single();
      if (error) throw error;
      await admin.from("audit_logs").insert({
        organization_id: organizationId,
        user_name: user.id,
        action: "website_agent.plan_generated",
        details: JSON.stringify({
          plan_id: data.id,
          page_count: plan.pages.length,
          section_count: plan.pages.reduce(
            (sum: number, page: any) => sum + page.sections.length,
            0,
          ),
        }),
      });
      return json({
        success: true,
        planId: data.id,
        expiresAt: data.expires_at,
        imageProvider: websiteImageProvider,
        plan: data.plan_json,
      });
    }
    if (operation === "applyPlan") {
      const planId = String(body.planId || "");
      if (!uuid(planId)) throw new Error("Website plan not found.");
      const { data, error } = await admin.rpc("apply_website_agent_plan", {
        p_plan_id: planId,
        p_organization_id: organizationId,
        p_actor_id: user.id,
      });
      if (error) throw error;
      return json({
        success: true,
        siteId: data.site_id,
        homepageId: data.homepage_id,
      });
    }
    if (operation === "generateEditPlan") {
      const siteId = String(body.siteId || "");
      if (!uuid(siteId)) throw new Error("Website plan not found.");
      const instruction = text(body.instruction, 6000, "instruction");
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await admin.from("website_agent_edit_plans")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id).gte("created_at", since);
      if ((count || 0) >= 5) {
        return json({
          success: false,
          error:
            "Please wait a moment before generating another edit suggestion.",
        }, 429);
      }
      const generationStartedAt = performance.now();
      const requestedPageId = typeof body.currentPageId === "string"
        ? body.currentPageId
        : undefined;
      const scope = editRequestScope(instruction);
      const contextStartedAt = performance.now();
      const loaded = await loadEditContext(
        admin,
        organizationId,
        siteId,
        requestedPageId,
        scope,
      );
      const contextLoadMs = Math.round(performance.now() - contextStartedAt);
      let plan: Plan;
      let firstCandidate: unknown;
      const modelStartedAt = performance.now();
      try {
        firstCandidate = normalizeEditPlan(
          await websiteAgentModel.generateStructuredPlan({
            prompt: instruction,
            system: editSystemInstruction(),
            context: {
              currentPageId: typeof body.currentPageId === "string" &&
                  loaded.pageIds.has(body.currentPageId)
                ? body.currentPageId
                : undefined,
              website: loaded.context,
            },
          }),
        );
        plan = validateEditPlan(firstCandidate, loaded);
      } catch (firstError) {
        if (firstError instanceof GeminiProviderError) throw firstError;
        const validationError = firstError instanceof PlanValidationError
          ? firstError
          : new PlanValidationError(
            "AI_EDIT_INVALID_PLAN",
            "Website edit plan is invalid.",
            "plan",
          );
        const firstMetadata = editValidationMetadata(
          validationError,
          firstCandidate,
        );
        console.error("website_agent_edit_validation_failed", {
          attempt: 1,
          code: validationError.code,
          operation_index: firstMetadata.operationIndex,
          operation_type: firstMetadata.operationType,
          path: validationError.path,
          model: Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite",
        });
        let repairCandidate: unknown;
        try {
          repairCandidate = normalizeEditPlan(
            await websiteAgentModel.generateStructuredPlan({
              prompt: instruction,
              system: editSystemInstruction(),
              context: {
                currentPageId: typeof body.currentPageId === "string" &&
                    loaded.pageIds.has(body.currentPageId)
                  ? body.currentPageId
                  : undefined,
                website: loaded.context,
                previousPlan: firstCandidate,
              },
              repair: editRepairInstruction(
                validationError,
                firstCandidate,
                loaded,
              ),
            }),
          );
          plan = validateEditPlan(repairCandidate, loaded);
        } catch (repairError) {
          if (repairError instanceof GeminiProviderError) throw repairError;
          const failure = repairError instanceof PlanValidationError
            ? repairError
            : new PlanValidationError(
              "AI_EDIT_INVALID_PLAN",
              "Website edit plan is invalid.",
              "plan",
            );
          const repairMetadata = editValidationMetadata(
            failure,
            repairCandidate,
          );
          console.error("website_agent_edit_validation_failed", {
            attempt: 2,
            code: failure.code,
            operation_index: repairMetadata.operationIndex,
            operation_type: repairMetadata.operationType,
            path: failure.path,
            model: Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite",
          });
          throw failure;
        }
      }
      const modelGenerationMs = Math.round(performance.now() - modelStartedAt);
      const persistenceStartedAt = performance.now();
      const { data, error } = await admin.from("website_agent_edit_plans")
        .insert({
          organization_id: organizationId,
          site_id: siteId,
          created_by: user.id,
          instruction,
          plan_json: plan,
          base_versions: loaded.baseVersions,
        }).select("id,expires_at,plan_json,created_at").single();
      if (error) throw error;
      const persistenceMs = Math.round(performance.now() - persistenceStartedAt);
      await admin.from("audit_logs").insert({
        organization_id: organizationId,
        user_name: user.id,
        action: "website_agent.edit_plan_generated",
        details: JSON.stringify({
          proposal_id: data.id,
          operation_count: plan.operations.length,
        }),
      });
      console.log("website_agent_edit_plan_generated", {
        model: Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite",
        operation_count: plan.operations.length,
        proposal_id: data.id,
        scope,
        context_load_ms: contextLoadMs,
        model_generation_ms: modelGenerationMs,
        validation_ms: 0,
        repair_ms: 0,
        persistence_ms: persistenceMs,
        total_ms: Math.round(performance.now() - generationStartedAt),
      });
      return json({
        success: true,
        proposal: {
          id: data.id,
          expiresAt: data.expires_at,
          createdAt: data.created_at,
          plan: data.plan_json,
        },
      });
    }
    if (operation === "applyEditPlan") {
      const planId = String(body.planId || "");
      if (!uuid(planId)) throw new Error("Website plan not found.");
      const { data, error } = await admin.rpc("apply_website_agent_edit_plan", {
        p_plan_id: planId,
        p_organization_id: organizationId,
        p_actor_id: user.id,
      });
      if (error) {
        if (String(error.message).includes("AI_EDIT_STALE_PROPOSAL")) {
          throw new Error(
            "This website changed after the AI suggestion was created. Generate the suggestion again.",
          );
        }
        if (String(error.message).includes("AI_EDIT_EXPIRED")) {
          throw new Error("This AI suggestion expired. Generate it again.");
        }
        if (String(error.message).includes("AI_EDIT_NO_EFFECT")) {
          throw new Error("No effective change was produced.");
        }
        if (String(error.message).includes("AI_EDIT_VERIFICATION_FAILED")) {
          throw new Error("AI changes could not be verified. Nothing was published.");
        }
        throw error;
      }
      return json({ success: true, result: data });
    }
    if (operation === "listEditPlans") {
      const siteId = String(body.siteId || "");
      if (!uuid(siteId)) throw new Error("Website plan not found.");
      const { data, error } = await admin.from("website_agent_edit_plans")
        .select(
          "id,instruction,plan_json,status,created_at,expires_at,applied_at",
        )
        .eq("organization_id", organizationId).eq("site_id", siteId).eq(
          "created_by",
          user.id,
        )
        .order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return json({ success: true, proposals: data || [] });
    }
    return json(
      { success: false, error: "Unsupported Website AI operation." },
      400,
    );
  } catch (error: unknown) {
    console.error("website_agent_request_failed", {
      operation,
      organization_id_present: Boolean(organizationId),
      error_type: error instanceof Error ? error.name : typeof error,
    });
    return json(
      {
        success: false,
        error: publicError(error, operation),
        ...(error instanceof PlanValidationError
          ? { debugCode: error.code }
          : {}),
      },
      400,
    );
  }
};

export const websiteAgentEditPlanTest = {
  normalizeEditPlan,
  validateEditPlan,
  editRepairInstruction,
};

if (import.meta.main) Deno.serve(websiteAgentHandler);
