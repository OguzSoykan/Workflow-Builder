import {
  normalizeIssues,
  parseWorkflow,
  parseWorkflowJSON,
  type ParseWorkflowResult,
  type ValidationResult,
} from '@workflow-builder/workflow-contract';
import { validateTopology } from './topology.ts';
import { validateConditions } from './conditions.ts';

function validateParsed(parsed: ParseWorkflowResult): ValidationResult {
  if (!parsed.success) return { valid: false, issues: parsed.issues };
  const issues = normalizeIssues([
    ...validateTopology(parsed.data),
    ...validateConditions(parsed.data),
  ]);
  return { valid: issues.length === 0, issues };
}

/** Trust boundary: schema and limits are checked even when the caller claims Workflow. */
export function validateWorkflow(input: unknown): ValidationResult {
  return validateParsed(parseWorkflow(input));
}

export function validateWorkflowJSON(input: unknown): ValidationResult {
  return validateParsed(parseWorkflowJSON(input));
}
