import { authenticate, corsHeaders, json, requireBillingAdmin } from '../_shared/billing.ts';
import { getOrganizationEntitlements } from '../_shared/entitlements.ts';
import { validateOutgoingWebhookAction } from '../_shared/webhook-security.ts';
import { createIncomingWebhookToken, hashIncomingWebhookToken } from '../_shared/incoming-webhook.ts';

const TRIGGER_TYPES = new Set(['employee.created', 'contact.created', 'expense.status_changed', 'incoming_webhook', 'website.form_submitted', 'schedule']);
const TRIGGER_TYPES = new Set(['employee.created', 'contact.created', 'expense.status_changed', 'incoming_webhook', 'website.form_submitted', 'schedule', 'facebook.page.comment.created']);
const CONDITION_OPERATORS = new Set(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty', 'changed_from', 'changed_to']);
const ACTION_TYPES = new Set(['create_notification', 'outgoing_webhook', 'gmail_send_email']);
const MAX_WORKFLOWS = 50;
const MAX_CONDITIONS = 10;
const MAX_ACTIONS = 10;

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const hasOnlyKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every((key) => keys.includes(key));
const stringValue = (value: unknown, maximum: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
const simpleValue = (value: unknown) => value === null || ['string', 'number', 'boolean'].includes(typeof value);
const publicWorkflow = (workflow: Record<string, unknown>) => { const { incoming_webhook_token_hash: _hash, ...safe } = workflow; return safe; };
const GRAPH_TYPES = new Set(['employee_created','contact_created','expense_status_changed','incoming_webhook','website_form_submitted','if','create_notification','outgoing_webhook','gmail_send_email']);
const GRAPH_TRIGGER_TYPES = new Map([['employee_created', 'employee.created'], ['contact_created', 'contact.created'], ['expense_status_changed', 'expense.status_changed'], ['incoming_webhook', 'incoming_webhook'], ['website_form_submitted', 'website.form_submitted']]);
const GRAPH_TYPES = new Set(['employee_created','contact_created','expense_status_changed','incoming_webhook','website_form_submitted','facebook_page_comment_created','if','create_notification','outgoing_webhook','gmail_send_email']);
const GRAPH_TRIGGER_TYPES = new Map([['employee_created', 'employee.created'], ['contact_created', 'contact.created'], ['expense_status_changed', 'expense.status_changed'], ['incoming_webhook', 'incoming_webhook'], ['website_form_submitted', 'website.form_submitted'], ['facebook_page_comment_created', 'facebook.page.comment.created']]);
const CONNECTION_NODE_REQUIREMENTS: Record<string, { provider: string; authType: string; scopes: string[] }> = {
  gmail: { provider: 'google', authType: 'oauth', scopes: [] },
  google_sheets: { provider: 'google', authType: 'oauth', scopes: [] },
  google_calendar: { provider: 'google', authType: 'oauth', scopes: [] },
  slack: { provider: 'slack', authType: 'oauth', scopes: [] },
  whatsapp: { provider: 'meta', authType: 'oauth', scopes: [] },
  facebook_page_comment_created: { provider: 'meta', authType: 'oauth', scopes: [] },
  gmail_send_email: { provider: 'google', authType: 'oauth', scopes: ['https://www.googleapis.com/auth/gmail.send'] },
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validateGraph(nodes: unknown, edges: unknown) {
  if (nodes === undefined && edges === undefined) return { graph_nodes: undefined, graph_edges: undefined };
  if (!Array.isArray(nodes) || !Array.isArray(edges) || nodes.length > 100 || edges.length > 200) throw new Error('Workflow graph exceeds its limits.');
  const ids = new Set<string>();
  for (const node of nodes) { if (!isObject(node) || typeof node.id !== 'string' || !node.id || ids.has(node.id) || !GRAPH_TYPES.has(String(node.type)) || !isObject(node.position) || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y) || !isObject(node.config ?? {})) throw new Error('Workflow graph node is invalid.'); ids.add(node.id); }
  for (const edge of edges) { if (!isObject(edge) || typeof edge.id !== 'string' || typeof edge.source !== 'string' || typeof edge.target !== 'string' || !ids.has(edge.source) || !ids.has(edge.target)) throw new Error('Workflow graph edge is invalid.'); }
  return { graph_nodes: nodes, graph_edges: edges };
}
function compileGraph(nodes: unknown, edges: unknown, enabled: boolean = true) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) return null;
  const byId = new Map(nodes.map((node: any) => [node.id, node]));
  const triggers = nodes.filter((node: any) => GRAPH_TRIGGER_TYPES.has(node.type));
  if (triggers.length !== 1) throw new Error('Graph requires exactly one trigger.');
  if (triggers.length > 1) throw new Error('Graph allows at most one trigger.');
  if (triggers.length === 0) {
    if (enabled) throw new Error('Enabled workflow requires exactly one trigger.');
    return null;
  }
  const outgoing = new Map<string, any[]>(); const incoming = new Map<string, number>();
  for (const edge of edges as any[]) { outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge]); incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1); }
  const trigger = triggers[0]; const triggerType = GRAPH_TRIGGER_TYPES.get(trigger.type)!;
  if (incoming.get(trigger.id)) throw new Error('Trigger cannot have an incoming edge.');
  if ([...incoming.values()].some((count) => count > 1)) throw new Error('Merge nodes are not supported.');
  const visited = new Set<string>(); const visiting = new Set<string>();
  const visit = (nodeId: string) => { if (visiting.has(nodeId)) throw new Error('Cycles are not supported.'); if (visited.has(nodeId)) return; visiting.add(nodeId); for (const edge of outgoing.get(nodeId) || []) visit(edge.target); visiting.delete(nodeId); visited.add(nodeId); };
  visit(trigger.id);
  if (visited.size !== nodes.length) throw new Error('Connect all workflow nodes before saving.');
  validateTrigger(triggerType, trigger.config || {});
  const walk = (start: any) => { const actions:any[]=[]; let node=start; while(node){ if(node.type==='if') throw new Error('Nested IF nodes are not supported.'); if(!ACTION_TYPES.has(node.type)) throw new Error('Only action nodes may follow a trigger or IF branch.'); actions.push({ node_id:node.id,type:node.type,config:node.config||{} }); const next=outgoing.get(node.id)||[]; if(next.length>1) throw new Error('Action chains cannot branch.'); node=next.length?byId.get(next[0].target):null; } validateActions(actions.map(({ type, config }) => ({ type, config }))); return actions; };
  const first=(outgoing.get(trigger.id)||[]); if(first.length>1) throw new Error('Trigger cannot branch directly.'); const next=first.length?byId.get(first[0].target):null;
  if(next?.type==='if'){ const ifEdges=outgoing.get(next.id)||[]; if(ifEdges.some((edge:any)=>edge.sourceHandle!=='true'&&edge.sourceHandle!=='false')) throw new Error('IF edges must use true or false handles.'); const groups:any={true:[],false:[]}; for(const edge of ifEdges){ if(groups[edge.sourceHandle].length) throw new Error('Each IF branch must have one starting action.'); groups[edge.sourceHandle].push(edge); } const condition=next.config||{}; validateConditions([condition]); const true_actions=groups.true.length?walk(byId.get(groups.true[0].target)):[]; const false_actions=groups.false.length?walk(byId.get(groups.false[0].target)):[]; if(!true_actions.length&&!false_actions.length) throw new Error('At least one IF branch needs an action.'); return { trigger:{type:triggerType,config:trigger.config||{}},condition,true_actions,false_actions}; }
  const true_actions=next?walk(next):[]; if(!true_actions.length) throw new Error('Graph requires a connected action.'); return {trigger:{type:triggerType,config:trigger.config||{}},condition:null,true_actions,false_actions:[]};
}

