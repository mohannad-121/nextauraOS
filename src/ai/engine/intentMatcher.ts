import { APP_TO_KNOWLEDGE_ID, NEXTAURA_KNOWLEDGE } from '../knowledge/services.ts';
import { INTENTS } from '../intents/intents.ts';
import type { KnowledgeEntry, LocalAIIntent } from '../types.ts';

export const normalizeInput = (value: string): string => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const tokenize = (value: string): string[] => normalizeInput(value).split(' ').filter(Boolean);

export const levenshteinDistance = (left: string, right: string): number => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
};

const fuzzyTokenMatch = (queryToken: string, candidateToken: string): boolean => {
  if (queryToken.length < 4 || candidateToken.length < 4) return false;
  if (queryToken === candidateToken) return true;
  const distance = levenshteinDistance(queryToken, candidateToken);
  const similarity = 1 - distance / Math.max(queryToken.length, candidateToken.length);
  return distance <= 1 || similarity >= 0.84;
};

export interface ServiceMatch {
  entry?: KnowledgeEntry;
  confidence: number;
}

export const matchService = (query: string): ServiceMatch => {
  const normalized = normalizeInput(query);
  const queryTokens = tokenize(query);
  let best: { entry?: KnowledgeEntry; score: number; max: number } = { score: 0, max: 1 };

  for (const entry of NEXTAURA_KNOWLEDGE) {
    const terms = [entry.id.replaceAll('_', ' '), entry.title, ...entry.aliases].map(normalizeInput);
    let score = 0;
    for (const term of terms) {
      if (normalized.includes(term)) {
        score += term.includes(' ') ? 8 : 5;
        continue;
      }
      const termTokens = tokenize(term);
      const fuzzyMatches = termTokens.flatMap((candidate) => queryTokens
        .filter((token) => fuzzyTokenMatch(token, candidate))
        .map((token) => levenshteinDistance(token, candidate)));
      if (fuzzyMatches.length > 0) score += Math.min(...fuzzyMatches) <= 1 ? 4 : 2;
    }
    const max = Math.max(8, terms.length * 3);
    if (score > best.score) best = { entry, score, max };
  }

  return best.score >= 3
    ? { entry: best.entry, confidence: Math.min(0.98, 0.5 + best.score / best.max) }
    : { confidence: 0 };
};

const includesPhrase = (query: string, phrase: string) => query === phrase || query.includes(phrase);

export const matchIntent = (query: string, service?: KnowledgeEntry): { intent: LocalAIIntent; confidence: number } => {
  const normalized = normalizeInput(query);
  const tokens = tokenize(query);
  if (!normalized) return { intent: 'UNKNOWN', confidence: 0 };

  const exactGreeting = INTENTS[0].phrases.includes(normalized);
  if (exactGreeting) return { intent: 'GREETING', confidence: 1 };

  const ordered: LocalAIIntent[] = [
    'EMPLOYEE_COUNT', 'ENABLED_SERVICES', 'PAYROLL_STATUS', 'INVOICE_STATUS', 'APPROVALS', 'CONTACTS',
    'DOCUMENTS', 'WORKSPACE_SUMMARY', 'PAGE_HELP', 'PLAN_DETAILS', 'PRICING', 'PRODUCT_OVERVIEW', 'NAVIGATION', 'HOW_TO', 'HELP', 'EXPLAIN_SERVICE',
  ];

  for (const intentId of ordered) {
    if (intentId === 'EXPLAIN_SERVICE' && !service) continue;
    const definition = INTENTS.find((intent) => intent.id === intentId);
    if (!definition) continue;
    const phraseScore = definition.phrases.reduce((score, phrase) => score + (includesPhrase(normalized, phrase) ? 4 : 0), 0);
    const keywordScore = definition.keywords.reduce((score, keyword) => score + (tokens.includes(keyword) || normalized.includes(keyword) ? 1 : 0), 0);
    if (phraseScore >= 4 || keywordScore >= Math.min(2, definition.keywords.length)) {
      return { intent: intentId, confidence: Math.min(0.99, 0.66 + phraseScore * 0.05 + keywordScore * 0.04) };
    }
  }

  if (service) return { intent: 'EXPLAIN_SERVICE', confidence: 0.72 };
  return { intent: 'UNKNOWN', confidence: 0.2 };
};

export const serviceForApp = (app: string): KnowledgeEntry | undefined => {
  const knowledgeId = APP_TO_KNOWLEDGE_ID[app];
  return knowledgeId ? NEXTAURA_KNOWLEDGE.find((item) => item.id === knowledgeId) : undefined;
};
