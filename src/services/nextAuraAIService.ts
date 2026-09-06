import { supabase } from './supabaseClient';
import type { AppView } from '../context/AppContext';
import type { ConversationContext, LocalAIIntent } from '../ai/types';
import { createLocalAIResponse } from '../ai/engine/responseEngine';

export interface AIRequestMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponseSource {
  key: string;
  label: string;
  detail: string;
}

export interface AIResponseAction {
  label: string;
  app: AppView;
  subView?: string;
}

export interface AIResponseSuggestion {
  label: string;
  prompt: string;
}

export interface NextAuraAIResponse {
  answer: string;
  sources: AIResponseSource[];
  actions: AIResponseAction[];
  suggestions: AIResponseSuggestion[];
  intent: LocalAIIntent;
  confidence: number;
  conversationContext: ConversationContext;
  engine: string;
}

interface AIWorkspaceIdentity {
  name: string;
  role: string;
  activeServices: string[];
}

const WORKSPACE_DATA_INTENTS = new Set<LocalAIIntent>([
  'WORKSPACE_SUMMARY',
  'EMPLOYEE_COUNT',
  'PAYROLL_STATUS',
  'INVOICE_STATUS',
  'APPROVALS',
  'CONTACTS',
]);

export class NextAuraAIError extends Error {
  readonly code: string;

  constructor(message: string, code = 'AI_REQUEST_FAILED') {
    super(message);
    this.name = 'NextAuraAIError';
    this.code = code;
  }
}

const readFunctionError = async (error: any): Promise<NextAuraAIError> => {
  const response = error?.context;
  if (response && typeof response.clone === 'function') {
    try {
      const payload = await response.clone().json();
      const code = payload?.code || 'AI_REQUEST_FAILED';
      if (code === 'UNAUTHORIZED') {
        return new NextAuraAIError('Your session has expired. Please sign in again.', code);
      }
      if (code === 'FORBIDDEN') {
        return new NextAuraAIError('You do not have access to this workspace.', code);
      }
      return new NextAuraAIError(payload?.error || 'NextAura AI could not complete this request.', code);
    } catch {
      // Use the safe client-facing error when the response body is unavailable.
    }
  }
  return new NextAuraAIError('NextAura AI could not complete this request.');
};

export const nextAuraAIService = {
  async ask(
    organizationId: string,
    activeApp: AppView,
    activeSubView: string,
    messages: AIRequestMessage[],
    workspace: AIWorkspaceIdentity,
  ): Promise<NextAuraAIResponse> {
    const query = messages.at(-1)?.content || '';
    const localResult = createLocalAIResponse({
      query,
      messages,
      activeApp,
      activeSubView,
      activeServices: workspace.activeServices,
      workspaceName: workspace.name,
      role: workspace.role,
      workspaceContext: {},
    });

    if (!WORKSPACE_DATA_INTENTS.has(localResult.intent)) {
      return {
        answer: localResult.answer,
        sources: localResult.sourceKeys.includes('active-services')
          ? [{ key: 'active-services', label: 'Active services', detail: `${workspace.activeServices.length} enabled` }]
          : [],
        actions: localResult.actions as AIResponseAction[],
        suggestions: localResult.suggestions,
        intent: localResult.intent,
        confidence: localResult.confidence,
        conversationContext: localResult.conversationContext,
        engine: localResult.engine,
      };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      throw new NextAuraAIError('Your session has expired. Please sign in again.', 'UNAUTHORIZED');
    }

    const { data, error } = await supabase.functions.invoke('nextaura-ai', {
      body: { organizationId, activeApp, activeSubView, messages },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (error) throw await readFunctionError(error);
    if (!data?.success) {
      throw new NextAuraAIError(data?.error || 'NextAura AI could not answer this request.', data?.code);
    }

    return {
      answer: String(data.answer || ''),
      sources: Array.isArray(data.sources) ? data.sources : [],
      actions: Array.isArray(data.actions) ? data.actions : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      intent: data.intent || 'UNKNOWN',
      confidence: Number(data.confidence || 0),
      conversationContext: data.conversationContext || {
        lastIntent: 'UNKNOWN',
        lastPage: activeApp,
      },
      engine: String(data.engine || 'NextAura Local Intelligence'),
    };
  },
};
