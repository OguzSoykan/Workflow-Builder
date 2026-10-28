import { describe, expect, it } from 'vitest';
import {
  AiBudget,
  budgetClient,
  STOP_AT_MICROS,
  type DurableObjectNamespaceLike,
} from '../src/ai/budget-object';
import { sqliteStore } from './sqlite-store';

function namespace(object: AiBudget): DurableObjectNamespaceLike {
  return { idFromName: (name) => name, get: () => ({ fetch: (request) => object.fetch(request) }) };
}

describe('AiBudget Durable Object protocol', () => {
  it('reserves, settles and reports totals through the client', async () => {
    const client = budgetClient(namespace(new AiBudget({ storage: { sql: sqliteStore() } })));
    expect(
      await client.reserve({ requestId: 'r', subject: 'u', day: 'd', maxMicros: 20_000 }),
    ).toEqual({
      ok: true,
      replay: false,
      state: 'reserved',
    });
    expect(
      await client.reserve({ requestId: 'r2', subject: 'u', day: 'd', maxMicros: 20_000 }),
    ).toEqual({
      ok: false,
      code: 'AI_DAILY_QUOTA_REACHED',
    });
    expect(await client.settle('r', { kind: 'billed', actualMicros: 7_000 })).toEqual({
      state: 'settled',
    });
    expect(await client.totals()).toEqual({
      committedMicros: 7_000,
      outstandingMicros: 0,
      remainingMicros: STOP_AT_MICROS - 7_000,
    });
  });

  it('fails closed without a binding or when the object errors', async () => {
    const missing = budgetClient(undefined);
    expect(await missing.reserve({ requestId: 'r', subject: 'u', day: 'd', maxMicros: 1 })).toEqual(
      { ok: false, code: 'AI_LEDGER_UNAVAILABLE' },
    );
    expect(await missing.totals()).toBeNull();
    const broken = budgetClient({
      idFromName: () => 'x',
      get: () => ({
        fetch: async () => {
          throw new Error('down');
        },
      }),
    });
    expect(await broken.reserve({ requestId: 'r', subject: 'u', day: 'd', maxMicros: 1 })).toEqual({
      ok: false,
      code: 'AI_LEDGER_UNAVAILABLE',
    });
    const failing = budgetClient({
      idFromName: () => 'x',
      get: () => ({ fetch: async () => new Response('no', { status: 500 }) }),
    });
    expect(await failing.settle('r', { kind: 'unknown' })).toBeNull();
  });

  it('rejects malformed commands', async () => {
    const object = new AiBudget({ storage: { sql: sqliteStore() } });
    expect(
      (await object.fetch(new Request('https://x/', { method: 'POST', body: '{' }))).status,
    ).toBe(400);
    expect(
      (await object.fetch(new Request('https://x/', { method: 'POST', body: '{"op":"drop"}' })))
        .status,
    ).toBe(400);
  });
});
