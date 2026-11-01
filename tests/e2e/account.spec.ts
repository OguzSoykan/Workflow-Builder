import { expect, test, type Request } from '@playwright/test';
import { fakeFirebase, PASSWORD } from './fake-firebase';
import { accountChip, authDialog, headerButton, openTab } from './ui';

test('shows that cloud accounts are not configured on a plain deployment', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Bulut hesabı yapılandırılmadı', { exact: true })).toBeVisible();
  await expect(page.getByText('Giriş yap', { exact: true })).toHaveCount(0);
});

test('guides sign-up through email verification, survives reload and signs out without touching the draft', async ({
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
  await headerButton(page, 'Kayıt ol').click();
  const dialog = authDialog(page);
  await expect(dialog.getByRole('heading', { name: 'Hesap oluştur' })).toBeVisible();
  await expect(dialog.getByRole('list', { name: 'Hesapla açılanlar' })).toContainText('AI ile');

  // Missing or invalid input is explained instead of silently disabling the button.
  const submit = dialog.getByRole('button', { name: 'Hesap oluştur', exact: true });
  await submit.click();
  await expect(dialog.getByRole('alert')).toHaveText('Geçerli bir e-posta adresi girin.');
  await dialog.getByLabel('E-posta', { exact: true }).fill('ayse@example.com');
  await dialog.getByLabel('Şifre', { exact: true }).fill('12345');
  await dialog.getByLabel('Şifre (tekrar)', { exact: true }).fill('12345');
  await submit.click();
  await expect(dialog.getByRole('alert')).toHaveText('Şifre en az 6 karakter olmalı.');
  await dialog.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await expect(dialog.getByText('Şifreler eşleşiyor.')).toBeVisible();
  await submit.click();
  await expect(dialog.getByRole('alert')).toHaveText('Şifreler eşleşmiyor.');
  // The password can be revealed while typing.
  await dialog.getByRole('button', { name: 'Göster' }).click();
  await expect(dialog.getByLabel('Şifre', { exact: true })).toHaveAttribute('type', 'text');
  expect(calls).toHaveLength(0);

  await dialog.getByLabel('Şifre (tekrar)', { exact: true }).fill(PASSWORD);
  await submit.click();
  await expect(dialog.getByRole('status')).toHaveText(
    'Hesap oluşturuldu. Doğrulama e-postası gönderildi.',
  );
  await expect(dialog.getByRole('heading', { name: 'E-postanı doğrula' })).toBeVisible();
  await expect(dialog).toContainText('ayse@example.com adresine bir doğrulama bağlantısı');
  await expect(accountChip(page)).toContainText('Doğrulanmadı');
  expect(calls.map((call) => call.path.split('/').at(-1))).toEqual([
    'accounts:signUp',
    'accounts:sendOobCode',
  ]);
  expect(JSON.parse(calls[1]!.body)).toEqual({ requestType: 'VERIFY_EMAIL', idToken: 'id-new' });

  // Resending starts a cooldown so the button cannot be spammed.
  await dialog.getByRole('button', { name: 'E-postayı tekrar gönder' }).click();
  await expect(dialog.getByRole('button', { name: /^Tekrar gönder \(\d+ sn\)$/ })).toBeDisabled();

  await dialog.getByRole('button', { name: 'Doğruladım, devam et', exact: true }).click();
  await expect(dialog).toContainText('E-posta doğrulandı; buluta kayıt açık.');
  await dialog.getByRole('button', { name: 'Devam et', exact: true }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(accountChip(page)).toBeVisible();
  await expect(accountChip(page)).not.toContainText('Doğrulanmadı');
  await accountChip(page).click();
  await expect(dialog).toContainText('E-posta doğrulandı');
  await dialog.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(headerButton(page, 'Giriş yap')).toBeVisible();
  await openTab(page, 'Adımlar');
  await expect(
    page.getByRole('list', { name: 'Akıştaki adımlar', exact: true }).getByRole('button'),
  ).toHaveCount(1);
  // The password only ever went to the Firebase endpoints, never to this app's origin.
  expect(apiRequests.some((request) => (request.postData() ?? '').includes(PASSWORD))).toBe(false);
  expect(calls.filter((call) => call.body.includes(PASSWORD))).toHaveLength(1);
  expect(await page.evaluate(() => localStorage.getItem('workflow-builder:auth:v1'))).toBeNull();
});

test('reports wrong credentials, offers a reset and then signs in', async ({ page }) => {
  const calls = await fakeFirebase(page);
  await page.goto('/');
  await headerButton(page, 'Giriş yap').click();
  const dialog = authDialog(page);
  await expect(dialog.getByRole('heading', { name: 'Giriş yap' })).toBeVisible();
  await dialog.getByLabel('E-posta', { exact: true }).fill('ayse@example.com');
  await dialog.getByLabel('Şifre', { exact: true }).fill('yanlis-sifre');
  await dialog.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('E-posta veya şifre hatalı.');

  // The error offers the next step; the email carries over to the reset screen.
  await dialog.getByRole('button', { name: 'Şifreni sıfırla', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Şifreni mi unuttun?' })).toBeVisible();
  await expect(dialog.getByLabel('E-posta', { exact: true })).toHaveValue('ayse@example.com');
  await dialog.getByRole('button', { name: 'Sıfırlama bağlantısı gönder' }).click();
  await expect(dialog.getByRole('status')).toHaveText(
    'ayse@example.com adresine bir sıfırlama bağlantısı gönderdik.',
  );
  expect(JSON.parse(calls.at(-1)!.body)).toEqual({
    requestType: 'PASSWORD_RESET',
    email: 'ayse@example.com',
  });
  await dialog.getByRole('button', { name: 'Giriş ekranına dön' }).click();
  await expect(dialog.getByLabel('E-posta', { exact: true })).toHaveValue('ayse@example.com');
  await dialog.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await dialog.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  // Not verified yet: the dialog continues with the verification steps.
  await expect(dialog.getByRole('heading', { name: 'E-postanı doğrula' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Sonra yaparım' }).click();
  await expect(dialog).toBeHidden();
  await openTab(page, 'Oluştur');
  await expect(page.getByRole('region', { name: 'AI ile oluştur' })).toContainText(
    'önce e-postanı doğrula',
  );
  await page.getByRole('button', { name: 'Doğrulama adımlarını göster' }).click();
  await expect(dialog.getByRole('heading', { name: 'E-postanı doğrula' })).toBeVisible();
});

test('points an existing email to sign-in and closes for a verified member', async ({ page }) => {
  await fakeFirebase(page, { verified: true });
  await page.route('http://127.0.0.1:9099/**/accounts:signUp*', (route) =>
    route.fulfill({
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: { error: { message: 'EMAIL_EXISTS' } },
    }),
  );
  await page.goto('/');
  // The locked AI panel leads to sign-up as well.
  await openTab(page, 'Oluştur');
  await page
    .getByRole('region', { name: 'AI ile oluştur' })
    .getByRole('button', { name: 'Kayıt ol' })
    .click();
  const dialog = authDialog(page);
  await dialog.getByLabel('E-posta', { exact: true }).fill('ayse@example.com');
  await dialog.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await dialog.getByLabel('Şifre (tekrar)', { exact: true }).fill(PASSWORD);
  await dialog.getByRole('button', { name: 'Hesap oluştur', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('zaten bir hesap var');
  await dialog.getByRole('button', { name: 'Bu e-postayla giriş yap' }).click();
  await expect(dialog.getByRole('heading', { name: 'Giriş yap' })).toBeVisible();
  await expect(dialog.getByLabel('E-posta', { exact: true })).toHaveValue('ayse@example.com');
  await dialog.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await dialog.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(accountChip(page)).toBeVisible();

  // Escape closes the dialog too.
  await accountChip(page).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
