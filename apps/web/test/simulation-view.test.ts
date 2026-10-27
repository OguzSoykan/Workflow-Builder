import { describe, expect, it } from 'vitest';
import type { InputField } from '@workflow-builder/workflow-contract';
import {
  decideApproval,
  startSimulation,
  type SimulationResult,
  type SimulationRun,
} from '@workflow-builder/workflow-core';
import {
  describeStep,
  inputIssueText,
  simulationInputsFromForm,
  visitedPath,
} from '../src/editor/simulation-view';
import { purchaseWorkflow } from '../../../tests/fixtures/purchase';

const ok = (result: SimulationResult): SimulationRun => {
  if (!result.ok) throw new Error(result.error);
  return result.run;
};
const field = (key: string, type: InputField['type'], extra = {}) =>
  ({ key, label: key, type, required: false, ...extra }) as InputField;

describe('simulation form', () => {
  it('converts typed controls and omits empty ones', () => {
    const data = new FormData();
    for (const [key, value] of [
      ['sim:n', '15000'],
      ['sim:s', 'metin'],
      ['sim:b', 'false'],
      ['sim:d', '2026-10-28'],
      ['sim:e', ''],
      ['sim:x', 'ignored'],
    ] as [string, string][])
      data.append(key, value);
    expect(
      simulationInputsFromForm(data, [
        field('n', 'number'),
        field('s', 'string'),
        field('b', 'boolean'),
        field('d', 'date'),
        field('e', 'enum', { options: ['A'] }),
        field('missing', 'string'),
      ]),
    ).toEqual({ n: 15000, s: 'metin', b: false, d: '2026-10-28' });
  });

  it('explains every input issue with the field label', () => {
    const workflow = purchaseWorkflow();
    expect(inputIssueText({ code: 'INPUT_REQUIRED', fieldKey: 'amount' }, workflow)).toContain(
      '“Tutar” için',
    );
    expect(inputIssueText({ code: 'INPUT_TYPE_INVALID', fieldKey: 'amount' }, workflow)).toContain(
      'türüne',
    );
    expect(inputIssueText({ code: 'INPUT_OUT_OF_RANGE', fieldKey: 'amount' }, workflow)).toContain(
      'sınırları',
    );
    expect(inputIssueText({ code: 'INPUT_UNKNOWN', fieldKey: 'other' }, workflow)).toBe(
      '“other” akışta tanımlı bir alan değil.',
    );
  });
});

describe('trace description and path', () => {
  it('describes each step and the visited path of an approval run', () => {
    const workflow = purchaseWorkflow();
    const waiting = ok(startSimulation(workflow, { amount: 15000 }, 'r'));
    const done = ok(decideApproval(workflow, waiting, 'rejected'));
    expect(done.trace.map((step) => describeStep(workflow, step, done))).toEqual([
      '“Başlangıç” başladı.',
      '“Tutar kontrolü”: Tutar büyüktür 10000 (değer: 15000) → Doğru.',
      '“Yönetici onayı” adımı Yönetici kararını bekliyor.',
      '“Yönetici onayı”: Reddedildi.',
      '“Reddedildi” bitişine ulaşıldı: akış reddedildi.',
    ]);
    expect(visitedPath(workflow, waiting)).toEqual({
      nodes: new Set(['start', 'threshold', 'manager']),
      edges: new Set(['e-start', 'e-large']),
    });
    expect(visitedPath(workflow, done).edges).toEqual(
      new Set(['e-start', 'e-large', 'e-rejected']),
    );
  });

  it('describes the false branch, boolean values and missing nodes', () => {
    const workflow = purchaseWorkflow();
    const small = ok(startSimulation(workflow, { amount: 5000 }, 'r'));
    expect(describeStep(workflow, small.trace[1]!, small)).toBe(
      '“Tutar kontrolü”: Tutar büyüktür 10000 (değer: 5000) → Yanlış.',
    );
    expect(describeStep(workflow, small.trace[2]!, small)).toBe(
      '“Tamamlandı” bitişine ulaşıldı: akış tamamlandı.',
    );
    const flag = { ...small, inputValues: { amount: true } };
    expect(describeStep(workflow, small.trace[1]!, flag)).toContain('(değer: Doğru)');
    const empty = { ...small, inputValues: {} };
    expect(describeStep(workflow, small.trace[1]!, empty)).toBe(
      '“Tutar kontrolü”: Tutar büyüktür 10000 → Yanlış.',
    );
    const orphan = { ...small.trace[1]!, nodeId: 'gone' };
    expect(describeStep(workflow, orphan, small)).toBe('“gone”: koşul → Yanlış.');
    expect(
      describeStep(
        workflow,
        { stepIndex: 0, nodeId: 'gone', nodeType: 'approval', action: 'await_approval' },
        small,
      ),
    ).toBe('“gone” adımı Onaylayan kararını bekliyor.');
    expect(
      describeStep(
        workflow,
        {
          stepIndex: 0,
          nodeId: 'manager',
          nodeType: 'approval',
          action: 'decide',
          decision: 'approved',
        },
        small,
      ),
    ).toBe('“Yönetici onayı”: Onaylandı.');
  });
});
