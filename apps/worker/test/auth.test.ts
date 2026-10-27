import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/index';
import { googleKeySource, verifyFirebaseToken, type KeySource } from '../src/auth/firebase-token';
import { keyPair, NOW, PROJECT, signToken } from './auth-helpers';

let pair: CryptoKeyPair;
let other: CryptoKeyPair;
let keys: KeySource;
beforeAll(async () => {
  pair = await keyPair();
  other = await keyPair();
  keys = async (kid) => (kid === 'test-key' ? pair.publicKey : null);
});
const verify = (token: string) =>
  verifyFirebaseToken(token, { projectId: PROJECT, keys, now: () => NOW });

describe('Firebase ID token verification', () => {
  it('accepts a valid RS256 token and maps the subject and email state', async () => {
    expect(await verify(await signToken(pair.privateKey))).toEqual({
      ok: true,
      user: { uid: 'user-a', emailVerified: true },
    });
    expect(
      await verify(await signToken(pair.privateKey, { email_verified: 'true' })),
    ).toMatchObject({
      user: { emailVerified: false },
    });
  });

  it('reports expiry separately', async () => {
    expect(await verify(await signToken(pair.privateKey, { exp: NOW }))).toEqual({
      ok: false,
      code: 'TOKEN_EXPIRED',
    });
  });

  it.each([
    ['wrong audience', { aud: 'other-project' }, {}],
    ['wrong issuer', { iss: 'https://securetoken.google.com/other-project' }, {}],
    ['empty subject', { sub: '' }, {}],
    ['long subject', { sub: 'x'.repeat(129) }, {}],
    ['numeric subject', { sub: 42 }, {}],
    ['issued in the future', { iat: NOW + 10 }, {}],
    ['auth time in the future', { auth_time: NOW + 10 }, {}],
    ['missing auth time', { auth_time: undefined }, {}],
    ['fractional expiry', { exp: NOW + 0.5 }, {}],
    ['unknown key id', {}, { kid: 'other' }],
    ['missing key id', {}, { kid: undefined }],
    ['HS256 algorithm', {}, { alg: 'HS256' }],
    ['none algorithm', {}, { alg: 'none' }],
  ])('rejects %s', async (_, claims, header) => {
    expect(await verify(await signToken(pair.privateKey, claims, header))).toEqual({
      ok: false,
      code: 'UNAUTHENTICATED',
    });
  });

  it('rejects forged signatures and malformed tokens', async () => {
    const forged = await signToken(other.privateKey);
    const valid = await signToken(pair.privateKey);
    const [head, body] = valid.split('.');
    const tampered = `${head}.${btoa(JSON.stringify({ sub: 'user-b' })).replace(/=+$/, '')}.${valid.split('.')[2]}`;
    for (const token of [
      forged,
      tampered,
      `${head}.${body}.`,
      `${head}.${body}`,
      'a.b.c',
      '...',
      `${head}.${body}.@@@`,
      `${btoa('[]')}.${body}.${valid.split('.')[2]}`,
      'x'.repeat(5000),
    ])
      expect(await verify(token)).toEqual({ ok: false, code: 'UNAUTHENTICATED' });
  });
});

describe('Google key source', () => {
  async function jwks() {
    const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    return {
      keys: [
        { ...jwk, kid: 'test-key', alg: 'RS256' },
        { kty: 'EC', kid: 'ignored' },
        { kty: 'RSA' },
      ],
    };
  }
  it('caches keys for max-age and refreshes at most once a minute for unknown kids', async () => {
    let time = 0;
    let calls = 0;
    const body = await jwks();
    const source = googleKeySource(
      async () => {
        calls += 1;
        return new Response(JSON.stringify(body), {
          headers: { 'cache-control': 'public, max-age=300' },
        });
      },
      () => time,
    );
    expect(await source('test-key')).not.toBeNull();
    expect(await source('test-key')).not.toBeNull();
    expect(await source('unknown')).toBeNull();
    expect(calls).toBe(1);
    time = 61;
    expect(await source('unknown')).toBeNull();
    expect(calls).toBe(2);
    time = 100;
    expect(await source('test-key')).not.toBeNull();
    expect(calls).toBe(2);
    time = 400;
    await source('test-key');
    expect(calls).toBe(3);
  });

  it('fails closed on network errors and non-OK responses', async () => {
    let mode: 'throw' | 'status' = 'throw';
    const source = googleKeySource(
      async () => {
        if (mode === 'throw') throw new Error('offline');
        return new Response('no', { status: 500 });
      },
      () => 0,
    );
    expect(await source('test-key')).toBeNull();
    mode = 'status';
    const later = googleKeySource(
      async () => new Response('no', { status: 500 }),
      () => 0,
    );
    expect(await later('test-key')).toBeNull();
  });
});

