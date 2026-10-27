import type { D1Database } from '../../apps/worker/src/workflows/d1';

export function startD1(): Promise<{ db: D1Database; dispose: () => Promise<void> }>;
