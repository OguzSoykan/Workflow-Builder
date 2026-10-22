import { expect, test } from '@playwright/test';

test('built SPA calls same-origin Worker health', async ({ page }) => {
  const api = page.waitForResponse((response) => response.url().endsWith('/api/health'));
  await page.goto('/');
  expect((await api).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Geliştirme temeli' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Servis hazır');
});

test('connection failure can be retried with the keyboard', async ({ page }) => {
  await page.route('**/api/health', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Servise ulaşılamadı');
  await page.unroute('**/api/health');
  const retry = page.getByRole('button', { name: 'Yeniden kontrol et' });
  await retry.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Servis hazır');
});

test('malformed successful response is not shown as healthy', async ({ page }) => {
  await page.route('**/api/health', (route) =>
    route.fulfill({ json: { data: { status: 'wrong' } } }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Servise ulaşılamadı');
});

test('API navigation bypasses SPA fallback', async ({ page }) => {
  const response = await page.goto('/api/missing');
  expect(response?.status()).toBe(404);
  expect(response?.headers()['content-type']).toContain('application/json');
  expect(await response?.json()).toMatchObject({ error: { code: 'ROUTE_NOT_FOUND' } });
});
