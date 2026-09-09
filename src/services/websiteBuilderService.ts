import { supabase } from "./supabaseClient";

const publicWebsiteError = (message: string) =>
  /invalid authentication token|jwt.*expired|missing authorization/i.test(message)
    ? "Your session expired. Please sign in again."
    : message;

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("website-builder", {
    body,
  });
  const functionError = error as {
    context?: Response;
    message?: string;
  } | null;
  let responseError = "";
  if (functionError?.context) {
    try {
      const payload = await functionError.context.clone().json();
      if (typeof payload?.error === "string") responseError = payload.error;
    } catch {
      // Non-JSON responses intentionally fall back to a safe operation-specific message.
    }
  }
  if (error || !data?.success)
    throw new Error(publicWebsiteError(
      data?.error || responseError || "Unable to manage websites.",
    ));
  return data;
};
const agentCall = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("website-agent", {
    body,
  });
  const functionError = error as {
    context?: Response;
    message?: string;
  } | null;
  let responseError = "";
  if (functionError?.context) {
    try {
      const payload = await functionError.context.clone().json();
      if (typeof payload?.error === "string") responseError = payload.error;
    } catch {
      /* safe fallback below */
    }
  }
  if (error || !data?.success)
    throw new Error(publicWebsiteError(
      data?.error || responseError || "Website AI is unavailable.",
    ));
  return data;
};
export const websiteBuilderService = {
  githubExport: async (body: { organizationId: string; siteId: string; source: "draft" | "published"; repositoryName: string; visibility: "private" | "public"; description?: string; connectionId: string }) => {
    const { data, error } = await supabase.functions.invoke("website-github-export", { body });
    if (error || !data?.success) throw new Error(data?.error || "Unable to export to GitHub.");
    return data.repository as { owner: string; name: string; url: string; visibility: string };
  },
  exportCode: async (organizationId: string, siteId: string, source: "draft" | "published") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please sign in again before exporting.");
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-export`;
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ organizationId, siteId, source }) });
    if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error || "Unable to export this website."); }
    return response.blob();
  },
  listSites: (organizationId: string) =>
    call({ operation: "listSites", organizationId }),
  getSite: (organizationId: string, siteId: string) =>
    call({ operation: "getSite", organizationId, siteId }),
  createSite: (
    organizationId: string,
    name: string,
    slug?: string,
    templateId?: string,
  ) =>
    call({ operation: "createSite", organizationId, name, slug, templateId }),
  listPages: (organizationId: string, siteId: string) =>
    call({ operation: "listPages", organizationId, siteId }),
  createPage: (
    organizationId: string,
    siteId: string,
    name: string,
    slug: string,
  ) => call({ operation: "createPage", organizationId, siteId, name, slug }),
  setHomepage: (organizationId: string, siteId: string, pageId: string) =>
    call({ operation: "setHomepage", organizationId, siteId, pageId }),
  listAssets: (organizationId: string, siteId: string) =>
    call({ operation: "listAssets", organizationId, siteId }),
  uploadAsset: (body: Record<string, unknown>) =>
    call({ operation: "uploadAsset", ...body }),
  deleteAsset: (organizationId: string, siteId: string, assetId: string) =>
    call({ operation: "deleteAsset", organizationId, siteId, assetId }),
  saveSiteSettings: (body: Record<string, unknown>) =>
    call({ operation: "saveSiteSettings", ...body }),
  getPageDocument: (organizationId: string, siteId: string, pageId: string) =>
    call({ operation: "getPageDocument", organizationId, siteId, pageId }),
  updatePageMetadata: (body: Record<string, unknown>) =>
    call({ operation: "updatePageMetadata", ...body }),
  savePageDocument: (body: Record<string, unknown>) =>
    call({ operation: "savePageDocument", ...body }),
  listReleases: (organizationId: string, siteId: string) =>
    call({ operation: "listReleases", organizationId, siteId }),
  publishSite: (organizationId: string, siteId: string) =>
    call({ operation: "publishSite", organizationId, siteId }),
  unpublishSite: (organizationId: string, siteId: string) =>
    call({ operation: "unpublishSite", organizationId, siteId }),
  generateAgentPlan: (body: Record<string, unknown>) =>
    agentCall({ operation: "generatePlan", ...body }),
  applyAgentPlan: (organizationId: string, planId: string) =>
    agentCall({ operation: "applyPlan", organizationId, planId }),
  generateEditPlan: (body: Record<string, unknown>) =>
    agentCall({ operation: "generateEditPlan", ...body }),
  applyEditPlan: (organizationId: string, planId: string) =>
    agentCall({ operation: "applyEditPlan", organizationId, planId }),
  listEditPlans: (organizationId: string, siteId: string) =>
    agentCall({ operation: "listEditPlans", organizationId, siteId }),
};
