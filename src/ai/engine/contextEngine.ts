import { matchIntent, matchService, normalizeInput, serviceForApp } from './intentMatcher.ts';
import type { ConversationContext, KnowledgeEntry, LocalAIMessage } from '../types.ts';

const referencesPriorTopic = (query: string): boolean => {
  const normalized = normalizeInput(query);
  return /\b(it|this|that|one|here|there|them|those)\b/.test(normalized);
};

const findPriorService = (messages: LocalAIMessage[]): KnowledgeEntry | undefined => {
  for (const message of [...messages].reverse()) {
    if (message.role !== 'user') continue;
    const match = matchService(message.content);
    if (match.entry) return match.entry;
  }
  return undefined;
};

export const resolveConversationContext = (
  query: string,
  messages: LocalAIMessage[],
  activeApp: string,
  activeSubView = 'overview',
): { context: ConversationContext; service?: KnowledgeEntry; confidence: number } => {
  const direct = matchService(query);
  const pageService = serviceForApp(activeApp);
  const priorService = findPriorService(messages.slice(0, -1));
  const service = direct.entry || (referencesPriorTopic(query) ? priorService || pageService : undefined);
  const intentMatch = matchIntent(query, service);

  return {
    service,
    confidence: Math.max(intentMatch.confidence, direct.confidence),
    context: {
      lastIntent: intentMatch.intent,
      lastService: service?.id,
      lastEntity: service?.title,
      lastPage: `${activeApp}:${activeSubView}`,
    },
  };
};
