import { describe, expect, it } from 'vitest';
import { BudgetLedger } from '../src/ai/budget-ledger';
import { sqliteStore } from './sqlite-store';

const STOP = 4_500_000;
const ledger = (dailyLimit = 1) =>
  new BudgetLedger(sqliteStore(), { stopAtMicros: STOP, dailyLimit });
const reserve = (
  target: BudgetLedger,
  requestId: string,
  maxMicros: number,
  subject = 'u1',
  day = '2026-10-28',
) => target.reserve({ requestId, subject, day, maxMicros });

describe('budget ledger', () => {
  it('reserves, settles the real cost and releases the difference', () => {
    const target = ledger();
    expect(reserve(target, 'r1', 30_000)).toEqual({ ok: true, replay: false, state: 'reserved' });
    expect(target.totals()).toEqual({
      committedMicros: 0,
      outstandingMicros: 30_000,
      remainingMicros: STOP - 30_000,
    });
    expect(target.settle('r1', { kind: 'billed', actualMicros: 12_345 })).toBe('settled');
    expect(target.totals()).toEqual({
      committedMicros: 12_345,
      outstandingMicros: 0,
      remainingMicros: STOP - 12_345,
    });
    expect(target.settle('r1', { kind: 'unknown' })).toBe('settled');
    expect(target.settle('missing', { kind: 'unknown' })).toBeNull();
  });

  it('never lets committed + outstanding exceed 4,50 USD and refuses at the exact threshold', () => {
    const target = ledger(1000);
    let accepted = 0;
    for (let index = 0; index < 200; index += 1)
      if (reserve(target, `r${index}`, 40_000).ok) accepted += 1;
    expect(accepted).toBe(112);
    const { committedMicros, outstandingMicros } = target.totals();
    expect(committedMicros + outstandingMicros).toBe(4_480_000);
    expect(reserve(target, 'over', 20_001)).toEqual({ ok: false, code: 'AI_BUDGET_EXHAUSTED' });
    expect(reserve(target, 'exact', 20_000).ok).toBe(true);
    expect(target.totals().remainingMicros).toBe(0);
    expect(reserve(target, 'any', 1)).toEqual({ ok: false, code: 'AI_BUDGET_EXHAUSTED' });
  });

  it('charges the full reservation when the cost is unknown (fail-closed)', () => {
    const target = ledger(10);
    reserve(target, 'timeout', 50_000);
    expect(target.settle('timeout', { kind: 'unknown' })).toBe('charged_unknown');
    expect(target.totals()).toMatchObject({ committedMicros: 50_000, outstandingMicros: 0 });
    // Pending reservations are never released by time; they keep blocking the budget.
    reserve(target, 'pending', 4_450_000);
    expect(reserve(target, 'next', 1)).toEqual({ ok: false, code: 'AI_BUDGET_EXHAUSTED' });
  });

  it('refunds budget and quota only when the provider certainly did not bill', () => {
    const target = ledger(1);
    reserve(target, 'r1', 60_000);
    expect(reserve(target, 'r2', 60_000)).toEqual({ ok: false, code: 'AI_DAILY_QUOTA_REACHED' });
    expect(target.settle('r1', { kind: 'not_billed' })).toBe('released');
    expect(target.totals()).toMatchObject({ committedMicros: 0, outstandingMicros: 0 });
    expect(target.used('u1', '2026-10-28')).toBe(0);
    expect(reserve(target, 'r2', 60_000).ok).toBe(true);
  });

  it('limits each member per UTC day independently', () => {
    const target = ledger(1);
    expect(reserve(target, 'a', 1_000, 'u1', '2026-10-28').ok).toBe(true);
    expect(reserve(target, 'b', 1_000, 'u1', '2026-10-28')).toEqual({
      ok: false,
      code: 'AI_DAILY_QUOTA_REACHED',
    });
    expect(reserve(target, 'c', 1_000, 'u2', '2026-10-28').ok).toBe(true);
    expect(reserve(target, 'd', 1_000, 'u1', '2026-10-29').ok).toBe(true);
    // A billed or unknown call keeps the quota consumed.
    target.settle('a', { kind: 'billed', actualMicros: 500 });
    expect(target.used('u1', '2026-10-28')).toBe(1);
  });

  it('replays an existing request without a new reservation and rejects cross-subject reuse', () => {
    const target = ledger(5);
    reserve(target, 'same', 10_000);
    expect(reserve(target, 'same', 10_000)).toEqual({ ok: true, replay: true, state: 'reserved' });
    expect(target.totals().outstandingMicros).toBe(10_000);
    expect(target.used('u1', '2026-10-28')).toBe(1);
    expect(reserve(target, 'same', 10_000, 'other')).toEqual({
      ok: false,
      code: 'IDEMPOTENCY_CONFLICT',
    });
    target.settle('same', { kind: 'billed', actualMicros: 9_000 });
    expect(reserve(target, 'same', 10_000)).toEqual({ ok: true, replay: true, state: 'settled' });
  });

  it('records a cost above the estimate truthfully and rejects invalid amounts', () => {
    const target = ledger(5);
    reserve(target, 'r', 10_000);
    target.settle('r', { kind: 'billed', actualMicros: 15_000 });
    expect(target.totals().committedMicros).toBe(15_000);
    expect(() => reserve(target, 'zero', 0)).toThrow();
    expect(() => reserve(target, 'frac', 1.5)).toThrow();
    reserve(target, 'r2', 1_000);
    expect(() => target.settle('r2', { kind: 'billed', actualMicros: -1 })).toThrow();
  });

  it('keeps state in the store across ledger instances', () => {
    const store = sqliteStore();
    const first = new BudgetLedger(store, { stopAtMicros: STOP, dailyLimit: 1 });
    first.reserve({ requestId: 'r', subject: 'u', day: 'd', maxMicros: 5 });
    const second = new BudgetLedger(store, { stopAtMicros: STOP, dailyLimit: 1 });
    expect(second.totals().outstandingMicros).toBe(5);
    expect(second.reserve({ requestId: 'r2', subject: 'u', day: 'd', maxMicros: 5 })).toEqual({
      ok: false,
      code: 'AI_DAILY_QUOTA_REACHED',
    });
  });
});

describe('stored results', () => {
  it('keeps the response of a settled request for replays', () => {
    const target = ledger(5);
    reserve(target, 'r', 1_000);
    expect(target.result('r')).toBeNull();
    target.settle('r', { kind: 'billed', actualMicros: 10 }, '{"ok":true}');
    expect(target.result('r')).toBe('{"ok":true}');
    reserve(target, 'u', 1_000);
    target.settle('u', { kind: 'unknown' }, '{"partial":true}');
    expect(target.result('u')).toBe('{"partial":true}');
    expect(target.result('missing')).toBeNull();
  });
});
