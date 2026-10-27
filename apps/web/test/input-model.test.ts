import { describe, expect, it } from 'vitest';
import {
  computeContentHash,
  WORKFLOW_LIMITS,
  parseWorkflow,
  type InputField,
  type Workflow,
} from '@workflow-builder/workflow-contract';
import { emptyWorkflow, editorReducer } from '../src/editor/model';
import { editInput, inputReferences } from '../src/editor/input-model';
import { inputFromForm } from '../src/editor/input-draft';

const base = { key: 'alan', label: 'Alan', required: false };
function save(workflow: Workflow, field: unknown, originalKey: string | null = null) {
  return editInput(workflow, { type: 'save-input', originalKey, field });
}
function conditionWorkflow(
  field: InputField,
  value: string | number | string[] = '',
  operator: 'eq' | 'gt' | 'in' = 'eq',
): Workflow {
  return {
    ...emptyWorkflow('test'),
    inputs: [field],
    nodes: [
      {
        id: 'condition',
        label: 'Koşul',
        type: 'condition',
        position: { x: 10, y: 20 },
        config: { fieldKey: field.key, operator, value },
      },
    ],
  };
}
const fields: InputField[] = [
  { ...base, type: 'number', defaultValue: 0, validation: { min: -1, max: 1 } },
  { ...base, type: 'string', defaultValue: '', validation: { minLength: 0, maxLength: 10 } },
  { ...base, type: 'boolean', defaultValue: false },
  {
    ...base,
    type: 'date',
    defaultValue: '2024-02-29',
    validation: { min: '2024-01-01', max: '2024-12-31' },
  },
  { ...base, type: 'enum', options: ['A', 'B'], defaultValue: 'A' },
];
describe('input edits', () => {
  it.each(fields)('round-trips $type with typed defaults and bounds', (field) => {
    const workflow = emptyWorkflow('test');
    const result = save(workflow, field);
    expect(result.error).toBeNull();
    expect(result.workflow.inputs).toEqual([field]);
    expect(workflow.inputs).toEqual([]);
    const updated = save(result.workflow, { ...field, label: 'Yeni' }, field.key);
    expect(updated.error).toBeNull();
    expect(updated.workflow.inputs[0]?.label).toBe('Yeni');
    expect(
      editInput(updated.workflow, { type: 'delete-input', key: field.key }).workflow.inputs,
    ).toEqual([]);
  });
  it.each([
    { ...base, key: '__proto__', type: 'string' },
    { ...base, key: '9bad', type: 'string' },
    { ...base, key: 'x'.repeat(65), type: 'string' },
    { ...base, label: ' ', type: 'string' },
    { ...base, type: 'number', defaultValue: Infinity },
    { ...base, type: 'number', defaultValue: 2, validation: { max: 1 } },
    { ...base, type: 'number', validation: { min: 2, max: 1 } },
    { ...base, type: 'string', validation: { minLength: 1.5 } },
    { ...base, type: 'string', validation: { maxLength: 1001 } },
    { ...base, type: 'date', defaultValue: '2023-02-29' },
    { ...base, type: 'date', validation: { min: '2026-12-01', max: '2026-01-01' } },
    { ...base, type: 'boolean', defaultValue: 'false' },
    { ...base, type: 'enum', options: [] },
    { ...base, type: 'enum', options: ['A', 'A'] },
    { ...base, type: 'enum', options: ['A'], defaultValue: 'B' },
    { ...base, type: 'enum', options: Array.from({ length: 101 }, (_, i) => String(i)) },
  ])('rejects invalid field atomically: %j', (field) => {
    const workflow = emptyWorkflow('test');
    const result = save(workflow, field);
    expect(result.error).toBeTruthy();
    expect(result.workflow).toBe(workflow);
  });
  it('enforces unique keys, missing target and 30-field limit on both add and update', () => {
    const workflow = {
      ...emptyWorkflow('test'),
      inputs: Array.from({ length: 30 }, (_, i): InputField => ({
        ...base,
        key: `key${i}`,
        type: 'string',
      })),
    };
    for (const [field, originalKey] of [
      [{ ...base, type: 'string' }, null],
      [{ ...base, key: 'key0', type: 'string' }, 'key1'],
      [{ ...base, type: 'string' }, 'missing'],
    ] as const)
      expect(save(workflow, field, originalKey).workflow).toBe(workflow);
    expect(editInput(workflow, { type: 'delete-input', key: 'missing' }).error).toBeTruthy();
    const removed = editInput(workflow, { type: 'delete-input', key: 'key0' }).workflow;
    expect(save(removed, { ...base, type: 'string' }).workflow.inputs).toHaveLength(30);
    expect(save(removed, removed.inputs[0]).error).toContain('zaten');
  });
  it('renames condition references atomically without changing IDs, positions or edges', () => {
    const workflow = conditionWorkflow({ ...base, type: 'number' }, 10, 'gt');
    workflow.contentHash = computeContentHash(workflow);
    const snapshot = structuredClone(workflow);
    const result = save(workflow, { ...base, key: 'tutar', type: 'number' }, 'alan');
    expect(result.error).toBeNull();
    expect(result.workflow.nodes[0]).toEqual({
      ...workflow.nodes[0],
      config: { fieldKey: 'tutar', operator: 'gt', value: 10 },
    });
    expect(result.workflow.edges).toEqual(workflow.edges);
    expect(result.workflow.contentHash).toBeUndefined();
    expect(computeContentHash(result.workflow)).not.toBe(workflow.contentHash);
    expect(workflow).toEqual(snapshot);
    expect(inputReferences(result.workflow, 'tutar')).toHaveLength(1);
    expect(editInput(result.workflow, { type: 'delete-input', key: 'tutar' }).workflow).toBe(
      result.workflow,
    );
  });
  it('rejects incompatible type or enum changes, but permits compatible changes', () => {
    const numeric = conditionWorkflow({ ...base, type: 'number' }, 1, 'gt');
    expect(save(numeric, { ...base, type: 'string' }, 'alan').error).toContain('koşulu');
    const enumeration = conditionWorkflow(
      { ...base, type: 'enum', options: ['A', 'B'] },
      ['A', 'B'],
      'in',
    );
    expect(save(enumeration, { ...base, type: 'enum', options: ['A'] }, 'alan').workflow).toBe(
      enumeration,
    );
    expect(
      save(enumeration, { ...base, type: 'enum', options: ['A', 'B', 'C'] }, 'alan').error,
    ).toBeNull();
    const string = conditionWorkflow({ ...base, type: 'string' }, 'A');
    expect(save(string, { ...base, type: 'enum', options: ['A'] }, 'alan').error).toBeNull();
  });
  it('integrates with reducer without clearing node selection on successful or failed input edit', () => {
    const state = {
      workflow: conditionWorkflow({ ...base, type: 'string' }),
      nodeId: 'condition',
      edgeId: null,
      error: null,
    };
    const result = editorReducer(state, {
      type: 'save-input',
      originalKey: 'alan',
      field: { ...base, type: 'string', label: 'Yeni' },
    });
    expect(result.nodeId).toBe('condition');
    expect(result.error).toBeNull();
    const rejected = editorReducer(result, { type: 'delete-input', key: 'alan' });
    expect(rejected.workflow).toBe(result.workflow);
    expect(rejected.nodeId).toBe('condition');
    expect(rejected.error).toBeTruthy();
  });
  it('rechecks byte limits after expanding condition references on rename', () => {
    const workflow = conditionWorkflow({ ...base, key: 'a', type: 'string' });
    workflow.nodes = Array.from({ length: 50 }, (_, index) => ({
      id: `condition${index}`,
      type: 'condition' as const,
      label: 'Condition',
      position: { x: 0, y: 0 },
      config: { fieldKey: 'a', operator: 'eq' as const, value: '' },
    }));
    for (let index = 0; index < 29; index++)
      workflow.inputs.push({
        key: `f${index}`,
        label: 'Field',
        required: false,
        type: 'enum',
        options: Array.from({ length: 100 }, (_, option) => String(option)),
      });
    let remaining = WORKFLOW_LIMITS.bytes - 200 - JSON.stringify(workflow).length;
    for (const field of workflow.inputs)
      if (field.type === 'enum') {
        field.options = field.options.map((option) => {
          const extra = Math.min(120 - option.length, remaining);
          remaining -= extra;
          return option + 'x'.repeat(extra);
        });
      }
    expect(remaining).toBe(0);
    expect(parseWorkflow(workflow).success).toBe(true);
    const result = save(workflow, { ...base, key: 'a'.repeat(64), type: 'string' }, 'a');
    expect(result.error).toContain('belge sınırı');
    expect(result.workflow).toBe(workflow);
  });
  it('accepts exact key, label and option limits', () => {
    const result = save(emptyWorkflow('test'), {
      ...base,
      key: 'x'.repeat(64),
      label: 'x'.repeat(120),
      type: 'enum',
      options: Array.from({ length: 100 }, (_, i) => String(i).padEnd(120, 'x')),
    });
    expect(result.error).toBeNull();
    expect(parseWorkflow(result.workflow).success).toBe(true);
  });
});

