import { supabase } from './supabaseClient';
import type { AppView } from '../context/AppContext';

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

export interface NextAuraAIResponse {
  answer: string;
  sources: AIResponseSource[];
  actions: AIResponseAction[];
  provider?: string;
  model?: string;
}

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
      return new NextAuraAIError(payload?.error || error.message, payload?.code || 'AI_REQUEST_FAILED');
    } catch {
      // Use the Supabase client error below when the response body is unavailable.
    }
  }
  return new NextAuraAIError(error?.message || 'NextAura AI is unavailable right now.');
};

export const nextAuraAIService = {
  async ask(organizationId: string, activeApp: AppView, messages: AIRequestMessage[]): Promise<NextAuraAIResponse> {
    const { data, error } = await supabase.functions.invoke('nextaura-ai', {
      body: { organizationId, activeApp, messages },
    });

    if (error) throw await readFunctionError(error);
    if (!data?.success) throw new NextAuraAIError(data?.error || 'NextAura AI could not answer this request.', data?.code);

    return {
      answer: String(data.answer || ''),
      sources: Array.isArray(data.sources) ? data.sources : [],
      actions: Array.isArray(data.actions) ? data.actions : [],
      provider: data.provider,
      model: data.model,
    };
  },
};
