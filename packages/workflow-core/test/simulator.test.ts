import { describe, expect, it } from 'vitest';
import {
  computeContentHash,
  type InputField,
  type Workflow,
  type WorkflowNode,
} from '@workflow-builder/workflow-contract';
import {
  decideApproval,
  evaluateCondition,
  normalizeInputs,
  startSimulation,
  type SimulationResult,
  type SimulationRun,
} from '@workflow-builder/workflow-core';
import { linearWorkflow, purchaseWorkflow } from '../../../tests/fixtures/purchase';

function run(result: SimulationResult): SimulationRun {
  if (!result.ok) throw new Error(`Simulation failed: ${result.error}`);
  return result.run;
}
const path = (simulation: SimulationRun) =>
  simulation.trace.map((step) => `${step.nodeId}:${step.action}:${step.selectedHandle ?? ''}`);

describe('purchase simulation (AC-02–04)', () => {
  it('routes 5000 through the false branch and completes without approval', () => {
    const result = run(startSimulation(purchaseWorkflow(), { amount: 5000 }, 'run-1'));
    expect(result).toEqual({
      runId: 'run-1',
      workflowContentHash: computeContentHash(purchaseWorkflow()),
      inputValues: { amount: 5000 },
      status: 'completed',
      currentNodeId: 'completed',
      outcome: 'completed',
      trace: [
        {
          stepIndex: 0,
          nodeId: 'start',
          nodeType: 'start',
          action: 'start',
          selectedHandle: 'next',
        },
        {
          stepIndex: 1,
          nodeId: 'threshold',
          nodeType: 'condition',
          action: 'evaluate',
          selectedHandle: 'false',
          outputState: { conditionResult: false },
        },
        {
          stepIndex: 2,
          nodeId: 'completed',
          nodeType: 'end',
          action: 'end',
          outputState: { outcome: 'completed' },
        },
      ],
    });
  });

  it('waits at the approval for 15000 and follows the chosen verdict', () => {
    const waiting = run(startSimulation(purchaseWorkflow(), { amount: 15000 }, 'run-2'));
    expect(waiting.status).toBe('waiting_for_approval');
    expect(waiting.currentNodeId).toBe('manager');
    expect(waiting.outcome).toBeUndefined();
    expect(path(waiting)).toEqual([
      'start:start:next',
      'threshold:evaluate:true',
      'manager:await_approval:',
    ]);

    const approved = run(decideApproval(purchaseWorkflow(), waiting, 'approved'));
    expect(approved).toMatchObject({
      status: 'completed',
      outcome: 'completed',
      currentNodeId: 'completed',
    });
    expect(path(approved).slice(3)).toEqual(['manager:decide:approved', 'completed:end:']);
    expect(approved.trace[3]).toMatchObject({ decision: 'approved', nodeType: 'approval' });

    const rejected = run(decideApproval(purchaseWorkflow(), waiting, 'rejected'));
    expect(rejected).toMatchObject({
      status: 'rejected',
      outcome: 'rejected',
      currentNodeId: 'rejected',
    });
    expect(waiting.trace).toHaveLength(3);
  });

  it('is deterministic for the same inputs and decisions', () => {
    const play = () =>
      run(
        decideApproval(
          purchaseWorkflow(),
          run(startSimulation(purchaseWorkflow(), { amount: 15000 }, 'r')),
          'rejected',
        ),
      );
    expect(JSON.stringify(play())).toBe(JSON.stringify(play()));
    // Layout does not change the content hash, so a moved node does not invalidate a run.
    const waiting = run(startSimulation(purchaseWorkflow(), { amount: 15000 }, 'r'));
    const moved = purchaseWorkflow();
    moved.nodes[0]!.position = { x: 999, y: 999 };
    expect(decideApproval(moved, waiting, 'approved').ok).toBe(true);
  });

  it('pauses at every approval of a long chain', () => {
    const chain = linearWorkflow(50);
    let current = run(startSimulation(chain, { amount: 1 }, 'chain'));
    let pauses = 0;
    while (current.status === 'waiting_for_approval') {
      pauses += 1;
      current = run(decideApproval(chain, current, 'approved'));
    }
    expect(pauses).toBe(48);
    expect(current).toMatchObject({ status: 'completed', currentNodeId: 'node-49' });
    expect(current.trace.map((step) => step.stepIndex)).toEqual(
      current.trace.map((_, index) => index),
    );
  });
});

describe('decision guards', () => {
  it('rejects a verdict for a changed workflow or a finished run', () => {
    const waiting = run(startSimulation(purchaseWorkflow(), { amount: 15000 }, 'g'));
    const changed = purchaseWorkflow();
    changed.nodes[2]!.label = 'Başka onay';
    expect(decideApproval(changed, waiting, 'approved')).toEqual({
      ok: false,
      error: 'WORKFLOW_CHANGED',
    });
    expect(decideApproval({ broken: true }, waiting, 'approved')).toEqual({
      ok: false,
      error: 'WORKFLOW_CHANGED',
    });
    const done = run(decideApproval(purchaseWorkflow(), waiting, 'approved'));
    expect(decideApproval(purchaseWorkflow(), done, 'approved')).toEqual({
      ok: false,
      error: 'NOT_WAITING',
    });
    expect(
      decideApproval(purchaseWorkflow(), { ...waiting, currentNodeId: 'start' }, 'approved'),
    ).toEqual({
      ok: false,
      error: 'NOT_WAITING',
    });
  });

  it('refuses to start an invalid workflow and reports validator issues', () => {
    const broken = purchaseWorkflow();
    broken.edges = broken.edges.filter((edge) => edge.id !== 'e-rejected');
    const result = startSimulation(broken, { amount: 1 }, 'x');
    expect(result.ok).toBe(false);
    if (!result.ok && result.error === 'WORKFLOW_INVALID')
      expect(result.issues.map((issue) => issue.code)).toContain('HANDLE_MISSING');
    expect(startSimulation('not a workflow', {}, 'x')).toMatchObject({
      ok: false,
      error: 'WORKFLOW_INVALID',
    });
  });
});

