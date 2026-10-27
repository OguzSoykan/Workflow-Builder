import { describe, expect, it } from 'vitest';
import { emptyWorkflow } from '../src/editor/model';
import {
  HISTORY_LIMIT,
  historyReducer,
  initialHistory,
  type HistoryAction,
  type HistoryState,
} from '../src/editor/history';

const start = () =>
  initialHistory({ workflow: emptyWorkflow('test'), nodeId: null, edgeId: null, error: null });
const run = (state: HistoryState, ...actions: HistoryAction[]) =>
  actions.reduce(historyReducer, state);
const addNode = (id: string, kind: 'start' | 'end' = 'end'): HistoryAction => ({
  type: 'add-node',
  id,
  kind,
  position: { x: 0, y: 0 },
});
const ids = (state: HistoryState) => state.present.workflow.nodes.map((node) => node.id);

describe('history reducer', () => {
  it('undoes and redoes successful edits one step at a time', () => {
    const edited = run(start(), addNode('a', 'start'), addNode('b'));
    expect(ids(edited)).toEqual(['a', 'b']);
    const undone = run(edited, { type: 'undo' });
    expect(ids(undone)).toEqual(['a']);
    expect(ids(run(undone, { type: 'undo' }))).toEqual([]);
    expect(ids(run(undone, { type: 'redo' }))).toEqual(['a', 'b']);
    const branched = run(undone, addNode('c'));
    expect(branched.future).toEqual([]);
    expect(run(branched, { type: 'redo' })).toBe(branched);
    expect(run(start(), { type: 'undo' })).toEqual(start());
  });

  it('ignores selections and rejected edits', () => {
    const edited = run(start(), addNode('a', 'start'));
    const next = run(edited, { type: 'select-node', id: 'a' }, addNode('b', 'start'), {
      type: 'select-edge',
      id: null,
    });
    expect(next.past).toHaveLength(1);
    expect(next.present.workflow).toBe(edited.present.workflow);
  });

  it('merges one drag of one node into a single step', () => {
    const edited = run(start(), addNode('a', 'start'), addNode('b'));
    const move = (id: string, x: number): HistoryAction => ({
      type: 'move-node',
      id,
      position: { x, y: x },
    });
    const dragged = run(edited, { type: 'checkpoint' }, move('a', 1), move('a', 2), move('a', 3));
    expect(dragged.past).toHaveLength(3);
    const secondDrag = run(dragged, { type: 'checkpoint' }, move('a', 9));
    expect(secondDrag.past).toHaveLength(4);
    const otherNode = run(dragged, move('b', 5));
    expect(otherNode.past).toHaveLength(4);
    const undone = run(dragged, { type: 'undo' });
    expect(undone.present.workflow.nodes[0]?.position).toEqual({ x: 0, y: 0 });
    expect(run(undone, move('a', 4), move('a', 5)).past).toHaveLength(3);
  });

  it('keeps the selection only while the step exists', () => {
    const edited = run(start(), addNode('a', 'start'), addNode('b'));
    expect(edited.present.nodeId).toBe('b');
    expect(run(edited, { type: 'undo' }).present.nodeId).toBeNull();
    const selected = run(edited, { type: 'select-node', id: 'a' }, addNode('c'), {
      type: 'select-node',
      id: 'a',
    });
    expect(run(selected, { type: 'undo' }).present.nodeId).toBe('a');
    const connected = run(edited, {
      type: 'connect',
      id: 'edge',
      source: 'a',
      handle: 'next',
      target: 'b',
    });
    const withEdge = run(connected, { type: 'select-edge', id: 'edge' });
    expect(run(withEdge, { type: 'undo' }).present.edgeId).toBeNull();
    expect(run(withEdge, { type: 'undo' }, { type: 'redo' }).present.edgeId).toBeNull();
  });

  it('makes whole-document replacement undoable and bounds history', () => {
    const imported = run(start(), addNode('a', 'start'), {
      type: 'replace-workflow',
      workflow: emptyWorkflow('imported'),
    });
    expect(imported.present.workflow.workflowId).toBe('imported');
    expect(run(imported, { type: 'undo' }).present.workflow.workflowId).toBe('test');
    let state = run(start(), addNode('a', 'start'), {
      type: 'rename-node',
      id: 'none',
      label: 'x',
    });
    expect(state.past).toHaveLength(1);
    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1)
      state = run(state, { type: 'rename-node', id: 'a', label: `x${index}` });
    expect(state.past).toHaveLength(HISTORY_LIMIT);
    for (let index = 0; index < HISTORY_LIMIT; index += 1) state = run(state, { type: 'undo' });
    expect(state.present.workflow.nodes[0]?.label).toBe('x4');
    expect(state.future).toHaveLength(HISTORY_LIMIT);
    for (let index = 0; index < HISTORY_LIMIT; index += 1) state = run(state, { type: 'redo' });
    expect(state.past).toHaveLength(HISTORY_LIMIT);
  });
});
