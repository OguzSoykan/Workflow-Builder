import { expect, test, type Page } from '@playwright/test';
import { fakeFirebase, PASSWORD } from './fake-firebase';

type Stored = {
  revision: number;
  revisions: { revision: number; source: string; createdAt: string }[];
};

// In-memory stand-in for the D1 API, following its revision rules (ADR-019).
async function fakeCloud(page: Page) {
  const store = new Map<string, Stored>();
  const state = { fail: false };
  await page.route('**/api/v1/workflows**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const id = decodeURIComponent(url.pathname.split('/')[4] ?? '');
    if (state.fail)
      return route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR' } } });
    const add = (item: Stored, revision: number) => {
      item.revision = revision;
      item.revisions.unshift({ revision, source: 'manual', createdAt: '2026-10-28T10:00:00.000Z' });
    };
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as { workflow: { workflowId: string } };
      if (store.has(body.workflow.workflowId))
        return route.fulfill({ status: 409, json: { error: { code: 'WORKFLOW_EXISTS' } } });
      const item = { revision: 0, revisions: [] };
      add(item, 1);
      store.set(body.workflow.workflowId, item);
      return route.fulfill({ status: 201, json: { data: { revision: 1 } } });
    }
    const item = store.get(id);
    if (!item)
      return route.fulfill({ status: 404, json: { error: { code: 'WORKFLOW_NOT_FOUND' } } });
    if (request.method() === 'PUT') {
      const { expectedRevision } = request.postDataJSON() as { expectedRevision: number };
      if (expectedRevision !== item.revision)
        return route.fulfill({
          status: 409,
          json: {
            error: { code: 'REVISION_CONFLICT', details: { currentRevision: item.revision } },
          },
        });
      add(item, item.revision + 1);
      return route.fulfill({ json: { data: { revision: item.revision } } });
    }
    if (url.pathname.endsWith('/revisions'))
      return route.fulfill({ json: { data: { items: item.revisions } } });
    return route.fulfill({ json: { data: { revision: item.revision } } });
  });
  return { store, state };
}

async function signIn(page: Page) {
  await page.locator('summary', { hasText: 'Giriş yap' }).click();
  const account = page.getByRole('region', { name: 'Hesap', exact: true });
  await account.getByLabel('E-posta', { exact: true }).fill('ayse@example.com');
  await account.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await account.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.locator('summary', { hasText: 'ayse@example.com' })).toBeVisible();
  await page.locator('summary', { hasText: 'ayse@example.com' }).click();
}
async function loadExample(page: Page) {
  await page
    .getByRole('region', { name: 'Örnekten başla', exact: true })
    .getByRole('button', { name: 'Satın alma talebi', exact: true })
    .click();
  await page.getByRole('button', { name: 'Örneği yükle', exact: true }).click();
}
const cloud = (page: Page) => page.getByRole('region', { name: 'Bulut kaydı', exact: true });
const steps = (page: Page) =>
  page.getByRole('list', { name: 'Akıştaki adımlar', exact: true }).getByRole('button');

test('saves a confirmed copy, appends revisions and resolves a conflict explicitly', async ({
  page,
}) => {
  await fakeFirebase(page, { verified: true });
  const { store, state } = await fakeCloud(page);
  await page.goto('/');
  await expect(cloud(page)).toHaveCount(0);
  await signIn(page);
  await loadExample(page);
  await expect(cloud(page)).toContainText('Bu taslak henüz buluta kaydedilmedi.');

  await cloud(page).getByRole('button', { name: 'Buluta kaydet', exact: true }).click();
  const confirm = cloud(page).getByRole('group', { name: 'Bulut kaydı onayı', exact: true });
  await expect(confirm).toContainText(
    'hesabınıza kopya olarak kaydedilecek. Yerel taslak silinmez.',
  );
  await confirm.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(cloud(page).getByRole('status')).toHaveText(
    'Buluta kaydedildi (sürüm 1). Yerel taslağınız da duruyor.',
  );
  await expect(
    cloud(page).getByRole('list', { name: 'Bulut sürümleri' }).getByRole('listitem'),
  ).toHaveCount(1);

  await cloud(page).getByRole('button', { name: 'Buluta kaydet', exact: true }).click();
  await confirm.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(cloud(page).getByRole('status')).toContainText('sürüm 2');

  // Another device saved meanwhile: the next save must ask before stacking on top.
  const [id] = [...store.keys()];
  const other = store.get(id!)!;
  other.revision = 3;
  other.revisions.unshift({ revision: 3, source: 'manual', createdAt: '2026-10-28T11:00:00.000Z' });
  await cloud(page).getByRole('button', { name: 'Buluta kaydet', exact: true }).click();
  await confirm.getByRole('button', { name: 'Kaydet', exact: true }).click();
  const conflict = cloud(page).getByRole('group', { name: 'Bulut çakışması', exact: true });
  await expect(conflict).toContainText('daha yeni bir sürümü var (sürüm 3)');
  await conflict.getByRole('button', { name: 'Yine de kaydet', exact: true }).click();
  await expect(cloud(page).getByRole('status')).toContainText('sürüm 4');
  await expect(
    cloud(page).getByRole('list', { name: 'Bulut sürümleri' }).getByRole('listitem'),
  ).toHaveCount(4);

  state.fail = true;
  await cloud(page).getByRole('button', { name: 'Buluta kaydet', exact: true }).click();
  await confirm.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(cloud(page).getByRole('alert')).toContainText('tamamlanamadı');
  await expect(steps(page)).toHaveCount(5);
});

test('asks for a verified email and an executable workflow before saving', async ({ page }) => {
  await fakeFirebase(page);
  await fakeCloud(page);
  await page.goto('/');
  await signIn(page);
  await expect(cloud(page)).toContainText('e-postanızı doğrulayın');
  await expect(cloud(page).getByRole('button', { name: 'Buluta kaydet' })).toHaveCount(0);
});

test('does not offer saving an incomplete workflow', async ({ page }) => {
  await fakeFirebase(page, { verified: true });
  await fakeCloud(page);
  await page.goto('/');
  await signIn(page);
  await page.getByRole('button', { name: 'Başlangıç ekle', exact: true }).click();
  await expect(cloud(page)).toContainText('Yalnız doğrulama sorunu olmayan akışlar');
});
