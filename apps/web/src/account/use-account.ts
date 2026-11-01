import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FirebaseAuthClient,
  freshSession,
  loadSession,
  saveSession,
  type AuthResult,
  type FirebaseConfig,
  type Session,
} from './firebase-auth';
import { t } from '../i18n/i18n';

export interface Profile {
  uid: string;
  emailVerified: boolean;
  cloudSyncAllowed: boolean;
}
type ConfigState = { status: 'loading' } | { status: 'ready'; config: FirebaseConfig | null };

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Owns the browser session; the Worker re-verifies every token (ADR-018/020).
export function useAccount() {
  const [config, setConfig] = useState<ConfigState>({ status: 'loading' });
  const [session, setSession] = useState<Session | null>(() => loadSession(storage()));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/config')
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { data?: { firebase?: FirebaseConfig | null } } | null) => {
        if (active) setConfig({ status: 'ready', config: body?.data?.firebase ?? null });
      })
      .catch(() => active && setConfig({ status: 'ready', config: null }));
    return () => {
      active = false;
    };
  }, []);

  const client = useMemo(
    () =>
      config.status === 'ready' && config.config ? new FirebaseAuthClient(config.config) : null,
    [config],
  );

  const store = useCallback((next: Session | null) => {
    setSession(next);
    saveSession(storage(), next);
    if (!next) setProfile(null);
  }, []);

  /** A current ID token for /api calls, or null after signing the user out. */
  const token = useCallback(async (): Promise<string | null> => {
    if (!client || !session) return null;
    const result = await freshSession(client, session);
    if (!result.ok) {
      store(null);
      setMessage({ kind: 'error', text: result.error });
      return null;
    }
    if (result.value !== session) store(result.value);
    return result.value.idToken;
  }, [client, session, store]);

  const loadProfile = useCallback(
    async (idToken: string): Promise<Profile | null> => {
      const response = await fetch('/api/v1/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      }).catch(() => null);
      if (!response?.ok) {
        if (response?.status === 401) store(null);
        setMessage({ kind: 'error', text: t('Hesap bilgisi alınamadı. Tekrar giriş yapın.') });
        return null;
      }
      const body = (await response.json()) as { data: Profile };
      setProfile(body.data);
      return body.data;
    },
    [store],
  );

  useEffect(() => {
    if (!client || !session || profile) return;
    void token().then(async (idToken) => {
      if (idToken) await loadProfile(idToken);
    });
  }, [client, session, profile, token, loadProfile]);

  const clearMessage = useCallback(() => setMessage(null), []);

  /** Runs one Firebase call; resolves to whether it succeeded (errors land in `message`). */
  const run = async <T>(
    action: () => Promise<AuthResult<T>>,
    done: (value: T) => void,
  ): Promise<boolean> => {
    setBusy(true);
    setMessage(null);
    const result = await action();
    setBusy(false);
    if (result.ok) done(result.value);
    else setMessage({ kind: 'error', text: result.error });
    return result.ok;
  };

  return {
    configured: config.status === 'ready' ? config.config !== null : null,
    session,
    profile,
    busy,
    message,
    token,
    clearMessage,
    signIn: async (email: string, password: string) =>
      client ? run(() => client.signIn(email, password), store) : false,
    signUp: async (email: string, password: string) =>
      client
        ? run(
            () => client.signUp(email, password),
            (next) => {
              store(next);
              void client.sendVerification(next.idToken);
              setMessage({
                kind: 'info',
                text: t('Hesap oluşturuldu. Doğrulama e-postası gönderildi.'),
              });
            },
          )
        : false,
    sendVerification: async () =>
      client && session
        ? run(
            () => client.sendVerification(session.idToken),
            () => setMessage({ kind: 'info', text: t('Doğrulama e-postası gönderildi.') }),
          )
        : false,
    resetPassword: async (email: string) =>
      client
        ? run(
            () => client.sendPasswordReset(email),
            () =>
              setMessage({
                kind: 'info',
                text: t('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'),
              }),
          )
        : false,
    /** Forces a token refresh so a just-verified email reaches the Worker; resolves to verified. */
    refreshVerification: async () => {
      if (!client || !session) return false;
      let next: Session | null = null;
      const ok = await run(
        () => client.refresh(session),
        (value) => {
          next = value;
          store(value);
        },
      );
      if (!ok || !next) return false;
      const fresh = await loadProfile((next as Session).idToken);
      return fresh?.emailVerified === true;
    },
    signOut: () => {
      store(null);
      setMessage({ kind: 'info', text: t('Çıkış yapıldı. Yerel taslağınız bu tarayıcıda kalır.') });
    },
  };
}
export type Account = ReturnType<typeof useAccount>;
