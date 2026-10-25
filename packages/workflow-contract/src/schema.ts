import { z } from 'zod';
import { inspectJson, isSafeKey, utf8ByteLength, WORKFLOW_LIMITS } from './json.ts';
import { ISSUE_CODES, normalizeIssues, type IssueCode, type ValidationIssue } from './issues.ts';

function freezeLists<T extends Record<string, readonly string[]>>(value: T): Readonly<T> {
  Object.values(value).forEach(Object.freeze);
  return Object.freeze(value);
}

export const OPERATORS = freezeLists({
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
  string: ['eq', 'neq', 'contains'],
  boolean: ['eq', 'neq'],
  date: ['eq', 'neq', 'before', 'after'],
  enum: ['eq', 'neq', 'in'],
} as const);
export const NODE_HANDLES = freezeLists({
  start: ['next'],
  approval: ['approved', 'rejected'],
  condition: ['true', 'false'],
  end: [],
} as const);

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4)),
    month = Number(value.slice(5, 7)),
    day = Number(value.slice(8));
  if (year < 1 || month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
  return day >= 1 && day <= days;
}

const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
  .refine(isSafeKey);
const fieldKey = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
  .refine(isSafeKey);
const label = z
  .string()
  .min(1)
  .max(120)
  .refine((value) => value.trim().length > 0);
const text = z.string().max(WORKFLOW_LIMITS.text);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isCalendarDate, { params: { issueCode: 'DATE_INVALID' } });
const finite = z.number().finite();
const commonInput = { key: fieldKey, label, required: z.boolean() };
const inputShape = z.discriminatedUnion('type', [
  z.strictObject({
    ...commonInput,
    type: z.literal('number'),
    defaultValue: finite.optional(),
    validation: z.strictObject({ min: finite.optional(), max: finite.optional() }).optional(),
  }),
  z.strictObject({
    ...commonInput,
    type: z.literal('string'),
    defaultValue: text.optional(),
    validation: z
      .strictObject({
        minLength: z.number().int().min(0).max(1000).optional(),
        maxLength: z.number().int().min(0).max(1000).optional(),
      })
      .optional(),
  }),
  z.strictObject({
    ...commonInput,
    type: z.literal('boolean'),
    defaultValue: z.boolean().optional(),
  }),
  z.strictObject({
    ...commonInput,
    type: z.literal('date'),
    defaultValue: date.optional(),
    validation: z.strictObject({ min: date.optional(), max: date.optional() }).optional(),
  }),
  z.strictObject({
    ...commonInput,
    type: z.literal('enum'),
    defaultValue: label.optional(),
    options: z.array(label).min(1).max(WORKFLOW_LIMITS.options),
  }),
]);
export type InputField = z.infer<typeof inputShape>;

export function isFieldValue(field: InputField, value: unknown): boolean {
  switch (field.type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'string':
      return typeof value === 'string' && value.length <= WORKFLOW_LIMITS.text;
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return typeof value === 'string' && isCalendarDate(value);
    case 'enum':
      return typeof value === 'string' && field.options.includes(value);
  }
}

function defaultWithinBounds(field: InputField): boolean {
  const value = field.defaultValue;
  if (value === undefined) return true;
  switch (field.type) {
    case 'number':
      return (
        typeof value === 'number' &&
        (field.validation?.min === undefined || value >= field.validation.min) &&
        (field.validation?.max === undefined || value <= field.validation.max)
      );
    case 'date':
      return (
        typeof value === 'string' &&
        (field.validation?.min === undefined || value >= field.validation.min) &&
        (field.validation?.max === undefined || value <= field.validation.max)
      );
    case 'string':
      return (
        typeof value === 'string' &&
        value.length >= (field.validation?.minLength ?? 0) &&
        value.length <= (field.validation?.maxLength ?? WORKFLOW_LIMITS.text)
      );
    default:
      return true;
  }
}

