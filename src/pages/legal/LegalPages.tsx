import React from "react";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import type { LegalRoute } from "./legalRoutes";

const CANONICAL_ORIGIN = "https://nextauraos.tech";
const PRIVACY_EMAIL = "mohannad@nextaura.ai";

const pageSeo: Record<LegalRoute, { title: string; description: string }> = {
  privacy: {
    title: "Privacy Policy | NextAura",
    description:
      "Learn how NextAura collects, uses, protects, retains, and deletes personal information and connected-service data.",
  },
  "data-deletion": {
    title: "User Data Deletion | NextAura",
    description:
      "Instructions for disconnecting Meta and requesting deletion of NextAura account and integration data.",
  },
};

function useLegalSeo(route: LegalRoute) {
  React.useEffect(() => {
    const seo = pageSeo[route];
    document.title = seo.title;

    let description = document.head.querySelector(
      'meta[name="description"]',
    ) as HTMLMetaElement | null;
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content = seo.description;

    let canonical = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${CANONICAL_ORIGIN}/${route}`;
  }, [route]);
}

type SectionLink = { id: string; label: string };

function LegalPageLayout({
  route,
  eyebrow,
  title,
  introduction,
  sections,
  children,
}: {
  route: LegalRoute;
  eyebrow: string;
  title: string;
  introduction: string;
  sections: SectionLink[];
  children: React.ReactNode;
}) {
  useLegalSeo(route);
  return (
    <div className="min-h-dvh bg-[#f7f7f4] text-slate-900 antialiased">
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <nav
          aria-label="Legal page navigation"
          className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
        >
          <a
            href="/"
            className="flex min-h-11 items-center gap-2.5 rounded-lg font-semibold tracking-tight text-slate-900"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#285143] text-white shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>NextAura OS</span>
          </a>
          <a
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to NextAura</span>
            <span className="sm:hidden">Back</span>
          </a>
        </nav>
      </header>

      <main>
        <section className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_78%_0%,rgba(40,81,67,.12),transparent_32rem)]">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#c9dacf] bg-[#edf4f0] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#285143]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {eyebrow}
              </p>
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {introduction}
              </p>
              <p className="mt-5 text-sm font-medium text-slate-500">
                Last updated September 10, 2026
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[14rem_minmax(0,1fr)] lg:px-8 lg:py-16">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <nav
              aria-label="On this page"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(30,41,59,.04)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                On this page
              </p>
              <ol className="mt-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block rounded-lg px-2.5 py-2 text-sm leading-5 text-slate-600 transition-colors hover:bg-[#edf4f0] hover:text-[#285143]"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-[0_8px_30px_rgba(30,41,59,.04)] sm:px-8 sm:py-10 lg:px-10">
            <div className="legal-content">{children}</div>
          </article>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 NextAura. All rights reserved.</p>
          <nav aria-label="Legal links" className="flex flex-wrap gap-x-5 gap-y-2">
            <a className="font-medium hover:text-[#285143]" href="/privacy">
              Privacy Policy
            </a>
            <a
              className="font-medium hover:text-[#285143]"
              href="/data-deletion"
            >
              Data Deletion
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

const privacySections: SectionLink[] = [
  { id: "scope", label: "Scope and product" },
  { id: "information", label: "Information collected" },
  { id: "integrations", label: "Connected services" },
  { id: "use", label: "How information is used" },
  { id: "sharing", label: "Processors and sharing" },
  { id: "retention", label: "Retention and deletion" },
  { id: "rights", label: "Your rights and choices" },
  { id: "security", label: "Security" },
  { id: "international", label: "International processing" },
  { id: "children", label: "Children’s privacy" },
  { id: "updates", label: "Policy updates" },
  { id: "contact", label: "Contact" },
];

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      route="privacy"
      eyebrow="Privacy"
      title="Privacy Policy"
      introduction="This policy explains what information NextAura handles, why it is used, and the choices available to people who use NextAura workspaces, connected integrations, and websites created with the service."
      sections={privacySections}
    >
      <LegalSection id="scope" title="1. Scope and what NextAura is">
        <p>
          NextAura is a multi-tenant business operations platform that brings
          together business applications, websites, automation workflows,
          connected services, and AI-assisted tools. This policy applies to
          NextAura account holders, workspace members, and people who submit
          information through a website or form operated through NextAura.
        </p>
        <p>
          A customer organization controls the business records entered into
          its workspace and decides which members and integrations may access
          them. This policy does not replace any additional privacy notice that
          an organization provides to its employees, customers, or website
          visitors.
        </p>
      </LegalSection>

      <LegalSection id="information" title="2. Information we handle">
        <h3>Account and authentication information</h3>
        <p>
          We process information such as your name, email address, organization
          membership, role, authentication status, one-time verification
          activity, and session information. Hosting and authentication systems
          may also process technical information such as IP addresses,
          timestamps, browser details, and security events.
        </p>
        <h3>Workspace and business information</h3>
        <p>
          Depending on the applications an organization enables, workspace data
          may include contacts, employee records, invoices, expenses, payroll
          records, documents, approvals, marketing records, and organization
          settings. Access is restricted by workspace membership, roles, and
          plan entitlements.
        </p>
        <h3>Website Builder information</h3>
        <p>
          We store website drafts, published releases, page content, design
          settings, media assets, domains or public slugs, and form
          configurations. If a visitor submits a form, the submitted fields and
          related delivery or processing status may be stored for the website’s
          organization.
        </p>
        <h3>Automation information</h3>
        <p>
          We store workflow definitions, trigger events, execution runs,
          notifications, webhook delivery records, safe error summaries, and
          related audit information required to operate and troubleshoot
          workflows.
        </p>
      </LegalSection>

      <LegalSection id="integrations" title="3. Connected third-party services">
        <p>
          Connecting a service is optional and is initiated by an authorized
          workspace user. NextAura stores only the connection information needed
          to provide the selected integration. Sensitive OAuth credentials and
          API tokens are stored encrypted on the server where the integration
          requires them and are not returned to the browser after connection.
        </p>
        <h3>Google and Gmail</h3>
        <p>
          When Google is connected, we may process the connected account email,
          granted permissions, token-expiration information, and encrypted OAuth
          credentials. Gmail permission is used only when an authorized user
          configures functionality that needs to send email through that
          connected account.
        </p>
        <h3>Meta, Facebook, and Instagram</h3>
        <p>
          When Meta is connected, we may process the Meta account identifier and
          display name, granted permissions, accessible Facebook Page metadata,
          linked Instagram professional-account metadata, connection health,
          and Meta webhook events associated with selected resources. User and
          Page access tokens are kept in encrypted server-side credential
          storage.
        </p>
        <p>
          Meta, Facebook, and Instagram data is used only to provide the
          connection, resource discovery, health checks, webhook handling, and
          integration or automation functionality authorized by the user. It is
          not used for unrelated advertising or sold to third parties.
        </p>
        <h3>GitHub and other connections</h3>
        <p>
          A GitHub connection may store the account login and encrypted OAuth
          credentials needed for a user-directed website export. Generic API
          connections may store a service hostname and encrypted credential.
          The information returned by any connected service remains subject to
          that provider’s terms and privacy practices.
        </p>
      </LegalSection>

      <LegalSection id="use" title="4. How we use information">
        <p>We use information to:</p>
        <ul>
          <li>authenticate users and maintain secure workspace sessions;</li>
          <li>provide the business applications and features users select;</li>
          <li>store, render, publish, and export user-created websites;</li>
          <li>run configured automations and record their outcomes;</li>
          <li>connect and communicate with third-party services at a user’s direction;</li>
          <li>process subscriptions, send service communications, and provide support;</li>
          <li>protect tenants, prevent abuse, diagnose failures, and maintain reliability; and</li>
          <li>meet applicable legal obligations and enforce service terms.</li>
        </ul>
        <div className="legal-callout">
          <strong>NextAura does not sell user data.</strong> We do not exchange
          personal information for money or use connected-service data for
          unrelated advertising.
        </div>
      </LegalSection>

      <LegalSection id="sharing" title="5. Service providers and disclosures">
        <p>
          We use service providers to operate NextAura. Depending on the feature
          used, these may include Supabase for database, authentication, storage,
          and server functions; Vercel for web hosting; Paddle for subscription
          billing; Resend for transactional email; and Google, Meta, or GitHub
          when a user connects those services. Website AI features may send a
          bounded prompt and relevant website content to the configured model
          provider to generate or edit a draft.
        </p>
        <p>
          We may disclose information when required by law, to protect users or
          the service, or as part of a business transaction where applicable
          legal requirements are followed.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="6. Data retention and deletion">
        <p>
          We retain account and workspace information while it is needed to
          operate the service or as directed by the organization that controls
          the workspace. Integration credentials are retained while the
          connection is active and are removed from usable credential storage
          when the integration is disconnected.
        </p>
        <p>
          Some limited records may be retained after a deletion request where
          reasonably necessary for security, fraud prevention, dispute
          resolution, audit integrity, billing, backups, or legal obligations.
          Retained information is restricted to those purposes and removed or
          de-identified when it is no longer needed.
        </p>
        <p>
          Instructions for disconnecting Meta and requesting deletion are on
          our <a href="/data-deletion">User Data Deletion page</a>.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="7. Your rights and choices">
        <p>
          Depending on your location, you may have rights to access, correct,
          delete, restrict, object to, or receive a copy of personal information,
          and to withdraw consent where processing relies on consent. Workspace
          members should first contact their organization administrator for
          organization-controlled business records.
        </p>
        <p>
          You can disconnect third-party integrations from the Connections area.
          You can also revoke NextAura directly from the connected provider’s
          account settings. To make a privacy request, use the contact details
          below. We may need to verify your identity and authority over the
          relevant account or workspace before acting.
        </p>
      </LegalSection>

      <LegalSection id="security" title="8. Security">
        <p>
          NextAura uses tenant isolation, role-based access controls,
          server-authorized operations, encrypted transport, and encrypted
          server-side storage for sensitive connected-service credentials where
          applicable. We also use bounded inputs, audit records, and signature or
          state validation for supported external callbacks.
        </p>
        <p>
          No online service can guarantee absolute security. Users should keep
          account access secure, grant only necessary integration permissions,
          and promptly disconnect connections they no longer use.
        </p>
      </LegalSection>

      <LegalSection id="international" title="9. International processing">
        <p>
          NextAura and its service providers may process information in countries
          other than the country where a user or organization is located. Those
          locations and any transfer safeguards depend on applicable law and the
          terms of the service providers involved.
        </p>
      </LegalSection>

      <LegalSection id="children" title="10. Children’s privacy">
        <p>
          NextAura is a business service and is not directed to children under
          13 or any higher minimum age required by local law. We do not knowingly
          request children’s personal information for independent use of the
          service. Contact us if you believe a child has provided information
          contrary to this section.
        </p>
      </LegalSection>

      <LegalSection id="updates" title="11. Updates to this policy">
        <p>
          We may update this policy as the product, providers, or legal
          requirements change. The “Last updated” date identifies the current
          version. Material changes may also be communicated through the service
          or another appropriate channel.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact">
        <p>
          For privacy questions or requests, email{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. Include the
          email address associated with your NextAura account and the relevant
          organization name. Do not send passwords, access tokens, or other
          credentials.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

const deletionSections: SectionLink[] = [
  { id: "meta", label: "Meta data deletion" },
  { id: "disconnect", label: "Disconnect Meta" },
  { id: "request", label: "Request deletion" },
  { id: "categories", label: "Data covered" },
  { id: "retained", label: "Limited retention" },
  { id: "account", label: "Account and workspace data" },
  { id: "contact", label: "Cannot access your account" },
];

export function DataDeletionPage() {
  return (
    <LegalPageLayout
      route="data-deletion"
      eyebrow="Privacy controls"
      title="User Data Deletion"
      introduction="Use these instructions to disconnect Meta and request deletion of associated Facebook, Instagram, integration, account, or workspace data stored by NextAura."
      sections={deletionSections}
    >
      <LegalSection id="meta" title="1. Meta user-data deletion">
        <div className="legal-callout">
          <strong>For Facebook and Instagram data:</strong> disconnect the Meta
          connection in NextAura, then email a deletion request if you also want
          the remaining connection metadata and associated stored Meta event data
          removed.
        </div>
        <p>You can complete the process in three ways:</p>
        <ol>
          <li>Disconnect the Meta integration from NextAura.</li>
          <li>Request deletion of associated stored Meta integration data.</li>
          <li>Contact NextAura directly if you cannot access your account.</li>
        </ol>
        <p>
          You may also remove NextAura from the Apps and Websites or business
          integration settings in your Facebook account. Removing access at Meta
          prevents future authorized access, but you should still contact us if
          you want remaining data held by NextAura reviewed for deletion.
        </p>
      </LegalSection>

      <LegalSection id="disconnect" title="2. Disconnect Meta in NextAura">
        <ol>
          <li>Sign in to the NextAura workspace that owns the connection.</li>
          <li>Open <strong>Automations → Connections</strong>.</li>
          <li>Open the connected <strong>Meta</strong> account.</li>
          <li>Select <strong>Disconnect</strong> and confirm.</li>
        </ol>
        <p>
          Disconnecting attempts to revoke provider access where supported,
          removes usable encrypted Meta credential material from NextAura,
          deselects discovered Facebook and Instagram resources, and marks the
          connection disconnected. It does not automatically delete unrelated
          workspace records or every historical security and audit record.
        </p>
      </LegalSection>

      <LegalSection id="request" title="3. Request deletion of stored integration data">
        <p>
          Email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> from the
          address associated with your NextAura account. Use the subject
          “Meta data deletion request” and include:
        </p>
        <ul>
          <li>your NextAura account email;</li>
          <li>the organization or workspace name;</li>
          <li>the connected Facebook Page or Instagram username, if known; and</li>
          <li>whether the request is for Meta integration data only or broader account data.</li>
        </ul>
        <p>
          Do not send an access token, password, OAuth code, app secret, or other
          credential. We may ask for additional non-sensitive information to
          verify that you control the account or are authorized to act for the
          organization.
        </p>
      </LegalSection>

      <LegalSection id="categories" title="4. Data covered by a Meta deletion request">
        <p>
          After verification, a Meta integration deletion request covers stored
          data associated with that connection that is not required for a
          permitted retention purpose, including:
        </p>
        <ul>
          <li>encrypted Meta user and Page access-token material;</li>
          <li>the connected Meta account identifier and display metadata;</li>
          <li>discovered Facebook Page and linked Instagram professional-account metadata;</li>
          <li>resource-selection and connection-health metadata; and</li>
          <li>stored Meta webhook event data associated with the connection.</li>
        </ul>
        <p>
          Deletion may mean permanent removal or irreversible de-identification,
          depending on the record and applicable requirements.
        </p>
      </LegalSection>

      <LegalSection id="retained" title="5. Information that may be retained">
        <p>
          Limited records may be retained when reasonably necessary for security,
          abuse prevention, audit integrity, billing, dispute resolution,
          backups, or compliance with legal obligations. For example, an audit
          record may show that a connection was created or disconnected without
          retaining the usable token itself.
        </p>
        <p>
          Retained data is restricted to those purposes and removed or
          de-identified when it is no longer needed. Processing time depends on
          verification, request scope, technical dependencies, and applicable
          law; this page does not promise a fixed completion period.
        </p>
      </LegalSection>

      <LegalSection id="account" title="6. Account or workspace deletion">
        <p>
          Disconnecting Meta removes the usable integration credentials but does
          not delete the entire NextAura account or organization workspace. For a
          broader deletion request, state that clearly in your email. Workspace
          data may be controlled by the organization, so we may coordinate with
          its owner or administrator before removing organization-controlled
          records.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="7. If you cannot access your account">
        <p>
          If you cannot sign in or cannot reach the workspace that owns the Meta
          connection, email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
          {" "}and explain that account access is unavailable. Include the account
          email and workspace name, but do not include credentials. We will use
          the information provided to verify the request and determine the
          appropriate deletion process.
        </p>
        <p>
          For additional information about how NextAura handles personal data,
          read the <a href="/privacy">Privacy Policy</a>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-b border-slate-200 py-8 first:pt-0 last:border-0 last:pb-0">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
