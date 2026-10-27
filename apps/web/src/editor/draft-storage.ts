import { parseWorkflowJSON, type Workflow } from '@workflow-builder/workflow-contract';

// D-03/D-08: one schema-valid draft per browser profile; semantic gaps are allowed.
export const DRAFT_KEY = 'workflow-builder:draft:v1';
export const CORRUPT_KEY = 'workflow-builder:draft:v1:corrupt';

export type DraftStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type LoadResult =
  | { status: 'empty' }
  | { status: 'loaded'; workflow: Workflow }
  | { status: 'corrupt'; backedUp: boolean }
  | { status: 'unavailable' };
export type SaveResult = 'saved' | 'quota' | 'unavailable';

export function browserStore(): DraftStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function serializeDraft(workflow: Workflow): string {
  return JSON.stringify(workflow);
}

export function parseDraft(raw: string): Workflow | null {
  const parsed = parseWorkflowJSON(raw);
  return parsed.success ? parsed.data : null;
}

export function loadDraft(store: DraftStore | null): LoadResult {
  if (!store) return { status: 'unavailable' };
  let raw: string | null;
  try {
    raw = store.getItem(DRAFT_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'empty' };
  const workflow = parseDraft(raw);
  if (workflow) return { status: 'loaded', workflow };
  // Keep the unreadable value for manual recovery, then start from an empty draft.
  let backedUp = true;
  try {
    store.setItem(CORRUPT_KEY, raw);
  } catch {
    backedUp = false;
  }
  try {
    store.removeItem(DRAFT_KEY);
  } catch {
    // The next successful save replaces the unreadable value.
  }
  return { status: 'corrupt', backedUp };
}

export function saveDraft(store: DraftStore | null, serialized: string): SaveResult {
  if (!store) return 'unavailable';
  try {
    store.setItem(DRAFT_KEY, serialized);
    return 'saved';
  } catch (error) {
    return error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ? 'quota'
      : 'unavailable';
  }
}
