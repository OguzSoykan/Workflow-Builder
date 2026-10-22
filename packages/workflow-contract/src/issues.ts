export interface ValidationIssue {
  code: string;
  severity: 'error';
  nodeId?: string;
  edgeId?: string;
  fieldKey?: string;
  path?: string;
  translationParams?: Record<string, string | number>;
}
export const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
export function normalizeIssues(issues: ValidationIssue[]): ValidationIssue[] {
  const key = (issue: ValidationIssue) =>
    JSON.stringify([
      issue.code,
      issue.nodeId ?? '',
      issue.edgeId ?? '',
      issue.fieldKey ?? '',
      issue.path ?? '',
      Object.entries(issue.translationParams ?? {}).sort(([a], [b]) => compareText(a, b)),
    ]);
  return [...new Map(issues.map((issue) => [key(issue), issue])).entries()]
    .sort(([a], [b]) => compareText(a, b))
    .map(([, issue]) => issue);
}
