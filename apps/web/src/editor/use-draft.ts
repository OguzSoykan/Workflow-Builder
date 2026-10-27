import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import type { Workflow } from '@workflow-builder/workflow-contract';
import {
  DRAFT_KEY,
  parseDraft,
  saveDraft,
  serializeDraft,
  type DraftStore,
  type LoadResult,
  type SaveResult,
} from './draft-storage';
import type { EditorAction } from './model';

export type DraftStatus = SaveResult | 'idle';

// Autosaves changed drafts and pauses when another tab writes the same key (D-08).
export function useDraft(
  store: DraftStore | null,
  load: LoadResult,
  workflow: Workflow,
  dispatch: Dispatch<EditorAction>,
) {
  const lastSaved = useRef(serializeDraft(workflow));
  const [status, setStatus] = useState<DraftStatus>(
    load.status === 'loaded' ? 'saved' : load.status === 'unavailable' ? 'unavailable' : 'idle',
  );
  // undefined: no conflict; string/null: the other tab's value (null when it was removed).
  const [conflict, setConflict] = useState<string | null | undefined>(undefined);
  const [conflictError, setConflictError] = useState(false);
  const serialized = useMemo(() => serializeDraft(workflow), [workflow]);

  useEffect(() => {
    if (conflict !== undefined || serialized === lastSaved.current) return;
    const result = saveDraft(store, serialized);
    if (result === 'saved') lastSaved.current = serialized;
    setStatus(result);
  }, [store, serialized, conflict]);

  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key !== DRAFT_KEY && event.key !== null) return;
      if (event.newValue === lastSaved.current) return;
      setConflict(event.newValue);
      setConflictError(false);
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);

  return {
    status,
    conflict: conflict !== undefined,
    conflictError,
    loadOther() {
      const other = typeof conflict === 'string' ? parseDraft(conflict) : null;
      if (!other || typeof conflict !== 'string') {
        setConflictError(true);
        return;
      }
      lastSaved.current = serializeDraft(other);
      dispatch({ type: 'replace-workflow', workflow: other });
      setConflict(undefined);
      setStatus('saved');
    },
    keepThis() {
      // Forces the next effect run to write this tab's document: last writer wins.
      lastSaved.current = '';
      setConflict(undefined);
      setConflictError(false);
    },
  };
}