describe('/api/v1/me', () => {
  const env = { FIREBASE_PROJECT_ID: PROJECT };
  const app = () => createApp({ keys, now: () => NOW });
  const me = async (headers: Record<string, string>, bindings: Record<string, string> = env) =>
    app().request('/api/v1/me', { headers }, bindings);

  it('returns the verified profile with a request ID', async () => {
    const response = await me({
      Authorization: `Bearer ${await signToken(pair.privateKey, { email_verified: false })}`,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { uid: 'user-a', emailVerified: false, preferredLocale: 'tr', cloudSyncAllowed: false },
      meta: { requestId: response.headers.get('x-request-id') },
    });
  });

  it.each([
    [{}, 'UNAUTHENTICATED'],
    [{ Authorization: 'Basic abc' }, 'UNAUTHENTICATED'],
    [{ Authorization: 'Bearer' }, 'UNAUTHENTICATED'],
    [{ Authorization: 'Bearer a b' }, 'UNAUTHENTICATED'],
  ])('rejects %j with 401', async (headers, code) => {
    const response = await me(headers);
    expect(response.status).toBe(401);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(code);
  });

  it('distinguishes expired tokens and hides details', async () => {
    const response = await me({
      Authorization: `Bearer ${await signToken(pair.privateKey, { exp: NOW - 1 })}`,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: 'TOKEN_EXPIRED', messageKey: 'errors.tokenExpired' },
      requestId: response.headers.get('x-request-id'),
    });
  });

  it('is unavailable without a configured Firebase project', async () => {
    const response = await me({ Authorization: `Bearer ${await signToken(pair.privateKey)}` }, {});
    expect(response.status).toBe(503);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      'AUTH_NOT_CONFIGURED',
    );
  });
});

describe('/api/config', () => {
  const read = async (bindings: Record<string, string>) => {
    const response = await createApp().request('/api/config', {}, bindings);
    return (await response.json()) as { data: { firebase: unknown } };
  };
  it('exposes only the public Firebase web configuration', async () => {
    expect((await read({})).data.firebase).toBeNull();
    expect((await read({ FIREBASE_PROJECT_ID: PROJECT })).data.firebase).toBeNull();
    expect(
      (await read({ FIREBASE_PROJECT_ID: PROJECT, FIREBASE_WEB_API_KEY: 'public-key' })).data
        .firebase,
    ).toEqual({
      projectId: PROJECT,
      apiKey: 'public-key',
    });
    expect(
      (
        await read({
          FIREBASE_PROJECT_ID: PROJECT,
          FIREBASE_WEB_API_KEY: 'public-key',
          FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',
        })
      ).data.firebase,
    ).toEqual({
      projectId: PROJECT,
      apiKey: 'public-key',
      authEmulatorUrl: 'http://127.0.0.1:9099',
    });
    expect(
      (
        await read({
          FIREBASE_PROJECT_ID: PROJECT,
          FIREBASE_WEB_API_KEY: 'public-key',
          FIREBASE_AUTH_EMULATOR_URL: 'https://evil.example',
        })
      ).data.firebase,
    ).toEqual({ projectId: PROJECT, apiKey: 'public-key' });
  });
});
