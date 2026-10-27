import { describe, expect, it } from 'vitest';
import {
  validateWorkflow,
  decideApproval,
  startSimulation,
  type ApprovalDecision,
  type SimulationRun,
} from '@workflow-builder/workflow-core';
import { EXAMPLE_LABELS, exampleWorkflow, type ExampleId } from '../src/editor/examples';

const ids = Object.keys(EXAMPLE_LABELS) as ExampleId[];
function simulate(id: ExampleId, inputs: Record<string, unknown>, decisions: ApprovalDecision[]) {
  const workflow = exampleWorkflow(id, 'test');
  const started = startSimulation(workflow, inputs, 'run');
  if (!started.ok) throw new Error(started.error);
  let run: SimulationRun = started.run;
  const waits: string[] = [];
  for (const decision of decisions) {
    waits.push(run.currentNodeId);
    const next = decideApproval(workflow, run, decision);
    if (!next.ok) throw new Error(next.error);
    run = next.run;
  }
  return { status: run.status, end: run.currentNodeId, waits };
}

describe('example workflows', () => {
  it.each(ids)('%s is executable and gets a fresh workflow ID', (id) => {
    const workflow = exampleWorkflow(id, 'fresh-id');
    expect(validateWorkflow(workflow)).toEqual({ valid: true, issues: [] });
    expect(workflow.workflowId).toBe('fresh-id');
    expect(exampleWorkflow(id, 'a')).not.toBe(exampleWorkflow(id, 'a'));
  });

  it.each([
    ['purchase', { tutar: 5000 }, [], 'completed', 'tamamlandi', []],
    ['purchase', { tutar: 15000 }, ['approved'], 'completed', 'tamamlandi', ['yonetici']],
    [
      'purchase',
      { tutar: 15000, kategori: 'Yazılım' },
      ['rejected'],
      'rejected',
      'reddedildi',
      ['yonetici'],
    ],
    [
      'leave',
      { gun: 10, izin_turu: 'Yıllık' },
      ['approved', 'approved'],
      'completed',
      'onaylandi',
      ['yonetici', 'ik'],
    ],
    [
      'leave',
      { gun: 10, izin_turu: 'Yıllık' },
      ['approved', 'rejected'],
      'rejected',
      'reddedildi',
      ['yonetici', 'ik'],
    ],
    [
      'leave',
      { gun: 3, izin_turu: 'Mazeret' },
      ['rejected'],
      'rejected',
      'reddedildi',
      ['ekip-lideri'],
    ],
    ['expense', { fatura: false, tutar: 100 }, [], 'rejected', 'reddedildi', []],
    ['expense', { fatura: true, tutar: 2499 }, [], 'completed', 'odendi', []],
    ['expense', { fatura: true, tutar: 2500 }, ['approved'], 'completed', 'odendi', ['finans']],
  ] as const)('%s %j %j → %s', (id, inputs, decisions, status, endNode, waits) => {
    expect(simulate(id, inputs, [...decisions])).toEqual({
      status,
      end: endNode,
      waits: [...waits],
    });
  });

  it('asks for required inputs before running', () => {
    expect(startSimulation(exampleWorkflow('leave', 'x'), { gun: 3 }, 'r')).toMatchObject({
      ok: false,
      error: 'INPUT_INVALID',
      inputIssues: [{ code: 'INPUT_REQUIRED', fieldKey: 'izin_turu' }],
    });
  });
});
