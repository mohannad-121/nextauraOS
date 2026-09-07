const OPERATORS = new Set(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty', 'changed_from', 'changed_to']);

export class AutomationConditionError extends Error {
  constructor(message: string) { super(message); this.name = 'AutomationConditionError'; }
}

type Condition = { field: string; operator: string; value?: string | number | boolean | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function conditionFrom(value: unknown): Condition {
  if (!isRecord(value) || Object.keys(value).some((key) => !['field', 'operator', 'value'].includes(key)) || typeof value.field !== 'string' || !/^[A-Za-z][A-Za-z0-9_.]{0,63}$/.test(value.field) || typeof value.operator !== 'string' || !OPERATORS.has(value.operator)) throw new AutomationConditionError('Automation condition is invalid.');
  const hasValue = Object.prototype.hasOwnProperty.call(value, 'value');
  if (!['is_empty', 'is_not_empty'].includes(value.operator) && !hasValue) throw new AutomationConditionError('Automation condition requires a value.');
  if (hasValue && value.value !== null && !['string', 'number', 'boolean'].includes(typeof value.value)) throw new AutomationConditionError('Automation condition value is invalid.');
  return value as Condition;
}

function payloadValue(payload: Record<string, unknown>, field: string): unknown {
  let current: unknown = payload;
  for (const part of field.split('.')) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, part)) throw new AutomationConditionError(`Automation condition field "${field}" is unavailable.`);
    current = current[part];
  }
  if (isRecord(current) || Array.isArray(current)) throw new AutomationConditionError(`Automation condition field "${field}" must be a scalar value.`);
  return current;
}

function changedPayloadValue(payload: Record<string, unknown>, field: string, prefix: 'old' | 'new') {
  const rootField = field.includes('.') ? `${prefix}.${field}` : `${prefix}_${field}`;
  try { return payloadValue(payload, rootField); } catch { throw new AutomationConditionError(`Automation condition ${prefix === 'old' ? 'previous' : 'new'} field "${field}" is unavailable.`); }
}

function equal(left: unknown, right: unknown) { return typeof left === typeof right && left === right; }

export function evaluateAutomationCondition(value: unknown, payload: Record<string, unknown>): boolean {
  const condition = conditionFrom(value);
  const target = condition.operator === 'changed_from' ? changedPayloadValue(payload, condition.field, 'old') : condition.operator === 'changed_to' ? changedPayloadValue(payload, condition.field, 'new') : payloadValue(payload, condition.field);
  if (condition.operator === 'equals') return equal(target, condition.value);
  if (condition.operator === 'not_equals') return !equal(target, condition.value);
  if (condition.operator === 'contains') { if (typeof target !== 'string' || typeof condition.value !== 'string') throw new AutomationConditionError('contains requires string values.'); return target.includes(condition.value); }
  if (condition.operator === 'greater_than' || condition.operator === 'less_than') { if (typeof target !== 'number' || !Number.isFinite(target) || typeof condition.value !== 'number' || !Number.isFinite(condition.value)) throw new AutomationConditionError(`${condition.operator} requires numeric values.`); return condition.operator === 'greater_than' ? target > condition.value : target < condition.value; }
  if (condition.operator === 'is_empty') return target === null || target === '';
  if (condition.operator === 'is_not_empty') return target !== null && target !== '';
  return equal(target, condition.value);
}
