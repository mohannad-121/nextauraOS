import { adminClient } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';
import { assertPublicWebhookTarget, discardBoundedResponse, isRetryableWebhookStatus, validateOutgoingWebhookAction, WebhookActionError } from '../_shared/webhook-security.ts';
import { AutomationConditionError, evaluateAutomationCondition } from '../_shared/automation-condition.ts';
import { getValidGoogleAccessToken } from '../_shared/google-oauth.ts';

const DEFAULT_BATCH_SIZE = 25;
const LEASE_SECONDS = 120;
const NO_SUPPORTED_ACTIONS_SUMMARY = 'Definition matched; no supported action execution is configured.';
const NOTIFICATION_RESULT_SUMMARY = 'Notification action completed.';
const WEBHOOK_RESULT_SUMMARY = 'Webhook action completed.';
const GMAIL_RESULT_SUMMARY = 'Gmail action completed.';
const NOTIFICATION_FAILURE_SUMMARY = 'Automation notification action could not be completed.';

type AutomationRun = Record<string, unknown>;
type AutomationEvent = { id: string; organization_id: string; event_type: string; entity_type: string; entity_id: string | null; payload: Record<string, unknown>; occurred_at: string };
type ResolvedAction = { action: unknown; actionIndex: number };

function boundedBatchSize(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : DEFAULT_BATCH_SIZE;
}

function requireInternalServiceCall(req: Request) {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authorization = req.headers.get('authorization') ?? '';
  const apiKey = req.headers.get('apikey') ?? '';
  const schedulerSecret = Deno.env.get('AUTOMATION_WORKER_SECRET') ?? '';
  const schedulerAuthorized = Boolean(schedulerSecret) && req.headers.get('x-automation-worker-secret') === schedulerSecret;
  if (!schedulerAuthorized && (!serviceRoleKey || (authorization !== `Bearer ${serviceRoleKey}` && apiKey !== serviceRoleKey))) throw new Error('Unauthorized internal worker invocation.');
}

function validateNotificationAction(action: unknown) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) throw new WebhookActionError(NOTIFICATION_FAILURE_SUMMARY);
  const record = action as Record<string, unknown>;
  if (record.type !== 'create_notification' || !record.config || typeof record.config !== 'object' || Array.isArray(record.config)) throw new WebhookActionError(NOTIFICATION_FAILURE_SUMMARY);
  const config = record.config as Record<string, unknown>;
  if (Object.keys(config).some((key) => key !== 'title' && key !== 'message') || typeof config.title !== 'string' || typeof config.message !== 'string') throw new WebhookActionError(NOTIFICATION_FAILURE_SUMMARY);
  const title = config.title.trim();
  const message = config.message.trim();
  if (!title || title.length > 160 || !message || message.length > 2000) throw new WebhookActionError(NOTIFICATION_FAILURE_SUMMARY);
  return { title, message };
}

async function recordWebhookAudit(admin: any, organizationId: string, action: string, details: Record<string, unknown>) {
  const { error } = await admin.from('audit_logs').insert({ organization_id: organizationId, user_name: 'Automation Worker', action, details: JSON.stringify(details) });
  if (error) console.error('automation_webhook_audit_failed', { organization_id: organizationId, action });
}

async function loadEvent(admin: any, run: AutomationRun): Promise<AutomationEvent> {
  const organizationId = String(run.organization_id || '');
  const eventId = String(run.event_id || '');
  const { data, error } = await admin.from('automation_events').select('id,organization_id,event_type,entity_type,entity_id,payload,occurred_at').eq('id', eventId).eq('organization_id', organizationId).maybeSingle();
  if (error || !data || !data.payload || typeof data.payload !== 'object' || Array.isArray(data.payload)) throw new WebhookActionError('Automation event is unavailable.', false);
  return data as AutomationEvent;
}

async function acquireWebhookDelivery(admin: any, organizationId: string, runId: string, actionIndex: number) {
  const { data: existing, error: existingError } = await admin.from('automation_action_deliveries').select('id,status,attempt_count').eq('organization_id', organizationId).eq('run_id', runId).eq('action_index', actionIndex).maybeSingle();
  if (existingError) throw new Error('Unable to load webhook delivery.');
  if (existing?.status === 'succeeded') return { id: String(existing.id), succeeded: true };
  const now = new Date().toISOString();
  if (existing) {
    const { data, error } = await admin.from('automation_action_deliveries').update({ status: 'running', attempt_count: Number(existing.attempt_count || 0) + 1, http_status: null, error_summary: null, started_at: now, completed_at: null }).eq('id', existing.id).eq('organization_id', organizationId).select('id').single();
    if (error || !data) throw new Error('Unable to claim webhook delivery.');
    return { id: String(data.id), succeeded: false };
  }
  const { data, error } = await admin.from('automation_action_deliveries').insert({ organization_id: organizationId, run_id: runId, action_index: actionIndex, action_type: 'outgoing_webhook', status: 'running', attempt_count: 1, started_at: now }).select('id').single();
  if (error || !data) throw new Error('Unable to create webhook delivery.');
  return { id: String(data.id), succeeded: false };
}

