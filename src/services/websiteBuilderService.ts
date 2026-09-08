import { supabase } from './supabaseClient';

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('website-builder', { body });
  if (error || !data?.success) throw new Error(data?.error || 'Unable to manage websites.');
  return data;
};
export const websiteBuilderService = {
  listSites: (organizationId: string) => call({ operation: 'listSites', organizationId }),
  getSite: (organizationId: string, siteId: string) => call({ operation: 'getSite', organizationId, siteId }),
  createSite: (organizationId: string, name: string, slug?: string) => call({ operation: 'createSite', organizationId, name, slug }),
  listPages: (organizationId: string, siteId: string) => call({ operation: 'listPages', organizationId, siteId }),
  createPage: (organizationId: string, siteId: string, name: string, slug: string) => call({ operation: 'createPage', organizationId, siteId, name, slug }),
  setHomepage: (organizationId: string, siteId: string, pageId: string) => call({ operation: 'setHomepage', organizationId, siteId, pageId }),
  listAssets: (organizationId: string, siteId: string) => call({ operation: 'listAssets', organizationId, siteId }),
  uploadAsset: (body: Record<string, unknown>) => call({ operation: 'uploadAsset', ...body }),
  deleteAsset: (organizationId: string, siteId: string, assetId: string) => call({ operation: 'deleteAsset', organizationId, siteId, assetId }),
  saveSiteSettings: (body: Record<string, unknown>) => call({ operation: 'saveSiteSettings', ...body }),
  getPageDocument: (organizationId: string, siteId: string, pageId: string) => call({ operation: 'getPageDocument', organizationId, siteId, pageId }),
  updatePageMetadata: (body: Record<string, unknown>) => call({ operation: 'updatePageMetadata', ...body }),
  savePageDocument: (body: Record<string, unknown>) => call({ operation: 'savePageDocument', ...body }),
};
