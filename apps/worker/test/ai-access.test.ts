import { beforeAll, describe, expect, it } from 'vitest';
import { createApp, type Bindings } from '../src/index';
import {
  AiBudget,
  budgetClient,
  STOP_AT_MICROS,
  type DurableObjectNamespaceLike,
} from '../src/ai/budget-object';
import { budgetState, utcDay } from '../src/ai/routes';
import type { KeySource } from '../src/auth/firebase-token';
import { keyPair, NOW, PROJECT, signToken } from './auth-helpers';
import { sqliteStore } from './sqlite-store';

let pair: CryptoKeyPair;
let keys: KeySource;
beforeAll(async () => {
  pair = await keyPair();
  keys = async (kid) => (kid === 'test-key' ? pair.publicKey : null);
});
const budget = (): DurableObjectNamespaceLike => {
  const object = new AiBudget({ storage: { sql: sqliteStore() } });
  return { idFromName: (name) => name, get: () => ({ fetch: (request) => object.fetch(request) }) };
};
async function call(
  path: string,
  env: Bindings,
  claims: Record<string, unknown> = {},
  method = 'GET',
) {
  const token = await signToken(pair.privateKey, claims);
  const response = await createApp({ keys, now: () => NOW }).request(
    path,
    { method, headers: { Authorization: `Bearer ${token}` } },
    env,
  );
  return {
    status: response.status,
    body: (await response.json()) as { data?: Record<string, unknown>; error?: { code: string } },
  };
}

describe('AI access policy', () => {
  it('reports limits for a verified member and consumes the daily request', async () => {
    const AI_BUDGET = budget();
    const env = { FIREBASE_PROJECT_ID: PROJECT, AI_ENABLED: 'true', AI_BUDGET };
    expect((await call('/api/v1/ai/limits', env)).body.data).toEqual({
      aiEnabled: true,
      memberRemaining: 1,
      budgetState: 'ok',
    });
    await budgetClient(AI_BUDGET).reserve({
      requestId: 'r',
      subject: 'user-a',
      day: utcDay(NOW),
      maxMicros: 50_000,
    });
    expect((await call('/api/v1/ai/limits', env)).body.data).toMatchObject({ memberRemaining: 0 });
    // Another member still has their own request.
    expect((await call('/api/v1/ai/limits', env, { sub: 'user-b' })).body.data).toMatchObject({
      memberRemaining: 1,
    });
  });

  it.each([
    ['AI disabled', { AI_ENABLED: 'false' }, {}],
    ['AI flag missing', {}, {}],
    ['unverified email', { AI_ENABLED: 'true' }, { email_verified: false }],
  ])('reports AI off for %s', async (_, flags, claims) => {
    const response = await call(
      '/api/v1/ai/limits',
      { FIREBASE_PROJECT_ID: PROJECT, AI_BUDGET: budget(), ...flags },
      claims,
    );
    expect(response.body.data).toEqual({
      aiEnabled: false,
      memberRemaining: 0,
      budgetState: 'unavailable',
    });
  });

  it('fails closed when the ledger is unavailable', async () => {
    const broken: DurableObjectNamespaceLike = {
      idFromName: () => 'x',
      get: () => ({
        fetch: async () => {
          throw new Error('down');
        },
      }),
    };
    for (const AI_BUDGET of [undefined, broken])
      expect(
        (
          await call('/api/v1/ai/limits', {
            FIREBASE_PROJECT_ID: PROJECT,
            AI_ENABLED: 'true',
            ...(AI_BUDGET ? { AI_BUDGET } : {}),
          })
        ).body.data,
      ).toMatchObject({
        aiEnabled: false,
        budgetState: 'unavailable',
      });
  });

  it('guards every other AI route before any work is done (then body checks apply)', async () => {
    const base = { FIREBASE_PROJECT_ID: PROJECT, AI_BUDGET: budget() };
    const path = '/api/v1/ai/workflows/generate';
    expect((await call(path, base, {}, 'POST')).body.error?.code).toBe('AI_DISABLED');
    expect(
      (await call(path, { ...base, AI_ENABLED: 'true' }, { email_verified: false }, 'POST')).body
        .error?.code,
    ).toBe('EMAIL_NOT_VERIFIED');
    expect((await call(path, { ...base, AI_ENABLED: 'true' }, {}, 'POST')).status).toBe(415);
  });

  it('maps remaining budget to a coarse state', () => {
    expect(budgetState(STOP_AT_MICROS, 50_000)).toBe('ok');
    expect(budgetState(499_999, 50_000)).toBe('low');
    expect(budgetState(49_999, 50_000)).toBe('exhausted');
    expect(utcDay(0)).toBe('1970-01-01');
  });
});