async function completeWebhookDelivery(admin: any, deliveryId: string, organizationId: string, status: 'succeeded' | 'failed', httpStatus: number | null, errorSummary: string | null) {
  const { error } = await admin.from('automation_action_deliveries').update({ status, http_status: httpStatus, error_summary: errorSummary, completed_at: new Date().toISOString() }).eq('id', deliveryId).eq('organization_id', organizationId);
  if (error) throw new Error('Unable to complete webhook delivery.');
}

async function executeNotificationAction(admin: any, run: AutomationRun, action: unknown, actionIndex: number) {
  const organizationId = String(run.organization_id || '');
  const runId = String(run.id || '');
  const { title, message } = validateNotificationAction(action);
  const { error } = await admin.from('notifications').upsert({ organization_id: organizationId, title, message, type: 'automation', source: 'automation', automation_run_id: runId, automation_action_index: actionIndex }, { onConflict: 'automation_run_id,automation_action_index', ignoreDuplicates: true });
  if (error) throw new WebhookActionError(NOTIFICATION_FAILURE_SUMMARY);
}

async function executeOutgoingWebhook(admin: any, run: AutomationRun, event: AutomationEvent, action: unknown, actionIndex: number) {
  const organizationId = String(run.organization_id || '');
  const workflowId = String(run.workflow_id || '');
  const runId = String(run.id || '');
  const delivery = await acquireWebhookDelivery(admin, organizationId, runId, actionIndex);
  if (delivery.succeeded) return;
  let hostname = '';
  let httpStatus: number | null = null;
  try {
    const entitlements = await getOrganizationEntitlements(admin, organizationId);
    if (!entitlements.access_active || !entitlements.automation_access) throw new WebhookActionError('Automation access is not active for this organization.', false);
    const url = validateOutgoingWebhookAction(action);
    hostname = url.hostname.toLowerCase();
    await assertPublicWebhookTarget(url);
    const payload = { event_type: event.event_type, organization_id: organizationId, entity_type: event.entity_type, entity_id: event.entity_id, payload: event.payload, workflow_id: workflowId, run_id: runId, occurred_at: event.occurred_at };
    let response: Response;
    try {
      response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload), redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    } catch (error) {
      throw new WebhookActionError(error instanceof DOMException && error.name === 'TimeoutError' ? 'Webhook request timed out.' : 'Webhook network request failed.', true);
    }
    httpStatus = response.status;
    await discardBoundedResponse(response);
    if (response.status < 200 || response.status >= 300) throw new WebhookActionError(`Webhook endpoint returned HTTP ${response.status}.`, isRetryableWebhookStatus(response.status));
    await completeWebhookDelivery(admin, delivery.id, organizationId, 'succeeded', response.status, null);
    await recordWebhookAudit(admin, organizationId, 'automation.webhook.succeeded', { workflow_id: workflowId, run_id: runId, action_index: actionIndex, http_status: response.status, hostname });
  } catch (error) {
    const actionError = error instanceof WebhookActionError ? error : new WebhookActionError('Webhook delivery could not be completed.', true);
    await completeWebhookDelivery(admin, delivery.id, organizationId, 'failed', httpStatus, actionError.message.slice(0, 1000));
    await recordWebhookAudit(admin, organizationId, 'automation.webhook.failed', { workflow_id: workflowId, run_id: runId, action_index: actionIndex, http_status: httpStatus, hostname });
    throw actionError;
  }
}

