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
  )
    throw new Error(`Website plan ${field} is invalid.`);
  return value.trim();
};
const safeUrl = (value: unknown) =>
  typeof value === "string" &&
  /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(value) &&
  !dangerous.test(value);
const slug = (value: unknown, field: string) => {
  const result = text(value, 63, field).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(result))
    throw new Error(`Website plan ${field} is invalid.`);
  return result;
};

type Plan = Record<string, any>;

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
      )
        continue;
      output[childKey] = clean(child, childKey);
    }
    if (key === "sections" || "type" in output) {
      if (output.style === undefined) output.style = {};
    }
    if (typeof output.slug === "string" && output.slug === "")
      output.slug = "/";
    if (record(output.theme)) {
      for (const color of ["primaryColor", "backgroundColor", "textColor"]) {
        if (typeof output.theme[color] === "string")
          output.theme[color] = output.theme[color].toLowerCase();
      }
    }
    return output;
  };
  return clean(value);
}

const sectionReference = Object.entries(agentSectionSchemas)
  .map(
    ([type, schema]) =>
      `${type}: props=[${schema.props.join(",")}], style=[${schema.style.join(",")}]`,
  )
  .join("; ");

function validateSection(section: unknown) {
  if (
    !record(section) ||
    Object.keys(section).some(
      (key) => !["type", "props", "style"].includes(key),
    )
  )
    failPlan(
      "PLAN_SECTION_INVALID",
      "Website plan section is invalid.",
      "section",
    );
  if (
    !sectionTypes.has(String(section.type)) ||
    !record(section.props) ||
    !record(section.style) ||
    Object.keys(section.props).length > 40 ||
    Object.keys(section.style).length > 40 ||
    JSON.stringify(section).length > 16384 ||
    dangerous.test(JSON.stringify(section))
  )
    failPlan(
      "PLAN_SECTION_INVALID",
      "Website plan section is invalid.",
      "section",
    );
  const schema = agentSectionSchemas[String(section.type)];
  if (
    !schema ||
    Object.keys(section.props).some((key) => !schema.props.includes(key)) ||
    Object.keys(section.style).some((key) => !schema.style.includes(key))
  )
    failPlan(
      "PLAN_SECTION_INVALID",
      "Website plan section uses unsupported props or styles.",
      `section.${String(section.type)}`,
    );
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
  )
    failPlan(
      "PLAN_SECTION_INVALID",
      "Website plan section has too many items.",
      `section.${String(section.type)}.items`,
    );
  if (
    items.some(
      (item: unknown) => !record(item) || dangerous.test(JSON.stringify(item)),
    )
  )
    failPlan(
      "PLAN_SECTION_INVALID",
      "Website plan section contains invalid content.",
      `section.${String(section.type)}.items`,
    );
  const scan = (value: unknown, key = ""): void => {
    if (typeof value === "string") {
      if (
        value.length > 4000 ||
        dangerous.test(value) ||
        (/(url|target)$/i.test(key) && !safeUrl(value))
      )
        failPlan(
          "PLAN_URL_INVALID",
          "Website plan contains an invalid URL or string.",
          `section.${String(section.type)}.${key}`,
        );
    } else if (Array.isArray(value)) value.forEach((item) => scan(item));
    else if (record(value))
      Object.entries(value).forEach(([childKey, child]) =>
        scan(child, childKey),
      );
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
  )
    throw new Error("Website plan is invalid.");
  if (
    value.pages.length < 1 ||
    value.pages.length > 8 ||
    value.navigation.length > 8
  )
    throw new Error("Website plan page count is invalid.");
  const site = value.site;
  if (
    Object.keys(site).some(
      (key) => !["name", "slugSuggestion", "language", "theme"].includes(key),
    ) ||
    !record(site.theme)
  )
    throw new Error("Website plan site settings are invalid.");
  text(site.name, 120, "site name");
  slug(site.slugSuggestion, "site slug");
  if (!["en", "ar"].includes(String(site.language)))
    throw new Error("Website plan language is invalid.");
  const theme = site.theme;
  if (
    Object.keys(theme).some(
      (key) =>
        ![
          "preset",
          "primaryColor",
          "backgroundColor",
          "textColor",
          "headingFont",
          "bodyFont",
          "radius",
          "direction",
        ].includes(key),
    ) ||
    !/^#[0-9a-f]{6}$/i.test(String(theme.primaryColor)) ||
    !/^#[0-9a-f]{6}$/i.test(String(theme.backgroundColor)) ||
    !/^#[0-9a-f]{6}$/i.test(String(theme.textColor)) ||
    !fontAllowlist.has(String(theme.headingFont)) ||
    !fontAllowlist.has(String(theme.bodyFont)) ||
    !["sm", "md", "lg"].includes(String(theme.radius)) ||
    !["ltr", "rtl"].includes(String(theme.direction))
  )
    throw new Error("Website plan theme is invalid.");
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
    )
      throw new Error("Website plan page is invalid.");
    const clientId = text(page.clientId, 40, "page client ID");
    const name = text(page.name, 120, "page name");
    const path = String(page.slug);
    if (
      !/^\/$|^\/[a-z0-9](?:[a-z0-9/-]{0,190}[a-z0-9])?$/.test(path) ||
      paths.has(path) ||
      pageIds.has(clientId) ||
      typeof page.isHomepage !== "boolean" ||
      page.sections.length > 20
    )
      throw new Error("Website plan page is invalid.");
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
  if (homepageCount !== 1 || totalSections > 80)
    throw new Error("Website plan homepage or section count is invalid.");
  const navigation = value.navigation.map((item: unknown) => {
    if (
      !record(item) ||
      Object.keys(item).some(
        (key) => !["label", "targetPageClientId"].includes(key),
      )
    )
      throw new Error("Website plan navigation is invalid.");
    const targetPageClientId = text(
      item.targetPageClientId,
      40,
      "navigation target",
    );
    if (!pageIds.has(targetPageClientId))
      throw new Error("Website plan navigation target is invalid.");
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
    )
      throw new Error(`Website plan ${type} is invalid.`);
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

const systemInstruction = `Generate exactly one JSON Website Plan and nothing else. Never publish. Never output HTML, CSS, JavaScript, markdown, image URLs, secrets, database operations, or fields not listed below.
Root keys exactly: version, site, pages, navigation, header, footer. version is 1.
site exactly: name, slugSuggestion, language, theme. language is only en or ar. theme exactly: preset, primaryColor, backgroundColor, textColor, headingFont, bodyFont, radius, direction. Colors are 6-digit #rrggbb. Fonts only: Inter, Manrope, Playfair Display, DM Sans, Noto Sans Arabic, IBM Plex Sans Arabic. radius only sm, md, lg. direction only ltr, rtl.
Each page exactly: clientId, name, slug, isHomepage, seo, sections. Exactly one homepage has slug "/" and isHomepage true; all other slugs are lowercase paths such as "/about". seo exactly has non-empty title and description. No null values.
Every section exactly has type, props, style. props and style always exist; no id, label, metadata, or children outside props. Use only this reference: ${sectionReference}. Do not include image, map, social, booking, or other URLs. Omit optional CTA URLs and targets instead of using empty strings.
navigation items exactly: label, targetPageClientId; targets must equal a page clientId. header exactly has type "header", props, style. footer exactly has type "footer", props, style. Be specific to the business request; Arabic requests must use Arabic content, ar, rtl, and an allowed Arabic font.`;

function classifyPlanError(error: unknown): PlanValidationError {
  if (error instanceof PlanValidationError) return error;
  const message =
    error instanceof Error ? error.message : "Website plan is invalid.";
  if (message.includes("theme"))
    return new PlanValidationError("PLAN_THEME_INVALID", message, "site.theme");
  if (message.includes("navigation"))
    return new PlanValidationError("PLAN_NAV_INVALID", message, "navigation");
  if (message.includes("URL"))
    return new PlanValidationError("PLAN_URL_INVALID", message, "sections");
  if (message.includes("page") || message.includes("homepage"))
    return new PlanValidationError("PLAN_PAGE_INVALID", message, "pages");
  if (message.includes("section"))
    return new PlanValidationError(
      "PLAN_SECTION_INVALID",
      message,
      "pages.sections",
    );
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
  businessName: string;
  language: string;
  styleHint: string;
  repair?: string;
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
}: WebsiteAgentRequest) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Website AI is not configured.");
  const overrideModel = Deno.env.get("GEMINI_MODEL");
  let model = overrideModel || "gemini-3.5-flash-lite";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  const request = (requestedModel: string) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(requestedModel)}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
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
      if (typeof providerPayload?.error?.status === "string")
        providerCode = providerPayload.error.status;
    } catch {
      /* Do not log provider response bodies. */
    }
    console.error("website_agent_gemini_request_failed", {
      model,
      status: response.status,
      provider_code: providerCode,
    });
  }
  if (response.status === 429)
    throw new GeminiProviderError(
      "Gemini free-tier usage limit reached. Please try again later.",
    );
  if (response.status === 404)
    throw new GeminiProviderError("The configured AI model is unavailable.");
  if (response.status === 400)
    throw new GeminiProviderError(
      "Website AI configuration is incompatible with the selected model.",
    );
  if ([401, 403].includes(response.status))
    throw new GeminiProviderError("Website AI is not configured correctly.");
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
  if (!entitlements.access_active || !entitlements.website_builder_access)
    throw new Error("Website Builder is not available for this organization.");
  const { data: service } = await admin
    .from("organization_services")
    .select("service_key")
    .eq("organization_id", organizationId)
    .eq("service_key", "website_builder")
    .eq("status", "active")
    .maybeSingle();
  if (!service)
    throw new Error(
      "Activate Website Builder in Services before using Website AI.",
    );
}

function publicError(error: unknown) {
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
  ]);
  if (safeMessages.has(message)) return message;
  return "We couldn't generate a valid site structure. Please try again.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  let operation = "";
  let organizationId = "";
  try {
    if (req.method !== "POST")
      return json({ success: false, error: "Method not allowed." }, 405);
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
      if ((count || 0) >= 3)
        return json(
          {
            success: false,
            error:
              "Please wait a moment before generating another website plan.",
          },
          429,
        );
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
            repair: `Previous output failed ${validationError.code} at ${validationError.path}: ${validationError.message.slice(0, 300)}. Return the entire corrected JSON using every exact schema constraint in the system instruction.`,
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
        error: publicError(error),
        ...(error instanceof PlanValidationError
          ? { debugCode: error.code }
          : {}),
      },
      400,
    );
  }
});
