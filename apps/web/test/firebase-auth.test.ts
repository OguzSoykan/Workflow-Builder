import { describe, expect, it } from 'vitest';
import {
  authErrorMessage,
  FirebaseAuthClient,
  freshSession,
  loadSession,
  saveSession,
  type Session,
} from '../src/account/firebase-auth';

type Call = { url: string; body: string; type: string | null };
function fakeFetch(responses: Record<string, { status?: number; body: unknown }>, calls: Call[]) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({
      url,
      body: String(init?.body),
      type: new Headers(init?.headers).get('content-type'),
    });
    const match = Object.entries(responses).find(([key]) => url.includes(key));
    if (!match) throw new Error('offline');
    return new Response(JSON.stringify(match[1].body), { status: match[1].status ?? 200 });
  }) as typeof fetch;
}
const tokens = {
  idToken: 'id-1',
  refreshToken: 'refresh-1',
  localId: 'uid-1',
  expiresIn: '3600',
  email: 'a@example.com',
};

describe('Firebase REST client', () => {
  it('signs in against Firebase only and maps the session', async () => {
    const calls: Call[] = [];
    const client = new FirebaseAuthClient(
      { projectId: 'p', apiKey: 'k y' },
      fakeFetch({ signInWithPassword: { body: tokens } }, calls),
      () => 1000,
    );
    expect(await client.signIn('a@example.com', 'secret1')).toEqual({
      ok: true,
      value: {
        uid: 'uid-1',
        email: 'a@example.com',
        idToken: 'id-1',
        refreshToken: 'refresh-1',
        expiresAt: 1000 + 3_600_000,
      },
    });
    expect(calls[0]?.url).toBe(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=k%20y',
    );
    expect(JSON.parse(calls[0]!.body)).toEqual({
      email: 'a@example.com',
      password: 'secret1',
      returnSecureToken: true,
    });
  });

  it('uses the emulator origin and form-encoded refresh', async () => {
    const calls: Call[] = [];
    const client = new FirebaseAuthClient(
      { projectId: 'p', apiKey: 'k', authEmulatorUrl: 'http://127.0.0.1:9099' },
      fakeFetch(
        {
          'securetoken.googleapis.com': {
            body: { id_token: 'id-2', refresh_token: 'r-2', user_id: 'uid-1', expires_in: '3600' },
          },
          signUp: { body: tokens },
          sendOobCode: { body: {} },
        },
        calls,
      ),
      () => 0,
    );
    const session: Session = {
      uid: 'uid-1',
      email: 'a@example.com',
      idToken: 'id-1',
      refreshToken: 'r-1',
      expiresAt: 0,
    };
    expect(await client.refresh(session)).toMatchObject({
      ok: true,
      value: { idToken: 'id-2', refreshToken: 'r-2', email: 'a@example.com' },
    });
    expect(calls[0]).toEqual({
      url: 'http://127.0.0.1:9099/securetoken.googleapis.com/v1/token?key=k',
      body: 'grant_type=refresh_token&refresh_token=r-1',
      type: 'application/x-www-form-urlencoded',
    });
    expect((await client.signUp('a@example.com', 'secret1')).ok).toBe(true);
    expect(await client.sendVerification('id-1')).toEqual({ ok: true, value: null });
    expect(await client.sendPasswordReset('a@example.com')).toEqual({ ok: true, value: null });
    expect(JSON.parse(calls.at(-1)!.body)).toEqual({
      requestType: 'PASSWORD_RESET',
      email: 'a@example.com',
    });
  });

  it('maps Firebase errors, malformed replies and network failures to Turkish messages', async () => {
    const calls: Call[] = [];
    const client = new FirebaseAuthClient(
      { projectId: 'p', apiKey: 'k' },
      fakeFetch(
        {
          signInWithPassword: {
            status: 400,
            body: { error: { message: 'INVALID_LOGIN_CREDENTIALS' } },
          },
          signUp: {
            status: 400,
            body: {
              error: { message: 'WEAK_PASSWORD : Password should be at least 6 characters' },
            },
          },
          securetoken: { body: { id_token: 'only' } },
        },
        calls,
      ),
    );
    expect(await client.signIn('a@example.com', 'x')).toEqual({
      ok: false,
      error: 'E-posta veya şifre hatalı.',
    });
    expect(await client.signUp('a@example.com', 'x')).toEqual({
      ok: false,
      error: 'Şifre en az 6 karakter olmalıdır.',
    });
    const session: Session = {
      uid: 'u',
      email: 'e',
      idToken: 'i',
      refreshToken: 'r',
      expiresAt: 0,
    };
    expect((await client.refresh(session)).ok).toBe(false);
    expect(await client.sendPasswordReset('a@example.com')).toEqual({
      ok: false,
      error: 'Firebase hizmetine ulaşılamadı. Bağlantınızı kontrol edin.',
    });
    expect(authErrorMessage('SOMETHING_NEW')).toContain('tamamlanamadı');
    expect(authErrorMessage('EMAIL_EXISTS')).toContain('zaten bir hesap');
  });
});

describe('session storage and refresh window', () => {
  it('stores, restores and clears only well-formed sessions', () => {
    const values = new Map<string, string>();
    const store = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    };
    const session: Session = {
      uid: 'u',
      email: 'e',
      idToken: 'i',
      refreshToken: 'r',
      expiresAt: 5,
    };
    saveSession(store, session);
    expect(loadSession(store)).toEqual(session);
    values.set('workflow-builder:auth:v1', '{"uid":1}');
    expect(loadSession(store)).toBeNull();
    values.set('workflow-builder:auth:v1', '{');
    expect(loadSession(store)).toBeNull();
    saveSession(store, null);
    expect(values.size).toBe(0);
    expect(loadSession(null)).toBeNull();
    const broken = {
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
    };
    expect(() => saveSession(broken, session)).not.toThrow();
  });

  it('refreshes only within five minutes of expiry', async () => {
    let refreshed = 0;
    const client = {
      refresh: async (s: Session) => {
        refreshed += 1;
        return { ok: true as const, value: { ...s, idToken: 'new' } };
      },
    } as unknown as FirebaseAuthClient;
    const session: Session = {
      uid: 'u',
      email: 'e',
      idToken: 'old',
      refreshToken: 'r',
      expiresAt: 10 * 60 * 1000,
    };
    expect(await freshSession(client, session, 0)).toEqual({ ok: true, value: session });
    expect(await freshSession(client, session, 6 * 60 * 1000)).toMatchObject({
      value: { idToken: 'new' },
    });
    expect(refreshed).toBe(1);
  });
});
