import { describe, expect, it } from 'vitest';
import {
  computeContentHash,
  WORKFLOW_LIMITS,
  type InputField,
  type Workflow,
} from '@workflow-builder/workflow-contract';
import { editorReducer, emptyWorkflow } from '../src/editor/model';
import {
  conditionFromForm,
  conditionSummary,
  editCondition,
  invalidConditionIds,
  operatorsFor,
} from '../src/editor/condition-model';

const amount: InputField = { key: 'tutar', label: 'Tutar', type: 'number', required: true };
const department: InputField = {
  key: 'departman',
  label: 'Departman',
  type: 'enum',
  required: true,
  options: ['IT', 'İK', 'Finans'],
};
const note: InputField = { key: 'not', label: 'Not', type: 'string', required: false };
const urgent: InputField = { key: 'acil', label: 'Acil', type: 'boolean', required: false };
const due: InputField = { key: 'tarih', label: 'Tarih', type: 'date', required: false };

function workflow(): Workflow {
  return {
    ...emptyWorkflow('test'),
    inputs: [amount, department, note, urgent, due],
    nodes: [
      {
        id: 'condition',
        label: 'Koşul',
        type: 'condition',
        position: { x: 10, y: 20 },
        config: { fieldKey: 'alan', operator: 'eq', value: '' },
      },
      {
        id: 'approval',
        label: 'Onay',
        type: 'approval',
        position: { x: 0, y: 0 },
        config: { roleLabel: 'Yönetici' },
      },
    ],
    edges: [],
  };
}
function form(entries: [string, string][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}
const update = (current: Workflow, config: unknown, label = 'Tutar kontrolü') =>
  editCondition(current, { type: 'update-condition', id: 'condition', label, config });

describe('condition form values', () => {
  it('converts form strings to the field type', () => {
    expect(
      conditionFromForm(
        form([
          ['operator', 'gt'],
          ['value', '15000'],
        ]),
        amount,
      ),
    ).toEqual({
      fieldKey: 'tutar',
      operator: 'gt',
      value: 15000,
    });
    expect(
      (
        conditionFromForm(
          form([
            ['operator', 'eq'],
            ['value', ' '],
          ]),
          amount,
        ) as { value: number }
      ).value,
    ).toBeNaN();
    expect(
      conditionFromForm(
        form([
          ['operator', 'eq'],
          ['value', 'false'],
        ]),
        urgent,
      ),
    ).toEqual({
      fieldKey: 'acil',
      operator: 'eq',
      value: false,
    });
    expect(
      conditionFromForm(
        form([
          ['operator', 'in'],
          ['value', 'IT'],
          ['value', 'İK'],
        ]),
        department,
      ),
    ).toEqual({ fieldKey: 'departman', operator: 'in', value: ['IT', 'İK'] });
    expect(conditionFromForm(form([['operator', 'in']]), department)).toEqual({
      fieldKey: 'departman',
      operator: 'in',
      value: [],
    });
    expect(
      conditionFromForm(
        form([
          ['operator', 'eq'],
          ['value', 'IT'],
        ]),
        department,
      ),
    ).toEqual({
      fieldKey: 'departman',
      operator: 'eq',
      value: 'IT',
    });
    expect(conditionFromForm(form([]), note)).toEqual({ fieldKey: 'not', operator: '', value: '' });
  });

  it('offers only operators valid for the field type', () => {
    expect(operatorsFor(amount)).toEqual(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']);
    expect(operatorsFor(urgent)).toEqual(['eq', 'neq']);
    expect(operatorsFor(due)).toContain('before');
    expect(operatorsFor(note)).not.toContain('gt');
  });
});

describe('editCondition', () => {
  it('applies label and typed config atomically, keeping identity and position', () => {
    const before = { ...workflow(), contentHash: computeContentHash(workflow()) };
    const result = update(before, { fieldKey: 'tutar', operator: 'gt', value: 15000 });
    expect(result.error).toBeNull();
    const node = result.workflow.nodes.find((item) => item.id === 'condition');
    expect(node).toEqual({
      id: 'condition',
      label: 'Tutar kontrolü',
      type: 'condition',
      position: { x: 10, y: 20 },
      config: { fieldKey: 'tutar', operator: 'gt', value: 15000 },
    });
    expect(result.workflow.contentHash).toBeUndefined();
    expect(invalidConditionIds(result.workflow).has('condition')).toBe(false);
    expect(conditionSummary(result.workflow, node!)).toBe('Tutar büyüktür 15000');
  });

  it('accepts every field type with a compatible operator and value', () => {
    for (const config of [
      { fieldKey: 'not', operator: 'contains', value: '' },
      { fieldKey: 'acil', operator: 'neq', value: true },
      { fieldKey: 'tarih', operator: 'before', value: '2024-02-29' },
      { fieldKey: 'departman', operator: 'eq', value: 'İK' },
      { fieldKey: 'departman', operator: 'in', value: ['IT', 'Finans'] },
    ])
      expect(update(workflow(), config).error).toBeNull();
  });

  it.each([
    [{ fieldKey: 'yok', operator: 'eq', value: '' }, 'tanımlı bir giriş alanı'],
    [{ fieldKey: 'not', operator: 'gt', value: 'a' }, 'bu alan türüyle kullanılamaz'],
    [{ fieldKey: 'tutar', operator: 'eq', value: NaN }, 'bir sayı olmalıdır'],
    [{ fieldKey: 'tutar', operator: 'eq', value: '5' }, 'bir sayı olmalıdır'],
    [{ fieldKey: 'tarih', operator: 'after', value: '2026-02-30' }, 'takvim tarihi'],
    [{ fieldKey: 'acil', operator: 'eq', value: 'true' }, 'Doğru veya yanlış'],
    [{ fieldKey: 'departman', operator: 'eq', value: 'Satış' }, 'seçeneklerinden'],
    [{ fieldKey: 'departman', operator: 'in', value: [] }, 'en az bir seçenek'],
    [{ fieldKey: 'departman', operator: 'in', value: ['IT', 'IT'] }, 'seçeneklerinden'],
    [{ fieldKey: 'departman', operator: 'in', value: ['Satış'] }, 'seçeneklerinden'],
    [{ fieldKey: 'tutar', operator: 'between', value: 1 }, 'Koşul uygulanmadı'],
    [
      { fieldKey: 'not', operator: 'eq', value: 'x'.repeat(WORKFLOW_LIMITS.text + 1) },
      'uygulanmadı',
    ],
    [{ fieldKey: 'tutar', operator: 'eq', value: 1, extra: true }, 'Koşul uygulanmadı'],
    [null, 'Koşul uygulanmadı'],
  ])('rejects %j without changing the document', (config, message) => {
    const before = workflow();
    const result = update(before, config);
    expect(result.error).toContain(message);
    expect(result.workflow).toBe(before);
  });

  it('rejects blank names and non-condition targets', () => {
    const before = workflow();
    expect(update(before, { fieldKey: 'tutar', operator: 'eq', value: 1 }, ' ').error).toContain(
      'ad boş olamaz',
    );
    for (const id of ['approval', 'missing'])
      expect(
        editCondition(before, { type: 'update-condition', id, label: 'X', config: {} }).error,
      ).toBe('Düzenlenecek koşul adımı bulunamadı.');
  });

  it('keeps the selected step through the reducer and reports errors', () => {
    const state = { workflow: workflow(), nodeId: 'condition', edgeId: null, error: null };
    const applied = editorReducer(state, {
      type: 'update-condition',
      id: 'condition',
      label: 'Departman',
      config: { fieldKey: 'departman', operator: 'in', value: ['IT'] },
    });
    expect(applied).toMatchObject({ nodeId: 'condition', error: null });
    const rejected = editorReducer(applied, {
      type: 'update-condition',
      id: 'condition',
      label: 'Departman',
      config: { fieldKey: 'departman', operator: 'in', value: [] },
    });
    expect(rejected.workflow).toBe(applied.workflow);
    expect(rejected.error).toContain('en az bir seçenek');
  });
});

describe('condition summaries', () => {
  it('describes valid conditions and hides incomplete ones', () => {
    const current = workflow();
    const [condition, approval] = current.nodes;
    expect(invalidConditionIds(current)).toEqual(new Set(['condition']));
    expect(conditionSummary(current, condition!)).toBeNull();
    expect(conditionSummary(current, approval!)).toBeNull();
    const summary = (config: unknown) => {
      const next = update(current, config).workflow;
      return conditionSummary(next, next.nodes[0]!);
    };
    expect(summary({ fieldKey: 'acil', operator: 'eq', value: false })).toBe('Acil eşittir Yanlış');
    expect(summary({ fieldKey: 'acil', operator: 'neq', value: true })).toBe(
      'Acil eşit değildir Doğru',
    );
    expect(summary({ fieldKey: 'departman', operator: 'in', value: ['IT', 'İK'] })).toBe(
      'Departman şunlardan biridir IT, İK',
    );
  });
});
