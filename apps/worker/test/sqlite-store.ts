import { DatabaseSync } from 'node:sqlite';
import type { SqlStore, SqlValue } from '../src/ai/budget-ledger';

// Real SQLite (Node 24 built-in) behind the Durable Object SQL storage shape.
export function sqliteStore(): SqlStore {
  const db = new DatabaseSync(':memory:');
  return {
    exec<T>(query: string, ...bindings: SqlValue[]) {
      const rows = db.prepare(query).all(...bindings) as T[];
      return { toArray: () => rows };
    },
  };
}