export const inputFieldSchema = inputShape.superRefine((field, context) => {
  const fail = (issueCode: IssueCode, path: string) =>
    context.addIssue({ code: 'custom', path: [path], params: { issueCode } });
  if (field.type === 'enum' && new Set(field.options).size !== field.options.length)
    fail('INPUT_OPTIONS_INVALID', 'options');
  if (field.type === 'number' || field.type === 'date') {
    const { min, max } = field.validation ?? {};
    if (min !== undefined && max !== undefined && min > max)
      fail('INPUT_VALIDATION_INVALID', 'validation');
  }
  if (field.type === 'string') {
    const { minLength, maxLength } = field.validation ?? {};
    if (minLength !== undefined && maxLength !== undefined && minLength > maxLength)
      fail('INPUT_VALIDATION_INVALID', 'validation');
  }
  if (
    field.defaultValue !== undefined &&
    (!isFieldValue(field, field.defaultValue) || !defaultWithinBounds(field))
  )
    fail('INPUT_DEFAULT_INVALID', 'defaultValue');
});

const commonNode = { id, label, position: z.strictObject({ x: finite, y: finite }) };
export const nodeSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...commonNode,
    type: z.literal('start'),
    config: z.strictObject({ description: text.optional() }),
  }),
  z.strictObject({
    ...commonNode,
    type: z.literal('approval'),
    config: z.strictObject({ roleLabel: label }),
  }),
  z.strictObject({
    ...commonNode,
    type: z.literal('condition'),
    config: z.strictObject({
      fieldKey,
      operator: z.enum([
        'eq',
        'neq',
        'gt',
        'gte',
        'lt',
        'lte',
        'contains',
        'before',
        'after',
        'in',
      ]),
      value: z.union([
        finite,
        text,
        z.boolean(),
        z.array(label).min(1).max(WORKFLOW_LIMITS.options),
      ]),
    }),
  }),
  z.strictObject({
    ...commonNode,
    type: z.literal('end'),
    config: z.strictObject({ outcome: z.enum(['completed', 'rejected']) }),
  }),
]);
export const edgeSchema = z.strictObject({
  id,
  sourceNodeId: id,
  sourceHandle: z.enum(['next', 'approved', 'rejected', 'true', 'false']),
  targetNodeId: id,
});