function validateTrigger(triggerType: unknown, triggerConfig: unknown) {
  if (typeof triggerType !== 'string' || !TRIGGER_TYPES.has(triggerType)) throw new Error('Unsupported automation trigger type.');
  if (!isObject(triggerConfig) || JSON.stringify(triggerConfig).length > 4096) throw new Error('Invalid trigger configuration.');
  if (triggerType === 'facebook.page.comment.created') {
    if (!isObject(triggerConfig)) throw new Error('facebook.page.comment.created requires a valid configuration.');
    if (!stringValue(triggerConfig.connection_id, 36) || !UUID.test(String(triggerConfig.connection_id))) throw new Error('facebook.page.comment.created requires a valid Meta connection.');
    if (!stringValue(triggerConfig.resource_id, 120)) throw new Error('facebook.page.comment.created requires a valid Facebook Page.');
    return;
  }
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
    if (action.type === 'gmail_send_email') {
      const config = action.config as Record<string, unknown>;
      const addresses = ['to', 'cc', 'bcc'];
      if (!hasOnlyKeys(config, ['connection_id', 'to', 'cc', 'bcc', 'subject', 'body']) || !stringValue(config.connection_id, 36) || !UUID.test(String(config.connection_id)) || !stringValue(config.to, 1000) || !String(config.to).split(',').every((email) => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email.trim())) || addresses.slice(1).some((key) => config[key] !== undefined && config[key] !== '' && (!stringValue(config[key], 1000) || !String(config[key]).split(',').every((email) => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email.trim())))) || !stringValue(config.subject, 300) || !stringValue(config.body, 20000)) throw new Error('Gmail send requires a valid Google connection, recipient, subject, and body.');
      continue;
    }
    validateOutgoingWebhookAction(action);
  }
}

