import { supabase } from './supabaseClient';
const call = async (body: Record<string, unknown>) => { const { data, error } = await supabase.functions.invoke('automation-workflows', { body }); if (error || !data?.success) throw new Error(data?.error || 'Unable to manage automations.'); return data; };
export const automationService = {
  list: (organizationId: string) => call({ operation: 'list', organizationId }),
  runs: (organizationId: string) => call({ operation: 'listRuns', organizationId }),
  runDetail: (organizationId: string, runId: string) => call({ operation: 'runDetail', organizationId, runId }),
  create: (body: Record<string, unknown>) => call(body),
  update: (body: Record<string, unknown>) => call({ ...body, _method: 'PATCH' }),
  remove: (organizationId: string, workflowId: string) => call({ organizationId, workflowId, _method: 'DELETE' }),
  testTrigger: (body: { organizationId: string; workflowId: string; triggerNodeId?: string; message?: string; isReply?: boolean; postId?: string }) => call({ operation: 'testTrigger', ...body }),
};
