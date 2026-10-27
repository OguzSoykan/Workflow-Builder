import { describe, expect, it } from 'vitest';
import {
  inputFieldSchema,
  isCalendarDate,
  parseWorkflow,
  parseWorkflowJSON,
  workflowSchema,
  WORKFLOW_LIMITS,
  utf8ByteLength,
} from '@workflow-builder/workflow-contract';
import { sizedWorkflow } from '../../../tests/fixtures/sized-workflow';
import { purchaseWorkflow } from '../../../tests/fixtures/purchase';

function codes(input: unknown) {
  const parsed = parseWorkflow(input);
  expect(parsed.success).toBe(false);
  return parsed.success ? [] : parsed.issues.map((issue) => issue.code);
}

describe('workflow schema v1', () => {
  it('enforces the exact object byte limit independently of counts or topology', () => {
    const atLimit = sizedWorkflow(WORKFLOW_LIMITS.bytes);
    expect(utf8ByteLength(JSON.stringify(atLimit))).toBe(WORKFLOW_LIMITS.bytes);
    expect(parseWorkflow(atLimit).success).toBe(true);
    expect(codes(sizedWorkflow(WORKFLOW_LIMITS.bytes + 1))).toContain('GRAPH_LIMIT_EXCEEDED');
  });

  it('accepts all four node types and does not coerce or change identifiers', () => {
    const workflow = purchaseWorkflow();
    expect(parseWorkflow(workflow)).toEqual({ success: true, data: workflow });
    expect(parseWorkflowJSON(JSON.stringify(workflow))).toEqual({ success: true, data: workflow });
    expect(workflowSchema.parse(workflow)).not.toBe(workflow);
  });

  it.each([0, 2, '1', null])('rejects unsupported version %s', (schemaVersion) => {
    expect(codes({ ...purchaseWorkflow(), schemaVersion })).toContain('SCHEMA_VERSION_UNSUPPORTED');
  });

  it.each([
    { workflowId: '' },
    { workflowId: '../file' },
    { title: '' },
    { title: '  ' },
    { title: 'x'.repeat(121) },
    { description: 'x'.repeat(1001) },
    { locale: 'de' },
    { owner_uid: 'forged' },
    { revision: 2 },
    { contentHash: 'bad-hash' },
    { layout: { arbitraryScript: 'alert(1)' } },
  ])('rejects invalid/unknown document properties %j', (change) => {
    expect(codes({ ...purchaseWorkflow(), ...change })).toContain('SCHEMA_INVALID');
  });

  it.each([
    { type: 'email' },
    { id: '' },
    { config: { script: 'code' } },
    { position: { x: '1', y: 0 } },
    { label: 'x'.repeat(121) },
  ])('rejects invalid node %j', (change) => {
    const workflow = purchaseWorkflow();
    expect(codes({ ...workflow, nodes: [{ ...workflow.nodes[0], ...change }] })).toContain(
      'SCHEMA_INVALID',
    );
  });

  it('rejects unknown edge handles and malformed edges', () => {
    const workflow = purchaseWorkflow();
    expect(
      codes({ ...workflow, edges: [{ ...workflow.edges[0], sourceHandle: 'anything' }] }),
    ).toContain('HANDLE_INVALID');
    expect(codes({ ...workflow, edges: [{ id: 'edge' }] })).toContain('SCHEMA_INVALID');
  });

  it.each(['nodes', 'edges', 'inputs'] as const)(
    'rejects duplicate identifiers in %s',
    (collection) => {
      const workflow = purchaseWorkflow();
      const duplicate = [...workflow[collection], workflow[collection][0]];
      expect(codes({ ...workflow, [collection]: duplicate })).toContain(
        collection === 'inputs' ? 'DUPLICATE_INPUT_KEY' : 'DUPLICATE_ID',
      );
    },
  );

  it.each(['nodes', 'edges', 'inputs'] as const)(
    'accepts exact %s limit and rejects limit + 1 independently of topology',
    (collection) => {
      const workflow = purchaseWorkflow();
      const limit = WORKFLOW_LIMITS[collection];
      const values = Array.from({ length: limit + 1 }, (_, index) => ({
        ...workflow[collection][0],
        [collection === 'inputs' ? 'key' : 'id']: `item${index}`,
      }));
      expect(parseWorkflow({ ...workflow, [collection]: values.slice(0, limit) }).success).toBe(
        true,
      );
      expect(codes({ ...workflow, [collection]: values })).toContain('GRAPH_LIMIT_EXCEEDED');
    },
  );

  it('measures the raw JSON UTF-8 boundary, including whitespace and Turkish/emoji text', () => {
    const json = JSON.stringify({ ...purchaseWorkflow(), description: 'Türkçe 😀' });
    const atLimit = json + ' '.repeat(WORKFLOW_LIMITS.bytes - utf8ByteLength(json));
    expect(utf8ByteLength('ç😀')).toBe(6);
    expect(parseWorkflowJSON(atLimit).success).toBe(true);
    expect(parseWorkflowJSON(atLimit + ' ')).toEqual({
      success: false,
      issues: [{ code: 'GRAPH_LIMIT_EXCEEDED', severity: 'error' }],
    });
    const withTurkishPadding =
      json + ' '.repeat(WORKFLOW_LIMITS.bytes - utf8ByteLength(json) - 1) + 'ç';
    expect(parseWorkflowJSON(withTurkishPadding)).toEqual({
      success: false,
      issues: [{ code: 'GRAPH_LIMIT_EXCEEDED', severity: 'error' }],
    });
  });
});

