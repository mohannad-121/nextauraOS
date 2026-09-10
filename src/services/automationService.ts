import { supabase } from './supabaseClient';

async function extractErrorMessage(data: any, error: any): Promise<string> {
  if (data && typeof data === 'object' && typeof data.error === 'string' && data.error.trim()) {
    return data.error.trim();
  }
  if (error && typeof error === 'object') {
    if ('context' in error && error.context) {
      try {
        const ctx = error.context;
        const res = typeof ctx.clone === 'function' ? ctx.clone() : ctx;
        if (typeof res.json === 'function') {
          const body = await res.json();
          if (body?.error && typeof body.error === 'string' && body.error.trim()) {
            return body.error.trim();
          }
          if (body?.message && typeof body.message === 'string' && body.message.trim()) {
            return body.message.trim();
          }
        } else if (typeof res.text === 'function') {
          const text = await res.text();
          if (text && text.trim()) return text.trim();
        }
      } catch {
        // Ignore parsing errors
      }
    }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }
  }
  return 'Unable to manage automations.';
}

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('automation-workflows', { body });
  if (error || !data?.success) {
    const message = await extractErrorMessage(data, error);
    throw new Error(message);
  }
  return data;
};
export const automationService = {
  list: (organizationId: string) => call({ operation: 'list', organizationId }),
  runs: (organizationId: string) => call({ operation: 'listRuns', organizationId }),
  runDetail: (organizationId: string, runId: string) => call({ operation: 'runDetail', organizationId, runId }),
  create: (body: Record<string, unknown>) => call(body),
  update: (body: Record<string, unknown>) => call({ ...body, _method: 'PATCH' }),
  remove: (organizationId: string, workflowId: string) => call({ organizationId, workflowId, _method: 'DELETE' }),
  testTrigger: (body: { organizationId: string; workflowId: string; triggerNodeId?: string; message?: string; isReply?: boolean; postId?: string }) => call({ operation: 'testTrigger', ...body }),
};
