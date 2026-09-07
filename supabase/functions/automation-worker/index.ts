import { adminClient } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';

const DEFAULT_BATCH_SIZE = 25;
const LEASE_SECONDS = 120;
const NO_SUPPORTED_ACTIONS_SUMMARY = 'Definition matched; no supported action execution is configured.';
const NOTIFICATION_RESULT_SUMMARY = 'Notification action completed.';
const NOTIFICATION_FAILURE_SUMMARY = 'Automation notification action could not be completed.';

function boundedBatchSize(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : DEFAULT_BATCH_SIZE;
}

function requireInternalServiceCall(req: Request) {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authorization = req.headers.get('authorization') ?? '';
  const apiKey = req.headers.get('apikey') ?? '';
  if (!serviceRoleKey || (authorization !== `Bearer ${serviceRoleKey}` && apiKey !== serviceRoleKey)) {
    throw new Error('Unauthorized internal worker invocation.');
  }
}

function validateNotificationAction(action: unknown) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    throw new Error(NOTIFICATION_FAILURE_SUMMARY);
  }
  const record = action as Record<string, unknown>;
  if (record.type !== 'create_notification' || !record.config || typeof record.config !== 'object' || Array.isArray(record.config)) {
    throw new Error(NOTIFICATION_FAILURE_SUMMARY);
  }
  const config = record.config as Record<string, unknown>;
  if (Object.keys(config).some((key) => key !== 'title' && key !== 'message')
    || typeof config.title !== 'string'
    || typeof config.message !== 'string') {
    throw new Error(NOTIFICATION_FAILURE_SUMMARY);
  }
  const title = config.title.trim();
  const message = config.message.trim();
  if (!title || title.length > 160 || !message || message.length > 2000) {
    throw new Error(NOTIFICATION_FAILURE_SUMMARY);
  }
  return { title, message };
}

async function executeNotificationActions(admin: any, run: Record<string, unknown>) {
  const organizationId = String(run.organization_id || '');
  const workflowId = String(run.workflow_id || '');
  const runId = String(run.id || '');
  if (!organizationId || !workflowId || !runId) throw new Error(NOTIFICATION_FAILURE_SUMMARY);

  const entitlements = await getOrganizationEntitlements(admin, organizationId);
  if (!entitlements.access_active || !entitlements.automation_access) {
    throw new Error('Automation access is not active for this organization.');
  }

  const { data: workflow, error: workflowError } = await admin
    .from('automation_workflows')
    .select('organization_id,actions')
    .eq('id', workflowId)
    .eq('organization_id', organizationId)
    .eq('enabled', true)
    .maybeSingle();
  if (workflowError || !workflow) throw new Error(NOTIFICATION_FAILURE_SUMMARY);
  if (!Array.isArray(workflow.actions)) throw new Error(NOTIFICATION_FAILURE_SUMMARY);

  let notificationsCreated = 0;
  for (const [actionIndex, action] of workflow.actions.entries()) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) throw new Error(NOTIFICATION_FAILURE_SUMMARY);
    const actionType = (action as Record<string, unknown>).type;
    if (actionType === 'outgoing_webhook') continue;
    if (actionType !== 'create_notification') throw new Error(NOTIFICATION_FAILURE_SUMMARY);
    const { title, message } = validateNotificationAction(action);
    const { data, error } = await admin.from('notifications').upsert({
      organization_id: organizationId,
      title,
      message,
      type: 'automation',
      source: 'automation',
      automation_run_id: runId,
      automation_action_index: actionIndex,
    }, {
      onConflict: 'automation_run_id,automation_action_index',
      ignoreDuplicates: true,
    }).select('id');
    if (error) throw new Error(NOTIFICATION_FAILURE_SUMMARY);
    if (data?.length) notificationsCreated += 1;
  }

  return notificationsCreated;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed.' }, { status: 405 });
  }

  try {
    requireInternalServiceCall(req);
    let body: Record<string, unknown> = {};
    if (req.headers.get('content-type')?.includes('application/json')) {
      body = await req.json();
    }
    const batchSize = boundedBatchSize(body.batchSize);
    const admin = adminClient();

    const { data: enqueueResult, error: enqueueError } = await admin.rpc('enqueue_automation_runs', {
      p_event_batch_size: batchSize,
    });
    if (enqueueError) throw enqueueError;

    const leaseToken = crypto.randomUUID();
    const { data: claimedRuns, error: claimError } = await admin.rpc('claim_automation_runs', {
      p_run_batch_size: batchSize,
      p_lease_seconds: LEASE_SECONDS,
      p_lease_token: leaseToken,
    });
    if (claimError) throw claimError;

    let completedRuns = 0;
    let failedRuns = 0;
    for (const run of claimedRuns || []) {
      try {
        const notificationsCreated = await executeNotificationActions(admin, run);
        const { error: completionError } = await admin.rpc('complete_automation_run', {
          p_run_id: run.id,
          p_lease_token: leaseToken,
          p_succeeded: true,
          p_summary: notificationsCreated ? NOTIFICATION_RESULT_SUMMARY : NO_SUPPORTED_ACTIONS_SUMMARY,
        });
        if (completionError) throw completionError;
        completedRuns += 1;
      } catch {
        const { error: failureError } = await admin.rpc('complete_automation_run', {
          p_run_id: run.id,
          p_lease_token: leaseToken,
          p_succeeded: false,
          p_summary: NOTIFICATION_FAILURE_SUMMARY,
        });
        if (failureError) throw failureError;
        failedRuns += 1;
      }
    }

    return Response.json({
      success: true,
      events_processed: enqueueResult?.events_processed ?? 0,
      runs_created: enqueueResult?.runs_created ?? 0,
      runs_claimed: (claimedRuns || []).length,
      runs_completed: completedRuns,
      runs_failed: failedRuns,
    });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message || 'Unable to process automation runs.' }, { status: 401 });
  }
});