function gmailConfig(action: unknown) { const config = (action as any)?.config; if (!config || typeof config !== 'object' || (action as any).type !== 'gmail_send_email' || !config.connection_id || !config.to || !config.subject || !config.body) throw new WebhookActionError('Gmail send configuration is invalid.', false); return config as Record<string, string>; }
function mime(config: Record<string, string>) { const header = (name: string, value?: string) => value ? `${name}: ${value.replace(/[\r\n]/g, ' ')}` : ''; return [header('To', config.to), header('Cc', config.cc), header('Bcc', config.bcc), header('Subject', config.subject), 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', config.body.replace(/\r?\n/g, '\r\n')].filter(Boolean).join('\r\n'); }
async function executeGmailSend(admin: any, run: AutomationRun, action: unknown, actionIndex: number) {
  const organizationId = String(run.organization_id); const runId = String(run.id); const config = gmailConfig(action); const { data: prior } = await admin.from('automation_action_deliveries').select('id,status,attempt_count').eq('organization_id', organizationId).eq('run_id', runId).eq('action_index', actionIndex).maybeSingle(); if (prior?.status === 'succeeded') return;
  const now = new Date().toISOString(); const delivery = prior ? await admin.from('automation_action_deliveries').update({ status: 'running', attempt_count: Number(prior.attempt_count || 0) + 1, error_summary: null, started_at: now, completed_at: null }).eq('id', prior.id).select('id').single() : await admin.from('automation_action_deliveries').insert({ organization_id: organizationId, run_id: runId, action_index: actionIndex, action_type: 'gmail_send_email', status: 'running', attempt_count: 1, started_at: now }).select('id').single(); if (delivery.error || !delivery.data) throw new WebhookActionError('Gmail delivery could not be claimed.', true);
  try { const { data: connection } = await admin.from('integration_connections').select('scopes,status,provider,auth_type').eq('id', config.connection_id).eq('organization_id', organizationId).maybeSingle(); if (!connection || connection.status !== 'active' || connection.provider !== 'google' || connection.auth_type !== 'oauth' || !Array.isArray(connection.scopes) || !connection.scopes.includes('https://www.googleapis.com/auth/gmail.send')) throw new WebhookActionError('Gmail permission is required for this connection.', false); const { accessToken } = await getValidGoogleAccessToken(config.connection_id, organizationId); const raw = btoa(unescape(encodeURIComponent(mime(config)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''); const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ raw }), signal: AbortSignal.timeout(10_000) }); const status = response.status; const payload = await response.json().catch(() => ({})); if (!response.ok) throw new WebhookActionError('Gmail rejected the email request.', status === 429 || status >= 500); await admin.from('automation_action_deliveries').update({ status: 'succeeded', http_status: status, completed_at: new Date().toISOString(), error_summary: null }).eq('id', delivery.data.id); await recordWebhookAudit(admin, organizationId, 'automation.gmail.succeeded', { workflow_id: run.workflow_id, run_id: runId, action_index: actionIndex, recipient: config.to, gmail_message_id: typeof payload?.id === 'string' ? payload.id : null }); }
  catch (error) { const e = error instanceof WebhookActionError ? error : new WebhookActionError('Gmail delivery could not be completed.', true); await admin.from('automation_action_deliveries').update({ status: 'failed', error_summary: e.message.slice(0, 1000), completed_at: new Date().toISOString() }).eq('id', delivery.data.id); throw e; }
}

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }

function resolveWorkflowActions(workflow: Record<string, unknown>, event: AutomationEvent): { actions: ResolvedAction[]; selectedBranch: 'true' | 'false' | 'linear' } {
  const plan = workflow.execution_plan;
  if (!isRecord(plan) || Object.keys(plan).length === 0) {
    if (!Array.isArray(workflow.actions)) throw new WebhookActionError('Automation workflow is unavailable.', false);
    return { actions: workflow.actions.map((action, actionIndex) => ({ action, actionIndex })), selectedBranch: 'linear' };
  }
  if (!isRecord(plan.trigger) || plan.trigger.type !== event.event_type || !Array.isArray(plan.true_actions) || !Array.isArray(plan.false_actions) || !Object.prototype.hasOwnProperty.call(plan, 'condition')) throw new WebhookActionError('Automation execution plan is invalid.', false);
  const allActions = [...plan.true_actions, ...plan.false_actions];
  if (allActions.length > 20) throw new WebhookActionError('Automation execution plan exceeds action limits.', false);
  const actionIndexes = new Map<string, number>();
  for (const [index, action] of allActions.entries()) {
    if (!isRecord(action) || typeof action.node_id !== 'string' || !action.node_id || actionIndexes.has(action.node_id)) throw new WebhookActionError('Automation execution plan action is invalid.', false);
    actionIndexes.set(action.node_id, index);
  }
  try {
    const conditionResult = plan.condition === null ? null : evaluateAutomationCondition(plan.condition, event.payload);
    const selectedBranch: 'true' | 'false' | 'linear' = conditionResult === null ? 'linear' : conditionResult ? 'true' : 'false';
    const selected = conditionResult === false ? plan.false_actions : plan.true_actions;
    return { actions: selected.map((action: any) => ({ action, actionIndex: actionIndexes.get(action.node_id)! })), selectedBranch };
  } catch (error) {
    if (error instanceof AutomationConditionError) throw new WebhookActionError(error.message, false);
    throw error;
  }
}

