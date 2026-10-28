import { expect, test, type Page } from '@playwright/test';
import { fakeFirebase, PASSWORD } from './fake-firebase';
import { purchaseWorkflow } from '../fixtures/purchase';

async function fakeAi(page: Page, options: { remaining?: number; error?: string } = {}) {
  const keys: string[] = [];
  let remaining = options.remaining ?? 1;
  await page.route('**/api/v1/ai/limits', (route) =>
    route.fulfill({
      json: {
        data: { aiEnabled: true, memberRemaining: remaining, budgetState: 'ok' },
        meta: { requestId: 'r' },
      },
    }),
  );
  await page.route('**/api/v1/ai/workflows/generate', (route) => {
    keys.push(route.request().headers()['idempotency-key'] ?? '');
    if (options.error)
      return route.fulfill({ status: 429, json: { error: { code: options.error } } });
    remaining = Math.max(0, remaining - 1);
    return route.fulfill({
      json: {
        data: {
          proposalId: 'p',
          candidateWorkflow: {
            ...purchaseWorkflow(),
            workflowId: 'workflow_ai',
            title: 'AI satın alma akışı',
          },
          validation: { valid: true, issues: [] },
          warnings: [],
        },
        meta: { requestId: 'r' },
      },
    });
  });
  return keys;
}
async function signIn(page: Page) {
  await page.locator('summary', { hasText: 'Giriş yap' }).click();
  const account = page.getByRole('region', { name: 'Hesap', exact: true });
  await account.getByLabel('E-posta', { exact: true }).fill('ayse@example.com');
  await account.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await account.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.locator('summary', { hasText: 'ayse@example.com' })).toBeVisible();
}
const ai = (page: Page) => page.getByRole('region', { name: 'AI ile oluştur', exact: true });
const steps = (page: Page) =>
  page.getByRole('list', { name: 'Akıştaki adımlar', exact: true }).getByRole('button');

test('shows a proposal that changes nothing until applied, and can be undone', async ({ page }) => {
  await fakeFirebase(page, { verified: true });
  const keys = await fakeAi(page);
  await page.goto('/');
  await expect(ai(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Başlangıç ekle', exact: true }).click();
  await signIn(page);
  await expect(ai(page)).toContainText('Bugün kalan AI hakkı: 1.');
  await ai(page)
    .getByLabel('Süreci anlatın', { exact: true })
    .fill('10.000 üzeri satın almalar yönetici onayına gitsin');
  await ai(page).getByRole('button', { name: 'Akış öner', exact: true }).click();
  const proposal = ai(page).getByRole('group', { name: 'AI önerisi', exact: true });
  await expect(proposal).toContainText('AI satın alma akışı');
  await expect(proposal).toContainText('5 adım · 5 bağlantı · 1 alan · çalıştırılabilir');
  await expect(steps(page)).toHaveCount(1);
  await proposal.getByRole('button', { name: 'Reddet', exact: true }).click();
  await expect(ai(page).getByRole('status')).toHaveText('Öneri reddedildi; taslağınız değişmedi.');
  await expect(steps(page)).toHaveCount(1);
  expect(keys).toHaveLength(1);
  expect(keys[0]).toMatch(/^ui_[0-9a-f-]{36}$/);
  await expect(ai(page)).toContainText('Bugün kalan AI hakkı: 0.');
  await expect(ai(page).getByRole('button', { name: 'Akış öner' })).toBeDisabled();
});

test('applies a proposal to the draft with undo', async ({ page }) => {
  await fakeFirebase(page, { verified: true });
  await fakeAi(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Başlangıç ekle', exact: true }).click();
  await signIn(page);
  await ai(page).getByLabel('Süreci anlatın', { exact: true }).fill('Satın alma onayı');
  await ai(page).getByRole('button', { name: 'Akış öner', exact: true }).click();
  await ai(page).getByRole('button', { name: 'Taslağa uygula', exact: true }).click();
  await expect(steps(page)).toHaveCount(5);
  await expect(
    page.getByRole('heading', { name: 'AI satın alma akışı', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Geri al', exact: true }).click();
  await expect(steps(page)).toHaveCount(1);
});

test('explains quota and budget refusals', async ({ page }) => {
  await fakeFirebase(page, { verified: true });
  await fakeAi(page, { error: 'AI_BUDGET_EXHAUSTED' });
  await page.goto('/');
  await signIn(page);
  await ai(page).getByLabel('Süreci anlatın', { exact: true }).fill('Bir akış');
  await ai(page).getByRole('button', { name: 'Akış öner', exact: true }).click();
  await expect(ai(page).getByRole('alert')).toContainText('AI bütçesi doldu');
});
