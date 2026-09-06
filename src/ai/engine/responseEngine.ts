import { INTENTS, TOTAL_INTENT_PATTERNS } from '../intents/intents.ts';
import { formatPricingAnswer } from '../knowledge/pricing.ts';
import { KNOWLEDGE_BY_ID, NEXTAURA_KNOWLEDGE, SERVICE_TO_ENTITLEMENT, TOTAL_KNOWLEDGE_PATTERNS } from '../knowledge/services.ts';
import { resolveConversationContext } from './contextEngine.ts';
import { normalizeInput } from './intentMatcher.ts';
import { FALLBACK_VARIANTS, GREETING_VARIANTS, HELP_ANSWER, pickVariant } from '../responses/templates.ts';
import type { KnowledgeEntry, LocalAIEngineInput, LocalAIResult, LocalAISuggestion } from '../types.ts';

export const LOCAL_AI_ENGINE_NAME = 'NextAura Local Intelligence';
export const LOCAL_AI_ENGINE_VERSION = '1.0';
export const TOTAL_RESPONSE_PATTERNS = TOTAL_KNOWLEDGE_PATTERNS + TOTAL_INTENT_PATTERNS + GREETING_VARIANTS.length + FALLBACK_VARIANTS.length;

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const readCount = (context: Record<string, unknown>, group: string, key: string): number | null => {
  const value = asRecord(context[group])[key];
  return typeof value === 'number' ? value : null;
};

const list = (items: string[]) => items.map((item) => `• ${item}`).join('\n');
const suggested = (prompts: string[]): LocalAISuggestion[] => prompts.slice(0, 4).map((prompt) => ({ label: prompt, prompt }));

const serviceAnswer = (service: KnowledgeEntry): string => `✨ **${service.title}**\n\n${service.description}\n\n**You can:**\n${list(service.features)}\n\n**Typical workflow:**\n${service.workflow.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\n💡 It also works well with ${service.relatedServices.length ? service.relatedServices.map((id) => KNOWLEDGE_BY_ID.get(id)?.title || id).join(', ') : 'your wider NextAura workspace'}.`;

const howToAnswer = (service: KnowledgeEntry): string => `🚀 **How to work with ${service.title}**\n\n${service.workflow.map((step, index) => `${index + 1}. **${step}**`).join('\n')}\n\n✅ Start in **${service.subviews[0]}**. I can also open the right page for you; I won’t submit, approve, send, or delete anything.`;

const workspaceSummary = (input: LocalAIEngineInput): string => {
  const employeeTotal = readCount(input.workspaceContext, 'employeeCounts', 'total');
  const overdue = readCount(input.workspaceContext, 'invoiceCounts', 'overdue');
  const unpaid = readCount(input.workspaceContext, 'invoiceCounts', 'unpaid');
  const pendingLeave = readCount(input.workspaceContext, 'timeOffCounts', 'pending');
  const submittedExpenses = readCount(input.workspaceContext, 'expenseCounts', 'submitted');
  const draftPayroll = readCount(input.workspaceContext, 'payrollCounts', 'draft');
  const rows = [
    `• **Enabled services:** ${input.activeServices.length}`,
    employeeTotal === null ? undefined : `• **Employees:** ${employeeTotal}`,
    unpaid === null ? undefined : `• **Unpaid invoices:** ${unpaid}${overdue === null ? '' : ` (${overdue} overdue)`}`,
    submittedExpenses === null ? undefined : `• **Expenses awaiting review:** ${submittedExpenses}`,
    pendingLeave === null ? undefined : `• **Pending leave requests:** ${pendingLeave}`,
    draftPayroll === null ? undefined : `• **Draft payroll runs:** ${draftPayroll}`,
  ].filter(Boolean);
  return `📊 **${input.workspaceName} summary**\n\n${rows.join('\n') || 'No summary metrics are available for your permitted services yet.'}\n\n🎯 These figures come only from your current workspace and membership permissions.`;
};

const result = (
  input: LocalAIEngineInput,
  answer: string,
  options: Partial<Pick<LocalAIResult, 'sourceKeys' | 'actions' | 'suggestions'>> = {},
): LocalAIResult => {
  const resolved = resolveConversationContext(input.query, input.messages, input.activeApp, input.activeSubView);
  return {
    answer,
    intent: resolved.context.lastIntent,
    confidence: Number(resolved.confidence.toFixed(2)),
    sourceKeys: options.sourceKeys || [],
    actions: options.actions || [],
    suggestions: options.suggestions || [],
    conversationContext: resolved.context,
    engine: `${LOCAL_AI_ENGINE_NAME} ${LOCAL_AI_ENGINE_VERSION}`,
  };
};