async function executeActions(admin: any, run: AutomationRun) {
  const organizationId = String(run.organization_id || '');
  const workflowId = String(run.workflow_id || '');
  if (!organizationId || !workflowId || !run.id) throw new WebhookActionError('Automation run is invalid.', false);
  const entitlements = await getOrganizationEntitlements(admin, organizationId);
  if (!entitlements.access_active || !entitlements.automation_access) throw new WebhookActionError('Automation access is not active for this organization.', false);
  const [{ data: workflow, error: workflowError }, event] = await Promise.all([
    admin.from('automation_workflows').select('organization_id,actions,execution_plan').eq('id', workflowId).eq('organization_id', organizationId).eq('enabled', true).maybeSingle(),
    loadEvent(admin, run),
  ]);
  if (workflowError || !workflow) throw new WebhookActionError('Automation workflow is unavailable.', false);
  const { actions, selectedBranch } = resolveWorkflowActions(workflow, event);
  let notificationActions = 0;
  let webhookActions = 0;
  let gmailActions = 0;
  for (const { action, actionIndex } of actions) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) throw new WebhookActionError('Automation action is invalid.', false);
    const actionType = (action as Record<string, unknown>).type;
    if (actionType === 'create_notification') { await executeNotificationAction(admin, run, action, actionIndex); notificationActions += 1; continue; }
    if (actionType === 'outgoing_webhook') { await executeOutgoingWebhook(admin, run, event, action, actionIndex); webhookActions += 1; continue; }
    if (actionType === 'gmail_send_email') { await executeGmailSend(admin, run, action, actionIndex); gmailActions += 1; continue; }
    throw new WebhookActionError('Automation action is not supported.', false);
  }
  const branchSuffix = ` (${selectedBranch} branch)`;
  if (webhookActions) return WEBHOOK_RESULT_SUMMARY + branchSuffix;
  if (gmailActions) return GMAIL_RESULT_SUMMARY + branchSuffix;
  if (notificationActions) return NOTIFICATION_RESULT_SUMMARY + branchSuffix;
  return NO_SUPPORTED_ACTIONS_SUMMARY + branchSuffix;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ success: false, error: 'Method not allowed.' }, { status: 405 });
  try {
    requireInternalServiceCall(req);
    let body: Record<string, unknown> = {};
    if (req.headers.get('content-type')?.includes('application/json')) body = await req.json();
    const batchSize = boundedBatchSize(body.batchSize);
    const admin = adminClient();
    const { data: enqueueResult, error: enqueueError } = await admin.rpc('enqueue_automation_runs', { p_event_batch_size: batchSize });
    if (enqueueError) throw enqueueError;
    const leaseToken = crypto.randomUUID();
    const { data: claimedRuns, error: claimError } = await admin.rpc('claim_automation_runs', { p_run_batch_size: batchSize, p_lease_seconds: LEASE_SECONDS, p_lease_token: leaseToken });
    if (claimError) throw claimError;
    let completedRuns = 0;
    let failedRuns = 0;
    for (const run of claimedRuns || []) {
      try {
        const summary = await executeActions(admin, run);
        const { error } = await admin.rpc('complete_automation_run', { p_run_id: run.id, p_lease_token: leaseToken, p_succeeded: true, p_summary: summary });
        if (error) throw error;
        completedRuns += 1;
      } catch (error) {
        const actionError = error instanceof WebhookActionError ? error : error instanceof AutomationConditionError ? new WebhookActionError(error.message, false) : new WebhookActionError('Automation action could not be completed.', true);
        const rpc = actionError.retryable ? 'complete_automation_run' : 'complete_automation_run_terminal_failure';
        const args = actionError.retryable ? { p_run_id: run.id, p_lease_token: leaseToken, p_succeeded: false, p_summary: actionError.message } : { p_run_id: run.id, p_lease_token: leaseToken, p_summary: actionError.message };
        const { error: failureError } = await admin.rpc(rpc, args);
        if (failureError) throw failureError;
        failedRuns += 1;
      }
    }
    return Response.json({ success: true, events_processed: enqueueResult?.events_processed ?? 0, runs_created: enqueueResult?.runs_created ?? 0, runs_claimed: (claimedRuns || []).length, runs_completed: completedRuns, runs_failed: failedRuns });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message || 'Unable to process automation runs.' }, { status: 401 });
  }
});
