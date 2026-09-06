export type KnowledgeCategory = 'Finance' | 'People' | 'Marketing' | 'Platform' | 'Product';

export interface KnowledgeNavigation {
  app: string;
  subView?: string;
}

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  title: string;
  description: string;
  purpose: string;
  features: string[];
  subviews: string[];
  workflow: string[];
  actions: string[];
  commonQuestions: string[];
  commonProblems: string[];
  examples: string[];
  relatedServices: string[];
  navigation: KnowledgeNavigation;
  suggestedPrompts: string[];
  aliases: string[];
  patterns: string[];
}

export type LocalAIIntent =
  | 'GREETING'
  | 'HELP'
  | 'PRODUCT_OVERVIEW'
  | 'NAVIGATION'
  | 'EXPLAIN_SERVICE'
  | 'HOW_TO'
  | 'PRICING'
  | 'PLAN_DETAILS'
  | 'WORKSPACE_SUMMARY'
  | 'ENABLED_SERVICES'
  | 'EMPLOYEE_COUNT'
  | 'PAYROLL_STATUS'
  | 'INVOICE_STATUS'
  | 'APPROVALS'
  | 'CONTACTS'
  | 'DOCUMENTS'
  | 'PAGE_HELP'
  | 'UNKNOWN';

export interface ConversationContext {
  lastIntent: LocalAIIntent;
  lastService?: string;
  lastEntity?: string;
  lastPage: string;
}

export interface LocalAIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LocalAISuggestion {
  label: string;
  prompt: string;
}

export interface LocalAIAction {
  label: string;
  app: string;
  subView?: string;
}

export interface LocalAIResult {
  answer: string;
  intent: LocalAIIntent;
  confidence: number;
  sourceKeys: string[];
  actions: LocalAIAction[];
  suggestions: LocalAISuggestion[];
  conversationContext: ConversationContext;
  engine: string;
}

export interface LocalAIEngineInput {
  query: string;
  messages: LocalAIMessage[];
  activeApp: string;
  activeSubView?: string;
  activeServices: string[];
  workspaceName: string;
  role: string;
  workspaceContext: Record<string, unknown>;
}
