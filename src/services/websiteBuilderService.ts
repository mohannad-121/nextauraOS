import { supabase } from "./supabaseClient";

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
    throw new Error(
      data?.error || responseError || "Unable to manage websites.",
    );
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
    throw new Error(
      data?.error || responseError || "Website AI is unavailable.",
    );
  return data;
};
export const websiteBuilderService = {
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
};
