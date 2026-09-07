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
  getPageDocument: (organizationId: string, siteId: string, pageId: string) => call({ operation: 'getPageDocument', organizationId, siteId, pageId }),
  updatePageMetadata: (body: Record<string, unknown>) => call({ operation: 'updatePageMetadata', ...body }),
  savePageDocument: (body: Record<string, unknown>) => call({ operation: 'savePageDocument', ...body }),
};
