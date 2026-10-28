import { t } from '../i18n/i18n';
// Firebase Auth over its public REST API (ADR-020). Passwords go only to Firebase, never to /api.
export interface FirebaseConfig {
  projectId: string;
  apiKey: string;
  authEmulatorUrl?: string;
}
export interface Session {
  uid: string;
  email: string;
  idToken: string;
  refreshToken: string;
  /** Epoch milliseconds when the ID token expires. */
  expiresAt: number;
}
export type AuthResult<T> = { ok: true; value: T } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  EMAIL_EXISTS: 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.',
  INVALID_LOGIN_CREDENTIALS: 'E-posta veya şifre hatalı.',
  INVALID_PASSWORD: 'E-posta veya şifre hatalı.',
  EMAIL_NOT_FOUND: 'E-posta veya şifre hatalı.',
  USER_DISABLED: 'Bu hesap devre dışı bırakılmış.',
  INVALID_EMAIL: 'Geçerli bir e-posta adresi girin.',
  MISSING_PASSWORD: 'Şifre girin.',
  WEAK_PASSWORD: 'Şifre en az 6 karakter olmalıdır.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.',
  TOKEN_EXPIRED: 'Oturumun süresi doldu. Tekrar giriş yapın.',
  INVALID_REFRESH_TOKEN: 'Oturumun süresi doldu. Tekrar giriş yapın.',
  USER_NOT_FOUND: 'Oturum geçersiz. Tekrar giriş yapın.',
  INVALID_ID_TOKEN: 'Oturum geçersiz. Tekrar giriş yapın.',
};

export function authErrorMessage(code: string): string {
  // Firebase may append details, e.g. "WEAK_PASSWORD : Password should be at least 6 characters".
  const known = MESSAGES[code.split(' ')[0] ?? ''];
  return known ? t(known) : t('Hesap işlemi tamamlanamadı. Lütfen tekrar deneyin.');
}

export class FirebaseAuthClient {
  private readonly config: FirebaseConfig;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  // Wrapped: calling window.fetch as a method of this object throws "Illegal invocation".
  constructor(
    config: FirebaseConfig,
    fetcher: typeof fetch = (input, init) => fetch(input, init),
    now: () => number = () => Date.now(),
  ) {
    this.config = config;
    this.fetcher = fetcher;
    this.now = now;
  }

  private url(service: 'identitytoolkit' | 'securetoken', path: string) {
    const host = `${service}.googleapis.com`;
    const base = this.config.authEmulatorUrl
      ? `${this.config.authEmulatorUrl}/${host}`
      : `https://${host}`;
    return `${base}/v1/${path}?key=${encodeURIComponent(this.config.apiKey)}`;
  }

  private async post(
    url: string,
    body: BodyInit,
    type: string,
  ): Promise<AuthResult<Record<string, unknown>>> {
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: 'POST',
        headers: { 'Content-Type': type },
        body,
      });
    } catch {
      return { ok: false, error: t('Firebase hizmetine ulaşılamadı. Bağlantınızı kontrol edin.') };
    }
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
      error?: { message?: string };
    };
    if (!response.ok) return { ok: false, error: authErrorMessage(json.error?.message ?? '') };
    return { ok: true, value: json };
  }

  private account(path: string, body: Record<string, unknown>) {
    return this.post(
      this.url('identitytoolkit', `accounts:${path}`),
      JSON.stringify(body),
      'application/json',
    );
  }

  private session(value: Record<string, unknown>, fallbackEmail: string): AuthResult<Session> {
    const idToken = value.idToken ?? value.id_token;
    const refreshToken = value.refreshToken ?? value.refresh_token;
    const uid = value.localId ?? value.user_id;
    const expiresIn = Number(value.expiresIn ?? value.expires_in);
    if (
      typeof idToken !== 'string' ||
      typeof refreshToken !== 'string' ||
      typeof uid !== 'string' ||
      !Number.isFinite(expiresIn)
    )
      return { ok: false, error: authErrorMessage('') };
    return {
      ok: true,
      value: {
        uid,
        email: typeof value.email === 'string' ? value.email : fallbackEmail,
        idToken,
        refreshToken,
        expiresAt: this.now() + expiresIn * 1000,
      },
    };
  }

  async signUp(email: string, password: string): Promise<AuthResult<Session>> {
    const result = await this.account('signUp', { email, password, returnSecureToken: true });
    return result.ok ? this.session(result.value, email) : result;
  }

  async signIn(email: string, password: string): Promise<AuthResult<Session>> {
    const result = await this.account('signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    });
    return result.ok ? this.session(result.value, email) : result;
  }

  async sendVerification(idToken: string): Promise<AuthResult<null>> {
    const result = await this.account('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken });
    return result.ok ? { ok: true, value: null } : result;
  }

  async sendPasswordReset(email: string): Promise<AuthResult<null>> {
    const result = await this.account('sendOobCode', { requestType: 'PASSWORD_RESET', email });
    return result.ok ? { ok: true, value: null } : result;
  }

  /** Exchanges the refresh token; a new ID token also carries a fresh email_verified claim. */
  async refresh(session: Session): Promise<AuthResult<Session>> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    });
    const result = await this.post(
      this.url('securetoken', 'token'),
      body,
      'application/x-www-form-urlencoded',
    );
    return result.ok ? this.session(result.value, session.email) : result;
  }
}

const SESSION_KEY = 'workflow-builder:auth:v1';

export function loadSession(store: Pick<Storage, 'getItem'> | null): Session | null {
  try {
    const value: unknown = JSON.parse(store?.getItem(SESSION_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const session = value as Record<string, unknown>;
    return ['uid', 'email', 'idToken', 'refreshToken'].every(
      (key) => typeof session[key] === 'string',
    ) && typeof session.expiresAt === 'number'
      ? (value as Session)
      : null;
  } catch {
    return null;
  }
}

export function saveSession(
  store: Pick<Storage, 'setItem' | 'removeItem'> | null,
  session: Session | null,
) {
  try {
    if (session) store?.setItem(SESSION_KEY, JSON.stringify(session));
    else store?.removeItem(SESSION_KEY);
  } catch {
    // Storage may be unavailable; the session then lasts only for this page.
  }
}

/** Returns a usable ID token, refreshing it within five minutes of expiry. */
export async function freshSession(client: FirebaseAuthClient, session: Session, now = Date.now()) {
  return session.expiresAt - now > 5 * 60 * 1000
    ? ({ ok: true, value: session } as const)
    : client.refresh(session);
}
