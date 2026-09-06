import type { LocalAIIntent } from '../types.ts';

export interface IntentDefinition {
  id: LocalAIIntent;
  phrases: string[];
  keywords: string[];
}

export const INTENTS: IntentDefinition[] = [
  { id: 'GREETING', phrases: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'how are you'], keywords: ['hello', 'hey', 'greetings'] },
  { id: 'HELP', phrases: ['help me', 'what can you do', 'how can you help', 'show me what you know'], keywords: ['help', 'support', 'assist'] },
  { id: 'PRODUCT_OVERVIEW', phrases: ['what is nextaura', 'tell me about nextaura', 'what does nextaura do', 'explain nextaura'], keywords: ['nextaura', 'platform', 'business os'] },
  { id: 'NAVIGATION', phrases: ['open', 'go to', 'take me to', 'show me', 'navigate to'], keywords: ['open', 'navigate', 'visit'] },
  { id: 'EXPLAIN_SERVICE', phrases: ['what is', 'tell me about', 'explain', 'what does'], keywords: ['what', 'explain', 'about'] },
  { id: 'HOW_TO', phrases: ['how do i', 'how can i', 'how to', 'create', 'add', 'start', 'set up'], keywords: ['how', 'create', 'add', 'start'] },
  { id: 'PRICING', phrases: ['show pricing', 'how much', 'what does it cost', 'compare plans', 'monthly price', 'yearly price'], keywords: ['pricing', 'price', 'cost', 'monthly', 'yearly'] },
  { id: 'PLAN_DETAILS', phrases: ['standard plan', 'custom plan', 'one app free', 'free plan', 'annual plan'], keywords: ['standard', 'custom', 'free', 'plan'] },
  { id: 'WORKSPACE_SUMMARY', phrases: ['workspace summary', 'business summary', 'what needs attention', 'what should i focus on', 'give me an update'], keywords: ['summary', 'attention', 'focus', 'update'] },
  { id: 'ENABLED_SERVICES', phrases: ['what apps do i have', 'which apps are enabled', 'enabled services', 'active apps', 'my apps'], keywords: ['enabled', 'active', 'apps', 'services'] },
  { id: 'EMPLOYEE_COUNT', phrases: ['how many employees', 'employee count', 'team size', 'our headcount', 'how many people'], keywords: ['employees', 'headcount', 'staff'] },
  { id: 'PAYROLL_STATUS', phrases: ['payroll status', 'payroll runs', 'draft payroll', 'monthly payroll status'], keywords: ['payroll', 'payslip', 'salary'] },
  { id: 'INVOICE_STATUS', phrases: ['invoice status', 'how many invoices', 'overdue invoices', 'unpaid invoices', 'who owes us'], keywords: ['invoice', 'overdue', 'unpaid', 'receivable'] },
  { id: 'APPROVALS', phrases: ['pending approvals', 'what needs approval', 'approval queue', 'decisions waiting'], keywords: ['approval', 'approve', 'pending'] },
  { id: 'CONTACTS', phrases: ['how many contacts', 'contact count', 'show contacts', 'open crm'], keywords: ['contacts', 'crm', 'customers', 'vendors'] },
  { id: 'DOCUMENTS', phrases: ['show documents', 'find a document', 'document vault', 'where are my files'], keywords: ['documents', 'files', 'vault'] },
  { id: 'PAGE_HELP', phrases: ['what can i do here', 'help with this page', 'explain this page', 'what is this screen'], keywords: ['here', 'page', 'screen'] },
  { id: 'UNKNOWN', phrases: [], keywords: [] },
];

export const TOTAL_INTENT_PATTERNS = INTENTS.reduce((total, intent) => total + intent.phrases.length + intent.keywords.length, 0);