export const createLocalAIResponse = (input: LocalAIEngineInput): LocalAIResult => {
  const resolved = resolveConversationContext(input.query, input.messages, input.activeApp, input.activeSubView);
  const { lastIntent: intent } = resolved.context;
  const service = resolved.service;
  const normalized = normalizeInput(input.query);
  const serviceAction = service ? [{ label: `Open ${service.title}`, app: service.navigation.app, subView: service.navigation.subView }] : [];
  const serviceSuggestions = service ? suggested(service.suggestedPrompts) : [];

  if (intent === 'GREETING') return result(input, pickVariant(GREETING_VARIANTS, `${normalized}:${input.messages.length}`), { suggestions: suggested(['What can you do?', 'What apps do I have?', 'What needs attention?', 'Show pricing']) });
  if (intent === 'HELP') return result(input, HELP_ANSWER, { suggestions: suggested(['What is NextAura?', 'Explain Payroll', 'How do I create an invoice?', 'What apps do I have?']) });
  if (intent === 'PRODUCT_OVERVIEW') {
    const nextAura = KNOWLEDGE_BY_ID.get('nextaura')!;
    return result(input, `💼 **NextAura**\n\n${nextAura.description}\n\n${list(nextAura.features)}\n\nIt keeps every record inside the active organization and exposes only the services and data permitted for your membership.`, { actions: [{ label: 'Open Home', app: 'home' }], suggestions: suggested(['What apps do I have?', 'Show pricing', 'How do workspaces work?', 'What can you do?']) });
  }
  if (intent === 'PRICING' || intent === 'PLAN_DETAILS') {
    const plan = normalized.includes('standard') ? 'standard' : normalized.includes('custom') ? 'custom' : normalized.includes('free') || normalized.includes('one app') ? 'oneAppFree' : undefined;
    return result(input, formatPricingAnswer(plan), { actions: [{ label: 'Open Pricing', app: 'pricing' }], suggestions: suggested(['Compare all plans', 'What is Standard plan?', 'What is Custom plan?', 'Open pricing']) });
  }
  if (intent === 'ENABLED_SERVICES') {
    const enabled = input.activeServices.map((key) => NEXTAURA_KNOWLEDGE.find((item) => SERVICE_TO_ENTITLEMENT[item.id] === key)?.title || key.replaceAll('_', ' '));
    const answer = enabled.length
      ? `🧩 **Your enabled services**\n\n${list(enabled)}\n\nYou have ${enabled.length} service${enabled.length === 1 ? '' : 's'} active in **${input.workspaceName}**.`
      : `🧩 **No optional services are active yet.**\n\nOpen the service catalog to choose the apps this workspace needs.`;
    return result(input, answer, { sourceKeys: ['active-services'], actions: [{ label: 'Open My Apps', app: 'launchpad' }], suggestions: suggested(['What does each app do?', 'Open All Apps', 'How do I add a service?']) });
  }
  if (intent === 'EMPLOYEE_COUNT') {
    const count = readCount(input.workspaceContext, 'employeeCounts', 'total');
    const answer = count === null ? '👥 **Employee count is unavailable.**\n\nThe Employees service may not be enabled, or your membership cannot read that count.' : count === 0 ? '👥 **There are no employees in this workspace yet.**\n\nYou can open Employees to add the first profile.' : `👥 **You currently have ${count} employee${count === 1 ? '' : 's'} in this workspace.**`;
    return result(input, answer, { sourceKeys: ['employees'], actions: [{ label: 'Open Employees', app: 'employees' }], suggestions: suggested(['Open the organization chart', 'How do I add an employee?', 'What is Attendance?']) });
  }
  if (intent === 'PAYROLL_STATUS') {
    const drafts = readCount(input.workspaceContext, 'payrollCounts', 'draft');
    const answer = drafts === null ? '🧾 **Payroll status is unavailable.**\n\nPayroll data is visible only when the service is enabled and your role is permitted.' : `🧾 **Payroll status**\n\nYou have **${drafts} draft payroll run${drafts === 1 ? '' : 's'}** awaiting completion in this workspace.`;
    return result(input, answer, { sourceKeys: ['payroll-runs'], actions: [{ label: 'Open Payroll Runs', app: 'payroll', subView: 'runs' }], suggestions: suggested(['How do I create payroll?', 'Explain payslips', 'Open payroll']) });
  }
  if (intent === 'INVOICE_STATUS') {
    const total = readCount(input.workspaceContext, 'invoiceCounts', 'total');
    const overdue = readCount(input.workspaceContext, 'invoiceCounts', 'overdue');
    const unpaid = readCount(input.workspaceContext, 'invoiceCounts', 'unpaid');
    const answer = total === null ? '💰 **Invoice status is unavailable.**\n\nInvoicing may not be enabled, or your role cannot read invoice data.' : `💰 **Invoice status**\n\n• Total invoices: **${total}**\n• Unpaid or partially paid: **${unpaid ?? 'Unavailable'}**\n• Overdue: **${overdue ?? 'Unavailable'}**`;
    return result(input, answer, { sourceKeys: ['invoices'], actions: [{ label: 'Open Invoicing', app: 'invoicing' }], suggestions: suggested(['How do I create an invoice?', 'Open customers', 'What is Accounting?']) });
  }
  if (intent === 'APPROVALS') {
    const expenses = readCount(input.workspaceContext, 'expenseCounts', 'submitted');
    const leave = readCount(input.workspaceContext, 'timeOffCounts', 'pending');
    const payroll = readCount(input.workspaceContext, 'payrollCounts', 'draft');
    const known = [expenses, leave, payroll].filter((value) => value !== null) as number[];
    const answer = known.length ? `✅ **Items that may need attention**\n\n• Submitted expenses: **${expenses ?? 'Unavailable'}**\n• Pending leave requests: **${leave ?? 'Unavailable'}**\n• Draft payroll runs: **${payroll ?? 'Unavailable'}**\n\nOpen the source record before making any decision.` : '✅ **Approval counts are unavailable for your current services or role.**';
    return result(input, answer, { sourceKeys: ['expenses', 'time-off', 'payroll-runs'], actions: [{ label: 'Open Approvals', app: 'approvals' }], suggestions: suggested(['Show invoice status', 'Show payroll status', 'What needs attention?']) });
  }
  if (intent === 'CONTACTS') {
    const count = readCount(input.workspaceContext, 'contactCounts', 'total');
    const answer = count === null ? '👤 **Contact count is unavailable.**\n\nThe Contacts service may not be enabled for this workspace.' : count === 0 ? '👤 **There are no contacts in this workspace yet.**' : `👤 **You currently have ${count} contact${count === 1 ? '' : 's'} in this workspace.**`;
    return result(input, answer, { sourceKeys: ['contacts'], actions: [{ label: 'Open Contacts', app: 'contacts' }], suggestions: suggested(['How do I add a contact?', 'What uses Contacts?', 'Open invoicing']) });
  }
  if (intent === 'DOCUMENTS') {
    const documents = KNOWLEDGE_BY_ID.get('documents')!;
    return result(input, serviceAnswer(documents), { actions: [{ label: 'Open Document Vault', app: 'documents' }], suggestions: suggested(documents.suggestedPrompts) });
  }
  if (intent === 'WORKSPACE_SUMMARY') return result(input, workspaceSummary(input), { sourceKeys: ['active-services', 'employees', 'invoices', 'expenses', 'time-off', 'payroll-runs'], actions: [{ label: 'Open Home', app: 'home' }], suggestions: suggested(['Show invoice status', 'How many employees do we have?', 'What apps do I have?', 'Show payroll status']) });
  if ((intent === 'NAVIGATION' || intent === 'PAGE_HELP') && service) return result(input, intent === 'PAGE_HELP' ? serviceAnswer(service) : `🚀 **${service.title} is ready to open.**\n\n${service.description}`, { actions: serviceAction, suggestions: serviceSuggestions });
  if (intent === 'HOW_TO' && service) return result(input, howToAnswer(service), { actions: serviceAction, suggestions: serviceSuggestions });
  if (service) return result(input, serviceAnswer(service), { actions: serviceAction, suggestions: serviceSuggestions });

  return result(input, pickVariant(FALLBACK_VARIANTS, `${normalized}:${input.messages.length}`), { suggestions: suggested(['How do I create an invoice?', 'What is Payroll?', 'What apps do I have?', 'Show pricing']) });
};

export const LOCAL_AI_INTENT_COUNT = INTENTS.length;