const shape = z
  .strictObject({
    schemaVersion: z.literal(1),
    workflowId: id,
    title: label,
    description: text.optional(),
    locale: z.enum(['tr', 'en']),
    inputs: z.array(inputFieldSchema).max(WORKFLOW_LIMITS.inputs),
    nodes: z.array(nodeSchema).max(WORKFLOW_LIMITS.nodes),
    edges: z.array(edgeSchema).max(WORKFLOW_LIMITS.edges),
    layout: z
      .strictObject({
        viewport: z.strictObject({ x: finite, y: finite, zoom: finite.positive() }).optional(),
      })
      .optional(),
    contentHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .superRefine((workflow, context) => {
    for (const [collection, key, issueCode] of [
      ['nodes', 'id', 'DUPLICATE_ID'],
      ['edges', 'id', 'DUPLICATE_ID'],
      ['inputs', 'key', 'DUPLICATE_INPUT_KEY'],
    ] as const) {
      const seen = new Set<string>();
      for (const [index, item] of workflow[collection].entries()) {
        const identifier = 'id' in item ? item.id : item.key;
        if (seen.has(identifier))
          context.addIssue({
            code: 'custom',
            path: [collection, index, key],
            params: { issueCode },
          });
        seen.add(identifier);
      }
    }
  });

export type Workflow = z.infer<typeof shape>;
export type WorkflowNode = Workflow['nodes'][number];
export type WorkflowEdge = Workflow['edges'][number];

export const workflowSchema = z
  .unknown()
  .superRefine((value, context) => {
    const issueCode = inspectJson(value);
    if (issueCode) context.addIssue({ code: 'custom', params: { issueCode } });
  })
  .pipe(shape);

export function getWorkflowJsonSchema() {
  return {
    ...z.toJSONSchema(shape, { target: 'draft-2020-12' }),
    description:
      'Workflow v1 structural schema. Runtime parsing additionally checks UTF-8 bytes, safe JSON trees, unique identifiers, calendar dates, input bounds/defaults and option uniqueness. Executability requires workflow-core validation.',
    'x-runtime-checks': [
      'utf8-byte-limit',
      'safe-json-tree',
      'unique-identifiers',
      'calendar-dates',
      'input-bounds-defaults',
      'unique-options',
    ],
  };
}

export type ParseWorkflowResult =
  | { success: true; data: Workflow }
  | { success: false; issues: ValidationIssue[] };

function mapIssue(issue: z.core.$ZodIssue, input: unknown): ValidationIssue {
  let code: IssueCode = 'SCHEMA_INVALID';
  const [collection, index, ...rest] = issue.path;
  if (collection === 'schemaVersion') code = 'SCHEMA_VERSION_UNSUPPORTED';
  if (
    issue.code === 'too_big' &&
    (['nodes', 'edges', 'inputs'] as unknown[]).includes(collection) &&
    index === undefined
  )
    code = 'GRAPH_LIMIT_EXCEEDED';
  if (collection === 'inputs') {
    if (rest.includes('defaultValue')) code = 'INPUT_DEFAULT_INVALID';
    if (rest.includes('options')) code = 'INPUT_OPTIONS_INVALID';
    if (rest.includes('validation')) code = 'INPUT_VALIDATION_INVALID';
  }
  if (rest.includes('sourceHandle')) code = 'HANDLE_INVALID';
  if (
    issue.code === 'custom' &&
    typeof issue.params?.issueCode === 'string' &&
    (ISSUE_CODES as readonly string[]).includes(issue.params.issueCode)
  )
    code = issue.params.issueCode as IssueCode;
  const result: ValidationIssue = { code, severity: 'error' };
  let location: unknown;
  if (
    input &&
    typeof input === 'object' &&
    typeof collection === 'string' &&
    typeof index === 'number'
  ) {
    const items = (input as Record<string, unknown>)[collection];
    if (Array.isArray(items)) location = items[index];
  }
  if (location && typeof location === 'object') {
    const record = location as Record<string, unknown>;
    if (collection === 'nodes' && typeof record.id === 'string' && id.safeParse(record.id).success)
      result.nodeId = record.id;
    if (collection === 'edges' && typeof record.id === 'string' && id.safeParse(record.id).success)
      result.edgeId = record.id;
    if (
      collection === 'inputs' &&
      typeof record.key === 'string' &&
      fieldKey.safeParse(record.key).success
    )
      result.fieldKey = record.key;
  }
  // Array indexes are intentionally omitted: issue identity survives reordering.
  result.translationParams = {
    path: issue.path.filter((part) => typeof part === 'string').join('.'),
  };
  return result;
}

export function parseWorkflow(input: unknown): ParseWorkflowResult {
  try {
    const result = workflowSchema.safeParse(input);
    if (result.success) return { success: true, data: result.data };
    return {
      success: false,
      issues: normalizeIssues(result.error.issues.map((issue) => mapIssue(issue, input))),
    };
  } catch {
    return { success: false, issues: [{ code: 'INVALID_JSON', severity: 'error' }] };
  }
}

export function parseWorkflowJSON(text: unknown): ParseWorkflowResult {
  if (typeof text !== 'string')
    return { success: false, issues: [{ code: 'INVALID_JSON', severity: 'error' }] };
  if (
    text.length > WORKFLOW_LIMITS.bytes ||
    utf8ByteLength(text, WORKFLOW_LIMITS.bytes) > WORKFLOW_LIMITS.bytes
  )
    return { success: false, issues: [{ code: 'GRAPH_LIMIT_EXCEEDED', severity: 'error' }] };
  try {
    return parseWorkflow(JSON.parse(text));
  } catch {
    return { success: false, issues: [{ code: 'INVALID_JSON', severity: 'error' }] };
  }
}
