import { authenticate, corsHeaders, json, requireBillingAdmin } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';
import { validateOutgoingWebhookAction } from '../_shared/webhook-security.ts';
import { createIncomingWebhookToken, hashIncomingWebhookToken } from '../_shared/incoming-webhook.ts';

const TRIGGER_TYPES = new Set(['employee.created', 'contact.created', 'expense.status_changed', 'incoming_webhook', 'schedule']);
const CONDITION_OPERATORS = new Set(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty', 'changed_from', 'changed_to']);
const ACTION_TYPES = new Set(['create_notification', 'outgoing_webhook']);
const MAX_WORKFLOWS = 50;
const MAX_CONDITIONS = 10;
const MAX_ACTIONS = 10;

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const hasOnlyKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every((key) => keys.includes(key));
const stringValue = (value: unknown, maximum: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
const simpleValue = (value: unknown) => value === null || ['string', 'number', 'boolean'].includes(typeof value);
const publicWorkflow = (workflow: Record<string, unknown>) => { const { incoming_webhook_token_hash: _hash, ...safe } = workflow; return safe; };
const GRAPH_TYPES = new Set(['employee_created','contact_created','expense_status_changed','incoming_webhook','if','create_notification','outgoing_webhook']);
function validateGraph(nodes: unknown, edges: unknown) {
  if (nodes === undefined && edges === undefined) return { graph_nodes: undefined, graph_edges: undefined };
  if (!Array.isArray(nodes) || !Array.isArray(edges) || nodes.length > 100 || edges.length > 200) throw new Error('Workflow graph exceeds its limits.');
  const ids = new Set<string>();
  for (const node of nodes) { if (!isObject(node) || typeof node.id !== 'string' || !node.id || ids.has(node.id) || !GRAPH_TYPES.has(String(node.type)) || !isObject(node.position) || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y) || !isObject(node.config ?? {})) throw new Error('Workflow graph node is invalid.'); ids.add(node.id); }
  for (const edge of edges) { if (!isObject(edge) || typeof edge.id !== 'string' || typeof edge.source !== 'string' || typeof edge.target !== 'string' || !ids.has(edge.source) || !ids.has(edge.target)) throw new Error('Workflow graph edge is invalid.'); }
  return { graph_nodes: nodes, graph_edges: edges };
}

function validateTrigger(triggerType: unknown, triggerConfig: unknown) {
  if (typeof triggerType !== 'string' || !TRIGGER_TYPES.has(triggerType)) throw new Error('Unsupported automation trigger type.');
  if (!isObject(triggerConfig) || JSON.stringify(triggerConfig).length > 4096) throw new Error('Invalid trigger configuration.');
  if (triggerType === 'expense.status_changed') {
    if (!hasOnlyKeys(triggerConfig, ['to_status']) || !stringValue(triggerConfig.to_status, 64)) throw new Error('expense.status_changed requires a valid to_status.');
    return;
  }
  if (triggerType === 'schedule') {
    if (!hasOnlyKeys(triggerConfig, ['timezone', 'recurrence']) || !stringValue(triggerConfig.timezone, 100) || !['daily', 'weekly'].includes(String(triggerConfig.recurrence))) throw new Error('schedule requires a valid timezone and daily or weekly recurrence.');
    try { Intl.DateTimeFormat('en-US', { timeZone: String(triggerConfig.timezone) }); } catch { throw new Error('schedule timezone must be a valid IANA timezone.'); }
    return;
  }
  if (Object.keys(triggerConfig).length !== 0) throw new Error(`${triggerType} does not accept trigger configuration yet.`);
}

function validateConditions(conditions: unknown) {
  if (!Array.isArray(conditions) || conditions.length > MAX_CONDITIONS || JSON.stringify(conditions).length > 12288) throw new Error(`Use no more than ${MAX_CONDITIONS} conditions.`);
  for (const condition of conditions) {
    if (!isObject(condition) || !hasOnlyKeys(condition, ['field', 'operator', 'value']) || !stringValue(condition.field, 64) || !/^[A-Za-z][A-Za-z0-9_.]*$/.test(String(condition.field)) || typeof condition.operator !== 'string' || !CONDITION_OPERATORS.has(condition.operator)) throw new Error('Invalid automation condition.');
    const requiresValue = !['is_empty', 'is_not_empty'].includes(condition.operator);
    if (requiresValue && !Object.prototype.hasOwnProperty.call(condition, 'value')) throw new Error('This condition operator requires a value.');
    if (Object.prototype.hasOwnProperty.call(condition, 'value') && (!simpleValue(condition.value) || (typeof condition.value === 'string' && condition.value.length > 500))) throw new Error('Condition values must be a short string, number, boolean, or null.');
  }
}

function validateActions(actions: unknown) {
  if (!Array.isArray(actions) || actions.length > MAX_ACTIONS || JSON.stringify(actions).length > 16384) throw new Error(`Use no more than ${MAX_ACTIONS} actions.`);
  for (const action of actions) {
    if (!isObject(action) || !hasOnlyKeys(action, ['type', 'config']) || typeof action.type !== 'string' || !ACTION_TYPES.has(action.type) || !isObject(action.config)) throw new Error('Invalid automation action.');
    if (action.type === 'create_notification') {
      if (!hasOnlyKeys(action.config, ['title', 'message']) || !stringValue(action.config.title, 160) || !stringValue(action.config.message, 2000)) throw new Error('create_notification requires a title and message.');
      continue;
    }
    validateOutgoingWebhookAction(action);
  }
}

function validateDefinition(body: Record<string, unknown>) {
  const name = String(body.name || '').trim();
  const description = body.description === undefined || body.description === null || body.description === '' ? null : String(body.description).trim();
  if (!name || name.length > 120 || (description && description.length > 1000)) throw new Error('Workflow name or description is invalid.');
  validateTrigger(body.triggerType, body.triggerConfig);
  validateConditions(body.conditions);
  validateActions(body.actions);
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') throw new Error('enabled must be a boolean.');

  return { name, description, trigger_type: body.triggerType, trigger_config: body.triggerConfig, conditions: body.conditions, actions: body.actions, enabled: body.enabled === true, ...validateGraph(body.graphNodes, body.graphEdges) };
}

async function requireWorkflowAccess(admin: any, userId: string, organizationId: string) {
  await requireBillingAdmin(admin, userId, organizationId);
  const entitlements = await getOrganizationEntitlements(admin, organizationId);
  if (!entitlements.access_active || !entitlements.automation_access) throw new Error('Automation is available only to active Custom workspaces.');
}

async function requireMembership(admin: any, userId: string, organizationId: string) {
  const { data, error } = await admin.from('organization_members').select('id').eq('organization_id', organizationId).eq('user_id', userId).eq('status', 'Active').maybeSingle();
  if (error || !data) throw new Error('You are not an active member of this organization.');
}

async function audit(admin: any, organizationId: string, actorId: string, action: string, workflowId: string, metadata: Record<string, unknown> = {}) {
  const { error } = await admin.from('audit_logs').insert({
    organization_id: organizationId,
    user_name: actorId,
    action,
    details: JSON.stringify({ workflow_id: workflowId, actor_user_id: actorId, ...metadata }),
  });
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { admin, user } = await authenticate(req);
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const organizationId = url.searchParams.get('organizationId') || '';
      if (!organizationId) return json({ success: false, error: 'organizationId is required.' }, 400);
      await requireMembership(admin, user.id, organizationId);
      const { data, error } = await admin.from('automation_workflows').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false });
      if (error) throw error;
      return json({ success: true, workflows: (data || []).map(publicWorkflow) });
    }

    const body = await req.json();
    const effectiveMethod = typeof body._method === 'string' ? body._method : req.method;
    const organizationId = String(body.organizationId || '');
    if (!organizationId) return json({ success: false, error: 'organizationId is required.' }, 400);
    if (body.operation === 'list') {
      await requireMembership(admin, user.id, organizationId);
      const { data, error } = await admin.from('automation_workflows').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false });
      if (error) throw error;
      return json({ success: true, workflows: (data || []).map(publicWorkflow) });
    }
    if (body.operation === 'listRuns') {
      await requireMembership(admin, user.id, organizationId);
      const { data, error } = await admin.from('automation_runs').select('id,status,workflow_id,event_id,attempt_count,error_summary,started_at,completed_at,created_at,automation_workflows(name),automation_events(event_type)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return json({ success: true, runs: data || [] });
    }
    await requireWorkflowAccess(admin, user.id, organizationId);

    if (effectiveMethod === 'POST') {
      const definition = validateDefinition(body);
      const { count, error: countError } = await admin.from('automation_workflows').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
      if (countError) throw countError;
      if ((count || 0) >= MAX_WORKFLOWS) return json({ success: false, error: `An organization may have at most ${MAX_WORKFLOWS} workflows.` }, 409);
      const timestamps = definition.enabled ? { last_enabled_at: new Date().toISOString(), disabled_at: null } : { last_enabled_at: null, disabled_at: new Date().toISOString() };
      const incomingWebhookToken = definition.trigger_type === 'incoming_webhook' ? createIncomingWebhookToken() : null;
      const incomingWebhookTokenHash = incomingWebhookToken ? await hashIncomingWebhookToken(incomingWebhookToken) : null;
      const { graph_nodes, graph_edges, ...definitionFields } = definition; const { data, error } = await admin.from('automation_workflows').insert({ organization_id: organizationId, created_by: user.id, ...definitionFields, ...timestamps, incoming_webhook_token_hash: incomingWebhookTokenHash, ...(graph_nodes ? { graph_nodes, graph_edges } : {}) }).select('*').single();
      if (error) throw error;
      await audit(admin, organizationId, user.id, 'automation.workflow.created', data.id, { name: data.name });
      if (definition.enabled) await audit(admin, organizationId, user.id, 'automation.workflow.enabled', data.id, { name: data.name });
      return json({ success: true, workflow: publicWorkflow(data), ...(incomingWebhookToken ? { incomingWebhookToken } : {}) }, 201);
    }

    const workflowId = String(body.workflowId || '');
    if (!workflowId) return json({ success: false, error: 'workflowId is required.' }, 400);

    if (effectiveMethod === 'PATCH') {
      const { data: current, error: currentError } = await admin.from('automation_workflows').select('*').eq('id', workflowId).eq('organization_id', organizationId).maybeSingle();
      if (currentError) throw currentError;
      if (!current) return json({ success: false, error: 'Workflow not found.' }, 404);
      const definition = validateDefinition({
        name: body.name ?? current.name,
        description: Object.prototype.hasOwnProperty.call(body, 'description') ? body.description : current.description,
        triggerType: body.triggerType ?? current.trigger_type,
        triggerConfig: body.triggerConfig ?? current.trigger_config,
        conditions: body.conditions ?? current.conditions,
        actions: body.actions ?? current.actions,
        enabled: body.enabled ?? current.enabled,
        graphNodes: body.graphNodes ?? current.graph_nodes,
        graphEdges: body.graphEdges ?? current.graph_edges,
      });
      if (body.regenerateIncomingWebhookToken !== undefined && body.regenerateIncomingWebhookToken !== true) return json({ success: false, error: 'regenerateIncomingWebhookToken must be true.' }, 400);
      if (body.regenerateIncomingWebhookToken === true && definition.trigger_type !== 'incoming_webhook') return json({ success: false, error: 'Only incoming webhook workflows can regenerate a token.' }, 400);
      const incomingWebhookToken = body.regenerateIncomingWebhookToken === true ? createIncomingWebhookToken() : null;
      const incomingWebhookTokenHash = incomingWebhookToken ? await hashIncomingWebhookToken(incomingWebhookToken) : undefined;
      const enabledChanged = definition.enabled !== current.enabled;
      const lifecycle = enabledChanged ? (definition.enabled ? { last_enabled_at: new Date().toISOString(), disabled_at: null } : { disabled_at: new Date().toISOString() }) : {};
      const { graph_nodes, graph_edges, ...definitionFields } = definition; const { data, error } = await admin.from('automation_workflows').update({ ...definitionFields, ...lifecycle, version: current.version + 1, ...(graph_nodes ? { graph_nodes, graph_edges, graph_version: current.graph_version + 1 } : {}), ...(incomingWebhookTokenHash ? { incoming_webhook_token_hash: incomingWebhookTokenHash } : {}) }).eq('id', workflowId).eq('organization_id', organizationId).select('*').single();
      if (error) throw error;
      await audit(admin, organizationId, user.id, enabledChanged ? (definition.enabled ? 'automation.workflow.enabled' : 'automation.workflow.disabled') : 'automation.workflow.updated', workflowId, { name: data.name, version: data.version });
      return json({ success: true, workflow: publicWorkflow(data), ...(incomingWebhookToken ? { incomingWebhookToken } : {}) });
    }

    if (effectiveMethod === 'DELETE') {
      const { data, error } = await admin.from('automation_workflows').delete().eq('id', workflowId).eq('organization_id', organizationId).select('id,name').maybeSingle();
      if (error) throw error;
      if (!data) return json({ success: false, error: 'Workflow not found.' }, 404);
      await audit(admin, organizationId, user.id, 'automation.workflow.deleted', workflowId, { name: data.name });
      return json({ success: true });
    }

    return json({ success: false, error: 'Method not allowed.' }, 405);
  } catch (error: any) {
    return json({ success: false, error: error.message || 'Unable to manage automation workflows.' }, 400);
  }
});