async function validateGraphConnectionReferences(admin: any, organizationId: string, nodes: unknown) {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!isObject(node) || !isObject(node.config) || !Object.prototype.hasOwnProperty.call(node.config, 'connection_id')) continue;
    const requirement = CONNECTION_NODE_REQUIREMENTS[String(node.type)];
    const connectionId = node.config.connection_id;
    if (!requirement || typeof connectionId !== 'string' || !UUID.test(connectionId)) throw new Error('This workflow node has an invalid connection reference.');
    const { data: connection, error } = await admin.from('integration_connections').select('id,provider,auth_type,status,scopes').eq('id', connectionId).eq('organization_id', organizationId).maybeSingle();
    if (error || !connection || connection.status !== 'active' || connection.provider !== requirement.provider || connection.auth_type !== requirement.authType) throw new Error('Select an active matching connection from this organization.');
    const scopes = Array.isArray(connection.scopes) ? connection.scopes : [];
    if (requirement.scopes.some((scope) => !scopes.includes(scope))) throw new Error('The selected connection is missing a required scope.');
  }
}

async function validateDefinition(admin: any, organizationId: string, body: Record<string, unknown>) {
  const name = String(body.name || '').trim();
  const description = body.description === undefined || body.description === null || body.description === '' ? null : String(body.description).trim();
  if (!name || name.length > 120 || (description && description.length > 1000)) throw new Error('Workflow name or description is invalid.');
  validateTrigger(body.triggerType, body.triggerConfig);
  validateConditions(body.conditions);
  validateActions(body.actions);
  const isEnabled = body.enabled === true;
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') throw new Error('enabled must be a boolean.');

  const graph = validateGraph(body.graphNodes, body.graphEdges); const execution_plan = Array.isArray(graph.graph_nodes) && graph.graph_nodes.length > 0 ? compileGraph(graph.graph_nodes, graph.graph_edges) : undefined;
  const graph = validateGraph(body.graphNodes, body.graphEdges);
  const execution_plan = Array.isArray(graph.graph_nodes) && graph.graph_nodes.length > 0 ? compileGraph(graph.graph_nodes, graph.graph_edges, isEnabled) : undefined;
  await validateGraphConnectionReferences(admin, organizationId, graph.graph_nodes);
  return { name, description, trigger_type: body.triggerType, trigger_config: body.triggerConfig, conditions: body.conditions, actions: body.actions, enabled: body.enabled === true, ...graph, execution_plan };

  const effectiveTriggerType = body.triggerType || 'employee.created';
  const effectiveTriggerType = (body.triggerType as string) || 'employee.created';
  const effectiveTriggerConfig = isObject(body.triggerConfig) ? body.triggerConfig : {};
  if (isEnabled || body.triggerType) {
    validateTrigger(effectiveTriggerType, effectiveTriggerConfig);
  }
  validateConditions(body.conditions);
  if (isEnabled || (Array.isArray(body.actions) && body.actions.length > 0)) {
    validateActions(body.actions);
  }

  const graph = validateGraph(body.graphNodes, body.graphEdges);
  const execution_plan = Array.isArray(graph.graph_nodes) && graph.graph_nodes.length > 0 ? compileGraph(graph.graph_nodes, graph.graph_edges, isEnabled) : undefined;
  await validateGraphConnectionReferences(admin, organizationId, graph.graph_nodes);

  return { name, description, trigger_type: effectiveTriggerType, trigger_config: effectiveTriggerConfig, conditions: body.conditions, actions: body.actions, enabled: isEnabled, ...graph, execution_plan };
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

function branchFromSummary(summary: unknown): 'true' | 'false' | 'linear' | null {
  const match = typeof summary === 'string' ? summary.match(/\((true|false|linear) branch\)$/) : null;
  return match ? match[1] as 'true' | 'false' | 'linear' : null;
}

function safeRunActions(workflow: Record<string, unknown>, branch: 'true' | 'false' | 'linear' | null) {
  const plan = workflow.execution_plan;
  if (isObject(plan) && Object.keys(plan).length > 0 && Array.isArray(plan.true_actions) && Array.isArray(plan.false_actions) && branch) {
    const all = [...plan.true_actions, ...plan.false_actions];
    const indexes = new Map<string, number>();
    for (const [index, action] of all.entries()) if (isObject(action) && typeof action.node_id === 'string') indexes.set(action.node_id, index);
    const selected = branch === 'false' ? plan.false_actions : plan.true_actions;
    return selected.flatMap((action) => { if (!isObject(action) || typeof action.node_id !== 'string' || (action.type !== 'create_notification' && action.type !== 'outgoing_webhook' && action.type !== 'gmail_send_email')) return []; const action_index = indexes.get(action.node_id); return action_index === undefined ? [] : [{ action_index, type: action.type }]; });
  }
  return Array.isArray(workflow.actions) ? workflow.actions.flatMap((action, action_index) => isObject(action) && (action.type === 'create_notification' || action.type === 'outgoing_webhook' || action.type === 'gmail_send_email') ? [{ action_index, type: action.type }] : []) : [];
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
      const { data, error } = await admin.from('automation_runs').select('id,status,workflow_id,event_id,attempt_count,error_summary,result_summary,started_at,completed_at,created_at,automation_workflows(name),automation_events(event_type,payload,source)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return json({ success: true, runs: data || [] });
    }
    if (body.operation === 'runDetail') {
      const runId = String(body.runId || '');
      if (!runId) return json({ success: false, error: 'runId is required.' }, 400);
      await requireMembership(admin, user.id, organizationId);
      const { data: run, error: runError } = await admin.from('automation_runs').select('id,status,workflow_id,event_id,attempt_count,error_summary,result_summary,started_at,completed_at,created_at').eq('id', runId).eq('organization_id', organizationId).maybeSingle();
      if (runError) throw runError;
      if (!run) return json({ success: false, error: 'Run not found.' }, 404);
      const [{ data: workflow, error: workflowError }, { data: event, error: eventError }, { data: notifications, error: notificationsError }, { data: deliveries, error: deliveriesError }] = await Promise.all([
        admin.from('automation_workflows').select('name,trigger_type,execution_plan,actions').eq('id', run.workflow_id).eq('organization_id', organizationId).maybeSingle(),
        admin.from('automation_events').select('event_type,payload,source').eq('id', run.event_id).eq('organization_id', organizationId).maybeSingle(),
        admin.from('notifications').select('automation_action_index,created_at').eq('organization_id', organizationId).eq('automation_run_id', run.id),
        admin.from('automation_action_deliveries').select('action_index,status,http_status,error_summary,provider_error_code,provider_error_reason,started_at,completed_at').eq('organization_id', organizationId).eq('run_id', run.id),
      ]);
      if (workflowError || eventError || notificationsError || deliveriesError || !workflow || !event) throw new Error('Run details are unavailable.');
      const branch_taken = branchFromSummary(run.result_summary);
      const notificationIndexes = new Set((notifications || []).map((item: any) => Number(item.automation_action_index)));
      const deliveryByIndex = new Map((deliveries || []).map((item: any) => [Number(item.action_index), item]));
      const actions = safeRunActions(workflow, branch_taken).map((action) => action.type === 'create_notification' ? { ...action, status: notificationIndexes.has(action.action_index) ? 'completed' : 'not_recorded' } : { ...action, ...(deliveryByIndex.get(action.action_index) || { status: 'not_recorded', http_status: null, error_summary: null }) });
      const isTest = event?.source === 'meta_test' || Boolean((event?.payload as any)?.test_event);
      const pageName = (event?.payload as any)?.page_name;
      return json({ success: true, run: { id: run.id, status: run.status, workflow_name: workflow.name, trigger_type: event.event_type, attempt_count: run.attempt_count, started_at: run.started_at, completed_at: run.completed_at, created_at: run.created_at, branch_taken, error_summary: run.error_summary, result_summary: run.result_summary, actions, is_test: isTest, page_name: pageName } });
    }
    if (body.operation === 'testTrigger') {
      await requireMembership(admin, user.id, organizationId);
      await requireWorkflowAccess(admin, user.id, organizationId);

      const workflowId = String(body.workflowId || '');
      if (!workflowId) return json({ success: false, error: 'workflowId is required.' }, 400);

      const { data: workflow, error: wfError } = await admin
        .from('automation_workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (wfError || !workflow) return json({ success: false, error: 'Workflow not found.' }, 404);

      if (!workflow.enabled) {
        return json({ success: false, error: 'Workflow must be enabled to run a test.' }, 400);
      }

      const triggerType = workflow.execution_plan?.trigger?.type || workflow.trigger_type;
      if (triggerType !== 'facebook.page.comment.created') {
        return json({ success: false, error: 'Testing is currently supported for Facebook New Page Comment triggers.' }, 400);
      }

      const triggerConfig = (workflow.execution_plan?.trigger?.config || workflow.trigger_config || {}) as Record<string, unknown>;
      const connectionId = String(triggerConfig.connection_id || '');
      const resourceId = String(triggerConfig.resource_id || '');

      if (!connectionId || !resourceId) {
        return json({ success: false, error: 'Trigger configuration is missing Meta connection or Facebook Page.' }, 400);
      }

      const { data: connection, error: connErr } = await admin
        .from('integration_connections')
        .select('id, provider, status')
        .eq('id', connectionId)
        .eq('organization_id', organizationId)
        .eq('provider', 'meta')
        .maybeSingle();

      if (connErr || !connection || (connection.status !== 'active' && connection.status !== 'degraded')) {
        return json({ success: false, error: 'Selected Meta connection is not active.' }, 400);
      }

      const { data: resource, error: resErr } = await admin
        .from('integration_connection_resources')
        .select('id, external_resource_id, display_name, selected')
        .eq('organization_id', organizationId)
        .eq('connection_id', connectionId)
        .eq('provider', 'meta')
        .eq('resource_type', 'facebook_page')
        .eq('external_resource_id', resourceId)
        .maybeSingle();

      if (resErr || !resource) {
        return json({ success: false, error: 'Selected Facebook Page is not authorized on this connection.' }, 400);
      }

      if (!resource.selected) {
        return json({ success: false, error: 'Selected Facebook Page is not active or selected.' }, 400);
      }

      const now = new Date().toISOString();
      const commentId = `test_comment_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const postId = triggerConfig.exact_post_id
        ? String(triggerConfig.exact_post_id)
        : (typeof body.postId === 'string' && body.postId.trim() ? body.postId.trim() : `test_post_${Date.now()}`);
      const isReply = Boolean(body.isReply);
      const parentCommentId = isReply ? `test_parent_${Date.now()}` : undefined;
      const message = typeof body.message === 'string' && body.message.trim()
        ? body.message.trim()
        : (triggerConfig.contains_text ? `NextAura Facebook test with ${triggerConfig.contains_text}` : 'NextAura Facebook automation test comment');

      const dedupeKey = `meta_test:comment:${connectionId}:${commentId}`;

      const payload: Record<string, unknown> = {
        connection_id: connectionId,
        page_id: resource.external_resource_id,
        page_name: resource.display_name,
        post_id: postId,
        comment_id: commentId,
        parent_comment_id: parentCommentId,
        message,
        author_id: 'test_user',
        author_name: 'NextAura Test User',
        created_time: Math.floor(Date.now() / 1000),
        test_event: true,
      };

      const { data: insertedEvent, error: insertError } = await admin
        .from('automation_events')
        .insert({
          organization_id: organizationId,
          event_type: 'facebook.page.comment.created',
          entity_type: 'facebook_comment',
          entity_id: null,
          payload,
          source: 'meta_test',
          dedupe_key: dedupeKey,
          occurred_at: now,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { error: enqueueErr } = await admin.rpc('enqueue_automation_runs', { p_event_batch_size: 25 });
      if (enqueueErr) throw enqueueErr;

      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      if (supabaseUrl && serviceRoleKey) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/automation-worker`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
            },
            body: JSON.stringify({ batchSize: 25 }),
          });
        } catch (workerErr) {
          console.error('Failed to trigger worker immediately:', workerErr);
        }
      }

      const { data: runRecord } = await admin
        .from('automation_runs')
        .select('id, status, error_summary, result_summary, started_at, completed_at, created_at')
        .eq('workflow_id', workflowId)
        .eq('event_id', insertedEvent.id)
        .maybeSingle();

      await audit(admin, organizationId, user.id, 'automation.trigger.tested', workflowId, {
        trigger_type: 'facebook.page.comment.created',
        page_id: resource.external_resource_id,
        page_name: resource.display_name,
        event_id: insertedEvent.id,
        run_id: runRecord?.id,
      });

      return json({
        success: true,
        eventId: insertedEvent.id,
        runId: runRecord?.id,
        run: runRecord,
        pageName: resource.display_name,
        pageId: resource.external_resource_id,
      });
    }
    await requireWorkflowAccess(admin, user.id, organizationId);

    if (effectiveMethod === 'POST') {
      const definition = await validateDefinition(admin, organizationId, body);
      const { count, error: countError } = await admin.from('automation_workflows').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
      if (countError) throw countError;
      if ((count || 0) >= MAX_WORKFLOWS) return json({ success: false, error: `An organization may have at most ${MAX_WORKFLOWS} workflows.` }, 409);
      const timestamps = definition.enabled ? { last_enabled_at: new Date().toISOString(), disabled_at: null } : { last_enabled_at: null, disabled_at: new Date().toISOString() };
      const incomingWebhookToken = definition.trigger_type === 'incoming_webhook' ? createIncomingWebhookToken() : null;
      const incomingWebhookTokenHash = incomingWebhookToken ? await hashIncomingWebhookToken(incomingWebhookToken) : null;
      const { graph_nodes, graph_edges, execution_plan, ...definitionFields } = definition; const { data, error } = await admin.from('automation_workflows').insert({ organization_id: organizationId, created_by: user.id, ...definitionFields, ...timestamps, incoming_webhook_token_hash: incomingWebhookTokenHash, ...(graph_nodes ? { graph_nodes, graph_edges, execution_plan } : {}) }).select('*').single();
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
      const definition = await validateDefinition(admin, organizationId, {
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
      const { graph_nodes, graph_edges, execution_plan, ...definitionFields } = definition; const { data, error } = await admin.from('automation_workflows').update({ ...definitionFields, ...lifecycle, version: current.version + 1, ...(graph_nodes ? { graph_nodes, graph_edges, execution_plan, graph_version: current.graph_version + 1, execution_plan_version: current.execution_plan_version + 1 } : {}), ...(incomingWebhookTokenHash ? { incoming_webhook_token_hash: incomingWebhookTokenHash } : {}) }).eq('id', workflowId).eq('organization_id', organizationId).select('*').single();
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
