import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { evaluateAutomationCondition } from './automation-condition.ts';

const payload = { status: 'Active', amount: 42, old_status: 'Pending', new_status: 'Approved', nested: { code: 'A1' } };

Deno.test('evaluates bounded scalar condition operators', () => {
  assertEquals(evaluateAutomationCondition({ field: 'status', operator: 'equals', value: 'Active' }, payload), true);
  assertEquals(evaluateAutomationCondition({ field: 'status', operator: 'contains', value: 'ct' }, payload), true);
  assertEquals(evaluateAutomationCondition({ field: 'amount', operator: 'greater_than', value: 10 }, payload), true);
  assertEquals(evaluateAutomationCondition({ field: 'status', operator: 'changed_from', value: 'Pending' }, payload), true);
  assertEquals(evaluateAutomationCondition({ field: 'status', operator: 'changed_to', value: 'Approved' }, payload), true);
});

Deno.test('rejects invalid or unavailable condition fields', () => {
  assertThrows(() => evaluateAutomationCondition({ field: 'missing', operator: 'equals', value: 'x' }, payload));
  assertThrows(() => evaluateAutomationCondition({ field: 'status', operator: 'arbitrary', value: 'x' }, payload));
});
