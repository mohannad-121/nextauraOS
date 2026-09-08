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

function validateSection(section: unknown) {
  if (
    !record(section) ||
    Object.keys(section).some(
      (key) => !["type", "props", "style"].includes(key),
    )
  )
    throw new Error("Website plan section is invalid.");
  if (
    !sectionTypes.has(String(section.type)) ||
    !record(section.props) ||
    !record(section.style) ||
    Object.keys(section.props).length > 40 ||
    Object.keys(section.style).length > 40 ||
    JSON.stringify(section).length > 16384 ||
    dangerous.test(JSON.stringify(section))
  )
    throw new Error("Website plan section is invalid.");
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
    throw new Error("Website plan section has too many items.");
  if (
    items.some(
      (item: unknown) => !record(item) || dangerous.test(JSON.stringify(item)),
    )
  )
    throw new Error("Website plan section contains invalid content.");
  const scan = (value: unknown, key = ""): void => {
    if (typeof value === "string") {
      if (
        value.length > 4000 ||
        dangerous.test(value) ||
        (/(url|target)$/i.test(key) && !safeUrl(value))
      )
        throw new Error("Website plan contains an invalid URL or string.");
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

const systemInstruction = `You create JSON website plans only. Never publish, never include HTML, CSS, JavaScript, image URLs, secrets, database operations, or markdown. Use only sections: hero, text, image, button_group, spacer, features, services, testimonials, pricing, faq, contact, gallery, stats, team. Return exactly one JSON object matching this shape: {version:1,site:{name,slugSuggestion,language,theme:{preset,primaryColor,backgroundColor,textColor,headingFont,bodyFont,radius,direction}},pages:[{clientId,name,slug,isHomepage,seo:{title,description},sections:[{type,props,style}]}],navigation:[{label,targetPageClientId}],header:{type:'header',props,style},footer:{type:'footer',props,style}}. Be business-specific, use no images or external URLs, and honor Arabic with language ar and direction rtl.`;

async function generateWithModel(
  prompt: string,
  businessName: string,
  language: string,
  styleHint: string,
  repair?: string,
) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Website AI is not configured yet.");
  const response = await fetch(
    Deno.env.get("WEBSITE_AGENT_MODEL_URL") ||
      "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("WEBSITE_AGENT_MODEL") || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 6000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemInstruction },
          {
            role: "user",
            content: JSON.stringify({
              request: prompt,
              businessName: businessName || undefined,
              language,
              styleHint,
              repair,
            }),
          },
        ],
      }),
    },
  );
  if (!response.ok) throw new Error("Website AI is temporarily unavailable.");
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length > 262144)
    throw new Error("Website AI returned an invalid response.");
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Website AI returned an invalid response.");
  }
}

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
  if (
    /^(Missing Authorization header|Invalid authentication token|Only workspace owners and administrators can manage billing|Website Builder is not available for this organization\.|Activate Website Builder in Services before using Website AI\.|Website AI is not configured yet\.|Website AI is temporarily unavailable\.|This website plan has already been applied\.|This website plan has expired\. Generate a new plan\.|Website plan not found\.)$/.test(
      message,
    )
  )
    return message;
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
        plan = validatePlan(
          await generateWithModel(prompt, businessName, language, styleHint),
        );
      } catch (firstError) {
        plan = validatePlan(
          await generateWithModel(
            prompt,
            businessName,
            language,
            styleHint,
            firstError instanceof Error
              ? firstError.message.slice(0, 500)
              : "Validate the plan.",
          ),
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
      await admin
        .from("audit_logs")
        .insert({
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
    return json({ success: false, error: publicError(error) }, 400);
  }
});