describe('typed input definitions', () => {
  const common = { key: 'value', label: 'Value', required: false };
  it.each([
    { type: 'number', defaultValue: 0, validation: { min: 0, max: 10 } },
    { type: 'string', defaultValue: '', validation: { minLength: 0, maxLength: 10 } },
    { type: 'boolean', defaultValue: false },
    {
      type: 'date',
      defaultValue: '2024-02-29',
      validation: { min: '2024-01-01', max: '2024-12-31' },
    },
    { type: 'enum', options: ['A', 'B'], defaultValue: 'A' },
    { type: 'number' },
    { type: 'string', required: true },
  ])('accepts typed definitions %j', (field) => {
    expect(inputFieldSchema.safeParse({ ...common, ...field }).success).toBe(true);
  });

  it.each([
    { type: 'number', defaultValue: '12' },
    { type: 'number', defaultValue: NaN },
    { type: 'number', defaultValue: Infinity },
    { type: 'number', defaultValue: null },
    { type: 'number', defaultValue: 2, validation: { min: 3 } },
    { type: 'number', validation: { min: 5, max: 2 } },
    { type: 'number', options: ['no'] },
    { type: 'string', defaultValue: true },
    { type: 'string', defaultValue: null },
    { type: 'string', defaultValue: 'x', validation: { minLength: 2 } },
    { type: 'string', defaultValue: 'xx', validation: { maxLength: 1 } },
    { type: 'string', validation: { minLength: 5, maxLength: 2 } },
    { type: 'string', validation: { regex: '.*' } },
    { type: 'boolean', defaultValue: 1 },
    { type: 'boolean', validation: {} },
    { type: 'date', defaultValue: '2023-02-29' },
    { type: 'date', validation: { min: '2024-02-01', max: '2024-01-01' } },
    { type: 'date', defaultValue: '2024-01-01', validation: { min: '2024-02-01' } },
    { type: 'enum', options: [] },
    { type: 'enum', options: ['A', 'A'] },
    { type: 'enum', options: ['A'], defaultValue: 'a' },
    { type: 'enum', options: ['A'], defaultValue: ['A'] },
    { type: 'string', key: '__proto__' },
    { type: 'string', key: 'constructor' },
    { type: 'string', key: 'x.y' },
    { type: 'unknown' },
  ])('rejects invalid definitions %j', (field) => {
    expect(inputFieldSchema.safeParse({ ...common, ...field }).success).toBe(false);
  });

  it.each(['0001-01-01', '2000-02-29', '2024-02-29', '9999-12-31'])(
    'accepts calendar date %s',
    (date) => expect(isCalendarDate(date)).toBe(true),
  );
  it.each([
    '0000-01-01',
    '1900-02-29',
    '2100-02-29',
    '2024-04-31',
    '2024-00-01',
    '2024-13-01',
    '2024-01-00',
    '2024-1-01',
    '2024-01-01T00:00:00Z',
  ])('rejects invalid date %s', (date) => expect(isCalendarDate(date)).toBe(false));
});

describe('untrusted JSON boundary', () => {
  it.each([
    undefined,
    null,
    true,
    42,
    'text',
    { a: undefined },
    { a: BigInt(1) },
    { a: Infinity },
    new Date(),
    new Map(),
    new Set(),
  ])('rejects non-document/non-JSON input', (value) => {
    expect(parseWorkflow(value).success).toBe(false);
  });

  it('rejects malformed JSON, prototype keys and excessive depth without throwing', () => {
    expect(parseWorkflowJSON('{')).toEqual({
      success: false,
      issues: [{ code: 'INVALID_JSON', severity: 'error' }],
    });
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      const json = '{"' + key + '": {"polluted": true}}';
      expect(codes(JSON.parse(json))).toContain('INVALID_JSON');
    }
    let value: unknown = 0;
    for (let depth = 0; depth < 10000; depth++) value = { value };
    expect(codes(value)).toContain('GRAPH_LIMIT_EXCEEDED');
    expect(codes({ text: 'x'.repeat(WORKFLOW_LIMITS.bytes + 1) })).toContain(
      'GRAPH_LIMIT_EXCEEDED',
    );
    expect(codes({ values: Array(30000).fill(0) })).toContain('GRAPH_LIMIT_EXCEEDED');
  });

  it('rejects cyclic, sparse, accessor and custom-prototype inputs without invoking callbacks', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const getter = Object.defineProperty({}, 'nodes', {
      enumerable: true,
      get() {
        throw new Error('must not execute');
      },
    });
    const toJSON = {
      toJSON() {
        throw new Error('must not execute');
      },
    };
    for (const input of [
      cyclic,
      getter,
      toJSON,
      { values: new Array(5) },
      { [Symbol('x')]: 1 },
      Object.create({ nodes: [] }),
    ])
      expect(codes(input)).toContain('INVALID_JSON');
    const workflow = purchaseWorkflow();
    Object.freeze(workflow);
    Object.freeze(workflow.nodes);
    expect(parseWorkflow(workflow).success).toBe(true);
  });
});
