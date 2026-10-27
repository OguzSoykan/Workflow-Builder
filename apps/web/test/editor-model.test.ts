import { describe, expect, it } from 'vitest';
import {
  computeContentHash,
  parseWorkflow,
  type Workflow,
} from '@workflow-builder/workflow-contract';
import {
  applyEdit,
  connectionError,
  editorReducer,
  emptyWorkflow,
  type Edit,
  type NodeKind,
} from '../src/editor/model';

function edit(workflow: Workflow, action: Edit): Workflow {
  const result = applyEdit(workflow, action);
  expect(result.error).toBeNull();
  return result.workflow;
}
function add(workflow: Workflow, id: string, kind: NodeKind): Workflow {
  return edit(workflow, { type: 'add-node', id, kind, position: { x: 10, y: 20 } });
}
function fixture() {
  let workflow = emptyWorkflow('test');
  workflow = add(workflow, 'start', 'start');
  workflow = add(workflow, 'approval', 'approval');
  workflow = add(workflow, 'condition', 'condition');
  return add(workflow, 'end', 'end');
}

describe('editor canonical model', () => {
  it('creates all four node types as bounded, schema-valid drafts', () => {
    const workflow = fixture();
    expect(workflow.nodes.map((node) => node.type)).toEqual([
      'start',
      'approval',
      'condition',
      'end',
    ]);
    expect(parseWorkflow(workflow).success).toBe(true);
    expect(workflow.inputs).toEqual([]);
    expect(Object.keys(workflow.nodes[0] ?? {}).sort()).toEqual([
      'config',
      'id',
      'label',
      'position',
      'type',
    ]);
  });
  it('preserves identity and references on rename/move, and never mutates the caller', () => {
    const original = fixture();
    const snapshot = structuredClone(original);
    const connected = edit(original, {
      type: 'connect',
      id: 'edge',
      source: 'start',
      handle: 'next',
      target: 'end',
    });
    const renamed = edit(connected, { type: 'rename-node', id: 'end', label: 'Tamamlandı' });
    const moved = edit(renamed, { type: 'move-node', id: 'end', position: { x: 300, y: 100 } });
    expect(moved.nodes.map((node) => node.id)).toEqual(original.nodes.map((node) => node.id));
    expect(moved.edges).toEqual(connected.edges);
    expect(computeContentHash(moved)).toBe(computeContentHash(renamed));
    expect(computeContentHash(renamed)).not.toBe(computeContentHash(connected));
    expect(original).toEqual(snapshot);
  });
  it('rejects an empty label and non-finite movement without replacing the document', () => {
    const workflow = fixture();
    for (const action of [
      { type: 'rename-node', id: 'start', label: '   ' },
      { type: 'rename-node', id: 'start', label: 'x'.repeat(121) },
      { type: 'move-node', id: 'start', position: { x: Infinity, y: 0 } },
    ] satisfies Edit[]) {
      const result = applyEdit(workflow, action);
      expect(result.error).toBeTruthy();
      expect(result.workflow).toBe(workflow);
    }
  });
  it('accepts 120-character labels and discards stale derived hashes', () => {
    const workflow = { ...fixture(), contentHash: '0'.repeat(64) };
    const next = edit(workflow, { type: 'rename-node', id: 'start', label: 'x'.repeat(120) });
    expect(next.contentHash).toBeUndefined();
    expect(workflow.contentHash).toBe('0'.repeat(64));
  });
  it('rejects duplicate identities and a second Start', () => {
    const workflow = fixture();
    for (const action of [
      { type: 'add-node', id: 'end', kind: 'end', position: { x: 0, y: 0 } },
      { type: 'add-node', id: 'start2', kind: 'start', position: { x: 0, y: 0 } },
    ] satisfies Edit[])
      expect(applyEdit(workflow, action).workflow).toBe(workflow);
  });
  it('allows node 50 and rejects node 51', () => {
    let workflow = emptyWorkflow('limit');
    for (let i = 0; i < 50; i++) workflow = add(workflow, `node${i}`, 'end');
    const rejected = applyEdit(workflow, {
      type: 'add-node',
      id: 'extra',
      kind: 'end',
      position: { x: 0, y: 0 },
    });
    expect(workflow.nodes).toHaveLength(50);
    expect(rejected.workflow).toBe(workflow);
    expect(rejected.error).toContain('50');
  });
  it('removes all incident edges with a node but preserves unrelated edges', () => {
    let workflow = fixture();
    workflow = edit(workflow, {
      type: 'connect',
      id: 'in',
      source: 'start',
      handle: 'next',
      target: 'approval',
    });
    workflow = edit(workflow, {
      type: 'connect',
      id: 'out',
      source: 'approval',
      handle: 'approved',
      target: 'end',
    });
    workflow = edit(workflow, {
      type: 'connect',
      id: 'keep',
      source: 'condition',
      handle: 'true',
      target: 'end',
    });
    const next = edit(workflow, { type: 'delete-node', id: 'approval' });
    expect(next.edges.map((edge) => edge.id)).toEqual(['keep']);
    expect(workflow.edges).toHaveLength(3);
    expect(next.nodes.some((node) => node.id === 'approval')).toBe(false);
  });
  it.each([
    ['start', 'next', 'start'],
    ['end', 'next', 'approval'],
    ['approval', 'approved', 'start'],
    ['missing', 'next', 'end'],
    ['start', 'next', 'missing'],
    ['approval', 'next', 'end'],
  ])('rejects invalid connection %s/%s → %s', (source, handle, target) => {
    const workflow = fixture();
    expect(connectionError(workflow, source, handle, target)).toBeTruthy();
    expect(
      applyEdit(workflow, { type: 'connect', id: 'edge', source, handle, target }).workflow,
    ).toBe(workflow);
  });
  it('rejects duplicate source handles and indirect cycles', () => {
    let workflow = fixture();
    workflow = edit(workflow, {
      type: 'connect',
      id: 'one',
      source: 'approval',
      handle: 'approved',
      target: 'condition',
    });
    expect(connectionError(workflow, 'approval', 'approved', 'end')).toContain('zaten bağlı');
    expect(connectionError(workflow, 'condition', 'true', 'approval')).toContain('döngü');
    workflow = edit(workflow, {
      type: 'connect',
      id: 'two',
      source: 'approval',
      handle: 'rejected',
      target: 'end',
    });
    expect(workflow.edges).toHaveLength(2);
    expect(
      applyEdit(workflow, {
        type: 'connect',
        id: 'two',
        source: 'condition',
        handle: 'true',
        target: 'end',
      }).error,
    ).toContain('kimliği');
  });
  it('fails closed at the edge limit even for a structurally valid but semantically invalid input graph', () => {
    const workflow = fixture();
    workflow.edges = Array.from({ length: 100 }, (_, i) => ({
      id: `e${i}`,
      sourceNodeId: 'approval',
      sourceHandle: 'approved',
      targetNodeId: 'end',
    }));
    expect(parseWorkflow(workflow).success).toBe(true);
    expect(connectionError(workflow, 'start', 'next', 'end')).toContain('100');
  });
  it('cleans selection on deletion and keeps a rejected edit atomic', () => {
    let state = {
      workflow: fixture(),
      nodeId: 'approval',
      edgeId: null,
      error: null,
    } as Parameters<typeof editorReducer>[0];
    state = editorReducer(state, { type: 'delete-node', id: 'approval' });
    expect(state.nodeId).toBeNull();
    state = editorReducer(state, {
      type: 'connect',
      id: 'edge',
      source: 'start',
      handle: 'next',
      target: 'end',
    });
    state = editorReducer(state, { type: 'select-edge', id: 'edge' });
    state = editorReducer(state, { type: 'delete-edge', id: 'edge' });
    expect(state.edgeId).toBeNull();
    expect(state.workflow.edges).toEqual([]);
    const rejected = editorReducer(state, {
      type: 'connect',
      id: 'bad',
      source: 'start',
      handle: 'next',
      target: 'start',
    });
    expect(rejected.workflow).toBe(state.workflow);
    expect(rejected.error).toBeTruthy();
  });
});
