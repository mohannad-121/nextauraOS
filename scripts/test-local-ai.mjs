import assert from 'node:assert/strict';
import { createLocalAIResponse, LOCAL_AI_INTENT_COUNT, TOTAL_RESPONSE_PATTERNS } from '../src/ai/engine/responseEngine.ts';

const base = {
  activeApp: 'home',
  activeSubView: 'overview',
  activeServices: ['invoicing', 'employees', 'payroll', 'contacts'],
  workspaceName: 'Test Workspace',
  role: 'Owner',
  workspaceContext: {
    employeeCounts: { total: 12, active: 11 },
    invoiceCounts: { total: 9, unpaid: 3, overdue: 1 },
    payrollCounts: { draft: 2 },
    contactCounts: { total: 27 },
    activeServices: ['invoicing', 'employees', 'payroll', 'contacts'],
  },
};

const ask = (query, overrides = {}) => createLocalAIResponse({ ...base, query, messages: [{ role: 'user', content: query }], ...overrides });
const cases = [
  ['hi', 'GREETING'],
  ['what is NextAura', 'PRODUCT_OVERVIEW'],
  ['what is payroll', 'EXPLAIN_SERVICE'],
  ['how do I create payroll', 'HOW_TO'],
  ['how many employees do we have', 'EMPLOYEE_COUNT'],
  ['what apps do I have', 'ENABLED_SERVICES'],
  ['show pricing', 'PRICING'],
  ['what is standard plan', 'PLAN_DETAILS'],
  ['open invoicing', 'NAVIGATION'],
  ['what can I do here', 'PAGE_HELP'],
  ['how do i create an invoce', 'HOW_TO'],
  ['tell me about quantum gardening', 'UNKNOWN'],
];

for (const [query, expectedIntent] of cases) {
  const overrides = query === 'what can I do here' ? { activeApp: 'payroll', activeSubView: 'runs' } : {};
  const response = ask(query, overrides);
  assert.equal(response.intent, expectedIntent, `${query}: expected ${expectedIntent}, got ${response.intent}`);
  assert.ok(response.answer.length > 20, `${query}: answer should be useful`);
}

const followUp = createLocalAIResponse({
  ...base,
  query: 'How do I create one?',
  messages: [
    { role: 'user', content: 'Tell me about payroll' },
    { role: 'assistant', content: 'Payroll helps you process monthly pay.' },
    { role: 'user', content: 'How do I create one?' },
  ],
});
assert.equal(followUp.conversationContext.lastService, 'payroll');
assert.match(followUp.answer, /payroll/i);
assert.equal(ask('how many employees do we have').answer.includes('12'), true);
assert.equal(LOCAL_AI_INTENT_COUNT, 18);
assert.ok(TOTAL_RESPONSE_PATTERNS >= 1000, `expected at least 1000 patterns, got ${TOTAL_RESPONSE_PATTERNS}`);

const timings = [];
for (let index = 0; index < 200; index += 1) {
  const startedAt = performance.now();
  ask(index % 2 === 0 ? 'what is payroll' : 'show pricing');
  timings.push(performance.now() - startedAt);
}
timings.sort((left, right) => left - right);
const p95LatencyMs = timings[Math.floor(timings.length * 0.95)];
assert.ok(p95LatencyMs < 300, `knowledge-only p95 latency was ${p95LatencyMs.toFixed(2)}ms`);

console.log(JSON.stringify({
  passed: cases.length + 4,
  intents: LOCAL_AI_INTENT_COUNT,
  responsePatterns: TOTAL_RESPONSE_PATTERNS,
  knowledgeOnlyP95Ms: Number(p95LatencyMs.toFixed(2)),
}));
