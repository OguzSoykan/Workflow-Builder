import type { Workflow } from '@workflow-builder/workflow-contract';
import { editorReducer, type EditorAction, type EditorState } from './model';

// In-memory only (D-08): history is not persisted with the draft.
export const HISTORY_LIMIT = 50;

export type HistoryState = {
  present: EditorState;
  past: Workflow[];
  future: Workflow[];
  // Consecutive edits with the same key (one drag of one node) form a single undo step.
  coalesce: string | null;
};
export type HistoryAction =
  EditorAction | { type: 'undo' } | { type: 'redo' } | { type: 'checkpoint' };

export function initialHistory(present: EditorState): HistoryState {
  return { present, past: [], future: [], coalesce: null };
}

function restore(present: EditorState, workflow: Workflow): EditorState {
  return {
    workflow,
    nodeId: workflow.nodes.some((node) => node.id === present.nodeId) ? present.nodeId : null,
    edgeId: workflow.edges.some((edge) => edge.id === present.edgeId) ? present.edgeId : null,
    error: null,
  };
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'checkpoint':
      return { ...state, coalesce: null };
    case 'undo': {
      const target = state.past.at(-1);
      if (!target) return state;
      return {
        present: restore(state.present, target),
        past: state.past.slice(0, -1),
        future: [...state.future, state.present.workflow],
        coalesce: null,
      };
    }
    case 'redo': {
      const target = state.future.at(-1);
      if (!target) return state;
      return {
        present: restore(state.present, target),
        past: [...state.past, state.present.workflow].slice(-HISTORY_LIMIT),
        future: state.future.slice(0, -1),
        coalesce: null,
      };
    }
  }
  const present = editorReducer(state.present, action);
  // Selections, rejected edits and no-op edits (same content) add no step.
  if (
    present.workflow === state.present.workflow ||
    JSON.stringify(present.workflow) === JSON.stringify(state.present.workflow)
  )
    return {
      ...state,
      present,
      coalesce:
        action.type === 'select-node' || action.type === 'select-edge' ? null : state.coalesce,
    };
  const key = action.type === 'move-node' ? `move:${action.id}` : null;
  if (key !== null && key === state.coalesce) return { ...state, present, future: [] };
  return {
    present,
    past: [...state.past, state.present.workflow].slice(-HISTORY_LIMIT),
    future: [],
    coalesce: key,
  };
}
