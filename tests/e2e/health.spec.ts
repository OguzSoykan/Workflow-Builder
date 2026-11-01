import { expect, test } from '@playwright/test';

test('built SPA reaches health on the same Worker origin', async ({ page, request }) => {
  const healthResponse = page.waitForResponse('**/api/health');
  await page.goto('/health');
  const health = await healthResponse;
  expect(health.status()).toBe(200);
  expect(new URL(health.url()).origin).toBe(new URL(page.url()).origin);
  await expect(page.getByRole('status')).toHaveText('Servis hazır');
  await expect(page.getByRole('button', { name: 'Yeniden kontrol et' })).toBeEnabled();
  const missing = await request.get('/api/missing', { headers: { Accept: 'text/html' } });
  expect(missing.status()).toBe(404);
  expect((await missing.json()).error.code).toBe('ROUTE_NOT_FOUND');
});

test('serves the browser tab icons declared in the page head', async ({ page, request }) => {
  await page.goto('/');
  const icons = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(icons).toEqual(['/favicon.svg', '/favicon-32.png', '/apple-touch-icon.png']);
  const types = { svg: 'image/svg+xml', png: 'image/png' } as const;
  for (const href of icons) {
    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain(
      types[href!.endsWith('.svg') ? 'svg' : 'png'],
    );
  }
});

for (const failure of ['network', 'invalid-json', 'invalid-body', 'http-error'] as const) {
  test(`shows ${failure} and recovers on retry`, async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      if (failure === 'network') return route.abort();
      await route.fulfill({
        status: failure === 'http-error' ? 503 : 200,
        contentType: 'application/json',
        body: failure === 'invalid-json' ? '{' : JSON.stringify({ data: { status: 'unknown' } }),
      });
    });
    await page.goto('/health');
    await expect(page.getByRole('alert')).toContainText('Servise ulaşılamadı');
    await page.unroute('**/api/health');
    await page.getByRole('button', { name: 'Yeniden kontrol et' }).click();
    await expect(page.getByRole('status')).toHaveText('Servis hazır');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('times out a stalled request and allows retry', async ({ page }) => {
  await page.clock.install();
  await page.route('**/api/health', () => undefined);
  await page.goto('/health');
  await expect(page.getByRole('button', { name: 'Yeniden kontrol et' })).toBeDisabled();
  await page.clock.fastForward(5100);
  await expect(page.getByRole('alert')).toContainText('Servise ulaşılamadı');
  await expect(page.getByRole('button', { name: 'Yeniden kontrol et' })).toBeEnabled();
});

test('connection failure can be retried with the keyboard', async ({ page }) => {
  await page.route('**/api/health', (route) => route.abort());
  await page.goto('/health');
  await expect(page.getByRole('alert')).toContainText('Servise ulaşılamadı');
  await page.unroute('**/api/health');
  const retry = page.getByRole('button', { name: 'Yeniden kontrol et' });
  await retry.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Servis hazır');
});

test('API navigation bypasses SPA fallback', async ({ page }) => {
  const response = await page.goto('/api/missing');
  expect(response?.status()).toBe(404);
  expect(response?.headers()['content-type']).toContain('application/json');
  expect(await response?.json()).toMatchObject({ error: { code: 'ROUTE_NOT_FOUND' } });
});

test('member API fails closed without a configured Firebase project', async ({ request }) => {
  const response = await request.get('/api/v1/me', { headers: { Authorization: 'Bearer a.b.c' } });
  expect(response.status()).toBe(503);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.json()).toEqual({
    error: { code: 'AUTH_NOT_CONFIGURED', messageKey: 'errors.authNotConfigured' },
    requestId: response.headers()['x-request-id'],
  });
});