describe('input normalization (D-14)', () => {
  const field = (extra: Partial<InputField> & Pick<InputField, 'key' | 'type'>) =>
    ({ label: extra.key, required: false, ...extra }) as InputField;
  const withInputs = (inputs: InputField[], conditionKey?: string): Workflow => {
    const workflow = purchaseWorkflow();
    workflow.inputs = inputs;
    if (conditionKey) {
      const node = workflow.nodes[1] as Extract<WorkflowNode, { type: 'condition' }>;
      node.config = { fieldKey: conditionKey, operator: 'eq', value: true };
    }
    return workflow;
  };

  it('applies defaults, omits unused optional fields and asks for used or required ones', () => {
    const workflow = withInputs(
      [
        field({ key: 'flag', type: 'boolean' }),
        field({ key: 'note', type: 'string' }),
        field({ key: 'region', type: 'enum', options: ['A', 'B'], defaultValue: 'B' }),
        field({ key: 'due', type: 'date', required: true }),
      ],
      'flag',
    );
    expect(normalizeInputs(workflow, {})).toEqual({
      values: { region: 'B' },
      issues: [
        { code: 'INPUT_REQUIRED', fieldKey: 'due' },
        { code: 'INPUT_REQUIRED', fieldKey: 'flag' },
      ],
    });
    expect(normalizeInputs(workflow, { flag: false, due: '2026-10-28', region: 'A' })).toEqual({
      values: { due: '2026-10-28', flag: false, region: 'A' },
      issues: [],
    });
    expect(startSimulation(workflow, {}, 'x')).toMatchObject({ ok: false, error: 'INPUT_INVALID' });
  });

  it('rejects wrong types, out-of-range values and unknown keys', () => {
    const workflow = withInputs([
      field({ key: 'amount', type: 'number', validation: { min: 0, max: 10 } }),
      field({ key: 'name', type: 'string', validation: { minLength: 2, maxLength: 3 } }),
      field({ key: 'day', type: 'date', validation: { min: '2026-01-01', max: '2026-12-31' } }),
      field({ key: 'kind', type: 'enum', options: ['X'] }),
    ]);
    workflow.nodes[1] = {
      ...workflow.nodes[1]!,
      type: 'condition',
      config: { fieldKey: 'amount', operator: 'gt', value: 5 },
    } as WorkflowNode;
    const issues = (values: Record<string, unknown>) => normalizeInputs(workflow, values).issues;
    expect(
      issues({ amount: 11, name: 'a', day: '2025-12-31', kind: 'Y', extra: 1, __proto__x: 2 }),
    ).toEqual([
      { code: 'INPUT_UNKNOWN', fieldKey: '__proto__x' },
      { code: 'INPUT_UNKNOWN', fieldKey: 'extra' },
      { code: 'INPUT_OUT_OF_RANGE', fieldKey: 'amount' },
      { code: 'INPUT_OUT_OF_RANGE', fieldKey: 'day' },
      { code: 'INPUT_TYPE_INVALID', fieldKey: 'kind' },
      { code: 'INPUT_OUT_OF_RANGE', fieldKey: 'name' },
    ]);
    expect(issues({ amount: '5' })).toEqual([{ code: 'INPUT_TYPE_INVALID', fieldKey: 'amount' }]);
    expect(issues({ amount: Number.NaN })).toEqual([
      { code: 'INPUT_TYPE_INVALID', fieldKey: 'amount' },
    ]);
    expect(issues({ amount: 0, name: 'abc', day: '2026-12-31' })).toEqual([]);
  });
});

describe('condition operators', () => {
  const condition = (operator: string, value: unknown, fieldKey = 'v') =>
    ({
      id: 'c',
      label: 'c',
      type: 'condition',
      position: { x: 0, y: 0 },
      config: { fieldKey, operator, value },
    }) as Extract<WorkflowNode, { type: 'condition' }>;
  it.each([
    ['eq', 5, 5, true],
    ['eq', 5, 6, false],
    ['neq', 5, 6, true],
    ['gt', 10001, 10000, true],
    ['gt', 10000, 10000, false],
    ['gte', 10000, 10000, true],
    ['lt', -1, 0, true],
    ['lte', 0, 0, true],
    ['lte', 1, 0, false],
    ['contains', 'Satın alma', 'alma', true],
    ['contains', 'Satın alma', 'Alma', false],
    ['eq', 'İK', 'ik', false],
    ['before', '2026-01-31', '2026-02-01', true],
    ['after', '2026-02-01', '2026-01-31', true],
    ['after', '2026-02-01', '2026-02-01', false],
    ['in', 'B', ['A', 'B'], true],
    ['in', 'C', ['A', 'B'], false],
    ['eq', false, false, true],
    ['neq', true, false, true],
    ['gt', '5', 4, false],
    ['contains', 5, 'x', false],
    ['in', 5, ['5'], false],
  ] as const)('%s(%j, %j) = %s', (operator, actual, expected, result) => {
    expect(evaluateCondition(condition(operator, expected), { v: actual })).toBe(result);
  });
  it('is false when the value is missing', () => {
    expect(evaluateCondition(condition('neq', 1), {})).toBe(false);
  });
});
