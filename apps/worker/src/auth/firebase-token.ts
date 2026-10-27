// Firebase ID token verification with Web Crypto only (Architecture §3, API Contract §8).
// The token is never logged; callers receive a stable error code, not the reason text.

export type KeySource = (kid: string) => Promise<CryptoKey | null>;
export interface VerifierConfig {
  projectId: string;
  keys: KeySource;
  /** Current time in seconds; injected so tests and callers stay deterministic. */
  now: () => number;
}
export interface VerifiedUser {
  uid: string;
  emailVerified: boolean;
}
export type TokenErrorCode = 'UNAUTHENTICATED' | 'TOKEN_EXPIRED';
export type VerifyResult = { ok: true; user: VerifiedUser } | { ok: false; code: TokenErrorCode };

const MAX_TOKEN_LENGTH = 4096;
const decoder = new TextDecoder();

function base64UrlBytes(part: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(part)) return null;
  const base64 = part
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(part.length / 4) * 4, '=');
  try {
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function jsonPart(part: string): Record<string, unknown> | null {
  const bytes = base64UrlBytes(part);
  if (!bytes) return null;
  try {
    const value: unknown = JSON.parse(decoder.decode(bytes));
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const isTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

export async function verifyFirebaseToken(
  token: string,
  config: VerifierConfig,
): Promise<VerifyResult> {
  const fail: VerifyResult = { ok: false, code: 'UNAUTHENTICATED' };
  if (token.length > MAX_TOKEN_LENGTH) return fail;
  const parts = token.split('.');
  if (parts.length !== 3) return fail;
  const [headerPart = '', payloadPart = '', signaturePart = ''] = parts;
  const header = jsonPart(headerPart);
  const payload = jsonPart(payloadPart);
  const signature = base64UrlBytes(signaturePart);
  // Only RS256 with a known key ID; "none" and HMAC algorithms are never accepted.
  if (!header || !payload || !signature || header.alg !== 'RS256' || typeof header.kid !== 'string')
    return fail;
  const key = await config.keys(header.kid);
  if (!key) return fail;
  const signed = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed))) return fail;

  const now = config.now();
  const { aud, iss, sub, exp, iat, auth_time: authTime, email_verified: emailVerified } = payload;
  if (
    aud !== config.projectId ||
    iss !== `https://securetoken.google.com/${config.projectId}` ||
    typeof sub !== 'string' ||
    sub.length === 0 ||
    sub.length > 128 ||
    !isTime(exp) ||
    !isTime(iat) ||
    !isTime(authTime) ||
    iat > now ||
    authTime > now
  )
    return fail;
  if (exp <= now) return { ok: false, code: 'TOKEN_EXPIRED' };
  return { ok: true, user: { uid: sub, emailVerified: emailVerified === true } };
}

const GOOGLE_JWKS =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/**
 * Google's public signing keys, cached for the Cache-Control max-age of the response.
 * An unknown key ID triggers at most one refresh per minute so forged kids cannot flood Google.
 */
export function googleKeySource(
  fetcher: typeof fetch = fetch,
  now: () => number = () => Date.now() / 1000,
): KeySource {
  let keys = new Map<string, CryptoKey>();
  let expiresAt = 0;
  let lastRefresh = -Infinity;
  async function refresh() {
    lastRefresh = now();
    const response = await fetcher(GOOGLE_JWKS);
    if (!response.ok) return;
    const body = (await response.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
    const next = new Map<string, CryptoKey>();
    for (const jwk of body.keys ?? []) {
      if (typeof jwk.kid !== 'string' || jwk.kty !== 'RSA') continue;
      next.set(
        jwk.kid,
        await crypto.subtle.importKey(
          'jwk',
          jwk,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['verify'],
        ),
      );
    }
    const maxAge = Number(
      /max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1] ?? 0,
    );
    keys = next;
    expiresAt = now() + Math.min(maxAge, 6 * 60 * 60);
  }
  return async (kid) => {
    if ((now() >= expiresAt || !keys.has(kid)) && now() - lastRefresh >= 60) {
      try {
        await refresh();
      } catch {
        // Network or parse failure: keep the previous keys; verification fails closed.
      }
    }
    return keys.get(kid) ?? null;
  };
}
