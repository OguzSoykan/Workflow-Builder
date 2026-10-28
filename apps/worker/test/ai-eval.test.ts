import { describe, expect, it } from 'vitest';
import { EVAL_CASES, scoreCase } from '../eval/cases';
import { mockDraft, workflowFromDraft } from '../src/ai/draft';

describe('AI eval rubric', () => {
  it('has 20 unique synthetic cases', () => {
    expect(EVAL_CASES).toHaveLength(20);
    expect(new Set(EVAL_CASES.map((item) => item.id)).size).toBe(20);
    expect(EVAL_CASES.every((item) => item.prompt.length <= 2000)).toBe(true);
  });

  it('passes a valid proposal with the expected shape and explains failures', () => {
    const draft = workflowFromDraft(mockDraft('x'), 'wf', 'tr');
    if (!draft.ok) throw new Error('mock invalid');
    const purchase = EVAL_CASES.find((item) => item.id === 'purchase-threshold')!;
    expect(scoreCase(purchase, draft.workflow)).toEqual({
      id: 'purchase-threshold',
      passed: true,
      valid: true,
      reasons: [],
    });
    const leave = EVAL_CASES.find((item) => item.id === 'leave-two-step')!;
    expect(scoreCase(leave, draft.workflow)).toMatchObject({
      passed: false,
      valid: true,
      reasons: ['nodes:approval<3'],
    });
    const broken = { ...draft.workflow, edges: [] };
    expect(scoreCase(purchase, broken).reasons).toContain('issue:HANDLE_MISSING');
    expect(
      scoreCase(
        EVAL_CASES.find((item) => item.id === 'date-deadline')!,
        draft.workflow,
      ).reasons,
    ).toContain('input:date');
    expect(scoreCase(purchase, null)).toEqual({
      id: 'purchase-threshold',
      passed: false,
      valid: false,
      reasons: ['no-proposal'],
    });
  });
});
