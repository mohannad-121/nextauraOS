import { adminClient } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';
import { assertPublicWebhookTarget, discardBoundedResponse, isRetryableWebhookStatus, validateOutgoingWebhookAction, WebhookActionError } from '../_shared/webhook-security.ts';
import { AutomationConditionError, evaluateAutomationCondition } from '../_shared/automation-condition.ts';
import { decryptIntegrationCredential, getValidGoogleAccessToken } from '../_shared/google-oauth.ts';
import { getMetaConnection, postFacebookCommentReply, MetaIntegrationError } from '../_shared/meta-integration.ts';
import { sendInstagramPrivateReply, InstagramIntegrationError, type InstagramCredential } from '../_shared/instagram-integration.ts';

const DEFAULT_BATCH_SIZE = 25;
const LEASE_SECONDS = 120;
const NO_SUPPORTED_ACTIONS_SUMMARY = 'Definition matched; no supported action execution is configured.';
const NOTIFICATION_RESULT_SUMMARY = 'Notification action completed.';
const WEBHOOK_RESULT_SUMMARY = 'Webhook action completed.';
const GMAIL_RESULT_SUMMARY = 'Gmail action completed.';
const NOTIFICATION_FAILURE_SUMMARY = 'Automation notification action could not be completed.';

type AutomationRun = Record<string, unknown>;
type AutomationEvent = { id: string; organization_id: string; event_type: string; entity_type: string; entity_id: string | null; payload: Record<string, unknown>; occurred_at: string; source?: string | null };
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
  const { data, error } = await admin.from('automation_events').select('id,organization_id,event_type,entity_type,entity_id,payload,occurred_at,source').eq('id', eventId).eq('organization_id', organizationId).maybeSingle();
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

