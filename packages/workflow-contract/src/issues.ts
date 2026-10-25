export const ISSUE_CODES = Object.freeze([
  'INVALID_JSON',
  'SCHEMA_INVALID',
  'SCHEMA_VERSION_UNSUPPORTED',
  'GRAPH_LIMIT_EXCEEDED',
  'DUPLICATE_ID',
  'DUPLICATE_INPUT_KEY',
  'INPUT_DEFAULT_INVALID',
  'INPUT_VALIDATION_INVALID',
  'INPUT_OPTIONS_INVALID',
  'DATE_INVALID',
  'START_COUNT_INVALID',
  'END_MISSING',
  'EDGE_DANGLING',
  'HANDLE_MISSING',
  'HANDLE_INVALID',
  'DUPLICATE_HANDLE',
  'START_INCOMING',
  'END_OUTGOING',
  'UNREACHABLE_NODE',
  'CYCLE_DETECTED',
  'PATH_NOT_TERMINATING',
  'INPUT_FIELD_MISSING',
  'OPERATOR_TYPE_MISMATCH',
  'CONDITION_VALUE_INVALID',
] as const);

export type IssueCode = (typeof ISSUE_CODES)[number];
export interface ValidationIssue {
  code: IssueCode;
  severity: 'error';
  nodeId?: string;
  edgeId?: string;
  fieldKey?: string;
  translationParams?: Record<string, string | number>;
}
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizeIssues(issues: readonly ValidationIssue[]): ValidationIssue[] {
  const key = (issue: ValidationIssue) =>
    JSON.stringify([
      issue.code,
      issue.nodeId ?? '',
      issue.edgeId ?? '',
      issue.fieldKey ?? '',
      Object.entries(issue.translationParams ?? {}).sort(([a], [b]) => compareText(a, b)),
    ]);
  const unique = new Map(issues.map((issue) => [key(issue), issue]));
  return [...unique.entries()].sort(([a], [b]) => compareText(a, b)).map(([, issue]) => issue);
}
