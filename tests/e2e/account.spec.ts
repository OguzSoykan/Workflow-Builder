import { expect, test, type Page, type Request } from '@playwright/test';

const EMULATOR = 'http://127.0.0.1:9099';
const PASSWORD = 'gizli-sifre-123';

// Synthetic Firebase: no real project or credentials are used (D-12).
async function fakeFirebase(page: Page) {
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
              emailVerified: verified && token === 'Bearer id-verified',
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
const panel = (page: Page) => page.getByRole('region', { name: 'Hesap', exact: true });

test('shows that cloud accounts are not configured on a plain deployment', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Bulut hesabı yapılandırılmadı', { exact: true })).toBeVisible();
  await expect(page.getByText('Giriş yap', { exact: true })).toHaveCount(0);
});

test('signs up, verifies email, survives reload and signs out without touching the draft', async ({
  page,
}) => {
  const calls = await fakeFirebase(page);
  const apiRequests: Request[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('http://127.0.0.1:8787/')) apiRequests.push(request);
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Başlangıç ekle', exact: true }).click();
  await page.locator('summary', { hasText: 'Giriş yap' }).click();
  await panel(page).getByLabel('E-posta', { exact: true }).fill('ayse@example.com');
  await panel(page).getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await panel(page).getByRole('button', { name: 'Hesap oluştur', exact: true }).click();
  await expect(panel(page).getByRole('status')).toHaveText(
    'Hesap oluşturuldu. Doğrulama e-postası gönderildi.',
  );
  await expect(panel(page)).toContainText('E-postanız doğrulanmadı');
  expect(calls.map((call) => call.path.split('/').at(-1))).toEqual([
    'accounts:signUp',
    'accounts:sendOobCode',
  ]);
  expect(JSON.parse(calls[1]!.body)).toEqual({ requestType: 'VERIFY_EMAIL', idToken: 'id-new' });

  await panel(page).getByRole('button', { name: 'Doğruladım, yenile', exact: true }).click();
  await expect(panel(page)).toContainText('E-posta doğrulandı; buluta kayıt açık.');

  await page.reload();
  await expect(page.locator('summary', { hasText: 'ayse@example.com' })).toBeVisible();
  await page.locator('summary', { hasText: 'ayse@example.com' }).click();
  await expect(panel(page)).toContainText('E-posta doğrulandı');
  await panel(page).getByRole('button', { name: 'Çıkış yap', exact: true }).click();
  await expect(page.locator('summary', { hasText: 'Giriş yap' })).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Akıştaki adımlar', exact: true }).getByRole('button'),
  ).toHaveCount(1);
  // The password only ever went to the Firebase endpoints, never to this app's origin.
  expect(apiRequests.some((request) => (request.postData() ?? '').includes(PASSWORD))).toBe(false);
  expect(calls.filter((call) => call.body.includes(PASSWORD))).toHaveLength(1);
  expect(await page.evaluate(() => localStorage.getItem('workflow-builder:auth:v1'))).toBeNull();
});

test('reports wrong credentials and sends a password reset', async ({ page }) => {
  const calls = await fakeFirebase(page);
  await page.goto('/');
  await page.locator('summary', { hasText: 'Giriş yap' }).click();
  await panel(page).getByLabel('E-posta', { exact: true }).fill('ayse@example.com');
  await panel(page).getByLabel('Şifre', { exact: true }).fill('yanlis-sifre');
  await panel(page).getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(panel(page).getByRole('alert')).toHaveText('E-posta veya şifre hatalı.');
  await panel(page).getByRole('button', { name: 'Şifremi unuttum', exact: true }).click();
  await expect(panel(page).getByRole('status')).toContainText('Şifre sıfırlama bağlantısı');
  expect(JSON.parse(calls.at(-1)!.body)).toEqual({
    requestType: 'PASSWORD_RESET',
    email: 'ayse@example.com',
  });
  await panel(page).getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await panel(page).getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.locator('summary', { hasText: 'ayse@example.com' })).toBeVisible();
});
