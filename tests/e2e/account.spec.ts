import { expect, test, type Page, type Request } from '@playwright/test';
import { fakeFirebase, PASSWORD } from './fake-firebase';
import { openTab } from './ui';

const panel = (page: Page) => page.getByRole('region', { name: 'Hesap', exact: true });

test('shows that cloud accounts are not configured on a plain deployment', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Bulut hesabı yapılandırılmadı', { exact: true })).toBeVisible();
  await expect(page.getByText('Giriş yap', { exact: true })).toHaveCount(0);
});

test('signs up, verifies email, survives reload and signs out without touching the draft', async ({
  page,
  baseURL,
}) => {
  const calls = await fakeFirebase(page);
  const apiRequests: Request[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith(`${baseURL}/`)) apiRequests.push(request);
  });
  await page.goto('/');
  await openTab(page, 'Adımlar');
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
  await openTab(page, 'Adımlar');
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
