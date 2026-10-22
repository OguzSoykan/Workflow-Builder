import { utf8ToBytes } from '@noble/hashes/utils.js';
import { LIMITS, WorkflowSchema, forbiddenKeys, type Workflow } from './schema';
import { normalizeIssues, type ValidationIssue } from './issues';
export type ParseResult =
  { success: true; data: Workflow } | { success: false; issues: ValidationIssue[] };
const failure = (code: string): ParseResult => ({
  success: false,
  issues: [{ code, severity: 'error' }],
});
/** Bound JSON traversal before serialization/schema recursion. Never invoke accessors. */
function inspectJson(root: unknown): string | undefined {
  const active = new WeakSet<object>();
  const stack: { value: unknown; depth: number; exit?: boolean }[] = [{ value: root, depth: 0 }];
  let visits = 0;
  let textUnits = 0;
  while (stack.length) {
    const { value, depth, exit } = stack.pop()!;
    if (exit) {
      active.delete(value as object);
      continue;
    }
    if (++visits > LIMITS.values || depth > LIMITS.depth) return 'UNSAFE_INPUT';
    if (typeof value === 'string') {
      textUnits += value.length;
      if (textUnits > LIMITS.bytes) return 'GRAPH_TOO_LARGE';
      continue;
    }
    if (value === null || typeof value === 'boolean') continue;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return 'UNSAFE_INPUT';
      continue;
    }
    if (typeof value !== 'object' || active.has(value)) return 'UNSAFE_INPUT';
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (
      array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null
    )
      return 'UNSAFE_INPUT';
    const keys = Reflect.ownKeys(value);
    if (keys.length > LIMITS.values || (array && (value as unknown[]).length > LIMITS.values))
      return 'UNSAFE_INPUT';
    active.add(value);
    stack.push({ value, depth, exit: true });
    let elements = 0;
    for (const key of keys) {
      if (array && key === 'length') continue;
      if (typeof key !== 'string' || forbiddenKeys.has(key)) return 'UNSAFE_INPUT';
      if (array && !/^(0|[1-9]\d*)$/.test(key)) return 'UNSAFE_INPUT';
      textUnits += key.length;
      if (textUnits > LIMITS.bytes) return 'GRAPH_TOO_LARGE';
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) return 'UNSAFE_INPUT';
      elements++;
      stack.push({ value: descriptor.value as unknown, depth: depth + 1 });
    }
    if (array && elements !== (value as unknown[]).length) return 'UNSAFE_INPUT';
  }
  return undefined;
}
export function parseWorkflow(input: unknown): ParseResult {
  try {
    let value: unknown = input;
    if (typeof value === 'string') {
      if (value.length > LIMITS.bytes || utf8ToBytes(value).length > LIMITS.bytes)
        return failure('GRAPH_TOO_LARGE');
      try {
        value = JSON.parse(value) as unknown;
      } catch {
        return failure('INVALID_JSON');
      }
    }
    const unsafe = inspectJson(value);
    if (unsafe) return failure(unsafe);
    if (utf8ToBytes(JSON.stringify(value)).length > LIMITS.bytes) return failure('GRAPH_TOO_LARGE');
    if (value && typeof value === 'object' && 'schemaVersion' in value && value.schemaVersion !== 1)
      return failure('SCHEMA_VERSION_UNSUPPORTED');
    const result = WorkflowSchema.safeParse(value);
    if (result.success) return { success: true, data: result.data };
    return {
      success: false,
      issues: normalizeIssues(
        result.error.issues.map((issue) => ({
          code:
            issue.code === 'custom' && typeof issue.params?.issueCode === 'string'
              ? issue.params.issueCode
              : issue.code === 'too_big' &&
                  ['nodes', 'edges', 'inputs'].includes(String(issue.path[0])) &&
                  issue.path.length === 1
                ? 'GRAPH_LIMIT_EXCEEDED'
                : 'SCHEMA_INVALID',
          severity: 'error' as const,
          path: issue.path.map(String).join('.'),
        })),
      ),
    };
  } catch {
    return failure('UNSAFE_INPUT');
  }
}
