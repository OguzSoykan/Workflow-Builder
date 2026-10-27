import type { Page } from '@playwright/test';

const EMULATOR = 'http://127.0.0.1:9099';
export const PASSWORD = 'gizli-sifre-123';

// Synthetic Firebase: no real project or credentials are used (D-12).
export async function fakeFirebase(page: Page, options: { verified?: boolean } = {}) {
  const calls: { path: string; body: string }[] = [];
  let verified = false;
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: {
        data: { firebase: { projectId: 'demo', apiKey: 'public-key', authEmulatorUrl: EMULATOR } },
        meta: { requestId: 'r' },
      },
    }),
  );
  // Real Firebase endpoints answer cross-origin calls with CORS headers; the fake does too.
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST',
  };
  await page.route(`${EMULATOR}/**`, async (original) => {
    if (original.request().method() === 'OPTIONS')
      return original.fulfill({ status: 204, headers: cors });
    const route = {
      request: () => original.request(),
      fulfill: (options: { status?: number; json: unknown }) =>
        original.fulfill({ ...options, headers: cors }),
    };
    const url = new URL(route.request().url());
    const body = route.request().postData() ?? '';
    calls.push({ path: url.pathname, body });
    const session = (id: string) => ({
      idToken: id,
      refreshToken: 'refresh',
      localId: 'uid-1',
      expiresIn: '3600',
      email: 'ayse@example.com',
    });
    if (url.pathname.endsWith('accounts:signUp')) return route.fulfill({ json: session('id-new') });
    if (url.pathname.endsWith('accounts:signInWithPassword'))
      return JSON.parse(body).password === PASSWORD
        ? route.fulfill({ json: session('id-login') })
        : route.fulfill({ status: 400, json: { error: { message: 'INVALID_LOGIN_CREDENTIALS' } } });
    if (url.pathname.endsWith('accounts:sendOobCode')) return route.fulfill({ json: {} });
    if (url.pathname.endsWith('/token')) {
      verified = true;
      return route.fulfill({
        json: {
          id_token: 'id-verified',
          refresh_token: 'refresh-2',
          user_id: 'uid-1',
          expires_in: '3600',
        },
      });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.route('**/api/v1/me', (route) => {
    const token = route.request().headers().authorization ?? '';
    const ok = token.startsWith('Bearer id-');
    return route.fulfill({
      status: ok ? 200 : 401,
      json: ok
        ? {
            data: {
              uid: 'uid-1',
              emailVerified:
                options.verified === true || (verified && token === 'Bearer id-verified'),
              preferredLocale: 'tr',
              cloudSyncAllowed: verified,
            },
            meta: { requestId: 'r' },
          }
        : {
            error: { code: 'UNAUTHENTICATED', messageKey: 'errors.unauthenticated' },
            requestId: 'r',
          },
    });
  });
  return calls;
}
