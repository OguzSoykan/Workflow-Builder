import { z } from 'zod';
export const LIMITS = Object.freeze({
  nodes: 50,
  edges: 100,
  inputs: 30,
  bytes: 262144,
  depth: 16,
  values: 10000,
});
export const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const text = z.string().max(LIMITS.bytes);
const label = text.min(1);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const fieldKey = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z0-9_]{0,63}$/)
  .refine((key) => !forbiddenKeys.has(key));
const finite = z.number().finite();
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < 1 || month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1]!;
}
const date = z.string().refine(isCalendarDate);
const inputBase = { key: fieldKey, label, required: z.boolean() };
export const InputFieldSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...inputBase,
    type: z.literal('number'),
    defaultValue: finite.optional(),
    validation: z.strictObject({ min: finite.optional(), max: finite.optional() }).optional(),
  }),
  z.strictObject({
    ...inputBase,
    type: z.literal('string'),
    defaultValue: text.optional(),
    validation: z
      .strictObject({
        minLength: z.number().int().nonnegative().optional(),
        maxLength: z.number().int().nonnegative().optional(),
      })
      .optional(),
  }),
  z.strictObject({
    ...inputBase,
    type: z.literal('boolean'),
    defaultValue: z.boolean().optional(),
  }),
  z.strictObject({
    ...inputBase,
    type: z.literal('date'),
    defaultValue: date.optional(),
    validation: z.strictObject({ min: date.optional(), max: date.optional() }).optional(),
  }),
  z.strictObject({
    ...inputBase,
    type: z.literal('enum'),
    defaultValue: text.optional(),
    options: z
      .array(label)
      .min(1)
      .max(100)
      .refine((options) => new Set(options).size === options.length),
  }),
]);
export const OPERATORS = {
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
  string: ['eq', 'neq', 'contains'],
  boolean: ['eq', 'neq'],
  date: ['eq', 'neq', 'before', 'after'],
  enum: ['eq', 'neq', 'in'],
} as const;
export const HANDLES = {
  start: ['next'],
  approval: ['approved', 'rejected'],
  condition: ['true', 'false'],
  end: [],
} as const;
const nodeBase = { id, label, position: z.strictObject({ x: finite, y: finite }) };
export const NodeSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...nodeBase,
    type: z.literal('start'),
    config: z.strictObject({ description: text.max(1000).optional() }),
  }),
  z.strictObject({
    ...nodeBase,
    type: z.literal('approval'),
    config: z.strictObject({ roleLabel: label }),
  }),
  z.strictObject({
    ...nodeBase,
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
      value: z.union([text, finite, z.boolean(), z.array(text).min(1).max(100)]),
    }),
  }),
  z.strictObject({
    ...nodeBase,
    type: z.literal('end'),
    config: z.strictObject({ outcome: z.enum(['completed', 'rejected']) }),
  }),
]);
export const EdgeSchema = z.strictObject({
  id,
  sourceNodeId: id,
  sourceHandle: z.enum(['next', 'approved', 'rejected', 'true', 'false']),
  targetNodeId: id,
});
export const WorkflowSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    workflowId: id,
    title: z.string().min(1).max(120),
    description: z.string().max(1000).optional(),
    locale: z.enum(['tr', 'en']),
    inputs: z.array(InputFieldSchema).max(LIMITS.inputs),
    nodes: z.array(NodeSchema).max(LIMITS.nodes),
    edges: z.array(EdgeSchema).max(LIMITS.edges),
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
    for (const collection of ['nodes', 'edges', 'inputs'] as const) {
      const seen = new Set<string>();
      workflow[collection].forEach((entry, index) => {
        const value = 'key' in entry ? entry.key : entry.id;
        if (seen.has(value))
          context.addIssue({
            code: 'custom',
            path: [collection, index, collection === 'inputs' ? 'key' : 'id'],
            params: { issueCode: collection === 'inputs' ? 'DUPLICATE_FIELD_KEY' : 'DUPLICATE_ID' },
          });
        seen.add(value);
      });
    }
  });
export type InputField = z.infer<typeof InputFieldSchema>;
export type WorkflowNode = z.infer<typeof NodeSchema>;
export type WorkflowEdge = z.infer<typeof EdgeSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
