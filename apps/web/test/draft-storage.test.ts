import { describe, expect, it } from 'vitest';
import { WORKFLOW_LIMITS, type Workflow } from '@workflow-builder/workflow-contract';
import { editorReducer, emptyWorkflow } from '../src/editor/model';
import {
  browserStore,
  CORRUPT_KEY,
  DRAFT_KEY,
  loadDraft,
  parseDraft,
  saveDraft,
  serializeDraft,
  type DraftStore,
} from '../src/editor/draft-storage';

function memoryStore(failures: { set?: Error; get?: Error; remove?: Error } = {}) {
  const values = new Map<string, string>();
  const store: DraftStore = {
    getItem(key) {
      if (failures.get) throw failures.get;
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (failures.set) throw failures.set;
      values.set(key, value);
    },
    removeItem(key) {
      if (failures.remove) throw failures.remove;
      values.delete(key);
    },
  };
  return { store, values };
}
// Semantically incomplete (no end, dangling outputs) but schema-valid: D-03 allows it.
const draft: Workflow = {
  ...emptyWorkflow('draft'),
  nodes: [
    { id: 'start', label: 'Başla', type: 'start', position: { x: 1, y: 2 }, config: {} },
    {
      id: 'condition',
      label: 'Koşul',
      type: 'condition',
      position: { x: 3, y: 4 },
      config: { fieldKey: 'alan', operator: 'eq', value: '' },
    },
  ],
};

describe('draft storage', () => {
  it('round-trips an incomplete schema-valid draft', () => {
    const { store, values } = memoryStore();
    expect(loadDraft(store)).toEqual({ status: 'empty' });
    expect(saveDraft(store, serializeDraft(draft))).toBe('saved');
    expect(values.has(DRAFT_KEY)).toBe(true);
    expect(loadDraft(store)).toEqual({ status: 'loaded', workflow: draft });
  });

  it.each([
    ['not json', '{'],
    ['schema-invalid', JSON.stringify({ ...draft, schemaVersion: 2 })],
    ['oversized', JSON.stringify({ ...draft, description: 'x'.repeat(WORKFLOW_LIMITS.bytes) })],
  ])('backs up a %s value and starts empty', (_, raw) => {
    const { store, values } = memoryStore();
    values.set(DRAFT_KEY, raw);
    expect(loadDraft(store)).toEqual({ status: 'corrupt', backedUp: true });
    expect(values.get(CORRUPT_KEY)).toBe(raw);
    expect(values.has(DRAFT_KEY)).toBe(false);
  });

  it('reports a corrupt value even when backup and removal fail', () => {
    const quota = new DOMException('full', 'QuotaExceededError');
    const { store, values } = memoryStore({ set: quota, remove: new Error('blocked') });
    values.set(DRAFT_KEY, '[]');
    expect(loadDraft(store)).toEqual({ status: 'corrupt', backedUp: false });
    expect(values.get(DRAFT_KEY)).toBe('[]');
  });

  it('distinguishes quota from unavailable storage without throwing', () => {
    const serialized = serializeDraft(draft);
    expect(
      saveDraft(
        memoryStore({ set: new DOMException('x', 'QuotaExceededError') }).store,
        serialized,
      ),
    ).toBe('quota');
    expect(
      saveDraft(
        memoryStore({ set: new DOMException('x', 'NS_ERROR_DOM_QUOTA_REACHED') }).store,
        serialized,
      ),
    ).toBe('quota');
    expect(
      saveDraft(memoryStore({ set: new DOMException('x', 'SecurityError') }).store, serialized),
    ).toBe('unavailable');
    expect(saveDraft(memoryStore({ set: new Error('x') }).store, serialized)).toBe('unavailable');
    expect(saveDraft(null, serialized)).toBe('unavailable');
    expect(loadDraft(null)).toEqual({ status: 'unavailable' });
    expect(loadDraft(memoryStore({ get: new DOMException('x', 'SecurityError') }).store)).toEqual({
      status: 'unavailable',
    });
  });

  it('parses only valid drafts and has no browser store outside the browser', () => {
    expect(parseDraft(serializeDraft(draft))).toEqual(draft);
    expect(parseDraft('null')).toBeNull();
    expect(browserStore()).toBeNull();
  });

  it('replaces the document and clears selection through the reducer', () => {
    const state = { workflow: emptyWorkflow('other'), nodeId: 'x', edgeId: 'y', error: 'hata' };
    expect(editorReducer(state, { type: 'replace-workflow', workflow: draft })).toEqual({
      workflow: draft,
      nodeId: null,
      edgeId: null,
      error: null,
    });
  });
});
