// Global AI budget and quota ledger (Data Model §6, D-07). Amounts are integer micro-USD.
// Every method is synchronous over the SQL store: inside a Durable Object no other request can
// interleave between the checks and the writes, so reservations are atomic.

export type SqlValue = string | number | null;
export interface SqlStore {
  exec<T = Record<string, SqlValue>>(query: string, ...bindings: SqlValue[]): { toArray(): T[] };
}
export interface LedgerConfig {
  /** No reservation may take committed + outstanding above this (4,50 USD). */
  stopAtMicros: number;
  /** AI requests per subject per UTC day. */
  dailyLimit: number;
}
export type ReserveResult =
  | { ok: true; replay: boolean; state: ReservationState }
  | { ok: false; code: 'AI_BUDGET_EXHAUSTED' | 'AI_DAILY_QUOTA_REACHED' | 'IDEMPOTENCY_CONFLICT' };
export type ReservationState = 'reserved' | 'settled' | 'charged_unknown' | 'released';
export type Settlement =
  | { kind: 'billed'; actualMicros: number }
  | { kind: 'unknown' }
  /** The provider certainly did not bill (request never sent, or rejected before generation). */
  | { kind: 'not_billed' };

const isMicros = (value: number) => Number.isSafeInteger(value) && value >= 0;

export class BudgetLedger {
  private readonly sql: SqlStore;
  private readonly config: LedgerConfig;
  constructor(sql: SqlStore, config: LedgerConfig) {
    this.sql = sql;
    this.config = config;
    sql.exec(
      `CREATE TABLE IF NOT EXISTS reservations (
        request_id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        day TEXT NOT NULL,
        reserved INTEGER NOT NULL CHECK (reserved >= 0),
        actual INTEGER,
        state TEXT NOT NULL CHECK (state IN ('reserved', 'settled', 'charged_unknown', 'released')),
        result TEXT
      )`,
    );
    sql.exec(
      `CREATE TABLE IF NOT EXISTS quotas (
        day TEXT NOT NULL,
        subject TEXT NOT NULL,
        used INTEGER NOT NULL CHECK (used >= 0),
        PRIMARY KEY (day, subject)
      )`,
    );
  }

  /** committed: billed or unknown (charged at the full reservation); outstanding: still pending. */
  totals() {
    const [row] = this.sql
      .exec<{ committed: number | null; outstanding: number | null }>(
        `SELECT
          SUM(CASE WHEN state IN ('settled', 'charged_unknown') THEN actual ELSE 0 END) AS committed,
          SUM(CASE WHEN state = 'reserved' THEN reserved ELSE 0 END) AS outstanding
        FROM reservations`,
      )
      .toArray();
    const committed = row?.committed ?? 0;
    const outstanding = row?.outstanding ?? 0;
    return {
      committedMicros: committed,
      outstandingMicros: outstanding,
      remainingMicros: Math.max(0, this.config.stopAtMicros - committed - outstanding),
    };
  }

  used(subject: string, day: string): number {
    const [row] = this.sql
      .exec<{ used: number }>('SELECT used FROM quotas WHERE day = ? AND subject = ?', day, subject)
      .toArray();
    return row?.used ?? 0;
  }

  reserve(request: {
    requestId: string;
    subject: string;
    day: string;
    maxMicros: number;
  }): ReserveResult {
    if (!isMicros(request.maxMicros) || request.maxMicros === 0)
      throw new Error('Invalid reservation amount');
    const [existing] = this.sql
      .exec<{ subject: string; state: ReservationState }>(
        'SELECT subject, state FROM reservations WHERE request_id = ?',
        request.requestId,
      )
      .toArray();
    // A replayed request never reserves or calls the provider again.
    if (existing)
      return existing.subject === request.subject
        ? { ok: true, replay: true, state: existing.state }
        : { ok: false, code: 'IDEMPOTENCY_CONFLICT' };
    if (this.used(request.subject, request.day) >= this.config.dailyLimit)
      return { ok: false, code: 'AI_DAILY_QUOTA_REACHED' };
    const { committedMicros, outstandingMicros } = this.totals();
    if (committedMicros + outstandingMicros + request.maxMicros > this.config.stopAtMicros)
      return { ok: false, code: 'AI_BUDGET_EXHAUSTED' };
    this.sql.exec(
      "INSERT INTO reservations (request_id, subject, day, reserved, state) VALUES (?, ?, ?, ?, 'reserved')",
      request.requestId,
      request.subject,
      request.day,
      request.maxMicros,
    );
    this.sql.exec(
      'INSERT INTO quotas (day, subject, used) VALUES (?, ?, 1) ON CONFLICT (day, subject) DO UPDATE SET used = used + 1',
      request.day,
      request.subject,
    );
    return { ok: true, replay: false, state: 'reserved' };
  }

  /** The stored response of a settled request, replayed instead of calling the provider again. */
  result(requestId: string): string | null {
    const [row] = this.sql
      .exec<{ result: string | null }>(
        'SELECT result FROM reservations WHERE request_id = ?',
        requestId,
      )
      .toArray();
    return row?.result ?? null;
  }

  /** Settles a pending reservation once; later calls return the recorded state unchanged. */
  settle(
    requestId: string,
    settlement: Settlement,
    result: string | null = null,
  ): ReservationState | null {
    const [row] = this.sql
      .exec<{ subject: string; day: string; reserved: number; state: ReservationState }>(
        'SELECT subject, day, reserved, state FROM reservations WHERE request_id = ?',
        requestId,
      )
      .toArray();
    if (!row) return null;
    if (row.state !== 'reserved') return row.state;
    switch (settlement.kind) {
      case 'billed':
        if (!isMicros(settlement.actualMicros)) throw new Error('Invalid billed amount');
        // The real cost is recorded even above the estimate; the stop check then sees it.
        this.sql.exec(
          "UPDATE reservations SET actual = ?, state = 'settled', result = ? WHERE request_id = ?",
          settlement.actualMicros,
          result,
          requestId,
        );
        return 'settled';
      case 'unknown':
        this.sql.exec(
          "UPDATE reservations SET actual = reserved, state = 'charged_unknown', result = ? WHERE request_id = ?",
          result,
          requestId,
        );
        return 'charged_unknown';
      case 'not_billed':
        this.sql.exec(
          "UPDATE reservations SET actual = 0, state = 'released' WHERE request_id = ?",
          requestId,
        );
        this.sql.exec(
          'UPDATE quotas SET used = MAX(used - 1, 0) WHERE day = ? AND subject = ?',
          row.day,
          row.subject,
        );
        return 'released';
    }
  }
}
