import {
  isFieldValue,
  OPERATORS,
  type ValidationIssue,
  type Workflow,
} from '@workflow-builder/workflow-contract';

export function validateConditions(workflow: Workflow): ValidationIssue[] {
  const fields = new Map(workflow.inputs.map((field) => [field.key, field]));
  const issues: ValidationIssue[] = [];
  for (const node of workflow.nodes) {
    if (node.type !== 'condition') continue;
    const { fieldKey, operator, value } = node.config;
    const field = fields.get(fieldKey);
    const location = { severity: 'error' as const, nodeId: node.id, fieldKey };
    if (!field) {
      issues.push({ ...location, code: 'INPUT_FIELD_MISSING' });
      continue;
    }
    const operators: readonly string[] = OPERATORS[field.type];
    if (!operators.includes(operator)) {
      issues.push({
        ...location,
        code: 'OPERATOR_TYPE_MISMATCH',
        translationParams: { type: field.type, operator },
      });
      continue;
    }
    const validValue =
      field.type === 'enum' && operator === 'in'
        ? Array.isArray(value) &&
          value.length > 0 &&
          new Set(value).size === value.length &&
          value.every((item) => field.options.includes(item))
        : isFieldValue(field, value);
    if (!validValue)
      issues.push({
        ...location,
        code: 'CONDITION_VALUE_INVALID',
        translationParams: { type: field.type },
      });
  }
  return issues;
}
