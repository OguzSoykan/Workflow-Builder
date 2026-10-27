import { describe, expect, it } from 'vitest';
import {
  computeContentHash,
  hasValidContentHash,
  WORKFLOW_LIMITS,
  type Workflow,
} from '@workflow-builder/workflow-contract';
import { emptyWorkflow } from '../src/editor/model';
import {
  exportWorkflow,
  importTooLarge,
  readImport,
  semanticIssueCount,
} from '../src/editor/transfer';

const draft: Workflow = {
  ...emptyWorkflow('workflow_test-1'),
  nodes: [{ id: 'start', label: 'Başla', type: 'start', position: { x: 0, y: 0 }, config: {} }],
};

describe('workflow export', () => {
  it('exports an incomplete draft with a valid recomputed hash', () => {
    const result = exportWorkflow({ ...draft, contentHash: '0'.repeat(64) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fileName).toBe('workflow_test-1.workflow.json');
    const exported = JSON.parse(result.text) as Workflow;
    expect(exported.contentHash).toBe(computeContentHash(draft));
    expect(hasValidContentHash(exported)).toBe(true);
    expect(semanticIssueCount(draft)).toBeGreaterThan(0);
  });

  it('reports a document that exceeds the byte limit once the hash is added', () => {
    let low = 0;
    let high = WORKFLOW_LIMITS.bytes;
    const size = (n: number) =>
      new TextEncoder().encode(JSON.stringify({ ...draft, description: 'x'.repeat(n) })).length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (size(mid) <= WORKFLOW_LIMITS.bytes) low = mid;
      else high = mid - 1;
    }
    const result = exportWorkflow({ ...draft, description: 'x'.repeat(low) });
    expect(result).toEqual({ ok: false, error: expect.stringContaining('256 KiB') });
  });
});

describe('workflow import', () => {
  it('round-trips an export and strips the derived hash', () => {
    const exported = exportWorkflow(draft);
    if (!exported.ok) throw new Error('export failed');
    const result = readImport(exported.text);
    expect(result).toEqual({
      ok: true,
      workflow: draft,
      hashMismatch: false,
      issueCount: semanticIssueCount(draft),
    });
  });

  it('accepts a hand-edited file but flags the stale hash', () => {
    const exported = exportWorkflow(draft);
    if (!exported.ok) throw new Error('export failed');
    const edited = exported.text.replace('"Başla"', '"Başlangıç"');
    const result = readImport(edited);
    expect(result).toMatchObject({ ok: true, hashMismatch: true });
    if (result.ok) expect(result.workflow.contentHash).toBeUndefined();
    expect(readImport(JSON.stringify(draft))).toMatchObject({ ok: true, hashMismatch: false });
  });

  it.each([
    ['{', 'geçerli bir JSON'],
    ['"text"', 'şemasına uymuyor'],
    [JSON.stringify({ ...draft, schemaVersion: 2 }), 'schemaVersion 1'],
    ['{"schemaVersion":2}', 'schemaVersion 1'],
    [JSON.stringify({ ...draft, nodes: [...draft.nodes, ...draft.nodes] }), 'aynı kimliği'],
    [
      JSON.stringify({
        ...draft,
        inputs: [
          { key: 'a', label: 'A', type: 'boolean', required: false },
          { key: 'a', label: 'B', type: 'boolean', required: false },
        ],
      }),
      'aynı anahtarı',
    ],
    [JSON.stringify({ ...draft, title: '' }), '(title)'],
    [JSON.stringify({ ...draft, extra: true }), 'şemasına uymuyor'],
    [' '.repeat(WORKFLOW_LIMITS.bytes + 1), 'sınırları aşıyor'],
    [JSON.stringify({ ...draft, contentHash: 'abc' }), 'şemasına uymuyor'],
  ])('rejects %#', (text, message) => {
    const result = readImport(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });

  it('checks file size before reading', () => {
    expect(importTooLarge(WORKFLOW_LIMITS.bytes)).toBe(false);
    expect(importTooLarge(WORKFLOW_LIMITS.bytes + 1)).toBe(true);
  });
});
