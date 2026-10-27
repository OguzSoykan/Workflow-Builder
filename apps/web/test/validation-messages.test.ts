import { describe, expect, it } from 'vitest';
import { ISSUE_CODES, type Workflow } from '@workflow-builder/workflow-contract';
import { emptyWorkflow } from '../src/editor/model';
import {
  describeIssue,
  describeWorkflow,
  issueCountsByNode,
} from '../src/editor/validation-messages';

const node = (
  id: string,
  type: 'start' | 'approval' | 'end',
  label = id,
): Workflow['nodes'][number] =>
  type === 'start'
    ? { id, label, type, position: { x: 0, y: 0 }, config: {} }
    : type === 'approval'
      ? { id, label, type, position: { x: 0, y: 0 }, config: { roleLabel: 'Yönetici' } }
      : { id, label, type, position: { x: 0, y: 0 }, config: { outcome: 'completed' as const } };
const edge = (id: string, sourceNodeId: string, sourceHandle: string, targetNodeId: string) =>
  ({ id, sourceNodeId, sourceHandle, targetNodeId }) as Workflow['edges'][number];
const base = (nodes: Workflow['nodes'], edges: Workflow['edges'] = []): Workflow => ({
  ...emptyWorkflow('test'),
  nodes,
  edges,
});

describe('issue messages', () => {
  it('explains every issue code in Turkish with step and output names', () => {
    const workflow = base([node('a', 'approval', 'Finans onayı')]);
    for (const code of ISSUE_CODES) {
      const text = describeIssue(workflow, {
        code,
        severity: 'error',
        nodeId: 'a',
        translationParams: { handle: 'approved', count: 2 },
      });
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toContain('undefined');
    }
    expect(
      describeIssue(workflow, {
        code: 'HANDLE_MISSING',
        severity: 'error',
        nodeId: 'a',
        translationParams: { handle: 'rejected' },
      }),
    ).toBe('“Finans onayı” adımının “Reddedildi” çıkışı bağlı değil.');
    expect(
      describeIssue(workflow, {
        code: 'HANDLE_INVALID',
        severity: 'error',
        nodeId: 'gone',
        translationParams: { handle: 'other' },
      }),
    ).toBe('“Bilinmeyen” adımında bu türe ait olmayan “other” çıkışı kullanılmış.');
    expect(
      describeIssue(workflow, {
        code: 'START_COUNT_INVALID',
        severity: 'error',
        translationParams: { count: 0 },
      }),
    ).toContain('başlangıç adımı yok');
    expect(describeIssue(workflow, { code: 'SCHEMA_INVALID', severity: 'error' })).toBe(
      'Belge şemaya uymuyor (SCHEMA_INVALID).',
    );
  });
});

describe('workflow issue list', () => {
  it('is empty for an executable workflow', () => {
    const workflow = base([node('s', 'start'), node('e', 'end')], [edge('e1', 's', 'next', 'e')]);
    expect(describeWorkflow(workflow)).toEqual([]);
  });

  it('orders global issues first, follows step order and hides derived path issues', () => {
    const workflow = base(
      [node('s', 'start', 'Başla'), node('a', 'approval', 'Onay'), node('x', 'approval', 'Ayrık')],
      [edge('e1', 's', 'next', 'a')],
    );
    const issues = describeWorkflow(workflow);
    expect(issues.map((issue) => issue.text)).toEqual([
      'Akışta bitiş adımı yok; en az bir bitiş adımı ekleyin.',
      '“Başla” adımından sonraki her yol bir bitiş adımına varmıyor.',
      '“Onay” adımının “Onaylandı” çıkışı bağlı değil.',
      '“Onay” adımının “Reddedildi” çıkışı bağlı değil.',
      '“Ayrık” adımının “Onaylandı” çıkışı bağlı değil.',
      '“Ayrık” adımının “Reddedildi” çıkışı bağlı değil.',
      '“Ayrık” adımına başlangıçtan ulaşılamıyor.',
    ]);
    expect(issues[0]?.target).toBeNull();
    expect(issues[1]?.target).toEqual({ kind: 'node', id: 's' });
    expect(new Set(issues.map((issue) => issue.key)).size).toBe(issues.length);
    expect(issueCountsByNode(issues)).toEqual(
      new Map([
        ['s', 1],
        ['a', 2],
        ['x', 3],
      ]),
    );
  });

  it('targets the edge when an issue has no step', () => {
    const workflow = base(
      [node('s', 'start'), node('e', 'end')],
      [edge('e1', 's', 'next', 'e'), edge('e2', 's', 'next', 'missing')],
    );
    const dangling = describeWorkflow(workflow).find((issue) => issue.text.includes('var olmayan'));
    expect(dangling?.target).toEqual({ kind: 'edge', id: 'e2' });
  });
});