describe('input form conversion', () => {
  function form(values: Record<string, string>) {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }
  it.each([
    ['number', '0', 0],
    ['boolean', 'false', false],
    ['boolean', 'true', true],
    ['string', '', ''],
    ['date', '2024-02-29', '2024-02-29'],
  ] as const)('preserves explicit %s default %s', (type, value, expected) => {
    expect(
      inputFromForm(
        form({ key: 'alan', label: 'Alan', hasDefault: 'on', defaultValue: value }),
        type,
      ),
    ).toMatchObject({ defaultValue: expected });
  });
  it('omits absent defaults and stale fields from a previous type', () => {
    expect(
      inputFromForm(
        form({
          key: 'alan',
          label: 'Alan',
          defaultValue: '5',
          min: '0',
          max: '10',
          options: 'A\nB',
        }),
        'boolean',
      ),
    ).toEqual({ ...base, type: 'boolean' });
  });
  it('parses bounds and enum lines without silently removing duplicates or empty options', () => {
    expect(inputFromForm(form({ min: '0', max: '10' }), 'string')).toMatchObject({
      validation: { minLength: 0, maxLength: 10 },
    });
    expect(inputFromForm(form({ min: '2024-01-01' }), 'date')).toMatchObject({
      validation: { min: '2024-01-01' },
    });
    expect(inputFromForm(form({ options: 'A\nA\n' }), 'enum')).toMatchObject({
      options: ['A', 'A', ''],
    });
    expect(
      save(
        emptyWorkflow('test'),
        inputFromForm(
          form({ key: 'alan', label: 'Alan', hasDefault: 'on', defaultValue: '' }),
          'number',
        ),
      ).error,
    ).toBeTruthy();
  });
});
