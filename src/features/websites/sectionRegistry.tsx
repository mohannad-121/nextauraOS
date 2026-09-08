import {
  BarChart3,
  Contact,
  Grid2X2,
  Image,
  LayoutPanelTop,
  ListChecks,
  MessageSquareQuote,
  Minus,
  MousePointer2,
  PanelBottom,
  ShieldCheck,
  Star,
  Type,
  Users,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SectionType =
  | "hero"
  | "text"
  | "image"
  | "button_group"
  | "spacer"
  | "header"
  | "footer"
  | "features"
  | "services"
  | "testimonials"
  | "pricing"
  | "faq"
  | "contact"
  | "gallery"
  | "stats"
  | "team";
export type WebsiteSection = {
  id: string;
  type: SectionType;
  props: Record<string, any>;
  style: Record<string, any>;
};
export type WebsiteDocument = {
  version: 1;
  theme?: {
    primaryColor: string;
    secondaryColor?: string;
    surfaceColor?: string;
    mutedTextColor?: string;
    backgroundColor: string;
    textColor: string;
    headingFont?: string;
    bodyFont?: string;
    direction?: "ltr" | "rtl";
    radius: "sm" | "md" | "lg";
  };
  sections: WebsiteSection[];
};
export type NavigationItem = {
  id: string;
  label: string;
  pageId?: string;
  externalUrl?: string;
  visible: boolean;
};
export type GlobalSections = {
  version: 1;
  navigation: NavigationItem[];
  header: WebsiteSection | null;
  footer: WebsiteSection | null;
};
type Definition = {
  type: SectionType;
  title: string;
  category: string;
  description: string;
  icon: LucideIcon;
  global?: boolean;
  defaults: Omit<WebsiteSection, "id" | "type">;
};

export const websiteSectionRegistry: Definition[] = [
  {
    type: "hero",
    title: "Hero",
    category: "Hero",
    description: "A clear opening message with calls to action.",
    icon: Wand2,
    defaults: {
      props: {
        eyebrow: "Welcome",
        heading: "Build something memorable",
        subheading: "Tell visitors why your business matters.",
        primaryLabel: "Get started",
        primaryUrl: "#",
        secondaryLabel: "Learn more",
        secondaryUrl: "#",
        alignment: "center",
        minHeight: 420,
        backgroundAssetId: null,
        sideAssetId: null,
        overlayOpacity: 0.35,
        imageFit: "cover",
      },
      style: { backgroundColor: "#0f172a", textColor: "#ffffff" },
    },
  },
  {
    type: "text",
    title: "Text",
    category: "Content",
    description: "A focused heading and supporting copy.",
    icon: Type,
    defaults: {
      props: {
        heading: "A thoughtful heading",
        body: "Use this space to explain your value in clear, useful language.",
        alignment: "left",
        maxWidth: 680,
      },
      style: { backgroundColor: "#ffffff", textColor: "#0f172a", paddingY: 72 },
    },
  },
  {
    type: "image",
    title: "Image",
    category: "Media",
    description: "An image from your secure media library.",
    icon: Image,
    defaults: {
      props: {
        assetId: null,
        url: "",
        alt: "Website image",
        width: 100,
        alignment: "center",
        radius: 16,
        fit: "cover",
      },
      style: { backgroundColor: "#ffffff" },
    },
  },
  {
    type: "button_group",
    title: "Button group",
    category: "CTA",
    description: "A compact call-to-action group.",
    icon: MousePointer2,
    defaults: {
      props: {
        heading: "Ready to begin?",
        buttons: [{ label: "Get started", url: "#", variant: "primary" }],
      },
      style: {
        backgroundColor: "#f8fafc",
        textColor: "#0f172a",
        alignment: "center",
      },
    },
  },
  {
    type: "spacer",
    title: "Spacer",
    category: "Layout",
    description: "Responsive breathing room between sections.",
    icon: Minus,
    defaults: { props: { desktop: 72, tablet: 48, mobile: 32 }, style: {} },
  },
  {
    type: "features",
    title: "Features",
    category: "Content",
    description: "Highlight benefits in a responsive grid.",
    icon: Grid2X2,
    defaults: {
      props: {
        eyebrow: "Why choose us",
        heading: "Everything you need",
        subheading: "Clear, practical benefits for your customers.",
        layout: "cards",
        columns: 3,
        items: [
          {
            icon: "sparkle",
            title: "Thoughtful service",
            description: "Made for real people.",
          },
          {
            icon: "shield",
            title: "Trusted quality",
            description: "Details that build confidence.",
          },
          {
            icon: "star",
            title: "Built to last",
            description: "A better experience.",
          },
        ],
      },
      style: { backgroundColor: "#ffffff", textColor: "#0f172a", paddingY: 80 },
    },
  },
  {
    type: "services",
    title: "Services",
    category: "Content",
    description: "Present services with clear calls to action.",
    icon: ListChecks,
    defaults: {
      props: {
        heading: "Our services",
        layout: "cards",
        items: [
          {
            icon: "sparkle",
            title: "Signature service",
            description: "A tailored experience.",
            ctaLabel: "Learn more",
            target: "#",
          },
          {
            icon: "star",
            title: "Expert guidance",
            description: "Friendly support at every step.",
          },
        ],
      },
      style: { backgroundColor: "#f8fafc", textColor: "#0f172a", paddingY: 80 },
    },
  },
  {
    type: "testimonials",
    title: "Testimonials",
    category: "Social proof",
    description: "Share customer feedback.",
    icon: MessageSquareQuote,
    defaults: {
      props: {
        heading: "Loved by clients",
        layout: "cards",
        items: [
          {
            quote: "A wonderful experience from start to finish.",
            name: "Alex Morgan",
            role: "Customer",
            rating: 5,
          },
        ],
      },
      style: { backgroundColor: "#ffffff", textColor: "#0f172a", paddingY: 80 },
    },
  },
  {
    type: "pricing",
    title: "Pricing",
    category: "CTA",
    description: "Present plans without checkout.",
    icon: Star,
    defaults: {
      props: {
        heading: "Simple pricing",
        layout: "3-columns",
        items: [
          {
            name: "Starter",
            description: "For getting started",
            price: "$19",
            period: "/month",
            features: ["Core essentials", "Email support"],
            ctaLabel: "Choose Starter",
            target: "#",
            featured: false,
          },
          {
            name: "Growth",
            description: "For growing teams",
            price: "$49",
            period: "/month",
            features: ["Everything in Starter", "Priority support"],
            ctaLabel: "Choose Growth",
            target: "#",
            featured: true,
          },
        ],
      },
      style: { backgroundColor: "#f8fafc", textColor: "#0f172a", paddingY: 80 },
    },
  },
  {
    type: "faq",
    title: "FAQ",
    category: "Content",
    description: "Answer common questions accessibly.",
    icon: ShieldCheck,
    defaults: {
      props: {
        heading: "Frequently asked questions",
        layout: "accordion",
        items: [
          {
            question: "How do I get started?",
            answer: "Choose the option that fits your needs and contact us.",
          },
          {
            question: "Can I ask a question?",
            answer: "Absolutely. We are happy to help.",
          },
        ],
      },
      style: { backgroundColor: "#ffffff", textColor: "#0f172a", paddingY: 80 },
    },
  },
  {
    type: "contact",
    title: "Contact",
    category: "CTA",
    description: "A static contact and enquiry section.",
    icon: Contact,
    defaults: {
      props: {
        heading: "Let’s talk",
        text: "Get in touch to start a conversation.",
        phone: "",
        email: "",
        address: "",
        mapUrl: "",
        showForm: true,
      },
      style: { backgroundColor: "#0f172a", textColor: "#ffffff", paddingY: 80 },
    },
  },
  {
    type: "gallery",
    title: "Gallery",
    category: "Media",
    description: "Showcase media-library images.",
    icon: Image,
    defaults: {
      props: { heading: "Our work", layout: "grid", columns: 3, images: [] },
      style: { backgroundColor: "#ffffff", textColor: "#0f172a", paddingY: 80 },
    },
  },
  {
    type: "stats",
    title: "Stats",
    category: "Social proof",
    description: "Share key numbers without animation.",
    icon: BarChart3,
    defaults: {
      props: {
        heading: "",
        layout: "inline",
        items: [
          { value: "10+", label: "Years of experience" },
          { value: "500+", label: "Happy clients" },
          { value: "99%", label: "Would recommend us" },
        ],
      },
      style: { backgroundColor: "#f8fafc", textColor: "#0f172a", paddingY: 56 },
    },
  },
  {
    type: "team",
    title: "Team",
    category: "Social proof",
    description: "Introduce the people behind your work.",
    icon: Users,
    defaults: {
      props: {
        heading: "Meet the team",
        layout: "cards",
        items: [
          {
            name: "Jordan Lee",
            role: "Founder",
            bio: "Here to help you thrive.",
          },
        ],
      },
      style: { backgroundColor: "#ffffff", textColor: "#0f172a", paddingY: 80 },
    },
  },
  {
    type: "header",
    title: "Header",
    category: "Navigation",
    description: "A reusable navigation header for every page.",
    icon: LayoutPanelTop,
    global: true,
    defaults: {
      props: {
        siteName: "",
        logoAssetId: null,
        ctaLabel: "",
        ctaUrl: "#",
        sticky: false,
        variant: "logo-left",
        mobileOpen: false,
      },
      style: {
        backgroundColor: "#ffffff",
        textColor: "#0f172a",
        transparent: false,
      },
    },
  },
  {
    type: "footer",
    title: "Footer",
    category: "Navigation",
    description: "A reusable site footer for every page.",
    icon: PanelBottom,
    global: true,
    defaults: {
      props: {
        siteName: "",
        logoAssetId: null,
        description: "A thoughtful website, built with NextAura.",
        copyright: "© Your business",
        socialLinks: [],
      },
      style: {
        backgroundColor: "#0f172a",
        textColor: "#ffffff",
        variant: "columns",
      },
    },
  },
];
export const sectionDefinition = (type: SectionType) =>
  websiteSectionRegistry.find((item) => item.type === type)!;
export const newSection = (type: SectionType): WebsiteSection => {
  const definition = sectionDefinition(type);
  return {
    id: crypto.randomUUID(),
    type,
    props: structuredClone(definition.defaults.props),
    style: structuredClone(definition.defaults.style),
  };
};
const asset = (id: string | null | undefined, urls?: Record<string, string>) =>
  id ? urls?.[id] : undefined;

const visualBackground = (style: Record<string, any>) =>
  style.background === "gradient"
    ? `linear-gradient(135deg, ${style.backgroundColor || "#0f172a"}, ${style.accentColor || "#334155"})`
    : style.background === "soft"
      ? style.surfaceColor || "#f8fafc"
      : style.background === "accent"
        ? style.accentColor || style.backgroundColor
        : style.backgroundColor;
const motionClass = (style: Record<string, any>) =>
  style.animation && style.animation !== "none"
    ? `website-motion website-motion--${style.animation} website-motion-delay--${style.animationDelayPreset || "none"}`
    : "";

export function WebsiteSectionRenderer({
  section,
  device,
  selected,
  onSelect,
  chrome,
  assetUrls,
  navigation,
  onNavigate,
}: {
  section: WebsiteSection;
  device: "desktop" | "tablet" | "mobile";
  selected?: boolean;
  onSelect?: () => void;
  chrome?: boolean;
  assetUrls?: Record<string, string>;
  navigation?: NavigationItem[];
  onNavigate?: (pageId: string) => void;
}) {
  const p = section.props;
  const s = section.style;
  const align = p.alignment || s.alignment || "left";
  const click = () => onSelect?.();
  const frame = `${chrome ? "cursor-pointer transition outline outline-1 outline-transparent hover:outline-blue-300" : ""} ${selected ? "!outline-2 !outline-blue-500" : ""}`;
  const visual = motionClass(s);
  const navigate = (item: NavigationItem) => (event: React.MouseEvent) => {
    event.preventDefault();
    if (item.pageId) onNavigate?.(item.pageId);
  };
  if (section.type === "header")
    return (
      <header
        onClick={click}
        className={`${frame} ${p.sticky ? "sticky top-0 z-20" : ""} relative px-6 py-4`}
        style={{
          background: s.transparent ? "transparent" : s.backgroundColor,
          color: s.textColor,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold">
            {asset(p.logoAssetId, assetUrls) && (
              <img
                src={asset(p.logoAssetId, assetUrls)}
                alt=""
                className="h-8 w-8 rounded object-contain"
              />
            )}
            {p.siteName}
          </div>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {(navigation || [])
              .filter((item) => item.visible)
              .map((item) => (
                <a
                  key={item.id}
                  href={item.externalUrl || "#"}
                  onClick={navigate(item)}
                >
                  {item.label}
                </a>
              ))}
          </nav>
          {p.ctaLabel && (
            <a
              href={p.ctaUrl}
              onClick={(event) => event.preventDefault()}
              className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
            >
              {p.ctaLabel}
            </a>
          )}
          <button
            className="rounded p-2 md:hidden"
            aria-label="Open navigation"
          >
            ☰
          </button>
        </div>
      </header>
    );
  if (section.type === "footer")
    return (
      <footer
        onClick={click}
        className={`${frame} px-6 py-12`}
        style={{ background: s.backgroundColor, color: s.textColor }}
      >
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              {asset(p.logoAssetId, assetUrls) && (
                <img
                  src={asset(p.logoAssetId, assetUrls)}
                  alt=""
                  className="h-8 w-8 rounded object-contain"
                />
              )}
              {p.siteName}
            </div>
            <p className="mt-3 max-w-sm text-sm opacity-75">{p.description}</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {(navigation || [])
              .filter((item) => item.visible)
              .map((item) => (
                <a
                  key={item.id}
                  href={item.externalUrl || "#"}
                  onClick={navigate(item)}
                >
                  {item.label}
                </a>
              ))}
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-white/20 pt-5 text-xs opacity-60">
          {p.copyright}
        </p>
      </footer>
    );
  if (section.type === "hero") {
    const background = asset(p.backgroundAssetId, assetUrls);
    const side = asset(p.sideAssetId, assetUrls);
    return (
      <section
        onClick={click}
        className={`${frame} ${visual} relative flex overflow-hidden px-8 py-12`}
        style={{
          minHeight: p.minHeight,
          background: background
            ? `linear-gradient(rgb(15 23 42 / ${p.overlayOpacity || 0.35}), rgb(15 23 42 / ${p.overlayOpacity || 0.35})), url(${background}) center/${p.imageFit || "cover"}`
            : visualBackground(s),
          color: s.textColor,
          justifyContent:
            align === "center"
              ? "center"
              : align === "right"
                ? "flex-end"
                : "flex-start",
          textAlign: align as any,
        }}
      >
        <div className="my-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] opacity-70">
            {p.eyebrow}
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            {p.heading}
          </h1>
          <p className="mt-5 text-base leading-7 opacity-80">{p.subheading}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={p.primaryUrl}
              onClick={(e) => e.preventDefault()}
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
            >
              {p.primaryLabel}
            </a>
            {p.secondaryLabel && (
              <a
                href={p.secondaryUrl}
                onClick={(e) => e.preventDefault()}
                className="rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold"
              >
                {p.secondaryLabel}
              </a>
            )}
          </div>
          {!background && p.imageIntent && (
            <p className="mt-8 text-xs opacity-55">
              Image intent: {p.imageIntent}
            </p>
          )}
        </div>
        {side && (
          <img
            src={side}
            alt=""
            className="ml-8 hidden w-[38%] self-center rounded-2xl object-cover lg:block"
          />
        )}
      </section>
    );
  }
  if (section.type === "text")
    return (
      <section
        onClick={click}
        className={`${frame} ${visual} px-8`}
        style={{
          background: visualBackground(s),
          color: s.textColor,
          paddingTop: s.paddingY,
          paddingBottom: s.paddingY,
          textAlign: align as any,
        }}
      >
        <div
          style={{
            maxWidth: p.maxWidth,
            margin:
              align === "center"
                ? "auto"
                : align === "right"
                  ? "0 0 0 auto"
                  : undefined,
          }}
        >
          <h2 className="text-3xl font-semibold tracking-tight">{p.heading}</h2>
          <p className="mt-4 whitespace-pre-wrap text-base leading-7 opacity-80">
            {p.body}
          </p>
        </div>
      </section>
    );
  if (section.type === "image") {
    const source = asset(p.assetId, assetUrls) || p.url;
    return (
      <section
        onClick={click}
        className={`${frame} px-8 py-10`}
        style={{ background: s.backgroundColor, textAlign: p.alignment as any }}
      >
        {source ? (
          <img
            src={source}
            alt={p.alt}
            style={{
              width: `${p.width}%`,
              borderRadius: p.radius,
              objectFit: p.fit,
            }}
            className="inline-block max-w-full"
          />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-sm text-slate-500">
            Choose an image from Media Library
          </div>
        )}
      </section>
    );
  }
  if (section.type === "button_group")
    return (
      <section
        onClick={click}
        className={`${frame} px-8 py-14`}
        style={{
          background: s.backgroundColor,
          color: s.textColor,
          textAlign: s.alignment as any,
        }}
      >
        <h2 className="text-3xl font-semibold">{p.heading}</h2>
        <div
          className="mt-6 flex flex-wrap gap-3"
          style={{
            justifyContent:
              s.alignment === "center"
                ? "center"
                : s.alignment === "right"
                  ? "flex-end"
                  : "flex-start",
          }}
        >
          {(p.buttons || []).map((button: any, index: number) => (
            <a
              key={index}
              href={button.url}
              onClick={(e) => e.preventDefault()}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${button.variant === "outline" ? "border border-slate-400" : button.variant === "secondary" ? "bg-slate-200 text-slate-900" : "bg-blue-700 text-white"}`}
            >
              {button.label}
            </a>
          ))}
        </div>
      </section>
    );
  if (
    [
      "features",
      "services",
      "testimonials",
      "pricing",
      "faq",
      "contact",
      "gallery",
      "stats",
      "team",
    ].includes(section.type)
  )
    return (
      <RichSection
        section={section}
        frame={`${frame} ${visual}`}
        assetUrls={assetUrls}
        onClick={click}
      />
    );
  return (
    <div
      onClick={click}
      className={frame}
      style={{ height: p[device] ?? p.desktop }}
    />
  );
}

function RichSection({
  section,
  frame,
  assetUrls,
  onClick,
}: {
  section: WebsiteSection;
  frame: string;
  assetUrls?: Record<string, string>;
  onClick: () => void;
}) {
  const p = section.props;
  const s = section.style;
  const items = p.items || [];
  const grid =
    p.columns === 4
      ? "lg:grid-cols-4"
      : p.columns === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-3";
  if (section.type === "contact")
    return (
      <section
        onClick={onClick}
        className={`${frame} px-8`}
        style={{
          background: s.backgroundColor,
          color: s.textColor,
          paddingTop: s.paddingY,
          paddingBottom: s.paddingY,
        }}
      >
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold">{p.heading}</h2>
            <p className="mt-4 opacity-80">{p.text}</p>
            <div className="mt-6 space-y-2 text-sm">
              <p>{p.phone}</p>
              <p>{p.email}</p>
              <p>{p.address}</p>
            </div>
          </div>
          {p.showForm && (
            <div className="rounded-xl bg-white/10 p-5 text-sm">
              <p className="font-semibold">Send a message</p>
              <input
                aria-label="Name"
                placeholder="Name"
                className="mt-4 w-full rounded bg-white/10 p-2"
              />
              <input
                aria-label="Email"
                placeholder="Email"
                className="mt-2 w-full rounded bg-white/10 p-2"
              />
              <textarea
                aria-label="Message"
                placeholder="Message"
                className="mt-2 h-20 w-full rounded bg-white/10 p-2"
              />
              <button
                type="button"
                className="mt-3 rounded bg-white px-3 py-2 text-slate-900"
              >
                Send message
              </button>
              <p className="mt-2 text-xs opacity-60">
                Form preview only — submissions are not active yet.
              </p>
            </div>
          )}
        </div>
      </section>
    );
  if (section.type === "gallery") {
    const images = (p.images || [])
      .map((image: any) => ({
        ...image,
        source: asset(image.assetId, assetUrls),
      }))
      .filter((image: any) => image.source);
    return (
      <section
        onClick={onClick}
        className={`${frame} px-8`}
        style={{
          background: s.backgroundColor,
          color: s.textColor,
          paddingTop: s.paddingY,
          paddingBottom: s.paddingY,
        }}
      >
        <h2 className="mx-auto max-w-6xl text-3xl font-semibold">
          {p.heading}
        </h2>
        {images.length ? (
          <div className={`mx-auto mt-7 grid max-w-6xl gap-3 ${grid}`}>
            {images.map((image: any, index: number) => (
              <img
                key={index}
                src={image.source}
                alt={image.alt || ""}
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
            ))}
          </div>
        ) : (
          <p className="mx-auto mt-4 max-w-6xl text-sm opacity-65">
            Add imagery from Media Library to complete this visual story.
          </p>
        )}
      </section>
    );
  }
  if (section.type === "faq")
    return (
      <section
        onClick={onClick}
        className={`${frame} px-8`}
        style={{
          background: s.backgroundColor,
          color: s.textColor,
          paddingTop: s.paddingY,
          paddingBottom: s.paddingY,
        }}
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-semibold">{p.heading}</h2>
          {items.map((item: any, index: number) => (
            <details
              key={index}
              className="mt-3 rounded-lg border border-current/20 p-4"
            >
              <summary className="cursor-pointer font-semibold">
                {item.question}
              </summary>
              <p className="mt-3 text-sm opacity-75">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    );
  const cards =
    section.type === "pricing"
      ? items
      : section.type === "stats"
        ? items
        : items;
  return (
    <section
      onClick={onClick}
      className={`${frame} px-8`}
      style={{
        background: s.backgroundColor,
        color: s.textColor,
        paddingTop: s.paddingY,
        paddingBottom: s.paddingY,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-semibold">{p.heading}</h2>
        {p.subheading && <p className="mt-3 opacity-75">{p.subheading}</p>}
        <div
          className={`mt-8 grid gap-4 ${section.type === "stats" ? "sm:grid-cols-3" : grid}`}
        >
          {cards.map((item: any, index: number) => (
            <article
              key={index}
              className={`rounded-xl border border-current/15 p-5 ${item.featured ? "ring-2 ring-blue-500" : ""}`}
            >
              {item.assetId && (
                <img
                  src={asset(item.assetId, assetUrls)}
                  alt={item.alt || ""}
                  className="mb-4 aspect-video w-full rounded-lg object-cover"
                />
              )}
              {item.avatarAssetId && (
                <img
                  src={asset(item.avatarAssetId, assetUrls)}
                  alt=""
                  className="mb-3 h-12 w-12 rounded-full object-cover"
                />
              )}
              {item.imageAssetId && (
                <img
                  src={asset(item.imageAssetId, assetUrls)}
                  alt=""
                  className="mb-3 h-16 w-16 rounded-full object-cover"
                />
              )}
              {item.quote && <p className="text-lg">“{item.quote}”</p>}
              {item.value && <p className="text-3xl font-bold">{item.value}</p>}
              <h3 className="mt-2 text-lg font-semibold">
                {item.name || item.title || item.label}
              </h3>
              {item.role && <p className="text-sm opacity-60">{item.role}</p>}
              {item.price && (
                <p className="mt-2 text-3xl font-bold">
                  {item.price}
                  <span className="text-sm font-normal opacity-60">
                    {item.period}
                  </span>
                </p>
              )}
              <p className="mt-2 text-sm opacity-75">
                {item.description || item.bio}
              </p>
              {item.features && (
                <ul className="mt-3 space-y-1 text-sm">
                  {item.features.map((feature: string) => (
                    <li key={feature}>✓ {feature}</li>
                  ))}
                </ul>
              )}
              {item.ctaLabel && (
                <button
                  type="button"
                  className="mt-4 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                >
                  {item.ctaLabel}
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