class GmailActionError extends WebhookActionError {
  constructor(message: string, retryable: boolean, public readonly httpStatus: number | null = null, public readonly providerErrorCode: string | null = null, public readonly providerErrorReason: string | null = null) { super(message, retryable); this.name = 'GmailActionError'; }
}
function gmailConfig(action: unknown) { const config = (action as any)?.config; if (!config || typeof config !== 'object' || (action as any).type !== 'gmail_send_email' || !config.connection_id || !config.to || !config.subject || !config.body) throw new GmailActionError('Gmail send configuration is invalid.', false); return config as Record<string, string>; }
function emailAddress(value: string | null) { return typeof value === 'string' && /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value) ? value : null; }
function mime(config: Record<string, string>, from: string) { const header = (name: string, value: string) => `${name}: ${value.replace(/[\r\n]/g, ' ')}`; const optional = (name: string, value?: string) => value ? [header(name, value)] : []; return [header('From', from), header('To', config.to), ...optional('Cc', config.cc), ...optional('Bcc', config.bcc), header('Subject', config.subject), `Date: ${new Date().toUTCString()}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: 8bit', '', config.body.replace(/\r?\n/g, '\r\n')].join('\r\n'); }
function base64Url(value: string) { let binary = ''; for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte); return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''); }
function safeGmailFailure(status: number, payload: unknown) { const error = payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as Record<string, any>).error : null; const code = typeof error?.status === 'string' ? error.status.slice(0, 128) : null; const reason = typeof error?.errors?.[0]?.reason === 'string' ? error.errors[0].reason.slice(0, 256) : null; const message = typeof error?.message === 'string' ? error.message : ''; if (status === 401 || reason === 'invalidCredentials') return new GmailActionError('Google account needs reconnection.', false, status, code, reason || 'invalidCredentials'); if (reason === 'accessNotConfigured') return new GmailActionError('Gmail API is not enabled for this Google Cloud project.', false, status, code, reason); if (status === 403 || reason === 'insufficientPermissions') return new GmailActionError('Gmail permission is missing. Reconnect the Google account.', false, status, code, reason || 'insufficientPermissions'); if (status === 400 && /from|rfc 2822|mime/i.test(message)) return new GmailActionError('Gmail message format is invalid.', false, status, code, reason || 'invalidArgument'); if (status === 429 || status >= 500) return new GmailActionError('Gmail is temporarily unavailable. The delivery will retry.', true, status, code, reason); return new GmailActionError('Gmail rejected the email request.', false, status, code, reason); }
async function executeGmailSend(admin: any, run: AutomationRun, action: unknown, actionIndex: number) {
  const organizationId = String(run.organization_id); const runId = String(run.id); const config = gmailConfig(action); const { data: prior } = await admin.from('automation_action_deliveries').select('id,status,attempt_count').eq('organization_id', organizationId).eq('run_id', runId).eq('action_index', actionIndex).maybeSingle(); if (prior?.status === 'succeeded') return;
  const now = new Date().toISOString(); const delivery = prior ? await admin.from('automation_action_deliveries').update({ status: 'running', attempt_count: Number(prior.attempt_count || 0) + 1, http_status: null, error_summary: null, provider_error_code: null, provider_error_reason: null, started_at: now, completed_at: null }).eq('id', prior.id).select('id').single() : await admin.from('automation_action_deliveries').insert({ organization_id: organizationId, run_id: runId, action_index: actionIndex, action_type: 'gmail_send_email', status: 'running', attempt_count: 1, started_at: now }).select('id').single(); if (delivery.error || !delivery.data) throw new WebhookActionError('Gmail delivery could not be claimed.', true);
  try { const { data: connection } = await admin.from('integration_connections').select('scopes,status,provider,auth_type').eq('id', config.connection_id).eq('organization_id', organizationId).maybeSingle(); if (!connection || connection.status !== 'active' || connection.provider !== 'google' || connection.auth_type !== 'oauth' || !Array.isArray(connection.scopes) || !connection.scopes.includes('https://www.googleapis.com/auth/gmail.send')) throw new GmailActionError('Gmail permission is required for this connection.', false); const { accessToken, accountLabel } = await getValidGoogleAccessToken(config.connection_id, organizationId); const from = emailAddress(accountLabel); if (!from) throw new GmailActionError('Google connection needs reconnection.', false); const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ raw: base64Url(mime(config, from)) }), signal: AbortSignal.timeout(10_000) }); const status = response.status; const payload = await response.json().catch(() => ({})); if (!response.ok) throw safeGmailFailure(status, payload); await admin.from('automation_action_deliveries').update({ status: 'succeeded', http_status: status, completed_at: new Date().toISOString(), error_summary: null, provider_error_code: null, provider_error_reason: null }).eq('id', delivery.data.id); await recordWebhookAudit(admin, organizationId, 'automation.gmail.succeeded', { workflow_id: run.workflow_id, run_id: runId, action_index: actionIndex, recipient: config.to, gmail_message_id: typeof payload?.id === 'string' ? payload.id : null }); }
  catch (error) { const e = error instanceof GmailActionError ? error : error instanceof WebhookActionError ? new GmailActionError(error.message, error.retryable) : new GmailActionError('Gmail delivery could not be completed.', true); await admin.from('automation_action_deliveries').update({ status: 'failed', http_status: e.httpStatus, error_summary: e.message.slice(0, 1000), provider_error_code: e.providerErrorCode, provider_error_reason: e.providerErrorReason, completed_at: new Date().toISOString() }).eq('id', delivery.data.id); throw e; }
}

class FacebookActionError extends WebhookActionError {
  constructor(
    message: string,
    retryable: boolean,
    public readonly httpStatus: number | null = null,
    public readonly providerErrorCode: string | null = null,
    public readonly providerErrorReason: string | null = null,
  ) {
    super(message, retryable);
    this.name = 'FacebookActionError';
  }
}

export function interpolateVariables(template: string, eventPayload: Record<string, unknown>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*trigger\.([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const val = eventPayload[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

function facebookReplyConfig(action: unknown) {
  const config = (action as any)?.config;
  if (!config || typeof config !== 'object' || (action as any).type !== 'facebook_comment_reply') {
    throw new FacebookActionError('Facebook reply configuration is invalid.', false);
  }
  if (!config.connection_id) {
    throw new FacebookActionError('Facebook connection is required.', false, 400, 'FACEBOOK_CONNECTION_REQUIRED');
  }
  if (!config.resource_id) {
    throw new FacebookActionError('Facebook Page is required.', false, 400, 'FACEBOOK_PAGE_REQUIRED');
  }
  if (!config.comment_id) {
    throw new FacebookActionError('Facebook comment ID is required.', false, 400, 'FACEBOOK_COMMENT_ID_REQUIRED');
  }
  if (!config.message) {
    throw new FacebookActionError('Facebook reply message is required.', false, 400, 'FACEBOOK_REPLY_MESSAGE_REQUIRED');
  }
  return config as Record<string, string>;
}

async function acquireFacebookReplyDelivery(admin: any, organizationId: string, runId: string, actionIndex: number) {
  const { data: existing, error: existingError } = await admin
    .from('automation_action_deliveries')
    .select('id,status,attempt_count')
    .eq('organization_id', organizationId)
    .eq('run_id', runId)
    .eq('action_index', actionIndex)
    .maybeSingle();

  if (existingError) throw new Error('Unable to load Facebook reply delivery.');
  if (existing?.status === 'succeeded') return { id: String(existing.id), succeeded: true };

  const now = new Date().toISOString();
  if (existing) {
    const { data, error } = await admin
      .from('automation_action_deliveries')
      .update({
        status: 'running',
        attempt_count: Number(existing.attempt_count || 0) + 1,
        http_status: null,
        error_summary: null,
        provider_error_code: null,
        provider_error_reason: null,
        started_at: now,
        completed_at: null,
      })
      .eq('id', existing.id)
      .eq('organization_id', organizationId)
      .select('id')
      .single();

    if (error || !data) throw new Error('Unable to claim Facebook reply delivery.');
    return { id: String(data.id), succeeded: false };
  }

  const { data, error } = await admin
    .from('automation_action_deliveries')
    .insert({
      organization_id: organizationId,
      run_id: runId,
      action_index: actionIndex,
      action_type: 'facebook_comment_reply',
      status: 'running',
      attempt_count: 1,
      started_at: now,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error('Unable to create Facebook reply delivery.');
  return { id: String(data.id), succeeded: false };
}

async function executeFacebookCommentReply(
  admin: any,
  run: AutomationRun,
  event: AutomationEvent,
  action: unknown,
  actionIndex: number,
): Promise<{ testMode: boolean }> {
  const organizationId = String(run.organization_id);
  const runId = String(run.id);
  const workflowId = String(run.workflow_id || '');
  const config = facebookReplyConfig(action);

  const delivery = await acquireFacebookReplyDelivery(admin, organizationId, runId, actionIndex);
  if (delivery.succeeded) {
    const isTest = Boolean((event.payload as any)?.test_event) || event.source === 'meta_test';
    return { testMode: isTest };
  }

  const isTest = Boolean((event.payload as any)?.test_event) || event.source === 'meta_test';
  const resolvedCommentId = interpolateVariables(config.comment_id, event.payload).trim();
  const resolvedMessage = interpolateVariables(config.message, event.payload).trim();

  if (!resolvedCommentId) {
    const err = new FacebookActionError('Facebook comment ID is required.', false, 400, 'FACEBOOK_COMMENT_ID_REQUIRED');
    await admin.from('automation_action_deliveries').update({
      status: 'failed',
      http_status: 400,
      error_summary: err.message,
      provider_error_code: err.providerErrorCode,
      completed_at: new Date().toISOString(),
    }).eq('id', delivery.id);
    throw err;
  }

  if (!resolvedMessage) {
    const err = new FacebookActionError('Facebook reply message is required.', false, 400, 'FACEBOOK_REPLY_MESSAGE_REQUIRED');
    await admin.from('automation_action_deliveries').update({
      status: 'failed',
      http_status: 400,
      error_summary: err.message,
      provider_error_code: err.providerErrorCode,
      completed_at: new Date().toISOString(),
    }).eq('id', delivery.id);
    throw err;
  }

  if (isTest) {
    try {
      const { data: connection, error: connError } = await admin
        .from('integration_connections')
        .select('id,provider,status')
        .eq('id', config.connection_id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (connError || !connection || connection.provider !== 'meta' || !['active', 'degraded'].includes(connection.status)) {
        throw new FacebookActionError(
          'Active Meta connection is required.',
          false,
          404,
          'FACEBOOK_CONNECTION_REQUIRED',
        );
      }

      const { data: resource, error: resError } = await admin
        .from('integration_connection_resources')
        .select('id,external_resource_id,selected')
        .eq('connection_id', config.connection_id)
        .eq('organization_id', organizationId)
        .eq('resource_type', 'facebook_page')
        .eq('external_resource_id', config.resource_id)
        .eq('selected', true)
        .maybeSingle();

      if (resError || !resource) {
        throw new FacebookActionError(
          'Selected Facebook Page is not authorized for this connection.',
          false,
          403,
          'FACEBOOK_PAGE_NOT_AUTHORIZED',
        );
      }

      await admin.from('automation_action_deliveries').update({
        status: 'succeeded',
        http_status: 200,
        provider_error_code: null,
        provider_error_reason: 'test_mode',
        error_summary: null,
        completed_at: new Date().toISOString(),
      }).eq('id', delivery.id);

      await recordWebhookAudit(admin, organizationId, 'automation.facebook.reply.simulated', {
        workflow_id: workflowId,
        run_id: runId,
        action_index: actionIndex,
        test_mode: true,
        page_id: config.resource_id,
        comment_id: resolvedCommentId,
      });

      return { testMode: true };
    } catch (error) {
      const err = error instanceof FacebookActionError ? error : new FacebookActionError(
        (error as any)?.message || 'Test mode validation failed.',
        false,
      );
      await admin.from('automation_action_deliveries').update({
        status: 'failed',
        http_status: err.httpStatus,
        error_summary: err.message.slice(0, 1000),
        provider_error_code: err.providerErrorCode,
        provider_error_reason: err.providerErrorReason,
        completed_at: new Date().toISOString(),
      }).eq('id', delivery.id);
      throw err;
    }
  }

  try {
    let context: any;
    try {
      context = await getMetaConnection({
        organizationId,
        connectionId: config.connection_id,
        requiredScopes: ['pages_manage_engagement'],
        requiredResourceType: 'facebook_page',
        resourceId: config.resource_id,
        admin,
      });
    } catch (metaErr: any) {
      if (metaErr instanceof MetaIntegrationError) {
        if (metaErr.code === 'META_PERMISSION_MISSING') {
          throw new FacebookActionError(
            'Additional Facebook permission required: pages_manage_engagement.',
            false,
            403,
            'FACEBOOK_PERMISSION_MISSING',
            'permission_missing',
          );
        }
        if (metaErr.code === 'META_PAGE_NOT_FOUND' || metaErr.code === 'META_RESOURCE_NOT_AUTHORIZED') {
          throw new FacebookActionError(
            'Selected Facebook Page is not authorized.',
            false,
            403,
            'FACEBOOK_PAGE_NOT_AUTHORIZED',
            'page_not_authorized',
          );
        }
        if (metaErr.code === 'META_TOKEN_EXPIRED' || metaErr.code === 'META_RECONNECT_REQUIRED') {
          throw new FacebookActionError(
            'Facebook connection authorization expired. Please reconnect.',
            false,
            401,
            'FACEBOOK_RECONNECT_REQUIRED',
            'reconnect_required',
          );
        }
      }
      throw metaErr;
    }

    const replyResult = await postFacebookCommentReply({
      pageAccessToken: context.accessToken,
      commentId: resolvedCommentId,
      message: resolvedMessage,
    });

    await admin.from('automation_action_deliveries').update({
      status: 'succeeded',
      http_status: 200,
      completed_at: new Date().toISOString(),
      error_summary: null,
      provider_error_code: null,
      provider_error_reason: null,
    }).eq('id', delivery.id);

    await recordWebhookAudit(admin, organizationId, 'automation.facebook.reply.succeeded', {
      workflow_id: workflowId,
      run_id: runId,
      action_index: actionIndex,
      page_id: config.resource_id,
      comment_id: resolvedCommentId,
      reply_comment_id: replyResult.id,
    });

    return { testMode: false };
  } catch (error) {
    let e: FacebookActionError;
    if (error instanceof FacebookActionError) {
      e = error;
    } else if (error instanceof MetaIntegrationError) {
      const retryable = error.status >= 500 || error.status === 429;
      e = new FacebookActionError(error.message, retryable, error.status, error.code, error.code);
    } else if (error instanceof WebhookActionError) {
      e = new FacebookActionError(error.message, error.retryable);
    } else {
      e = new FacebookActionError('Facebook reply could not be completed.', true);
    }

    await admin.from('automation_action_deliveries').update({
      status: 'failed',
      http_status: e.httpStatus,
      error_summary: e.message.slice(0, 1000),
      provider_error_code: e.providerErrorCode,
      provider_error_reason: e.providerErrorReason,
      completed_at: new Date().toISOString(),
    }).eq('id', delivery.id);

    await recordWebhookAudit(admin, organizationId, 'automation.facebook.reply.failed', {
      workflow_id: workflowId,
      run_id: runId,
      action_index: actionIndex,
      http_status: e.httpStatus,
      error_code: e.providerErrorCode,
      error_message: e.message.slice(0, 500),
    });

    throw e;
  }
}

class InstagramActionError extends WebhookActionError {
  constructor(
    message: string,
    retryable = false,
    public readonly httpStatus: number | null = null,
    public readonly providerErrorCode: string | null = null,
    public readonly providerErrorReason: string | null = null,
  ) {
    super(message, retryable);
    this.name = 'InstagramActionError';
  }
}

function instagramReplyConfig(action: unknown) {
  const config = (action as any)?.config;
  if (!config || typeof config !== 'object' || (action as any).type !== 'instagram_private_reply') {
    throw new InstagramActionError('Instagram private reply configuration is invalid.', false);
  }
  if (!config.connection_id) {
    throw new InstagramActionError('Instagram connection is required.', false, 400, 'INSTAGRAM_CONNECTION_REQUIRED');
  }
  const accountId = String(config.account_id || config.resource_id || '').trim();
  if (!accountId) {
    throw new InstagramActionError('Instagram account is required.', false, 400, 'INSTAGRAM_ACCOUNT_REQUIRED');
  }
  if (!config.comment_id) {
    throw new InstagramActionError('Instagram comment ID is required.', false, 400, 'INSTAGRAM_COMMENT_ID_REQUIRED');
  }
  if (!config.message) {
    throw new InstagramActionError('Instagram reply message is required.', false, 400, 'INSTAGRAM_MESSAGE_REQUIRED');
  }
  return {
    ...config,
    account_id: accountId,
    resource_id: accountId,
  } as Record<string, string>;
}

async function acquireInstagramReplyDelivery(
  admin: any,
  organizationId: string,
  runId: string,
  actionIndex: number,
  idempotencyKey?: string,
) {
  const { data: existing, error: existingError } = await admin
    .from('automation_action_deliveries')
    .select('id,status,attempt_count')
    .eq('organization_id', organizationId)
    .eq('run_id', runId)
    .eq('action_index', actionIndex)
    .maybeSingle();

  if (existingError) throw new Error('Unable to load Instagram private reply delivery.');
  if (existing?.status === 'succeeded') return { id: String(existing.id), succeeded: true };

  const now = new Date().toISOString();
  if (existing) {
    const { data, error } = await admin
      .from('automation_action_deliveries')
      .update({
        status: 'running',
        attempt_count: Number(existing.attempt_count || 0) + 1,
        http_status: null,
        error_summary: null,
        provider_error_code: null,
        provider_error_reason: null,
        started_at: now,
        completed_at: null,
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      })
      .eq('id', existing.id)
      .eq('organization_id', organizationId)
      .select('id')
      .single();

    if (error || !data) throw new Error('Unable to claim Instagram private reply delivery.');
    return { id: String(data.id), succeeded: false };
  }

  const { data, error } = await admin
    .from('automation_action_deliveries')
    .insert({
      organization_id: organizationId,
      run_id: runId,
      action_index: actionIndex,
      action_type: 'instagram_private_reply',
      status: 'running',
      attempt_count: 1,
      started_at: now,
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    })
    .select('id')
    .single();

  if (error || !data) throw new Error('Unable to create Instagram private reply delivery.');
  return { id: String(data.id), succeeded: false };
}

async function executeInstagramPrivateReply(
  admin: any,
  run: AutomationRun,
  event: AutomationEvent,
  action: unknown,
  actionIndex: number,
): Promise<{ testMode: boolean; alreadySent: boolean }> {
  const organizationId = String(run.organization_id);
  const runId = String(run.id);
  const workflowId = String(run.workflow_id || '');
  const config = instagramReplyConfig(action);

  const resolvedCommentId = interpolateVariables(config.comment_id, event.payload).trim();
  const resolvedMessage = interpolateVariables(config.message, event.payload).trim();

  const isTest = Boolean((event.payload as any)?.test_event) ||
    event.source === 'instagram_test' ||
    event.source === 'meta_test' ||
    Boolean(event.payload && (event.payload as any).source === 'instagram_test');

  const nodeId = String((action as any)?.node_id || actionIndex);
  const idempotencyKey = `ig_private_reply:${organizationId}:${workflowId}:${nodeId}:${config.resource_id}:${resolvedCommentId}`;

  const delivery = await acquireInstagramReplyDelivery(admin, organizationId, runId, actionIndex, idempotencyKey);
  if (delivery.succeeded) {
    return { testMode: isTest, alreadySent: false };
  }

  if (!resolvedCommentId) {
    const err = new InstagramActionError('Instagram comment ID is required.', false, 400, 'INSTAGRAM_COMMENT_ID_REQUIRED');
    await admin.from('automation_action_deliveries').update({
      status: 'failed',
      http_status: 400,
      error_summary: err.message,
      provider_error_code: err.providerErrorCode,
      completed_at: new Date().toISOString(),
    }).eq('id', delivery.id);
    throw err;
  }

  if (!resolvedMessage) {
    const err = new InstagramActionError('Instagram reply message is required.', false, 400, 'INSTAGRAM_MESSAGE_REQUIRED');
    await admin.from('automation_action_deliveries').update({
      status: 'failed',
      http_status: 400,
      error_summary: err.message,
      provider_error_code: err.providerErrorCode,
      completed_at: new Date().toISOString(),
    }).eq('id', delivery.id);
    throw err;
  }

  // Idempotency check: Has this comment already received a private reply successfully?
  const { data: priorDelivery } = await admin
    .from('automation_action_deliveries')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('idempotency_key', idempotencyKey)
    .eq('status', 'succeeded')
    .neq('id', delivery.id)
    .maybeSingle();

  if (priorDelivery) {
    await admin.from('automation_action_deliveries').update({
      status: 'succeeded',
      http_status: 200,
      provider_error_reason: 'already_sent',
      error_summary: 'Instagram private reply already sent for this comment.',
      completed_at: new Date().toISOString(),
    }).eq('id', delivery.id);

    return { testMode: isTest, alreadySent: true };
  }

  if (isTest) {
    try {
      const { data: connection, error: connError } = await admin
        .from('integration_connections')
        .select('id,provider,status')
        .eq('id', config.connection_id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (connError || !connection || connection.provider !== 'instagram' || !['active', 'degraded'].includes(connection.status)) {
        throw new InstagramActionError(
          'Active Instagram connection is required.',
          false,
          404,
          'INSTAGRAM_CONNECTION_REQUIRED',
        );
      }

      const { data: resource, error: resError } = await admin
        .from('integration_connection_resources')
        .select('id,external_resource_id,selected')
        .eq('connection_id', config.connection_id)
        .eq('organization_id', organizationId)
        .eq('resource_type', 'instagram_professional_account')
        .eq('external_resource_id', config.resource_id)
        .eq('selected', true)
        .maybeSingle();

      if (resError || !resource) {
        throw new InstagramActionError(
          'Selected Instagram account is not authorized for this connection.',
          false,
          403,
          'INSTAGRAM_ACCOUNT_NOT_AUTHORIZED',
        );
      }

      await admin.from('automation_action_deliveries').update({
        status: 'succeeded',
        http_status: 200,
        provider_error_code: null,
        provider_error_reason: 'test_mode',
        error_summary: null,
        completed_at: new Date().toISOString(),
      }).eq('id', delivery.id);

      await recordWebhookAudit(admin, organizationId, 'automation.instagram.private_reply.simulated', {
        workflow_id: workflowId,
        run_id: runId,
        action_index: actionIndex,
        test_mode: true,
        account_id: config.resource_id,
        comment_id: resolvedCommentId,
      });

      return { testMode: true, alreadySent: false };
    } catch (error) {
      const err = error instanceof InstagramActionError ? error : new InstagramActionError(
        (error as any)?.message || 'Test mode validation failed.',
        false,
      );
      await admin.from('automation_action_deliveries').update({
        status: 'failed',
        http_status: err.httpStatus,
        error_summary: err.message.slice(0, 1000),
        provider_error_code: err.providerErrorCode,
        provider_error_reason: err.providerErrorReason,
        completed_at: new Date().toISOString(),
      }).eq('id', delivery.id);
      throw err;
    }
  }

  // Live execution
  try {
    const { data: connection, error: connError } = await admin
      .from('integration_connections')
      .select('id,provider,status,scopes')
      .eq('id', config.connection_id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (connError || !connection || connection.provider !== 'instagram' || !['active', 'degraded'].includes(connection.status)) {
      throw new InstagramActionError(
        'Active Instagram connection is required.',
        false,
        404,
        'INSTAGRAM_CONNECTION_REQUIRED',
      );
    }

    const grantedScopes = Array.isArray(connection.scopes) ? connection.scopes : [];
    const requiredScopes = ['instagram_business_manage_messages', 'instagram_business_manage_comments'];
    const missingScopes = requiredScopes.filter((s) => !grantedScopes.includes(s));
    if (missingScopes.length) {
      throw new InstagramActionError(
        `Additional Instagram permissions required: ${missingScopes.join(', ')}.`,
        false,
        403,
        'INSTAGRAM_PERMISSION_MISSING',
        'permission_missing',
      );
    }

    const { data: resource, error: resError } = await admin
      .from('integration_connection_resources')
      .select('id,external_resource_id,display_name,selected')
      .eq('connection_id', config.connection_id)
      .eq('organization_id', organizationId)
      .eq('resource_type', 'instagram_professional_account')
      .eq('external_resource_id', config.resource_id)
      .eq('selected', true)
      .maybeSingle();

    if (resError || !resource) {
      throw new InstagramActionError(
        'Selected Instagram account is not authorized for this connection.',
        false,
        403,
        'INSTAGRAM_ACCOUNT_NOT_AUTHORIZED',
        'account_not_authorized',
      );
    }

    const { data: credRow, error: credError } = await admin
      .from('integration_connection_credentials')
      .select('ciphertext,iv')
      .eq('connection_id', config.connection_id)
      .maybeSingle();

    if (credError || !credRow) {
      throw new InstagramActionError(
        'Instagram credentials are missing. Reconnect to continue.',
        false,
        401,
        'INSTAGRAM_RECONNECT_REQUIRED',
        'credential_missing',
      );
    }

    let credential: InstagramCredential;
    try {
      credential = await decryptIntegrationCredential(credRow);
    } catch {
      throw new InstagramActionError(
        'Instagram credentials could not be decrypted. Reconnect to continue.',
        false,
        401,
        'INSTAGRAM_RECONNECT_REQUIRED',
        'credential_invalid',
      );
    }

    if (!credential.access_token || (credential.expires_at && credential.expires_at <= Date.now() + 30_000)) {
      throw new InstagramActionError(
        'Instagram connection authorization expired. Please reconnect.',
        false,
        401,
        'INSTAGRAM_RECONNECT_REQUIRED',
        'token_expired',
      );
    }

    const replyResult = await sendInstagramPrivateReply({
      accountId: config.resource_id,
      commentId: resolvedCommentId,
      message: resolvedMessage,
      accessToken: credential.access_token,
    });

    await admin.from('automation_action_deliveries').update({
      status: 'succeeded',
      http_status: 200,
      completed_at: new Date().toISOString(),
      error_summary: null,
      provider_error_code: null,
      provider_error_reason: null,
      idempotency_key: idempotencyKey,
    }).eq('id', delivery.id);

    await recordWebhookAudit(admin, organizationId, 'automation.instagram.private_reply.succeeded', {
      workflow_id: workflowId,
      run_id: runId,
      action_index: actionIndex,
      account_id: config.resource_id,
      comment_id: resolvedCommentId,
      recipient_id: replyResult.recipient_id,
      message_id: replyResult.message_id,
    });

    return { testMode: false, alreadySent: false };
  } catch (error) {
    let e: InstagramActionError;
    if (error instanceof InstagramActionError) {
      e = error;
    } else if (error instanceof InstagramIntegrationError) {
      const retryable = error.status >= 500 || error.status === 429;
      e = new InstagramActionError(error.message, retryable, error.status, error.code, error.code);
    } else if (error instanceof WebhookActionError) {
      e = new InstagramActionError(error.message, error.retryable);
    } else {
      e = new InstagramActionError('Instagram private reply could not be completed.', true);
    }

    await admin.from('automation_action_deliveries').update({
      status: 'failed',
      http_status: e.httpStatus,
      error_summary: e.message.slice(0, 1000),
      provider_error_code: e.providerErrorCode,
      provider_error_reason: e.providerErrorReason,
      completed_at: new Date().toISOString(),
    }).eq('id', delivery.id);

    await recordWebhookAudit(admin, organizationId, 'automation.instagram.private_reply.failed', {
      workflow_id: workflowId,
      run_id: runId,
      action_index: actionIndex,
      http_status: e.httpStatus,
      error_code: e.providerErrorCode,
      error_message: e.message.slice(0, 500),
    });

    throw e;
  }
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

  if (isRecord(workflow.execution_plan) && isRecord(workflow.execution_plan.trigger) && isRecord(workflow.execution_plan.trigger.config)) {
    const config = workflow.execution_plan.trigger.config;
    if (event.event_type === 'facebook.page.comment.created') {
      const payload = event.payload as Record<string, unknown>;
      if (config.connection_id && config.connection_id !== payload.connection_id) throw new TriggerMismatchError('Event does not match trigger connection.');
      if (config.resource_id && config.resource_id !== payload.page_id) throw new TriggerMismatchError('Event does not match trigger page.');
      if (config.contains_text && typeof payload.message === 'string' && !payload.message.toLowerCase().includes(String(config.contains_text).toLowerCase())) throw new TriggerMismatchError('Message does not contain required text.');
      if (config.exact_post_id && config.exact_post_id !== payload.post_id) throw new TriggerMismatchError('Event does not match exact post ID.');
      if (config.include_replies === false && payload.parent_comment_id) throw new TriggerMismatchError('Replies are ignored by trigger configuration.');
    }
    if (event.event_type === 'instagram.comment.created') {
      const payload = event.payload as Record<string, unknown>;
      if (config.connection_id && config.connection_id !== payload.connection_id) throw new TriggerMismatchError('Event does not match trigger connection.');
      if (config.resource_id && config.resource_id !== payload.instagram_account_id) throw new TriggerMismatchError('Event does not match trigger Instagram account.');
      if (config.contains_text && typeof payload.comment_text === 'string' && !payload.comment_text.toLowerCase().includes(String(config.contains_text).toLowerCase())) throw new TriggerMismatchError('Message does not contain required text.');
      if (config.exact_media_id && config.exact_media_id !== payload.media_id) throw new TriggerMismatchError('Event does not match exact media ID.');
      if (config.include_replies === false && payload.parent_comment_id) throw new TriggerMismatchError('Replies are ignored by trigger configuration.');
    }
  }

  const { actions, selectedBranch } = resolveWorkflowActions(workflow, event);
  let notificationActions = 0;
  let webhookActions = 0;
  let gmailActions = 0;
  let facebookActions = 0;
  let lastFacebookTestMode = false;
  let instagramActions = 0;
  let lastInstagramTestMode = false;
  let lastInstagramAlreadySent = false;
  for (const { action, actionIndex } of actions) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) throw new WebhookActionError('Automation action is invalid.', false);
    const actionType = (action as Record<string, unknown>).type;
    if (actionType === 'create_notification') { await executeNotificationAction(admin, run, action, actionIndex); notificationActions += 1; continue; }
    if (actionType === 'outgoing_webhook') { await executeOutgoingWebhook(admin, run, event, action, actionIndex); webhookActions += 1; continue; }
    if (actionType === 'gmail_send_email') { await executeGmailSend(admin, run, action, actionIndex); gmailActions += 1; continue; }
    if (actionType === 'facebook_comment_reply') {
      const res = await executeFacebookCommentReply(admin, run, event, action, actionIndex);
      facebookActions += 1;
      lastFacebookTestMode = res.testMode;
      continue;
    }
    if (actionType === 'instagram_private_reply') {
      const res = await executeInstagramPrivateReply(admin, run, event, action, actionIndex);
      instagramActions += 1;
      lastInstagramTestMode = res.testMode;
      lastInstagramAlreadySent = res.alreadySent;
      continue;
    }
    throw new WebhookActionError('Automation action is not supported.', false);
  }
  const branchSuffix = ` (${selectedBranch} branch)`;
  if (instagramActions) {
    if (lastInstagramAlreadySent) {
      return 'Instagram private reply already sent for this comment.' + branchSuffix;
    }
    return (lastInstagramTestMode
      ? 'Test mode — Instagram private reply validated, no external message sent.'
      : 'Instagram private reply action completed.') + branchSuffix;
  }
  if (facebookActions) {
    return (lastFacebookTestMode
      ? 'Test mode — Facebook reply validated, no external reply sent.'
      : 'Facebook reply action completed.') + branchSuffix;
  }
  if (webhookActions) return WEBHOOK_RESULT_SUMMARY + branchSuffix;
  if (gmailActions) return GMAIL_RESULT_SUMMARY + branchSuffix;
  if (notificationActions) return NOTIFICATION_RESULT_SUMMARY + branchSuffix;
  return NO_SUPPORTED_ACTIONS_SUMMARY + branchSuffix;
}

class TriggerMismatchError extends Error {}

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
        if (error instanceof TriggerMismatchError) {
          const { error: completeError } = await admin.rpc('complete_automation_run', { p_run_id: run.id, p_lease_token: leaseToken, p_succeeded: true, p_summary: error.message });
          if (completeError) throw completeError;
          completedRuns += 1;
          continue;
        }
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
